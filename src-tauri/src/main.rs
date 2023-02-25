#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{sync::Mutex, panic::catch_unwind, collections::HashMap};
use tauri::State;
mod entities;
use entities::{prelude::*, *};
use futures::executor::block_on;
use sea_orm::*;
use dotenv::dotenv;
use pwhash::bcrypt;
use pwhash::unix;
use serde::{Serialize};

#[derive(Serialize)]
pub struct Serialized_User {
    username: String,
    email: String,
    first_name: String,
    last_name: String,
    points: i32,
    verified: bool,
}

// const DATABASE_URL: &str = "postgres://seyon.satheesh:TjaFgRo8um9h@ep-shiny-lab-553151.us-east-2.aws.neon.tech/neondb";
// const DB_NAME: &str = "neondb";

struct DB(Mutex<DatabaseConnection>);

async fn connect_to_db() -> Result<DatabaseConnection, DbErr> {
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set.");
    let db = Database::connect(database_url).await?;

    // let happy_bakery = role::ActiveModel {
    //     name: ActiveValue::Set("Student".to_owned()),
    //     permissions: ActiveValue::Set("NYS".to_owned()),
    //     ..Default::default()
    // };
    // let res = Role::insert(happy_bakery).exec(&db).await?;

    // let duplicate_role = role::ActiveModel {
    //     id: ActiveValue::Set(2), // The primary key must be set
    //     ..Default::default()
    // };
    // duplicate_role.delete(&db).await?;

    Ok(db)
}

async fn create_new_role(db: &DatabaseConnection, name: &str, permissions: &str) -> Result<(), DbErr> {
    let new_role = role::ActiveModel {
        name: ActiveValue::Set(name.to_string()),
        permissions: ActiveValue::Set(permissions.to_string()),
        ..Default::default()
    };
    let res = Role::insert(new_role).exec(db).await?;

    Ok(())
}

async fn create_new_user(db: &DatabaseConnection, username: &str, password: &str, first_name: &str, last_name: &str, email: &str, role: &str) -> Result<(), DbErr> {
    let role_model: Option<role::Model> = Role::find()
    .filter(role::Column::Name.eq(role))
    .one(db)
    .await?;

    let new_user = user::ActiveModel {
        username: ActiveValue::Set(username.to_string()),
        password: ActiveValue::Set(password.to_string()),
        first_name: ActiveValue::Set(first_name.to_string()),
        last_name: ActiveValue::Set(last_name.to_string()),
        email: ActiveValue::Set(email.to_string()),
        role: ActiveValue::Set(role_model.unwrap().id),
        ..Default::default()
    };
    let res = User::insert(new_user).exec(db).await?;

    Ok(())
}

async fn login(db: &DatabaseConnection, username: &str, password: &str) -> Result<String, DbErr> {
    let user_model = User::find()
    .filter(user::Column::Username.contains(username))
    .one(db)
    .await?;

    if (user_model == None) {
        return Err(sea_orm::DbErr::Custom("Invalid Credentials".to_string()));
    }

    let active_user_model = user_model.unwrap();
    
    if(!unix::verify(password, &active_user_model.password)) {
        return Err(sea_orm::DbErr::Custom("Invalid Credentials".to_string()));
    }

    let role_model = Role::find_by_id(active_user_model.role).one(db).await?;
    let active_role_model = role_model.unwrap();

    Ok(active_role_model.name + ", " + &active_user_model.first_name + ", " + &active_user_model.last_name)
}

async fn get_user_points(db: &DatabaseConnection, username: &str) -> Result<String, DbErr> {
    let user_model = User::find()
    .filter(user::Column::Username.contains(username))
    .one(db)
    .await?;
    let active_user_model = user_model.unwrap();

    Ok(active_user_model.points.to_string())
}

async fn get_user_place(db: &DatabaseConnection, username: &str) -> Result<String, DbErr> {
    let users: Vec<user::Model> = User::find()
    .filter(
        Condition::any()
            .add(user::Column::Role.eq(1))
            .add(user::Column::Role.eq(2))
    )
    .order_by_desc(user::Column::Points)
    .all(db)
    .await?;

    let mut place = 0;
    let mut current_place = 0;
    let mut last_value = -1;

    for user in &users {
        place += 1;

        if (user.points != last_value) {
            current_place = place;
        }

        if (user.username == username) {
            break;
        }
    }

    Ok(current_place.to_string())
}

async fn get_user_role(db: &DatabaseConnection, username: &str) -> Result<String, DbErr> {
    let user_model = User::find()
    .filter(user::Column::Username.contains(username))
    .one(db)
    .await?;
    let active_user_model = user_model.unwrap();

    let role_model = Role::find_by_id(active_user_model.role).one(db).await?;
    let active_role_model = role_model.unwrap();

    Ok(active_role_model.name)
}

async fn add_user_points(db: &DatabaseConnection, username: &str, points: i32) -> Result<(), DbErr> {
    let user_model = User::find()
    .filter(user::Column::Username.contains(username))
    .one(db)
    .await?;

    let active_user_model = user_model.clone().unwrap();

    let mut user_model: user::ActiveModel = user_model.unwrap().into();

    user_model.points = Set(points + active_user_model.points);

    let user_model: user::Model = user_model.update(db).await?;

    Ok(())
}

async fn db_verify_user(db: &DatabaseConnection, username: &str) -> Result<(), DbErr> {
    let user_model = User::find()
    .filter(user::Column::Username.contains(username))
    .one(db)
    .await?;

    let mut user_model: user::ActiveModel = user_model.unwrap().into();

    user_model.verified = Set(true);

    let user_model: user::Model = user_model.update(db).await?;

    Ok(())
}

async fn db_unverify_user(db: &DatabaseConnection, username: &str) -> Result<(), DbErr> {
    let user_model = User::find()
    .filter(user::Column::Username.contains(username))
    .one(db)
    .await?;

    let mut user_model: user::ActiveModel = user_model.unwrap().into();

    user_model.verified = Set(false);

    let user_model: user::Model = user_model.update(db).await?;

    Ok(())
}

async fn get_all_users(db: &DatabaseConnection, username: &str) -> Result<Vec<Serialized_User>, DbErr> {
    let users: Vec<user::Model> = User::find()
    .order_by_asc(user::Column::LastName)
    .order_by_asc(user::Column::FirstName)
    .all(db)
    .await?;

    let mut res: Vec<Serialized_User> = Vec::new();

    for user in &users {
        let mut new_user: Serialized_User = Serialized_User { username: user.username.to_owned(), email: user.email.to_owned(), first_name: user.first_name.to_owned(), last_name: user.last_name.to_owned(), points: user.points, verified: user.verified };

        res.push(new_user);
    }

    Ok(res)
}

fn main() {
    // if let Err(err) = block_on(run()) {
    //     panic!("{}", err);
    // }
    dotenv().ok();
    tauri::Builder::default()
        .manage(DB(Default::default()))
        .invoke_handler(tauri::generate_handler![greet, print, db_connect, create_role, create_user, login_user, user_points, user_role, user_place, add_points, verify_user, unverify_user])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
// TAURI COMMANDS FOR JS AND TS
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Enable JS and TS to print to the terminal
#[tauri::command]
fn print(text: &str) {
    println!("{}", text);
}

// Enable JS and TS to start a database connection
#[tauri::command]
fn db_connect(db_state: State<DB>) -> Result<String, String> {
    let mut db = db_state.0.lock().unwrap();


    match block_on(connect_to_db()) {
        Ok(val) => { 
            *db = val;
            println!("Connected to database");
            Ok("Success".into())
        },
        Err(err) => {
            println!("Could not connect to database");
            Err(err.to_string())
        },
    }
}

// Enable JS and TS to create roles in the database
#[tauri::command]
fn create_role(name: &str, permissions: &str, db_state: State<DB>) -> Result<String, String> {
    let mut db = db_state.0.lock().unwrap();

    match block_on(create_new_role(&*db, name, permissions)) {
        Ok(val) => {
            println!("Role Created");
            Ok("Success".into())
        },
        Err(err) => {
            println!("Error Creating Role");
            Ok(err.to_string())
        },
    }
}

// Enable JS and TS to create users in the database
#[tauri::command]
fn create_user(username: &str, password: &str, first_name: &str, last_name: &str, email: &str, role: &str, db_state: State<DB>) -> Result<String, String> {
    let mut db = db_state.0.lock().unwrap();

    match block_on(create_new_user(&*db, username, &bcrypt::hash(password).unwrap(), first_name, last_name, email, role)) {
        Ok(val) => {
            println!("User Created");
            Ok("Success".into())
        },
        Err(err) => {
            println!("Error Creating User");
            println!("{}", err.to_string());
            Ok(err.to_string())
        },
    }
}

// Enable JS and TS to login users
#[tauri::command]
fn login_user(username: &str, password: &str, db_state: State<DB>) -> Result<String, String> {
    let mut db = db_state.0.lock().unwrap();

    match block_on(login(&*db, username, password)) {
        Ok(val) => {
            println!("User Logged In");
            Ok("Success, ".to_owned() + &val)
        },
        Err(err) => {
            println!("Error Logging User In");
            println!("{}", err.to_string());
            Ok(err.to_string())
        },
    }
}

// Enable JS and TS to get the amount of points a user has
#[tauri::command]
fn user_points(username: &str, db_state: State<DB>) -> Result<String, String> {
    let mut db = db_state.0.lock().unwrap();

    match block_on(get_user_points(&*db, username)) {
        Ok(val) => {
            println!("Got User Points");
            Ok(val)
        },
        Err(err) => {
            println!("Error Getting User Points");
            println!("{}", err.to_string());
            Ok(err.to_string())
        },
    }
}

// Enable JS and TS to get the user's place in the points rankings
#[tauri::command]
fn user_place(username: &str, db_state: State<DB>) -> Result<String, String> {
    let mut db = db_state.0.lock().unwrap();

    match block_on(get_user_place(&*db, username)) {
        Ok(val) => {
            println!("Got User Place");
            Ok(val)
        },
        Err(err) => {
            println!("Error Getting User Place");
            println!("{}", err.to_string());
            Ok(err.to_string())
        },
    }
}

// Enable JS and TS to get the role of a user
#[tauri::command]
fn user_role(username: &str, db_state: State<DB>) -> Result<String, String> {
    let mut db = db_state.0.lock().unwrap();

    match block_on(get_user_role(&*db, username)) {
        Ok(val) => {
            println!("Got User Role");
            Ok(val)
        },
        Err(err) => {
            println!("Error Getting User Role");
            println!("{}", err.to_string());
            Ok(err.to_string())
        },
    }
}

// Enable JS and TS to add points to a user
#[tauri::command]
fn add_points(username: &str, points: i32, db_state: State<DB>) -> Result<String, String> {
    let mut db = db_state.0.lock().unwrap();

    match block_on(add_user_points(&*db, username, points)) {
        Ok(val) => {
            println!("Added Points To User");
            Ok("Success".to_owned())
        },
        Err(err) => {
            println!("Error Adding Points To User");
            println!("{}", err.to_string());
            Ok(err.to_string())
        },
    }
}

// Enable JS and TS to verify user
#[tauri::command]
fn verify_user(username: &str, db_state: State<DB>) -> Result<String, String> {
    let mut db = db_state.0.lock().unwrap();

    match block_on(db_verify_user(&*db, username)) {
        Ok(val) => {
            println!("User Verified");
            Ok("Success".to_owned())
        },
        Err(err) => {
            println!("Error Verifying User");
            println!("{}", err.to_string());
            Ok(err.to_string())
        },
    }
}

// Enable JS and TS to unverify user
#[tauri::command]
fn unverify_user(username: &str, db_state: State<DB>) -> Result<String, String> {
    let mut db = db_state.0.lock().unwrap();

    match block_on(db_unverify_user(&*db, username)) {
        Ok(val) => {
            println!("User Unverified");
            Ok("Success".to_owned())
        },
        Err(err) => {
            println!("Error Unverifying User");
            println!("{}", err.to_string());
            Ok(err.to_string())
        },
    }
}
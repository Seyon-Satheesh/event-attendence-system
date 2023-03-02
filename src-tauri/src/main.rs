#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{sync::Mutex, panic::catch_unwind, collections::HashMap};
use futures::stream::OrElse;
use sea_orm::sea_query::Expr;
use tauri::State;
mod entities;
use entities::{prelude::*, *};
use futures::executor::block_on;
use sea_orm::*;
use dotenv::dotenv;
use pwhash::bcrypt;
use pwhash::unix;
use serde::{Serialize};
use sea_orm::entity::prelude::*;
use chrono::NaiveDate;
use rand::Rng;

#[derive(Serialize)]
pub struct Serialized_User {
    username: String,
    email: String,
    first_name: String,
    last_name: String,
    grade: i32,
    role: i32,
    points: i32,
    verified: bool,
}

#[derive(Serialize)]
pub struct Serialized_Event {
    name: String,
    description: String,
    points: i32,
    date: String,
    hosts: Vec<String>,
    registered: bool,
    points_given: bool,
}

#[derive(Serialize)]
pub struct Serialized_Rank {
    username: String,
    place: i32,
    points: i32,
}

// const DATABASE_URL: &str = "postgres://seyon.satheesh:TjaFgRo8um9h@ep-shiny-lab-553151.us-east-2.aws.neon.tech/neondb";
// const DB_NAME: &str = "neondb";

struct DB(Mutex<DatabaseConnection>);

async fn connect_to_db() -> Result<DatabaseConnection, DbErr> {
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set.");
    let db = Database::connect(database_url).await?;

    // let extra_event: Option<event::Model> = Event::find_by_id(2).one(&db).await?;
    // let extra_event: event::Model = extra_event.unwrap();

    // let res: DeleteResult = extra_event.delete(&db).await?;

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

async fn create_new_user(db: &DatabaseConnection, username: &str, password: &str, first_name: &str, last_name: &str, email: &str, role: &str, grade: i32) -> Result<(), DbErr> {
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
        grade: ActiveValue::Set(Some(grade)),
        ..Default::default()
    };
    let res = User::insert(new_user).exec(db).await?;

    Ok(())
}

async fn create_new_event(db: &DatabaseConnection, name: &str, description: &str, points: i32, date: Option<Date>, hosts: Vec<&str>) -> Result<(), DbErr> {
    let new_event = event::ActiveModel {
        name: ActiveValue::Set(name.to_string()),
        description: ActiveValue::Set(description.to_string()),
        points: ActiveValue::Set(points),
        date: ActiveValue::Set(date),
        ..Default::default()
    };
    let res = Event::insert(new_event).exec(db).await?;

    let event_model = Event::find()
    .filter(event::Column::Name.contains(name))
    .one(db)
    .await?;

    let active_event_model = event_model.unwrap();

    for host_name in hosts {
        let user_model = User::find()
        .filter(user::Column::Username.contains(host_name))
        .one(db)
        .await?;

        let new_host = host::ActiveModel {
            user: ActiveValue::Set(user_model.unwrap().id),
            event: ActiveValue::Set(active_event_model.id),
            ..Default::default()
        };
        let res = Host::insert(new_host).exec(db).await?;
    }

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
    
    if (!unix::verify(password, &active_user_model.password)) {
        return Err(sea_orm::DbErr::Custom("Invalid Credentials".to_string()));
    }

    if (!active_user_model.verified) {
        return Err(sea_orm::DbErr::Custom("Unverified User".to_string()));
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

async fn get_all_users(db: &DatabaseConnection) -> Result<Vec<Serialized_User>, DbErr> {
    let users: Vec<user::Model> = User::find()
    .order_by_asc(user::Column::LastName)
    .order_by_asc(user::Column::FirstName)
    .all(db)
    .await?;

    let mut res: Vec<Serialized_User> = Vec::new();

    for user in &users {
        let mut grade = 0;

        if (user.grade.is_some()) {
            grade = user.grade.unwrap();
        }

        let mut new_user: Serialized_User = Serialized_User { username: user.username.to_owned(), email: user.email.to_owned(), first_name: user.first_name.to_owned(), last_name: user.last_name.to_owned(), role: user.role, grade: grade, points: user.points, verified: user.verified };

        res.push(new_user);
    }

    Ok(res)
}

async fn get_all_events(db: &DatabaseConnection, username: &str) -> Result<Vec<Serialized_Event>, DbErr> {
    let events: Vec<event::Model> = Event::find()
    .order_by_desc(event::Column::Date)
    .order_by_asc(event::Column::Name)
    .all(db)
    .await?;

    let user_model = User::find()
    .filter(user::Column::Username.contains(username))
    .one(db)
    .await?;

    let active_user_model = user_model.unwrap();

    let mut res: Vec<Serialized_Event> = Vec::new();

    for event in &events {
        let mut registered = false;

        let registrant_model = Registrant::find()
        .filter(registrant::Column::User.eq(active_user_model.id))
        .filter(registrant::Column::Event.eq(event.id))
        .one(db)
        .await;

        match registrant_model {
            Ok(f)=> {
                match f {
                    Some(value) => {
                        registered = true;
                    }
                    None => {
                        registered = false;
                    }
                }
            },
            Err(e)=> {
               registered = false;
            }
        }

        let hosts_model: Vec<(host::Model, Vec<user::Model>)> = Host::find()
        .filter(host::Column::Event.eq(event.id))
        .find_with_related(User)
        .all(db)
        .await?;
        
        let mut hosts: Vec<String> = Vec::new();
        
        for host in &hosts_model {
            hosts.push(host.to_owned().1[0].username.to_owned());
        }

        let mut new_event: Serialized_Event = Serialized_Event { name: event.name.to_owned(), description: event.description.to_owned(), points: event.points, date: event.date.unwrap().format("%Y-%m-%d").to_string(), hosts: hosts, registered: registered, points_given: event.points_given };

        res.push(new_event);
    }

    Ok(res)
}

async fn register_for_event(db: &DatabaseConnection, username: &str, event: &str) -> Result<(), DbErr> {
    let user_model: Option<user::Model> = User::find()
    .filter(user::Column::Username.eq(username))
    .one(db)
    .await?;
    
    let event_model: Option<event::Model> = Event::find()
    .filter(event::Column::Name.eq(event))
    .one(db)
    .await?;

    let new_registrant = registrant::ActiveModel {
        user: ActiveValue::Set(user_model.unwrap().id),
        event: ActiveValue::Set(event_model.unwrap().id),
        ..Default::default()
    };
    let res = Registrant::insert(new_registrant).exec(db).await?;

    Ok(())
}

async fn unregister_from_event(db: &DatabaseConnection, username: &str, event: &str) -> Result<(), DbErr> {
    let user_model: Option<user::Model> = User::find()
    .filter(user::Column::Username.eq(username))
    .one(db)
    .await?;
    
    let event_model: Option<event::Model> = Event::find()
    .filter(event::Column::Name.eq(event))
    .one(db)
    .await?;

    let extra_registrant: Option<registrant::Model> = Registrant::find()
    .filter(registrant::Column::User.eq(user_model.unwrap().id))
    .filter(registrant::Column::Event.eq(event_model.unwrap().id))
    .one(db)
    .await?;
    let extra_registrant: registrant::Model = extra_registrant.unwrap();

    let res: DeleteResult = extra_registrant.delete(db).await?;

    Ok(())
}

async fn give_points_for_event(db: &DatabaseConnection, event: &str) -> Result<(), DbErr> {    
    let event_model: Option<event::Model> = Event::find()
    .filter(event::Column::Name.eq(event))
    .one(db)
    .await?;

    let active_event_model = event_model.unwrap();
    let event_points = active_event_model.points;

    let registrant_models: Vec<(registrant::Model, Option<user::Model>)> = Registrant::find()
    .filter(registrant::Column::Event.eq(active_event_model.id))
    .find_also_related(User)
    .all(db)
    .await?;

    for registrar in &registrant_models {
        let mut registrar_model: user::ActiveModel = registrar.to_owned().1.unwrap().into();
        registrar_model.points = Set(event_points + registrar.to_owned().1.unwrap().points);
        let registrar_model: user::Model = registrar_model.update(db).await?;
    }

    let mut new_event_model: event::ActiveModel = active_event_model.into();
    new_event_model.points_given = Set(true);
    let new_event_model: event::Model = new_event_model.update(db).await?;

    Ok(())
}

async fn get_user_rankings(db: &DatabaseConnection) -> Result<Vec<Serialized_Rank>, DbErr> {
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

    let mut res: Vec<Serialized_Rank> = Vec::new();

    for user in &users {
        place += 1;

        if (user.points != last_value) {
            current_place = place;
        }

        if (current_place > 10) {
            break;
        }

        if (users[0].points != 0 && user.points == 0) {
            break;
        }

        let mut new_rank: Serialized_Rank = Serialized_Rank { username: user.username.to_owned(), place: current_place, points: user.points };
        res.push(new_rank)
    }

    Ok(res)
}

async fn generate_prize_winners(db: &DatabaseConnection) -> Result<Vec<String>, DbErr> {
    let users: Vec<user::Model> = User::find()
    .filter(
        Condition::any()
            .add(user::Column::Role.eq(1))
            .add(user::Column::Role.eq(2))
    )
    .order_by_desc(user::Column::Points)
    .all(db)
    .await?;

    let grade9s: Vec<user::Model> = User::find()
    .filter(user::Column::Grade.eq(9))
    .all(db)
    .await?;

    let grade10s: Vec<user::Model> = User::find()
    .filter(user::Column::Grade.eq(10))
    .all(db)
    .await?;

    let grade11s: Vec<user::Model> = User::find()
    .filter(user::Column::Grade.eq(11))
    .all(db)
    .await?;

    let grade12s: Vec<user::Model> = User::find()
    .filter(user::Column::Grade.eq(12))
    .all(db)
    .await?;
    
    let new_prize_winners = prize::ActiveModel {
        main_winner: ActiveValue::Set(users[0].id),
        grade9_winner: ActiveValue::Set(grade9s[rand::thread_rng().gen_range(0..(grade9s.len()))].id),
        grade10_winner: ActiveValue::Set(grade10s[rand::thread_rng().gen_range(0..(grade10s.len()))].id),
        grade11_winner: ActiveValue::Set(grade11s[rand::thread_rng().gen_range(0..(grade11s.len()))].id),
        grade12_winner: ActiveValue::Set(grade12s[rand::thread_rng().gen_range(0..(grade12s.len()))].id),
        ..Default::default()
    };
    let res = Prize::insert(new_prize_winners).exec(db).await?;

    User::update_many()
    .col_expr(user::Column::Points, Expr::value(0))
    .exec(db)
    .await?;

    Ok(get_prize_winners(db).await?)
}

async fn get_prize_winners(db: &DatabaseConnection) -> Result<Vec<String>, DbErr> {
    let prizes: Vec<prize::Model> = Prize::find()
    .order_by_desc(prize::Column::Id)
    .all(db)
    .await?;

    let mut main_winner: String = "-".to_owned();
    let mut grade_9_winner:String = "-".to_owned();
    let mut grade_10_winner:String = "-".to_owned();
    let mut grade_11_winner:String = "-".to_owned();
    let mut grade_12_winner:String = "-".to_owned();

    if (prizes.len() >= 1) {
        main_winner = User::find().filter(user::Column::Id.eq(prizes[0].main_winner)).one(db).await?.unwrap().username;
        grade_9_winner = User::find().filter(user::Column::Id.eq(prizes[0].grade9_winner)).one(db).await?.unwrap().username;
        grade_10_winner = User::find().filter(user::Column::Id.eq(prizes[0].grade10_winner)).one(db).await?.unwrap().username;
        grade_11_winner = User::find().filter(user::Column::Id.eq(prizes[0].grade11_winner)).one(db).await?.unwrap().username;
        grade_12_winner = User::find().filter(user::Column::Id.eq(prizes[0].grade12_winner)).one(db).await?.unwrap().username;
    }

    Ok(vec![main_winner.to_owned(), grade_9_winner.to_owned(), grade_10_winner.to_owned(), grade_11_winner.to_owned(), grade_12_winner.to_owned()])
}

fn main() {
    // if let Err(err) = block_on(run()) {
    //     panic!("{}", err);
    // }
    dotenv().ok();
    tauri::Builder::default()
        .manage(DB(Default::default()))
        .invoke_handler(tauri::generate_handler![greet, print, db_connect, create_role, create_user, login_user, user_points, user_role, user_place, add_points, verify_user, unverify_user, get_users, create_event, get_events, register_event, unregister_event, give_event_points, get_rankings, generate_winners, get_winners])
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
            Ok(err.to_string())
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
fn create_user(username: &str, password: &str, first_name: &str, last_name: &str, email: &str, role: &str, grade: i32, db_state: State<DB>) -> Result<String, String> {
    let mut db = db_state.0.lock().unwrap();

    match block_on(create_new_user(&*db, username, &bcrypt::hash(password).unwrap(), first_name, last_name, email, role, grade)) {
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

// Enable JS and TS to create events in the database
#[tauri::command]
fn create_event(name: &str, description: &str, points: i32, date: &str, hosts: Vec<&str>, db_state: State<DB>) -> Result<String, String> {
    let mut db = db_state.0.lock().unwrap();

    let dates: Vec<&str> = date.split("-").collect();
    let naive_date = NaiveDate::from_ymd_opt(dates[0].parse::<i32>().unwrap(), dates[1].parse::<u32>().unwrap(), dates[2].parse::<u32>().unwrap());
    let new_date: Date;

    if (naive_date.is_some()) {
        new_date = naive_date.unwrap();
    } else {
        return Ok("Something Went Wrong".into());
    }

    match block_on(create_new_event(&*db, name, description, points, Some(new_date), hosts)) {
        Ok(val) => {
            println!("Event Created");
            Ok("Success".into())
        },
        Err(err) => {
            println!("Error Creating Event");
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

// Enable JS and TS to get all users
#[tauri::command]
fn get_users(db_state: State<DB>) -> Result<Vec<Serialized_User>, String> {
    let mut db = db_state.0.lock().unwrap();

    match block_on(get_all_users(&*db)) {
        Ok(val) => {
            println!("Users Gotten");
            Ok(val)
        },
        Err(err) => {
            println!("Error Getting Users");
            println!("{}", err.to_string());
            Err(err.to_string())
        },
    }
}

// Enable JS and TS to get all events
#[tauri::command]
fn get_events(username: &str, db_state: State<DB>) -> Result<Vec<Serialized_Event>, String> {
    let mut db = db_state.0.lock().unwrap();

    match block_on(get_all_events(&*db, username)) {
        Ok(val) => {
            println!("Events Gotten");
            Ok(val)
        },
        Err(err) => {
            println!("Error Getting Events");
            println!("{}", err.to_string());
            Err(err.to_string())
        },
    }
}

// Enable JS and TS to register for event
#[tauri::command]
fn register_event(username: &str, event: &str, db_state: State<DB>) -> Result<String, String> {
    let mut db = db_state.0.lock().unwrap();

    match block_on(register_for_event(&*db, username, event)) {
        Ok(val) => {
            println!("Registered For Event");
            Ok("Success".to_owned())
        },
        Err(err) => {
            println!("Error Registering For Event");
            println!("{}", err.to_string());
            Ok(err.to_string())
        },
    }
}

// Enable JS and TS to unregister from event
#[tauri::command]
fn unregister_event(username: &str, event: &str, db_state: State<DB>) -> Result<String, String> {
    let mut db = db_state.0.lock().unwrap();

    match block_on(unregister_from_event(&*db, username, event)) {
        Ok(val) => {
            println!("Unregistered For Event");
            Ok("Success".to_owned())
        },
        Err(err) => {
            println!("Error Unregistering From Event");
            println!("{}", err.to_string());
            Ok(err.to_string())
        },
    }
}

// Enable JS and TS to give event points
#[tauri::command]
fn give_event_points(event: &str, db_state: State<DB>) -> Result<String, String> {
    let mut db = db_state.0.lock().unwrap();

    match block_on(give_points_for_event(&*db, event)) {
        Ok(val) => {
            println!("Gave Event Points");
            Ok("Success".to_owned())
        },
        Err(err) => {
            println!("Error Giving Event Points");
            println!("{}", err.to_string());
            Ok(err.to_string())
        },
    }
}

// Enable JS and TS to get rankings
#[tauri::command]
fn get_rankings(db_state: State<DB>) -> Result<Vec<Serialized_Rank>, String> {
    let mut db = db_state.0.lock().unwrap();

    match block_on(get_user_rankings(&*db)) {
        Ok(val) => {
            println!("Got User Rankings");
            Ok(val)
        },
        Err(err) => {
            println!("Error Getting User Rankings");
            println!("{}", err.to_string());
            Err(err.to_string())
        },
    }
}

// Enable JS and TS to generate prize winners
#[tauri::command]
fn generate_winners(db_state: State<DB>) -> Result<Vec<String>, String> {
    let mut db = db_state.0.lock().unwrap();

    match block_on(generate_prize_winners(&*db)) {
        Ok(val) => {
            println!("Generated Prize Winners");
            Ok(val)
        },
        Err(err) => {
            println!("Error Generating Prize Winners");
            println!("{}", err.to_string());
            Err(err.to_string())
        },
    }
}

// Enable JS and TS to get prize winners
#[tauri::command]
fn get_winners(db_state: State<DB>) -> Result<Vec<String>, String> {
    let mut db = db_state.0.lock().unwrap();

    match block_on(get_prize_winners(&*db)) {
        Ok(val) => {
            println!("Got Prize Winners");
            Ok(val)
        },
        Err(err) => {
            println!("Error Getting Prize Winners");
            println!("{}", err.to_string());
            Err(err.to_string())
        },
    }
}
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{sync::Mutex, panic::catch_unwind};
use tauri::State;
mod entities;
use entities::{prelude::*, *};
use futures::executor::block_on;
use sea_orm::*;
use dotenv::dotenv;
use pwhash::bcrypt;

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

fn main() {
    // if let Err(err) = block_on(run()) {
    //     panic!("{}", err);
    // }
    dotenv().ok();
    tauri::Builder::default()
        .manage(DB(Default::default()))
        .invoke_handler(tauri::generate_handler![greet, print, db_connect, create_role, create_user])
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
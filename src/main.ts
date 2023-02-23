import { invoke } from "@tauri-apps/api/tauri";

let currentUser: string | null = null;
let currentUserRole: string | null = null;
let currentUserFirstName: string | null = null;
let currentUserLastName: string | null = null;
let currentUserPoints: number | null = null;
let currentUserPlace: number | null = null;

let roles = ["Student", "Student Leader", "Teacher", "Administrator", "Principal"]

let greetInputEl: HTMLInputElement | null;
let greetMsgEl: HTMLElement | null;

async function greet() {
  if (greetMsgEl && greetInputEl) {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    greetMsgEl.textContent = await invoke("greet", {
      name: greetInputEl.value,
    });
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  await db_connect();
  showPopup("Hi");
  makeRestrictedVisible();
  // create_role("Student", "NYS");
  // create_role("Student Leader", "NYS");
  // create_role("Teacher", "NYS");
  // create_role("Administrator", "NYS");
  // create_role("Principal", "NYS");
  // create_user("CoolestPrincipal", "FBLAISCOOL", "Seyon", "Satheesh", "seyon.satheesh@gmail.com", "Principal");
  document
    .querySelector("#login-form")
    ?.addEventListener("submit", form => login(form));
    document
    .querySelector("#register-form")
    ?.addEventListener("submit", form => register(form));
  // document
  //   .querySelector("#register-grade")
  //   ?.addEventListener("change", () => gradeChange());
  document
    .querySelector("#switch-to-register")
    ?.addEventListener("click", () => loginToRegister());
  document
    .querySelector("#switch-to-login")
    ?.addEventListener("click", () => registerToLogin());
  document
    .querySelector("#register-role")
    ?.addEventListener("change", () => registerRoleChange());
  document
    .querySelector("#mini-popup-button")
    ?.addEventListener("click", () => hidePopup());
  document
    .querySelector("#logout")
    ?.addEventListener("click", () => logout());
  document
    .querySelector("#dashboard")
    ?.addEventListener("click", () => showDashboard());
  document
    .querySelector("#events")
    ?.addEventListener("click", () => showEvents());
  document
    .querySelector("#rankings")
    ?.addEventListener("click", () => showRankings());
  document
    .querySelector("#users")
    ?.addEventListener("click", () => showUsers());
  document
    .querySelector("#prizes")
    ?.addEventListener("click", () => showPrizes());
});

async function login(form: any) {
  form.preventDefault();
  let username: string = document.getElementById("login-username")?.value.trim().replace(/\s+/g, '');
  let password: string = document.getElementById("login-password")?.value.trim();
  let button: HTMLButtonElement = document.getElementById("login-button");

  button.disabled = true;

  print(username + ":" + password);

  if (username == "" || password == "")
  {
    loginError("Please Enter A Username and/or Password");
    button.disabled = false;
    return;
  }

  let res = await login_user(username, password);
  let split_res = res.split(", ");

  if (split_res[0] == "Success") {
    hideLoginError();
    currentUser = username;
    currentUserRole = split_res[1];
    currentUserFirstName = split_res[2];
    currentUserLastName = split_res[3];
    currentUserPoints = await user_points(currentUser);
    currentUserPlace = await user_place(currentUser);

    showPopup(currentUserPlace.toString());

    document.getElementById("greeting").innerHTML = `Hello ${currentUserLastName}, ${currentUserFirstName}!`;

    if (currentUserRole == "Student" || currentUserRole == "Student Leader") {
      if (Number.isNaN(currentUserPoints) || Number.isNaN(currentUserPlace)) {
        currentUser = null;
        currentUserRole = null;
        currentUserFirstName = null;
        currentUserLastName = null;
        currentUserPoints = null;
        currentUserPlace = null;
  
        showPopup("Something went wrong");
        document.getElementById("login-password").value = "";
        button.disabled = false;
  
        return;
      }
  
      document.getElementById("points-counter").innerHTML = currentUserPoints.toString();
      document.getElementById("place-counter").innerHTML = ordinal_suffix_of(currentUserPlace);
    }

    makeRestrictedInvisible();

    // add_points(currentUser, 10);
    // verify_user(currentUser);

    document.getElementById("login-username").value = "";

    document.getElementById("popup").classList.add("invisible");
    document.getElementById("popup").classList.remove("visible");

    document.getElementById("page").classList.add("visible");
    document.getElementById("page").classList.remove("invisible");
  } else if (res == "Custom Error: Invalid Credentials") {
    loginError("Invalid Credentials");
  } else {
    loginError("Something Went Wrong");
  }

  document.getElementById("login-password").value = "";
  button.disabled = false;
}

async function register(form: any) {
  form.preventDefault();
  let firstName: string = document.getElementById("register-first-name")?.value.trim();
  let lastName: string = document.getElementById("register-last-name")?.value.trim();
  let role: number = parseInt(document.getElementById("register-role-value")?.value.trim());
  let grade: number = parseInt(document.getElementById("register-grade-value")?.value.trim());
  let username: string = document.getElementById("register-username")?.value.trim().replace(/\s+/g, '');
  let email: string = document.getElementById("register-email")?.value.trim();
  let password: string = document.getElementById("register-password")?.value.trim();
  let button: HTMLButtonElement = document.getElementById("register-button");

  button.disabled = true;

  print(username + ":" + password);

  if (firstName == "" || lastName == "" || username == "" || email == "" || password == "" || role == 0 || (role == 1 && grade == 0))
  {
    registerError("Please Fill Out All Fields");
    button.disabled = false;
    return;
  }

  let res = await create_user(username, password, firstName, lastName, email, roles[role - 1], (role == 1 ? grade + 8 : null));

  if (res == "Success") {
    document.getElementById("register-first-name").value = "";
    document.getElementById("register-last-name").value = "";
    document.getElementById("register-role").value = "0";
    document.getElementById("register-grade").value= "0";
    document.getElementById("register-username").value = "";
    document.getElementById("register-email").value = "";
    document.getElementById("register-password").value = "";

    showPopup("Account Created");
    registerToLogin();
    hideRegisterError();
  } else if (res == 'Query Error: error returned from database: duplicate key value violates unique constraint "user_username_key"') {
    registerError("Username Has Already Been Taken");
  } else if (res == 'Query Error: error returned from database: duplicate key value violates unique constraint "user_email_key"') {
    registerError("Email Has Already Been Taken");
  } else {
    registerError("Something Went Wrong");
  }


  button.disabled = false;
}

function logout() {
  currentUser = null;
  currentUserRole = null;
  currentUserFirstName = null;
  currentUserLastName = null;
  currentUserPoints = null;
  currentUserPlace = null;

  showDashboard();
  makeRestrictedVisible();

  document.getElementById("popup").classList.add("visible");
  document.getElementById("popup").classList.remove("invisible");

  document.getElementById("page").classList.add("invisible");
  document.getElementById("page").classList.remove("visible");
}

function makeRestrictedVisible() {
  let restrictedItems = document.getElementsByClassName("restricted");

  for (let i = 0; i < restrictedItems.length; i++) {
    restrictedItems[i].classList.remove("invisible");
    restrictedItems[i].classList.add("visible");
  }
}

function makeRestrictedInvisible() {
  let restrictedItems = document.getElementsByClassName("restricted");

  for (let i = 0; i < restrictedItems.length; i++) {
    if (!restrictedItems[i].dataset.restricted.split(", ").includes(currentUserRole)) {
      restrictedItems[i].classList.remove("visible");
      restrictedItems[i].classList.add("invisible");
    }
  }
}

function showDashboard() {
  if (document.getElementById("dashboard-content").classList.contains("invisible")) {
    document.getElementById("dashboard-content").classList.remove("invisible");
    document.getElementById("dashboard-content").classList.add("visible");
  }

  if (document.getElementById("events-content").classList.contains("visible")) {
    document.getElementById("events-content").classList.remove("visible");
    document.getElementById("events-content").classList.add("invisible");
  }

  if (document.getElementById("users-content").classList.contains("visible")) {
    document.getElementById("users-content").classList.remove("visible");
    document.getElementById("users-content").classList.add("invisible");
  }

  if (document.getElementById("rankings-content").classList.contains("visible")) {
    document.getElementById("rankings-content").classList.remove("visible");
    document.getElementById("rankings-content").classList.add("invisible");
  }

  if (document.getElementById("prizes-content").classList.contains("visible")) {
    document.getElementById("prizes-content").classList.remove("visible");
    document.getElementById("prizes-content").classList.add("invisible");
  }
}

function showEvents() {
  if (document.getElementById("dashboard-content").classList.contains("visible")) {
    document.getElementById("dashboard-content").classList.remove("visible");
    document.getElementById("dashboard-content").classList.add("invisible");
  }

  if (document.getElementById("events-content").classList.contains("invisible")) {
    document.getElementById("events-content").classList.remove("invisible");
    document.getElementById("events-content").classList.add("visible");
  }

  if (document.getElementById("users-content").classList.contains("visible")) {
    document.getElementById("users-content").classList.remove("visible");
    document.getElementById("users-content").classList.add("invisible");
  }

  if (document.getElementById("rankings-content").classList.contains("visible")) {
    document.getElementById("rankings-content").classList.remove("visible");
    document.getElementById("rankings-content").classList.add("invisible");
  }

  if (document.getElementById("prizes-content").classList.contains("visible")) {
    document.getElementById("prizes-content").classList.remove("visible");
    document.getElementById("prizes-content").classList.add("invisible");
  }
}

function showUsers() {
  if (document.getElementById("dashboard-content").classList.contains("visible")) {
    document.getElementById("dashboard-content").classList.remove("visible");
    document.getElementById("dashboard-content").classList.add("invisible");
  }

  if (document.getElementById("events-content").classList.contains("visible")) {
    document.getElementById("events-content").classList.remove("visible");
    document.getElementById("events-content").classList.add("invisible");
  }

  if (document.getElementById("users-content").classList.contains("invisible")) {
    document.getElementById("users-content").classList.remove("invisible");
    document.getElementById("users-content").classList.add("visible");
  }

  if (document.getElementById("rankings-content").classList.contains("visible")) {
    document.getElementById("rankings-content").classList.remove("visible");
    document.getElementById("rankings-content").classList.add("invisible");
  }

  if (document.getElementById("prizes-content").classList.contains("visible")) {
    document.getElementById("prizes-content").classList.remove("visible");
    document.getElementById("prizes-content").classList.add("invisible");
  }
}

function showRankings() {
  if (document.getElementById("dashboard-content").classList.contains("visible")) {
    document.getElementById("dashboard-content").classList.remove("visible");
    document.getElementById("dashboard-content").classList.add("invisible");
  }

  if (document.getElementById("events-content").classList.contains("visible")) {
    document.getElementById("events-content").classList.remove("visible");
    document.getElementById("events-content").classList.add("invisible");
  }

  if (document.getElementById("users-content").classList.contains("visible")) {
    document.getElementById("users-content").classList.remove("visible");
    document.getElementById("users-content").classList.add("invisible");
  }

  if (document.getElementById("rankings-content").classList.contains("invisible")) {
    document.getElementById("rankings-content").classList.remove("invisible");
    document.getElementById("rankings-content").classList.add("visible");
  }

  if (document.getElementById("prizes-content").classList.contains("visible")) {
    document.getElementById("prizes-content").classList.remove("visible");
    document.getElementById("prizes-content").classList.add("invisible");
  }
}

function showPrizes() {
  if (document.getElementById("dashboard-content").classList.contains("visible")) {
    document.getElementById("dashboard-content").classList.remove("visible");
    document.getElementById("dashboard-content").classList.add("invisible");
  }

  if (document.getElementById("events-content").classList.contains("visible")) {
    document.getElementById("events-content").classList.remove("visible");
    document.getElementById("events-content").classList.add("invisible");
  }

  if (document.getElementById("users-content").classList.contains("visible")) {
    document.getElementById("users-content").classList.remove("visible");
    document.getElementById("users-content").classList.add("invisible");
  }

  if (document.getElementById("rankings-content").classList.contains("visible")) {
    document.getElementById("rankings-content").classList.remove("visible");
    document.getElementById("rankings-content").classList.add("invisible");
  }

  if (document.getElementById("prizes-content").classList.contains("invisible")) {
    document.getElementById("prizes-content").classList.remove("invisible");
    document.getElementById("prizes-content").classList.add("visible");
  }
}

// function gradeChange() {
//   print("Grade Changed")
//   let grade = document.getElementById("register-grade").value;
//   document.getElementById("register-grade-label").innerHTML = "Grade " + grade;
// }

function loginToRegister() {
  print("toRegister");
  let login = document.getElementById("login");
  let register = document.getElementById("register");

  if (login != undefined && register != undefined ) {
    login.classList.remove("move-login-left");
    register.classList.remove("move-register-left");

    login.classList.add("move-login-right");
    register.classList.add("move-register-right");
  }
}

function registerToLogin() {
  print("toLogin");
  let login = document.getElementById("login");
  let register = document.getElementById("register");

  if (login != undefined && register != undefined ) {
    login.classList.remove("move-login-right");
    register.classList.remove("move-register-right");

    login.classList.add("move-login-left");
    register.classList.add("move-register-left");
  }
}

function showPopup(msg: string) {
  let popup = document.getElementById("mini-popup");
  let popupMsg = document.getElementById("mini-popup-message");

  if (popup != undefined) {
    popupMsg.innerHTML = msg;
    popup.classList.remove("invisible");
    popup.classList.add("visible");
  }
}

function hidePopup() {
  let popup = document.getElementById("mini-popup");

  if (popup != undefined) {
    popup.classList.remove("visible");
    popup.classList.add("invisible");
  }
}

function loginError(errorMsg: string) {
  let error = document.getElementById("login-error");

  if (error != undefined) {
    error.classList.remove("invisible");
    error.classList.add("visible");
    error.innerHTML = errorMsg;
  }
}


function registerError(errorMsg: string) {
  let error = document.getElementById("register-error");

  if (error != undefined) {
    error.classList.remove("invisible");
    error.classList.add("visible");
    error.innerHTML = errorMsg;
  }
}

function hideLoginError() {
  let error = document.getElementById("login-error");

  if (error != undefined) {
    error.classList.remove("visible");
    error.classList.add("invisible");
    error.innerHTML = "";
  }
}
function hideRegisterError() {
  let error = document.getElementById("register-error");

  if (error != undefined) {
    error.classList.remove("visible");
    error.classList.add("invisible");
    error.innerHTML = "";
  }
}

function registerRoleChange() {
  let role = document.getElementById("register-role");

  if (role != undefined) {
    role.style.color = "#FFF"
  }
}

// Modified version of Salman A's code found on https://stackoverflow.com/questions/13627308/add-st-nd-rd-and-th-ordinal-suffix-to-a-number
function ordinal_suffix_of(i: number) : string {
  let j = i % 10;
  let k = i % 100;
  if (j == 1 && k != 11) {
      return i + "st";
  }
  if (j == 2 && k != 12) {
      return i + "nd";
  }
  if (j == 3 && k != 13) {
      return i + "rd";
  }
  return i + "th";
}

// DEFINE SHORTHANDS FOR ALL CUSTOM TAURI CALLBACKS
async function print(text: string) {
  await invoke("print", {text: text});
}

async function db_connect() {
  let res = await invoke("db_connect");
  print(String(res));
}

async function create_role(name: string, permissions:string) {
  let res = await invoke("create_role", {name: name, permissions: permissions});
  print(String(res));
}

async function create_user(username: string, password: string, firstName: string, lastName: string, email: string, role: string, grade:number | null = null) : Promise<string> {
  let res = await invoke("create_user", {username: username, password: password, firstName: firstName, lastName: lastName, email: email, role: role});
  print(String(res));
  return String(res);
}

async function login_user(username: string, password: string) : Promise<string> {
  let res = await invoke("login_user", {username: username, password: password});
  print(String(res));
  return String(res);
}

async function user_points(username: string) : Promise<number> {
  let res = await invoke("user_points", {username: username});
  print(String(res));
  return parseInt(String(res));
}

async function user_place(username: string) : Promise<number> {
  let res = await invoke("user_place", {username: username});
  print(String(res));
  return parseInt(String(res));
}

async function user_role(username: string) : Promise<string> {
  let res = await invoke("user_role", {username: username});
  print(String(res));
  return String(res);
}

async function add_points(username: string, points: number) : Promise<string> {
  let res = await invoke("add_points", {username: username, points: points});
  print(String(res));
  return String(res);
}

async function verify_user(username: string) : Promise<string> {
  let res = await invoke("verify_user", {username: username});
  print(String(res));
  return String(res);
}

async function unverify_user(username: string) : Promise<string> {
  let res = await invoke("unverify_user", {username: username});
  print(String(res));
  return String(res);
}
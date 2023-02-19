import { invoke } from "@tauri-apps/api/tauri";

let currentUser: string | null = null;
let currentUserRole: string | null = null;

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

  if (res == "Success") {
    hideLoginError();
    currentUser = username;
    currentUserRole = await user_role(currentUser);
    document.getElementById("login-username").value = "";

    document.getElementById("popup").classList.add("invisible");
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

// DEFINE SHORTHANDS FOR ALL CUSTOM TAURI CALLBACKS
async function print(text:string) {
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

async function user_role(username: string) : Promise<string> {
  let res = await invoke("user_role", {username: username});
  print(String(res));
  return String(res);
}
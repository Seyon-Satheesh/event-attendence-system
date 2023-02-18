import { invoke } from "@tauri-apps/api/tauri";

let username: string | null = null;

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

window.addEventListener("DOMContentLoaded", () => {
  db_connect();
  // create_role("Student", "NYS");
  // create_role("Student Leader", "NYS");
  // create_role("Teacher", "NYS");
  // create_role("Administrator", "NYS");
  // create_role("Principal", "NYS");
  create_user("CoolestPrincipal", "FBLAISCOOL", "Seyon", "Satheesh", "seyon.satheesh@gmail.com", "Principal");
  document
    .querySelector("#login-form")
    ?.addEventListener("submit", form => login(form));
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
});

function login(form: any) {
  let username: string = document.getElementById("login-username")?.value.trim();
  let password: string = document.getElementById("login-password")?.value.trim();
  print(username + ":" + password);
  if (username == "" || password == "")
  {
    form.preventDefault();
    loginError("Please Enter A Username and/or Password");
    return;
  }
  form.preventDefault();
  loginError("Invalid Something");
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

function loginError(errorMsg: string) {
  let error = document.getElementById("login-error");

  if (error != undefined) {
    error.classList.remove("invisible");
    error.classList.add("visible");
    error.innerHTML = errorMsg;
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

async function create_user(username: string, password: string, firstName: string, lastName: string, email: string, role: string, grade:BigInt | null = null) : Promise<string> {
  let res = await invoke("create_user", {username: username, password: password, firstName: firstName, lastName: lastName, email: email, role: role});
  print(String(res));
  return String(res);
}
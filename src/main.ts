// @ts-nocheck
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
  let connectionStatus : string = "";

  while (connectionStatus != "Success") {
    connectionStatus = await db_connect();
  }

  // showPopup("Hi");
  makeRestrictedVisible();
  // await setupDatabase();

  document
    .querySelector("#login-form")
    ?.addEventListener("submit", form => login(form));
  document
    .querySelector("#register-form")
    ?.addEventListener("submit", form => register(form));
  document
    .querySelector("#add-event-form")
    ?.addEventListener("submit", form => createEvent(form));
  
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
  document
    .querySelector("#add-event")
    ?.addEventListener("click", () => showAddEvent());
  document
    .querySelector("#close-event")
    ?.addEventListener("click", () => hideAddEvent());
  document
    .querySelector("#generate-winners")
    ?.addEventListener("click", () => generateWinners());
});

async function setupDatabase() {
  create_role("Student", "NYS");
  create_role("Student Leader", "NYS");
  create_role("Teacher", "NYS");
  create_role("Administrator", "NYS");
  create_role("Principal", "NYS");
  create_user("CoolestPrincipal", "FBLAISCOOL", "Seyon", "Satheesh", "seyon.satheesh@gmail.com", "Principal");
  create_user("TopAdmin", "FBLAISCOOL", "Adam", "McKenzie", "admin@school.com", "Administrator");
  create_user("BestStudent", "FBLAISCOOL", "Bob", "McKenzie", "bob@mckenzie.com", "Student", 9);
  create_user("BetterStudent", "FBLAISCOOL", "John", "Doe", "john@doe.com", "Student", 10);
  create_user("CoolGrade9", "FBLAISCOOL", "Frank", "Cook", "frank@cook.com", "Student", 9);
  create_user("CoolGrade10", "FBLAISCOOL", "Jonah", "Burnsten", "jonah@burnsten.com", "Student", 10);
  create_user("CoolGrade11", "FBLAISCOOL", "Lockie", "Brown", "lockie@brown.com", "Student", 11);
  create_user("CoolGrade12", "FBLAISCOOL", "Paul", "Winfred", "paul@winfred.com", "Student", 12);
  verify_user("CoolestPrincipal");
  add_points("BestStudent", 20);
  add_points("BetterStudent", 10);
  add_points("CoolGrade9", 0);
  add_points("CoolGrade10", 10);
  add_points("CoolGrade11", 5);
  add_points("CoolGrade12", 5);
  create_event("Soccer Intermurals", "A fun game of soccer in the small gym at lunch. Please come in teams of 5.", 10, "2023-03-01", ["CoolestPrincipal"]);
  create_event("Reach For The Top (vs. Bill Hogarth)", "A friendly, yet competitive, general knowledge competition between our two schools. Meet in Room 206 at 3:45.", 10, "2023-02-28", ["TopAdmin"]);
  create_event("Mural Designing", "Join us at 11:45 in the atrium to make murals that celebrate our school spirit.", 20, "2023-03-02", ["CoolestPrincipal", "TopAdmin"]);
  create_event("Basketball Tryouts", "Show off your skills and try out for our school basketball team. Tryouts are after school from 3:30-5:00.", 5, "2023-03-09", ["CoolestPrincipal"]);
  register_event("BestStudent", "Soccer Intermurals");
}

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

    // showPopup(currentUserPlace.toString());

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
    } else if (currentUserRole == "Administrator" || currentUserRole == "Principal") {
      await updateUsers();
      // showPopup(await updateUsers());
    }

    await updateEvents();
    await updateRankings();
    await updateWinners();

    makeRestrictedInvisible();

    // add_points(currentUser, 10)
    // verify_user(currentUser);

    document.getElementById("login-username").value = "";

    document.getElementById("popup").classList.add("invisible");
    document.getElementById("popup").classList.remove("visible");

    document.getElementById("page").classList.add("visible");
    document.getElementById("page").classList.remove("invisible");
  } else if (res == "Custom Error: Invalid Credentials") {
    loginError("Invalid Credentials");
  } else if (res == "Custom Error: Unverified User") {
    loginError("Your Account Has Not Been Verified By Your School");
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
  clearEventForm();
  makeRestrictedVisible();

  document.getElementById("popup").classList.add("visible");
  document.getElementById("popup").classList.remove("invisible");

  document.getElementById("page").classList.add("invisible");
  document.getElementById("page").classList.remove("visible");
}

async function createEvent(form: any) {
  form.preventDefault();
  let name: string = document.getElementById("event-name")?.value.trim();
  let description: string = document.getElementById("event-description")?.value.trim();
  let points: string = document.getElementById("event-points")?.value.trim();
  let date: string = document.getElementById("event-date")?.value.trim();
  // let hosts: string[] = document.getElementById("event-hosts")?.value.trim().replace(/\s+/g, '').split(",").unshift(currentUser);
  let hosts: string[] = [currentUser].concat(document.getElementById("event-hosts")?.value.trim().replace(/\s+/g, '').split(","));
  // A friendly, yet competitive, general knowledge competition between our two schools. Meet in Room 206 at 3:45.
  // Reach For The Top (vs. Bill Hogarth)
  let button: HTMLButtonElement = document.getElementById("event-button");

  button.disabled = true;

  if (name == "" || description == "" || points == "" || date == "") {
    eventError("Please Fill Out All Fields");
    button.disabled = false;
    return;
  }

  print(date);
  print(hosts.toString());

  let res = await create_event(name, description, parseInt(points), date, hosts);

  if (res == "Success") {
    clearEventForm();
    await updateEvents();
    hideAddEvent();
  } else {
    showPopup("Something Went Wrong");
  }

  button.disabled = false;
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

async function updateUsers() : Promise<string> {
  let allUsersTable = document.getElementById("all-users");
  allUsersTable.innerHTML = "<tr class='odd-row'>\n<th>Last Name</th>\n<th>First Name</th>\n<th>Username</th>\n<th>Email</th>\n<th>Role</th>\n<th>Grade</th>\n<th>Status</th>\n</tr>";

  let allUsers = await get_users();

  if (!("username" in allUsers[0])) {
    return allUsers[0];
  }

  for (let i = 0; i < allUsers.length; i++) {
    let button = `<button class="verify" data-user="${allUsers[i]["username"]}">Verify</button>`;

    if (allUsers[i]["verified"]) {
      button = `<button class="unverify" data-user="${allUsers[i]["username"]}">Unverify</button>`;
    }

    allUsersTable.innerHTML += `<tr class='${i % 2 == 0 ? "even" : "odd"}-row'>\n<td>${allUsers[i]["last_name"]}</td>\n<td>${allUsers[i]["first_name"]}</td>\n<td>${allUsers[i]["username"]}</td>\n<td>${allUsers[i]["email"]}</td>\n<td>${roles[allUsers[i]["role"] - 1]}</td>\n<td>${allUsers[i]["grade"] != 0 ? allUsers[i]["grade"] : "-"}</td>\n<td>${button}</td>\n</tr>`;
  }

  let verifyUsers = document.getElementsByClassName("verify");
  let unverifyUsers = document.getElementsByClassName("unverify");

  for (let i = 0; i < verifyUsers.length; i++) {
    verifyUsers[i].addEventListener("click", () => verifyUser(verifyUsers[i]));
  }

  for (let i = 0; i < unverifyUsers.length; i++) {
    unverifyUsers[i].addEventListener("click", () => unverifyUser(unverifyUsers[i]));
  }

  return "Success";
}

async function updateRankings() : Promise<string> {
  let allRankingsTable = document.getElementById("rankings-table");
  allRankingsTable.innerHTML = `<tr class="odd-rank"><th>Place</th><th>Username</th><th>Points</th></tr>`;

  let allRankings = await get_rankings();

  if (!("username" in allRankings[0])) {
    return allRankings[0];
  }

  for (let i = 0; i < allRankings.length; i++) {
    allRankingsTable.innerHTML += `<tr class="${i % 2 == 0 ? "even" : "odd"}-rank"><td>${allRankings[i]["place"].toString()}</td><td>${allRankings[i]["username"]}</td><td>${allRankings[i]["points"]}</td></tr>`
  }

  return "Success";
}

async function updateEvents() : Promise<string> {
  let allEventsDiv = document.getElementById("events-list");
  allEventsDiv.innerHTML = "";

  let allEvents = await get_events(currentUser);

  if (!("name" in allEvents[0])) {
    return allEvents[0];
  }

  for (let i = 0; i < allEvents.length; i++) {
    let date_split = allEvents[i]["date"].split("-");
    let event_date = new Date(Date.UTC(date_split[0], parseInt(date_split[1]) - 1, parseInt(date_split[2]) + 1));
    let now = new Date();

    let button = "";
    
    if (now.getFullYear() * 10000 + now.getMonth() * 100 + now.getDate() < event_date.getFullYear() * 10000 + event_date.getMonth() * 100 + event_date.getDate()) {
      if (!allEvents[i]["hosts"].includes(currentUser) && (currentUserRole == "Student" || currentUserRole == "Student Leader")) {
        if (allEvents[i]["registered"]) {
          button = `<button class="event-unregister" data-event="${allEvents[i]["name"]}">Unregister</button>`;
        } else {
          button = `<button class="event-register" data-event="${allEvents[i]["name"]}">Register</button>`;
        }
      }
    } else if (allEvents[i]["hosts"].includes(currentUser) && !allEvents[i]["points_given"]) {
      button = `<button class="event-give-points" data-event="${allEvents[i]["name"]}">Give Points</button>`;
    }
    
    allEventsDiv.innerHTML += `<div class="event ${i % 2 == 0 ? "odd" : "even"}-event">
      <h1>${allEvents[i]["name"]}</h1>
      <div class="event-info">
        <h3>Date: <span class="event-date">${allEvents[i]["date"]}</span></h3>
        <h3>Host(s): <span class="event-hosts">${allEvents[i]["hosts"].join(", ")}</span></h3>
        <h3>Point(s): <span class="event-points">${allEvents[i]["points"]}</span></h3>
      </div>
      <h3>${allEvents[i]["description"]}</h3>
      <div class="event-buttons">
        ${button}
      </div>
    </div>`;
  }

  let registerButtons = document.getElementsByClassName("event-register");
  let unregisterButtons = document.getElementsByClassName("event-unregister");
  let givePointsButtons = document.getElementsByClassName("event-give-points");

  for (let i = 0; i < registerButtons.length; i++) {
    registerButtons[i].addEventListener("click", () => eventRegister(registerButtons[i]));
  }

  for (let i = 0; i < unregisterButtons.length; i++) {
    unregisterButtons[i].addEventListener("click", () => eventUnregister(unregisterButtons[i]));
  }

  for (let i = 0; i < givePointsButtons.length; i++) {
    givePointsButtons[i].addEventListener("click", () => eventGivePoints(givePointsButtons[i]));
  }

  return "Success";
}

async function updateWinners() : Promise<string> {
  let mainWinner = document.getElementById("main-winner");
  let grade9Winner = document.getElementById("grade-9-winner");
  let grade10Winner = document.getElementById("grade-10-winner");
  let grade11Winner = document.getElementById("grade-11-winner");
  let grade12Winner = document.getElementById("grade-12-winner");

  let allWinners = await get_winners();

  if (allWinners.length != 5) {
    return allWinners[0];
  }

  mainWinner.innerHTML = allWinners[0];
  grade9Winner.innerHTML = allWinners[1];
  grade10Winner.innerHTML = allWinners[2];
  grade11Winner.innerHTML = allWinners[3];
  grade12Winner.innerHTML = allWinners[4];

  return "Success";
}

async function generateWinners() : Promise<string> {
  let mainWinner = document.getElementById("main-winner");
  let grade9Winner = document.getElementById("grade-9-winner");
  let grade10Winner = document.getElementById("grade-10-winner");
  let grade11Winner = document.getElementById("grade-11-winner");
  let grade12Winner = document.getElementById("grade-12-winner");

  let allWinners = await generate_winners();

  if (allWinners.length != 5) {
    return allWinners[0];
  }

  mainWinner.innerHTML = allWinners[0];
  grade9Winner.innerHTML = allWinners[1];
  grade10Winner.innerHTML = allWinners[2];
  grade11Winner.innerHTML = allWinners[3];
  grade12Winner.innerHTML = allWinners[4];

  return "Success";
}

async function verifyUser(button: Element) {
  button.disabled = true;
  let res = await verify_user(button.dataset.user);

  if (res == "Success") {
    let old_element = button;
    let new_element = old_element.cloneNode(true);
    old_element.parentNode.replaceChild(new_element, old_element);

    button = new_element;

    button.classList.remove("verify");
    button.classList.add("unverify");
    button.addEventListener("click", () => unverifyUser(button));
    button.innerHTML = "Unverify";
    button.disabled = false;
  } else {
    showPopup("Something Went Wrong");
    button.disabled = false;
  }
}

async function unverifyUser(button: Element) {
  print("a");
  button.disabled = true;
  let res = await unverify_user(button.dataset.user);

  if (res == "Success") {
    let old_element = button;
    let new_element = old_element.cloneNode(true);
    old_element.parentNode.replaceChild(new_element, old_element);

    button = new_element;

    button.classList.remove("unverify");
    button.classList.add("verify");
    button.addEventListener("click", () => verifyUser(button));
    button.innerHTML = "Verify";
    button.disabled = false;
  } else {
    showPopup("Something Went Wrong");
    button.disabled = false;
  }
}

async function eventRegister(button: Element) {
  button.disabled = true;
  let res = await register_event(currentUser, button.dataset.event);

  if (res == "Success") {
    let old_element = button;
    let new_element = old_element.cloneNode(true);
    old_element.parentNode.replaceChild(new_element, old_element);

    button = new_element;

    button.classList.remove("event-register");
    button.classList.add("event-unregister");
    button.addEventListener("click", () => eventUnregister(button));
    button.innerHTML = "Unregister";
    button.disabled = false;
  } else {
    showPopup("Something Went Wrong");
    button.disabled = false;
  }
}

async function eventUnregister(button: Element) {
  button.disabled = true;
  let res = await unregister_event(currentUser, button.dataset.event);

  if (res == "Success") {
    let old_element = button;
    let new_element = old_element.cloneNode(true);
    old_element.parentNode.replaceChild(new_element, old_element);

    button = new_element;

    button.classList.remove("event-unregister");
    button.classList.add("event-register");
    button.addEventListener("click", () => eventRegister(button));
    button.innerHTML = "Register";
  } else {
    showPopup("Something Went Wrong");
  }

  button.disabled = false;
}

async function eventGivePoints(button: Element) {
  button.disabled = true;
  let res = await give_event_points(button.dataset.event);

  if (res == "Success") {
    button.classList.add("invisible");
  } else {
    showPopup("Something Went Wrong");
  }

  button.disabled = false;
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

function showAddEvent() {
  document.getElementById("add-event-view").classList.remove("invisible");
  document.getElementById("add-event-view").classList.add("visible");
}

function hideAddEvent() {
  document.getElementById("add-event-view").classList.remove("visible");
  document.getElementById("add-event-view").classList.add("invisible");
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

function eventError(errorMsg: string) {
  let error = document.getElementById("event-error");

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

function hideEventError() {
  let error = document.getElementById("event-error");

  if (error != undefined) {
    error.classList.remove("visible");
    error.classList.add("invisible");
    error.innerHTML = "";
  }
}

function clearEventForm() {
  document.getElementById("event-name").value = "";
  document.getElementById("event-description").value = "";
  document.getElementById("event-points").value = "";
  document.getElementById("event-date").value = "";
  document.getElementById("event-hosts").value = "";
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

async function db_connect() : Promise<string> {
  let res = await invoke("db_connect");
  print(String(res));
  return String(res);
}

async function create_role(name: string, permissions:string) {
  let res = await invoke("create_role", {name: name, permissions: permissions});
  print(String(res));
}

async function create_user(username: string, password: string, firstName: string, lastName: string, email: string, role: string, grade: number = 0) : Promise<string> {
  let res = await invoke("create_user", {username: username, password: password, firstName: firstName, lastName: lastName, email: email, role: role, grade: grade});
  print(String(res));
  return String(res);
}

async function create_event(name: string, description: string, points: number, date: string, hosts: string[]) : Promise<string> {
  let res = await invoke("create_event", {name: name, description: description, points: points, date: date, hosts: hosts});
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
  let res = await invoke("unverify_user", {username: username}).catch(error => { return [error]; });;
  print(String(res));
  return String(res);
}

async function get_users() : Promise<[]> {
  let res = await invoke("get_users");
  print(String(res));
  return res;
}

async function get_events(username: string) : Promise<[]> {
  let res = await invoke("get_events", {username: username}).catch(error => { return [error]; });
  print(String(res));
  return res;
}

async function register_event(username: string, event: string) : Promise<string> {
  let res = await invoke("register_event", {username: username, event: event});
  print(String(res));
  return res;
}

async function unregister_event(username: string, event: string) : Promise<string> {
  let res = await invoke("unregister_event", {username: username, event: event});
  print(String(res));
  return res;
}

async function give_event_points(event: string) : Promise<string> {
  let res = await invoke("give_event_points", {event: event});
  print(String(res));
  return res;
}

async function get_rankings() : Promise<[]> {
  let res = await invoke("get_rankings").catch(error => { return [error]; });
  print(String(res));
  return res;
}

async function generate_winners() : Promise<[]> {
  let res = await invoke("generate_winners").catch(error => { return [error]; });
  print(String(res));
  return res;
}

async function get_winners() : Promise<[]> {
  let res = await invoke("get_winners").catch(error => { return [error]; });
  print(String(res));
  return res;
}
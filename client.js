/**
 * Resolve promise after set amount of ms
 * @param {int} - ms to wait for
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Get the value of a cookie
 * @param {string} key 
 * @returns {string} cookie value
 */
function getCookie(key) {
    var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
    return keyValue ? keyValue[2] : null;
}

// Redirect to login screen if no token is presemt
if(!getCookie("authToken")) document.location.pathname = "/";
const authToken = getCookie("authToken");

// Quarks
let quarks = {};

// Websocket related variables
let wss; // Actually the websocket
let retryCount = 0; // Amount of connection retries
let welcomeHasFinishedOnce = false; // Keep track of if the welcome flow has finished once
let heartbeat;

/**
 * Initialize Quarky
 * @returns {void}
 */
async function welcome() {
    changeLoading("Opening gateway connection...")
    openGateway()
    changeLoading("Fetching Quarks...");
    quarks = await quarkFetch();
    quarkRender(quarks);
    changeLoading("Doing the epic transition...");
    document.querySelector("#loader").classList.add("bye");
    new Audio("/assets/sfx/wb.mp3").play();
    welcomeHasFinishedOnce = true;
}

/**
 * Change loading screen text.
 * @param {string} text 
 * @returns {void}
 */
function changeLoading(text) {
    document.querySelector("#loaderexp").innerHTML = text;
}

let quarkTip;
/**
 * Populate quark list and add join & log out buttons
 * Clears old list
 * @param {object} quarks - List of quarks to populate the list with
 * @returns {void}
 */
async function quarkRender(quarks) { // i mean.. that only happens once? yeah true
    let quarkList = document.querySelector("#list");
    quarkList.innerHTML = "";
    quarks.forEach(quark => { // ok i wonder if this actually works it should
        quarkList.innerHTML += `<div class="quark" id="${quark._id}" onclick="switchQuark('${quark._id}');" data-tippy-content="${quark.name}">
    <img src="${quark.iconUri}">
</div>`
    })
    // Add join and log out buttons
    quarkList.innerHTML += `
            <div class="quark joiner" onclick="joinQuark();" data-tippy-content="Join a Quark">
                <span style="font-size: 2.88em; margin-left: 0.4em;">+</span>
            </div>
            <div class="quark logout" onclick="logOut();" data-tippy-content="Log Out :(">
                <span style="font-size: 2.4em; margin-left: 0.4em;">←</span>
            </div>`
    // Create a tippy tooltip if it doesnt already exist
    if (quarkTip) quarkTip.destroy();
    quarkTip = tippy(`.quark`, { 
        placement: "right",
        theme: "black"
    });
}
/**
 * Get the user's quarks
 * @returns {object} - Quark array
 */
async function quarkFetch() {
    let quarkResponse = await apiCall("/quark/me");
    if (quarkResponse) return quarkResponse.response.quarks;
}

/**
 * Make call to Lightquark API.
 * Returns false if failed, otherwise returns data.
 * 
 * @param {string} path  - Api endpoint, `/quark/me`
 * @param {"GET" | "POST" | "PATCH" | "PUT" | "DELETE"} method - Default GET
 * @param {object} body - Default empty object
 * @returns {object|false}
 */
 async function apiCall(path, method = "GET", body = {}) {
    let options = {
        method: method,
        headers: {
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/json"
        }
    }
    // GET requests cannot have a body
    if (method !== "GET") options.body = JSON.stringify(body);

    try {
        let res = await fetch(`https://lq.litdevs.org/v1${path}`, options);
        let data = await res.json();
        if (data.request.success) return data; // Success
        if (data.request.status_code === 401)  {
            logOut();
            return logOut(); // this isn't a good idea right
        }
        // Failed :(
        alert(`${data.request.status_code}:\n${data.response.message}`)
        return false;
    } catch (e) {
        alert(`Failed to make API call:\n${e}`);
        return false;
    }
}

function logOut() {
    document.cookie = "authToken=";
    document.location.pathname = "/";
}

function joinQuark() {
    let quarkCode = prompt("Enter the invite code for the Quark you want to join.");
    alert("Unfortunately, I'm not gonna do anything with that information :)")
}

function switchQuark(id) {
    document.querySelector(`.quark[id='${id}']`).classList.remove("stretch");
    void document.querySelector(`.quark[id='${id}']`).offsetWidth;
    document.querySelector(`.quark[id='${id}']`).classList.add("stretch");
}

welcome();

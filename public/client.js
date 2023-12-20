/**
 * Handles critical errors that don't have handlers (although this is a handler, and is used rarely, because im wazy)
 * @param {Object} error - the error (wow)
 */
function fatalError(error) {
    let crashDisease = document.createElement('span')
    crashDisease.innerHTML = `
        <div id="fatalerror">
            ${error.apiCode === 403 && error.apiEndpoint?.endsWith("/messages") ? `
            <img src="/assets/img/nyowope.jpg" alt="A 'no entry' sign that looks like it has cat ears." width="120" style="float: left; padding-right: 1em;">
            <h1>Nyowope!</h1>
            <p>
                W-what are you doing, ${window.currentUsername}-san?
                <br>You know you're not in that quark, right? Are you a heckin neko baka derp?
                <br>Maybe if you say "pwetty pwease", they'll give you the invite code...
            </p>
            ` : `
            <object data="/assets/img/error.svg" width="120" style="float: left;" id="crushed"></object>
            <h1>Fatal error!</h1>
            <p>
                Something terrible happened.
                <br>Quarky Classic doesn't know how to handle it, so it crashed.
                <br>Sowwy! I hope you can figure it out.
            </p>
            `}
        </div>
        <div id="fatalerrortrace">
        <b>${error.name || "Error"}: ${error.message || "Unknown error"}</b><br>${error.error?.message ? `${error.error.message}<br>` : ""}${error.apiEndpoint ? `(while attempting to ${error.apiMethod} /${error.apiEndpoint})<br>` : ""}<br>
        ${escapeHTML(Error().stack)}
        </div>
        <p><button onclick="logOut()">Log out</button> <button onclick="document.location.reload();">Reload</button></p>
    `
    document.body.innerHTML = "";
    document.body.appendChild(crashDisease);
    if(crashDisease.querySelector("#crushed")) crashDisease.querySelector("#crushed").onload = function() {
        if(window.userAvatar) crashDisease.querySelector("#crushed").contentDocument.querySelector("#murderer").setAttribute("xlink:href", window.userAvatar);
    }
    new Audio("/assets/sfx/osu-error-notification-pop-in.wav").play();
}

/**
 * Resolve promise after set amount of ms
 * @param {int} - ms to wait for
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Stores if jumping to the bottom automatically is allowed
window.jumpToBottom = true;

// Stores the current Quark
window.currentQuark = null;

// Stores the current channel
window.currentChannel = null;

// Stores the ID of the authenticated user
window.userID = null;

// Stores the username of the authenticated user
window.currentUsername = null;

// Stores the nickname of the authenticated user's current Quark
window.currentNickname = null;

// Stores channels
window.channelBox = {}

// Stores messages
window.messageBox = {}

// List of valid TLDs
window.tlds = [];

// An object of defaults for settings
window.defaults = {
    "notify": false,
    "mespecial": true,
    "usericons": true,
    "uwuprefix": false,
    "uwusubst": false,
    "uwusuffix": false,
    "language": "en"
}

// The user icons to randomly select from
window.usericons = [
    "fa6-solid:cat"
]

//list of image formats for attachments
//its from https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types I trust mozilla.
//also what is XMB????
image_file_types = [
    "png",
    "jpg",
    "jfif",
    "jpeg",
    "bmp",
    "apng",
    "avif",
    "gif",
    "ico",
    "svg",
    "webp",
    "xbm"
]

//list of video formats for attachments
//its from https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Containers 
//some are weird
video_file_types = [
    "3gp",
    "adts",
    "mpeg",
    "mp4",
    "mov",
    "webm",
    "mkv",
    "mpg"
]

//list of video formats for attachments
//its from what I could remember and Audacity, there is no list (that I could find)...
audio_file_types = [
    "wav",
    "mp3",
    "ogg",
    "flac"
]

// Cute purring sound effect
window.purr = new Audio("/assets/sfx/purr.mp3");
purr.loop = true;
purr.load();

// Stores the default network
const defaultNetwork = "lq.litdevs.org";

/**
 * Get the value of a cookie
 * @param {string} key 
 * @returns {string} - cookie value
 */
function getCookie(key) {
    var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
    return keyValue ? keyValue[2] : null;
}

/**
 * Escapes HTML, in case they need to be evacuated.
 * @param {string} unsafeText - Text to escape
 * @returns {string} Escaped text
 */
function escapeHTML(unsafeText) {
    let div = document.createElement('div');
    div.innerText = unsafeText;
    return div.innerHTML.replaceAll("<br>", "\n");
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
 * Initialize Quarky Classic
 * @returns {void}
 */
async function welcome() {
    if(isLocal) {
        document.querySelector("#planet").style.filter = "invert(1)";
        document.querySelector("#planet").src = "/assets/img/vukkyplanet.svg";
    }
    if(featureGacha.isEnabled("V_Companion")) document.querySelector("#annoyance").classList.remove("hidden");

    await loadStrings();
    showSplash();
    changeLoading(strings["FETCHING_NETWORK"]);
    await fetchNetwork();
    changeLoading(strings["FETCHING_USER_DATA"]);
    await fetchAviebox();

    // create tippies, don't ask me why this doesn't work otherwise
    tippy("#userdata .avie", {
        content: "It's me!",
        appendTo: document.querySelector("#userdata"),
        theme: "black",
        hideOnClick: false,
        animation: "scale",
        inertia: true,
    })
    tippy("#userdata .settings", {
        content: strings["SETTINGS"],
        appendTo: document.querySelector("#userdata"),
        theme: "black",
        hideOnClick: false,
        animation: "scale",
        inertia: true
    })
    tippy(".leavequark", {
        content: strings["LEAVE_QUARK"],
        theme: "black",
        hideOnClick: false,
        inertia: true,
    })
    tippy.delegate(`#messages`, {
        target: '.adminmark',
        theme: "black",
        hideOnClick: false,
        appendTo: document.querySelector("#messagesbox")
    });
    tippy.delegate(`#messages`, {
        target: '.bot',
        theme: "black",
        hideOnClick: false,
        appendTo: document.querySelector("#messagesbox"),
        allowHTML: true
    });
    tippy.delegate(`#watchedmojos`, {
        target: 'img',
        theme: "black",
        hideOnClick: false,
        allowHTML: true,
        appendTo: document.body,
        placement: "bottom",
        animation: "scale",
        inertia: true,
        followCursor: "horizontal",
    });

    changeLoading("Connecting to network...")
    openGateway();
}

/**
 * Sets the network data object which contains network information.
 * @returns {void}
 */
async function fetchNetwork() {
    await fetch(`https://${localStorage.getItem('preferredServer') || defaultNetwork}/vquarky/network`).then(res => res.json()).then(function(res) {
        window.networkData = res;
    }).catch(function(e) {
        fatalError({"name": "Network", "message": "Could not contact preferred network", "disableReport": true})
    })
}

/**
 * Loads strings
 * @returns {void}
 */
async function loadStrings(lang = settingGet("language")) {
    await fetch(`/assets/lang/${lang}.json`).then(res => res.json()).then(function(res) {
        window.strings = res;
    }).catch(async function(e) {
        if(lang === "en") fatalError({"name": "Localization", "message": "Could not download strings", "error": e})
    })
    if(lang !== "en") {
        await fetch(`/assets/lang/en.json`).then(res => res.json()).then(function(res) {
            window.strings = {...res, ...window.strings};
        }).catch(async function(e) {
           fatalError({"name": "Localization", "message": "Could not download strings", "error": e})
        })
    }

    window.dispatchEvent(new Event("stringchange"))
}

/**
 * Continue initializing Quarky Classic after the gateway has opened.
 * Say "Hewwo :3" to the gateway!
 * @returns {void}
 */
async function welcomeGateway() {
    changeLoading(strings["GETTING_SETTINGS"]);
    await settingsLoad();
    reloadMsgDeps(false);
    changeLoading(strings["RESTORING_OLD_SESSION"]);
    let previousQuark = new URLSearchParams(window.location.search).get("quark");
    let previousChannel = new URLSearchParams(window.location.search).get("channel");
    let previousChannelMissing = !previousChannel;
    if(previousQuark) await switchQuark(previousQuark, previousChannelMissing, false, false, false);
    if(previousChannel) await switchChannel(previousChannel, false);
    changeLoading(strings["FETCHING_QUARK_LIST"]);
    quarks = await quarkFetch();
    subscribeBomb(quarks);
    quarkRender(quarks);
    changeLoading(strings["LETTING_YOU_IN"]);
    document.querySelector("#loader").classList.add("bye");
    //document.querySelector("#wb").play();
    welcomeHasFinishedOnce = true;
    companionSpeech("GREETING");
}

/**
 * Change loading screen text.
 * @param {string} text 
 * @returns {void}
 */
function changeLoading(text) {
    document.querySelector("#loadinginfo").innerHTML = text;
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
    let quarkEmojiList = document.querySelector("#watchingmojo select");
    quarkList.innerHTML = "";
    quarkEmojiList.innerHTML = `<option disabled selected value="">Select quark...</option>`;
    quarks.forEach(quark => { // ok i wonder if this actually works it should
        quarkList.innerHTML += `<div class="quark" id="q_${quark._id}" onmouseenter="new Audio('/assets/sfx/osu-default-hover.wav').play();" onclick="switchQuark('${quark._id}');" data-tippy-content="${quark.name}">
    <img src="${quark.iconUri}">
</div>`
        quarkEmojiList.innerHTML += `<option value="${quark._id}">${quark.name}</option>`
    })
    quarkEmojiList.innerHTML += `<option disabled value="">Defaults...</option><option value="645216ca1e77b8a8b9e30093">R74moji</option><option value="646f9cecfa0e1c6207a3e6ff">Menhera-chan</option>`;
    // Add join and log out buttons
    quarkList.innerHTML += `${quarks.length > 0 ? "<hr>" : ""}
            <div class="quark joiner" onmouseenter="new Audio('/assets/sfx/osu-default-hover.wav').play();" onclick="joinQuark();" data-tippy-content="Join a Quark">
                <iconify-icon class="quarkicon" icon="material-symbols:apartment"></iconify-icon>
            </div>
            <div class="quark logout" onmouseenter="new Audio('/assets/sfx/osu-default-hover.wav').play();" onclick="logOut();" data-tippy-content="Log Out :(">
                <iconify-icon class="quarkicon" style="font-size: 2em;" icon="fa6-solid:person-through-window"></iconify-icon>
            </div>`
    // Create a tippy tooltip if it doesnt already exist
    if (quarkTip) quarkTip.forEach(tip => tip.destroy());
    quarkTip = tippy(`.quark`, { 
        placement: "right",
        theme: "black",
        hideOnClick: false,
        animation: "scale",
        inertia: true,
        followCursor: "vertical",
    });
}
/**
 * Get the user's quarks
 * @returns {object} - quark array
 */
async function quarkFetch() {
    let quarkResponse = await apiCall("/quark/me", "GET", {}, "v2");
    if (quarkResponse) return quarkResponse.response.quarks;
}

/**
 * Make call to Lightquark API.
 * Returns false if failed, otherwise returns data.
 * 
 * @param {string} path  - Api endpoint, `/quark/me`
 * @param {"GET" | "POST" | "PATCH" | "PUT" | "DELETE"} method - Default GET
 * @param {object} body - Default empty object
 * @param {string} apiVersion - Default v1
 * @param {object} headers - Additonal headers
 * @param {boolean} stringify - Stringify the body? default yes
 * @returns {object|false}
 */
 async function apiCall(path, method = "GET", body = {}, apiVersion = "v1", headers = {}, stringify = true) {
    let options = {
        method: method,
        headers: {
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/json",
            "User-Agent": `Qua${uwutils.allowed() ? "w" : "r"}ky C${uwutils.allowed() ? "w" : "l"}assic${window.isLocal ? " (local ^~^)" : ""}`,
            "lq-agent": `Qua${uwutils.allowed() ? "w" : "r"}ky C${uwutils.allowed() ? "w" : "l"}assic${window.isLocal ? " (local ^~^)" : ""}`,
            ...headers
        }
    }
    // GET requests cannot have a body
    if (method !== "GET") {
        if(stringify) {
            options.body = JSON.stringify(body);
        } else {
            options.body = body;
        }
    }

    try {
        let res = await fetch(`${networkData.baseUrl}/${apiVersion}${path}`, options);
        let data = await res.json();
        if (data.request.success) return data; // Success
        if (data.request.status_code === 401)  {
            logOut();
            return false;
        }
        // Return data, even though success is false
        if (data.request.status_code === 404) {
            return data;
        }
        // Failed :(
        fatalError({"name": "Lightquark API", "message": `${data.request.status_code}: ${data.response.message}`, "apiCode": data.request.status_code, "apiEndpoint": `${apiVersion}${path}`, "apiMethod": method})
        return false;
    } catch (e) {
        fatalError(e);
        return false;
    }
}

/**
 * Clear the auth cookie and go back to login
 * @returns {void}
 */
function logOut() {
    document.cookie = "authToken=";
    document.location.pathname = "/";
}

/**
 * Join a Quark
 * @returns {void}
 */
async function joinQuark() {
    new Audio('/assets/sfx/osu-dialog-pop-in.wav').play();
    let quarkCode = prompt(strings["ENTER_INVITE_CODE"]);
    if (!quarkCode) return new Audio('/assets/sfx/osu-dialog-cancel-select.wav').play();
    let joinResponse = await apiCall(`/quark/invite/${quarkCode}`, "POST");
    if (!joinResponse) return alert(`Failed to join quark :(\n${joinResponse.response.message}`)
    if(settingGet("notify")) subscribeBomb([joinResponse.response.quark]);
    quarks = await quarkFetch();
    quarkRender(quarks);
    switchQuark(joinResponse.response.quark._id);
}

/**
 * Changes to another Quark
 * @param {string} id - The ID of the quark to change to.
 * @param {boolean} forceChannel - Force the first channel to load.
 * @param {boolean} sfx - Play the sound effect.
 * @param {boolean} anim - Play the animation.
 * @param {boolean} replaceState - Replace the history state.
 * @returns {void}
 */
async function switchQuark(id, forceChannel = true, sfx = true, anim = true, replaceState = true) {
    if(sfx) new Audio("/assets/sfx/osu-button-select.wav").play();

    if(anim) document.querySelector(`#q_${id}`).classList.remove("stretch");
    if(anim) void document.querySelector(`#q_${id}`).offsetWidth;
    if(anim) document.querySelector(`#q_${id}`).classList.add("stretch");
    window.currentQuark = id;
    if(replaceState) history.replaceState(id, "", `/client.html?quark=${currentQuark}`);
    window.currentNickname = (await apiCall(`/user/me/nick/${currentQuark}`, "GET", {}, "v2")).response.nickname;
    document.querySelector("#userdata .lusername").innerText = window.currentNickname;

    let quark = (await apiCall(`/quark/${id}`)).response.quark;
    document.querySelector("#namewrap").innerText = quark.name;
    if(quark.owners.includes(userID)) {
        document.querySelector(".leavequark").classList.add("hidden");
    } else {
        document.querySelector(".leavequark").classList.remove("hidden");
    }
    channelListRender(quark.channels);
    if(forceChannel) {
        if(quark.channels[0]) return switchChannel(quark.channels[0]._id, false);
        document.querySelector("#messages").innerHTML = "";
        document.querySelector("#channeltopic").innerHTML = `<iconify-icon icon="clarity:warning-solid"></iconify-icon> ${strings["NO_CHANNELS"]}`;
        document.querySelector("#channelname").innerText = "";
    }
}

/**
 * Populates channel list.
 * @param {array} channels - The list of channels to populate the list with.
 * @returns {void}
 */
async function channelListRender(channels) {
    document.querySelector("#channels").innerHTML = "";
    channels.forEach(channel => {
        document.querySelector("#channels").innerHTML += `
            <div class="channel" id="${channel._id}" onmouseenter="new Audio('/assets/sfx/osu-default-hover.wav').play();" onclick="switchChannel('${channel._id}')">${channel.name}</div>
        `
    })
}

/**
 * Makes the message format make more sense to me.
 * @param {array} message - The message to clean.
 * @returns {object} The cleaned message.
 */
function cleanMessage(message) {
    return {
        ...message.message,
        "author": {
            ...message.author
        }
    }
}

/**
 * Gets the file name and size from a URL.
 * @param url - The link to the file.
 * @returns {{size: string, name: string}}
 */
function getFileMetadata(url) {
    const http = new XMLHttpRequest();
    http.open('HEAD', url, false); // false = Synchronous

    http.send(null); // it will stop here until this http request is complete

    // when we are here, we already have a response, b/c we used Synchronous XHR

    if (http.status === 200) {
        const fileSize = http.getResponseHeader('content-length');
        const fileName = http.getResponseHeader('content-disposition');
        return {"size": prettySize(fileSize), "name": fileName.split("filename=\"")[1].slice(0,-1)};
    } else if (http.status === 404) {
        alert("File was not found on server.")
    } else {
        alert("Something happened to the server. (not 404)\nhttp code "+http.status+" was returned")
    }
}

/**
 * Formats bytes into human-readable sizes.
 * @param bytes - The bytes.
 * @returns {string}
 */
function prettySize(bytes){
    if (bytes < 1024) return bytes + " bytes";
    const kilo = bytes / 1024;
    if (kilo < 1024) return kilo.toFixed(1) + " KB";
    const mega = kilo / 1024;
    if (mega < 1024) return mega.toFixed(1) + " MB";
    const giga = mega / 1024;
    return giga.toFixed(1) + " GB";
}

/**
 * Generates the HTML for a download button.
 * @param attachmentURL - The URL to the attachment.
 * @returns {string}
 */
function downloadButton(attachmentURL){
    return `<a style="padding-left: 1rem;" href='${attachmentURL}' target="_blank" rel="noreferrer noopener"><iconify-icon icon="material-symbols:download" style="font-size: 1.5em;"></iconify-icon></a>`;
}

/**
 * Checks the file type of an attachment and generates appropiate HTML.
 * TODO: Always use getFileMetadata, use it to better find out the file type. This could also allow for better 404 handling.
 * @param attachmentURL - The URL to the attachment.
 * @returns {string}
 */
function checkFileTypes(attachmentURL){
    let thesplit = attachmentURL.split(".").length-1
    if(image_file_types.includes(attachmentURL.split(".")[thesplit])){
        return `<br><img src='${attachmentURL}' width='400'>` + downloadButton(attachmentURL);
    }else if(video_file_types.includes(attachmentURL.split(".")[thesplit])){
        return `<br><video controls width="250"><source src='${attachmentURL}' type='video/${attachmentURL.split(".")[thesplit]}'></video>` + downloadButton(attachmentURL);
    }else if(audio_file_types.includes(attachmentURL.split(".")[thesplit])){
        return `<br><audio controls src='${attachmentURL}'>` + downloadButton(attachmentURL);
    }else{
        let fileMetadata = getFileMetadata(attachmentURL)
        return `<div class="downloadable_file_div"><a class="downloadable_file" target='_blank' href='${attachmentURL}'>${fileMetadata.name} (${fileMetadata.size})<iconify-icon icon="material-symbols:download"></iconify-icon></a>`
    }
}

/**
 * A wrapper for checkFileTypes.
 * @param attachments - The attachments on the message.
 * @returns {string}
 */
function attachmentTextifier(attachments) {
        let output = "";
        attachments.forEach(attachment => output += checkFileTypes(attachment));
        return output;
}

/**
 * Renders a message.
 * @param {array} message - The message to render.
 * @returns {void}
 */
async function messageRender(message) {
    let doUwU = !message.ua.startsWith("Quawky") && uwutils.allowed(); // check if UwUspeak is allowed
    let botMetadata = message.specialAttributes.find(attr => attr.type === "botMessage");
    let isReply = message.specialAttributes.find(attr => attr.type === "reply");
    let isCuteKitty = message.specialAttributes.find(attr => attr.type === "clientAttributes")?.isCat;
    let repliedMessage = undefined;
    if(isReply) repliedMessage = messageBox[isReply.replyTo];
    if (botMetadata) { // handle bots
        message.author.botUsername = message.author.username;
        message.author.username = botMetadata.username;
        message.author.avatarUri = botMetadata.avatarUri;

        if(message.authorId === "63eb7b8630d172b639647de1") message.discordBridge = true;
    }

    let messageDiv = document.createElement('div');
    messageDiv.classList.add("message");
    messageDiv.id = `m_${message._id}`;
    if(message.specialAttributes.some(attr => attr.type === "/me") && settingGet("mespecial")) {
        console.log()
        messageDiv.classList.add("roleplay");
        messageDiv.innerHTML = `
            ${isReply ? `<div class="reply"><iconify-icon icon="mdi:thinking"> <b><span class="rusername">${repliedMessage?.message.specialAttributes.find(attr => attr.type === "botMessage")?.username || repliedMessage?.author.username || "Unknown user"}</b></span> <span class="rusercontent">${repliedMessage?.message.content.replaceAll("<br>", " ") || "Unknown message"}</span></div>` : ""}
            <span class="lusername">${escapeHTML(message.author.username)} ${botMetadata ? `<span class="bot ${message.discordBridge ? "discord" : ""}" data-tippy-content="This message was sent by <b>${escapeHTML(message.author.botUsername)}</b>.">${message.discordBridge ? "Discord" : "Bot"}</span>` : ''}</span>
            <div class="messagecontent">${doUwU ? `*${linkify(uwutils.substitute(escapeHTML(message.content)))}* ${uwutils.getEmotisuffix()}` : linkify(escapeHTML(message.content))}</div>
            <small class="timestamp">${new Date(message.timestamp).toLocaleString()} via ${escapeHTML(message.ua)}</small>
            <br><span class="attachments">${message.attachments && message.attachments.length > 0 ? attachmentTextifier(message.attachments) : linkify("")}</span>`;
    } else {
        messageDiv.innerHTML = `
            ${isReply ? `<div class="reply"><iconify-icon icon="mdi:thinking"> <b><span class="rusername">${repliedMessage?.message.specialAttributes.find(attr => attr.type === "botMessage")?.username || repliedMessage?.author.username || "Unknown user"}</b></span> <span class="rusercontent">${repliedMessage?.message.content.replaceAll("<br>", " ") || "Unknown message"}</span></div>` : ""}
            ${message.author._id == window.userID ? `<span class="actions"><button onclick="this.disabled=true;deleteMessage('${message._id}')">Delete</button></span>` : ""}
            <span class="avie">
                <img src="${message.author.avatarUri}" class="loading trueavie" onload="this.classList.remove('loading');" onerror="this.classList.remove('loading');this.onload='';this.src='/assets/img/fail.png'" onmouseover="this.parentNode.classList.add('petting');purr.currentTime=0;purr.play()"  onmouseout="this.parentNode.classList.remove('petting');purr.pause()">
                ${message.author.admin ? "<img src='/assets/img/adminmark.svg' class='adminmark' width='32' data-tippy-content='I&apos;m a Lightquark developer!'>" : ""}
                ${isCuteKitty ? "<img src='/assets/img/catears.png' class='catears'>" : ""}
            </span>
            <span class="lusername">${settingGet("usericons") ? `<iconify-icon class="usericon" icon="${rarrayseed(window.usericons, message.author.username)}"></iconify-icon> ` : ""}<span class="realname">${escapeHTML(message.author.username)}</span> ${botMetadata ? `<span class="bot ${message.discordBridge ? "discord" : ""}" data-tippy-content="This message was sent by <b>${escapeHTML(message.author.botUsername)}</b>.">${message.discordBridge ? "Discord" : "Bot"}</span>` : ''} <small class="timestamp">${new Date(message.timestamp).toLocaleString()} via ${escapeHTML(message.ua)}</small></span>
            <div class="messagecontent">${doUwU ? dismoteToImg(linkify(uwu(escapeHTML(message.content)))) : dismoteToImg(linkify(escapeHTML(message.content)))}</div>
            <span class="attachments">${message.attachments && message.attachments.length > 0 ? attachmentTextifier(message.attachments) : linkify("")}</span>
            <br>
        `;
    }
    document.querySelector("#messages").appendChild(messageDiv);
    if(jumpToBottom) document.querySelector("#messagesbox").scrollTop = document.querySelector("#messagesbox").scrollHeight;
    if(isReply && !repliedMessage) {
        await fetchContext(message._id, isReply.replyTo);
        if(jumpToBottom) document.querySelector("#messagesbox").scrollTop = document.querySelector("#messagesbox").scrollHeight;
    }
}

/**
 * Changes to another channel
 * @param {string} id - The ID of the channel to change to.
 * @param {boolean} audioOn - Play sound effect, defaults to true.
 * @returns {void}
 */
async function switchChannel(id, audioOn = true) {
    if(audioOn) new Audio("/assets/sfx/osu-button-select.wav").play();

    // Handle subscrpiptions
    if(!settingGet("notify")) {
        wss.send(JSON.stringify({event: "subscribe", message: `channel_${id}`}))
        if(currentChannel) wss.send(JSON.stringify({event: "unsubscribe", message: `channel_${currentChannel}`}))
    }

    currentChannel = id;
    history.replaceState(id, "", `/client.html?quark=${currentQuark}&channel=${id}`)

    document.querySelector("#channeltopic").innerHTML = "<iconify-icon icon=\"mdi:comments\"></iconify-icon> Fetching messages...";
    document.querySelector("#channelname").innerText = "";
        let messages = (await apiCall(`/channel/${id}/messages`, "GET", {}, "v2")).response.messages;
    document.querySelector("#messages").innerHTML = "";
    messages = messages.sort(function(x,y) {
        return x.message.timestamp - y.message.timestamp;
    });
    messages.forEach(message => {
        if(!messageBox[message.message._id]) messageBox[message.message._id] = message;
        messageRender(cleanMessage(message));
    });
    let channelInfo = (await apiCall(`/channel/${id}`)).response.channel;
    document.querySelector("#channelname").innerText = channelInfo.name;
    document.querySelector("#channeltopic").innerText = channelInfo.description;
    document.querySelector("#messagesbox").scrollTop = document.querySelector("#messagesbox").scrollHeight;
}

/**
 * Makes sure if auto-scrolling is acceptable or not.
 * @returns {void}
 */
function scrollingDetected() {
    jumpToBottom = Math.abs(document.querySelector("#messagesbox").scrollHeight - document.querySelector("#messagesbox").clientHeight - document.querySelector("#messagesbox").scrollTop) < 1
}

/**
 * Sends a message
 * @param {string} message - The message to send.
 * @returns {void}
 */
async function sendMessage(message) {
    if(message == "") return displayError(strings["MESSAGE_REQUIRED"]);
    let specialAttributes = []; // TODO: in case i need to hack in more later
    let clientAttributes = {}

    new Audio("/assets/sfx/osu-submit-select.wav").play();
    document.querySelector("#sendmsg").value = "";

    // handle special effects
    message = message.replace(/\B\/shrug\b/gm, "¯\\_(ツ)_/¯"); // allow shrugging
    message = message.replace(/\B\/tableflip\b/gm, "(╯°□°)╯︵ ┻━┻"); // allow tableflipping
    message = message.replace(/\B\/unflip\b/gm, "┬─┬ノ( º _ ºノ)"); // allow unflipping
    if(message.startsWith("/me")) { // allow /me-ing
        message = message.substring(4);
        specialAttributes.push({"type": "/me"});
    }
    if(uwutils.allowed()) {
        clientAttributes.plaintext = message;
        clientAttributes.isCat = "yeeees i am indeed a cute kitty nya~"
        if(specialAttributes.some(atrb => atrb.type == "/me")) { // Hakase *fowmats uuw /me cutewy* >w>
            message = `*${uwutils.substitute(message)}* ${uwutils.getEmotisuffix()}`
        } else {
            message = uwu(message);
        }
    }

    if(Object.keys(clientAttributes).length !== 0) specialAttributes.push({type: "clientAttributes", ...clientAttributes})

    apiCall(`/channel/${currentChannel}/messages`, "POST", {"content": message, specialAttributes: specialAttributes}, "v2");
}

/**
 * Fetches the user data and updates the aviebox & settings screen.
 * @returns {void}
 */
async function fetchAviebox() {
    let userData = (await apiCall("/user/me")).response.jwtData;
    window.userID = userData._id;
    featureGacha.setContextField('userId', window.userID);
    window.userAvatar = userData.avatar;
    window.currentUsername = (await apiCall(`/user/me/nick/global`, "GET", {}, "v2")).response.nickname;
    if(currentQuark) window.currentNickname = (await apiCall(`/user/me/nick/${currentQuark}`, "GET", {}, "v2")).response.nickname;

    // update aviebox
    document.querySelector("#userdata .lusername").innerText = window.currentNickname || window.currentUsername;
    document.querySelector("#userdata .avie").src = userData.avatar;

    // update settings screen
    document.querySelectorAll("#settings .message.fake .avie img").forEach(avie => avie.src = userData.avatar)
    previewUsername(window.currentUsername)
}

/**
 * Changes a setting in the localStorage.
 * @param {string} key - The key to change.
 * @param {string} value - The value to set it to.
 * @param {boolean} sfx - Play a sound effect if it is a boolean.
 * @returns {void}
 */
function settingSet(key, value, sfx = true) {
    if(typeof value == "boolean" && sfx) new Audio(`/assets/sfx/osu-checkbox-${value}.wav`).play()
    localStorage.setItem(key, JSON.stringify({type: typeof value, value: value})) // this json was amy's idea. if you end up hating it later, blame her
}

/**
 * Get a setting in the localStorage.
 * @param {string} key - The key to get.
 * @returns {any} - The value of the key.
 */
function settingGet(key) {
    // THE FOLLOWING HACK WAS AMY'S IDEA. IF YOU END UP HATING IT LATER, BLAME HER
    if(!localStorage.getItem(key)) settingSet(key, defaults[key], false);
    let valueData = JSON.parse(localStorage.getItem(key))

    if(valueData.type == "string") return valueData.value;
    if(valueData.type == "number") return parseFloat(valueData.value);
    if(valueData.type == "boolean") return JSON.parse(valueData.value);
}

/**
 * Loads localStorage settings into the settings modal.
 * @returns {void}
 */
function settingsLoad() {
    document.querySelectorAll("#settingssettings vukky-toggle").forEach(function(vukkyToggle) { // fetch all checkboxes
        if(settingGet(vukkyToggle.getAttribute('setting'))) vukkyToggle.checked = settingGet(vukkyToggle.getAttribute('setting')) // set the checkbox
    })
}

/**
 * Prepare the user for the magic of notifications.
 * Requests the notification permission.
 * @returns {void}
 */
async function notifyRequest() {
    if(settingGet("notify")) {
        settingSet("notify", false);
        document.location.reload();
        return;
    }

    await Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          settingSet("notify", true)
          subscribeBomb()
          sendNotification(strings["NOTIFICATIONS_ENABLED_TITLE"], strings["NOTIFICATIONS_ENABLED_BODY"])
        } else {
            document.querySelector("#settingssettings vukky-toggle[setting='notify']").checked = false;
            settingSet("notify", false)
            displayError(strings["NOTIFICATIONS_DENIED"]);
        }
    });
}

/**
 * Sends a notification.
 * @param {string} title - The title of the notification.
 * @param {string} body - The body of the notification.
 * @param {object} options - The options.
 * @returns {void}
 */
function sendNotification(title, body = undefined, options = {}) {
    if(options.sfx !== false) new Audio("/assets/sfx/osu-now-playing-pop-in.wav").play();
    let sentNotification = new Notification(title, {body: body, image: options.image, icon: options.icon || "/assets/img/quarky.svg", tag: options.tag});
    sentNotification.onclick = options.handler;
}

/**
 * Subscribes to all channels.
 * @param {object} quarks - To prevent redundancy, if you already have a quark list, pass it. If not, it will be fetched.
 * @returns {void}
 */
async function subscribeBomb(quarks = undefined) {
    if(!quarks) quarks = await quarkFetch();
    quarks.forEach(function(quark) {
        quark.channels.forEach(async function(channel) {
            channel.quarkId = channel.quark;
            channel.quark = quark.name;
            channelBox[channel._id] = channel;
            wss.send(JSON.stringify({event: "subscribe", message: `channel_${channel._id}`}))
        })
    })
}

/**
 * Display an error message.
 * This might seem redundant, but doing it will let me swap it for an actual error UI later.
 * @param {string} body - The error message to display.
 * @returns {void}
 */
function displayError(body) {
    new Audio("/assets/sfx/osu-error-notification-pop-in.wav").play();
    alert(body);
}

/**
 * Dynamically loads JS. Lovingly stolen from https://stackoverflow.com/a/31374433.
 * @param {string} url - The URL of the script to load.
 * @param {function} implementationCode - The code to run once the script is loaded.
 * @param {location} location - Where to inject the script tag. Defaults to document.body.
 * @returns {void}
 */
function loadJS(url, implementationCode, location = document.body){
    //url is URL of external file, implementationCode is the code
    //to be called from the file, location is the location to 
    //insert the <script> element

    var scriptTag = document.createElement('script');
    scriptTag.src = url;

    scriptTag.onload = implementationCode;
    scriptTag.onreadystatechange = implementationCode;

    location.appendChild(scriptTag);
};

/**
 * Reloads the current channel.
 * @returns {void}
 */
async function reloadChannel() {
    if(!currentChannel) return;
    switchChannel(currentChannel, false)
}

/**
 * Reloads things dependent on the message settings.
 * @param {boolean} rch - Reload the channel?
 * @returns {void}
 */
async function reloadMsgDeps(rch = true) {
    // handle user icons
    if(settingGet("usericons")) {
        document.querySelectorAll("#settings .message.fake .usericon").forEach(usericon => usericon.classList.remove("hidden"))
    } else {
        document.querySelectorAll("#settings .message.fake .usericon").forEach(usericon => usericon.classList.add("hidden"))
    }
    // handle uwuspeak
    if(uwutils.allowed()) {
        document.querySelector("#settings .message.fake.cozy .messagecontent").innerText = uwu("I'm a Quarky Classic user!");
        document.querySelector("#settings .message.fake.roleplaycfg .messagecontent").innerText = `*${uwutils.substitute("is excited")}* ${uwutils.getEmotisuffix()}`
        document.querySelector("#settings .message.fake.noroleplay .messagecontent").innerText = uwu("is excited")
        document.querySelectorAll("#settings .message.fake .timestamp").forEach(timestamp => timestamp.innerText = "right now via Quawky Cwassic")
    } else {
        document.querySelector("#settings .message.fake.cozy .messagecontent").innerText = "I'm a Quarky Classic user!";
        document.querySelectorAll("#settings .message.fake.roleplaycfg .messagecontent").forEach(msgtxt => msgtxt.innerText = "is excited")
        document.querySelectorAll("#settings .message.fake .timestamp").forEach(timestamp => timestamp.innerText = "right now via Quarky Classic")
    }
    // handle /me rendering
    if(settingGet("mespecial")) {
        document.querySelector("#settings .message.fake.noroleplay").classList.add("hidden");
        document.querySelector("#settings .message.fake.roleplay").classList.remove("hidden");
    } else {
        document.querySelector("#settings .message.fake.noroleplay").classList.remove("hidden");
        document.querySelector("#settings .message.fake.roleplay").classList.add("hidden");
    }

    reloadChannel();
}

/**
* Pick a random item from an array based on a seed. Lovingly stolen from https://stackoverflow.com/a/7493982.
* @param {array} arr - The array to pick a random item from.
* @param {string} seed - The seed.
*/
function rarrayseed(arr, seed) {
    if(seed.length == 1) seed += "x";
    var charCodes = seed.split('').reduce(function(a, b, i) {
        return (i == 1 ? a.charCodeAt(0) : +a) + b.charCodeAt(0);
    });
    return arr[charCodes % arr.length]
}

/**
 * Opens the file picker and uploads the avatar.
 * @param uploadWrap - Optional, the upload wrapper
 * @returns {void}
 */
function uploadAvie(uploadWrap) {
    let uploadIcon = uploadWrap.querySelector("iconify-icon");
    
    // https://stackoverflow.com/a/40971885
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = "image/*";
    input.onchange = async e => { 
        uploadIcon.style.animation = "stretchcenter 0.2s infinite linear";
        let file = e.target.files[0]
        let arrayBuffer = await file.arrayBuffer()
        apiCall("/user/me/avatar", "PUT", arrayBuffer, "v2", {"Content-Type": file.type}, false).then(function(result) {
            if(result.request.success) {
                if(featureGacha.isEnabled("V_DontAvieReload")) {
                    vukkybox(strings["AVATAR_UPDATED_BODY"], "updatepfp", strings["AVATAR_UPDATED_TITLE"])
                } else {
                    alert("Avatar successfully changed!\nPlease sign in again to apply it.")
                    logOut();
                }
            }
        })
    }     
    input.click();
}

/**
 * Turns Discord emote strings in a string into image tags.
 * @param {string} string - The string to perform converting on.
 * @returns {string} - The converted string.
 */
function dismoteToImg(string) {
    let normalEmote = /(<|&lt;|&wt;):[a-zA-Z0-9_]+:(\d+)(>|&gt;)/g
    let animatedEmote = /(<|&lt;|&wt;)a:[a-zA-Z0-9_]+:(\d+)(>|&gt;)/g
    let lightquarkEmote = /(<|&lt;|&wt;)[^:\s]+:([a-f0-9]+)(>|&gt;)/gm
    let normalEmoteIds = [...string.matchAll(normalEmote)]
    let animatedEmoteIds = [...string.matchAll(animatedEmote)]
    let lightquarkEmoteIds = [...string.matchAll(lightquarkEmote)]

    normalEmoteIds.forEach(function(id) {
        string = string.replace(id[0], `<img src="https://cdn.discordapp.com/emojis/${id[2]}.png" height="28">`)
    })
    animatedEmoteIds.forEach(function(id) {
        string = string.replace(id[0], `<img src="https://cdn.discordapp.com/emojis/${id[2]}.gif" height="28">`)
    })
    lightquarkEmoteIds.forEach(function(id) {
        string = string.replace(id[0], `<img src="${networkData.baseUrl}/v2/quark/emotes/${id[2]}/image" height="28">`)
    })
    return string;
}

/**
 * Leaves the current quark.
 * @returns {void}
 */
async function leaveQuark() {
    let quarkData = (await apiCall(`/quark/${currentQuark}`)).response.quark
    new Audio('/assets/sfx/osu-dialog-pop-in.wav').play();
    if(confirm(`Are you sure you want to leave ${quarkData.name}?\nYou will need its invite (${quarkData.invite}) to join it again.`) === true) {
        await apiCall(`/quark/${currentQuark}/leave`, "POST");
        new Audio('/assets/sfx/osu-dialog-dangerous-select.wav').play();
        document.querySelector(`#q_${currentQuark}`).remove();
        goToTheVoid();
    } else {
        new Audio('/assets/sfx/osu-dialog-cancel-select.wav').play();
    }
}

/**
 * Goes back to the empty state, if that is required for some reason.
 * @param {boolean} replaceState - Replace the history state.
 * @returns {void}
 */
function goToTheVoid(replaceState = true) {
    document.querySelector("#namewrap").innerText = strings["SELECT_A_QUARK"];
    document.querySelector("#channels").innerHTML = "";
    document.querySelector(".leavequark").classList.add("hidden");
    window.currentQuark = null;
    window.currentChannel = null;
    if(replaceState) history.replaceState(null, "", `/client.html`);
}

/**
 * Updates the appearance previews with the new username.
 * @param {string} username - The username.
 * @returns {void}
 */
function previewUsername(username) {
    document.querySelectorAll("#settings .message.fake .fakename").forEach(function(fakename) {
        fakename.value = username;
        fakename.style.width = `${username.length + 1}ch`;
    })
    if(username.length === 0) {
        document.querySelectorAll("#settings .message.fake .usericon").forEach(usericon => usericon.setAttribute("icon", "fa6-solid:person-circle-question"))
    } else {
        document.querySelectorAll("#settings .message.fake .usericon").forEach(usericon => usericon.setAttribute("icon", rarrayseed(window.usericons, username)))
    }
} 

/**
 * Exits the settings and saves data that might require extra server load.
 * @returns {void}
 */
async function exitSettings() {
    window.exitingSettings = true;
    new Audio('/assets/sfx/osu-overlay-pop-out.wav').play();

    if(window.currentUsername !== document.querySelector(".fakename").value) { // if your current username doesn't match the settings username...
        document.querySelectorAll("#settings .message.fake .fakename").forEach(fakename => fakename.disabled = true) // disable the settings username boxes to present messing with
        await apiCall("/user/me/nick", "PUT", {"scope": "global", "nickname": document.querySelector(".fakename").value}, "v2"); // change your username
        window.currentUsername = document.querySelector(".fakename").value; // store your username for later checks
        reloadChannel(); // reload the channel
        document.querySelector("#userdata .lusername").innerText = document.querySelector(".fakename").value; // update the avieboxes
        document.querySelectorAll("#settings .message.fake .fakename").forEach(fakename => fakename.disabled = false) // unleash the settings username boxes once more
    }

    document.querySelector('#settings').classList.add('hidden');
    window.exitingSettings = false;
    switchTab('general');
}

/**
 * Deletes a message.
 * @param {string} message - The message ID.
 * @returns {void}
 */
async function deleteMessage(message) {
    apiCall(`/channel/${currentChannel}/messages/${message}`, "DELETE", undefined, "v2");
}

/**
 * Plays the delete animation on a message.
 * @param {string} message - The message ID.
 * @returns {void}
 */
async function killMessage(message) {
    if(!document.querySelector(`#m_${message}`)) return;
    document.querySelector(`#m_${message}`).classList.add("kill");
    setTimeout(() => {
        document.querySelector(`#m_${message}`).remove();
    }, 1000);
}

/**
 * Fetches context for an unavailable reply.
 * @param {string} message - The original message ID.
 * @param {string} replyMessage - The message that was replied to.
 * @returns {void}
 */
async function fetchContext(message, replyMessage) {
    if(!document.querySelector(`#m_${message}`)) return;
    document.querySelector(`#m_${message} .rusername`).innerText = "Fetching context...";
    document.querySelector(`#m_${message} .rusercontent`).innerText = "";
    let result = await apiCall(`/channel/${currentChannel}/messages/${replyMessage}`, "GET", "", "v2");
    if (result.request.status_code === 404) {
        document.querySelector(`#m_${message} .rusername`).innerText = "";
        document.querySelector(`#m_${message} .rusercontent`).innerText = "This message has been deleted";
        return;
    }
    let botMetadata = result.response.data.message.specialAttributes.find(attr => attr.type === "botMessage");
    messageBox[replyMessage] = result.response.data;
    document.querySelector(`#m_${message} .rusername`).innerText = botMetadata?.username || result.response.data.author.username;
    document.querySelector(`#m_${message} .rusercontent`).innerText = result.response.data.message.content;
}

/**
 * Switches to a different tab in the settings.
 * @param {string} tab - The tab to switch to.
 * @returns {void}
 */
async function switchTab(tab) {
    if(window.exitingSettings) return;
    document.querySelector("#settingstabs [tab].selected").classList.remove("selected");
    document.querySelector("#settingssettings [tab]:not(.hidden)").classList.add("hidden");
    document.querySelector(`#settingstabs [tab="${tab}"]`).classList.add("selected");
    document.querySelector(`#settingssettings [tab="${tab}"]`).classList.remove("hidden");
}

/**
 * Loads a particular quark's emoji into watchedmojos.
 * @param {string} quark - The quark to load emoji from.
 * @returns {void}
 */
async function loadEmoji(quark) {
    document.querySelector("#watchingmojo select").disabled = true;

    document.querySelector("#watchingmojo .vukkyload").classList.remove("hidden");
    document.querySelector("#watchedmojos").classList.add("hidden");
    const emojis = (await apiCall(`/quark/${quark}/emotes`, "GET", "", "v2")).response.emotes;
    document.querySelector("#watchedmojos").innerHTML = "";
    if(!emojis || emojis.length === 0) {
        document.querySelector("#watchingmojo select").disabled = false;
        document.querySelector("#watchedmojos").classList.remove("hidden");
        document.querySelector("#watchingmojo .vukkyload").classList.add("hidden");
        document.querySelector("#watchedmojos").innerHTML = `<i class="fas fa-cat"></i> ${strings["NO_EMOJI"]}`;
        return;
    }

    let selectedOption = document.querySelector(`#watchingmojo select option[value="${quark}"]`);
    let quarkName = selectedOption.innerText
    selectedOption.innerText = `${quarkName} (loaded 0/${emojis.length})`;
    let output = ""
    emojis.sort((a,b) => a.name.localeCompare(b.name)).forEach(function(emoji) {
        output += `<img src="${emoji.imageUri}" alt="Emoji, ${emoji.altText || emoji.name}" onclick="insertEmoji('${emoji.name}', '${emoji._id}')" data-tippy-content="<center><b>${escapeHTML(emoji.name)}</b>${!emoji.description && !emoji.altText ? "" : `<br>${escapeHTML(emoji.description) || escapeHTML(emoji.altText)}`}</center>" style="max-width: 3em; cursor: pointer; user-select: none;" onmouseenter="new Audio('/assets/sfx/osu-default-hover.wav').play();" draggable="false">`;
    })
    if(output) document.querySelector("#watchedmojos").innerHTML = output;

    let loaded = 0;
    document.querySelectorAll("#watchedmojos img").forEach(function(emojiImg) {
        emojiImg.onload = function() {
            loaded++;
            selectedOption.innerText = `${quarkName} (loaded ${loaded}/${emojis.length})`;
            if(loaded === emojis.length) {
                selectedOption.innerText = quarkName;
                document.querySelector("#watchingmojo select").disabled = false;
                document.querySelector("#watchedmojos").classList.remove("hidden");
                document.querySelector("#watchingmojo .vukkyload").classList.add("hidden");
            }
        }
    })
}

/**
 * Put an emoji in the user's sendmsg.
 * @param {string} emojiName - Emoji name.
 * @param {string} emojID - Emoji ID.
 * @returns {void}
 */
function insertEmoji(emojiName, emojID) {
    new Audio("/assets/sfx/osu-button-select.wav").play();
    document.querySelector("#sendmsg").value += `<${emojiName}:${emojID}>`;
}

function uploadEmoji() {
    document.querySelector("#watchingmojo select").disabled = true;

    // https://stackoverflow.com/a/40971885
    // https://stackoverflow.com/a/4250408
    // https://stackoverflow.com/a/65926546
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = "image/*";
    input.onchange = async e => {
        document.querySelector("#watchingmojo .emojiupload").style.animation = "stretchcenter 0.2s infinite linear";
        let file = e.target.files[0]
        const reader = new FileReader();
        reader.onload = function() {
            apiCall(`/quark/${document.querySelector("#watchingmojo select").value}/emotes`, "POST", {"name": file.name.replace(/\.[^/.]+$/, ""), "image": reader.result.replace('data:', '').replace(/^.+,/, '')}, "v2").then(function(result) {
                document.querySelector("#watchingmojo .emojiupload").style.animation = "";
                    loadEmoji(document.querySelector("#watchingmojo select").value)
            })
        }
        reader.readAsDataURL(file);
    }
    input.click();
}

/**
 * Shows a splash on the loading screen.
 * @returns {void}
 */
function showSplash() {
    document.querySelector("#loadingsplash").innerHTML = strings["SPLASHES"][Math.floor(Math.random() * strings["SPLASHES"].length)]
}

// https://stackoverflow.com/a/48777893
if(isLocal) {
    let KONAMI_CODE_CURSOR = 0;
    const KONAMI_CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    document.addEventListener('keydown', (e) => {
        KONAMI_CODE_CURSOR = (e.key === KONAMI_CODE[KONAMI_CODE_CURSOR]) ? KONAMI_CODE_CURSOR + 1 : 0;
        if (KONAMI_CODE_CURSOR === KONAMI_CODE.length) document.querySelector("#debug").classList.remove("hidden");
    });
}

// The tippy used by the companion.
const companionTippy = tippy("#annoyance", {
    "theme": "black",
    "offset": [0, -20],
    "animation": "shift-away",
    "placement": "top-end",
    "inertia": true,
    "trigger": "manual"
})[0]
// Companion speech hider.
let companionTimeout = null;

function companionSpeech(string) {
    string = strings["COMPANION"][string];
    companionTippy.setContent(string instanceof Array ? string[Math.floor(Math.random() * string.length)] : string);
    companionTippy.show();

    if(companionTimeout) clearTimeout(companionTimeout)
    companionTimeout = setTimeout(function() {
        companionTippy.hide();
    }, 5000)
}


welcome();

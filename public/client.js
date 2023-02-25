/**
 * Resolve promise after set amount of ms
 * @param {int} - ms to wait for
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Stores if the user is running Quarky locally, this is used in the UA
window.isLocal = document.location.host == "127.0.0.1:4210";

// Stores if jumping to the bottom automatically is allowed
window.jumpToBottom = true;

// Stores the current Quark
window.currentQuark = null;

// Stores the current channel
window.currentChannel = null;

// Stores the ID of the authenticated user
window.userID = null;

// Stores channels
window.channelBox = {}

// List of valid TLDs
window.tlds = [];

// An object of defaults for settings
window.defaults = {
    "notify": false,
    "uwuspeak": false,
    "mespecial": true
}

/**
 * Witchcraft, made with 4 blends. Don't you dare touch it.
 * First blend: https://stackoverflow.com/a/71734086 
 * Second blend: https://community.splunk.com/t5/Getting-Data-In/Top-Level-Domain-Extraction-from-URLs/m-p/319069
 * Third blend: Spending an hour on Regex101 to get it to support non-English TLDs
 * Fourth blend: Spaghetti
 * @param {string} t - Text to linkify.
 * @returns {string} Linkified text.
 */
const linkify = t => {
    const m = t.match(/(?<=\s|^)([a-zA-Z-:\/]+\.(?:\p{Letter}+?|xn--\w+?|)(?:\/.+?|\/|))+(?=[.,;:?!-]?(?:\s|$))/gu)
    if (!m) return t
    const a = []
    m.forEach(x => {
      const [t1, ...t2] = t.split(x)
      a.push(t1)
      t = t2.join(x)
      const y = (!(x.match(/(http(s?)):\/\//)) ? 'https://' : '') + x;
      let tld = x.match(/(\.\p{Letter}+?(?:--\w+?|))(?:$|\/)/u)
      if (!tld) return a.push(x);
      tld = new URL(y).href.match(/(\.\p{Letter}+?(?:--\w+?|))(?:$|\/)/u)[0].replace(/\/$/, '').replace(/\/$/, '').replace(/^\./, "").toUpperCase();
      if (!tlds.includes(tld)) return a.push(x);
      a.push('<a href="' + y + '" target="_blank">' + y.replace(/^https?:\/\//, '').replace(/\/$/, '') + '</a>')
    })
    a.push(t)
    return a.join('')
}

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
    return div.innerHTML;
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
    tlds = (await (await fetch("/assets/tlds.txt")).text()).split("\n")

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
        content: "Settings",
        appendTo: document.querySelector("#userdata"),
        theme: "black",
        hideOnClick: false,
        animation: "scale",
        inertia: true,
        offset: [0, 25]
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

    changeLoading("Opening gateway connection...");
    openGateway();
    changeLoading("Restoring old session...");
    settingsLoad();
    let previousQuark = new URLSearchParams(window.location.search).get("quark");
    let previousChannel = new URLSearchParams(window.location.search).get("channel");
    if(previousQuark) switchQuark(previousQuark, false, false, false);
    if(previousChannel) switchChannel(previousChannel, false);
    console.log(previousQuark, previousChannel)
    changeLoading("Fetching user data...");
    fetchAviebox();
    changeLoading("Fetching Quark list...");
    quarks = await quarkFetch();
    subscribeBomb(quarks);
    quarkRender(quarks);
    changeLoading("Letting you in...");
    document.querySelector("#loader").classList.add("bye");
    document.querySelector("#wb").play();
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
        quarkList.innerHTML += `<div class="quark" id="${quark._id}" onmouseenter="new Audio('/assets/sfx/osu-default-hover.wav').play();" onclick="switchQuark('${quark._id}');" data-tippy-content="${quark.name}">
    <img src="${quark.iconUri}">
</div>`
    })
    // Add join and log out buttons
    quarkList.innerHTML += `
            <div class="quark joiner" onmouseenter="new Audio('/assets/sfx/osu-default-hover.wav').play();" onclick="joinQuark();" data-tippy-content="Join a Quark">
                <span style="font-size: 2.88em; margin-left: 0.4em;">+</span>
            </div>
            <div class="quark logout" onmouseenter="new Audio('/assets/sfx/osu-default-hover.wav').play();" onclick="logOut();" data-tippy-content="Log Out :(">
                <span style="font-size: 2.4em; margin-left: 0.4em;">←</span>
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
 * @param {string} apiVersion - Default v1
 * @returns {object|false}
 */
 async function apiCall(path, method = "GET", body = {}, apiVersion = "v1") {
    let options = {
        method: method,
        headers: {
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/json",
            "User-Agent": `Qua${settingGet("uwuspeak") ? "w" : "r"}ky${window.isLocal ? " (local ^~^)" : ""}`,
            "lq-agent": `Qua${settingGet("uwuspeak") ? "w" : "r"}ky${window.isLocal ? " (local ^~^)" : ""}`
        }
    }
    // GET requests cannot have a body
    if (method !== "GET") options.body = JSON.stringify(body);

    try {
        let res = await fetch(`https://lq.litdevs.org/${apiVersion}${path}`, options);
        let data = await res.json();
        if (data.request.success) return data; // Success
        if (data.request.status_code === 401)  {
            logOut();
            return false;
        }
        // Failed :(
        alert(`${data.request.status_code}:\n${data.response.message}`)
        return false;
    } catch (e) {
        displayError(`Huohhhh. Sewvew doesn't want to tawk :3c\ninfos:${e}`);
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
    let quarkCode = prompt("Enter the invite code for the Quark you want to join.");
    if (!quarkCode) return;
    let joinResponse = await apiCall(`/quark/invite/${quarkCode}`, "POST");
    if (!joinResponse) return alert(`Failed to join Quark :(\n${joinResponse.response.message}`)
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
 * @returns {void}
 */
async function switchQuark(id, forceChannel = true, sfx = true, anim = true) {
    if(sfx)new Audio("/assets/sfx/osu-button-select.wav").play();

    document.querySelector("#messagesbox").classList.add("hidden");
    if(anim) document.querySelector(`.quark[id='${id}']`).classList.remove("stretch");
    if(anim) void document.querySelector(`.quark[id='${id}']`).offsetWidth;
    if(anim) document.querySelector(`.quark[id='${id}']`).classList.add("stretch");
    window.currentQuark = id;
    history.replaceState(id, "", `/client.html?quark=${currentQuark}`);

    let quark = (await apiCall(`/quark/${id}`)).response.quark;
    document.querySelector("#servername").innerText = quark.name;
    if(quark.channels[0] && forceChannel) switchChannel(quark.channels[0]._id, false)
    channelListRender(quark.channels);
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

function attachmentTextifier(attachments) {
        let a = ""
        attachments.forEach(attachment => a += `<br>attachment: ${attachment}`)
        return a
}

let adminTip;
/**
 * Renders a message.
 * @param {array} message - The message to render.
 * @returns {void}
 */
function messageRender(message) {
    let doUwU = !message.ua.startsWith("Quawky") && settingGet("uwuspeak"); // check if UwUspeak is allowed
    let botMetadata = message.specialAttributes.find(attr => attr.type === "botMessage");
    if (botMetadata) { // handle bots
        message.author.botUsername = message.author.username;
        message.author.username = botMetadata.username;
        message.author.avatarUri = botMetadata.avatarUri;
    }

    let messageDiv = document.createElement('div');
    messageDiv.classList.add("message");
    messageDiv.id = message._id;
    if(message.specialAttributes.some(attr => attr.type === "/me") && settingGet("mespecial")) {
        messageDiv.classList.add("roleplay");
        messageDiv.innerHTML = `
            <span class="lusername">${escapeHTML(message.author.username)} ${botMetadata ? `<span class="bot" data-tippy-content="This message was sent by <b>${escapeHTML(message.author.botUsername)}</b>">Bot</span>` : ''}</span>
            ${doUwU ? `*${uwutils.substitute(linkify(escapeHTML(message.content)))}* ${uwutils.getEmotisuffix()}` : linkify(escapeHTML(message.content))}
            <small class="timestamp">${new Date(message.timestamp).toLocaleString()} via ${escapeHTML(message.ua)}</small>
            <br><span class="attachments">${message.attachments && message.attachments.length > 0 ? linkify(attachmentTextifier(message.attachments)) : ""}</span>
        `;
    } else {
        messageDiv.innerHTML = `
            <span class="avie">
                <img src="${message.author.avatarUri}" class="loading" onload="this.classList.remove('loading');" onerror="this.classList.remove('loading');this.onload='';this.src='/assets/img/fail.png'">
                ${message.author.admin ? "<img src='/assets/img/adminmark.svg' class='adminmark' width='32' data-tippy-content='I&apos;m a LightQuark developer!'>" : ""}
            </span>
            <span class="lusername">${escapeHTML(message.author.username)} ${botMetadata ? `<span class="bot" data-tippy-content="This message was sent by <b>${escapeHTML(message.author.botUsername)}</b>.">Bot</span>` : ''} <small class="timestamp">${new Date(message.timestamp).toLocaleString()} via ${escapeHTML(message.ua)}</small></span>
            ${doUwU ? owo(linkify(escapeHTML(message.content))) : linkify(escapeHTML(message.content))}
            <span class="attachments">${message.attachments && message.attachments.length > 0 ? linkify(attachmentTextifier(message.attachments)) : ""}</span>
            <br>
        `;
    }
    document.querySelector("#messages").appendChild(messageDiv);
    if(jumpToBottom) document.querySelector("#messagesbox").scrollTop = document.querySelector("#messagesbox").scrollHeight;
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

    document.querySelector("#messagesbox").classList.add("hidden");
    let messages = (await apiCall(`/channel/${id}/messages`, "GET", {}, "v2")).response.messages;
    messages = messages.sort(function(x,y) {
        return x.message.timestamp - y.message.timestamp;
    });
    document.querySelector("#messages").innerHTML = "";
    messages.forEach(message => {
        messageRender(cleanMessage(message));
    });
    document.querySelector("#messagesbox").classList.remove("hidden");
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
    if(message == "") return displayError('You need to enter a message to send! :D');
    let specialAttributes = []; // TODO: in case i need to hack in more later

    new Audio("/assets/sfx/osu-submit-select.wav").play();
    document.querySelector("#sendmsg").value = "";

    // handle special effects
    message = message.replace(/\B\/shrug\b/gm, "¯\\_(ツ)_/¯"); // allow shrugging
    if(message.startsWith("/me")) { // allow /me-ing
        message = message.substring(4);
        specialAttributes.push({"type": "/me"});
    }
    if(settingGet("uwuspeak")) {
        if(specialAttributes.some(atrb => atrb.type == "/me")) { // Vukky *fowmats uuw /me cutewy* >w>
            message = `*${uwutils.substitute(message)}* ${uwutils.getEmotisuffix()}`
        } else {
            message = owo(message);
        }
    }

    apiCall(`/channel/${currentChannel}/messages`, "POST", {"content": message, specialAttributes: specialAttributes}, "v2");
}

/**
 * Fetches the user data and updates the aviebox.
 * @returns {void}
 */
async function fetchAviebox() {
    let userData = (await apiCall(`/user/me`)).response.jwtData;
    window.userID = userData._id;
    document.querySelector("#userdata .lusername").innerText = userData.username;
    document.querySelector("#userdata .avie").src = userData.avatar;
}

/**
 * Changes a setting in the localStorage.
 * TODO: add defaults (https://vukky.paste.lol/quarky-defaults-placeholder)
 * @param {string} key - The key to change.
 * @param {string} value - The value to set it to.
 * @param {boolean} sfx - Play a sound effect if it is a boolean.
 * @returns {void}
 */
function settingSet(key, value, sfx = true) {
    if(typeof value == "boolean" && sfx) new Audio(`/assets/sfx/osu-checkbox-${value}.wav`).play()
    localStorage.setItem(key, JSON.stringify({type: typeof value, value: value})) // this json was skelly's idea. if you end up hating it later, blame her
}

/**
 * Get a setting in the localStorage.
 * @param {string} key - The key to get.
 * @returns {any} - The value of the key.
 */
function settingGet(key) {
    // THE FOLLOWING HACK WAS SKELLY'S IDEA. IF YOU END UP HATING IT LATER, BLAME HER
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
    document.querySelectorAll("#settings input[type='checkbox']").forEach(function(checkbox) { // fetch all checkboxes
        if(settingGet(checkbox.name)) checkbox.checked = settingGet(checkbox.name) // set the checkbox
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

    document.querySelector("#settings [name='notify']").checked = false;
    await Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          document.querySelector("#settings [name='notify']").checked = true;
          settingSet("notify", true)
          subscribeBomb()
          sendNotification("Notifications enabled.", "Please enjoy them!")
        } else {
            displayError("You have denied Quarky's request to send you notifications, so no notifications can be sent...")
        }
    });
}

/**
 * Sends a notification.
 * @param {string} title - The title of the notification.
 * @param {string} body - The body of the nofification.
 * @param {boolean} sfx - Play the notification sound.
 * @param {string} icon - The icon for the notification.
 * @param {function} clickHandler - The click handler for the notification.
 * @param {string} image - The large image for the notification.
 * @returns {void}
 */
function sendNotification(title, body = undefined, sfx = true, icon = "/assets/img/quarky.svg", clickHandler = undefined, image = undefined) {
    if(sfx) new Audio("/assets/sfx/osu-now-playing-pop-in.wav").play();
    let sentNotification = new Notification(title, {body: body, image: image, icon: icon});
    sentNotification.onclick = clickHandler;
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
            let channelData = (await apiCall(`/channel/${channel}`)).response.channel;
            channelData.quarkId = channelData.quark;
            channelData.quark = quark.name;
            channelBox[channel] = channelData;
            wss.send(JSON.stringify({event: "subscribe", message: `channel_${channel}`}))
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
 * Swap to the credits view.
 * @returns {void}
 */
function credits() {
    document.querySelector("#settings").classList.add("hidden");
    document.querySelector("#credits").classList.remove("hidden");
    window.ccHeight = document.querySelector("#creditscontainer").offsetHeight; // offset height of the creditscontainer
    loadJS("https://unpkg.com/butterchurn", function() {
        setTimeout(() => {
            document.querySelector("#snikosnaketext").innerHTML = "Hewwo Butterchurn :3";
        }, 0);
        document.querySelector("#credits audio").load();
        document.querySelector("#snikosnaketext").innerHTML = "Hewwo music :3";

        // create the audio context
        audioContext = new AudioContext();
        audioContextSource = audioContext.createMediaElementSource(document.querySelector("#credits audio"));
        audioContextSource.connect(audioContext.destination);

        canvas = document.querySelector("#butterchurn"); // get the canvas
        visualizer = butterchurn.default.createVisualizer(audioContext, canvas , { // create visualizer
          width: window.innerWidth,
          height: window.innerHeight,
          pixelRatio: window.devicePixelRatio || 1,
          textureRatio: 1,
        });
        function startRenderer() {
            requestAnimationFrame(() => startRenderer());
            visualizer.render();
        }
        visualizer.loadPreset({"version":2,"baseVals":{"rating":4,"gammaadj":1.98,"decay":0.5,"echo_zoom":1,"echo_alpha":0.5,"echo_orient":3,"additivewave":1,"wave_thick":1,"modwavealphabyvolume":1,"darken":1,"wave_a":0.001,"wave_scale":0.133,"wave_smoothing":0,"wave_mystery":-1,"modwavealphastart":1,"modwavealphaend":1.3,"warpanimspeed":1.459,"warpscale":2.007,"zoom":0.9999,"warp":0.01,"sx":0.9999,"wave_r":0.5,"wave_g":0.5,"wave_b":0.5,"ob_size":0.015,"ob_b":1,"ib_size":0.26,"mv_a":0,"b2x":0.3,"b1ed":0},"shapes":[{"baseVals":{"enabled":1,"sides":40,"thickoutline":1,"rad":0.06623,"tex_zoom":1.79845,"r":0,"a":0.1,"g2":0,"border_b":0,"border_a":0},"init_eqs_str":"a.vol=0;a.bob=0;a.border_1=0;a.ro=0;a.sp=0;a.red=0;a.spi=0;a.tm=0;a.bob=1.5;a.ro=0;a.red=rand(20);","frame_eqs_str":"a.vol=1+.2*div(a.bass_att+a.treb_att+a.mid_att,3);a.bob=a.bob*above(a.bob,.01)-.01+(1-above(a.bob,.01));a.bob=.4+.4*Math.sin(.8*a.time);a.bob*=a.vol;a.border_1=.4;a.sides=30;a.ro+=.02;a.ang=a.ro;a.sp=.025*a.red;a.spi=.5-a.sp;a.tm=.1*a.time;a.border_r=.5+a.sp*Math.sin(.6*a.tm)+a.spi*Math.cos(1.46*a.tm);a.border_g=.5+a.sp*Math.sin(1.294*a.tm)+a.spi*Math.cos(.87*a.tm);a.border_b=.5+a.sp*Math.sin(1.418*a.tm)+a.spi*Math.cos(.76*a.tm);","init_eqs_eel":"bob = 1.5;\nro = 0;\nred = rand(20);","frame_eqs_eel":"vol = 1 + 0.2*((bass_att+treb_att+mid_att)/3);\nbob = bob*above(bob,0.01) - 0.01 + 1*(1 - above(bob,0.01));\nbob = 0.4 + 0.4*sin(time*0.8);\nbob = bob*vol;\n//rad = bob;\nborder_1 = 0.4;\nsides = 30;\nro = ro + 0.02;\nang = ro;\n//rad = 0.6;\n\nsp = red*0.025;\nspi = 0.5 - sp;\ntm = time*0.1;\nborder_r = 0.5 + sp*sin(tm*0.6) + spi*cos(tm*1.46);\nborder_g = 0.5 + sp*sin(tm*1.294) + spi*cos(tm*0.87);\nborder_b = 0.5 + sp*sin(tm*1.418) + spi*cos(tm*0.76);\n"},{"baseVals":{"enabled":1,"sides":40,"additive":1,"num_inst":4,"g":1,"b":1,"g2":0,"border_a":0},"init_eqs_str":"","frame_eqs_str":"a.x=.5+.225*Math.sin(.7*div(a.time,a.instance));a.y=.5+.3*Math.cos(.7*div(a.time,a.instance));a.x-=.4*a.x*Math.sin(a.time);a.y-=.4*a.y*Math.cos(a.time);a.rad*=a.mid_att;a.r=.5+.5*Math.sin(.5*a.frame);a.b=.5+.5*Math.sin(.5*a.frame+2.094);a.g=.5+.5*Math.sin(.5*a.frame+4.188);","init_eqs_eel":"","frame_eqs_eel":"x = 0.5 + 0.225*sin(time /instance*0.7);\ny = 0.5 + 0.3*cos(time /instance*0.7);\nx = x- 0.4*x*sin(time);\ny = y- 0.4*y*cos(time);\n\n\n\nrad = rad*mid_att;\nr = 0.5 + 0.5*sin(frame*0.5);\nb = 0.5 + 0.5*sin(frame*0.5 + 2.094);\ng = 0.5 + 0.5*sin(frame*0.5 + 4.188);\n"},{"baseVals":{"enabled":1,"sides":40,"additive":1,"g":1,"b":1,"g2":0,"border_a":0},"init_eqs_str":"","frame_eqs_str":"a.x=.5+.5*(.3*Math.sin(1.1*a.time)+.7*Math.sin(.5*a.time));a.x=.5+.225*Math.sin(a.time+2.09);a.y=.5+.3*Math.cos(a.time+2.09);a.rad*=a.bass_att;a.r=.5+.5*Math.sin(.5*a.frame);a.b=.5+.5*Math.sin(.5*a.frame+2.094);a.g=.5+.5*Math.sin(.5*a.frame+4.188);","init_eqs_eel":"","frame_eqs_eel":"x = 0.5 + 0.5*(sin(time*1.1)*0.3 + 0.7*sin(time*0.5));\nx = 0.5 + 0.225*sin(time + 2.09);\ny = 0.5 + 0.3*cos(time + 2.09);\n\nrad = rad*bass_att;\nr = 0.5 + 0.5*sin(frame*0.5);\nb = 0.5 + 0.5*sin(frame*0.5 + 2.094);\ng = 0.5 + 0.5*sin(frame*0.5 + 4.188);\n"},{"baseVals":{"enabled":1,"sides":40,"additive":1,"num_inst":5,"rad":0.07419,"g":1,"b":1,"g2":0,"border_a":0},"init_eqs_str":"","frame_eqs_str":"a.x=.5+.225*Math.sin(div(a.time,a.instance));a.y=.5+.3*Math.cos(div(a.time,a.instance));a.x+=.4*a.x*Math.sin(a.time);a.y+=.4*a.y*Math.cos(a.time);a.rad*=a.treb_att;a.r=.5+.5*Math.sin(.5*a.frame);a.b=.5+.5*Math.sin(.5*a.frame+2.094);a.g=.5+.5*Math.sin(.5*a.frame+4.188);","init_eqs_eel":"","frame_eqs_eel":"//x = 0.5 + 0.5*(sin(time*1.1)*0.3 + 0.7*sin(time*0.5));\nx = 0.5 + 0.225*sin(time /instance);\ny = 0.5 + 0.3*cos(time /instance);\nx = x+ 0.4*x*sin(time);\ny = y+ 0.4*y*cos(time);\n\n\n//x = x+(0.1*q3)*sin((instance*2.4));\n//y = y+(0.1*q4)*cos((instance*2.4));\n\n\nrad = rad*treb_att;\nr = 0.5 + 0.5*sin(frame*0.5);\nb = 0.5 + 0.5*sin(frame*0.5 + 2.094);\ng = 0.5 + 0.5*sin(frame*0.5 + 4.188);\n"}],"waves":[{"baseVals":{"enabled":0},"init_eqs_str":"","frame_eqs_str":"","point_eqs_str":"","init_eqs_eel":"","frame_eqs_eel":"","point_eqs_eel":""},{"baseVals":{"enabled":0},"init_eqs_str":"","frame_eqs_str":"","point_eqs_str":"","init_eqs_eel":"","frame_eqs_eel":"","point_eqs_eel":""},{"baseVals":{"enabled":0},"init_eqs_str":"","frame_eqs_str":"","point_eqs_str":"","init_eqs_eel":"","frame_eqs_eel":"","point_eqs_eel":""},{"baseVals":{"enabled":0},"init_eqs_str":"","frame_eqs_str":"","point_eqs_str":"","init_eqs_eel":"","frame_eqs_eel":"","point_eqs_eel":""}],"init_eqs_str":"a.index2=0;a.index=0;a.q22=0;a.q21=0;a.q1=0;a.dec_med=0;a.ps=0;a.rott=0;a.is_beat=0;a.q23=0;a.k1=0;a.q24=0;a.dec_slow=0;a.q4=0;a.q26=0;a.p2=0;a.avg=0;a.beat=0;a.p1=0;a.peak=0;a.q2=0;a.q27=0;a.q3=0;a.t0=0;a.q28=0;a.q20=0;","frame_eqs_str":"a.dec_med=pow(.7,div(30,a.fps));a.dec_slow=pow(.99,div(30,a.fps));a.beat=Math.max(Math.max(a.bass,a.mid),a.treb);a.avg=a.avg*a.dec_slow+a.beat*(1-a.dec_slow);a.is_beat=above(a.beat,.2+a.avg+a.peak)*above(a.time,a.t0+.2);a.t0=a.is_beat*a.time+(1-a.is_beat)*a.t0;a.peak=a.is_beat*a.beat+(1-a.is_beat)*a.peak*a.dec_med;a.index=mod(a.index+a.is_beat,8);a.index2=mod(a.index2+a.is_beat*bnot(a.index),2);a.q20=a.avg;a.q21=a.beat;a.q22=a.peak;a.ps=.9*a.ps+.1*a.q22;a.q23=a.ps;a.q24=a.is_beat;\na.q26=a.bass_att+a.mid_att+a.treb_att;a.q27=a.index+1;a.q28=a.index2;a.k1=a.is_beat*equal(mod(a.index,2),0);a.p1=a.k1*(a.p1+1)+(1-a.k1)*a.p1;a.p2=a.dec_med*a.p2+(1-a.dec_med)*a.p1;a.rott=div(3.1416*a.p2,4);a.q1=Math.cos(a.rott);a.q2=Math.sin(a.rott);a.q3=-a.q2;a.q4=a.q1;","pixel_eqs_str":"a.zoom=1.05;","init_eqs_eel":"","frame_eqs_eel":"dec_med = pow (0.7, 30/fps);\ndec_slow = pow (0.99, 30/fps);\nbeat = max (max (bass, mid), treb); \navg = avg*dec_slow + beat*(1-dec_slow);\nis_beat = above(beat, .2+avg+peak) * above (time, t0+.2);\nt0 = is_beat*time + (1-is_beat)*t0;\npeak = is_beat * beat + (1-is_beat)*peak*dec_med;\nindex = (index + is_beat) %8;\nindex2 = (index2 + is_beat*bnot(index))%2;\n\nq20 = avg;\nq21 = beat;\nq22 = peak;\n\nps = .9*ps + .1*q22;\nq23 = ps;\nq24 = is_beat;\nq26 = bass_att + mid_att + treb_att;\nq27 = index +1;\nq28 = index2;\n\n\nk1 =  is_\nbeat*equal(index%2,0);\np1 =  k1*(p1+1) + (1-k1)*p1;\np2 = dec_med * p2+ (1-dec_med)*p1;\nrott = p2 * 3.1416/4;\n\nq1 = cos(rott);\nq2 = sin(rott);\nq3 = -q2;\nq4 = q1;","pixel_eqs_eel":"zoom = 1.05;","warp":" shader_body { \n  vec2 uv_1;\n  vec2 tmpvar_2;\n  tmpvar_2 = (uv - vec2(0.5, 0.5));\n  vec4 tmpvar_3;\n  tmpvar_3.w = 0.0;\n  vec4 tmpvar_4;\n  tmpvar_4 = texture (sampler_blur1, uv);\n  tmpvar_3.xyz = ((tmpvar_4.xyz * scale1) + bias1);\n  float tmpvar_5;\n  tmpvar_5 = (dot (tmpvar_3, roam_sin) * 16.0);\n  mat2 tmpvar_6;\n  tmpvar_6[uint(0)].x = cos(tmpvar_5);\n  tmpvar_6[uint(0)].y = -(sin(tmpvar_5));\n  tmpvar_6[1u].x = sin(tmpvar_5);\n  tmpvar_6[1u].y = cos(tmpvar_5);\n  uv_1 = ((tmpvar_2 + (\n    (0.2 * dot (((tmpvar_4.xyz * scale1) + bias1), vec3(0.32, 0.49, 0.29)))\n   * \n    (tmpvar_2 * tmpvar_6)\n  )) - 0.5);\n  vec2 tmpvar_7;\n  tmpvar_7 = ((uv_1 * texsize.xy) * 0.02);\n  vec2 tmpvar_8;\n  tmpvar_8.x = (cos((tmpvar_7.y * q1)) * sin(-(tmpvar_7.y)));\n  tmpvar_8.y = (sin(tmpvar_7.x) * cos((tmpvar_7.y * q2)));\n  uv_1 = (uv_1 - ((tmpvar_8 * texsize.zw) * 12.0));\n  vec4 tmpvar_9;\n  tmpvar_9.w = 1.0;\n  tmpvar_9.xyz = ((texture (sampler_main, uv_1).xyz * 0.98) - 0.02);\n  ret = tmpvar_9.xyz;\n }","comp":"vec3 xlat_mutableret1;\nvec2 xlat_mutablers;\nvec2 xlat_mutableuv1;\nfloat xlat_mutablez;\n shader_body { \n  xlat_mutableuv1 = (uv - 0.5);\n  xlat_mutablez = (0.2 / abs(xlat_mutableuv1.y));\n  xlat_mutablers.x = (xlat_mutableuv1.x * xlat_mutablez);\n  xlat_mutablers.y = ((xlat_mutablez / 2.0) + (time * 4.0));\n  vec4 tmpvar_1;\n  tmpvar_1 = texture (sampler_noise_hq, xlat_mutablers);\n  xlat_mutableret1 = ((tmpvar_1.xyz * vec3(\n    greaterThanEqual (tmpvar_1.xyz, vec3(0.0, 0.0, 0.0))\n  )) - 0.6);\n  float tmpvar_2;\n  tmpvar_2 = clamp ((128.0 * xlat_mutableuv1.y), 0.0, 1.0);\n  vec2 tmpvar_3;\n  tmpvar_3 = fract(((\n    (xlat_mutableuv1 * (1.0 - abs(xlat_mutableuv1.x)))\n   - 0.5) - (\n    (xlat_mutableret1 * 0.05)\n   * tmpvar_2).xy));\n  float x_4;\n  x_4 = (tmpvar_3.y - 0.52);\n  vec3 tmpvar_5;\n  tmpvar_5 = (texture (sampler_main, tmpvar_3) + ((0.02 / \n    (0.02 + sqrt((x_4 * x_4)))\n  ) * slow_roam_sin)).xyz;\n  xlat_mutableret1 = tmpvar_5;\n  vec2 tmpvar_6;\n  tmpvar_6 = (32.0 * ((\n    (uv * mat2(0.6, -0.8, 0.8, 0.6))\n   + \n    (tmpvar_5 * 0.1)\n  .xy) + (time / 64.0)));\n  vec2 tmpvar_7;\n  tmpvar_7 = abs((fract(tmpvar_6) - 0.5));\n  vec3 tmpvar_8;\n  tmpvar_8 = clamp (((0.25 / \n    sqrt(dot (tmpvar_7, tmpvar_7))\n  ) * vec3((texture (sampler_pw_noise_lq, \n    (tmpvar_6 / 256.0)\n  ).y - 0.9))), 0.0, 1.0);\n  vec4 tmpvar_9;\n  tmpvar_9.w = 1.0;\n  tmpvar_9.xyz = (tmpvar_5 + ((\n    (tmpvar_8.x * tmpvar_8.x)\n   + \n    ((rand_preset * (0.5 - uv.y)).xyz * vec3(0.0, 0.0, 1.0))\n  ) * (1.0 - tmpvar_2)));\n  ret = tmpvar_9.xyz;\n }","warp_hlsl":"shader_body {\nfloat corr = texsize.xy*texsize_noise_lq.zw;\nfloat2 uv1 = float2(uv.x-0.5,uv.y-0.5);//*aspect.xy;\n\nfloat2 d = (uv1);\nfloat3 mus = GetBlur1(uv);\nfloat k = dot(mus,roam_sin)*16;\n\nd = mul(uv1,float2x2(cos(k),sin(k),-sin(k),cos(k)));\nuv1 += .20*lum(GetBlur1(uv))*d;\nuv = uv1-.5;\n\nfloat3 ret1 = GetBlur1(uv) ;\n\nfloat2 zz = uv * texsize.xy *.02;\nfloat h1 = (cos(zz.y*q1) * sin(-zz.y));\nfloat h2 = (sin(zz.x) * cos(zz.y*q2));\n\nuv.xy -= float2(h1,h2)*texsize.zw * 12;\n\nfloat3 crisp = tex2D(sampler_main,uv) ;\n\nret = crisp*.98 -.02;\n}","comp_hlsl":"sampler sampler_pw_noise_lq;\nfloat z, h1;\nfloat2 rs, uv1, uv2, uv3;\nfloat3 noise, ret1, ret2, rets;\n\nshader_body {\nuv1 = (uv-.5);//*aspect.xy;\n\nh1 = .2;\nz = h1/abs(pow(uv1.y,1));\nrs.x = uv1.x * z;\nrs.y = z/2 + time*4;\nnoise = tex2D(sampler_noise_hq,rs);\nnoise *= (noise >= .0);\nret1 = noise-.6;\n\nuv2 = 1*uv1 * (1-abs(uv1.x)) ;\nfloat mask = saturate(128*uv1.y);\nuv3 =frac(uv2-.5-ret1*.05* mask);\n\nret1 = tex2D (sampler_main, uv3) + \n.02/(.02+length(uv3.y-.52))*slow_roam_sin;\n\nfloat2 uv2 = 32*(mul(uv,float2x2(.6,.8,-.8,.6))+ret1*.1+time/64);\nfloat3 smask = (tex2D (sampler_pw_noise_lq,uv2/256)).g-.9;\nfloat stars = saturate(.25/length(abs(frac(uv2)-.5))*smask);\n\nret = ret1* (1+0*lum(ret1)) \n+ (stars*stars +rand_preset*(.5-uv.y)*float3 (0,0,1))* (1-mask);    \n}"}); // load the gamer preset
        visualizer.connectAudio(audioContextSource); // connect the visualizer to our audio context

        // but before we go, let's fix the canvas
        window.addEventListener('resize', function(event) {
            visualizer.setRendererSize(window.innerWidth, window.innerHeight);
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            document.documentElement.style.setProperty('--creditscontainer-height', `${ccHeight}px`);
            document.querySelector("#creditscontainer").style.animation = `scroll ${ccHeight / 40}s infinite linear`;
        }, true);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // we're done!

        document.querySelector("#wb").pause();
        document.querySelector("#credits audio").play();
        startRenderer();
        document.documentElement.style.setProperty('--creditscontainer-height', `${ccHeight}px`);
        document.querySelector("#creditscontainer").style.animation = `scroll ${ccHeight / 40}s infinite linear`;
    })
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

welcome();
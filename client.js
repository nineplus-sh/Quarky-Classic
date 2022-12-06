const sleep = ms => new Promise(r => setTimeout(r, ms));
function getCookie(key) {
    var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
    return keyValue ? keyValue[2] : null;
}
if(!getCookie("authToken")) document.location.pathname = "/";
window.authToken = getCookie("authToken");

async function welcome() {
    changeLoading("Fetching Quarks...");
    window.serverSocket = new WebSocket("wss://lq-gateway.litdevs.org", authToken);
}
function changeLoading(text) {
    document.querySelector("#loaderexp").innerText = text;
}
async function quarkRender() {
    return new Promise(function(resolve, reject) {
        
    });
}
async function quarkFetch() {
    return new Promise(function(resolve, reject) {
        
    });
}
welcome();
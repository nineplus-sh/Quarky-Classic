/**
 * Spawns a Vukkybox.
 *  @param {string} message - The message.
 *  @param {string} image - The Vukky asset to use.
 *  @param {string} title - The title.
 *  @param {function} onclose - Code to execute when the Vukkybox is closed.
 */
async function vukkybox(message, image, title ) {
    let vickyboxen = document.createElement("dialog");
    if(image) vickyboxen.innerHTML += `<object data="/assets/img/${image}.svg" style="float: left; padding-right: 1em">`;
    if(title) vickyboxen.innerHTML += `<h2 style="margin: 0;">${title}</h2>`;
    if(message) vickyboxen.innerHTML += message;
    vickyboxen.innerHTML += "<hr><form method='dialog'><div style='text-align: center'><button>Ok</button></div></form>";
    if(window.userAvatar && image) vickyboxen.querySelector("object").onload = function() {
            this.contentDocument.querySelectorAll(".loadpfp").forEach(doodad => doodad.setAttribute("xlink:href", window.userAvatar))
    }
    vickyboxen.addEventListener("close", (e) => {
        return vickyboxen.returnValue;
    })
    document.body.appendChild(vickyboxen);
    vickyboxen.showModal()
 }
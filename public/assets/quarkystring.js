class QuarkyString extends HTMLElement {
    constructor() {
        super();
        function onstringchange() {
            this.innerHTML = strings[this.getAttribute("string")];
        }
        if(typeof strings !== "undefined") onstringchange.bind(this)();
        window.addEventListener("stringchange", onstringchange.bind(this))
    }
}
window.customElements.define('quarky-string', QuarkyString)
class VukkyToggle extends HTMLElement {
    constructor() {
        super();

        this.innerHTML = "<img class='slider' src='/assets/img/vukkydisabled.svg' width='64'>"
        this.addEventListener("click", e => {
            if(this.disabled) return;
            this.toggle();
        })
    }

    toggle() {
        if(this.checked) {
            this.checked = false;
        } else {
            this.checked = true;
        }
    }

    get checked() {
        return this.hasAttribute('checked');
    }

    set checked(val) {
        if (val) {
            this.setAttribute('checked', '');
        } else {
            this.removeAttribute('checked');
        }
    }
}
window.customElements.define('vukky-toggle', VukkyToggle)
document.head.innerHTML += `<style>
vukky-toggle {
    background-color: #80848E;
    padding: .5rem;
    border-radius: 10px;
    cursor: pointer;
    margin-left: .5rem;
}
vukky-toggle .slider {
    position: relative;
    top: -0.5rem;
    left: -1.5rem;
    transform: translateY(-25%);
    filter: grayscale(1);
    user-select: none;
    vertical-align: top;
}
vukky-toggle[checked] .slider {
    content: url("/assets/img/vukky.svg");
    filter: grayscale(0);
    left: 2rem;
}
</style>`
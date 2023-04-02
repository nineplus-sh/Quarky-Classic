class VukkyToggle extends HTMLElement {
    constructor() {
        super();

        this.innerHTML = "<img class='slider' src='/assets/img/vukkydisabled.svg' width='64' draggable='false'>"
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
        settingSet(this.getAttribute("setting"), this.checked);
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
    background-color: #00a8f3;
    padding: .5rem;
    border-radius: 10px;
    cursor: pointer;
    margin-left: .5rem;
    filter: grayscale(1);
    transition: filter 0.3s;
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
    animation: toggle 0.3s forwards;
}
vukky-toggle[checked] {
    filter: grayscale(0);
}
@keyframes toggle {
    0% {
        content: url("/assets/img/vukkydisabled.svg");
        left: -1.5rem;
        transform: translateY(-25%) rotate(0deg);
        filter: grayscale(1);
    }
    50% {
        content: url("/assets/img/vukky.svg");
        transform: translateY(-25%) rotate(180deg);
        filter: grayscale(0.5);
    }
    100% {
        content: url("/assets/img/vukky.svg");
        left: 2rem;
        transform: translateY(-25%) rotate(360deg);
        filter: grayscale(0);
    }
}
</style>`
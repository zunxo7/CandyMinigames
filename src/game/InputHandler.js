export class InputHandler {
    constructor() {
        this.keys = new Set();
        this.mouse = { x: 0, y: 0, clicked: false, down: false };
        this.virtualKeys = { left: false, right: false, jump: false };

        this.onKeyDown = (e) => this.keys.add(e.key.toLowerCase());
        this.onKeyUp = (e) => this.keys.delete(e.key.toLowerCase());

        this.onMouseDown = (e) => {
            this.mouse.clicked = true;
            this.mouse.down = true;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        };

        this.onMouseUp = () => {
            this.mouse.down = false;
        };

        // Handle window blur - clear all keys when window loses focus
        this.onBlur = () => {
            this.keys.clear();
            this.mouse.down = false;
            this.virtualKeys.left = false;
            this.virtualKeys.right = false;
            this.virtualKeys.jump = false;
        };

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('mouseup', this.onMouseUp);
        window.addEventListener('blur', this.onBlur);
    }

    isDown(key) {
        const k = key.toLowerCase();
        if (k === 'a' || k === 'arrowleft') return this.keys.has(k) || this.virtualKeys.left;
        if (k === 'd' || k === 'arrowright') return this.keys.has(k) || this.virtualKeys.right;
        if (k === 'w' || k === 'arrowup' || k === ' ') return this.keys.has(k) || this.virtualKeys.jump;
        return this.keys.has(k);
    }

    setVirtualKey(name, value) {
        if (this.virtualKeys[name] !== undefined) this.virtualKeys[name] = !!value;
    }

    getMouse() {
        return this.mouse;
    }

    resetClick() {
        this.mouse.clicked = false;
    }

    destroy() {
        // Clear all keys to prevent stuck movement
        this.keys.clear();
        this.mouse.down = false;
        this.mouse.clicked = false;
        this.virtualKeys.left = false;
        this.virtualKeys.right = false;
        this.virtualKeys.jump = false;

        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('mousedown', this.onMouseDown);
        window.removeEventListener('mouseup', this.onMouseUp);
        window.removeEventListener('blur', this.onBlur);
    }
}

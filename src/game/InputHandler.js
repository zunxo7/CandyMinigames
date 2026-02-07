export class InputHandler {
    constructor() {
        this.keys = new Set();
        this.mouse = { x: 0, y: 0, clicked: false, down: false };

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
        };

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('mouseup', this.onMouseUp);
        window.addEventListener('blur', this.onBlur);
    }

    isDown(key) {
        return this.keys.has(key.toLowerCase());
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

        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('mousedown', this.onMouseDown);
        window.removeEventListener('mouseup', this.onMouseUp);
        window.removeEventListener('blur', this.onBlur);
    }
}

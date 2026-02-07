export class Sprite {
    constructor({ image, frameWidth, frameHeight, animations, scale = 1 }) {
        this.image = image;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.animations = animations; // { idle: { row, frames, speed? }, ... }
        this.scale = scale;

        this.currentAnimation = 'idle';
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.animationSpeed = 0.15; // default seconds per frame
        this.loop = true;
        this.onAnimationComplete = null;
        this.isLocked = false; // Prevent interruption during critical animations
    }

    setAnimation(name, loop = true, onComplete = null, force = false) {
        // Allow interruption if forced or not locked
        if (!force && this.isLocked) return;
        if (this.currentAnimation === name && this.loop === loop && !force) return;

        this.currentAnimation = name;
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.loop = loop;
        this.onAnimationComplete = onComplete;
        this.isLocked = !loop && onComplete !== null; // Lock non-looping animations with callbacks
    }

    // Force cancel current animation and unlock
    cancelAnimation() {
        this.isLocked = false;
        this.onAnimationComplete = null;
    }

    update(dt) {
        this.frameTimer += dt;

        // Get speed from config or default
        const config = this.animations[this.currentAnimation];
        const maxFrames = config ? config.frames : 1;
        const speed = (config && config.speed !== undefined) ? config.speed : this.animationSpeed;

        if (this.frameTimer >= speed) {
            this.frameTimer = 0;
            this.frameIndex++;

            if (this.frameIndex >= maxFrames) {
                if (this.loop) {
                    this.frameIndex = 0;
                } else {
                    this.frameIndex = maxFrames - 1;
                    this.isLocked = false; // Unlock when animation completes
                    if (this.onAnimationComplete) {
                        const cb = this.onAnimationComplete;
                        this.onAnimationComplete = null;
                        cb();
                    }
                }
            }
        }
    }

    draw(ctx, x, y, flipX = false) {
        if (!this.image) return;

        const config = this.animations[this.currentAnimation];
        const row = config ? config.row : 0;

        // Calculate Source X/Y
        const sx = this.frameIndex * this.frameWidth;
        const sy = row * this.frameHeight;

        ctx.save();
        ctx.translate(Math.floor(x), Math.floor(y));
        if (flipX) {
            ctx.scale(-1, 1);
        }

        // Draw centered on position
        ctx.drawImage(
            this.image,
            sx, sy, this.frameWidth, this.frameHeight,
            - (this.frameWidth * this.scale) / 2,
            -(this.frameHeight * this.scale),
            this.frameWidth * this.scale,
            this.frameHeight * this.scale
        );

        ctx.restore();
    }
}

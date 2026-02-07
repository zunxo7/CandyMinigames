export class Particle {
    constructor(game, x, y, color) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 5 + 3;

        // Explosion velocity
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 150 + 50;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 100; // Upward bias

        this.gravity = 500;
        this.life = 1.0; // Seconds
        this.decay = Math.random() * 0.5 + 0.5;
    }

    update(dt) {
        this.life -= dt;
        this.vy += this.gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Ground bounce (simple)
        if (this.y > this.game.height - 200) {
            this.y = this.game.height - 200;
            this.vy *= -0.5;
            this.vx *= 0.8;
        }
    }

    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

export class Upgrade {
    constructor(game, x, type) {
        this.game = game;
        this.x = x;
        this.y = game.height - 200;
        this.type = type; // 'speed' or 'knockback'
        this.markedForDeletion = false;
        this.bobTimer = Math.random() * Math.PI * 2;

        // Upgrade amounts and duration
        this.amount = type === 'speed' ? 100 : 150; // Speed +100, Knockback +150
        this.duration = 10; // 10 seconds duration
    }

    update(dt) {
        this.bobTimer += dt * 3;
    }

    draw(ctx) {
        const bobY = Math.sin(this.bobTimer) * 5;
        const drawY = this.y - 50 + bobY;
        const size = 50; // Same size as medkit

        // Get the correct asset
        const asset = this.type === 'speed' ? this.game.assets.speed : this.game.assets.knockback;

        if (asset) {
            ctx.drawImage(asset, this.x - size / 2, drawY - size / 2, size, size);
        } else {
            // Fallback drawing - no glow dots
            const x = this.x - size / 2;
            const y = drawY - size / 2;

            ctx.fillStyle = this.type === 'speed' ? '#3498db' : '#e74c3c';
            ctx.strokeStyle = '#2d2d2d';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(x, y, size, size, 10);
            ctx.fill();
            ctx.stroke();

            // Icon
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.type === 'speed' ? '⚡' : '💥', this.x, drawY);
        }
        // No glow dots
    }
}

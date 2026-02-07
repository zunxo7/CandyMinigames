export class Medkit {
    constructor(game, x) {
        this.game = game;
        this.x = x;
        this.y = game.height - 200;
        this.width = 50;
        this.healAmount = 30;
        this.markedForDeletion = false;
        this.bobTimer = 0;
    }

    update(dt) {
        this.bobTimer += dt * 3;
    }

    draw(ctx) {
        const bobY = Math.sin(this.bobTimer) * 5;
        const drawY = this.y - 50 + bobY;

        if (this.game.assets.medkit) {
            const size = 50;
            ctx.drawImage(this.game.assets.medkit, this.x - size / 2, drawY - size / 2, size, size);
        } else {
            // Fallback: draw a pink box with white cross
            const size = 40;
            const x = this.x - size / 2;
            const y = drawY - size / 2;

            ctx.fillStyle = '#ff6b9d';
            ctx.strokeStyle = '#2d2d2d';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(x, y, size, size, 8);
            ctx.fill();
            ctx.stroke();

            // White cross
            ctx.fillStyle = '#ffffff';
            const crossWidth = 8;
            const crossLength = 24;
            ctx.fillRect(x + size / 2 - crossWidth / 2, y + size / 2 - crossLength / 2, crossWidth, crossLength);
            ctx.fillRect(x + size / 2 - crossLength / 2, y + size / 2 - crossWidth / 2, crossLength, crossWidth);
        }
        // No glow dot
    }
}

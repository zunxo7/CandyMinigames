import { Sprite } from './Sprite';
import { GROUND_Y_COORD, PLAYER_SPEED, GRAVITY, JUMP_FORCE } from './Constants';

export class Player {
    constructor(game) {
        this.game = game;
        this.x = 200;
        this.y = game.height - 200;
        this.vy = 0; // Vertical velocity
        this.hp = 100;
        this.maxHp = 100;
        this.width = 100;
        this.isGrounded = true;

        this.sprite = new Sprite({
            image: game.assets.crumb,
            frameWidth: 276,
            frameHeight: 170,
            scale: 0.5,
            animations: {
                idle: { row: 0, frames: 2, speed: 0.5 },
                walk: { row: 1, frames: 4 },
                punch: { row: 2, frames: 2, speed: 0.1 },
                hurt: { row: 3, frames: 1, speed: 0.3 },
            }
        });

        this.facingRight = true;
        this.state = 'idle';
        this.attackTimer = 0; // Cooldown timer
        this.hurtTimer = 0;
        this.hurtDuration = 0.3;

        // Invincibility
        this.invincible = false;
        this.invincibleTimer = 0;
        this.invincibleDuration = 1.0;

        // Base stats
        this.baseSpeed = PLAYER_SPEED;
        this.baseKnockback = 400;

        // Active powerups - one per type, time stacks
        this.buffTimers = {
            speed: 0,
            knockback: 0,
            damage: 0,
            punchSpeed: 0
        };
        this.buffAmounts = {
            speed: 100,
            knockback: 400,
            damage: 25,
            punchSpeed: 0.1 // Cooldown reduction
        };

        // Run-specific base stats (bought with candies)
        this.runStats = {
            damage: 0,
            speed: 0,
            knockback: 0,
            health: 0,
            punchSpeed: 0
        };
    }

    // Update base stats from game's run tracking
    setRunStats(stats) {
        this.runStats = { ...stats };
        // Update HP if health level changed
        const bonusHp = this.runStats.health * 20;
        const oldMax = this.maxHp;
        this.maxHp = 100 + bonusHp;
        if (oldMax !== this.maxHp) {
            this.hp += (this.maxHp - oldMax); // Heal for the difference
        }
    }

    get damage() {
        const base = 25;
        const upgradeAdd = this.runStats.damage * 5;
        const buffAdd = this.buffTimers.damage > 0 ? this.buffAmounts.damage : 0;
        return base + upgradeAdd + buffAdd;
    }

    get punchCooldown() {
        const base = 0.3; // Base cooldown
        const upgradeReduction = this.runStats.punchSpeed * 0.03;
        const buffReduction = this.buffTimers.punchSpeed > 0 ? this.buffAmounts.punchSpeed : 0;
        return Math.max(0.1, base - upgradeReduction - buffReduction);
    }

    // Get current speed with active buff
    get speed() {
        const upgradeAdd = this.runStats.speed * 40;
        return this.baseSpeed + upgradeAdd + (this.buffTimers.speed > 0 ? this.buffAmounts.speed : 0);
    }

    // Get current knockback with active buff
    get knockback() {
        const upgradeAdd = this.runStats.knockback * 100;
        return this.baseKnockback + upgradeAdd + (this.buffTimers.knockback > 0 ? this.buffAmounts.knockback : 0);
    }

    // Apply timed upgrade - ADDS to existing timer
    applyUpgrade(type, amount, duration) {
        this.buffTimers[type] += duration;
        // Optionally increase the buff amount too
        this.buffAmounts[type] = Math.max(this.buffAmounts[type], amount);
    }

    // Get active buff info for UI
    getActiveBuffs() {
        const buffs = [];
        if (this.buffTimers.speed > 0) buffs.push({ type: 'speed', timeLeft: Math.ceil(this.buffTimers.speed) });
        if (this.buffTimers.knockback > 0) buffs.push({ type: 'knockback', timeLeft: Math.ceil(this.buffTimers.knockback) });
        if (this.buffTimers.damage > 0) buffs.push({ type: 'damage', timeLeft: Math.ceil(this.buffTimers.damage) });
        if (this.buffTimers.punchSpeed > 0) buffs.push({ type: 'punchSpeed', timeLeft: Math.ceil(this.buffTimers.punchSpeed) });
        return buffs;
    }

    update(dt) {
        if (this.hp <= 0) return;

        // Update timers
        if (this.attackTimer > 0) this.attackTimer -= dt;

        // Update buff timers
        Object.keys(this.buffTimers).forEach(key => {
            if (this.buffTimers[key] > 0) {
                this.buffTimers[key] -= dt;
                if (this.buffTimers[key] <= 0) this.buffTimers[key] = 0;
            }
        });

        // Update invincibility
        if (this.invincible) {
            this.invincibleTimer -= dt;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }

        // Apply gravity and jumping
        this.vy += GRAVITY * dt;
        this.y += this.vy * dt;

        // Ground collision
        const groundY = this.game.height - 200;
        if (this.y > groundY) {
            this.y = groundY;
            this.vy = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        const input = this.game.input;
        let moving = false;

        // Handle Jumping (up arrow or W; space is used for attack)
        if ((input.isDown('ArrowUp') || input.isDown('w')) && this.isGrounded) {
            this.jump();
        }

        // Handle hurt state
        if (this.state === 'hurt') {
            this.hurtTimer -= dt;
            if (this.hurtTimer <= 0) {
                this.state = 'idle';
                this.sprite.cancelAnimation();
            }
            this.sprite.update(dt);
            return;
        }

        // Handle punch state
        if (this.state === 'punch') {
            this.sprite.update(dt);
            return;
        }

        // Movement using dynamic speed
        if (input.isDown('a') || input.isDown('arrowleft')) {
            this.x -= this.speed * dt;
            this.facingRight = false;
            moving = true;
        }
        if (input.isDown('d') || input.isDown('arrowright')) {
            this.x += this.speed * dt;
            this.facingRight = true;
            moving = true;
        }

        // Update Animation State
        if (moving) {
            this.state = 'walk';
            this.sprite.setAnimation('walk');
        } else {
            this.state = 'idle';
            this.sprite.setAnimation('idle');
        }

        // Boundaries
        if (this.x < 50) this.x = 50;
        if (this.x > this.game.width - 50) this.x = this.game.width - 50;

        this.sprite.update(dt);
    }

    jump() {
        this.vy = JUMP_FORCE;
        this.isGrounded = false;
    }

    attack() {
        if (this.state === 'hurt' || this.attackTimer > 0) return;

        this.state = 'punch';
        this.attackTimer = this.punchCooldown;

        // Scale animation speed with punch speed
        const baseAnimSpeed = 0.1;
        const reduction = (0.3 - this.punchCooldown);
        const animSpeed = Math.max(0.05, baseAnimSpeed - reduction);
        this.sprite.animations.punch.speed = animSpeed;

        this.sprite.setAnimation('punch', false, () => {
            this.state = 'idle';
            this.game.checkPlayerAttack(this);
        }, true);
    }

    takeDamage(amount) {
        if (this.state === 'hurt' || this.hp <= 0 || this.invincible) {
            return;
        }

        this.hp -= amount;
        this.state = 'hurt';
        this.hurtTimer = this.hurtDuration;

        // Start invincibility
        this.invincible = true;
        this.invincibleTimer = this.invincibleDuration;

        this.sprite.cancelAnimation();
        this.sprite.setAnimation('hurt', false, null, true);

        this.game.addNotification(`-${amount} 💔`, 'damage');

        if (this.hp <= 0) {
            this.hp = 0;
            this.game.triggerGameOver();
        }
    }

    draw(ctx) {
        // Flash when invincible
        if (this.invincible && Math.floor(this.invincibleTimer * 8) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        this.sprite.draw(ctx, this.x, this.y, !this.facingRight);

        ctx.globalAlpha = 1;
    }
}

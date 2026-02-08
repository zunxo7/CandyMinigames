import { Particle } from './Particle';
import { Game } from './Game';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { Medkit } from './Medkit';
import { Upgrade } from './Upgrade';
import { CANVAS_WIDTH } from './Constants';

export class PinataGame extends Game {
    constructor(canvas, onGameOver, onCurrencyUpdate, config = {}) {
        super(canvas, onGameOver);
        this.onCurrencyUpdate = onCurrencyUpdate;
        this.player = null;
        this.enemies = [];
        this.medkits = [];
        this.upgrades = [];
        this.particles = [];
        this.notifications = [];
        this.enemySpawnTimer = 0;
        this.medkitSpawnTimer = 0;
        this.upgradeSpawnTimer = 0;
        this.spawnInterval = config.spawnInterval ?? 5;
        this.medkitSpawnInterval = config.medkitSpawnInterval ?? 15;
        this.upgradeSpawnInterval = config.upgradeSpawnInterval ?? 15;
        this.maxEnemies = config.maxEnemies ?? 10;
        this.easeSeconds = config.easeSeconds ?? 20;
        this.hardThreshold = config.hardThreshold ?? 75;
        this.earlySpawnInterval = config.earlySpawnInterval ?? 7;
        this.comboWindow = config.comboWindow ?? 3;
        this.killCandies = 0;
        this.spentCandies = 0;
        this.currency = 0;
        this.nextNotificationId = 1;

        this.runStats = {
            damage: 0,
            speed: 0,
            knockback: 0,
            health: 0,
            punchSpeed: 0
        };
        this.runStatsPeer = {
            damage: 0,
            speed: 0,
            knockback: 0,
            health: 0,
            punchSpeed: 0
        };

        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.shakeDuration = 0.12;

        this.comboCount = 0;
        this.lastKillTime = -999;
        this.comboDisplayTimer = 0;

        this.multiplayer = config.multiplayer || null;
        this.player2 = null;
        this.peerInput = { left: false, right: false, jump: false, punch: false };
        this.lastPeerPunch = false;
        this.recentExplosions = [];
        this.recentHealEffects = [];
        this.recentUpgradeEffects = [];
        this.playerNames = ['Player 1', 'Player 2'];
        this.killsHost = 0;
        this.killsPeer = 0;
    }

    applyPeerMedkitClaim(claimX) {
        if (!this.player2 || claimX == null) return;
        const m = this.medkits.find((med) => Math.abs(med.x - claimX) < 40);
        if (!m || m.markedForDeletion) return;
        const healAmount = m.healAmount;
        const oldHp = this.player2.hp;
        this.player2.hp = Math.min(this.player2.maxHp, this.player2.hp + healAmount);
        const actualHeal = this.player2.hp - oldHp;
        if (actualHeal > 0) this.addNotification(`+${actualHeal} ❤️`, 'heal', 1);
        this.spawnHealEffect(this.player2.x, this.player2.y - 50);
        m.markedForDeletion = true;
    }

    applyPeerUpgradeClaim(claimX) {
        if (!this.player2 || claimX == null) return;
        const u = this.upgrades.find((up) => Math.abs(up.x - claimX) < 40);
        if (!u || u.markedForDeletion) return;
        this.player2.applyUpgrade(u.type, u.amount, u.duration);
        this.spawnUpgradeEffect(this.player2.x, this.player2.y - 50, u.type);
        u.markedForDeletion = true;
    }

    triggerShake(intensity = 8, duration = 0.12) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeTimer = Math.max(this.shakeTimer, duration);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
    }

    async start() {
        this.player = new Player(this);
        this.player.setRunStats(this.runStats);
        this.entities.push(this.player);

        if (this.multiplayer) {
            this.player2 = new Player(this);
            this.player2.setRunStats(this.runStatsPeer);
            this.player2.x = 350;
            this.player2.remoteInput = this.peerInput;
            this.entities.push(this.player2);
        }

        super.start();
    }

    addNotification(text, type = 'info', forPlayer = 0) {
        const duration = type === 'info' ? 4.0 : 2.5;
        this.notifications.push({
            id: this.nextNotificationId++,
            text,
            type,
            forPlayer,
            timer: duration,
            maxTimer: duration,
            opacity: 1
        });
        if (this.notifications.length > 10) {
            this.notifications.shift();
        }
    }

    update(dt) {
        if (this.isPaused) return;
        super.update(dt);

        // Update score/currency (standardized ~25–35/min: 1 candy per 3s + kills); clamp so it never goes negative
        const timeCandies = Math.floor(this.survivalTime / 3);
        this.currency = Math.max(0, (timeCandies + this.killCandies) - this.spentCandies);
        this.score = this.currency;

        // Game over when both players dead (or single player dead)
        if (this.multiplayer && this.player2) {
            if (this.player.hp <= 0 && this.player2.hp <= 0) {
                this.triggerGameOver();
                return;
            }
            this.player2.remoteInput = this.peerInput;
            if (this.peerInput.punch && !this.lastPeerPunch) {
                this.player2.attack();
            }
            this.lastPeerPunch = !!this.peerInput.punch;
        } else if (!this.player || this.player.hp <= 0) {
            return;
        }

        // Spawning Enemies (easier first N s: slower spawn, then ramp)
        this.enemySpawnTimer += dt;
        const effectiveSpawnInterval = this.survivalTime < this.easeSeconds
            ? this.earlySpawnInterval
            : this.spawnInterval;
        if (this.enemySpawnTimer > effectiveSpawnInterval) {
            this.enemySpawnTimer = 0;
            if (this.enemies.length < this.maxEnemies) {
                this.spawnEnemy();
                if (this.survivalTime >= this.easeSeconds && this.spawnInterval > 0.5) {
                    const drop = this.survivalTime >= this.hardThreshold ? 0.1 : 0.05;
                    this.spawnInterval = Math.max(this.survivalTime >= this.hardThreshold ? 0.35 : 0.5, this.spawnInterval - drop);
                }
            }
        }

        // Combo: reset if too long since last kill
        if (this.survivalTime - this.lastKillTime > this.comboWindow) {
            this.comboCount = 0;
        }

        // Cleanup dead enemies and give candies (combo multiplier, no shake on kill)
        this.enemies.forEach(e => {
            if (e.isDead && !e.rewardGiven) {
                e.rewardGiven = true;
                if (this.multiplayer && this.player2) {
                    if (e.killedBy === 1) this.killsPeer++;
                    else this.killsHost++;
                }

                if (this.survivalTime - this.lastKillTime <= this.comboWindow) {
                    this.comboCount++;
                } else {
                    this.comboCount = 1;
                }
                this.lastKillTime = this.survivalTime;
                this.comboDisplayTimer = 1.5;

                const baseReward = e.getReward();
                const mult = Math.min(2, 1 + (this.comboCount - 1) * 0.25);
                const reward = Math.max(1, Math.floor(baseReward * mult));

                this.killCandies += reward;
                this.currency += reward;
                if (this.onCurrencyUpdate) this.onCurrencyUpdate(this.currency);
                if (this.comboCount >= 2) {
                    this.addNotification(`${this.comboCount}x +${reward} 🍬`, 'candy', 'both');
                } else {
                    this.addNotification(`+${reward} 🍬`, 'candy', 'both');
                }
            }
        });
        this.enemies = this.enemies.filter(e => !e.isDead);

        // Spawning Medkits
        this.medkitSpawnTimer += dt;
        if (this.medkitSpawnTimer > this.medkitSpawnInterval) {
            this.spawnMedkit();
            this.medkitSpawnTimer = 0;
        }

        // Spawning Upgrades
        this.upgradeSpawnTimer += dt;
        if (this.upgradeSpawnTimer > this.upgradeSpawnInterval) {
            this.spawnUpgrade();
            this.upgradeSpawnTimer = 0;
        }

        // Check Medkit pickups (both players)
        this.medkits.forEach(m => {
            if (m.markedForDeletion) return;
            let dist = Math.abs(this.player.x - m.x);
            if (this.player2 && this.player2.hp > 0) {
                dist = Math.min(dist, Math.abs(this.player2.x - m.x));
            }
            if (dist < 50) {
                const healAmount = m.healAmount;
                let healedPlayer = this.player;
                if (this.player2 && this.player2.hp > 0) {
                    const d1 = Math.abs(this.player.x - m.x);
                    const d2 = Math.abs(this.player2.x - m.x);
                    healedPlayer = d2 < d1 ? this.player2 : this.player;
                }
                const oldHp = healedPlayer.hp;
                healedPlayer.hp = Math.min(healedPlayer.maxHp, healedPlayer.hp + healAmount);
                const actualHeal = healedPlayer.hp - oldHp;

                if (actualHeal > 0) {
                    const forPlayer = healedPlayer === this.player2 ? 1 : 0;
                    this.addNotification(`+${actualHeal} ❤️`, 'heal', forPlayer);
                }

                this.spawnHealEffect(healedPlayer.x, healedPlayer.y - 50);
                m.markedForDeletion = true;
            }
        });
        this.medkits = this.medkits.filter(m => !m.markedForDeletion);

        // Check Upgrade pickups (both players)
        this.upgrades.forEach(u => {
            if (u.markedForDeletion) return;
            let dist = Math.abs(this.player.x - u.x);
            let pickingPlayer = this.player;
            if (this.player2 && this.player2.hp > 0) {
                const d2 = Math.abs(this.player2.x - u.x);
                if (d2 < dist) {
                    dist = d2;
                    pickingPlayer = this.player2;
                }
            }
            if (dist < 50) {
                pickingPlayer.applyUpgrade(u.type, u.amount, u.duration);
                this.spawnUpgradeEffect(pickingPlayer.x, pickingPlayer.y - 50, u.type);
                u.markedForDeletion = true;
            }
        });
        this.upgrades = this.upgrades.filter(u => !u.markedForDeletion);

        // Update Particles
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => p.life > 0);

        // Update notifications
        this.notifications.forEach(n => {
            n.timer -= dt;
            if (n.timer < 0.5) {
                n.opacity = n.timer / 0.5;
            }
        });
        this.notifications = this.notifications.filter(n => n.timer > 0);

        // Decay screen shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            if (this.shakeTimer <= 0) this.shakeIntensity = 0;
        }

        if (this.comboDisplayTimer > 0) this.comboDisplayTimer -= dt;

        this.entities = [
            this.player,
            ...(this.player2 ? [this.player2] : []),
            ...this.enemies,
            ...this.medkits,
            ...this.upgrades
        ];

        // UI is updated at the top of update() to ensure consistency

        if (this.onCurrencyUpdate) {
            this.onCurrencyUpdate(this.currency);
        }
    }

    draw() {
        const ctx = this.ctx;
        if (this.shakeTimer > 0) {
            const t = this.shakeTimer / this.shakeDuration;
            const s = this.shakeIntensity * t;
            const dx = (Math.random() - 0.5) * 2 * s;
            const dy = (Math.random() - 0.5) * 2 * s;
            ctx.save();
            ctx.translate(dx, dy);
        }
        super.draw();
        this.particles.forEach(p => p.draw(ctx));

        if (this.multiplayer && this.playerNames?.length) {
            const nameTagH = 18;
            const scale = 0.5;
            const frameH = 170 * scale;
            [this.player, this.player2].forEach((p, i) => {
                if (!p) return;
                const name = this.playerNames[i] || `Player ${i + 1}`;
                ctx.save();
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const nameY = p.y - frameH - nameTagH - 4;
                ctx.fillStyle = '#1a1a1a';
                ctx.fillText(name, p.x, nameY + nameTagH / 2);
                ctx.restore();
            });
        }

        if (this.comboDisplayTimer > 0 && this.comboCount >= 2) {
            const t = this.comboDisplayTimer;
            const fadeInDur = 0.2;
            const fadeOutStart = 0.35;
            let alpha = 1;
            if (t > 1.5 - fadeInDur) {
                alpha = (1.5 - t) / fadeInDur;
            } else if (t < fadeOutStart) {
                alpha = t / fadeOutStart;
            }
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = 'bold 52px sans-serif';
            ctx.fillStyle = '#ff6b9d';
            ctx.strokeStyle = '#2d2d2d';
            ctx.lineWidth = 5;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const comboText = `${this.comboCount}x`;
            ctx.strokeText(comboText, this.width / 2, this.height / 2 - 80);
            ctx.fillText(comboText, this.width / 2, this.height / 2 - 80);
            ctx.restore();
        }

        if (this.shakeTimer > 0) ctx.restore();
    }

    spawnEnemy() {
        const side = Math.random() > 0.5 ? -100 : this.width + 100;

        const time = this.survivalTime;

        // Randomize enemy type (variants only after 30s)
        let type = 'normal';
        if (time > 30) {
            const roll = Math.random();
            if (roll < 0.25) {
                type = 'tiny';
            } else if (roll < 0.4 && time > 60) {
                type = 'giant';
            }
        }

        // Difficulty: ease in first N s, then ramp; after hardThreshold spike hard
        const easeSeconds = this.easeSeconds;
        const hardThreshold = this.hardThreshold;
        let difficulty;
        if (time < easeSeconds) {
            difficulty = 0.5 + 0.5 * (time / easeSeconds);
        } else if (time < hardThreshold) {
            difficulty = 1 + (time - easeSeconds) / 60;
        } else {
            const baseAt75 = 1 + (hardThreshold - easeSeconds) / 60;
            difficulty = baseAt75 + (time - hardThreshold) / 12;
        }

        const enemy = new Enemy(this, side, type, difficulty);
        this.enemies.push(enemy);
        this.entities.push(enemy);
    }

    spawnMedkit() {
        const x = 100 + Math.random() * (this.width - 200);
        const medkit = new Medkit(this, x);
        medkit.y = this.height - 200;
        this.medkits.push(medkit);
        this.entities.push(medkit);
        this.addNotification('💊 Medkit spawned!', 'info');
    }

    spawnUpgrade() {
        const x = 100 + Math.random() * (this.width - 200);
        const type = Math.random() > 0.5 ? 'speed' : 'knockback';
        const upgrade = new Upgrade(this, x, type);
        this.upgrades.push(upgrade);
        this.entities.push(upgrade);

        if (type === 'speed') {
            this.addNotification('⚡ Speed Upgrade spawned!', 'info');
        } else {
            this.addNotification('💥 Knockback Upgrade spawned!', 'info');
        }
    }

    spawnExplosion(x, y) {
        this.recentExplosions.push({ x, y, t: this.survivalTime });
        const colors = ['#ff6b9d', '#ffb3c6', '#ffffff', '#ffd93d', '#ff9ec4'];
        for (let i = 0; i < 25; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.particles.push(new Particle(this, x, y, color));
        }
    }

    spawnHealEffect(x, y) {
        if (this.multiplayer) this.recentHealEffects.push({ x, y, t: this.survivalTime });
        const colors = ['#55efc4', '#00b894', '#ffffff', '#81ecec'];
        for (let i = 0; i < 15; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const particle = new Particle(this, x, y, color);
            particle.vy = -Math.abs(particle.vy) - 50;
            this.particles.push(particle);
        }
    }

    spawnUpgradeEffect(x, y, type) {
        if (this.multiplayer) this.recentUpgradeEffects.push({ x, y, type, t: this.survivalTime });
        const colors = type === 'speed'
            ? ['#3498db', '#2980b9', '#ffffff', '#74b9ff']
            : ['#e74c3c', '#c0392b', '#ffffff', '#ff7675'];
        for (let i = 0; i < 20; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const particle = new Particle(this, x, y, color);
            particle.vy = -Math.abs(particle.vy) - 80;
            this.particles.push(particle);
        }
    }

    handleInput(type) {
        if (type === 'attack' && this.player) {
            this.player.attack();
        }
    }

    buyStatUpgrade(statName) {
        const level = this.runStats[statName] || 0;
        const cost = 20 + (level * 5);

        if (this.currency >= cost) {
            this.spentCandies += cost;
            this.runStats[statName] = level + 1;
            if (this.player) {
                this.player.setRunStats(this.runStats);
            }
            this.addNotification(`Upgraded ${statName}!`, 'info');
            return true;
        }
        return false;
    }

    buyStatUpgradePeer(statName) {
        if (!this.player2) return false;
        const level = this.runStatsPeer[statName] || 0;
        const cost = 20 + (level * 5);

        if (this.currency >= cost) {
            this.spentCandies += cost;
            this.runStatsPeer[statName] = level + 1;
            this.player2.setRunStats(this.runStatsPeer);
            this.addNotification(`Upgraded ${statName}!`, 'info', 1);
            return true;
        }
        return false;
    }

    checkPlayerAttack(player) {
        const attackReach = 150;
        const damage = player.damage;

        this.enemies.forEach(d => {
            const dist = d.x - player.x;
            let hit = false;
            let knockDir = 0;

            if (player.facingRight && dist > 0 && dist < attackReach) {
                hit = true;
                knockDir = 1;
            } else if (!player.facingRight && dist < 0 && Math.abs(dist) < attackReach) {
                hit = true;
                knockDir = -1;
            }

            if (hit) {
                const attackerIndex = player === this.player ? 0 : 1;
                d.takeDamage(damage, knockDir, player.knockback, attackerIndex);
                this.triggerShake(6, 0.1);
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
            }
        });
    }

    getNotifications() {
        return this.notifications;
    }

    serializeState() {
        if (!this.multiplayer) return null;
        const p1 = this.player ? {
            x: this.player.x, y: this.player.y, hp: this.player.hp, maxHp: this.player.maxHp,
            state: this.player.state, facingRight: this.player.facingRight,
            frameIndex: this.player.sprite?.frameIndex ?? 0,
            invincible: !!this.player.invincible,
            invincibleTimer: this.player.invincibleTimer ?? 0
        } : null;
        const p2 = this.player2 ? {
            x: this.player2.x, y: this.player2.y, hp: this.player2.hp, maxHp: this.player2.maxHp,
            state: this.player2.state, facingRight: this.player2.facingRight,
            frameIndex: this.player2.sprite?.frameIndex ?? 0,
            invincible: !!this.player2.invincible,
            invincibleTimer: this.player2.invincibleTimer ?? 0,
            activeBuffs: this.player2.getActiveBuffs ? this.player2.getActiveBuffs() : []
        } : null;
        const enemies = this.enemies.map((e) => ({
            id: e.id || e.x + e.y, x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp || 100, isDead: e.isDead,
            type: e.type || 'normal', facingRight: e.facingRight,
            state: e.state || 'walk', frameIndex: e.sprite?.frameIndex ?? 0
        }));
        const medkits = this.medkits.map((m) => ({ x: m.x, y: m.y }));
        const upgrades = this.upgrades.map((u) => ({ x: u.x, y: u.y, type: u.type }));
        const now = this.survivalTime;
        const explosions = this.recentExplosions.filter((e) => now - e.t < 0.4);
        this.recentExplosions = this.recentExplosions.filter((e) => now - e.t < 0.5);
        const recentHealEffects = this.recentHealEffects.filter((e) => now - e.t < 0.6);
        this.recentHealEffects = this.recentHealEffects.filter((e) => now - e.t < 0.7);
        const recentUpgradeEffects = this.recentUpgradeEffects.filter((e) => now - e.t < 0.6);
        this.recentUpgradeEffects = this.recentUpgradeEffects.filter((e) => now - e.t < 0.7);
        const notifications = this.notifications
            .filter((n) => n.forPlayer === 1 || n.forPlayer === 'both')
            .map((n) => ({
                id: n.id,
                text: n.text,
                type: n.type,
                timer: n.timer,
                maxTimer: n.maxTimer,
                opacity: n.opacity
            }));
        const peerActiveBuffs = this.player2?.getActiveBuffs ? this.player2.getActiveBuffs() : [];
        return {
            t: this.survivalTime,
            survivalTime: this.survivalTime,
            players: [p1, p2],
            peerActiveBuffs,
            enemies,
            medkits,
            upgrades,
            currency: this.currency,
            clouds: this.clouds,
            flowers: this.flowers,
            grassBlades: this.grassBlades,
            explosions,
            notifications,
            gameOver: (this.player?.hp <= 0 && (!this.player2 || this.player2.hp <= 0)),
            comboCount: this.comboCount,
            comboDisplayTimer: this.comboDisplayTimer,
            width: this.width,
            height: this.height,
            recentHealEffects,
            recentUpgradeEffects,
            shakeIntensity: this.shakeIntensity,
            shakeTimer: this.shakeTimer,
            runStats: this.runStats,
            runStatsPeer: this.runStatsPeer
        };
    }

    getPlayerHealth() {
        if (!this.player) return { hp: 0, maxHp: 100 };
        return { hp: this.player.hp, maxHp: this.player.maxHp };
    }

    triggerGameOver() {
        if (!this.onGameOver) return;
        if (this.multiplayer && this.player2) {
            const total = this.currency;
            const totalKills = this.killsHost + this.killsPeer;
            const hostCandies = totalKills > 0 ? Math.round(total * this.killsHost / totalKills) : Math.floor(total / 2);
            const peerCandies = total - hostCandies;
            this.onGameOver(this.score, total, {
                hostCandies,
                peerCandies,
                killsHost: this.killsHost,
                killsPeer: this.killsPeer,
                playerNames: [...(this.playerNames || ['Player 1', 'Player 2'])]
            });
        } else {
            this.onGameOver(this.score, this.currency);
        }
    }
}

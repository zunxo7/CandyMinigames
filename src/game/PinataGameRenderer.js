/**
 * Thin renderer for co-op peer mode. Draws from serialized state (no simulation).
 */
import { getViewportSize } from './Constants';
import crumbUrl from '../assets/Crumb.webp';
import enemyUrl from '../assets/Evil Pinata.webp';
import medkitUrl from '../assets/Medkit.webp';
import speedUrl from '../assets/Speed.webp';
import knockbackUrl from '../assets/Knockback.webp';

const PLAYER_FRAME = { w: 276, h: 170, scale: 0.5 };
const ENEMY_FRAME = { w: 335, h: 326 };
const ENEMY_SCALES = { normal: 0.35, tiny: 0.21, giant: 0.5 };
const ANIM_ROW = { idle: 0, walk: 1, punch: 2, hurt: 3 };
const ENEMY_ROW = { walk: 0, attack: 1 };
const EXPLOSION_COLORS = ['#ff6b9d', '#ffb3c6', '#ffffff', '#ffd93d', '#ff9ec4'];
const HEAL_COLORS = ['#55efc4', '#00b894', '#ffffff', '#81ecec'];
const UPGRADE_SPEED_COLORS = ['#3498db', '#2980b9', '#ffffff', '#74b9ff'];
const UPGRADE_KNOCKBACK_COLORS = ['#e74c3c', '#c0392b', '#ffffff', '#ff7675'];

export class PinataGameRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this._syncSizeFromCanvas();
        this.assets = {};
        this.bobTimer = 0;
        this.explosionParticles = [];
        this.healParticles = [];
        this.upgradeParticles = [];
        this.lastDrawTime = 0;
        this.explosionCooldown = new Map();
        this.healEffectCooldown = new Map();
        this.upgradeEffectCooldown = new Map();
        this.groundY = () => this.height - 200;
        this.resizeHandler = () => {
            this._syncSizeFromCanvas();
        };
        window.addEventListener('resize', this.resizeHandler);
    }

    _syncSizeFromCanvas() {
        const { width: maxW, height: maxH } = getViewportSize();
        const cw = this.canvas?.clientWidth || 0;
        const ch = this.canvas?.clientHeight || 0;
        const w = cw > 0 ? Math.min(cw, maxW) : maxW;
        const h = ch > 0 ? Math.min(ch, maxH) : maxH;
        this.width = Math.max(300, w);
        this.height = Math.max(200, h);
        if (this.canvas) {
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        }
    }

    async loadAssets() {
        const loadImage = (src) =>
            new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = src;
            });
        this.assets.crumb = await loadImage(crumbUrl);
        this.assets.enemy = await loadImage(enemyUrl);
        this.assets.medkit = await loadImage(medkitUrl);
        this.assets.speed = await loadImage(speedUrl);
        this.assets.knockback = await loadImage(knockbackUrl);
    }

    drawCloud(x, y, size) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.arc(x + size * 0.35, y - size * 0.15, size * 0.4, 0, Math.PI * 2);
        ctx.arc(x + size * 0.7, y, size * 0.45, 0, Math.PI * 2);
        ctx.arc(x + size * 0.35, y + size * 0.15, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
    }

    spawnExplosionParticles(x, y) {
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 150 + 50;
            this.explosionParticles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 100,
                life: 1,
                color: EXPLOSION_COLORS[Math.floor(Math.random() * EXPLOSION_COLORS.length)],
                size: Math.random() * 5 + 3,
                gravity: 500
            });
        }
    }

    spawnHealParticles(x, y) {
        for (let i = 0; i < 15; i++) {
            const color = HEAL_COLORS[Math.floor(Math.random() * HEAL_COLORS.length)];
            this.healParticles.push({
                x, y,
                vx: (Math.random() - 0.5) * 60,
                vy: -Math.abs((Math.random() - 0.5) * 80) - 50,
                life: 1,
                color,
                size: Math.random() * 4 + 2,
                gravity: 500
            });
        }
    }

    spawnUpgradeParticles(x, y, type) {
        const colors = type === 'speed' ? UPGRADE_SPEED_COLORS : UPGRADE_KNOCKBACK_COLORS;
        for (let i = 0; i < 20; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.upgradeParticles.push({
                x, y,
                vx: (Math.random() - 0.5) * 60,
                vy: -Math.abs((Math.random() - 0.5) * 100) - 80,
                life: 1,
                color,
                size: Math.random() * 4 + 2,
                gravity: 500
            });
        }
    }

    updateExplosionParticles(dt, groundY) {
        const gy = groundY ?? this.groundY();
        for (const p of this.explosionParticles) {
            p.life -= dt * (Math.random() * 0.5 + 0.5);
            p.vy += p.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.y > gy) {
                p.y = gy;
                p.vy *= -0.5;
                p.vx *= 0.8;
            }
        }
        this.explosionParticles = this.explosionParticles.filter((p) => p.life > 0);
    }

    updateHealParticles(dt, groundY) {
        const gy = groundY ?? this.groundY();
        for (const p of this.healParticles) {
            p.life -= dt * (Math.random() * 0.5 + 0.5);
            p.vy += p.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.y > gy) {
                p.y = gy;
                p.vy *= -0.5;
                p.vx *= 0.8;
            }
        }
        this.healParticles = this.healParticles.filter((p) => p.life > 0);
    }

    updateUpgradeParticles(dt, groundY) {
        const gy = groundY ?? this.groundY();
        for (const p of this.upgradeParticles) {
            p.life -= dt * (Math.random() * 0.5 + 0.5);
            p.vy += p.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.y > gy) {
                p.y = gy;
                p.vy *= -0.5;
                p.vx *= 0.8;
            }
        }
        this.upgradeParticles = this.upgradeParticles.filter((p) => p.life > 0);
    }

    draw(state) {
        if (!this.ctx) return;
        const useHostSpace = state?.width != null && state?.height != null;
        if (useHostSpace) {
            const { width: viewportW, height: viewportH } = getViewportSize();
            const parent = this.canvas?.parentElement;
            const cw = parent?.clientWidth || this.canvas?.clientWidth || 0;
            const ch = parent?.clientHeight || this.canvas?.clientHeight || 0;
            this.width = Math.max(300, Math.min(cw || viewportW, viewportW));
            this.height = Math.max(200, Math.min(ch || viewportH, viewportH));
            if (this.canvas) {
                this.canvas.width = this.width;
                this.canvas.height = this.height;
            }
        } else {
            this._syncSizeFromCanvas();
        }
        const now = performance.now();
        const dt = Math.min(0.05, (now - this.lastDrawTime) / 1000) || 0.016;
        this.lastDrawTime = now;
        this.bobTimer += 0.05;
        const t = state?.survivalTime ?? state?.t ?? 0;

        const gameWidth = state?.width ?? this.width;
        const gameHeight = state?.height ?? this.height;
        const scale = useHostSpace
            ? Math.max(this.width / gameWidth, this.height / gameHeight)
            : 1;
        const offsetX = useHostSpace ? (this.width - gameWidth * scale) / 2 : 0;
        const offsetY = useHostSpace ? (this.height - gameHeight * scale) / 2 : 0;
        const groundY = gameHeight - 200;

        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.save();

        if (state?.shakeTimer > 0 && state?.shakeIntensity) {
            const shakeAlpha = Math.min(1, (state.shakeTimer / 0.12) || 1);
            const s = state.shakeIntensity * shakeAlpha;
            const dx = (Math.random() - 0.5) * 2 * s;
            const dy = (Math.random() - 0.5) * 2 * s;
            this.ctx.translate(dx, dy);
        }
        if (useHostSpace) {
            this.ctx.translate(offsetX, offsetY);
            this.ctx.scale(scale, scale);
        }

        if (state?.explosions?.length) {
            for (const e of state.explosions) {
                const key = `${e.x.toFixed(0)},${e.y.toFixed(0)}`;
                if ((now / 1000) - (this.explosionCooldown.get(key) || 0) > 0.3) {
                    this.explosionCooldown.set(key, now / 1000);
                    this.spawnExplosionParticles(e.x, e.y);
                }
            }
        }
        if (state?.recentHealEffects?.length) {
            for (const e of state.recentHealEffects) {
                const key = `${e.x.toFixed(0)},${e.y.toFixed(0)},${e.t.toFixed(2)}`;
                if (!this.healEffectCooldown.has(key)) {
                    this.healEffectCooldown.set(key, now / 1000);
                    this.spawnHealParticles(e.x, e.y);
                }
            }
        }
        if (state?.recentUpgradeEffects?.length) {
            for (const e of state.recentUpgradeEffects) {
                const key = `${e.x.toFixed(0)},${e.y.toFixed(0)},${e.t.toFixed(2)}`;
                if (!this.upgradeEffectCooldown.has(key)) {
                    this.upgradeEffectCooldown.set(key, now / 1000);
                    this.spawnUpgradeParticles(e.x, e.y, e.type);
                }
            }
        }
        this.updateExplosionParticles(dt, groundY);
        this.updateHealParticles(dt, groundY);
        this.updateUpgradeParticles(dt, groundY);

        // Sky (match Game.js default theme)
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, groundY);
        skyGradient.addColorStop(0, '#fff5f8');
        skyGradient.addColorStop(0.4, '#ffe6ed');
        skyGradient.addColorStop(0.7, '#ffc1d4');
        skyGradient.addColorStop(1, '#ffb3c6');
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, gameWidth, groundY);

        // Clouds
        const clouds = state?.clouds || [];
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        clouds.forEach((cloud) => {
            const x = ((cloud.x + t * cloud.speed) % (gameWidth + 200)) - 100;
            this.drawCloud(x, cloud.y, cloud.size);
        });

        // Hills (match Game.js)
        this.ctx.fillStyle = '#ffd6e0';
        this.ctx.beginPath();
        this.ctx.moveTo(0, groundY);
        for (let x = 0; x <= gameWidth; x += 80) {
            const h = 40 + Math.sin(x * 0.004 + 1) * 25 + Math.sin(x * 0.008) * 15;
            this.ctx.lineTo(x, groundY - h);
        }
        this.ctx.lineTo(gameWidth, groundY);
        this.ctx.closePath();
        this.ctx.fill();

        // Ground
        const groundGradient = this.ctx.createLinearGradient(0, groundY, 0, gameHeight);
        groundGradient.addColorStop(0, '#8BC34A');
        groundGradient.addColorStop(0.1, '#7CB342');
        groundGradient.addColorStop(0.4, '#689F38');
        groundGradient.addColorStop(1, '#558B2F');
        this.ctx.fillStyle = groundGradient;
        this.ctx.fillRect(0, groundY, gameWidth, gameHeight - groundY);

        // Dirt patches
        this.ctx.fillStyle = 'rgba(139, 90, 43, 0.15)';
        for (let i = 0; i < 8; i++) {
            const patchX = (i * 250 + t * 5) % (gameWidth + 100) - 50;
            this.ctx.beginPath();
            this.ctx.ellipse(patchX, groundY + 80, 60, 25, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Grass blades
        const grassBlades = state?.grassBlades || [];
        grassBlades.forEach((blade) => {
            const x = ((blade.x) % (gameWidth + 50)) - 25;
            const sway = Math.sin(t * 2 + blade.sway) * 3;
            this.ctx.fillStyle = '#7CB342';
            this.ctx.beginPath();
            this.ctx.moveTo(x, groundY);
            this.ctx.quadraticCurveTo(x + sway, groundY - blade.height / 2, x + sway + 2, groundY - blade.height);
            this.ctx.quadraticCurveTo(x + sway + blade.width / 2, groundY - blade.height / 2, x + blade.width, groundY);
            this.ctx.fill();
        });

        // Platform edge
        this.ctx.strokeStyle = '#2d2d2d';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(0, groundY);
        this.ctx.lineTo(gameWidth, groundY);
        this.ctx.stroke();

        // Flowers
        const flowers = state?.flowers || [];
        this.ctx.textAlign = 'center';
        flowers.forEach((flower) => {
            const x = ((flower.x + t * 12) % (gameWidth + 100)) - 50;
            this.ctx.font = `${flower.size}px serif`;
            this.ctx.fillText(flower.type, x, groundY + flower.yOffset);
        });

        if (!state) return;

        // Players (host = p1, peer = p2) – full animation + hurt flash; draw dead players dimmed (spectate)
        const players = state.players || [];
        const playerNames = state.playerNames || ['Player 1', 'Player 2'];
        const nameTagH = 18;
        players.forEach((p, i) => {
            if (!p) return;
            const row = ANIM_ROW[p.state] ?? 0;
            const frameIndex = p.frameIndex ?? 0;
            const img = this.assets.crumb;
            if (img) {
                this.ctx.save();
                if (p.hp <= 0) {
                    this.ctx.globalAlpha = 0.5;
                } else if (p.invincible && Math.floor((p.invincibleTimer ?? 1) * 8) % 2 === 0) {
                    this.ctx.globalAlpha = 0.4;
                }
                this.ctx.translate(Math.floor(p.x), Math.floor(p.y));
                if (!p.facingRight) this.ctx.scale(-1, 1);
                const w = PLAYER_FRAME.w * PLAYER_FRAME.scale;
                const h = PLAYER_FRAME.h * PLAYER_FRAME.scale;
                this.ctx.drawImage(
                    img,
                    frameIndex * PLAYER_FRAME.w, row * PLAYER_FRAME.h, PLAYER_FRAME.w, PLAYER_FRAME.h,
                    -w / 2, -h, w, h
                );
                this.ctx.restore();
            }
            const name = playerNames[i] || `Player ${i + 1}`;
            this.ctx.save();
            this.ctx.font = 'bold 12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            const nameY = p.y - (PLAYER_FRAME.h * PLAYER_FRAME.scale) - nameTagH - 4;
            this.ctx.fillStyle = '#1a1a1a';
            this.ctx.fillText(name, p.x, nameY + nameTagH / 2);
            this.ctx.restore();
        });

        // Enemies – full animation (walk/attack rows, frame index)
        const enemies = (state.enemies || []).filter((e) => !e.isDead && e.hp > 0);
        enemies.forEach((e) => {
            const scale = ENEMY_SCALES[e.type] ?? ENEMY_SCALES.normal;
            const row = ENEMY_ROW[e.state] ?? 0;
            const frameIndex = e.frameIndex ?? 0;
            const img = this.assets.enemy;
            if (img) {
                this.ctx.save();
                this.ctx.translate(Math.floor(e.x), Math.floor(e.y));
                if (!e.facingRight) this.ctx.scale(-1, 1);
                const w = ENEMY_FRAME.w * scale;
                const h = ENEMY_FRAME.h * scale;
                this.ctx.drawImage(
                    img,
                    frameIndex * ENEMY_FRAME.w, row * ENEMY_FRAME.h, ENEMY_FRAME.w, ENEMY_FRAME.h,
                    -w / 2, -h, w, h
                );
                this.ctx.restore();
            }
            const barWidth = e.type === 'giant' ? 80 : e.type === 'tiny' ? 40 : 60;
            const yOff = e.type === 'giant' ? 180 : e.type === 'tiny' ? 100 : 150;
            this.ctx.fillStyle = '#2d2d2d';
            this.ctx.beginPath();
            this.ctx.roundRect(e.x - barWidth / 2 - 3, e.y - yOff - 6, barWidth + 6, 14, 6);
            this.ctx.fill();
            this.ctx.fillStyle = e.type === 'giant' ? '#9b59b6' : e.type === 'tiny' ? '#3498db' : '#ff6b9d';
            this.ctx.beginPath();
            this.ctx.roundRect(e.x - barWidth / 2, e.y - yOff - 3, Math.max(0, barWidth * (e.hp / (e.maxHp || 100))), 8, 4);
            this.ctx.fill();
        });

        // Medkits
        const bobY = Math.sin(this.bobTimer) * 5;
        (state.medkits || []).forEach((m) => {
            const y = groundY - 50 + bobY;
            if (this.assets.medkit) {
                this.ctx.drawImage(this.assets.medkit, m.x - 25, y - 25, 50, 50);
            }
        });

        // Upgrades
        (state.upgrades || []).forEach((u) => {
            const y = groundY - 50 + bobY;
            const img = u.type === 'speed' ? this.assets.speed : this.assets.knockback;
            if (img) {
                this.ctx.drawImage(img, u.x - 25, y - 25, 50, 50);
            }
        });

        // Death explosion particles (on top)
        this.ctx.save();
        for (const p of this.explosionParticles) {
            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        this.ctx.restore();

        // Heal pickup particles
        this.ctx.save();
        for (const p of this.healParticles) {
            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        this.ctx.restore();

        // Upgrade pickup particles
        this.ctx.save();
        for (const p of this.upgradeParticles) {
            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        this.ctx.restore();

        this.ctx.restore();

        // Shared combo display in screen space (same as host – both players add to one combo)
        const comboCount = state?.comboCount ?? 0;
        const comboDisplayTimer = state?.comboDisplayTimer ?? 0;
        if (comboDisplayTimer > 0 && comboCount >= 2) {
            const tc = comboDisplayTimer;
            const fadeInDur = 0.2;
            const fadeOutStart = 0.35;
            let alpha = 1;
            if (tc > 1.5 - fadeInDur) {
                alpha = (1.5 - tc) / fadeInDur;
            } else if (tc < fadeOutStart) {
                alpha = tc / fadeOutStart;
            }
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.font = 'bold 52px sans-serif';
            this.ctx.fillStyle = '#ff6b9d';
            this.ctx.strokeStyle = '#2d2d2d';
            this.ctx.lineWidth = 5;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            const comboText = `${comboCount}x`;
            this.ctx.strokeText(comboText, this.width / 2, this.height / 2 - 80);
            this.ctx.fillText(comboText, this.width / 2, this.height / 2 - 80);
            this.ctx.restore();
        }
    }

    destroy() {
        window.removeEventListener('resize', this.resizeHandler);
    }
}

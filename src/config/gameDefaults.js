/**
 * Default game config values and schema for admin tuning.
 * Stored in app_settings as game_config_flappy, game_config_pinata, game_config_bobo (JSON).
 */

export const DEFAULT_FLAPPY_CONFIG = {
    pipeInterval: 2.0,
    pipeWidthBase: 100,
    pipeGapBase: 250,
    speedBase: 300,
    candiesPerPipe: 3,
    bonusPipeInterval: 3,
    bonusPipeCandies: 5,
    medkitGuaranteedPipe: 3,
    medkitSpawnEveryNPipes: 3,
    medkitSpawnChance: 0.5,
    medkitSizeMultiplier: 1.1,
    maxLives: 2,
    gravity: 0.15,
    jump: -5.2
};

export const DEFAULT_PINATA_CONFIG = {
    spawnInterval: 5,
    medkitSpawnInterval: 15,
    upgradeSpawnInterval: 15,
    maxEnemies: 10,
    easeSeconds: 20,
    hardThreshold: 75,
    earlySpawnInterval: 7,
    comboWindow: 3
};

export const DEFAULT_BOBO_CONFIG = {
    penaltyThreshold: 65,
    pickleRainFirstThreshold: 70,
    pickleRainNextIncrement: 500,
    pickleRainDuration: 5,
    spawnInterval: 1.2,
    lives: 3,
    veggieChanceBase: 0.3,
    veggieChanceMax: 0.35,
    veggieChanceScoreScale: 2500,
    missedSweetPenalty: 1,
    speedSpawnInterval: 25
};

/** Schema for admin form: { key, label, type: 'number', min, max, step } */
export const FLAPPY_CONFIG_SCHEMA = [
    { key: 'pipeInterval', label: 'Pipe spawn interval (s)', type: 'number', min: 0.5, max: 10, step: 0.1 },
    { key: 'pipeWidthBase', label: 'Pipe width (base)', type: 'number', min: 50, max: 200, step: 5 },
    { key: 'pipeGapBase', label: 'Gap height', type: 'number', min: 150, max: 400, step: 10 },
    { key: 'speedBase', label: 'Scroll speed', type: 'number', min: 150, max: 500, step: 10 },
    { key: 'candiesPerPipe', label: 'Candies per pipe', type: 'number', min: 1, max: 20, step: 1 },
    { key: 'bonusPipeInterval', label: 'Every N pipes = bonus pipe', type: 'number', min: 2, max: 10, step: 1 },
    { key: 'bonusPipeCandies', label: 'Bonus pipe candies', type: 'number', min: 1, max: 20, step: 1 },
    { key: 'medkitGuaranteedPipe', label: 'Guaranteed medkit on pipe #', type: 'number', min: 1, max: 10, step: 1 },
    { key: 'medkitSpawnEveryNPipes', label: 'Chance spawn every N pipes (after guaranteed)', type: 'number', min: 2, max: 10, step: 1 },
    { key: 'medkitSpawnChance', label: 'Medkit spawn chance (0–1)', type: 'number', min: 0, max: 1, step: 0.1 },
    { key: 'medkitSizeMultiplier', label: 'Medkit size multiplier (e.g. 1.1 = 10% bigger)', type: 'number', min: 0.8, max: 1.5, step: 0.05 },
    { key: 'maxLives', label: 'Max lives', type: 'number', min: 1, max: 5, step: 1 },
    { key: 'gravity', label: 'Gravity', type: 'number', min: 0.05, max: 0.5, step: 0.01 },
    { key: 'jump', label: 'Jump force', type: 'number', min: -10, max: -2, step: 0.1 }
];

export const PINATA_CONFIG_SCHEMA = [
    { key: 'spawnInterval', label: 'Enemy spawn interval (s)', type: 'number', min: 1, max: 20, step: 0.5 },
    { key: 'medkitSpawnInterval', label: 'Medkit spawn interval (s)', type: 'number', min: 5, max: 60, step: 1 },
    { key: 'upgradeSpawnInterval', label: 'Upgrade spawn interval (s)', type: 'number', min: 5, max: 60, step: 1 },
    { key: 'maxEnemies', label: 'Max enemies on screen', type: 'number', min: 3, max: 25, step: 1 },
    { key: 'easeSeconds', label: 'Easy phase duration (s)', type: 'number', min: 5, max: 60, step: 1 },
    { key: 'hardThreshold', label: 'Hard phase starts at (s)', type: 'number', min: 30, max: 120, step: 5 },
    { key: 'earlySpawnInterval', label: 'Spawn interval during easy phase (s)', type: 'number', min: 3, max: 20, step: 0.5 },
    { key: 'comboWindow', label: 'Combo window (s)', type: 'number', min: 1, max: 10, step: 0.5 }
];

export const BOBO_CONFIG_SCHEMA = [
    { key: 'penaltyThreshold', label: 'Penalties start at (candies)', type: 'number', min: 0, max: 200, step: 5 },
    { key: 'pickleRainFirstThreshold', label: 'First Pickle Rain at (candies)', type: 'number', min: 0, max: 200, step: 5 },
    { key: 'pickleRainNextIncrement', label: 'Next Pickle Rain every +N candies', type: 'number', min: 100, max: 1000, step: 50 },
    { key: 'pickleRainDuration', label: 'Pickle Rain duration (s)', type: 'number', min: 2, max: 15, step: 0.5 },
    { key: 'spawnInterval', label: 'Item spawn interval (s)', type: 'number', min: 0.5, max: 3, step: 0.1 },
    { key: 'lives', label: 'Starting lives', type: 'number', min: 1, max: 10, step: 1 },
    { key: 'veggieChanceBase', label: 'Veggie chance base (0–1)', type: 'number', min: 0, max: 1, step: 0.05 },
    { key: 'veggieChanceMax', label: 'Veggie chance max (0–1)', type: 'number', min: 0, max: 1, step: 0.05 },
    { key: 'veggieChanceScoreScale', label: 'Veggie chance score scale', type: 'number', min: 500, max: 5000, step: 100 },
    { key: 'missedSweetPenalty', label: 'Missed sweet penalty (points)', type: 'number', min: 0, max: 10, step: 1 },
    { key: 'speedSpawnInterval', label: 'Speed upgrade spawn interval (s)', type: 'number', min: 10, max: 60, step: 1 }
];

export const GAME_CONFIG_KEYS = {
    flappy: 'game_config_flappy',
    pinata: 'game_config_pinata',
    cake: 'game_config_bobo'
};

/** Presets: easy, medium, hard — applied per game to fill variables */
export const FLAPPY_PRESETS = {
    easy: {
        pipeInterval: 2.8,
        pipeWidthBase: 90,
        pipeGapBase: 280,
        speedBase: 240,
        candiesPerPipe: 4,
        bonusPipeInterval: 2,
        bonusPipeCandies: 6,
        medkitGuaranteedPipe: 2,
        medkitSpawnEveryNPipes: 2,
        medkitSpawnChance: 0.6,
        medkitSizeMultiplier: 1.2,
        maxLives: 3,
        gravity: 0.12,
        jump: -5.0
    },
    medium: { ...DEFAULT_FLAPPY_CONFIG },
    hard: {
        pipeInterval: 1.6,
        pipeWidthBase: 110,
        pipeGapBase: 220,
        speedBase: 360,
        candiesPerPipe: 2,
        bonusPipeInterval: 4,
        bonusPipeCandies: 4,
        medkitGuaranteedPipe: 4,
        medkitSpawnEveryNPipes: 4,
        medkitSpawnChance: 0.35,
        medkitSizeMultiplier: 1.0,
        maxLives: 1,
        gravity: 0.18,
        jump: -5.5
    }
};

export const PINATA_PRESETS = {
    easy: {
        spawnInterval: 7,
        medkitSpawnInterval: 12,
        upgradeSpawnInterval: 12,
        maxEnemies: 6,
        easeSeconds: 30,
        hardThreshold: 90,
        earlySpawnInterval: 9,
        comboWindow: 4
    },
    medium: { ...DEFAULT_PINATA_CONFIG },
    hard: {
        spawnInterval: 3.5,
        medkitSpawnInterval: 20,
        upgradeSpawnInterval: 22,
        maxEnemies: 14,
        easeSeconds: 12,
        hardThreshold: 55,
        earlySpawnInterval: 5,
        comboWindow: 2.5
    }
};

export const BOBO_PRESETS = {
    easy: {
        penaltyThreshold: 80,
        pickleRainFirstThreshold: 90,
        pickleRainNextIncrement: 600,
        pickleRainDuration: 4,
        spawnInterval: 1.5,
        lives: 4,
        veggieChanceBase: 0.22,
        veggieChanceMax: 0.3,
        veggieChanceScoreScale: 3000,
        missedSweetPenalty: 1,
        speedSpawnInterval: 20
    },
    medium: { ...DEFAULT_BOBO_CONFIG },
    hard: {
        penaltyThreshold: 55,
        pickleRainFirstThreshold: 60,
        pickleRainNextIncrement: 400,
        pickleRainDuration: 6,
        spawnInterval: 1.0,
        lives: 2,
        veggieChanceBase: 0.38,
        veggieChanceMax: 0.42,
        veggieChanceScoreScale: 2000,
        missedSweetPenalty: 1,
        speedSpawnInterval: 30
    }
};

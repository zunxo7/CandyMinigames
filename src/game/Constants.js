export const CANVAS_WIDTH = 1376;
export const CANVAS_HEIGHT = 768;

/** Cap viewport for game canvas on large screens (e.g. desktop) so layout stays consistent */
export const VIEWPORT_MAX_WIDTH = 1920;
export const VIEWPORT_MAX_HEIGHT = 1080;

export function getViewportSize() {
    const w = typeof window !== 'undefined' ? window.innerWidth : 800;
    const h = typeof window !== 'undefined' ? window.innerHeight : 600;
    return {
        width: Math.max(300, Math.min(w, VIEWPORT_MAX_WIDTH)),
        height: Math.max(200, Math.min(h, VIEWPORT_MAX_HEIGHT))
    };
}
export const GROUND_Y = 265; // User said "floor being at 265 height and then the sky starts". usually this means from bottom or top? 
// "floor like being at 265 height and then the sky starts". 
// If generic platformer, usually Y increases downwards. 
// If height is 265, maybe it means floor is at Y = 768 - 265 = 503?
// Or maybe user means from bottom? I will assume from bottom for now.
export const GROUND_Y_FROM_BOTTOM = 265;
export const GROUND_Y_COORD = CANVAS_HEIGHT - GROUND_Y_FROM_BOTTOM;

// User said "2d scrolling game". Pinata bash sounds like beat em up.
// "a and d to move click to attack". Simple left/right.
// If simple side scroller, Y is fixed or jumping.
// "movement too and all a and d to move". Only A and D mentioned.
// So probably fixed Y, simple 1D linear movement on the ground?
// Or maybe partial depth?
// I'll stick to 1D movement (Left/Right) on the ground line for now.

export const PLAYER_SPEED = 300;
export const ENEMY_SPEED = 100;

export const GRAVITY = 2000;
export const JUMP_FORCE = -850;

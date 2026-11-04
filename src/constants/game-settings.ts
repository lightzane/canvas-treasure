/** Exported image has zoom-level 200% */
export const ZOOM_LEVEL = 2;

/**
 * The tile size is 32x32,
 * but exported with zoom-level 200%
 */
export const TILE_SIZE = 32 * ZOOM_LEVEL;

// aspect ratio = 16:9
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const CANVAS_CENTER = {
  x: CANVAS_WIDTH / 2, // 640
  y: CANVAS_HEIGHT / 2, // 360
};

// To get the size of the camera in Tiled
// divide the size to the zoom-level (i.e. 1280x720 = 640x360)
// The camera in Tiled helps you visualize and easily get the correct
// tiled coordinates to position the camera in canvas when using
// panCameraToTile() — see map-movement.ts

/** Flat px/sec added to the player's own `moveSpeed` while running (holding X, with shoes, somewhere running's allowed) — not a multiplier. */
export const RUN_SPEED_BONUS = 250;

/**
 * Canvas-drawn text can't use the `font-game` CSS class (`ctx.font` is a
 * plain string the Canvas 2D API parses itself, nothing to do with the
 * DOM/CSSOM) — this is the canvas-side equivalent. Keep this in sync with
 * `--font-game` in `src/custom.css` if the game's font ever changes; DOM
 * elements should use the `font-game` class instead of this constant.
 */
export const GAME_FONT_FAMILY = '"Oxanium", system-ui';

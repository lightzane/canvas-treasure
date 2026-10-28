/** Exported image has zoom-level 200% */
export const ZOOM_LEVEL = 2;

/**
 * The tile size is 32x32,
 * but exported with zoom-level 200%
 */
export const TILE_SIZE = 32 * ZOOM_LEVEL;

// aspect ratio = 16:9
// export const CANVAS_WIDTH = 1024;
// export const CANVAS_HEIGHT = 576;
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const CANVAS_CENTER = {
  x: CANVAS_WIDTH / 2,
  y: CANVAS_HEIGHT / 2,
};

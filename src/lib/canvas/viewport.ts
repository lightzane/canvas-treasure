import { CANVAS_CENTER, CANVAS_HEIGHT, CANVAS_WIDTH } from "@/constants/game-settings";
import { GAME_STATE } from "@/features/game-state";
import type { Sprite } from "@/features/sprite";

/**
 * Whether `sprite`'s box currently overlaps what the camera can see. Filter
 * any array of scattered sprites (NPCs, decor, ...) through this before
 * `update()`/`draw()`, so a map with many of them only pays for the handful
 * actually on screen — unlike `drawMapLayer` (crops one oversized image's
 * source rect), this drops whole sprites outright, the right tool when the
 * cost is "too many small sprites" rather than "one image bigger than the
 * screen."
 */
export function isInViewport(sprite: Sprite): boolean {
  const { camera } = GAME_STATE;
  const left = camera.x - CANVAS_CENTER.x;
  const top = camera.y - CANVAS_CENTER.y;
  const box = sprite.boxSize;

  return (
    sprite.position.x + box.width >= left &&
    sprite.position.x <= left + CANVAS_WIDTH &&
    sprite.position.y + box.height >= top &&
    sprite.position.y <= top + CANVAS_HEIGHT
  );
}

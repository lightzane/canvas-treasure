import { CANVAS_CENTER } from "@/constants/game-settings";
import { GAME_STATE } from "@/features/game-state";
import type { Position } from "@/features/sprite";

export function toScreen(worldPos: Position) {
  const { camera } = GAME_STATE;
  return {
    x: worldPos.x - camera.x + CANVAS_CENTER.x,
    y: worldPos.y - camera.y + CANVAS_CENTER.y,
  };
}

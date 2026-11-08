import { CANVAS_CENTER } from "@/constants/game-settings";
import { GAME_STATE } from "@/features/game-state";
import type { Position } from "@/features/sprite";

// Circular import: game-state.ts's own top-level code constructs
// `new PlayerSprite(...)` instances (GAME_STATE.player, .mama, ...), which
// pulls in sprite-player.ts -> sprite.ts -> here -> back to game-state.ts
// for this GAME_STATE import. Safe ONLY because GAME_STATE's value is read
// inside toScreen()'s own body below, not at this file's module scope — by
// the time anything actually calls toScreen(), every module in the cycle
// has finished loading. Reading `GAME_STATE.camera` in a top-level const
// here instead would break: this file evaluates while game-state.ts is
// still mid-way through its own import list, before GAME_STATE is assigned.
export function toScreen(worldPos: Position) {
  const { camera } = GAME_STATE;
  return {
    x: worldPos.x - camera.x + CANVAS_CENTER.x,
    y: worldPos.y - camera.y + CANVAS_CENTER.y,
  };
}

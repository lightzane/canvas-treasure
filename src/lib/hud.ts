import { GAME_STATE } from "@/features/game-state";

/**
 * Shows/hides the bag-icon HUD button. Scene-agnostic — safe to call from
 * any scene file, at any time (a trigger-zone handler, a dialogue effect,
 * ...), not just the scene that happens to be active right now. Routes
 * through `GAME_STATE.emit`, which `GameEngine` keeps correctly pointed at
 * the live React listener every single tick — see its own doc comment in
 * `game-state.ts` for why that matters (a captured reference grabbed too
 * early, e.g. inside a scene's `enter()`, can be stale forever).
 *
 * @example setBagIconVisible(true); // e.g. once the player has something worth checking the bag for
 */
export function hudSetBagIconVisible(visible: boolean) {
  GAME_STATE.emit({ type: "hud:bag-icon.visible", visible });
}

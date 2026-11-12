import { GAME_STATE } from "@/features/game-state";
import { DIALOGUE } from "@/lib/canvas/dialogue";
import { hudSetBagIconVisible } from "@/lib/hud";

/**
 * Call as the first thing a scripted in-scene sequence does — locks
 * movement, hides the bag icon, and clears any dialogue box/portrait left
 * over from whatever the player was just doing, so the cutscene starts
 * from a clean slate regardless of what came before it. Scene-agnostic:
 * doesn't touch music/ambience or anything scene-specific (e.g. shine
 * handles), unlike a scene's own `exitMap()`/`exitZone()`, which is a
 * different concern (leaving the scene entirely) and stays local to each
 * scene file.
 *
 * Called from a `DIALOGUE.effect(...)` with no delay (or one immediately
 * followed by another queued line), movement can still slip through for a
 * frame — give it a tiny non-zero delay instead so the lock actually bites.
 *
 * @example
 * DIALOGUE.effect(() => {
 *   beginCutscene();
 *   walk(huazelei, [[101.5, 74]]);
 * }, 0.00001);
 */
export function beginCutscene() {
  hudSetBagIconVisible(false);
  GAME_STATE.movementLocked = true;
  DIALOGUE.hideBox();
  DIALOGUE.clearPortrait();
}

/**
 * Sets `DIALOGUE.onComplete` — `cb` if given, otherwise just restores the
 * bag icon `beginCutscene` hid. Deliberately doesn't also reset
 * `GAME_STATE.movementLocked` — `dialogue.ts`'s own `pullPending()` already
 * does that unconditionally, right before calling `onComplete`, specifically
 * so `onComplete` is free to re-lock for its own purposes without fighting
 * that. Adding it here too would just be a second place that looks
 * load-bearing but isn't.
 *
 * @example
 * DIALOGUE.effect(beginCutscene, 0.00001);
 * DIALOGUE.queue(`NPC: ...`);
 * endCutscene(() => spawnNextThing());
 */
export function endCutscene(cb?: () => void) {
  DIALOGUE.onComplete = cb ?? (() => hudSetBagIconVisible(true));
}

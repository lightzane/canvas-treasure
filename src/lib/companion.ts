import { GAME_STATE } from "@/features/game-state";
import type { Interactable } from "@/features/interact";
import type { Sprite } from "@/features/sprite";
import type { PlayerSprite } from "@/features/sprite-player";
import { followSprite, type FollowOptions } from "@/lib/follow-sprite";
import { spawnCompanion } from "@/lib/npc-spawn";

export interface CompanionOptions extends FollowOptions {
  /** Who this companion follows — almost always the player. @default GAME_STATE.player */
  target?: Sprite;
}

/**
 * Bundles the two halves of "an NPC that spawns alongside the player and
 * then follows them" — spawning (`spawnCompanion`) and following
 * (`followSprite`) — bound once to a single companion/options pair,
 * factory style (same idea as `createNpcSpawner`).
 *
 * @example
 * const jpCompanion = createCompanion(GAME_STATE.jp, { followDistance: 1 });
 * // in enter(), wherever the player's own spawn tile is decided:
 * if (isQuestResolved(questMain)) jpCompanion.spawn(jpSpawnLocation, interactables);
 * // in update(dt), every frame:
 * jpCompanion.follow(dt, isQuestResolved(questMain));
 */
export function createCompanion(companion: PlayerSprite, options: CompanionOptions = {}) {
  const { target = GAME_STATE.player, ...followOptions } = options;
  // Edge-detects `active` turning off, same idea as map-movement.ts's own
  // `wasLocked` — forces idle once, right as follow stops, not every frame
  // it stays stopped (which would fight a scripted walk() taking over right
  // after, stomping its "walk" back to idle next frame, forever).
  let wasActive = false;

  return {
    /** Places `companion` at `tile`, added to obstacles and `interactables` — see `spawnCompanion`. */
    spawn(tile: [number, number], interactables: Interactable[]) {
      spawnCompanion(companion, tile, interactables);
    },

    /**
     * `followSprite`, but only `while active` — a no-op otherwise, EXCEPT
     * the one frame `active` first goes false: without this, `companion`
     * stays stuck replaying whatever animation frame it was mid-stride on
     * forever, since nothing else ever changes its play-state once
     * `followSprite` stops driving it.
     */
    follow(dt: number, active: boolean) {
      if (active) followSprite(target, companion, dt, followOptions);
      else if (wasActive) companion.play("idle");
      wasActive = active;
    },
  };
}

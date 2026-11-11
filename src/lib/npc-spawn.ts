import { GAME_STATE } from "@/features/game-state";
import type { Interactable } from "@/features/interact";
import { removeInteractable } from "@/features/interact";
import type { PlayerSprite } from "@/features/sprite-player";
import { addOnce, remove } from "@/lib/array";
import { placeAtTile } from "@/lib/positioning";

/**
 * Binds `respawnNPC`/`despawnNPC` to one scene's own `npcs`/`interactables`
 * arrays — each scene declares these as its own module-level constants, a
 * different array identity per scene — so this factory is called once per
 * scene file rather than the functions taking those arrays as a parameter
 * on every single call. `GAME_STATE.obstacles`, also touched below, is the
 * one exception: unlike `npcs`/`interactables`, it's shared by every scene
 * (see its own doc comment in game-state.ts for the full reasoning).
 *
 * @example
 * const { respawnNPC, despawnNPC } = createNpcSpawner(NPCS, INTERACTABLES);
 */
export function createNpcSpawner(npcs: PlayerSprite[], interactables: Interactable[]) {
  return {
    /**
     * Re-adds `npc` to this scene's world (optionally moving it first) —
     * `npcs` and `GAME_STATE.obstacles` only, never `interactables`: an
     * `Interactable` entry can carry its own config (label, probeDistance,
     * ...), so making it interactable again is a deliberate, separate call
     * at each site, same as before this was extracted.
     */
    respawnNPC(npc: PlayerSprite, tile?: [number, number]) {
      if (tile) placeAtTile({ sprite: npc, tile });
      addOnce(npcs, npc);
      // Mutates the array GAME_STATE.obstacles currently points to, rather
      // than reassigning it — correct whether this runs at module scope
      // (before any enter() has reset it yet) or mid-session (after one
      // already has) — see GAME_STATE.obstacles' own doc comment for the
      // full reasoning.
      addOnce(GAME_STATE.obstacles, npc);
    },

    /** Drops `npc` out of this scene entirely — world, obstacles, and interactable, all at once. */
    despawnNPC(npc: PlayerSprite) {
      remove(npcs, npc);
      remove(GAME_STATE.obstacles, npc);
      removeInteractable(interactables, npc);
    },
  };
}

/**
 * Places `companion` at `tile` and marks it present in this scene: added
 * to `GAME_STATE.obstacles` (can't walk through it) and to `interactables`
 * (can be talked to). Unlike `respawnNPC`, works without a
 * `createNpcSpawner` instance — not every scene has one set up — so call
 * this from any scene's own `enter()`, wherever the player's own spawn
 * tile is decided, to place a permanent companion (e.g. jp) right where
 * the player enters.
 */
export function spawnCompanion(
  companion: PlayerSprite,
  tile: [number, number],
  interactables: Interactable[],
): void {
  placeAtTile({ sprite: companion, tile });
  addOnce(GAME_STATE.obstacles, companion);
  addOnce(interactables, companion);
}

import { GAME_STATE } from "@/features/game-state";
import type { Interactable } from "@/features/interact";
import { removeInteractable } from "@/features/interact";
import type { PlayerSprite } from "@/features/sprite-player";
import { addOnce, remove } from "@/lib/array";
import { placeAtTile } from "@/lib/positioning";

/**
 * Binds `respawnNPC`/`despawnNPC` to one scene's own `npcs`/`interactables`
 * arrays — each scene declares these as its own module-level constants
 * (different identities per scene, unlike `GAME_STATE.obstacles`, which
 * really is the same array everywhere), so this factory is called once per
 * scene file rather than the functions taking those arrays as a parameter
 * on every single call.
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

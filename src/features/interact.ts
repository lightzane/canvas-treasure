import { isColliding, type Rect } from "@/features/collisions";
import type { Direction } from "@/features/controller";
import { GAME_STATE } from "@/features/game-state";
import type { Sprite } from "@/features/sprite";
import { PlayerSprite } from "@/features/sprite-player";

const DEFAULT_PROBE_DISTANCE = 16; // px — how far ahead of the player to reach, unless an interactable sets its own

// prettier-ignore
const OPPOSITE_DIRECTION: Record<Direction, Direction> = { w: "s", s: "w", a: "d", d: "a" };

export interface Interactable {
  sprite: Sprite;
  /** How far ahead of the player this one can be reached from, in px — e.g. wider for something sitting across a table. @default 16 */
  probeDistance?: number;
  /** Turn to face the player once interacted with. No-op for a plain `Sprite` (only a `PlayerSprite` — an NPC — can face anything). @default true */
  facePlayer?: boolean;
}

interface FacingProbeOptions {
  box: Rect;
  facing: Direction;
  distance: number;
}

/** The small probe rect immediately past `facing`'s edge of `box`, extending `distance` further outward. */
function getFacingProbe({ box, facing, distance }: FacingProbeOptions): Rect {
  const { position, width, height } = box;

  // prettier-ignore
  switch (facing) {
    case "w": return { position: { x: position.x, y: position.y - distance }, width, height: distance };
    case "s": return { position: { x: position.x, y: position.y + height }, width, height: distance };
    case "a": return { position: { x: position.x - distance, y: position.y }, width: distance, height };
    case "d": return { position: { x: position.x + width, y: position.y }, width: distance, height };
  }
}

/**
 * Finds whichever of `GAME_STATE.interactables` the player is directly
 * facing — a small probe just ahead of the player's own collision box, in
 * whichever direction *they're* facing, reaching out each interactable's
 * own `probeDistance` (so e.g. a parcel sitting across a table can still be
 * reached without widening everyone else's range). In a cluster (a queue, a
 * crowd), this naturally picks at most one — whoever's actually standing in
 * that reach — instead of needing a tie-breaker between several "nearby"
 * candidates.
 *
 * By default, the match turns to face the player back (set `facePlayer:
 * false` on its `Interactable` entry to opt out) — only meaningful for an
 * NPC (`PlayerSprite`); a plain `Sprite` like an item has nothing to turn,
 * so this silently no-ops for those.
 *
 * Only call this behind an edge-triggered check (`GAME_STATE.keys.justPressed`)
 * — it's a plain array scan, fine on a keypress, not meant to run every frame.
 *
 * @example
 * if (GAME_STATE.keys.justPressed.z) {
 *   const target = findFacedTarget(GAME_STATE.player);
 *   if (target === GAME_STATE.mama) DIALOGUE.show("...");
 * }
 */
export function findFacedTarget(player: {
  collisionBox: Rect;
  facing: Direction;
}): Sprite | undefined {
  const match = GAME_STATE.interactables.find((interactable) => {
    const distance = interactable.probeDistance ?? DEFAULT_PROBE_DISTANCE;
    const probe = getFacingProbe({ box: player.collisionBox, facing: player.facing, distance });
    return isColliding(probe, interactable.sprite.collisionBox);
  });

  if (!match) return undefined;

  if ((match.facePlayer ?? true) && match.sprite instanceof PlayerSprite) {
    match.sprite.face(OPPOSITE_DIRECTION[player.facing]);
  }

  return match.sprite;
}

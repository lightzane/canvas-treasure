import { TILE_SIZE } from "@/constants/game-settings";
import type { Direction } from "@/features/controller";
import type { Position } from "@/features/sprite";
import type { PlayerSprite } from "@/features/sprite-player";
import { getMoveDelta } from "@/lib/map-movement";
import { getPosSpawnTile } from "@/lib/positioning";
import gsap from "gsap";

/**
 * One leg of a walk — either an absolute `[col, row]` tile (Tiled's own
 * coordinates), or `steps` tiles in `direction`, relative to wherever this
 * leg *starts* (the NPC's current position for the first leg in a path, or
 * the previous leg's end for a later one). Use the relative form for
 * anything you don't have a tile coordinate for — a random wander, "back
 * away a few steps," an NPC whose starting spot varies — the absolute form
 * for a specific, known destination (a doorway, a mark on the map).
 */
export type WalkLeg = [number, number] | { direction: Direction; steps: number };

export interface WalkOptions {
  /** World position the tile grid is measured from, same as `placeAtTile`'s `origin`. Only affects absolute-tile legs. @default {x:0,y:0} */
  origin?: Position;
  /** Switches `npc` to its "walk" play-state for the walk, back to "idle" on arrival. Only pass this for NPCs that actually declare a `walk` animation — one that doesn't will throw. @default false */
  animated?: boolean;
  /** Runs once the NPC has reached the final tile. */
  onComplete?: () => void;
}

export interface WalkHandle {
  /** The underlying tween — reach for this if you need gsap-specific controls (`.pause()`, `.progress()`, ...). */
  timeline: gsap.core.Timeline;
  /**
   * Stops the walk wherever `npc` currently is and resets it to idle (if
   * `animated`). Use this to interrupt a walk early — `timeline.kill()`
   * alone leaves the NPC stuck mid-"walk" forever, since gsap deliberately
   * never fires `onComplete` on a killed tween (killing isn't completing).
   */
  stop(): void;
}

function directionTo(dx: number, dy: number): Direction {
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "d" : "a") : dy > 0 ? "s" : "w";
}

/** A single leg is `[col, row]` (two numbers) or a `{direction, steps}` object — a *list* of legs is an array whose first element is itself one of those, never a bare number. */
function isSingleLeg(path: WalkLeg | WalkLeg[]): path is WalkLeg {
  if (!Array.isArray(path)) return true; // {direction, steps} is always exactly one leg
  return typeof path[0] === "number"; // [col, row] — a list of legs would hold an array/object here instead
}

/** World position `leg` resolves to, given `from` — the world position this leg starts at. */
function legTarget(leg: WalkLeg, from: Position, npc: PlayerSprite, origin: Position): Position {
  if (Array.isArray(leg)) return getPosSpawnTile({ tile: leg, spriteSize: npc.size, origin });

  const { dx, dy } = getMoveDelta(leg.direction, leg.steps * TILE_SIZE);
  return { x: from.x + dx, y: from.y + dy };
}

/**
 * Walks `npc` in a straight line through `path` — one leg, or several
 * chained in order — facing the direction of travel for each leg
 * automatically. The scripted-movement counterpart to `placeAtTile` (which
 * teleports instantly); speed comes from `npc.moveSpeed`, so it matches
 * however fast that character normally walks.
 *
 * No pathfinding/obstacle-avoidance — each leg is a direct line. For an
 * absolute leg, pick a tile you already know has a clear line to it (same
 * assumption every other scripted placement in this codebase makes); a
 * relative leg has the same assumption about the `steps` you give it.
 *
 * @example
 * walk(npc, [23, 4]); // to a known tile
 * walk(npc, { direction: "s", steps: 3 }); // 3 tiles south of wherever npc is now
 * walk(npc, [{ direction: "s", steps: 3 }, { direction: "d", steps: 2 }]); // chained, no tile coords at all
 * walk(npc, [[23, 4], { direction: "s", steps: 3 }]); // mixed: to a tile, then on from there
 *
 * Returns a `WalkHandle` — call `.stop()` if a scene transition or dialogue
 * interrupts the walk partway through, same cleanup pattern as this
 * codebase's other gsap-driven effects.
 */
export function walk(
  npc: PlayerSprite,
  path: WalkLeg | WalkLeg[],
  options: WalkOptions = {},
): WalkHandle {
  const { origin = { x: 0, y: 0 }, animated = false, onComplete } = options;
  const legs: WalkLeg[] = isSingleLeg(path) ? [path] : path;

  const timeline = gsap.timeline({
    onComplete: () => {
      if (animated) npc.play("idle");
      onComplete?.();
    },
  });

  let from: Position = npc.position;
  for (const leg of legs) {
    const target = legTarget(leg, from, npc, origin);
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    const distance = Math.hypot(dx, dy);

    timeline.to(npc.position, {
      x: target.x,
      y: target.y,
      duration: distance / npc.moveSpeed,
      ease: "none", // constant speed, matching normal movement — not an eased cutscene glide
      onStart: () => {
        npc.face(directionTo(dx, dy));
        if (animated) npc.play("walk");
      },
    });

    from = target;
  }

  return {
    timeline,
    stop: () => {
      timeline.kill();
      if (animated) npc.play("idle");
    },
  };
}

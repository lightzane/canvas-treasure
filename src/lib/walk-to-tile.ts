import type { Direction } from "@/features/controller";
import type { Position } from "@/features/sprite";
import type { PlayerSprite } from "@/features/sprite-player";
import { getPosSpawnTile } from "@/lib/positioning";
import gsap from "gsap";

export interface WalkToTileOptions {
  /** World position the tile grid is measured from, same as `placeAtTile`'s `origin`. @default {x:0,y:0} */
  origin?: Position;
  /** Switches `npc` to its "walk" play-state for the walk, back to "idle" on arrival. Only pass this for NPCs that actually declare a `walk` animation — one that doesn't will throw. @default false */
  animated?: boolean;
  /** Runs once the NPC has reached the final tile. */
  onComplete?: () => void;
}

function directionTo(dx: number, dy: number): Direction {
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "d" : "a") : dy > 0 ? "s" : "w";
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

/**
 * Walks `npc` in a straight line to `tile` — or through each tile in order,
 * for a multi-leg path — facing the direction of travel for each leg
 * automatically. The scripted-movement counterpart to `placeAtTile` (which
 * teleports instantly); speed comes from `npc.moveSpeed`, so it matches
 * however fast that character normally walks.
 *
 * No pathfinding/obstacle-avoidance — each leg is a direct line between two
 * points. Pick tiles you already know have a clear line between them, same
 * assumption every other scripted placement in this codebase makes.
 *
 * Returns a `WalkHandle` — call `.stop()` if a scene transition or dialogue
 * interrupts the walk partway through, same cleanup pattern as this
 * codebase's other gsap-driven effects.
 */
export function walkToTile(
  npc: PlayerSprite,
  tile: [number, number] | [number, number][],
  options: WalkToTileOptions = {},
): WalkHandle {
  const { origin = { x: 0, y: 0 }, animated = false, onComplete } = options;
  const tiles: [number, number][] = Array.isArray(tile[0])
    ? (tile as [number, number][])
    : [tile as [number, number]];

  const timeline = gsap.timeline({
    onComplete: () => {
      if (animated) npc.play("idle");
      onComplete?.();
    },
  });

  let from: Position = npc.position;
  for (const t of tiles) {
    const target = getPosSpawnTile({ tile: t, spriteSize: npc.size, origin });
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

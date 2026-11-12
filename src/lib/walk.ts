import type { Direction } from "@/features/controller";
import { Sprite, type Position } from "@/features/sprite";
import type { PlayerSprite } from "@/features/sprite-player";
import { isSingleLeg, legTarget, type WalkLeg } from "@/lib/walk-math";
import gsap from "gsap";

export interface WalkOptions {
  /** World position the tile grid is measured from, same as `placeAtTile`'s `origin`. Only affects absolute-tile legs. @default {x:0,y:0} */
  origin?: Position;
  /** Switches `npc` to its "walk" play-state for the walk, back to "idle" on arrival. Every real call site animates — pass `false` only for an NPC that doesn't declare a `walk` animation (one that does, with this left on, would throw). @default true */
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

/**
 * Turns `npc` to face toward `target` right now — another sprite, or a raw
 * world position — same "whichever axis has the bigger gap wins" math
 * `walk()` already uses to face the direction of travel. One-shot: reads
 * `target`'s position once and doesn't track it moving afterward — call it
 * again if `target` relocates. For "face whoever just interacted with you",
 * `InteractableConfig.facePlayer` already does this automatically; reach for
 * this instead when you need the same result from a scripted cutscene,
 * outside of a player-driven interact.
 *
 * @example
 * faceDirection(npcElderManHeart, GAME_STATE.player);
 */
export function faceDirection(npc: PlayerSprite, target: Sprite | Position) {
  const { x, y } = target instanceof Sprite ? target.position : target;
  npc.face(directionTo(x - npc.position.x, y - npc.position.y));
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
  const { origin = { x: 0, y: 0 }, animated = true, onComplete } = options;
  const legs: WalkLeg[] = isSingleLeg(path) ? [path] : path;

  const timeline = gsap.timeline({
    onComplete: () => {
      if (animated) npc.play("idle");
      onComplete?.();
    },
  });

  let from: Position = npc.position;
  for (const leg of legs) {
    const target = legTarget({ leg, from, spriteSize: npc.size, origin });
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    const distance = Math.hypot(dx, dy);
    // A real copy, not an alias — `from` IS `npc.position` for the first
    // leg, and onUpdate below writes to npc.position every tick. Aliasing
    // start to the same object it's writing into would make each tick's
    // "starting point" silently drift to the previous tick's result,
    // compounding the delta instead of staying relative to the true start.
    const start = { x: from.x, y: from.y };

    // Tweens a plain 0->1 progress value, not npc.position directly — if
    // npc.position gets reassigned to a new object mid-walk (e.g.
    // attemptMove's own `sprite.position = {...}`, not a mutation), a direct
    // `timeline.to(npc.position, {...})` would keep animating that old,
    // now-orphaned object forever: gsap still reaches its own onComplete
    // right on schedule, but nothing ever visibly moves again. onUpdate
    // re-reads npc.position fresh every tick instead, so it keeps writing
    // to whichever object is actually live.
    const progress = { t: 0 };
    timeline.to(progress, {
      t: 1,
      duration: distance / npc.moveSpeed,
      ease: "none", // constant speed, matching normal movement — not an eased cutscene glide
      onStart: () => {
        npc.face(directionTo(dx, dy));
        if (animated) npc.play("walk");
      },
      onUpdate: () => {
        npc.position.x = start.x + dx * progress.t;
        npc.position.y = start.y + dy * progress.t;
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

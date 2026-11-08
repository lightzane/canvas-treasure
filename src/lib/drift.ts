import type { Direction } from "@/features/controller";
import type { Position, Sprite } from "@/features/sprite";
import { getPosSpawnTile } from "@/lib/positioning";
import { getMoveDelta } from "@/lib/walk-math";
import gsap from "gsap";

/**
 * Where a drift should land — an absolute Tiled `[col, row]` tile, or a
 * direction + px distance relative to wherever the sprite currently is.
 * Same two-form idea as `walk()`'s own `WalkLeg`, except the relative form
 * is raw pixels, not whole tiles — this is loose decorative movement, not
 * tile-locked.
 */
export type DriftTarget = [number, number] | { direction: Direction; distance: number };

export interface DriftOptions {
  /** Where to land. See `DriftTarget`. */
  to: DriftTarget;
  /** World position the tile grid is measured from, same as `placeAtTile`'s `origin`. Only affects the absolute-tile form. @default {x:0,y:0} */
  origin?: Position;
  /** Total seconds across the whole drift, start to landing. @default distance / 250, floored at 0.6 */
  duration?: number;
  /** How many random intermediate stops before the exact landing point. @default 4 */
  waypoints?: number;
  /** Max random perpendicular-to-travel offset at the roughest point, in px — tapers toward 0 as it nears the target. @default 60 */
  wobble?: number;
  /** Seconds to wait before starting. */
  delay?: number;
  /** Runs once it's landed exactly on the target. */
  onComplete?: () => void;
}

export interface DriftHandle {
  /** Cancels the drift — kills it (whether still delayed or mid-flight) and snaps straight to the target. */
  stop: () => void;
}

function resolveTarget(sprite: Sprite, to: DriftTarget, origin: Position): Position {
  if (Array.isArray(to)) return getPosSpawnTile({ tile: to, spriteSize: sprite.size, origin });

  const { dx, dy } = getMoveDelta(to.direction, to.distance);
  return { x: sprite.position.x + dx, y: sprite.position.y + dy };
}

/**
 * Pushes `sprite` from wherever it currently is toward `options.to`,
 * wandering through a few random off-line stops along the way instead of a
 * straight line — a "caught by the wind" look with no real path-following
 * involved. The randomness only ever lands *between* the start and the
 * target; the very last stop is always the exact target itself, so however
 * much it wanders, it's guaranteed to end up exactly where you asked.
 * Re-rolls new random waypoints every call, so repeated calls toward the
 * same target won't look identical.
 *
 * Only moves `sprite.position` — if it has its own frame animation (e.g.
 * `paperWind`'s in-place rotation), that keeps running independently via its
 * own `update(dt)`, same as always.
 *
 * @example
 * drift(paperWind, { to: [58, 40], onComplete: () => remove(DECORS, paperWind) }); // to a known tile
 * @example
 * drift(paperWind, { to: { direction: "s", distance: 400 } }); // 400px south of wherever it is now
 */
export function drift(sprite: Sprite, options: DriftOptions): DriftHandle {
  const {
    to,
    origin = { x: 0, y: 0 },
    waypoints = 4,
    wobble = 60,
    delay = 0,
    onComplete,
  } = options;

  const start: Position = { x: sprite.position.x, y: sprite.position.y };
  const target = resolveTarget(sprite, to, origin);
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  const distance = Math.hypot(dx, dy);
  const duration = options.duration ?? Math.max(0.6, distance / 250);

  // Travel is dominantly along whichever axis has the bigger delta — the
  // wobble happens on the other one.
  const perpAxis: "x" | "y" = Math.abs(dx) >= Math.abs(dy) ? "y" : "x";

  const stops: Position[] = [];
  for (let i = 1; i <= waypoints; i++) {
    const t = i / (waypoints + 1);
    const base: Position = { x: start.x + dx * t, y: start.y + dy * t };
    const jitter = (Math.random() * 2 - 1) * wobble * (1 - t); // tapers as it nears the target
    stops.push({ ...base, [perpAxis]: base[perpAxis] + jitter });
  }
  stops.push(target); // always exact — however it wandered on the way, it lands here

  let pending: gsap.core.Tween | null = null;
  let tl: gsap.core.Timeline | null = null;

  const run = () => {
    tl = gsap.timeline({
      onComplete: () => {
        sprite.position.x = target.x; // guards against float drift from the chain of tweens
        sprite.position.y = target.y;
        onComplete?.();
      },
    });
    for (const stop of stops) {
      tl.to(sprite.position, {
        x: stop.x,
        y: stop.y,
        duration: duration / stops.length,
        ease: "sine.inOut",
      });
    }
  };

  if (delay > 0) pending = gsap.delayedCall(delay, run);
  else run();

  return {
    stop: () => {
      pending?.kill();
      tl?.kill();
      sprite.position.x = target.x;
      sprite.position.y = target.y;
    },
  };
}

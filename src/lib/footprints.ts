import type { Direction } from "@/features/controller";
import type { Position } from "@/features/sprite";
import type { PlayerSprite } from "@/features/sprite-player";
import { toScreen } from "@/lib/canvas/screen";

interface Footprint {
  position: Position; // world
  facing: Direction;
  spawnedAt: number; // seconds, this module's own running clock
}

/**
 * Walk-cycle frame indices where a foot plants. The walk and run clips share
 * the same 8-frame cycle at the same fps (only the distance covered per
 * frame differs), so these indices apply to either — running's footsteps
 * land farther apart than walking's for free, with no extra logic here.
 * Tune to taste once the actual sprite sheets are checked frame-by-frame.
 */
const FOOT_DOWN_FRAMES = [0, 2, 4, 6];

const WIDTH = 8;
const HEIGHT = 13;
/** Perpendicular-to-travel distance from the center line, in px — how far left/right of the path each print lands. */
const SIDE_OFFSET = 5;
const FADE_IN = 0.15;
/** Seconds fully visible before fading. */
const HOLD = 2;
const FADE_OUT = 0.8;
const LIFESPAN = FADE_IN + HOLD + FADE_OUT;

// Orients the placeholder oval's long axis along the direction of travel —
// cosmetically a no-op right now (a symmetric ellipse looks the same at 0/π
// or π/2/3π/2), but keeps this correct for whenever a real footprint graphic
// (asymmetric, toe vs. heel) replaces the placeholder.
const FACING_ROTATION: Record<Direction, number> = {
  s: 0,
  w: Math.PI,
  a: Math.PI / 2,
  d: (Math.PI * 3) / 2,
};

interface TrailState {
  lastFrameVal: number;
  lastSide: 1 | -1;
}

let footprints: Footprint[] = [];
let clock = 0;

// Keyed per-sprite — not a couple of shared module-level variables — so the
// player and any number of NPCs can each leave their own trail (e.g. an NPC
// scripted-walked across sand via walk()) without fighting over whose turn
// it is for left/right or stomping each other's last-seen frame. Same
// reasoning `walk.ts` already follows by keeping no shared state at all;
// unlike a GSAP timeline, this needs to persist *something* between frames,
// so a WeakMap keyed by the sprite itself is the equivalent.
const trailState = new WeakMap<PlayerSprite, TrailState>();

function getTrailState(sprite: PlayerSprite): TrailState {
  let state = trailState.get(sprite);
  if (!state) {
    state = { lastFrameVal: -1, lastSide: 1 };
    trailState.set(sprite, state);
  }
  return state;
}

function spawn(sprite: PlayerSprite, state: TrailState) {
  state.lastSide *= -1;

  // Perpendicular to the direction of travel: facing a/d (horizontal
  // movement) offsets vertically; facing s/w (vertical movement) offsets
  // horizontally.
  const perpendicular =
    sprite.facing === "a" || sprite.facing === "d"
      ? { x: 0, y: SIDE_OFFSET * state.lastSide }
      : { x: SIDE_OFFSET * state.lastSide, y: 0 };

  footprints.push({
    position: {
      x: sprite.position.x + sprite.boxSize.width / 2 + perpendicular.x,
      y: sprite.position.y + sprite.boxSize.height + perpendicular.y,
    },
    facing: sprite.facing,
    spawnedAt: clock,
  });
}

/**
 * Call exactly once per frame, unconditionally, from a scene's own
 * `update()` — ages out expired footprints. Separate from `trackFootstep`
 * below (which can run any number of times per frame, once per sprite)
 * so the shared aging clock only ever advances by `dt` once per frame
 * no matter how many sprites are being tracked.
 */
export function updateFootprints(dt: number) {
  clock += dt;
  footprints = footprints.filter((f) => clock - f.spawnedAt < LIFESPAN);
}

/**
 * Call once per frame per sprite that might be leaving footprints — the
 * player, and/or any NPC currently being walked via `walk()`. Spawns a new
 * footstep under `sprite` each time its current animation crosses one of
 * `FOOT_DOWN_FRAMES`, but only while `active` (e.g. that sprite is standing
 * on "soft" ground — see the `sand` trigger-zone counter in `overworld.ts`).
 * Safe to call for several different sprites the same frame — each tracks
 * its own frame-crossing/alternation state independently (see `trailState`).
 *
 * Idle has only one frame (`frames.max === 1`), so `frames.val` never
 * changes while standing still — nothing spawns then, with no separate
 * "is moving" check needed.
 */
export function trackFootstep(sprite: PlayerSprite, active: boolean) {
  const state = getTrailState(sprite);

  const frameVal = sprite.frames.val;
  const crossed = frameVal !== state.lastFrameVal && FOOT_DOWN_FRAMES.includes(frameVal);
  state.lastFrameVal = frameVal;

  if (active && crossed) spawn(sprite, state);
}

/**
 * Draws every live footprint — a ground-level decal, so call this from a
 * scene's `draw()` *after* the background/ground decor but *before* the
 * player (and any foreground overlay) is drawn, so the player visibly
 * stands on top of its own trail instead of over it.
 *
 * Canvas-drawn rather than a DOM overlay (unlike everything in
 * `src/lib/effects/`) — a ground decal needs to sit between the background
 * and the player within the same canvas, which a DOM element layered above
 * or below the whole `<canvas>` can't do.
 */
export function drawFootprints(ctx: CanvasRenderingContext2D) {
  if (footprints.length === 0) return;

  // Tweak this so that the footprints are drawn near the sprite's feet
  const FOOTPRINT_PLACEMENT_OFFSET = -10;

  // Manually snapshot/restore just the two properties touched here, rather
  // than ctx.save()/restore() — see the same tradeoff in Sprite.drawShadow().
  const prevAlpha = ctx.globalAlpha;
  const prevFillStyle = ctx.fillStyle;
  ctx.fillStyle = "black";

  for (const f of footprints) {
    const age = clock - f.spawnedAt;
    const opacity =
      age < FADE_IN
        ? age / FADE_IN
        : age < FADE_IN + HOLD
          ? 1
          : Math.max(0, 1 - (age - FADE_IN - HOLD) / FADE_OUT);

    const { x, y } = toScreen(f.position);
    ctx.globalAlpha = opacity * 0.25;
    ctx.beginPath();
    ctx.ellipse(
      x,
      y + FOOTPRINT_PLACEMENT_OFFSET,
      WIDTH / 2,
      HEIGHT / 2,
      FACING_ROTATION[f.facing],
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  ctx.globalAlpha = prevAlpha;
  ctx.fillStyle = prevFillStyle;
}

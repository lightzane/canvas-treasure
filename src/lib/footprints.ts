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

let footprints: Footprint[] = [];
let lastFrameVal = -1;
let lastSide: 1 | -1 = 1;
let clock = 0;

function spawn(player: PlayerSprite) {
  lastSide *= -1;

  // Perpendicular to the direction of travel: facing a/d (horizontal
  // movement) offsets vertically; facing s/w (vertical movement) offsets
  // horizontally.
  const perpendicular =
    player.facing === "a" || player.facing === "d"
      ? { x: 0, y: SIDE_OFFSET * lastSide }
      : { x: SIDE_OFFSET * lastSide, y: 0 };

  footprints.push({
    position: {
      x: player.position.x + player.boxSize.width / 2 + perpendicular.x,
      y: player.position.y + player.boxSize.height + perpendicular.y,
    },
    facing: player.facing,
    spawnedAt: clock,
  });
}

/**
 * Call once per frame, unconditionally, from a scene's own `update()` —
 * ages out expired footprints and, while `active` (e.g. the player is
 * standing on "soft" ground — see the `sand` trigger-zone counter in
 * `overworld.ts`), spawns a new one each time `player`'s current animation
 * crosses one of `FOOT_DOWN_FRAMES`.
 *
 * Idle has only one frame (`frames.max === 1`), so `frames.val` never
 * changes while standing still — nothing spawns then, with no separate
 * "is moving" check needed.
 */
export function updateFootprints(dt: number, player: PlayerSprite, active: boolean) {
  clock += dt;
  footprints = footprints.filter((f) => clock - f.spawnedAt < LIFESPAN);

  const frameVal = player.frames.val;
  const crossed = frameVal !== lastFrameVal && FOOT_DOWN_FRAMES.includes(frameVal);
  lastFrameVal = frameVal;

  if (active && crossed) spawn(player);
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
    ctx.ellipse(x, y, WIDTH / 2, HEIGHT / 2, FACING_ROTATION[f.facing], 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = prevAlpha;
  ctx.fillStyle = prevFillStyle;
}

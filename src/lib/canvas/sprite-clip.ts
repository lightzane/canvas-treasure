import type { Sprite } from "@/features/sprite";
import { toScreen } from "@/lib/canvas/screen";

export interface SpriteClip {
  /** Only draw this many px of the sprite's own height — the rest is cropped away. */
  height: number;
  /** Which edge the visible slice is measured from — "top" keeps the head and crops the legs away (e.g. hidden behind a tall chair back); "bottom" keeps the legs and crops the head away (e.g. hidden behind a table edge). @default "top" */
  anchor?: "top" | "bottom";
}

/**
 * Draws `sprite` cropped to just the top or bottom `clip.height` px — e.g.
 * for an NPC drawn in a separate "above the foreground" pass, so its lower
 * body stays visually hidden behind a chair/table that's part of the
 * foreground layer, instead of drawing fully on top of it. Call this
 * INSTEAD of `sprite.draw(ctx)` for a frame you want clipped, not in
 * addition to it.
 *
 * Lives here rather than as a `Sprite`/`draw()` option on purpose — this is
 * a rare, scene-specific need, not something most sprites ever use, so it
 * stays out of the class entirely rather than growing it for everyone.
 * Reimplements just enough of `draw()`'s own math (frame cropping, scale,
 * opacity, bounceOffset) against `Sprite`'s existing public fields/getters —
 * does NOT draw `sprite`'s shadow (`shadow: true`), since every use this
 * was built for is an NPC that's sitting/occluded anyway; add that back
 * here too if that stops being true.
 *
 * @example
 * // teashop.ts — an "NPCs above the foreground" array, drawn after the
 * // foreground layer, so this NPC's own legs don't paint over the table:
 * drawSpriteClipped(ctx, npcIroh, { height: 48 });
 */
export function drawSpriteClipped(ctx: CanvasRenderingContext2D, sprite: Sprite, clip: SpriteClip) {
  if (!sprite.image) return;

  const { x, y } = toScreen(sprite.position);
  const offset = sprite.drawOffset;
  const render = sprite.renderSize;

  const sx = sprite.frames.val * sprite.width;

  const clipFromBottom = clip.anchor === "bottom";
  const sy = clipFromBottom ? sprite.height - clip.height : 0;
  const destHeight = clip.height * sprite.scale;
  // "bottom" keeps the slice pinned to where the sprite's own bottom edge
  // already draws — only "top" (the default) needs no extra y shift.
  const destY =
    y + offset.y + sprite.bounceOffset + (clipFromBottom ? render.height - destHeight : 0);

  ctx.globalAlpha = sprite.opacity;
  ctx.drawImage(
    sprite.image,
    // (source) crop here — always the real pixel size, unaffected by scale
    sx, // starts at 0
    sy,
    sprite.width,
    clip.height,
    // (destination) paint here — scaled
    x + offset.x,
    destY,
    render.width,
    destHeight,
  );
}

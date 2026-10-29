import { CANVAS_CENTER, CANVAS_HEIGHT, CANVAS_WIDTH } from "@/constants/game-settings";
import { GAME_STATE } from "@/features/game-state";
import type { Sprite } from "@/features/sprite";
import { toScreen } from "@/lib/canvas/screen";

/** Pre-decoded bitmap for each sprite `prepareViewportClamped()` has warmed up. `WeakMap` so nothing here keeps a sprite alive past its own lifetime. */
const bitmaps = new WeakMap<Sprite, ImageBitmap>();

/**
 * Decodes `sprites`' images once, up front, into `ImageBitmap`s that
 * `drawViewportClamped` then draws from instead of the raw `<img>` element.
 *
 * A map layer like overworld's background is large enough (8960x6400, ~229MB
 * once decoded) that Chrome's image cache won't keep it resident alongside
 * its same-sized foreground layer — a captured performance trace showed it
 * evicting and resynchronously re-decoding whichever one it needed next,
 * ~400ms of blocked main thread, recurring roughly every half-second during
 * normal play (not GC, not draw/composite cost — a plain PNG decode). An
 * `ImageBitmap` we hold a live reference to isn't subject to that
 * evict-and-redecode cycle, so the (still real, ~400ms) cost happens once
 * here instead of recurring. Call this as part of a scene's `ready`, after
 * its own `preload()` has resolved — `createImageBitmap` needs the source
 * `<img>` to have actually finished loading first.
 */
export async function prepareViewportClamped(sprites: Sprite[]): Promise<void> {
  await Promise.all(
    sprites.map(async (sprite) => {
      bitmaps.set(sprite, await createImageBitmap(sprite.image));
    }),
  );
}

/**
 * Draws `sprite`, clamping the source rect to whatever the camera can
 * currently see, instead of blitting the whole source image every frame. A
 * map like overworld's is ~57 megapixels on disk — the canvas is only ~0.9
 * megapixels — so an unclamped `sprite.draw()` wastes ~60x the pixels needed
 * per frame. Use this for any map-sized layer sprite (background/
 * foreground), ideally warmed first with `prepareViewportClamped()` —
 * regular (small, on-screen-sized) sprites should keep using `sprite.draw()`
 * directly — clamping a region that's already smaller than the screen gains
 * nothing.
 */
export function drawViewportClamped(ctx: CanvasRenderingContext2D, sprite: Sprite) {
  const { camera } = GAME_STATE;

  // World-space rect the camera can currently see, translated into this
  // sprite's own source-pixel space (undoing its position + scale).
  const sx = (camera.x - CANVAS_CENTER.x - sprite.position.x) / sprite.scale;
  const sy = (camera.y - CANVAS_CENTER.y - sprite.position.y) / sprite.scale;
  const sWidth = CANVAS_WIDTH / sprite.scale;
  const sHeight = CANVAS_HEIGHT / sprite.scale;

  // Clamp to the image's actual bounds — a negative/out-of-range source rect
  // throws in drawImage, and the camera can sit near a map edge.
  const clampedSx = Math.max(0, sx);
  const clampedSy = Math.max(0, sy);
  const clampedSWidth = Math.min(sWidth - (clampedSx - sx), sprite.width - clampedSx);
  const clampedSHeight = Math.min(sHeight - (clampedSy - sy), sprite.height - clampedSy);

  if (clampedSWidth <= 0 || clampedSHeight <= 0) return; // camera sees none of this layer at all

  const origin = toScreen(sprite.position);
  const dx = origin.x + clampedSx * sprite.scale;
  const dy = origin.y + clampedSy * sprite.scale;

  ctx.drawImage(
    bitmaps.get(sprite) ?? sprite.image,
    clampedSx,
    clampedSy,
    clampedSWidth,
    clampedSHeight,
    dx,
    dy,
    clampedSWidth * sprite.scale,
    clampedSHeight * sprite.scale,
  );
}

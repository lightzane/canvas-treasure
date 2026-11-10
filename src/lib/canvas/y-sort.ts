import type { Sprite } from "@/features/sprite";

/**
 * Depth key: a sprite's feet (bottom edge of its box, plus its own
 * `feetOffset` correction), not its top — two sprites with different
 * heights still sort correctly by how far "down" they stand.
 */
function feetY(sprite: Sprite) {
  return sprite.position.y + sprite.boxSize.height + sprite.feetOffset;
}

/**
 * Draws `sprites` back-to-front by feet position, so whoever's lower on
 * screen (closer to camera) draws on top of whoever's higher — standard
 * top-down "Y-sorting". Reuse this any time two sprites can walk in front of
 * or behind each other (the player vs. an NPC, two NPCs, ...); a fixed draw
 * order only looks right from whichever side you happened to test.
 */
export function drawYSorted(ctx: CanvasRenderingContext2D, sprites: Sprite[]) {
  [...sprites].sort((a, b) => feetY(a) - feetY(b)).forEach((sprite) => sprite.draw(ctx));
}

import type { Direction } from "@/features/controller";
import type { PlayerSprite } from "@/features/sprite-player";
import gsap from "gsap";

const DEFAULT_DELAY = 2; // seconds

/** Per-sprite pending timer, keyed by the sprite itself — scheduling one NPC
 * never touches another's, and each sprite only ever has one pending call
 * at a time (see `scheduleFaceDirection`). Same WeakMap-per-sprite pattern
 * as `footprints.ts`'s `TrailState`. */
const pendingFaceTimers = new WeakMap<PlayerSprite, gsap.core.Tween>();

/**
 * Schedules `sprite` to face `direction` after a short delay — e.g. "look
 * back toward whoever you were just talking to" once a conversation ends.
 * Safe to call repeatedly, even rapidly (spam-talking the same NPC): each
 * call cancels that SAME sprite's own previous pending call first, so only
 * the latest one survives. Calling it for a *different* sprite never
 * touches this one — each is tracked independently.
 *
 * @example
 * scheduleFaceDirection(GAME_STATE.mama, "d");
 * scheduleFaceDirection(GAME_STATE.papa, "a");
 */
export function scheduleFaceDirection(
  sprite: PlayerSprite,
  direction: Direction,
  delay = DEFAULT_DELAY,
) {
  pendingFaceTimers.get(sprite)?.kill();
  const timer = gsap.delayedCall(delay, () => {
    pendingFaceTimers.delete(sprite);
    sprite.face(direction);
  });
  pendingFaceTimers.set(sprite, timer);
}

/**
 * Cancels `sprite`'s pending `scheduleFaceDirection` call, if any, without
 * scheduling a new one — for when something else is about to make it face
 * a particular way anyway (a new interaction, a scripted `walk()`), so the
 * stale timer doesn't fire later and fight it.
 *
 * @example
 * cancelScheduledFace(GAME_STATE.mama);
 */
export function cancelScheduledFace(sprite: PlayerSprite) {
  pendingFaceTimers.get(sprite)?.kill();
  pendingFaceTimers.delete(sprite);
}

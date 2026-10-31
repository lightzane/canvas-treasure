import type { Sprite } from "@/features/sprite";
import gsap from "gsap";

export interface AttentionBounceOptions {
  /** How high the hop reaches, in px. @default 12 */
  height?: number;
  /** Seconds for one leg (up, or down) of the hop. @default 0.15 */
  duration?: number;
  /** How many up-and-down hops, or "infinite" to keep hopping until `.stop()` is called. @default 1 */
  hops?: number | "infinite";
  /** Seconds to wait before starting. */
  delay?: number;
  /** Runs once every hop has finished. Never fires for `hops: "infinite"` — nothing to stop it is called from outside. */
  onComplete?: () => void;
}

export interface AttentionBounceHandle {
  /** Cancels the bounce — mid-delay, mid-hop, or mid-infinite-loop — and snaps the sprite back to its original position. */
  stop: () => void;
}

/**
 * A small "look over here" cue — bounces `sprite` straight up and back down
 * in place, e.g. right before it starts talking, to draw the player's eye to
 * it. Tweens `sprite.bounceOffset` (nudges only the drawn image, not
 * `position`) rather than `position.y` itself, so the shadow stays planted
 * on the ground and shrinks as the sprite rises instead of following it up —
 * see `Sprite.draw()`/`drawShadow()`. Restores exactly when done, so nothing
 * else needs to know this ran — call it on any NPC, no setup required.
 *
 * @example playAttentionBounce(npc);
 * @example playAttentionBounce(npc, { hops: 2, height: 20 });
 * @example
 * const bounce = playAttentionBounce(npc, { hops: "infinite" });
 * // ...later, e.g. right before dialogue starts...
 * bounce.stop();
 */
export function playAttentionBounce(
  sprite: Sprite,
  options: AttentionBounceOptions = {},
): AttentionBounceHandle {
  const { height = 12, duration = 0.15, hops = 1, delay = 0, onComplete } = options;

  let active: gsap.core.Tween | null = null;

  const start = () => {
    active = gsap.to(sprite, {
      bounceOffset: -height,
      duration,
      ease: "power1.out",
      yoyo: true,
      repeat: hops === "infinite" ? -1 : hops * 2 - 1, // each hop is an up-leg + a yoyo'd down-leg
      onComplete: () => {
        sprite.bounceOffset = 0; // guards against float drift from repeated yoyo tweens
        onComplete?.();
      },
    });
  };

  if (delay > 0) active = gsap.delayedCall(delay, start);
  else start();

  return {
    stop: () => {
      active?.kill();
      sprite.bounceOffset = 0;
    },
  };
}

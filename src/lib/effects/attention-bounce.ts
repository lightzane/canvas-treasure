import type { Sprite } from "@/features/sprite";
import gsap from "gsap";

export interface AttentionBounceOptions {
  /** How high the hop reaches, in px. @default 12 */
  height?: number;
  /** Seconds for one leg (up, or down) of the hop. @default 0.15 */
  duration?: number;
  /** How many up-and-down hops. @default 1 */
  hops?: number;
  /** Seconds to wait before starting. */
  delay?: number;
  /** Runs once every hop has finished. */
  onComplete?: () => void;
}

/**
 * A small "look over here" cue — bounces `sprite` straight up and back down
 * in place, e.g. right before it starts talking, to draw the player's eye to
 * it. Tweens the sprite's own `position.y` directly (not a separate draw
 * offset) and restores it exactly when done, so nothing else needs to know
 * this ran — call it on any NPC, no setup required.
 *
 * @example playAttentionBounce(npc);
 * @example playAttentionBounce(npc, { hops: 2, height: 20 });
 */
export function playAttentionBounce(sprite: Sprite, options: AttentionBounceOptions = {}) {
  const { height = 12, duration = 0.15, hops = 1, delay = 0, onComplete } = options;

  if (delay > 0) {
    gsap.delayedCall(delay, () =>
      playAttentionBounce(sprite, { height, duration, hops, onComplete }),
    );
    return;
  }

  const baseY = sprite.position.y;

  gsap.to(sprite.position, {
    y: baseY - height,
    duration,
    ease: "power1.out",
    yoyo: true,
    repeat: hops * 2 - 1, // each hop is an up-leg + a yoyo'd down-leg
    onComplete: () => {
      sprite.position.y = baseY; // guards against float drift from repeated yoyo tweens
      onComplete?.();
    },
  });
}

import type { Sprite } from "@/features/sprite";
import type { EffectHandle } from "@/lib/effects/handle";
import gsap from "gsap";
import { toScreen } from "@/lib/canvas/screen";

export type ShineMode = "shimmer" | "hidden";

export interface ShineOptions {
  /** "shimmer" glows continuously, obvious. "hidden" bursts briefly and rarely — a "look closely" cue for something meant to be half-hidden. @default "shimmer" */
  mode?: ShineMode;
  /** Star size (width/height of the shape), in px. @default 20 */
  size?: number;
  /** Fill color of the star, also used for its glow halo. @default "#fff176" (soft gold) */
  color?: string;
  /** Seconds to wait before starting. */
  delay?: number;
}

// An 8-point sparkle/glint outline (a 4-point star with shallow notches
// between each point) — the classic "✨"-style shape, but as a real clip-path
// on a plain div, so color/glow are fully controllable (an emoji glyph is a
// fixed-color system bitmap and ignores both).
const SPARKLE_CLIP_PATH =
  "polygon(50% 0%, 61% 35%, 100% 50%, 61% 65%, 50% 100%, 39% 65%, 0% 50%, 39% 35%)";

/**
 * A disposable, infinite "shine" cue centered on `target` — a small sparkle
 * that either shimmers continuously (the default — obviously glowing, draws
 * the eye) or bursts rarely and briefly (`mode: "hidden"` — a "something's
 * here if you look closely" cue, for a thing meant to be found, not
 * announced).
 *
 * This is infinite by design, so unlike every other effect in this folder,
 * you MUST keep the returned handle and call `.stop()` once it's no longer
 * needed (e.g. once the player picks the thing up) — see
 * `attention-bounce.ts`'s `hops: "infinite"` for the same pattern, and the
 * memory-leak bug that came from forgetting to stop one.
 *
 * Also unlike the rest of this folder: because this can run indefinitely,
 * the camera may well pan meaningfully over its lifetime, so (via
 * `gsap.ticker`) it re-reads the target's screen position every frame
 * instead of once at creation — the "read position once" rule only holds
 * for effects brief enough that the camera can't have moved much.
 *
 * @example
 * const shine = playShine(treasureSprite, { mode: "hidden" });
 * // ...later, once found/picked up...
 * shine.stop();
 */
export function playShine(target: Sprite, options: ShineOptions = {}): EffectHandle {
  const { mode = "shimmer", size = 20, color = "#fff176", delay = 0 } = options;

  const el = document.createElement("div");
  el.className = "game-effect-overlay";
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.background = color;
  el.style.clipPath = SPARKLE_CLIP_PATH;
  el.style.filter = `drop-shadow(0 0 ${size / 2}px ${color})`; // the glow halo — respects the clipped star shape, unlike box-shadow
  el.style.opacity = "0";
  document.body.appendChild(el);
  // Centers the element on its own point, the GSAP way — setting raw CSS
  // `transform: translate(-50%,-50%)` instead would get silently dropped
  // the first time a tween below writes its own `transform` (scale/rotation),
  // since GSAP then owns and recomposes that property itself.
  gsap.set(el, { xPercent: -50, yPercent: -50 });

  const reposition = () => {
    const canvasRect = document.getElementById("treasure")?.getBoundingClientRect();
    const centerX = target.position.x + target.boxSize.width / 2;
    const centerY = target.position.y + target.boxSize.height / 2;
    const local = toScreen({ x: centerX, y: centerY });
    el.style.left = `${(canvasRect?.left ?? 0) + local.x}px`;
    el.style.top = `${(canvasRect?.top ?? 0) + local.y}px`;
  };
  gsap.ticker.add(reposition);

  let tween: gsap.core.Timeline | undefined;
  let spin: gsap.core.Tween | undefined;
  const start = () => {
    if (mode === "shimmer") {
      // A slow, constant spin running underneath — the "catching the light"
      // feel — overlaid with an uneven pulse (quick flash, smaller dip,
      // another flash, slower fade) instead of one flat, symmetric breathe.
      spin = gsap.to(el, { rotation: 360, duration: 6, repeat: -1, ease: "none" });
      tween = gsap
        .timeline({ repeat: -1 })
        .set(el, { opacity: 0.5, scale: 0.8 })
        .to(el, { opacity: 1, scale: 1.4, duration: 0.35, ease: "sine.out" })
        .to(el, { opacity: 0.6, scale: 0.9, duration: 0.3, ease: "sine.in" })
        .to(el, { opacity: 1, scale: 1.2, duration: 0.3, ease: "sine.out" })
        .to(el, { opacity: 0.5, scale: 0.8, duration: 0.5, ease: "sine.in" });
      return;
    }

    tween = gsap
      .timeline({ repeat: -1, repeatDelay: 2.5 }) // long quiet gap between bursts — stays a "look closely" hint, not constant attention-grabbing
      .set(el, { opacity: 0, scale: 0.4, rotation: 0 })
      .to(el, { opacity: 1, scale: 2, rotation: 180, duration: 0.25, ease: "back.out(2)" }) // pop in big, spinning
      .to(el, { scale: 1, rotation: 270, duration: 0.2, ease: "sine.inOut" }) // twinkle...
      .to(el, { scale: 1.6, rotation: 360, duration: 0.2, ease: "sine.inOut" }) // ...twinkle
      .to(el, { opacity: 0, scale: 0.4, duration: 0.3, ease: "power1.in" }); // fade out
  };

  if (delay > 0) gsap.delayedCall(delay, start);
  else start();

  return {
    stop: () => {
      gsap.ticker.remove(reposition);
      tween?.kill();
      spin?.kill();
      el.remove();
    },
  };
}

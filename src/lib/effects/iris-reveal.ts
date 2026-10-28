import gsap from "gsap";

/**
 * A disposable "drama" effect: a black screen with a circle expanding from
 * the center, revealing whatever's underneath. Pure DOM/CSS (a `mask-image`
 * radial-gradient animated by GSAP) — nothing to do with the game canvas, no
 * ref to manage. Call it from anywhere; it creates its own element, animates
 * it, and removes itself when done.
 *
 * @example playIrisReveal();
 * @example playIrisReveal({ duration: 1.5 });
 * @example playIrisReveal({ delay: 1 }); // wait 1s (e.g. to clear a scene's fadeOut) before it starts
 * @example playIrisReveal({ softness: 40 }); // a soft, blurred edge instead of a sharp cut
 */
export interface IrisRevealOptions {
  duration?: number;
  /** Seconds to wait before starting — e.g. to clear a scene's own fadeOut first. */
  delay?: number;
  /** Pixels of blur/feather on the circle's edge. `0` (default) is a sharp cut. */
  softness?: number;
  /** Runs after the disposable overlay has removed itself. */
  onComplete?: () => void;
}

export function playIrisReveal(options: IrisRevealOptions = {}) {
  const { duration = 1, delay = 0, softness = 0, onComplete } = options;

  if (delay > 0) {
    gsap.delayedCall(delay, () => playIrisReveal({ duration, softness, onComplete }));
    return;
  }

  // Scoped to the game canvas's own rect, not the whole viewport — on a
  // screen bigger than the canvas, sizing this to window.innerWidth/innerHeight
  // meant the circle had to keep growing well past the canvas's corners, over
  // empty page background you'd never see, before the tween actually
  // finished — so the canvas looked done long before onComplete fired.
  const canvasRect = document.getElementById("treasure")?.getBoundingClientRect();
  const width = canvasRect?.width ?? window.innerWidth;
  const height = canvasRect?.height ?? window.innerHeight;
  const maxRadius = Math.hypot(width, height) / 2; // reaches past the canvas's own corners

  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.top = `${canvasRect?.top ?? 0}px`;
  el.style.left = `${canvasRect?.left ?? 0}px`;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.pointerEvents = "none";
  el.style.zIndex = "9999";
  el.style.background = "black";
  document.body.appendChild(el);

  const state = { radius: 0 };
  const setMask = () => {
    const inner = Math.max(state.radius - softness, 0);
    const outer = state.radius + softness;
    const mask = `radial-gradient(circle at center, transparent ${inner}px, black ${outer}px)`;
    el.style.maskImage = mask;
    el.style.webkitMaskImage = mask; // Safari still needs the prefix
  };
  setMask(); // fully opaque before the first animation frame — no flash

  gsap.to(state, {
    radius: maxRadius + softness, // so the inner (fully transparent) edge still reaches maxRadius at the end
    duration,
    ease: "none", // linear — constant expansion speed, not a decelerating one
    onUpdate: setMask,
    onComplete: () => {
      el.remove();
      onComplete?.();
    },
  });
}

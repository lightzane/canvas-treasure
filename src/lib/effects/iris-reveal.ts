import type { EffectHandle } from "@/lib/effects/handle";
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
 * @example
 * // "out" leaves the screen black — remove it explicitly once you're ready
 * // to show whatever comes next (e.g. right after switching GAME_STATE.sceneName;
 * // the destination scene's own fadeIn, if any, takes over from there).
 * const handle = playIrisReveal({ direction: "out" });
 * // ...later...
 * handle.stop(); // removes the overlay immediately, mid-animation or after — the only way an "out" overlay ever goes away; safe to call more than once
 */
export interface IrisRevealOptions {
  duration?: number;
  /** Seconds to wait before starting — e.g. to clear a scene's own fadeOut first. */
  delay?: number;
  /** Pixels of blur/feather on the circle's edge. `0` (default) is a sharp cut. */
  softness?: number;
  /**
   * `"in"` (default) opens from black to reveal the scene, then removes
   * itself. `"out"` is the reverse — circle closes down to black — for an
   * old-school ending; since removing the overlay at that point would
   * reveal the scene again (defeating the whole effect), `"out"` leaves it
   * covering the screen once finished instead of removing it.
   * @default "in"
   */
  direction?: "in" | "out";
  /** Runs once the animation finishes — after the overlay removes itself (`"in"`), or once it's fully black and staying put (`"out"`). */
  onComplete?: () => void;
}

export function playIrisReveal(options: IrisRevealOptions = {}): EffectHandle {
  const { duration = 1, delay = 0, softness = 0, direction = "in", onComplete } = options;

  if (delay > 0) {
    let inner: EffectHandle | null = null;
    const call = gsap.delayedCall(delay, () => {
      inner = playIrisReveal({ duration, softness, direction, onComplete });
    });
    return {
      stop: () => {
        call.kill();
        inner?.stop();
      },
    };
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
  el.className = "game-effect-overlay";
  el.style.top = `${canvasRect?.top ?? 0}px`;
  el.style.left = `${canvasRect?.left ?? 0}px`;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.background = "black";
  document.body.appendChild(el);

  // The closed extreme is `-softness`, not `0` — `inner` clamps at 0 but
  // `outer` (= radius + softness) doesn't, so landing exactly on `radius: 0`
  // left a permanent `transparent 0px, black {softness}px` ring: a small
  // circle at dead center that never finished fading to black. Overshooting
  // to `-softness` collapses both stops to 0 at the true end, closing it
  // completely. Symmetric with the open extreme already overshooting to
  // `maxRadius + softness` so the transparent edge still reaches `maxRadius`.
  const start = direction === "in" ? -softness : maxRadius + softness;
  const end = direction === "in" ? maxRadius + softness : -softness;

  const state = { radius: start };
  const setMask = () => {
    const inner = Math.max(state.radius - softness, 0);
    const outer = state.radius + softness;
    const mask = `radial-gradient(circle at center, transparent ${inner}px, black ${outer}px)`;
    el.style.maskImage = mask;
    el.style.webkitMaskImage = mask; // Safari still needs the prefix
  };
  setMask(); // matches the starting state before the first animation frame — no flash

  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    el.remove();
  };

  const tween = gsap.to(state, {
    radius: end,
    duration,
    ease: "none", // linear — constant expansion/contraction speed, not a decelerating one
    onUpdate: setMask,
    onComplete: () => {
      if (direction === "in") remove(); // "out" stays — removing it here would undo the whole point; see the returned handle
      onComplete?.();
    },
  });

  return {
    stop: () => {
      tween.kill();
      remove();
    },
  };
}

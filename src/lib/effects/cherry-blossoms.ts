import { getCanvasBounds } from "@/lib/confetti";
import type { EffectHandle } from "@/lib/effects/handle";
import confetti from "canvas-confetti";
import gsap from "gsap";

export interface CherryBlossomsOptions {
  /** Total seconds the effect runs for, from its initial flurry through its final gentle drift. @default 5 */
  duration?: number;
  /** Seconds to wait before starting. */
  delay?: number;
  /** Runs once the effect has fully finished — naturally, or via an early `.stop()`/`.fade()`. */
  onComplete?: () => void;
}

export interface CherryBlossomsHandle extends EffectHandle {
  /**
   * Fades out whatever's already drifting over `duration` seconds, instead
   * of letting it finish naturally like `.stop()` does — also stops
   * launching new petals. canvas-confetti has no per-particle fade (its own
   * `.reset()` is an instant, un-faded clear), so this works one level up:
   * a GSAP opacity tween on this effect's own canvas, then `.reset()` once
   * it's fully transparent so the engine actually stops computing hidden
   * particles instead of just hiding them.
   * @default 1.5
   */
  fade: (duration?: number) => void;
}

// Pulled from the cherry tree's own art: its pale highlight, the canopy's
// dominant mid-tone pink, the deeper rose in its shadowed clusters, and a
// warm white for the occasional bright petal — not party-confetti colors.
const PETAL_COLORS = ["#f9d1e0", "#f2a8c7", "#d9789f", "#fffaf5"];

// A simple petal/leaf lens outline via shapeFromPath, so particles read as
// petals rather than canvas-confetti's default square/circle/star. Kept
// plain on purpose — at the small, fast-moving scale a confetti particle
// actually renders at, a simple silhouette reads better than fussy detail.
const PETAL_SHAPE = confetti.shapeFromPath("M10 0 Q20 10 10 20 Q0 10 10 0 Z");

// A dedicated canvas (not the shared default canvas-confetti instance other
// callers like birthdayConfetti/playLeafBurst use) — lazily created once and
// reused across every playCherryBlossoms() call, same "one persistent
// overlay, never torn down" lifecycle as the library's own default canvas.
// Owning it ourselves is what gives .fade() an actual element to fade;
// reused rather than recreated per call so repeated calls (e.g. once per
// wind-gust cue) don't each leave behind their own canvas.
let sharedCanvas: HTMLCanvasElement | null = null;
let sharedFire: confetti.CreateTypes | null = null;

function ensureFire(): confetti.CreateTypes {
  if (!sharedFire) {
    sharedCanvas = document.createElement("canvas");
    Object.assign(sharedCanvas.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "100", // canvas-confetti's own default for its auto-created canvas
    });
    document.body.appendChild(sharedCanvas);
    sharedFire = confetti.create(sharedCanvas, { resize: true });
  }
  // Undoes a previous call's .fade() — a fresh call always starts fully visible.
  sharedCanvas!.style.opacity = "1";
  return sharedFire;
}

/**
 * A gentle, continuous rain of cherry-blossom petals drifting down across
 * the whole page — `canvas-confetti` under the hood, its own dedicated
 * overlay canvas (see `ensureFire`), shaped and colored to read as petals,
 * not party confetti: `PETAL_SHAPE` instead of the default shapes,
 * `PETAL_COLORS` instead of confetti's usual bright mix, low gravity and
 * long `ticks` so each one drifts the full height of the canvas instead of
 * vanishing partway down.
 *
 * Fires in two clusters rather than one flat loop: a handful of bursts
 * staggered tightly together right at the start, then the same burst
 * repeating steadily for the rest of `duration`. Every burst uses identical
 * particle settings now — the density spike from the opening cluster firing
 * close together is what reads as "more happening right at the start",
 * not any per-burst difference. Call it alongside whatever wind/gust cue
 * triggered it, so the two read as one moment instead of two
 * coincidentally-timed effects.
 *
 * Canvas position is read once, from the canvas's own fixed page rect —
 * fine for a cue this brief, same reasoning as the rest of this folder.
 *
 * @example playCherryBlossoms();
 * @example playCherryBlossoms({ duration: 8, delay: 0.3 });
 *
 * Returned handle's `.stop()` stops launching new petals early — whatever's
 * already drifting finishes its own fall naturally, same as
 * `src/lib/confetti.ts`'s `birthdayConfetti`. Use `.fade()` instead for an
 * early, faded conclusion rather than a natural one.
 */
export function playCherryBlossoms(options: CherryBlossomsOptions = {}): CherryBlossomsHandle {
  const { duration = 15, delay = 0, onComplete } = options;
  const fire = ensureFire();

  let done = false;
  function finish() {
    if (done) return;
    done = true;
    onComplete?.();
  }

  let driver: gsap.core.Tween | null = null;
  const flurryTimers: gsap.core.Tween[] = [];

  function start() {
    const { left, right } = getCanvasBounds();
    const width = right - left;

    // Each burst's origin.x is randomized once per burst() call, not once
    // per particle — so a big particleCount all shares one starting point.
    // With startVelocity this low there's nothing left to separate them
    // from each other as they fall, so a large burst reads as one tight
    // clump drifting together, not scattered petals. Keeping each burst
    // small and firing it often is what actually spreads petals across the
    // canvas — a different random origin.x every time — not a bigger
    // particleCount or more spread on a single burst.
    function burst() {
      fire({
        particleCount: 2,
        // A real "launch" velocity (15, confetti's own default range) is
        // what reads as fireworks/a cannon shot, in ANY direction — angle
        // just decides which way it fires, not whether it looks launched.
        // A gentle petal shouldn't have a noticeable launch at all: barely
        // any velocity, pointed down (270, not confetti's default 90/up) so
        // what little there is doesn't waste time arcing away from the
        // canvas first — gravity does virtually all the actual motion.
        startVelocity: 5,
        angle: 270,
        gravity: 0.4,
        drift: gsap.utils.random(-1, 1),
        decay: 0.96,
        ticks: 5000,
        // Wide range on purpose — a mix of small and large petals in the
        // same burst reads as natural variety, not confetti's uniform size.
        scalar: gsap.utils.random(0.9, 2.7),
        shapes: [PETAL_SHAPE],
        colors: PETAL_COLORS,
        // flat deliberately omitted (defaults to false) — tumble/rotation
        // is what reads as "falling" at all, not a static slide.
        origin: { x: left + Math.random() * width, y: -0.2 },
      });
    }

    // Initial flurry — the same small burst fired many times in quick
    // succession, each sampling its own random origin.x, so the opening
    // moment is already spread across the canvas instead of a handful of
    // clumps. Count bumped up from 6 since each burst() now only places 2
    // petals instead of 15.
    for (let i = 0; i < 16; i++) {
      flurryTimers.push(gsap.delayedCall(i * 0.05, () => burst()));
    }

    // Then a steady, gentle drift for the rest of duration. Tweening {} with
    // no real properties — just using GSAP's own timer/repeat machinery
    // rather than a raw setInterval, same "GSAP ticks itself" reasoning as
    // the rest of this folder. Interval shortened (was 0.2) to match the
    // smaller particleCount above — same overall density, spread across
    // more distinct origin points instead of fewer, bigger clumps.
    const interval = 0.07;
    driver = gsap.to(
      {},
      {
        duration: interval,
        repeat: Math.ceil(duration / interval),
        onRepeat: () => burst(),
        onComplete: finish,
      },
    );
  }

  function stopBursts() {
    pending?.kill();
    flurryTimers.forEach((t) => t.kill());
    driver?.kill();
  }

  const pending = delay > 0 ? gsap.delayedCall(delay, start) : null;
  if (!pending) start();

  return {
    stop: () => {
      stopBursts();
      finish();
    },
    fade: (fadeDuration = 1.5) => {
      stopBursts();
      gsap.to(sharedCanvas, {
        opacity: 0,
        duration: fadeDuration,
        onComplete: () => {
          fire.reset();
          finish();
        },
      });
    },
  };
}

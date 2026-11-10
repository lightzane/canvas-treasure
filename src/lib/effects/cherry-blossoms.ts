import { getCanvasBounds } from "@/lib/confetti";
import type { EffectHandle } from "@/lib/effects/handle";
import confetti from "canvas-confetti";
import gsap from "gsap";

export interface CherryBlossomsOptions {
  /** Total seconds the effect runs for, from its initial flurry through its final gentle drift. @default 5 */
  duration?: number;
  /** Seconds to wait before starting. */
  delay?: number;
  /** Runs once the effect has fully finished — naturally, or via an early `.stop()`. */
  onComplete?: () => void;
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

/**
 * A gentle, continuous rain of cherry-blossom petals drifting down across
 * the whole game canvas — `canvas-confetti` under the hood, same floating
 * overlay canvas already used elsewhere (`playLeafBurst`, `birthdayConfetti`
 * in `src/lib/confetti.ts`), not the game canvas — but shaped and colored to
 * read as petals, not party confetti: `PETAL_SHAPE` instead of the default
 * shapes, `PETAL_COLORS` instead of confetti's usual bright mix, low gravity
 * and long `ticks` so each one drifts the full height of the canvas instead
 * of vanishing partway down.
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
 * `src/lib/confetti.ts`'s `birthdayConfetti`.
 */
export function playCherryBlossoms(options: CherryBlossomsOptions = {}): EffectHandle {
  const { duration = 15, delay = 0, onComplete } = options;

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

    // Each burst's origin.x is randomized once per fire() call, not once
    // per particle — so a big particleCount all shares one starting point.
    // With startVelocity this low there's nothing left to separate them
    // from each other as they fall, so a large burst reads as one tight
    // clump drifting together, not scattered petals. Keeping each burst
    // small and firing it often is what actually spreads petals across the
    // canvas — a different random origin.x every time — not a bigger
    // particleCount or more spread on a single burst.
    function fire() {
      confetti({
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
    // clumps. Count bumped up from 6 since each fire() now only places 2
    // petals instead of 15.
    for (let i = 0; i < 16; i++) {
      flurryTimers.push(gsap.delayedCall(i * 0.05, () => fire()));
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
        onRepeat: () => fire(),
        onComplete: finish,
      },
    );
  }

  const pending = delay > 0 ? gsap.delayedCall(delay, start) : null;
  if (!pending) start();

  return {
    stop: () => {
      pending?.kill();
      flurryTimers.forEach((t) => t.kill());
      driver?.kill();
      finish();
    },
  };
}

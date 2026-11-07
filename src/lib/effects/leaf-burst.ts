import type { Sprite } from "@/features/sprite";
import { toScreen } from "@/lib/canvas/screen";
import confetti from "canvas-confetti";
import gsap from "gsap";

export interface LeafBurstOptions {
  /** Number of leaf particles. @default 12 */
  count?: number;
  /** Particle colors — greens/browns by default, to read as leaves rather than party confetti. */
  colors?: string[];
  /** Seconds to wait before firing. */
  delay?: number;
}

const DEFAULT_LEAF_COLORS = ["#4f8a3d", "#6fa84f", "#8bc34a", "#a3703c", "#7a5230"];

/**
 * A small burst of leaf-colored confetti centered on `target`'s current
 * screen position, via the already-installed `canvas-confetti` (see
 * `src/lib/confetti.ts`'s `birthdayConfetti`) — its own floating overlay
 * canvas, not the game canvas, same reasoning as the rest of this folder.
 * Position is read once at call time (fine for a cue this brief, same as
 * `playExclamation`/`iris-reveal.ts`). Low velocity/short ticks so particles
 * read as leaves scattering, not an explosion.
 *
 * @example playLeafBurst(bushSprite);
 */
export function playLeafBurst(target: Sprite, options: LeafBurstOptions = {}) {
  const { count = 20, colors = DEFAULT_LEAF_COLORS, delay = 0 } = options;

  if (delay > 0) {
    gsap.delayedCall(delay, () => playLeafBurst(target, { ...options, delay: 0 }));
    return;
  }

  const canvasRect = document.getElementById("treasure")?.getBoundingClientRect();
  const local = toScreen(target.position);
  const x = ((canvasRect?.left ?? 0) + local.x + target.boxSize.width / 2) / window.innerWidth;
  const y = ((canvasRect?.top ?? 0) + local.y - target.boxSize.height / 2) / window.innerHeight;

  confetti({
    particleCount: count,
    colors,
    origin: { x, y },
    spread: 100,
    startVelocity: 16,
    gravity: 1.3,
    scalar: 0.7,
    ticks: 70,
  });
}

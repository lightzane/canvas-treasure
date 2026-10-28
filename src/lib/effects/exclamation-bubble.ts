import type { Sprite } from "@/features/sprite";
import { toScreen } from "@/lib/canvas/screen";
import gsap from "gsap";

export interface ExclamationBubbleOptions {
  /** Square size, in px. @default 28 */
  size?: number;
  /** Gap between the sprite's head and the bottom of the bubble, in px. @default 10 */
  margin?: number;
  /** Fill color of the rounded square. @default "#fff" */
  fill?: string;
  /** Border color. @default "black" */
  stroke?: string;
  /** "!" glyph color. @default "red" */
  color?: string;
  /** Seconds the bubble stays fully visible before fading out. @default 0.6 */
  hold?: number;
  /** Seconds to wait before popping in. */
  delay?: number;
  /** Runs once the bubble has fully faded out and removed itself. */
  onComplete?: () => void;
}

/**
 * A disposable Pokémon-style "!" notice — a small filled rounded square with
 * an exclamation mark that pops in above `target`'s head, holds briefly,
 * then fades out and removes itself. Pure DOM/CSS, same spirit as the other
 * effects in this folder: no canvas drawing, no scene wiring — the sprite's
 * on-screen position is read once at the moment this is called (fine for a
 * cue this brief) via the same canvas-rect trick `iris-reveal.ts` uses.
 *
 * @example playExclamation(GAME_STATE.mama);
 * @example playExclamation(GAME_STATE.mama, { hold: 1, fill: "#ffe066" });
 */
export function playExclamation(target: Sprite, options: ExclamationBubbleOptions = {}) {
  const {
    size = 28,
    margin = 10,
    fill = "#fff",
    stroke = "black",
    color = "red",
    hold = 0.6,
    delay = 0,
    onComplete,
  } = options;

  if (delay > 0) {
    gsap.delayedCall(delay, () => playExclamation(target, { ...options, delay: 0 }));
    return;
  }

  const canvasRect = document.getElementById("treasure")?.getBoundingClientRect();
  const local = toScreen(target.position); // position within the canvas's own coordinate space
  const anchorX = (canvasRect?.left ?? 0) + local.x + target.boxSize.width / 2;
  const anchorY = (canvasRect?.top ?? 0) + local.y - margin;

  const el = document.createElement("div");
  el.textContent = "!";
  el.style.position = "fixed";
  el.style.left = `${anchorX}px`;
  el.style.top = `${anchorY}px`;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.borderRadius = "6px";
  el.style.background = fill;
  el.style.border = `2px solid ${stroke}`;
  el.style.color = color;
  el.style.fontFamily = '"Oxanium", system-ui';
  el.style.fontWeight = "700";
  el.style.fontSize = "20px";
  el.style.pointerEvents = "none";
  el.style.zIndex = "9999";
  el.style.transformOrigin = "center bottom"; // pops up from the point just above the head
  document.body.appendChild(el);

  const state = { scale: 0, opacity: 1 };
  const applyTransform = () => {
    el.style.transform = `translate(-50%, -100%) scale(${state.scale})`;
    el.style.opacity = `${state.opacity}`;
  };
  applyTransform(); // start invisible (scale 0) before the first animation frame — no flash

  gsap
    .timeline({
      onComplete: () => {
        el.remove();
        onComplete?.();
      },
    })
    .to(state, { scale: 1.2, duration: 0.12, ease: "back.out(3)", onUpdate: applyTransform }) // quick overshoot pop
    .to(state, { scale: 1, duration: 0.08, ease: "power1.in", onUpdate: applyTransform })
    .to(
      state,
      { opacity: 0, duration: 0.15, ease: "power1.in", onUpdate: applyTransform },
      `+=${hold}`,
    ); // hold, then fade
}

import type { Sprite } from "@/features/sprite";
import { audioPlaySound } from "@/lib/audio";
import { toScreen } from "@/lib/canvas/screen";
import gsap from "gsap";

export interface ExclamationBubbleOptions {
  /** Square size, in px. @default 40 */
  size?: number;
  /** Gap between the sprite's head and the bottom of the bubble, in px. @default 10 */
  margin?: number;
  /** Fill color of the rounded square. @default "#fff" */
  fill?: string;
  /** Border color. @default "black" */
  stroke?: string;
  /** The character/emoji shown in the bubble — one glyph, not a text string (this is a small fixed square, not a label). Ignored if `icon` is given. @default "!" */
  glyph?: string;
  /**
   * Image URL/path shown instead of `glyph` — set directly as an `<img>`'s
   * `src` (same as `img()`'s own return value, e.g.
   * `icon: img("others/garden-shears.png")`), not a filename alone or a
   * tooltip/title string. An animated GIF/APNG/WebP plays normally, same as
   * any other `<img>`. Renders identically everywhere, unlike a multicolor
   * emoji glyph, which depends on the OS's own emoji font and ignores
   * `color`. Drawn pixelated (crisp, no smoothing), matching this project's
   * own sprite convention.
   */
  icon?: string;
  /** `glyph` color — ignored when `icon` is given (an image has its own fixed appearance). @default "red" */
  color?: string;
  /** Seconds the bubble stays fully visible before fading out. @default 0.9 */
  hold?: number;
  /** Seconds to wait before popping in. */
  delay?: number;
  /** Runs once the bubble has fully faded out and removed itself. */
  onComplete?: () => void;
}

/**
 * A disposable Pokémon-style "!" notice — a small filled rounded square with
 * a glyph (or an image, via `icon`) that pops in above `target`'s head,
 * holds briefly, then fades out and removes itself. Pure DOM/CSS, same
 * spirit as the other effects in this folder: no canvas drawing, no scene
 * wiring — the sprite's on-screen position is read once at the moment this
 * is called (fine for a cue this brief) via the same canvas-rect trick
 * `iris-reveal.ts` uses.
 *
 * @example playExclamation(GAME_STATE.mama);
 * @example playExclamation(GAME_STATE.mama, { hold: 1, fill: "#ffe066" });
 * @example playExclamation(GAME_STATE.mama, { glyph: "?" });
 * @example playExclamation(GAME_STATE.mama, { icon: img("others/garden-shears.png") });
 */
export function playExclamation(target: Sprite, options: ExclamationBubbleOptions = {}) {
  const {
    size = 40,
    margin = 10,
    fill = "#fff",
    stroke = "black",
    glyph = "!",
    icon,
    color = "red",
    hold = 0.9,
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
  el.className = "game-effect-overlay font-game";
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
  el.style.transformOrigin = "center bottom"; // pops up from the point just above the head

  if (icon) {
    const img = document.createElement("img");
    img.src = icon;
    img.alt = "";
    img.style.width = "70%";
    img.style.height = "70%";
    img.style.objectFit = "contain";
    img.style.imageRendering = "pixelated"; // stays crisp, not smoothed — every frame, for an animated GIF too
    el.appendChild(img);
  } else {
    const span = document.createElement("span");
    span.textContent = glyph;
    span.style.display = "inline-block";
    span.style.color = color;
    span.style.fontWeight = "700";
    span.style.fontSize = "32px";
    // Flex centering (el's own alignItems/justifyContent) centers the
    // text's *line box*, not the glyph's actual visual ink — a color emoji
    // glyph bakes in extra space below its own baseline (for descenders it
    // never uses), so it renders sitting visibly high with a gap
    // underneath even though its line box is perfectly centered. Plain
    // glyphs like the default "!" have the same asymmetry, just less of
    // it. No font-size/line-height/padding value on the *outer* element
    // fixes this — it's the glyph's own metrics, not the box around it. A
    // small nudge on this inner span (not el itself, which owns the
    // popup-in/scale transform below) compensates; tuned empirically
    // against the system emoji font, not derived from anything CSS
    // actually exposes.
    span.style.transform = "translateY(0.1em)";
    el.appendChild(span);
  }

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
    .to(state, { scale: 1.8, duration: 0.12, ease: "back.out(3)", onUpdate: applyTransform }) // quick overshoot pop
    .to(state, { scale: 1, duration: 0.08, ease: "power1.in", onUpdate: applyTransform })
    .to(
      state,
      { opacity: 0, duration: 0.15, ease: "power1.in", onUpdate: applyTransform },
      `+=${hold}`,
    ); // hold, then fade

  audioPlaySound("pop");
}

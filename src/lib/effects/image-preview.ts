import { GAME_FONT_FAMILY } from "@/constants/game-settings";
import gsap from "gsap";

export interface ImagePreviewOptions {
  /** Accessible label — not shown as a visible caption. @default "" */
  alt?: string;
  /**
   * Background behind the image — matters for a transparent PNG. Any valid
   * CSS `background` value, e.g. `"#979796"` (see `PAPER_BG_COLOR` in
   * `puzzle-viewer.tsx` for this project's own tracing-paper case). Falls
   * back to the same cream gradient `ImageViewer` defaults to when omitted.
   */
  backgroundColor?: string;
  /** Renders without smoothing, for a pixel-art source — most real photos/scans look better left default-smoothed. @default false */
  pixelated?: boolean;
  /** Seconds fully visible before auto-dismissing, or `"manual"` to stay open until clicked (or the returned handle's `stop()`). @default "manual" */
  hold?: number | "manual";
  /** Seconds to wait before appearing. */
  delay?: number;
  /** Runs once dismissed — by a click, the `hold` timeout, or `.stop()` — and the element has fully removed itself. */
  onComplete?: () => void;
}

export interface ImagePreviewHandle {
  /** Dismisses the preview early — fades it out and removes it, regardless of `hold`. Safe to call more than once. */
  stop: () => void;
}

const DEFAULT_BG = "linear-gradient(to bottom, #fff, #fffbeb)"; // same cream gradient ImageViewer defaults to

/**
 * A disposable full-image popup covering the game canvas — for a quick
 * look at something (a wall photo, a postcard an NPC hands over, ...)
 * triggered from a cutscene or an `interact`, from anywhere, with zero
 * setup. Same spirit and visual language as `ImageViewer`
 * (`src/app/image-viewer.tsx`, the bag's own item-preview popup) — not a
 * reuse of that component itself, since it's a React component only ever
 * mounted inside `BagPanel`'s own tree and can't be rendered from plain
 * scene code; this file's `effects/` niche is exactly for that (see this
 * folder's own CLAUDE.md: DOM/CSS + GSAP, callable from anywhere, no React
 * tree required).
 *
 * Dismisses on a click anywhere on the backdrop (not the image itself) or
 * the × button — same as `ImageViewer` — plus an optional timed
 * auto-dismiss via `hold`. Doesn't touch `GAME_STATE.movementLocked` or
 * the bag icon itself — combine with those explicitly wherever the caller
 * actually wants movement blocked while this shows, same pairing already
 * used elsewhere (e.g. `flowershop.ts`'s `mainQuestGardenShears`).
 *
 * @example playImagePreview(img("treasure/postcard.jpg"));
 * @example playImagePreview(img("puzzle/tp1.png"), { backgroundColor: PAPER_BG_COLOR });
 * @example playImagePreview(img("others/photo-frame.png"), { hold: 3 }); // auto-dismisses after 3s, no click needed
 * @example
 * const preview = playImagePreview(img("treasure/postcard.jpg"), { hold: "manual" });
 * // ...later, e.g. once a cutscene's own next beat is ready...
 * preview.stop();
 */
export function playImagePreview(
  src: string,
  options: ImagePreviewOptions = {},
): ImagePreviewHandle {
  const { delay = 0 } = options;

  let pending: gsap.core.Tween | null = null;
  let stopInner: (() => void) | null = null;

  const start = () => {
    stopInner = runPreview(src, options);
  };

  if (delay > 0) pending = gsap.delayedCall(delay, start);
  else start();

  return {
    stop: () => {
      pending?.kill();
      stopInner?.();
    },
  };
}

function runPreview(src: string, options: ImagePreviewOptions): () => void {
  const { alt = "", backgroundColor, pixelated = false, hold = "manual", onComplete } = options;

  const canvasRect = document.getElementById("treasure")?.getBoundingClientRect();
  const width = canvasRect?.width ?? window.innerWidth;
  const height = canvasRect?.height ?? window.innerHeight;

  const backdrop = document.createElement("div");
  backdrop.className = "game-effect-overlay";
  backdrop.style.pointerEvents = "auto"; // overrides the class's own pointer-events: none — this one needs clicks, unlike the rest of this folder
  // Overrides the class's own z-index: 9999 — this effect covers the whole
  // canvas, so at that z-index it'd sit above (and hide) anything meant to
  // layer over it from the page body, e.g. canvas-confetti's own canvas,
  // which defaults to z-index: 100 (see node_modules/canvas-confetti —
  // `zIndex: 100` in its default options). 90 keeps this below that
  // default without needing confetti (or any other body-level effect) to
  // know this popup exists at all.
  backdrop.style.zIndex = "90";
  backdrop.style.boxSizing = "border-box";
  backdrop.style.top = `${canvasRect?.top ?? 0}px`;
  backdrop.style.left = `${canvasRect?.left ?? 0}px`;
  backdrop.style.width = `${width}px`;
  backdrop.style.height = `${height}px`;
  backdrop.style.display = "flex";
  backdrop.style.alignItems = "center";
  backdrop.style.justifyContent = "center";
  backdrop.style.padding = "32px";
  backdrop.style.background = "rgba(0, 0, 0, 0.6)";
  backdrop.style.cursor = hold === "manual" ? "pointer" : "default";
  backdrop.style.opacity = "0";
  backdrop.style.userSelect = "none";

  const image = document.createElement("img");
  image.src = src;
  image.alt = alt;
  image.style.maxWidth = "100%";
  image.style.maxHeight = "100%";
  image.style.objectFit = "contain";
  image.style.borderRadius = "12px";
  image.style.border = "2px solid #92400e"; // amber-800
  image.style.boxShadow = "0 0 24px rgba(0, 0, 0, 0.6)";
  image.style.cursor = "default";
  image.style.background = backgroundColor ?? DEFAULT_BG;
  image.style.userSelect = "none";
  if (pixelated) image.style.imageRendering = "pixelated";
  image.addEventListener("click", (e) => e.stopPropagation()); // clicking the image itself shouldn't dismiss, only the backdrop/× should
  backdrop.appendChild(image);

  // A timed `hold` means the player shouldn't be able to force it away or
  // touch anything behind it early — no × button, no click-to-dismiss. The
  // backdrop stays `pointer-events: auto` regardless (see above), so the
  // canvas underneath stays unreachable either way; it just doesn't do
  // anything with that click when timed.
  if (hold === "manual") {
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "×";
    closeBtn.style.position = "absolute"; // relative to backdrop — `game-effect-overlay` makes it a positioned ancestor (position: fixed)
    closeBtn.style.top = "16px";
    closeBtn.style.right = "16px";
    closeBtn.style.width = "32px";
    closeBtn.style.height = "32px";
    closeBtn.style.borderRadius = "9999px";
    closeBtn.style.border = "2px solid #92400e";
    closeBtn.style.background = "#fffbeb"; // amber-50
    closeBtn.style.color = "#451a03"; // amber-950
    closeBtn.style.fontFamily = GAME_FONT_FAMILY;
    closeBtn.style.fontSize = "18px";
    closeBtn.style.lineHeight = "1";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.boxShadow = "2px 2px 0 rgba(0, 0, 0, 0.3)";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dismiss();
    });
    backdrop.appendChild(closeBtn);
    backdrop.addEventListener("click", dismiss);
  }

  document.body.appendChild(backdrop);

  let done = false;
  function cleanup() {
    if (done) return;
    done = true;
    backdrop.remove();
    onComplete?.();
  }

  const tl = gsap.timeline();
  tl.to(backdrop, { opacity: 1, duration: 0.25, ease: "power2.out" });
  if (hold !== "manual") {
    tl.to({}, { duration: hold }).to(backdrop, {
      opacity: 0,
      duration: 0.25,
      ease: "power1.in",
      onComplete: cleanup,
    });
  }

  function dismiss() {
    tl.kill(); // never fires its own onComplete past this point — cleanup is explicit below
    gsap.to(backdrop, { opacity: 0, duration: 0.25, ease: "power1.in", onComplete: cleanup });
  }

  return dismiss;
}

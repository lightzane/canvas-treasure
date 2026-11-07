import { GAME_FONT_FAMILY } from "@/constants/game-settings";
import { audioPlaySound } from "@/lib/audio";
import type { QuestEntry } from "@/lib/quests";
import gsap from "gsap";

export interface QuestToastOptions {
  /** Player-facing text to show — typically the quest's own `description`. */
  description: string;
  /** The warmer, filled-checkmark variant for the moment a quest actually finishes, instead of the routine update/progress look. @default false */
  resolved?: boolean;
  /** Current progress, for a collectible-style quest — renders the circle as a clockwise-filling pie instead of a plain checklist ring. Set together with `totalQty`. `qty >= totalQty` renders identically to `resolved: true`. */
  qty?: number;
  totalQty?: number;
  /** Seconds fully visible before fading out, or `"infinite"` to hold until `.stop()` is called manually. @default 5 */
  hold?: number | "infinite";
  /** Seconds to wait before appearing. */
  delay?: number;
  /** Runs once the toast has fully faded out and removed itself. */
  onComplete?: () => void;
}

export interface QuestToastHandle {
  /** Stops the toast — fades it out and removes it, regardless of how much hold time (if any) was left. Required for `hold: "infinite"` (nothing else will ever remove it); safe to call early on a normal one too, or more than once. */
  stop: () => void;
}

const MARGIN_TOP = 24;
const MARGIN_LEFT = 24;
const GAP = 10;

// The circle's own size is driven entirely by this — it's also set as the
// text's own *explicit pixel* line-height (not a unitless ratio, which
// would leave the actual box height up to this particular font's own
// metrics). With both the same concrete px value and the row using
// align-items: flex-start (not center), the circle's top/bottom edges land
// exactly on the first line's top/bottom edges by construction — no
// font-metric guessing, and it naturally stays pinned to just the first
// line if the text wraps, instead of centering against the whole block.
const LINE_HEIGHT = 26;

/** Currently-visible toasts, oldest (topmost) first — see `repositionToasts()`. */
const activeToasts: HTMLDivElement[] = [];

/**
 * The canvas's own page rect — everything in this file positions off this,
 * not the raw viewport, since `layout.tsx` centers the canvas on the page
 * rather than pinning it to the viewport's own top-left corner. Same
 * canvas-rect trick the rest of `src/lib/effects/` already uses for
 * world-anchored effects; here it's just the canvas's fixed corner instead
 * of a moving sprite's position.
 */
function getCanvasRect() {
  const rect = document.getElementById("treasure")?.getBoundingClientRect();
  return {
    left: rect?.left ?? 0,
    top: rect?.top ?? 0,
    width: rect?.width ?? 0,
    height: rect?.height ?? 0,
  };
}

/** Slides the remaining toasts up to close the gap left by one that just finished. Not called when adding one — a new toast computes its own correct slot directly, once, at creation (see `runToast`), so there's nothing to reflow on the way in. */
function repositionToasts() {
  const canvas = getCanvasRect();
  let top = canvas.top + MARGIN_TOP;
  for (const toast of activeToasts) {
    gsap.to(toast, { top, duration: 0.3, ease: "power2.out" });
    top += toast.offsetHeight + GAP;
  }
}

/**
 * Normalizes `playQuestToast`'s three accepted input forms into one shape.
 * A `QuestEntry` always has `status`; `QuestToastOptions` never does — a
 * reliable runtime discriminant matching the type-level distinction.
 */
function normalizeToastInput(input: string | QuestToastOptions | QuestEntry): QuestToastOptions {
  if (typeof input === "string") return { description: input };
  if ("status" in input) {
    return {
      description: input.description,
      qty: input.qty,
      totalQty: input.totalQty,
      resolved: input.status === "resolved",
    };
  }
  return input;
}

/**
 * A disposable "journal updated" banner, top-left of the screen, showing
 * `options.description` briefly — pops in, holds, fades out, removes
 * itself. Stacks correctly with any other toasts already showing (each one
 * slots in below the current stack; the rest slide up to fill the gap once
 * one finishes). Pass `resolved: true` for the specific moment a quest
 * actually finishes — a warmer tint on the same glass pill, and the
 * checklist circle fills in with a checkmark instead of staying outlined —
 * same single-function-plus-variant-flag shape as `playShine`'s own `mode`
 * option. `playQuestCompleteBanner` is a bigger, standalone announcement
 * for the same moment, if that's what's wanted instead.
 *
 * Canvas-anchored rather than sprite-anchored (unlike most of this folder,
 * which reads a moving sprite's `toScreen()` position) — it reads the
 * canvas element's own fixed page rect via `getCanvasRect()` instead, so
 * `MARGIN_LEFT`/`MARGIN_TOP` tune the gap from the canvas's own corner,
 * not the raw browser viewport (which `layout.tsx` centers the canvas
 * within, rather than pinning to its top-left).
 *
 * Doesn't touch `GAME_STATE.quests` itself — call `questSetStatus`/
 * `questSetProgress` (`@/lib/quests`) separately, explicitly, alongside
 * this, same as `playExclamation`/`playAttentionBounce` already get called
 * next to a `GAME_STATE.bag.set(...)` rather than bundled into one call.
 *
 * Takes a bare string as shorthand for `{ description }`, the full options
 * object when `resolved`/`qty`/`hold`/etc. are needed, or a `QuestEntry`
 * straight from `GAME_STATE.quests` — its `status`/`qty`/`totalQty` are
 * read directly, so `resolved` is derived automatically from
 * `status === "resolved"` instead of needing to be passed redundantly
 * alongside it. Same two-form idea as `playQuestCompleteBanner`'s own
 * `string | {...}` and `DialogueInput` (`dialogue.ts`), extended with this
 * third form the same way `questSetStatus`/`questSetProgress` accept
 * `QuestId | QuestEntry`.
 *
 * @example playQuestToast("Catch the sheets.");
 * @example playQuestToast({ description: quest.description });
 * @example playQuestToast({ description: quest.description, qty: 5, totalQty: 10 }); // half-filled pie
 * @example playQuestToast({ description: quest.description, resolved: true });
 * @example playQuestToast(questEntry); // resolved/qty/totalQty read straight off it
 * @example
 * const toast = playQuestToast({ description: "Waiting on something...", hold: "infinite" });
 * // ...later...
 * toast.stop();
 */
export function playQuestToast(input: string | QuestToastOptions | QuestEntry): QuestToastHandle {
  const options = normalizeToastInput(input);
  const { delay = 0 } = options;

  let pending: gsap.core.Tween | null = null;
  let stopInner: (() => void) | null = null;

  const start = () => {
    stopInner = runToast(options);
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

function runToast(options: QuestToastOptions): () => void {
  const { description, qty, totalQty, hold = 5, onComplete, resolved = false } = options;

  // A qty that's reached its target reads as fully resolved too, same
  // filled-checkmark treatment as playQuestResolvedToast.
  const complete = resolved || (qty !== undefined && totalQty !== undefined && qty >= totalQty);

  const canvas = getCanvasRect();

  const el = document.createElement("div");
  el.className = "game-effect-overlay";
  el.style.left = `${canvas.left + MARGIN_LEFT}px`;
  el.style.display = "flex";
  el.style.alignItems = "flex-start";
  el.style.gap = "10px";
  el.style.maxWidth = "768px";
  el.style.padding = "12px 20px";
  el.style.borderRadius = "9999px";
  el.style.background = complete ? "rgba(120, 95, 35, 0.55)" : "rgba(20, 20, 24, 0.55)";
  el.style.backdropFilter = "blur(10px)";
  (el.style as { webkitBackdropFilter?: string }).webkitBackdropFilter = "blur(10px)";
  el.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.35)";
  el.style.color = "rgba(255, 255, 224, 1)";
  el.style.fontFamily = GAME_FONT_FAMILY;
  el.style.fontSize = "16px";
  el.style.fontWeight = "500";
  el.style.lineHeight = `${LINE_HEIGHT}px`;
  el.style.opacity = "0";

  // Checklist-style prefix: plain ring (no progress data), a clockwise
  // conic-gradient pie (qty/totalQty given, not yet complete), or filled
  // with a checkmark (complete).
  const circle = document.createElement("div");
  circle.style.flexShrink = "0";
  circle.style.width = `${LINE_HEIGHT}px`;
  circle.style.height = `${LINE_HEIGHT}px`;
  circle.style.borderRadius = "50%";
  circle.style.display = "flex";
  circle.style.alignItems = "center";
  circle.style.justifyContent = "center";
  if (complete) {
    circle.style.background = "#fbbf24";
    circle.style.color = "#422006";
    circle.style.fontSize = "13px";
    circle.style.fontWeight = "700";
    circle.style.lineHeight = "1";
    circle.textContent = "✓";
  } else if (qty !== undefined && totalQty !== undefined && totalQty > 0) {
    // conic-gradient starts at 12 o'clock and fills clockwise by default —
    // exactly "clockwise" progress-pie behavior, no extra angle needed.
    const deg = Math.round((qty / totalQty) * 360);
    circle.style.background = `conic-gradient(#fbbf24 ${deg}deg, rgba(255, 255, 255, 0.2) ${deg}deg 360deg)`;
  } else {
    circle.style.border = "2px solid rgba(255, 255, 224, 1)";
  }
  el.appendChild(circle);

  // Auto-rendered, same rule as the journal list (JournalPanel) — never
  // typed into `description` by hand.
  const text = document.createElement("span");
  text.textContent =
    qty !== undefined && totalQty !== undefined
      ? `(${qty}/${totalQty}) ${description}`
      : description;
  el.appendChild(text);

  // This toast's own slot, computed once from whatever's already stacked —
  // fixed at creation, not animated, so it never fights the entrance
  // tween's own transform below. repositionToasts() only ever touches
  // *other* toasts, shifting them on a later removal.
  let top = canvas.top + MARGIN_TOP;
  for (const toast of activeToasts) top += toast.offsetHeight + GAP;
  el.style.top = `${top}px`;

  document.body.appendChild(el);
  activeToasts.push(el);

  const state = { opacity: 0, y: -8 };
  const apply = () => {
    el.style.opacity = `${state.opacity}`;
    el.style.transform = `translateY(${state.y}px)`;
  };
  apply();

  // Guards cleanup() itself against running twice — natural completion and
  // a caller's later stop() call could otherwise both fire it (e.g. stop()
  // called after it already auto-dismissed), which would double-fire
  // onComplete.
  let done = false;
  function cleanup() {
    if (done) return;
    done = true;
    el.remove();
    const i = activeToasts.indexOf(el);
    if (i !== -1) activeToasts.splice(i, 1);
    repositionToasts();
    onComplete?.();
  }

  const intro = gsap.timeline();
  intro.to(state, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", onUpdate: apply });

  if (hold === "infinite") {
    // Intro plays, then the timeline simply has nothing left queued — the
    // toast just sits fully visible until stop() ends it manually.
  } else {
    intro.to(state, { opacity: 1, duration: hold, onUpdate: apply }).to(state, {
      opacity: 0,
      duration: 0.4,
      ease: "power1.in",
      onUpdate: apply,
      onComplete: cleanup,
    });
  }

  return () => {
    intro.kill(); // never fires onComplete — cleanup is explicit below
    gsap.to(state, {
      opacity: 0,
      duration: 0.4,
      ease: "power1.in",
      onUpdate: apply,
      onComplete: cleanup,
    });
  };
}

export interface QuestCompleteBannerOptions {
  /** Headline text — e.g. "Quest Complete!" or the quest's own description. Caller's choice; nothing is hardcoded here. */
  text: string;
  /** Seconds fully visible before fading out, or `"infinite"` to hold until `.stop()` is called manually. @default 3 */
  hold?: number | "infinite";
  /** Seconds to wait before appearing. */
  delay?: number;
  /** Runs once the banner has fully faded out and removed itself. */
  onComplete?: () => void;
}

/**
 * A big, standalone "quest complete" banner, centered near the top of the
 * screen — distinct from this file's small stacking pill, for the one
 * standout moment a quest actually finishes (modeled after Sky: Children
 * of the Light's own "Daily Quest Complete" banner). Draws in as a thin
 * horizontal line that widens, then thickens into the full banner as the
 * text fades in; holds; fades out.
 *
 * Takes a bare string as shorthand for `{ text }` — same two-form idea as
 * `DialogueInput` (`string | {...}`) in `dialogue.ts` — or the full options
 * object when `hold`/`delay`/`onComplete` are needed too.
 *
 * Doesn't stack with `playQuestToast` or touch `GAME_STATE.quests` — call
 * it separately, explicitly, same reasoning as that one.
 *
 * @example playQuestCompleteBanner("Quest Complete!");
 * @example playQuestCompleteBanner({ text: "Quest Complete!", hold: "infinite" });
 */
export function playQuestCompleteBanner(
  input: string | QuestCompleteBannerOptions,
): QuestToastHandle {
  const options: QuestCompleteBannerOptions = typeof input === "string" ? { text: input } : input;
  const { delay = 0 } = options;

  let pending: gsap.core.Tween | null = null;
  let stopInner: (() => void) | null = null;

  const start = () => {
    audioPlaySound("level_complete");
    stopInner = runBanner(options);
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

function runBanner(options: QuestCompleteBannerOptions): () => void {
  const { text, hold = 3, onComplete } = options;

  const canvas = getCanvasRect();

  const el = document.createElement("div");
  el.className = "game-effect-overlay";
  el.style.left = `${canvas.left + canvas.width / 2}px`; // translateX(-50%) below centers it on this point
  el.style.top = `${canvas.top + canvas.height * 0.16}px`;
  el.style.width = `${Math.min(canvas.width * 0.9, 640)}px`;
  el.style.padding = "22px 32px";
  el.style.borderRadius = "9999px";
  el.style.background = "rgba(20, 20, 24, 0.6)";
  el.style.backdropFilter = "blur(12px)";
  (el.style as { webkitBackdropFilter?: string }).webkitBackdropFilter = "blur(12px)";
  el.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.4)";
  el.style.textAlign = "center";
  document.body.appendChild(el);

  const textEl = document.createElement("div");
  textEl.textContent = text;
  textEl.style.color = "rgba(255, 255, 224, 1)";
  textEl.style.fontFamily = GAME_FONT_FAMILY;
  textEl.style.fontSize = "26px";
  textEl.style.fontWeight = "700";
  textEl.style.letterSpacing = "0.03em";
  textEl.style.opacity = "0";
  el.appendChild(textEl);

  let done = false;
  function cleanup() {
    if (done) return;
    done = true;
    el.remove();
    onComplete?.();
  }

  // Intro has two distinct phases, not one: scaleX draws the "line" out
  // first (while scaleY stays near-flat), *then* scaleY thickens it into
  // the full banner — text stays invisible until the box is nearly full
  // height, so it never renders visibly squashed mid-transform.
  const state = { scaleX: 0, scaleY: 0.04, opacity: 1, textOpacity: 0 };
  const applyBox = () => {
    el.style.transform = `translateX(-50%) scaleX(${state.scaleX}) scaleY(${state.scaleY})`;
    el.style.opacity = `${state.opacity}`;
  };
  const applyText = () => {
    textEl.style.opacity = `${state.textOpacity}`;
  };
  applyBox();
  applyText();

  const intro = gsap
    .timeline()
    .to(state, { scaleX: 1, duration: 0.35, ease: "power2.out", onUpdate: applyBox })
    .to(state, { scaleY: 1, duration: 0.3, ease: "power2.out", onUpdate: applyBox })
    .to(state, { textOpacity: 1, duration: 0.25, onUpdate: applyText }, "-=0.1");

  if (hold !== "infinite") {
    intro.to(
      state,
      {
        opacity: 0,
        textOpacity: 0,
        duration: 0.5,
        ease: "power1.in",
        onUpdate: () => {
          applyBox();
          applyText();
        },
        onComplete: cleanup,
      },
      `+=${hold}`,
    );
  }

  return () => {
    intro.kill();
    gsap.to(state, {
      opacity: 0,
      textOpacity: 0,
      duration: 0.5,
      ease: "power1.in",
      onUpdate: () => {
        applyBox();
        applyText();
      },
      onComplete: cleanup,
    });
  };
}

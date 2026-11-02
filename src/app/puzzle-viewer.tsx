import { GAME_STATE } from "@/features/game-state";
import { bagIncItem } from "@/lib/bag";
import { playQuestCompleteBanner, playQuestToast } from "@/lib/effects/quest-toast";
import { img } from "@/lib/img";
import { setQuestProgress, setQuestStatus } from "@/lib/quests";
import gsap from "gsap";
import { LucideFlipHorizontal2, LucideFlipVertical2, LucideRotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const LAYER_SRCS = [img("puzzle/tp1.png"), img("puzzle/tp2.png"), img("puzzle/tp3.png")];
const REVEAL_SRC = img("treasure/cheryl_birthday_postcard_sketch.jpg");

interface LayerTransform {
  flipH: boolean;
  flipV: boolean;
  rotation: 0 | 180;
}

/**
 * One correct orientation per layer. Each tp*.png already has its own
 * scatter *and* starting orientation baked into its pixels (these are real
 * exported puzzle pages, not generated at runtime) — this isn't `identity`
 * for any of them. Found by compositing every flipH/flipV/rotation
 * candidate per layer and comparing against `puzzle/tp-all.png` (the
 * known-correct assembled reference); this combination won by a wide
 * margin (score 0.21 vs. 0.85 runner-up).
 *
 * Only *one* representative per layer is listed — flipping both axes is
 * geometrically identical to rotating 180°, so e.g. layer 3's `{F,F,180}`
 * here and `{T,T,0}` render pixel-identical and are equally "correct".
 * `transformsEquivalent` below compares by actual geometric effect rather
 * than exact field equality, so every such equivalent combination is
 * accepted automatically — this doesn't need updating for a new photo, a
 * different scramble, or even a future square-tile puzzle with 90°
 * rotation (a case with *more* equivalences than this portrait one has).
 */
const SOLUTION: LayerTransform[] = [
  { flipH: false, flipV: true, rotation: 0 },
  { flipH: true, flipV: false, rotation: 0 },
  { flipH: false, flipV: false, rotation: 180 },
];

// --- Completion sequence timing — tune here, nothing else needs to change ---
const TRANSFORM_DURATION = 0.5; // seconds per flip/rotate tween
const TRANSFORM_EASE = "power2.inOut";
const SOLVE_VIEW_DELAY = 1.2; // seconds the player gets to see the solved puzzle before the flash
const FLASH_FADE_DURATION = 0.9; // seconds for the white flash to fade out, revealing the sketch underneath

const IDENTITY: LayerTransform = { flipH: false, flipV: false, rotation: 0 };

/** The 2x2 linear part of the same `rotate(θ) · scale(flipH?-1:1, flipV?-1:1)`
 * composition `tweenLayer`/`applyTransform`-style rendering actually applies —
 * two transforms that resolve to the same matrix always render pixel-identical
 * output, for any image. `Math.round` clears floating-point noise like
 * `cos(180°) === -0.9999999999999999` (rotation is always a multiple of 90°,
 * so cos/sin are always exactly -1, 0, or 1). */
function transformMatrix({ flipH, flipV, rotation }: LayerTransform) {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.round(Math.cos(rad));
  const sin = Math.round(Math.sin(rad));
  const sx = flipH ? -1 : 1;
  const sy = flipV ? -1 : 1;
  return [cos * sx, -sin * sy, sin * sx, cos * sy] as const;
}

/** Compares by actual geometric effect, not exact field equality — e.g.
 * flipping both axes and rotating 180° are different raw values that render
 * identically, so both count as a match. Correct for any rotation/flip
 * combination, not just today's portrait (180°-only) layers — see the
 * `SOLUTION` comment above. */
function transformsEquivalent(a: LayerTransform, b: LayerTransform) {
  const ma = transformMatrix(a);
  const mb = transformMatrix(b);
  return ma.every((v, i) => v === mb[i]);
}

/** Shared by the big stacked layers and their small list thumbnails — both
 * get tweened to the same target whenever a layer's transform changes. */
function tweenLayer(targets: (HTMLImageElement | null)[], transform: LayerTransform) {
  const els = targets.filter((el): el is HTMLImageElement => el !== null);
  if (!els.length) return;
  gsap.to(els, {
    scaleX: transform.flipH ? -1 : 1,
    scaleY: transform.flipV ? -1 : 1,
    rotation: transform.rotation,
    duration: TRANSFORM_DURATION,
    ease: TRANSFORM_EASE,
  });
}

const PAPER_LABELS = ["ZZ's Tracing Paper 1", "ZZ's Tracing Paper 2", "ZZ's Tracing Paper 3"];

export function PuzzleViewer({
  onClose,
  onSolved,
}: {
  onClose: () => void;
  /** Fires the moment quest state actually changes below — `GAME_STATE.quests`
   * is a plain external Map, not React state, so mutating it here doesn't by
   * itself make an already-mounted JournalPanel re-render. This is how its
   * parent (BagPanel) finds out it needs to force that re-read. */
  onSolved?: () => void;
}) {
  const [layers, setLayers] = useState<LayerTransform[]>(() => LAYER_SRCS.map(() => IDENTITY));
  const [phase, setPhase] = useState<"playing" | "completing" | "solved">("playing");

  const solvedRefs = useRef<HTMLImageElement | null>(null);
  const stackRefs = useRef<(HTMLImageElement | null)[]>([]);
  const thumbRefs = useRef<(HTMLImageElement | null)[]>([]);
  const flashRef = useRef<HTMLDivElement>(null);

  // Animate every layer toward its current state whenever it changes — the
  // only place GSAP gets called for flip/rotate, so tweaking the feel later
  // (easing, duration, even swapping scaleX for a skew-based "page turn")
  // only ever means editing this one effect.
  useEffect(() => {
    layers.forEach((layer, i) => {
      tweenLayer([stackRefs.current[i], thumbRefs.current[i]], layer);
    });
  }, [layers]);

  // The completion sequence itself — isolated in its own effect/timeline so
  // it's the one place to edit when this "for now" placeholder gets
  // replaced with something fancier later.
  useEffect(() => {
    if (phase === "solved") {
      gsap.to(flashRef.current, { opacity: 0, duration: FLASH_FADE_DURATION, ease: "power2.out" });
      gsap.set(solvedRefs.current, { opacity: 1 });
      // gsap.to(solvedRefs.current, { opacity: 1, duration: 1 });
      const questCatchSheets = GAME_STATE.quests.get("catch_sheets")!;

      if (questCatchSheets.status !== "resolved") {
        bagIncItem("sketch", 1);
        setQuestProgress(questCatchSheets, 3);
        setQuestStatus(questCatchSheets, "resolved");
        onSolved?.();
        gsap.delayedCall(1, () => {
          playQuestCompleteBanner(`Completed!`);
          playQuestToast({
            description: GAME_STATE.quests.get("catch_sheets")!.description,
            qty: 3,
            totalQty: 3,
          });
        });
      }
      return;
    }

    if (phase !== "completing" || !flashRef.current) return;

    const tl = gsap.timeline({ onComplete: () => setPhase("solved") });
    tl.to({}, { duration: SOLVE_VIEW_DELAY }); // let the player see the solved puzzle first
    tl.set(flashRef.current, { opacity: 1 }); // sudden flash — set, not tweened in
    // tl.to(flashRef.current, { opacity: 0, duration: FLASH_FADE_DURATION, ease: "power2.out" });

    return () => {
      tl.kill();
    };
  }, [phase, onSolved]);

  // Checked here, in the event that causes the change, rather than reactively
  // in a useEffect watching `layers` — React flags setState-in-an-effect as
  // an unnecessary extra render pass when the triggering event is already
  // known (see react.dev/.../set-state-in-effect).
  function updateLayer(index: number, update: Partial<LayerTransform>) {
    if (phase !== "playing") return;
    const next = layers.map((l, i) => (i === index ? { ...l, ...update } : l));
    setLayers(next);
    if (next.every((l, i) => transformsEquivalent(l, SOLUTION[i]))) {
      setPhase("completing");
    }
  }
  const flipH = (index: number) => updateLayer(index, { flipH: !layers[index].flipH });
  const flipV = (index: number) => updateLayer(index, { flipV: !layers[index].flipV });
  const rotate = (index: number) =>
    updateLayer(index, { rotation: layers[index].rotation === 0 ? 180 : 0 });

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-8"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[720px] w-full max-w-4xl gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Larger column — the stacked puzzle itself, or the reveal once solved */}
        <div className="relative aspect-2/3 h-full overflow-hidden rounded-xl border-2 border-amber-800 bg-linear-to-b from-white to-amber-50 shadow-[0_0_24px_rgba(0,0,0,0.6)]">
          {phase === "solved" ? (
            <img
              ref={solvedRefs}
              src={REVEAL_SRC}
              alt="The assembled Heart Photo"
              className="h-full w-full object-contain"
            />
          ) : (
            LAYER_SRCS.map((src, i) => (
              <img
                key={src}
                ref={(el) => {
                  stackRefs.current[i] = el;
                }}
                src={src}
                alt={`Tracing paper ${i + 1}`}
                className="absolute inset-0 h-full w-full object-contain"
              />
            ))
          )}
          <div ref={flashRef} className="pointer-events-none absolute inset-0 bg-white opacity-0" />
        </div>

        {/* Smaller column — one paper per row, each with its own flip/rotate controls */}
        <div className="flex w-56 shrink-0 flex-col gap-3 overflow-y-auto">
          {LAYER_SRCS.map((src, i) => (
            <div
              key={src}
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-amber-800/60 bg-linear-to-b from-white to-amber-50 p-3 shadow-[0_0_8px_rgba(0,0,0,0.3)]"
            >
              <div className="h-24 w-16 overflow-hidden rounded bg-linear-to-b from-white to-amber-100">
                <img
                  ref={(el) => {
                    thumbRefs.current[i] = el;
                  }}
                  src={src}
                  alt={PAPER_LABELS[i]}
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="font-game text-xs font-bold text-amber-950">{PAPER_LABELS[i]}</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={phase !== "playing"}
                  onClick={() => flipH(i)}
                  className="rounded-md border-2 border-amber-800 bg-amber-50 p-1.5 text-amber-950 hover:bg-amber-100 disabled:opacity-40 disabled:hover:bg-amber-50"
                  aria-label={`Flip ${PAPER_LABELS[i]} horizontally`}
                >
                  <LucideFlipHorizontal2 size={16} />
                </button>
                <button
                  type="button"
                  disabled={phase !== "playing"}
                  onClick={() => flipV(i)}
                  className="rounded-md border-2 border-amber-800 bg-amber-50 p-1.5 text-amber-950 hover:bg-amber-100 disabled:opacity-40 disabled:hover:bg-amber-50"
                  aria-label={`Flip ${PAPER_LABELS[i]} vertically`}
                >
                  <LucideFlipVertical2 size={16} />
                </button>
                <button
                  type="button"
                  disabled={phase !== "playing"}
                  onClick={() => rotate(i)}
                  className="rounded-md border-2 border-amber-800 bg-amber-50 p-1.5 text-amber-950 hover:bg-amber-100 disabled:opacity-40 disabled:hover:bg-amber-50"
                  aria-label={`Rotate ${PAPER_LABELS[i]}`}
                >
                  <LucideRotateCw size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 size-8 rounded-full border-2 border-amber-800 bg-amber-50 font-game text-lg leading-none text-amber-950 shadow-[2px_2px_0_rgba(0,0,0,0.3)] hover:bg-amber-100"
      >
        ×
      </button>
    </div>
  );
}

import {
  LucideBackpack,
  LucideFootprints,
  LucideMessageCircle,
  LucideMove,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

/**
 * A single physical keycap — etched/pressed look, deliberately NOT styled
 * like a clickable button (this screen's only real button is Start).
 */
function Key({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={`flex items-center justify-center rounded-md border border-white/20 bg-gradient-to-b from-white/15 to-white/5 font-game text-xs font-semibold text-white/90 shadow-[0_2px_0_rgba(0,0,0,0.5)] ${className}`}
    >
      {children}
    </kbd>
  );
}

/** "or" between two alternative keys, small and muted so it never competes with the keys themselves. */
function Or() {
  return <span className="font-game text-xs text-white/40">or</span>;
}

/**
 * One control, icon+word led (so a first-time player doesn't need to
 * already know what "WASD" or "arrow keys" means to get the gist), keys
 * centered underneath. Always a single centered column, never a row that
 * has to line up against a neighbor of different width — that's what kept
 * reading as "asymmetrical": different controls legitimately need
 * different numbers of keys, so the layout has to tolerate that instead of
 * fighting it.
 */
function Control({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <Icon
          className="size-5 text-amber-200/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
          strokeWidth={2}
        />
        <span className="font-game text-sm font-bold text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

/**
 * Boot-time cover — sits over the canvas while the engine runs underneath
 * (assets loaded, first scene entered) and gates player input until the
 * player clicks Start (see `GAME_STATE.gameStarted`'s own doc comment).
 *
 * No card/panel background — a card kept reading as a boxed-in UI chrome
 * element rather than part of the scene. Instead: the screen-wide
 * `backdrop-blur` (already softening the title art behind it) plus a soft
 * radial vignette just behind the content for contrast, and `drop-shadow`
 * on the text/icons themselves — contrast from shadow, not from a filled
 * rectangle with visible edges.
 *
 * Controls are a single centered column (Move, then Talk/Run side by
 * side, then Bag) — deliberately not a grid of equal-looking cells, since
 * forcing Move's 8 keys and Bag's 1 key into same-shaped boxes is what
 * kept looking lopsided. Letting each one be its own natural width,
 * centered on the same axis, is what actually reads as symmetric.
 *
 * Renders on top of `TitleScreen` (`layout.tsx`), which stays mounted
 * underneath, visible through the blur. Eases in on mount (opacity + a
 * small rise) rather than popping in instantly, since it now appears
 * mid-session (after the first keypress dismisses the title) instead of
 * just being there from frame one.
 */
export function StartScreen({
  ready,
  progress,
  onStart,
}: {
  ready: boolean;
  /** 0-1, how far asset preloading has gotten — only meaningful while `!ready`. */
  progress: number;
  onStart: () => void;
}) {
  // Starts false, flips true one frame after mount — gives the browser a
  // first paint at the "entering" state to transition FROM, instead of the
  // transition having nothing to animate from (mounting already at the end
  // state skips it entirely).
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={`absolute inset-0 aspect-video flex items-center justify-center bg-black/25 p-6 backdrop-blur-md transition-all duration-500 ease-out ${
        entered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div className="relative flex w-full max-w-lg flex-col items-center gap-7">
        {/* Soft vignette, not a boxed card — dims the busy art right behind the content without a hard edge. */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 scale-125 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, transparent 70%)",
          }}
        />

        <p className="max-w-sm text-center font-game text-base text-amber-50/95 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
          Everyone in town is busy today — chasing rumors of a hidden treasure. Whoever finds it
          first wins big. Talk to people along the way — a few of them can help you.
        </p>

        <div className="relative flex flex-col items-center gap-3">
          {ready && (
            <div className="absolute inset-0 -z-10 rounded-full bg-amber-400/50 blur-2xl" />
          )}
          <button
            type="button"
            disabled={!ready}
            onClick={(e) => {
              e.currentTarget.blur();
              onStart();
            }}
            className={`rounded-full px-16 py-4 font-game text-xl font-bold tracking-[0.15em] uppercase transition-all ${
              ready
                ? "bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 shadow-[0_0_25px_rgba(251,191,36,0.55)] hover:scale-105 hover:brightness-110 active:scale-95"
                : "cursor-default bg-white/10 text-white/30"
            }`}
          >
            Start
          </button>

          {!ready && (
            <div className="flex w-60 flex-col items-center gap-1.5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-amber-300 transition-[width] duration-200"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <span className="font-game text-xs text-white/50 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                Loading… {Math.round(progress * 100)}%
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-5">
          <Control icon={LucideMove} label="Move">
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-1.5">
                <Key className="size-8">W</Key>
                <Key className="size-8">A</Key>
                <Key className="size-8">S</Key>
                <Key className="size-8">D</Key>
              </div>
              <Or />
              <div className="flex items-center gap-1.5">
                <Key className="size-8">↑</Key>
                <Key className="size-8">←</Key>
                <Key className="size-8">↓</Key>
                <Key className="size-8">→</Key>
              </div>
            </div>
          </Control>

          <div className="flex items-start gap-10">
            <Control icon={LucideMessageCircle} label="Talk">
              <div className="flex items-center gap-1.5">
                <Key className="h-8 w-16">Space</Key>
                <Or />
                <Key className="size-8">Z</Key>
              </div>
            </Control>
            <Control icon={LucideFootprints} label="Run">
              <div className="flex items-center gap-1.5">
                <Key className="h-8 w-14">Shift</Key>
                <Or />
                <Key className="size-8">X</Key>
              </div>
            </Control>
          </div>

          <Control icon={LucideBackpack} label="Bag">
            <Key className="h-8 w-14">Enter</Key>
          </Control>
        </div>
      </div>
    </div>
  );
}

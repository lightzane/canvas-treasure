import { BagPanel } from "@/app/bag-panel";
import { StartScreen } from "@/app/start-screen";
import { TitleScreen } from "@/app/title-screen";
import { GameEngine } from "@/features/game-engine";
import { GAME_STATE } from "@/features/game-state";
import { playIrisReveal } from "@/lib/effects/iris-reveal";
import { PRELOAD_PROGRESS } from "@/lib/preload";
import { useCallback, useEffect, useRef, useState } from "react";

export default function Layout() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Two independent booleans, not one — see GAME_STATE.bagIconVisible/.bagOpen's
  // own doc comments. Conflating "does the icon exist" with "is the panel
  // expanded" was the actual bug here: hiding the icon must also force the
  // panel closed (nothing else would be left to close it), but opening the
  // panel must never imply anything about the icon's own visibility.
  // Seeded FROM GAME_STATE, not with their own separate literal — two
  // independent "default" values for the same flag is exactly how this
  // drifted out of sync before (GAME_STATE.bagIconVisible defaulting true
  // while this started false): there must be only one place that sets it.
  const [bagIconVisible, setBagIconVisibleState] = useState(GAME_STATE.bagIconVisible);
  const [bagOpen, setBagOpenState] = useState(GAME_STATE.bagOpen);
  // Whatever GAME_STATE.movementLocked was the moment the bag opened — a
  // ref, not state, since setBagOpen only ever reads/writes it as a side
  // effect, never something a render needs to react to. Restored (not just
  // cleared) on close, so closing the bag mid-dialogue/cutscene can't
  // release a lock the bag itself didn't set.
  const lockedBeforeBag = useRef(false);
  // Seeded FROM GAME_STATE, same reasoning as bagIconVisible/bagOpen above —
  // one source of truth for the default, not two literals that can drift.
  const [showStartScreen, setShowStartScreen] = useState(!GAME_STATE.gameStarted);
  // Title art is the very first thing shown (its own baked-in "Press Any
  // Key" prompt) — any key reveals StartScreen on top of it, as a
  // translucent/blurred panel (title-screen.jpg stays mounted underneath,
  // visible through that blur, rather than being swapped out). Both this
  // and showStartScreen collapse together once Start is actually clicked.
  const [titleDismissed, setTitleDismissed] = useState(false);
  // Mirrors GameEngine.onReady — local state, not GAME_STATE, since nothing
  // outside React ever needs to read "is the engine ready."
  const [gameReady, setGameReady] = useState(false);
  // 0-1 — polled from PRELOAD_PROGRESS (a plain mutable counter every
  // preload() call anywhere adds to, see its own doc comment) rather than
  // threaded through as a callback, since preload() is already called from
  // many independent scene modules. Stops polling once gameReady fires.
  const [loadProgress, setLoadProgress] = useState(0);

  // useCallback (stable identity, empty deps) rather than a plain function:
  // game.on below is assigned once, inside a mount-only effect, so it
  // captures whatever these point to at that moment forever — a plain
  // function would freeze its closed-over state at mount time too. Reading
  // GAME_STATE.bagIconVisible (always current) instead of the React state
  // variable sidesteps that same staleness for the open-guard below.
  const setBagOpen = useCallback((open: boolean) => {
    if (open && !GAME_STATE.bagIconVisible) return; // see the comment on bagIconVisible in game-state.ts — nothing left to close it otherwise, and the ONLY gate: opening is allowed any time the icon is visible, regardless of movementLocked/dialogue — a scene that truly wants the bag unavailable hides the icon explicitly instead
    if (open) {
      lockedBeforeBag.current = GAME_STATE.movementLocked; // remember whatever it already was (e.g. still mid-dialogue/cutscene) — restored, not just cleared, on close below
      GAME_STATE.movementLocked = true; // lock player movement while the bag itself is open
      GAME_STATE.bagViewedItems.clear(); // fresh session each time the bag opens
    } else {
      GAME_STATE.movementLocked = lockedBeforeBag.current;
    }
    GAME_STATE.bagOpen = open;
    setBagOpenState(open);
    if (!open) {
      const onClose = GAME_STATE.onBagClose;
      GAME_STATE.onBagClose = null; // cleared BEFORE calling — a callback that itself hides the bag icon (e.g. disableAccess) re-enters this same branch synchronously (hudSetBagIconVisible -> setBagIconVisible -> setBagOpen(false) again); leaving the old value in place here would re-fire it, forever. A callback whose own condition isn't met yet re-arms itself explicitly (see overworld.ts's checkSketchCompletion/onParcelBagClose) instead of this auto-persisting it.
      onClose?.(GAME_STATE.bagViewedItems);
    }
  }, []);

  const setBagIconVisible = useCallback(
    (visible: boolean) => {
      GAME_STATE.bagIconVisible = visible;
      setBagIconVisibleState(visible);
      if (!visible) setBagOpen(false);
    },
    [setBagOpen],
  );

  useEffect(() => {
    if (titleDismissed) return;
    const dismiss = () => setTitleDismissed(true);
    window.addEventListener("keydown", dismiss, { once: true });
    return () => window.removeEventListener("keydown", dismiss);
  }, [titleDismissed]);

  // Nothing persists yet (no save system), so a refresh/close/navigate-away
  // loses all progress — warn before that happens, but only once there's
  // real progress to lose (GAME_STATE.gameStarted), not from the title/
  // start screen itself. Reads gameStarted fresh at event time rather than
  // depending on a React state mirror, since nothing here needs a
  // re-render when it flips — a mount-once listener is enough. Browsers no
  // longer allow a custom message in this dialog (always their own generic
  // text) — `preventDefault()` + `returnValue` is just what triggers it at
  // all, per spec/Chrome's legacy requirement.
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (!GAME_STATE.gameStarted) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    if (gameReady) return;
    let raf: number;
    const poll = () => {
      const { loaded, total } = PRELOAD_PROGRESS;
      setLoadProgress(total > 0 ? loaded / total : 0);
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [gameReady]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const game = new GameEngine(canvasRef.current);

    game.on = (event) => {
      if (event.type === "menu:bag.open") setBagOpen(event.open);
      if (event.type === "hud:bag-icon.visible") setBagIconVisible(event.visible);
    };
    game.onReady = () => setGameReady(true);

    game.start();

    return () => {
      game.stop();
    };
  }, [setBagOpen, setBagIconVisible]);

  return (
    <div className="w-full min-h-dvh flex justify-center items-center">
      <div className="relative select-none">
        <canvas id="treasure" ref={canvasRef}></canvas>

        {bagIconVisible && (
          <button
            type="button"
            onClick={(e) => {
              // A focused <button> natively re-activates on Enter too — after
              // a mouse click leaves it focused, the same physical Enter
              // press would otherwise fire both this and the global keyboard
              // shortcut (GameEngine.tick()'s justPressed.enter check),
              // toggling twice and looking like it opens-and-closes instantly.
              e.currentTarget.blur();
              setBagOpen(!bagOpen);
            }}
            className="absolute top-4 right-4 transition-transform hover:scale-110 active:scale-95 outline-0"
          >
            <img
              src="/assets/purse.png"
              alt="Bag"
              className="size-16 [image-rendering:pixelated] drop-shadow-[0_0_5px_black]"
            />
            <span
              className="font-game text-xs -top-3 tracking-wider text-shadow-black text-shadow-sm
             relative"
            >
              Bag
            </span>
          </button>
        )}

        {bagOpen && <BagPanel onClose={() => setBagOpen(false)} />}

        {showStartScreen && <TitleScreen />}

        {showStartScreen && titleDismissed && (
          <StartScreen
            ready={gameReady}
            progress={loadProgress}
            onStart={() => {
              setShowStartScreen(false);
              GAME_STATE.gameStarted = true;
              playIrisReveal({
                duration: 3,
                softness: 20,
                onComplete() {
                  GAME_STATE.movementLocked = false;
                },
              }); // same values as overworld's own intro reveal; direction defaults to "in"
            }}
          />
        )}
      </div>
    </div>
  );
}

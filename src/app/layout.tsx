import { GameEngine } from "@/features/game-engine";
import { GAME_STATE } from "@/features/game-state";
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

  // useCallback (stable identity, empty deps) rather than a plain function:
  // game.on below is assigned once, inside a mount-only effect, so it
  // captures whatever these point to at that moment forever — a plain
  // function would freeze its closed-over state at mount time too. Reading
  // GAME_STATE.bagIconVisible (always current) instead of the React state
  // variable sidesteps that same staleness for the open-guard below.
  const setBagOpen = useCallback((open: boolean) => {
    if (open && !GAME_STATE.bagIconVisible) return; // see the comment on bagIconVisible in game-state.ts — nothing left to close it otherwise
    GAME_STATE.bagOpen = open;
    setBagOpenState(open);
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
    if (!canvasRef.current) return;

    const game = new GameEngine(canvasRef.current);

    game.on = (event) => {
      if (event.type === "menu:bag.open") setBagOpen(event.open);
      if (event.type === "hud:bag-icon.visible") setBagIconVisible(event.visible);
    };

    game.start();

    return () => {
      game.stop();
    };
  }, [setBagOpen, setBagIconVisible]);

  return (
    <div className="w-full min-h-dvh flex justify-center items-center">
      <div className="relative">
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

        {bagOpen && (
          <div className="absolute inset-x-4 bottom-4 rounded-xl border-4 border-green-900 bg-[#f8f0d8] p-4 font-game text-green-950 shadow-[4px_4px_0_rgba(0,0,0,0.25)]">
            <div className="mb-1.5 text-lg uppercase">Bag</div>
            <div className="text-sm opacity-70">Empty</div>
          </div>
        )}
      </div>
    </div>
  );
}

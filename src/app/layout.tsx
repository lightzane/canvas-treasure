import { GameEngine } from "@/features/game-engine";
import { useEffect, useRef, useState } from "react";

export default function Layout() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Placeholder bag/inventory panel — see SceneEvent in scene.ts for how a
  // scene would actually trigger this.
  const [showBag, setShowBag] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const game = new GameEngine(canvasRef.current);

    game.on = (event) => {
      if (event.type === "menu:bag.visible") setShowBag(event.visible);
    };

    game.start();

    return () => {
      game.stop();
    };
  }, []);

  return (
    <div className="w-full min-h-dvh flex justify-center items-center">
      <div className="relative">
        <canvas ref={canvasRef}></canvas>

        {showBag && (
          <div className="absolute inset-x-4 bottom-4 rounded-xl border-4 border-green-900 bg-[#f8f0d8] p-4 font-game text-green-950 shadow-[4px_4px_0_rgba(0,0,0,0.25)]">
            <div className="mb-1.5 text-lg uppercase">Bag</div>
            <div className="text-sm opacity-70">Empty</div>
          </div>
        )}
      </div>
    </div>
  );
}

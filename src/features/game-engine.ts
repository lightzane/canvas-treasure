import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/constants/game-settings";
import { Controller } from "@/features/controller";
import { GAME_STATE } from "@/features/game-state";
import type { Scene, SceneEvent, SceneName } from "@/features/scene";
import { flowershopScene } from "@/features/scenes/flowershop";
import { homeScene } from "@/features/scenes/home";
import { mansionScene } from "@/features/scenes/mansion";
import { overworldScene } from "@/features/scenes/overworld";
import { DIALOGUE, dialogueFontReady } from "@/lib/canvas/dialogue";
import { FADE } from "@/lib/canvas/fade-transition";
import { getAllLoadedImages } from "@/lib/load-image";
import { preload } from "@/lib/preload";

const SCENES: Record<SceneName, Scene> = {
  home: homeScene,
  mansion: mansionScene,
  overworld: overworldScene,
  flowershop: flowershopScene,
};

// Caps how much game time a single frame can advance. Without this, any stall
// in the rAF cadence (a GC pause, a brief main-thread hitch, the tab getting
// throttled) produces one abnormally large `dt` — and since movement is
// `speed * dt`, that one frame teleports the player however far they'd have
// walked over the whole stall, instead of just rendering a dropped frame.
// Capping it trades that jump for brief slow motion, which reads as a stutter
// instead of a skip.
const MAX_DT = 1 / 20; // never simulate slower than 20fps-equivalent of game time per frame

function enterScene(from: SceneName, to: SceneName) {
  const showDuration = SCENES[from].fadeOut ?? 0;
  const hideDuration = SCENES[to].fadeIn ?? 0;
  GAME_STATE.sceneName = to;
  GAME_STATE.sceneElapsed = 0;
  // Otherwise a direction key still held from walking into e.g. an exit
  // trigger immediately re-faces/moves the player next frame, fighting
  // whatever the new scene's own `enter()` just set up.
  GAME_STATE.keys.pressed.length = 0;
  SCENES[to].enter?.();
  FADE.start(showDuration, hideDuration);
}

export class GameEngine {
  /** Overwrite this to listen for scene-emitted events (e.g. `game.on = (event) => {...}`). */
  on: (event: SceneEvent) => void = () => {};

  /**
   * Fires exactly once, right after assets + every scene's `ready` resolve
   * and the first scene's `enter()` has run — the first moment it's safe to
   * let the player act. Assign before calling `.start()`, same as `on`.
   */
  onReady: () => void = () => {};

  private ctx: CanvasRenderingContext2D;
  /** The game controls input by user */
  private controller: Controller;
  /** Stores the rAF id (requestAnimationFrame) */
  private gameLoopId = 0;
  /**
   * Used as elapsed time or delta time to sync devices via
   * time-based instead of frame-rate
   */
  private lastTime = performance.now();
  private lastSceneName: SceneName = GAME_STATE.sceneName;
  private cancelled = false;

  constructor(canvas: HTMLCanvasElement) {
    // Solving the blurredness on text:
    // The canvas's backing pixel buffer must match the screen's actual
    // physical pixel density, not just its CSS size — otherwise, on any
    // display where devicePixelRatio > 1 (e.g. a Retina MacBook screen),
    // the browser's own compositor upscales this whole bitmap to fill the
    // real screen, and everything on it reads as softly blurred. That
    // upscale happens *after* all our drawing — no drawImage/fillText
    // setting (imageSmoothingEnabled, rounding coordinates, ...) can touch
    // it, since it isn't something this code does; it's the browser
    // stretching the finished canvas image to physical pixels. Text shows
    // it more than pixel art because pixel art is already coarse/blocky, so
    // a bit of softening there is far less noticeable.
    const dpr = window.devicePixelRatio || 1;

    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;

    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("2D context not supported");
    ctx.scale(dpr, dpr); // every existing draw call keeps using the same CANVAS_WIDTH x CANVAS_HEIGHT coordinate space
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;

    this.controller = new Controller(GAME_STATE.keys);
  }

  start() {
    window.addEventListener("keydown", this.controller.keydown);
    window.addEventListener("keyup", this.controller.keyup);
    window.addEventListener("blur", this.controller.blur);

    // Called now, not hoisted to module scope — by the time this class can
    // even be constructed, every scene module above has already run its own
    // top-level sprite creation (static ES imports resolve the whole graph
    // first), so `getAllLoadedImages()` here genuinely captures every image
    // in the game, not just whichever ones happened to exist yet at some
    // earlier eval time. See that function's own doc comment.
    const allImagesReady = preload(getAllLoadedImages());
    const scenesReady = Object.values(SCENES).map((scene) => scene.ready ?? Promise.resolve());

    Promise.all([allImagesReady, dialogueFontReady, ...scenesReady])
      .then(() => {
        if (this.cancelled) return;
        SCENES[GAME_STATE.sceneName].enter?.();
        this.gameLoopId = requestAnimationFrame(this.tick);
        this.onReady?.();
      })
      .catch((err) => console.error(err));
  }

  stop() {
    this.cancelled = true;
    cancelAnimationFrame(this.gameLoopId);
    window.removeEventListener("keydown", this.controller.keydown);
    window.removeEventListener("keyup", this.controller.keyup);
    window.removeEventListener("blur", this.controller.blur);
  }

  // class-field arrow: `this` stays bound without a manual .bind() call
  // if not arrow, then in constructor we need to manually bind:
  // `this.tick = this.tick.bind(this);`
  private tick = (time: number) => {
    this.gameLoopId = requestAnimationFrame(this.tick);
    // const dt = (time - this.lastTime) / 1000; // delta time in seconds
    // ^ classic game-loop bug: uncapped dt. Any rAF stall (GC pause, a main-thread
    // hitch, tab throttling) produces one abnormally large dt here, and since
    // movement is `speed * dt`, that single frame teleports the player however far
    // they'd have walked over the whole stall — reads as "pause, then jump forward."
    // Capping it below trades that jump for brief slow motion instead.
    const dt = Math.min((time - this.lastTime) / 1000, MAX_DT); // delta time in seconds, capped against rAF stalls
    this.lastTime = time;

    const scene = SCENES[GAME_STATE.sceneName];
    scene.on = this.on;
    GAME_STATE.emit = this.on; // scene-agnostic equivalent of the line above — see its doc comment in game-state.ts
    scene.update(dt);
    GAME_STATE.sceneElapsed += dt;

    const sceneChanged = GAME_STATE.sceneName !== this.lastSceneName;
    const sceneExpired = scene.duration !== undefined && GAME_STATE.sceneElapsed >= scene.duration;

    if (sceneChanged) enterScene(this.lastSceneName, GAME_STATE.sceneName);
    else if (sceneExpired) enterScene(this.lastSceneName, scene.next!);

    this.lastSceneName = GAME_STATE.sceneName;

    FADE.update(dt);
    DIALOGUE.update(dt);

    // Skip drawing while still showing the overlay — otherwise whatever this
    // scene draws bleeds through the still-transparent overlay before the
    // swap is actually hidden. The canvas just keeps the last painted
    // (frozen) frame in the meantime, since nothing draws over it.
    if (FADE.phase !== "show") {
      this.ctx.fillStyle = "black";
      this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      scene.draw(this.ctx, dt);
      DIALOGUE.draw(this.ctx);
    }

    FADE.draw(this.ctx);

    // A universal shortcut, not tied to any one scene. Closing is always
    // allowed. Opening gates on bagIconVisible alone — not DIALOGUE.isActive
    // or movementLocked, which aren't about bag availability at all, just
    // about movement/dialogue. A scene that genuinely wants the bag
    // unavailable during a cutscene calls hudSetBagIconVisible(false)
    // explicitly, same as it already does for every other such moment —
    // that's the one real signal, not a side effect of locking movement.
    // The open-guard in layout.tsx's setBagOpen double-checks this anyway,
    // this just avoids firing the event pointlessly.
    if (GAME_STATE.keys.justPressed.enter) {
      if (GAME_STATE.bagOpen) this.on?.({ type: "menu:bag.open", open: false });
      else if (GAME_STATE.bagIconVisible) {
        this.on?.({ type: "menu:bag.open", open: true });
      }
    }

    // Spent for this frame — a keydown sets it again for the next one.
    GAME_STATE.keys.justPressed.z = false;
    GAME_STATE.keys.justPressed.x = false;
    GAME_STATE.keys.justPressed.enter = false;

    // DEBUG: Center of the canvas
    // this.ctx.fillStyle = "rgba(255, 0, 0, 1)";
    // this.ctx.fillRect(CANVAS_WIDTH / 2 - 5, CANVAS_HEIGHT / 2 - 5, 10, 10);
  };
}

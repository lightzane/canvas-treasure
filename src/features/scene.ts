export type SceneName = "home" | "overworld";

/**
 * Canvas-scene → HTML-UI bridge. A scene calls `this.on?.(event)` at
 * whatever moment it decides (a keypress, a dialogue completing, ...);
 * `GameEngine` forwards it to whoever set `game.on` (React, typically).
 *
 * No scene calls this yet — currently just a placeholder demonstrating the
 * canvas ↔ HTML UI wiring (see `layout.tsx`'s bag panel). Wire up a real
 * trigger when there's an actual bag/inventory to open, e.g. in a scene's
 * `update()`:
 *
 * @example
 * update(dt) {
 *   if (GAME_STATE.keys.actions.x) this.on?.({ type: "menu:bag.visible", visible: true });
 * }
 */
export type SceneEvent = { type: "menu:bag.visible"; visible: boolean };

interface SceneBase {
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D, dt: number): void;
  /** This scene's own reveal duration, in seconds; unset = instant. */
  fadeIn?: number;
  /** This scene's own exit duration, in seconds; unset = instant. */
  fadeOut?: number;
  /** Resolves once this scene's own images are loaded. Omit if it has none of its own. */
  ready?: Promise<void>;
  /**
   * Runs once, after `ready` resolves, each time this scene becomes active.
   * Spawn/position scene-local entities here — image sizes (and so
   * `spawnAtTile`) are only reliable once `ready` has resolved.
   */
  enter?(): void;
  /** Set by `GameEngine` each frame — call this to notify outside listeners (e.g. React). See `SceneEvent` for a worked example. */
  on?: (event: SceneEvent) => void;
}

/** `duration` and `next` are a pair — set both to auto-transition, or neither. */
type SceneTransition =
  | { duration: number; next: SceneName } //
  | { duration?: never; next?: never };

export type Scene = SceneBase & SceneTransition;

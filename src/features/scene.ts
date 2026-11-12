export type SceneName =
  | "home"
  | "mansion"
  | "overworld"
  | "flowershop"
  | "teashop"
  | "house_huazelei";

/**
 * Canvas-scene → HTML-UI bridge. A scene calls `this.on?.(event)` at
 * whatever moment it decides (a keypress, a dialogue completing, ...);
 * `GameEngine` forwards it to whoever set `game.on` (React, typically).
 *
 * Two independent bag-related events, not one — see `GAME_STATE.bagOpen`
 * and `.bagIconVisible`'s own doc comments for why these are kept separate
 * (whether the panel is expanded vs. whether the icon exists at all).
 *
 * `"menu:bag.open"` is actually fired from `GameEngine.tick()` itself (the
 * Enter-key shortcut, scene-agnostic — see the comment there), not from any
 * one scene's own `update()`. A scene would still reach for this event for
 * something scene-specific instead, e.g. hiding the icon during a cutscene:
 *
 * @example
 * enter() {
 *   this.on?.({ type: "hud:bag-icon.visible", visible: false }); // a cutscene scene, say
 * }
 */
export type SceneEvent =
  | { type: "menu:bag.open"; open: boolean }
  | { type: "hud:bag-icon.visible"; visible: boolean };

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

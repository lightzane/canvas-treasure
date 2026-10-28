import { GAME_STATE } from "@/features/game-state";

export type Direction = "w" | "a" | "s" | "d";
export type ActionKey = "z" | "x";

// prettier-ignore
const KEY_TO_DIRECTION: Record<string, Direction> = {
  w: "w", ArrowUp: "w",
  a: "a", ArrowLeft: "a",
  s: "s", ArrowDown: "s",
  d: "d", ArrowRight: "d",
};

const KEY_TO_ACTION: Record<string, ActionKey> = { z: "z", x: "x", " ": "z" };

/** `KeyboardEvent.key` reflects Shift/CapsLock state (e.g. "W" with CapsLock on) — normalize single-character keys to lowercase so letter lookups aren't case-sensitive. Multi-character keys (ArrowUp, Shift, ...) are left as-is. */
const normalizeKey = (key: string) => (key.length === 1 ? key.toLowerCase() : key);

export class Controller {
  private readonly keys: (typeof GAME_STATE)["keys"];

  constructor(keys: (typeof GAME_STATE)["keys"]) {
    this.keys = keys;
    // bind so `this` stays correct when passed as a bare reference to addEventListener
    this.keydown = this.keydown.bind(this);
    this.keyup = this.keyup.bind(this);
  }

  keydown(e: KeyboardEvent) {
    if (e.key === " ") e.preventDefault(); // stop the browser from scrolling the page, even on repeat

    // OS auto-repeat re-fires keydown continuously while a key is held. State is
    // already up to date from the first press, so repeats are a no-op here —
    // except right after a scene transition clears `pressed`, where a stray
    // repeat would silently refill it before the key was ever actually released.
    if (e.repeat) return;

    const key = normalizeKey(e.key);
    const direction = KEY_TO_DIRECTION[key];
    if (direction) {
      const pressed = this.keys.pressed;
      const existing = pressed.indexOf(direction);
      if (existing !== -1) pressed.splice(existing, 1);

      pressed.push(direction); // most recent
      return;
    }

    const action = KEY_TO_ACTION[key];
    if (action) this.keys.actions[action] = true;
  }

  keyup(e: KeyboardEvent) {
    const key = normalizeKey(e.key);
    const direction = KEY_TO_DIRECTION[key];
    if (direction) {
      const pressed = this.keys.pressed;
      const existing = pressed.indexOf(direction);
      if (existing !== -1) pressed.splice(existing, 1);
      return;
    }

    const action = KEY_TO_ACTION[key];
    if (action) this.keys.actions[action] = false;
  }

  blur() {
    if (!this.keys) return;
    this.keys.pressed.length = 0;
    this.keys.actions.z = false;
    this.keys.actions.x = false;
  }
}

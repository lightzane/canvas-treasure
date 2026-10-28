# Dialogue

A reusable, Game Boy-style text box drawn directly on the canvas — word-wrapped,
paginated, typewriter-revealed, holds one speaker's color per call. Not tied to
any specific scene.

**File:** [`dialogue.ts`](./dialogue.ts)

## Setup

Already wired into the engine — nothing to do per-scene.

- `GameEngine.start()` awaits `dialogueFontReady` before the game loop begins.
- `GameEngine.tick()` calls `DIALOGUE.update(dt)` and `DIALOGUE.draw(ctx)` every
  frame, gated behind the same fade check as scene drawing.
- `Controller` tracks `Z`/`X` into `GAME_STATE.keys.actions`, which `Dialogue`
  reads directly.

Any scene can just import the singleton and call `.show()`:

```ts
import { DIALOGUE } from "@/lib/canvas/dialogue";
```

## Usage

**Plain text** — always renders in black:

```ts
DIALOGUE.show("A wild Pokémon appeared!");
```

**Colored speaker** — one color for this whole call, resets on the next `.show()`:

```ts
DIALOGUE.show({ text: "Let's go, partner!", color: "blue" });
DIALOGUE.show({ text: "You've got this!", color: "#e11d48" }); // hex works too
```

**Multiple messages from one speaker** — shown one after another, each fully
wrapped/paginated on its own:

```ts
DIALOGUE.show(["First message.", "Second message."]);
```

**A conversation with multiple speakers** — `.show()` always starts a brand-new
conversation (discarding whatever was there before); `.queue()` appends one more
segment onto the _current_ one, each keeping its own color:

```ts
DIALOGUE.show("A wild Pokémon appeared!");
DIALOGUE.queue({ text: "Let's go, partner!", color: "blue" });
DIALOGUE.queue({ text: "You've got this!", color: "red" });
```

> [!WARNING]
> Don't mix speakers inside a single `.show()`/`.queue()` array — each call is
> still owned by one speaker/color. Use a separate `.queue()` call per speaker
> instead.

## Controls

- **Hold Z or X**: reveal the current page faster.
- **Press Z or X** once a page is fully revealed: advance to the next page, or
  close the dialogue if it was the last page.

A page never auto-advances just because a key is _held through_ the reveal
finishing — you get a beat to read it before a fresh press moves on.

## Checking state

```ts
if (DIALOGUE.isActive) return; // e.g. skip movement/menu input while text is up
```

`isActive` is `true` from the moment `.show()` is called until the last page
closes.

## Running something after the conversation ends

```ts
DIALOGUE.show("Enemy fainted!");
DIALOGUE.onComplete = () => {
  GAME_STATE.sceneName = "overworld";
};
```

`onComplete` fires once, exactly when the _whole_ conversation finishes (the
last page of the last queued message closes) — not after each individual
`.show()`/`.queue()` message. Every `.show()` resets it to a no-op first, so
set it _after_ `.show()`, and a stale callback from a previous, unrelated
conversation can never accidentally fire.

## Example: showing dialogue on scene entry

```ts
// battle.ts
update() {
  if (GAME_STATE.sceneElapsed === 0) DIALOGUE.show("A wild Pokémon appeared!");
  // ...
}
```

`GAME_STATE.sceneElapsed === 0` is `true` only on a scene's very first `update()`
call (reset by `enterScene()`), so this fires exactly once per battle entry.

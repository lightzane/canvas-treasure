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
- `show()` sets `GAME_STATE.movementLocked = true`; it's released automatically
  once the whole conversation finishes (right before `onComplete` fires, so
  `onComplete` can re-lock it again if it needs to for its own reasons). No
  scene needs to lock/unlock around a `DIALOGUE.show()` call by hand.

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

**Portrait** — a circular "closer look" photo beside the box, same
one-call/resets-on-next-`.show()` lifetime as `color`:

```ts
DIALOGUE.show({ text: "Where are my keys?", portrait: img("characters/dao-ming-si/portrait.png") });
DIALOGUE.queue("Still looking..."); // keeps the same portrait — no need to repeat it
```

It sits in the empty gap to the left of the box (the box is narrower than the
canvas on purpose), not inside it — the box's own text layout never changes,
portrait or not. Crop a source photo to the right spot first with the
`portrait.html` dev tool at the project root (open it directly in a browser;
upload, drag/zoom to position, download a cropped PNG/JPG) — the game clips
whatever image you pass to a circle via CSS at display time, so the file
itself just needs to be a reasonably square crop, not a perfect circle.

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

## Running a side effect between messages

`.queue()` is for text the player taps through. For something that should
just happen — a bounce, a sound, a camera nudge — between two messages,
without waiting for a tap, use `.effect()` instead. `delay` (seconds,
optional) pauses afterward, with the box still showing the previous page,
before the next queued item appears:

```ts
DIALOGUE.show("Something catches her eye.");
DIALOGUE.effect(() => playAttentionBounce(npc), 0.5);
DIALOGUE.queue("...oh!");
```

`.effect()`/`.queue()` can also legally start a sequence on their own — you
don't strictly need a leading `.show()` if the first thing should be a
side effect rather than text:

```ts
DIALOGUE.effect(() => playAttentionBounce(npc));
DIALOGUE.queue("...oh!");
DIALOGUE.onComplete = () => { ... };
```

Set `onComplete` _after_ these calls, not before — same as with `.show()`,
calling `.effect()`/`.queue()` while idle resets it first, so an
`onComplete` set earlier (e.g. by an unrelated prior conversation) can't
accidentally fire again.

`isActive` stays `true` for the whole delay, so anything gated on it (see
below) keeps treating the conversation as still in progress.

### Hiding the portrait during a pause

A portrait inherits across `.queue()`/`.effect()` calls the same way `color`
does — but during an `.effect()` pause (e.g. a speaker walking off before the
conversation continues), nobody's actually speaking, and the previous
message's portrait just sitting there looks wrong. Call `.clearPortrait()`
from inside that `effect()` to hide it for just that pause; the box's current
page keeps showing as usual, only the portrait goes away. It stays hidden
(even through a later `.queue()` that doesn't specify its own) until some
later message explicitly sets a portrait again:

```ts
DIALOGUE.show({ text: "...hold on.", portrait: NPC_PORTRAIT });
DIALOGUE.effect(() => {
  DIALOGUE.clearPortrait();
  walk(npc, [[10, 4]], { animated: true });
}, 1);
DIALOGUE.queue({ text: "Okay, back.", portrait: NPC_PORTRAIT }); // has to be set again
```

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

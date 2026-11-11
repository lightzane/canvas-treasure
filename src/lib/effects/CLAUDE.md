# `effects/` — disposable "drama" cues

Short, triggerable animation effects (reveals, attention cues, notices, ...) —
not scene transitions (that's `FADE`, `src/lib/canvas/fade-transition.ts`),
not core gameplay state.

## The rule: DOM/CSS + GSAP, never canvas-drawn

Every effect here is pure DOM/CSS, animated with GSAP — **never** drawn on
the game `<canvas>`, and **never** requires a line in any scene's own
`draw()`. Call one from anywhere (a scene's `enter()`, a trigger handler,
mid-`update()`, ...) with zero setup:

```ts
import { playIrisReveal } from "@/lib/effects/iris-reveal";
playIrisReveal({ duration: 1.5 });
```

If an effect needs to appear near a game sprite (e.g. the exclamation bubble
popping above an NPC's head), **don't** reach for a canvas-drawn class that
needs constructing, tracking, and a `.draw(ctx)` call wired into the scene.
Instead, read that sprite's on-screen position **once**, at the moment the
effect is triggered — `toScreen(sprite.position)` (`src/lib/canvas/screen.ts`)
gives the canvas-local coordinate; add the canvas element's own
`getBoundingClientRect()` (see the `document.getElementById("treasure")`
lookup in `iris-reveal.ts`/`exclamation-bubble.ts`) to get a real page
coordinate — then build a plain `position: fixed` element from that. This is
fine for anything brief enough that the camera won't have panned
meaningfully during it, which covers most effects here.

`shine.ts` and `exclamation-bubble.ts` are the two exceptions so far — each
for its own reason, but the same adaptation: re-read the target's screen
position every frame via `gsap.ticker.add(reposition)` instead of once at
creation. `shine.ts` is infinite by design (runs until `.stop()`), so the
_camera_ genuinely can pan meaningfully over its lifetime. `exclamation-
bubble.ts` is still a short, bounded, disposable effect (same shape as
everything else here) — but its _target_ can be a followed companion the
player is free to walk up to mid-stride, so the target itself can move
enough during that short lifetime to visibly detach from a one-time
position read. Because its lifetime is already bounded by its own timeline
(unlike `shine.ts`), it needs no `.stop()` handle — the ticker callback is
added once at creation and removed in that same timeline's own
`onComplete`, right alongside the element's own cleanup. Neither is license
to add a canvas-drawn effect — still ask first if a future one seems to
need that.

## Shape every effect follows

- One exported `function play<Name>(...)`, not a class/singleton — each call
  is a fresh, independent, disposable instance (its own DOM element, its own
  GSAP tween). `attention-bounce.ts` is the one exception (tweens an
  existing sprite's own `position.y` instead of creating an element), but it
  still follows the rest of the shape.
- An `options` object (not positional params) with sensible defaults —
  callers only override what they need.
- `delay?: number` — handled by recursing through `gsap.delayedCall(delay, () => play<Name>({ ...options, delay: 0 }))`,
  not by making the caller schedule it themselves.
- `onComplete?: () => void` — fires after the effect has fully finished
  (and, where relevant, after its element has removed itself). An
  infinite-by-design effect (`attention-bounce.ts`'s `hops: "infinite"`,
  `shine.ts`) never fires this — it returns a `{ stop(): void }` handle
  instead, which the caller MUST keep and call once the effect is no longer
  needed. Forgetting to is a real memory leak (an orphaned GSAP tween
  running forever) — see `playAttentionBounce`'s infinite mode for the bug
  this was found from.
- No manual `update(dt)` needed from the game loop — GSAP ticks itself via
  its own internal `requestAnimationFrame`, independent of the canvas game
  loop (same reasoning as `src/lib/cues.ts`).

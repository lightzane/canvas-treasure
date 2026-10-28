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
meaningfully during it, which covers every effect here so far. If a future
effect genuinely needs to track a moving target over a longer duration,
that's a real exception — ask before reaching for canvas.

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
  (and, where relevant, after its element has removed itself).
- No manual `update(dt)` needed from the game loop — GSAP ticks itself via
  its own internal `requestAnimationFrame`, independent of the canvas game
  loop (same reasoning as `src/lib/cues.ts`).

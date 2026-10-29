# Canvas Performance Gotchas

Three real performance bugs hit while building this game's overworld scene.
Each one _looked_ like "the game is laggy" from the outside, but had a
completely different root cause — and two of the three survived an initial
wrong guess before an actual Chrome performance trace proved what was really
happening. Documented here so the next canvas/game project checks for these
up front instead of rediscovering them the hard way.

---

## 1. Blurry sprites, even with identical source art

**Symptom:** an NPC rendered noticeably blurrier than the player, using the
_exact same_ source image.

**Root cause:** `imageSmoothingEnabled` defaults to `true` on a 2D canvas
context — the browser bilinear-smooths any `drawImage` call that lands on a
non-integer destination pixel. For pixel art, that's almost every sprite,
almost every frame, because movement deltas (`speed * dt`) are fractional.

The player specifically looked fine by coincidence, not design: with a
camera that re-centers on the player every frame
(`camera = player.position + constant`), the player's own _screen_ position
algebraically cancels out to a fixed constant — it never actually moves on
screen, only the world scrolls under it. So it always lands on the same
(integer) pixel. Every other sprite has no such cancellation and blurs.

**Fix:** one line, once, right after creating the context:

```ts
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
```

**Checklist:** for any pixel-art canvas renderer, disable image smoothing
explicitly at setup. Don't trust "it looks fine" from testing just one
entity — test something that isn't camera-locked.

**Applied in:** [game-engine.ts:65](../src/features/game-engine.ts#L65)

---

## 2. Big map image → intermittent stutter (two wrong guesses first)

**Symptom:** FPS hiccups in a large outdoor scene, fine in small interior
scenes. The guessing here took two wrong turns before measuring:

- **Wrong guess #1 — redraw cost.** The background (8960×6400px here — a
  single flat PNG covering the whole map) was blitted _in full_ every frame
  via `ctx.drawImage`, even though the canvas only ever shows a ~1280×720
  slice. Cropping the draw call to the camera's visible region (source-rect
  clamping) was real and worth doing, but didn't fix the stutter.
- **Wrong guess #2 — GC pressure.** Theorized that ~229MB of resident
  decoded bitmap (two layers that size ≈ 459MB) was triggering frequent GC
  pauses. Plausible-sounding, but a captured trace showed GC at <1ms total
  — a complete non-factor.
- **Actual cause — synchronous decode thrashing.** A performance trace
  showed ~400ms main-thread blocks recurring every 500-700ms, all tracing
  back to one single image resource (same internal id every time). Chrome's
  image cache couldn't keep both giant layers (background + foreground)
  decoded at once, so it kept evicting and re-decoding whichever one was
  needed next — and decoding a 57-megapixel PNG from scratch costs ~400ms,
  every single time. Cropping the _draw region_ doesn't touch this: Chrome
  has to fully decode the source before it can hand back any cropped
  sub-region at all.

**Fix:** decode once, up front, into an `ImageBitmap`, and hold a live
reference to it:

```ts
// during a loading/preload step, after the source <img> has finished loading
const bitmap = await createImageBitmap(image);
// later, every frame:
ctx.drawImage(bitmap /* ...source + dest rects... */);
```

An `ImageBitmap` you're holding a reference to isn't subject to the same
evict-and-redecode cycle an `HTMLImageElement` is — the real ~400ms cost
still happens, but once, during the loading screen, not every half-second
during gameplay.

**Checklist:**

- Crop/cull draw calls to the camera's viewport instead of blitting a full
  map image every frame — real savings, but only for _draw/composite_ cost.
- Estimate decoded size (`width × height × 4` bytes) for any image whose
  dimensions run into the thousands. If it's large relative to what's
  normally kept resident, pre-decode it via `createImageBitmap()` during a
  loading step and hold the reference — don't rely on the browser's
  implicit decode cache for something that big.
- Draw cost, memory pressure, and decode cost are three _different_ costs
  that can each look identical from the outside ("the game stutters"). Don't
  assume which one it is — see §4.

**Applied in:**

- [viewport-clamp.ts](../src/lib/canvas/viewport-clamp.ts) — `prepareViewportClamped()` ([line 25](../src/lib/canvas/viewport-clamp.ts#L25)) decodes once; `drawViewportClamped()` ([line 44](../src/lib/canvas/viewport-clamp.ts#L44)) draws the clamped region from the decoded bitmap
- Wired into each scene's `ready` (decode) and `draw()` (use): [overworld.ts:58](../src/features/scenes/overworld.ts#L58)/[:107](../src/features/scenes/overworld.ts#L107)/[:112](../src/features/scenes/overworld.ts#L112), [home.ts:51](../src/features/scenes/home.ts#L51)/[:101](../src/features/scenes/home.ts#L101)/[:106](../src/features/scenes/home.ts#L106), [mansion.ts:34](../src/features/scenes/mansion.ts#L34)/[:66](../src/features/scenes/mansion.ts#L66)

---

## 3. `ctx.save()` / `ctx.restore()` in a hot per-sprite path

**Symptom:** stutter persisted even after fixing #2.

**Root cause:** a per-sprite drop-shadow draw wrapped two property changes
(`globalAlpha`, `fillStyle`) in `ctx.save()` / `ctx.restore()`, called twice
a frame (once per visible character). `save()`/`restore()` push and pop the
_entire_ canvas state — transform, clip region, and every other drawing
property, around 15+ values — to protect just two of them. Measured directly
via a CPU profile: this was the single largest main-thread cost in _both_
captured traces (one before and one after the fix in #2), dwarfing
everything else including the decode stalls. It had been there the whole
time, just hidden underneath the bigger problem.

**Fix:** manually snapshot and restore only the properties actually touched:

```ts
const prevAlpha = ctx.globalAlpha;
const prevFillStyle = ctx.fillStyle;
ctx.globalAlpha = 0.3;
ctx.fillStyle = "black";
// ...draw...
ctx.globalAlpha = prevAlpha;
ctx.fillStyle = prevFillStyle;
```

**Checklist:** avoid `ctx.save()`/`ctx.restore()` inside any function called
every frame or once per entity (shadows, per-sprite tinting, text labels
drawn above NPCs, ...). Reserve it for genuinely occasional, full-state
changes (a menu overlay, a scene transition) — not hot per-entity draw code.

**Applied in:**

- [sprite.ts:198](../src/features/sprite.ts#L198) — `Sprite.drawShadow()`
- [interact.ts:120](../src/features/interact.ts#L120) — `drawInteractPrompt()`

---

## 4. Methodology: how #2 and #3 actually got found

Both of the harder bugs above survived an initial guess based on reading the
code. The lesson isn't "guess better" — it's **stop guessing and measure**
once a fix doesn't fully resolve the symptom:

1. **Capture a real trace.** Chrome DevTools → Performance tab → record →
   reproduce the issue for several seconds → export the trace
   (`.json`/`.json.gz`, via the export icon or right-click → "Save
   profile…" on the recorded track).
2. **Don't stop at the top-level event names.** `RunTask` /
   `FireAnimationFrame` / `FunctionCall` only prove "something in your JS
   was slow" — not _what_. The trace's `Profile` / `ProfileChunk` events
   (category `disabled-by-default-v8.cpu_profiler`) contain the actual CPU
   sampling data: a `nodes` table (call frames + parent pointers) and a
   `samples`/`timeDeltas` stream. Reconstructing self-time per function from
   that (attribute the gap between consecutive samples to the
   previous sample's node, walk `parent` to resolve the full call stack) is
   what actually surfaced `save()` and the specific `Decode Image` id —
   neither was visible from the summary categories alone. DevTools' own
   flame chart does this reconstruction visually; a small script works too
   and is diffable across multiple traces.
3. **Compare before/after traces for the same function**, not just the
   headline number. That's what proved fix #2 didn't touch `save()`'s cost
   at all (it was ~7.9s in the _first_ trace, ~2.0s in the _second_ — present
   and dominant in both, ruling out "the new fix caused this"). Keep old
   traces around while iterating on a perf fix instead of discarding them.

---

## Pre-flight checklist for a new canvas/game project

- [ ] `ctx.imageSmoothingEnabled = false` set once, at context creation, for
      any pixel-art renderer.
- [ ] Any single image with a dimension in the thousands: crop draw calls to
      the camera viewport, and pre-decode it via `createImageBitmap()`
      during loading rather than drawing the raw `<img>` element directly.
- [ ] No `ctx.save()`/`ctx.restore()` inside per-frame or per-entity draw
      code — snapshot/restore individual properties by hand instead.
- [ ] When a performance fix doesn't fully resolve the symptom, capture a
      real Performance trace and read the CPU profile's self-time before
      guessing again.

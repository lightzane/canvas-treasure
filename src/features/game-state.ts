import type { Direction } from "@/features/controller";
import type { SceneEvent, SceneName } from "@/features/scene";
import type { Sprite } from "@/features/sprite";
import { PlayerSprite } from "@/features/sprite-player";
import type { TriggerZone, Zone } from "@/features/zone";
import type { BagEntry, ItemName } from "@/lib/bag";
import { QUESTS } from "@/lib/quests";
import { IMGS_DAOMINGSI_IDLE, IMGS_DAOMINGSI_WALK } from "@/sprites/dao-ming-si";
import { IMGS_HUAZELEI_IDLE, IMGS_HUAZELEI_WALK } from "@/sprites/hua-ze-lei";
import { IMGS_JP_IDLE, IMGS_JP_WALK } from "@/sprites/jp";
import { IMGS_MAMA_IDLE } from "@/sprites/mama";
import { IMGS_MEIZUO_IDLE, IMGS_MEIZUO_WALK } from "@/sprites/mei-zuo";
import { IMGS_PAPA_IDLE } from "@/sprites/papa";
import { IMGS_PLAYER_IDLE, IMGS_PLAYER_RUN, IMGS_PLAYER_WALK } from "@/sprites/player";
import { IMGS_XIMEN_IDLE, IMGS_XIMEN_WALK } from "@/sprites/xi-men";

const boxSize = { width: 64 };
const shadowOffset = { y: -3 };

export const GAME_STATE = {
  camera: { x: 0, y: 0 },
  /** Whether `followCamera()` (`lib/map-movement.ts`) re-centers the camera every frame. @default true */
  cameraFollow: true,
  /**
   * Who `followCamera()` re-centers on while `cameraFollow` is true —
   * `null` means "whatever `GAME_STATE.player` currently is," read fresh
   * every frame, not a fixed reference captured once. That matters if
   * `player` itself is ever reassigned later (not currently — it's one
   * `PlayerSprite` for the app's whole life, only ever mutated in place):
   * a field that *defaulted* to `GAME_STATE.player` would freeze on
   * whichever object was current when this was set, going stale after a
   * reassignment; `null` has no such risk since it never captures a
   * reference at all. Set back to `null` (not `GAME_STATE.player`) to
   * restore the default — same reasoning.
   * @default null
   */
  cameraTarget: null as Sprite | null,
  player: new PlayerSprite({
    sprites: { walk: IMGS_PLAYER_WALK, run: IMGS_PLAYER_RUN, idle: IMGS_PLAYER_IDLE },
    initialSprite: "idle",
    shadowOffset,
    moveSpeed: import.meta.env.DEV ? 500 : undefined,
  }),
  jp: new PlayerSprite({
    sprites: { idle: IMGS_JP_IDLE, walk: IMGS_JP_WALK },
    shadowOffset,
    moveSpeed: 50,
  }),
  mama: new PlayerSprite({
    sprites: { idle: IMGS_MAMA_IDLE },
    boxSize,
    shadowOffset,
  }),
  papa: new PlayerSprite({
    sprites: { idle: IMGS_PAPA_IDLE },
    boxSize,
    shadowOffset,
  }),
  daomingsi: new PlayerSprite({
    sprites: { idle: IMGS_DAOMINGSI_IDLE, walk: IMGS_DAOMINGSI_WALK },
    shadowOffset,
  }),
  huazelei: new PlayerSprite({
    sprites: { idle: IMGS_HUAZELEI_IDLE, walk: IMGS_HUAZELEI_WALK },
    shadowOffset,
  }),
  meizuo: new PlayerSprite({
    sprites: { idle: IMGS_MEIZUO_IDLE, walk: IMGS_MEIZUO_WALK },
    shadowOffset,
  }),
  ximen: new PlayerSprite({
    sprites: { idle: IMGS_XIMEN_IDLE, walk: IMGS_XIMEN_WALK },
    shadowOffset,
  }),
  boundaries: [] as Zone[],
  /**
   * Sprites to block the player against by their *live* `collisionBox` —
   * for anything that moves (NPCs, mama, papa). Checked fresh every frame in
   * `attemptMove`, unlike `boundaries`, which is fixed `Zone` rects (walls,
   * furniture) that never move once built. Don't snapshot a moving sprite's
   * `collisionBox` into a `Zone` and push it onto `boundaries` — that freezes
   * it at whatever position it was at that moment, so it stops blocking
   * where the sprite actually is the instant it moves. Rebuilt fresh by each
   * scene's `enter()`, same as `boundaries`/`triggerZones`.
   */
  obstacles: [] as Sprite[],
  triggerZones: [] as TriggerZone[],
  /** Whatever `findFacedTarget()` currently returns — recomputed every frame by the active scene, read by `drawInteractHighlight()`. */
  facedTarget: undefined as Sprite | undefined,
  keys: {
    pressed: [] as Direction[],
    actions: { z: false, x: false, enter: false },
    /** True for exactly one frame — the frame the key actually went down, not every frame it's held. Set by `Controller.keydown`, cleared once per frame by `GameEngine.tick`. */
    justPressed: { z: false, x: false, enter: false },
  },
  /** Seconds the current scene has been active — used by scenes with a `duration`. */
  sceneElapsed: 0,
  /**
   * Where the player should spawn next — set by the *exiting* scene right
   * before it changes `sceneName` (e.g. mansion's exit sets this to
   * somewhere just outside its own overworld doorway), consumed by the
   * destination scene's own `enter()`. Needed for any scene with more than
   * one way in (overworld, reached from home's door, the mansion's door,
   * ...) — falls back to that scene's own default spawn tile when unset
   * (e.g. on a direct game boot, with no prior scene to have set one).
   */
  spawnLocation: undefined as [number, number] | undefined,
  sceneName: "home" as SceneName,
  /**
   * One-shot story-progress flags; doubles as the seed for a future save-game system (see GDD's "Sequence of Events").
   * `true` = complete.
   * Add here conditions / progress that should not be listed under Quests.
   */
  sequence: {
    intro: false,
    mama_parcel: false,
    meet_daomingsi: false,
    meet_huazelei: false,
    chasing_sheet_2: false,
    retrieving_sheet_2: false,
    mama_running_shoes: false,
    mama_starts_bottle: false,
    market_cutscene: false,
    mid_aisle_cutscene: false,
    mid_aisle_lei_cutscene: false,
    mid_aisle_jp_cutscene: false,
    closing_remarks: false,
  },
  quests: QUESTS,
  /**
   * Whether the bag/inventory *icon itself* currently shows at all — e.g.
   * hide it during a cutscene or a scene where opening the bag makes no
   * sense. Independent of `bagOpen` (below) — this is "does the button
   * exist right now," not "is its panel currently expanded." Mutating this
   * directly from canvas code is fine (same as `movementLocked`), but it
   * does NOT by itself make React re-render — to actually change it from a
   * scene, go through `this.on?.({ type: "hud:bag-icon.visible", visible })`
   * (see `SceneEvent` in `scene.ts`) instead of setting this directly;
   * `layout.tsx`'s listener keeps this field and its own React state in
   * lockstep (and force-closes `bagOpen` too, since hiding the icon would
   * otherwise leave an open panel with nothing left to close it).
   */
  bagIconVisible: false,
  /**
   * Whether the bag/inventory *panel* is currently expanded open — toggled
   * by clicking the icon, or forced from a scene via
   * `this.on?.({ type: "menu:bag.open", open })`. Same
   * canvas-can't-rerender-React caveat as `bagIconVisible` above.
   */
  bagOpen: false,
  /**
   * One-shot callback — if set, fires the moment the bag panel actually
   * closes (the × button, clicking the bag icon again, pressing Enter —
   * see `layout.tsx`'s `setBagOpen`), passed the set of item names
   * actually opened/viewed during that session (`bagViewedItems` below),
   * then clears itself automatically — BEFORE being called, not after:
   * a callback that itself hides the bag icon mid-call (e.g. `disableAccess`)
   * re-enters `setBagOpen(false)` synchronously, and if this were still set
   * at that point it would fire again immediately, recursing forever.
   *
   * If the callback's own condition isn't actually met yet (e.g.
   * `!viewed.has("parcel")` — closed without looking), it must re-arm
   * itself explicitly (`GAME_STATE.onBagClose = thisSameFunction`) before
   * returning, rather than relying on anything here to do it — same
   * self-rearming shape `checkSketchCompletion` in overworld.ts already
   * uses. Mutate directly from scene code, same as `movementLocked`/
   * `bagIconVisible` above — no wrapper needed.
   * @default null
   */
  onBagClose: null as ((viewed: ReadonlySet<ItemName>) => void) | null,
  /**
   * Which bag items the player actually opened/viewed during the bag's
   * current (or just-ended) open session — cleared the instant the bag
   * opens, added to by `BagPanel`'s own item-click handlers as the player
   * looks at things, and handed to `onBagClose` right before it fires.
   * Lets a scene tell "closed without ever looking" apart from "looked,
   * then closed."
   */
  bagViewedItems: new Set<ItemName>(),
  bag: new Map<ItemName, BagEntry>([
    ["journal", { type: "item", quantity: 0 }],
    ["treasure", { type: "item", quantity: 0 }],
    ["parcel", { type: "item", quantity: 0 }],
    ["birthday_postcard", { type: "item", quantity: 0 }],
    ["sketch", { type: "item", quantity: 0 }],
    ["papers", { type: "item", quantity: 0 }],
    ["paper1", { type: "item", quantity: 0 }],
    ["paper2", { type: "item", quantity: 0 }],
    ["paper3", { type: "item", quantity: 0 }],
    ["treasure_map", { type: "item", quantity: 0 }],
    ["shears", { type: "item", quantity: 0 }],
    // ["shoes", { type: "equip" }], // TODO: comment this OUT on production
  ]),
  /**
   * Whether the player has clicked "Start" on the boot-time Start screen yet.
   * The ONLY place this is ever set `true` is that click handler (wired in
   * layout.tsx). Deliberately separate from `movementLocked`: that flag is
   * each scene's own tool, flipped on/off all game long for its own
   * cutscenes/dialogue — reusing it here would mean the Start screen either
   * fighting whatever lock dance is mid-flight at boot, or having to restore
   * the exact scene state on click. This is a one-way, app-boot-only gate
   * ANDed on top instead: starts `false`, flips `true` once, never resets.
   * Checked alongside `movementLocked` at the same two sites that already
   * read it (`movePlayer`, `interact.ts`'s `canAct`) — not tied to
   * `sceneName`/`sequence`, so it gates every boot unconditionally,
   * regardless of any dev shortcut currently set there.
   * @default false
   */
  gameStarted: false,
  /** Blocks player input in `movePlayer`. Starts locked — each scene's `enter()` releases it once it's actually ready (and re-locks it for its own exits/cutscenes, e.g. home's exit trigger). */
  movementLocked: true,
  /** Whether running (hold X, with shoes) is allowed in the current scene — default on; a cramped interior (home, mansion) sets this `false` in its own `enter()`. Takes priority over everything else: no shoes, no X held, none of it matters here if this is `false`. */
  allowRunning: true,
  /**
   * Canvas → HTML-UI bridge, scene-agnostic — kept correctly pointed at the
   * live React listener by `GameEngine.tick()`, every frame, the same way
   * (and for the same reason) it keeps each individual scene's own `.on`
   * up to date: a captured reference grabbed too early (e.g. in a scene's
   * `enter()`, before the first tick has ever run) can be stale forever.
   * Prefer a small wrapper in `src/lib/hud.ts` (e.g. `setBagIconVisible`)
   * over calling this directly from scene code.
   */
  emit: (() => {}) as (event: SceneEvent) => void,
};

import type { Direction } from "@/features/controller";
import type { SceneEvent, SceneName } from "@/features/scene";
import type { Sprite } from "@/features/sprite";
import { PlayerSprite } from "@/features/sprite-player";
import type { TriggerZone, Zone } from "@/features/zone";
import { preload } from "@/lib/preload";
import { IMGS_DAOMINGSI_IDLE, IMGS_DAOMINGSI_WALK } from "@/sprites/dao-ming-si";
import { IMGS_HUAZELEI_IDLE, IMGS_HUAZELEI_WALK } from "@/sprites/hua-ze-lei";
import { IMGS_MAMA_IDLE } from "@/sprites/mama";
import { IMGS_MEIZUO_IDLE } from "@/sprites/mei-zuo";
import { IMGS_PAPA_IDLE } from "@/sprites/papa";
import { IMGS_PLAYER_IDLE, IMGS_PLAYER_RUN, IMGS_PLAYER_WALK } from "@/sprites/player";

/**
 * Every item the bag can hold — extend this union as new items get added,
 * e.g. once the shears exist: `"parcel" | "shears" | "shoes"`. Keeps
 * `GAME_STATE.bag.get`/`.set` calls typo-checked at compile time instead of
 * silently failing.
 */
export type ItemName = "parcel" | "shoes";

/**
 * A bag slot's own value — `"item"` is stackable (a quantity you pick up
 * more of, like the parcel), `"equip"` is a single worn piece (Running
 * Shoes) with no meaningful count of its own. Use `hasItem()`
 * (`@/features/bag`) to check "does the player have this" rather than
 * reading `.quantity` directly — a present `"item"` entry at `quantity: 0`
 * (not yet picked up) is a real, distinct case from not having the entry at
 * all, and `.get(name)` alone being truthy doesn't tell them apart (the
 * entry object itself is always truthy, even at quantity 0).
 */
export type BagEntry = { type: "item"; quantity: number } | { type: "equip"; quantity?: number };

export const GAME_STATE = {
  camera: { x: 0, y: 0 },
  player: new PlayerSprite({
    sprites: { walk: IMGS_PLAYER_WALK, run: IMGS_PLAYER_RUN, idle: IMGS_PLAYER_IDLE },
    initialSprite: "idle",
    shadowOffset: { y: -3 },
    moveSpeed: 500,
  }),
  mama: new PlayerSprite({ sprites: { idle: IMGS_MAMA_IDLE } }),
  papa: new PlayerSprite({ sprites: { idle: IMGS_PAPA_IDLE } }),
  daomingsi: new PlayerSprite({
    sprites: { idle: IMGS_DAOMINGSI_IDLE, walk: IMGS_DAOMINGSI_WALK },
    shadowOffset: { y: -3 },
  }),
  huazelei: new PlayerSprite({
    sprites: { idle: IMGS_HUAZELEI_IDLE, walk: IMGS_HUAZELEI_WALK },
    shadowOffset: { y: -3 },
  }),
  meizuo: new PlayerSprite({ sprites: { idle: IMGS_MEIZUO_IDLE } }),
  ximen: new PlayerSprite({ sprites: { idle: IMGS_DAOMINGSI_IDLE } }),
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
  sceneName: "overworld" as SceneName,
  /** One-shot story-progress flags; doubles as the seed for a future save-game system (see GDD's "Sequence of Events"). `true` = complete. */
  sequence: {
    intro: true,
    mama_parcel: true,
    meet_daomingsi: true,
    meet_huazelei: false,
  },
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
  bag: new Map<ItemName, BagEntry>([
    ["parcel", { type: "item", quantity: 1 }],
    ["shoes", { type: "equip", quantity: 0 }], // TODO: comment this OUT on production
  ]),
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

const { player, mama, papa } = GAME_STATE;

export const assetsReady = preload([...player.images, ...mama.images, ...papa.images]);

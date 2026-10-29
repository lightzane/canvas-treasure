import type { Direction } from "@/features/controller";
import type { Interactable } from "@/features/interact";
import type { SceneName } from "@/features/scene";
import type { Sprite } from "@/features/sprite";
import { PlayerSprite } from "@/features/sprite-player";
import type { TriggerZone, Zone } from "@/features/zone";
import { preload } from "@/lib/preload";
import { IMGS_MAMA_IDLE } from "@/sprites/mama";
import { IMGS_PAPA_IDLE } from "@/sprites/papa";
import { IMGS_PLAYER_IDLE, IMGS_PLAYER_WALK } from "@/sprites/player";

/**
 * Every item the bag can hold — extend this union as new items get added,
 * e.g. once the shears exist: `"parcel" | "shears"`. Keeps
 * `GAME_STATE.bag.get`/`.set` calls typo-checked at compile time instead of
 * silently failing.
 */
export type ItemName = "parcel";

export const GAME_STATE = {
  camera: { x: 0, y: 0 },
  player: new PlayerSprite({
    sprites: { walk: IMGS_PLAYER_WALK, idle: IMGS_PLAYER_IDLE },
    initialSprite: "idle",
    moveSpeed: 350,
  }),
  mama: new PlayerSprite({ sprites: { idle: IMGS_MAMA_IDLE } }),
  papa: new PlayerSprite({ sprites: { idle: IMGS_PAPA_IDLE } }),
  boundaries: [] as Zone[],
  triggerZones: [] as TriggerZone[],
  /** Everything the player can face-and-press-Z to interact with in the current scene (NPCs to talk to, chests, ...) — rebuilt fresh by each scene's `enter()`, same as `boundaries`/`triggerZones`. */
  interactables: [] as Interactable[],
  /** Whatever `findFacedTarget()` currently returns — recomputed every frame by the active scene, read by `drawInteractHighlight()`. */
  facedTarget: undefined as Sprite | undefined,
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
  keys: {
    pressed: [] as Direction[],
    actions: { z: false, x: false },
    /** True for exactly one frame — the frame the key actually went down, not every frame it's held. Set by `Controller.keydown`, cleared once per frame by `GameEngine.tick`. */
    justPressed: { z: false, x: false },
  },
  sceneName: "overworld" as SceneName,
  /** Seconds the current scene has been active — used by scenes with a `duration`. */
  sceneElapsed: 0,
  /** One-shot story-progress flags; doubles as the seed for a future save-game system (see GDD's "Sequence of Events"). `true` = complete. */
  sequence: {
    intro: false,
    mama_parcel: false,
  },
  bag: new Map<ItemName, number>([["parcel", 0]]),
  /** Blocks player input in `movePlayer`. Starts locked — each scene's `enter()` releases it once it's actually ready (and re-locks it for its own exits/cutscenes, e.g. home's exit trigger). */
  movementLocked: true,
};

const { player, mama } = GAME_STATE;

export const assetsReady = preload([...player.images, ...mama.images]);

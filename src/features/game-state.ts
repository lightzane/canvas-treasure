import type { Direction } from "@/features/controller";
import type { Interactable } from "@/features/interact";
import type { SceneName } from "@/features/scene";
import { PlayerSprite, type AnimationSource } from "@/features/sprite-player";
import type { TriggerZone, Zone } from "@/features/zone";
import { preload } from "@/lib/preload";

// Files live in public/assets/images/ so they're addressable by plain filename
// here, same convention as src/lib/audio.ts — no import per file.
const imgBase = import.meta.env.BASE_URL.replace(/\/$/, "/assets/images/");
export const img = (name: string) => `${imgBase}${name}`;

/**
 * Every item the bag can hold — extend this union as new items get added,
 * e.g. once the shears exist: `"parcel" | "shears"`. Keeps
 * `GAME_STATE.bag.get`/`.set` calls typo-checked at compile time instead of
 * silently failing.
 */
export type ItemName = "parcel";

const IMG_MAMA = "characters/parents/mama";
const IMG_MAMA_IDLE_DOWN = img(`${IMG_MAMA}/idle/south.png`);
const IMG_MAMA_IDLE_LEFT = img(`${IMG_MAMA}/idle/west.png`);
const IMG_MAMA_IDLE_RIGHT = img(`${IMG_MAMA}/idle/east.png`);
const IMG_MAMA_IDLE_UP = img(`${IMG_MAMA}/idle/north.png`);

const IMG_PLAYER = "characters/main/female";
const IMG_PLAYER_WALK_DOWN = img(`${IMG_PLAYER}/walk/south.png`);
const IMG_PLAYER_WALK_LEFT = img(`${IMG_PLAYER}/walk/west.png`);
const IMG_PLAYER_WALK_RIGHT = img(`${IMG_PLAYER}/walk/east.png`);
const IMG_PLAYER_WALK_UP = img(`${IMG_PLAYER}/walk/north.png`);
const IMG_PLAYER_IDLE_DOWN = img(`${IMG_PLAYER}/idle/south.png`);
const IMG_PLAYER_IDLE_LEFT = img(`${IMG_PLAYER}/idle/west.png`);
const IMG_PLAYER_IDLE_RIGHT = img(`${IMG_PLAYER}/idle/east.png`);
const IMG_PLAYER_IDLE_UP = img(`${IMG_PLAYER}/idle/north.png`);

const IMGS_PLAYER_WALK: Record<Direction, AnimationSource> = {
  w: { src: IMG_PLAYER_WALK_UP, frames: { max: 8 } },
  a: { src: IMG_PLAYER_WALK_LEFT, frames: { max: 8 } },
  s: { src: IMG_PLAYER_WALK_DOWN, frames: { max: 8 } },
  d: { src: IMG_PLAYER_WALK_RIGHT, frames: { max: 8 } },
};

const IMGS_PLAYER_IDLE: Record<Direction, AnimationSource> = {
  w: IMG_PLAYER_IDLE_UP,
  a: IMG_PLAYER_IDLE_LEFT,
  s: IMG_PLAYER_IDLE_DOWN,
  d: IMG_PLAYER_IDLE_RIGHT,
};

const IMGS_MAMA_IDLE: Record<Direction, AnimationSource> = {
  w: IMG_MAMA_IDLE_UP,
  a: IMG_MAMA_IDLE_LEFT,
  s: IMG_MAMA_IDLE_DOWN,
  d: IMG_MAMA_IDLE_RIGHT,
};

export const GAME_STATE = {
  camera: { x: 0, y: 0 },
  player: new PlayerSprite({
    sprites: { walk: IMGS_PLAYER_WALK, idle: IMGS_PLAYER_IDLE },
    initialSprite: "idle",
  }),
  mama: new PlayerSprite({
    sprites: { idle: IMGS_MAMA_IDLE },
    initialSprite: "idle",
  }),
  boundaries: [] as Zone[],
  triggerZones: [] as TriggerZone[],
  /** Everything the player can face-and-press-Z to interact with in the current scene (NPCs to talk to, chests, ...) — rebuilt fresh by each scene's `enter()`, same as `boundaries`/`triggerZones`. */
  interactables: [] as Interactable[],
  keys: {
    pressed: [] as Direction[],
    actions: { z: false, x: false },
    /** True for exactly one frame — the frame the key actually went down, not every frame it's held. Set by `Controller.keydown`, cleared once per frame by `GameEngine.tick`. */
    justPressed: { z: false, x: false },
  },
  sceneName: "home" as SceneName,
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

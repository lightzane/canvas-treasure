import { PAGE_SOUND_VOLUME } from "@/app/puzzle-viewer";
import {
  COLLISION_OVERWORLD,
  COLLISION_OVERWORLD_EVENT,
  COLLISION_OVERWORLD_NON_EVENT,
} from "@/constants/collisions/overworld";
import { TILE_SIZE, ZOOM_LEVEL } from "@/constants/game-settings";
import { TRIGGER_OVERWORLD, type TriggerName } from "@/constants/triggers/overworld";
import { GAME_STATE } from "@/features/game-state";
import {
  drawInteractPrompt,
  removeInteractable,
  updateInteraction,
  type Interactable,
  type InteractableConfig,
} from "@/features/interact";
import type { Scene } from "@/features/scene";
import { Sprite } from "@/features/sprite";
import { PlayerSprite, type PlayerProps } from "@/features/sprite-player";
import {
  checkTriggerZones,
  createBoundaries,
  createTriggerZones,
  isInsideZone,
  type TriggerHandlers,
} from "@/features/zone";
import { addOnce, remove } from "@/lib/array";
import {
  audioIsMusicActive,
  audioPauseMusic,
  audioPlayAmbience,
  audioPlayMusic,
  audioPlaySound,
  audioStopAmbience,
  audioStopMusic,
} from "@/lib/audio";
import { bagHasItem, bagIncItem, bagRemoveItem } from "@/lib/bag";
import { DIALOGUE } from "@/lib/canvas/dialogue";
import { isInViewport } from "@/lib/canvas/viewport";
import { drawViewportClamped, prepareViewportClamped } from "@/lib/canvas/viewport-clamp";
import { drawYSorted } from "@/lib/canvas/y-sort";
import { createCompanion } from "@/lib/companion";
import { birthdayConfetti } from "@/lib/confetti";
import { beginCutscene, endCutscene } from "@/lib/cutscene";
import { drift } from "@/lib/drift";
import { playAttentionBounce } from "@/lib/effects/attention-bounce";
import { playCherryBlossoms } from "@/lib/effects/cherry-blossoms";
import { playExclamation } from "@/lib/effects/exclamation-bubble";
import type { EffectHandle } from "@/lib/effects/handle";
import { playImagePreview } from "@/lib/effects/image-preview";
import { playIrisReveal } from "@/lib/effects/iris-reveal";
import { playLeafBurst } from "@/lib/effects/leaf-burst";
import { playQuestCompleteBanner, playQuestToast } from "@/lib/effects/quest-toast";
import { playShine } from "@/lib/effects/shine";
import { drawFootprints, trackFootstep, updateFootprints } from "@/lib/footprints";
import { hudSetBagIconVisible } from "@/lib/hud";
import { img } from "@/lib/img";
import { movePlayer, panCameraToTile, setCameraToTile } from "@/lib/map-movement";
import { cancelScheduledFace, scheduleFaceDirection } from "@/lib/npc-auto";
import { createNpcMessages, npcMessagesInteractions } from "@/lib/npc-messages";
import { createNpcSpawner } from "@/lib/npc-spawn";
import { createGroupConversation } from "@/lib/npc-talk";
import { placeAtTile } from "@/lib/positioning";
import { BIRTHDAY_POSTCARD_SRC } from "@/lib/postcard-sticker";
import { preload } from "@/lib/preload";
import {
  isQuestResolved,
  questIncreaseProgress,
  questSetProgress,
  questSetStatus,
} from "@/lib/quests";
import { createReadDispatch } from "@/lib/read-message";
import { faceDirection, walk } from "@/lib/walk";
import { IMGS_AANG_MOMO_IDLE } from "@/sprites/aang-momo";
import { IMGS_ADULT_FEMALE_1_IDLE } from "@/sprites/adult-female-1";
import { IMGS_ADULT_FEMALE_2_IDLE } from "@/sprites/adult-female-2";
import { IMGS_ADULT_MALE_1_IDLE } from "@/sprites/adult-male-1";
import { IMGS_ADULT_MALE_2_IDLE } from "@/sprites/adult-male-2";
import { IMGS_APPA_IDLE } from "@/sprites/appa";
import { IMGS_BEACH_OUTFIT_FEMALE_1_IDLE } from "@/sprites/beach-outfit-female-1";
import { IMGS_BEACH_OUTFIT_FEMALE_2_IDLE } from "@/sprites/beach-outfit-female-2";
import { IMGS_BEACH_OUTFIT_MALE_1_IDLE } from "@/sprites/beach-outfit-male-1";
import { IMGS_BEACH_OUTFIT_MALE_2_IDLE } from "@/sprites/beach-outfit-male-2";
import {
  DIALOGUE_COLOR_DAOMINGSI,
  PORTRAIT_DAOMINGSI,
  PORTRAIT_DAOMINGSI_INTIMIDATE,
} from "@/sprites/dao-ming-si";
import { IMGS_ELDER_MAN_IDLE } from "@/sprites/elder-man";
import { IMGS_ELDER_WOMAN_IDLE } from "@/sprites/elder-woman";
import { IMGS_FLORIST_FEMALE_IDLE } from "@/sprites/florist-female";
import { IMGS_FLORIST_MALE_IDLE } from "@/sprites/florist-male";
import { IMGS_HH_STAFF_FEMALE_1_IDLE } from "@/sprites/hh-staff-female-1";
import { IMGS_HH_STAFF_MALE_1_IDLE } from "@/sprites/hh-staff-male-1";
import { DIALOGUE_COLOR_HUAZELEI, PORTRAIT_HUAZELEI } from "@/sprites/hua-ze-lei";
import { IMGS_IROH_EARTH_IDLE } from "@/sprites/iroh-earth";
import { IMGS_KATARA_IDLE } from "@/sprites/katara";
import { DIALOGUE_COLOR_MEIZUO, PORTRAIT_MEIZUO } from "@/sprites/mei-zuo";
import { IMGS_SCHOOL_GIRL_IDLE } from "@/sprites/school-girl";
import { IMGS_SOKKA_IDLE } from "@/sprites/sokka";
import { IMGS_TEENAGE_BOY_IDLE } from "@/sprites/teenage-boy";
import { IMGS_TEENAGE_GIRL_IDLE } from "@/sprites/teenage-girl";
import { IMGS_TOPH_IDLE } from "@/sprites/toph";
import { DIALOGUE_COLOR_XIMEN, PORTRAIT_XIMEN } from "@/sprites/xi-men";
import { IMGS_ZUKO_IDLE } from "@/sprites/zuko";
import gsap from "gsap";

const VOLUME_MAIN_BG = 0.5;

const PHOTO_TREASURE = img("treasure/treasure-full.png");
const PHOTO_TREASURE_CLOSEUP = img("treasure/treasure-full-closeup.png");
const PHOTO_TREASURE_MAP = img("others/treasure-map.jpg");

const IMG_MAP_BG = img("maps/overworld.png");
const IMG_MAP_FG = img("maps/overworld-fg.png");

const IMG_MAP_EVENT_BG = img("maps/overworld_event.png");

const IMG_FOUNTAIN_SMALL = img("others/fountain-small.png");
const IMG_FOUNTAIN_BIG = img("others/fountain-big.png");
const IMG_PAPER_SINGLE = img("others/paper-single.png");
const IMG_PAPER_MULTI = img("others/paper-multi.png");
const IMG_PAPER_WIND = img("others/paper-wind.png");
const IMG_WILD_BUSH_CENTER = img("others/wild-bush-center.png");
const IMG_SIGNPOST = img("others/signpost.png");
const IMG_MESSAGE_BOTTLE_H = img("others/message-bottle-h.png");
const IMG_BULLETIN_BOARD = img("others/bulletin-board.png");
const IMG_CHEST_CLOSE = img("others/chest-close.png");
const IMG_CHEST_OPEN = img("others/chest-open.png");
const IMG_CHEST_EMPTY = img("others/chest-empty.png");
const IMG_BALLOON_CRATES = img("others/balloon-crates.png");
const IMG_WOODEN_CRATE = img("others/wooden-crate.png");
const IMG_WOODEN_BARREL = img("others/wooden-barrel.png");
const IMG_STREET_LIGHT = img("others/street-light.png");
const IMG_WOODEN_BALLOON_ARCH = img("others/wooden-balloon-arch.png");
const ICON_RED_HEART = img("others/red-heart.png");
const ICON_SHEARS = img("others/garden-shears.png");
const ICON_PAPERS = img("others/paper-multi-32.png");
const ICON_PARCEL = img("others/parcel-32.png");
const ICON_UNLOCKED = img("others/padlock-unlocked-64.png");

const MAIN_EVENT_PLAYER_MOVESPEED = 100;

const background = new Sprite({ src: IMG_MAP_BG });
const foreground = new Sprite({ src: IMG_MAP_FG });

const backgroundEvent = new Sprite({ src: IMG_MAP_EVENT_BG });

// Main and core characters
const { player, jp, daomingsi, huazelei, meizuo, ximen } = GAME_STATE;
const f4 = [daomingsi, huazelei, meizuo, ximen];

// static decors
const smallFountainA = new Sprite({ src: IMG_FOUNTAIN_SMALL, frames: { max: 4 }, scale: 2 });
const smallFountainB = new Sprite({ src: IMG_FOUNTAIN_SMALL, frames: { max: 4 }, scale: 2 });
const smallFountainC = new Sprite({ src: IMG_FOUNTAIN_SMALL, frames: { max: 4 }, scale: 2 });
const bigFountainA = new Sprite({ src: IMG_FOUNTAIN_BIG, frames: { max: 4 }, scale: 2 });
const bigFountainB = new Sprite({ src: IMG_FOUNTAIN_BIG, frames: { max: 4 }, scale: 2 });

interface ReadableCfg {
  tile: [number, number];
  message: string;
}

/**
 * Builds one readable prop's sprite (placed at `tile`) + its message —
 * shared by SIGNPOSTS and MSG_BOTTLES below, just a different image (and,
 * optionally, collisionBox/feetOffset) per caller. Omitted collisionBox
 * (MSG_BOTTLES' case) leaves the sprite non-obstructing, same as not
 * passing one at all; MSG_BOTTLES also never goes through drawYSorted (it's
 * drawn via the flat DECORS pass instead), so feetOffset wouldn't matter
 * for it regardless.
 */
function createReadables(
  src: string,
  cfgs: ReadableCfg[],
  collisionBox?: {
    width?: number;
    height?: number;
    anchor?: "top" | "center" | "bottom";
    offset?: { x?: number; y?: number };
  },
  feetOffset?: number,
) {
  return cfgs.map(({ tile, message }) => {
    const sprite = new Sprite({
      src,
      scale: 2,
      collisionBox,
      feetOffset,
    });
    // explicitly sets the spriteSize because we have "scale"
    const place = () => placeAtTile({ sprite, tile, spriteSize: sprite.boxSize, anchor: "bottom" });
    if (!sprite.image.complete) sprite.image.addEventListener("load", place, { once: true });
    place();
    return { sprite, message };
  });
}

/**
 * One readable signpost — add a new one here and nothing else in this file
 * needs to change (its sprite, placement, and INTERACTABLES/interactions()
 * wiring are all generated below from this table, see SIGNPOSTS).
 */

// Row = the post's base cell (where it's planted), not the board — matches
// createReadables' anchor: "bottom" below. One row higher than what you'd
// read off the board itself in Tiled.
const SIGNPOST_CFGS: ReadableCfg[] = [
  { tile: [60, 46], message: "Your house..." },
  { tile: [85, 31], message: "DAO MING Mansion" },
  { tile: [88, 31], message: "DAO MING Mansion" },
  { tile: [59, 30], message: "HUA ZE LEI's House" },
  { tile: [37, 17], message: "MEI ZUO's House" },
  { tile: [121, 90], message: "XI MEN's House" },
  { tile: [124, 65], message: "IROH's TEASHOP — Famous for its aromatic Jasmine Tea" },
  { tile: [93, 34], message: "Park North Entrance" },
  { tile: [76, 45], message: "Park West Entrance" },
  { tile: [111, 45], message: "Park East Entrance" },
  { tile: [92, 58], message: "Park South Entrance" },
  { tile: [92, 69], message: "Market North Entrance" },
  { tile: [76, 76], message: "Market West Entrance" },
  { tile: [110, 76], message: "Market East Entrance" },
  { tile: [92, 87], message: "Market South Entrance" },
  { tile: [46, 25], message: "Flower Garden — Planted with love, shaped like it too" },
  { tile: [39, 46], message: "Flowershop — Every bloom in town? You can thank us for that!" },
];

const SIGNPOSTS = createReadables(
  IMG_SIGNPOST,
  SIGNPOST_CFGS,
  {
    // signpost.png's content isn't just padded, it's shaped: a wider board
    // (raw rows 13-33, 21px incl. the top knob) sitting above a narrower
    // post (raw rows 34-50, 17px incl. the flared foot) — verified by
    // scanning each row's opaque pixel span, not eyeballed. Because the
    // board is taller than the post, "anchor: center" on the full content
    // box lands on the board, not the post. Collision should only be the
    // post anyway — the board is above head height, same as how
    // STREET_LIGHTS only collide near their base, not the lamp fixture — so
    // this targets just the post's rows directly instead of trying to force
    // it out of anchor/centering math. x stays centered by default (the
    // post's 25px raw width is itself centered in the 32px canvas).
    width: 25 * ZOOM_LEVEL,
    height: 2 * ZOOM_LEVEL,
    anchor: "top",
    offset: { y: 44 * ZOOM_LEVEL },
  },
  // boxSize's bottom edge (what drawYSorted's feetY reads by default) sits
  // 13 raw px / 26 scaled px below the art's actual foot — same padding
  // measured above, just the bottom side of it. Pulls the Y-sort reference
  // up to where the post visually ends, so sorting matches what's drawn
  // instead of the padded canvas edge.
  -13 * ZOOM_LEVEL, // feetOffset
);

/**
 * Common/ambient message bottles scattered on the beach — plain flavor
 * reads, same table shape as SIGNPOST_CFGS (the original msgBottle1 quote
 * is now just the first entry here). Separate from coreMsgBottle below,
 * which is quest-tied (see readCoreMsgBottle()) and not a plain read.
 */
const MSG_BOTTLE_CFGS: ReadableCfg[] = [
  {
    tile: [45, 74],
    message: `
        "You'll never realize how important something, or someone...
        IS to you, until the moment they are about to fade."
        — JP Aguilar
      `,
  },
  {
    tile: [31, 74],
    message: `
        "If you want to go fast, go alone.
        If you want to go far, we go together"
        — Mufasa, Lion King
      `,
  },
  {
    tile: [35, 77],
    message: `
        "Yesterday is history, tomorrow is a mystery. And Today is a gift.
        That's why it is called the present."
        — Grand Master Oogway, Kung Fu Panda
      `,
  },
  {
    tile: [49, 76],
    message: `
        "It's true that history may repeat itself 
        but people can't go back in time."
        — Nico Robin, One Piece
      `,
  },
  {
    tile: [31, 79.5],
    message: `
        "Even though change is constant and inevitable,
        it is hard to bring change to this existing world."
        — Anonymous
      `,
  },
  {
    tile: [30, 84],
    message: `
        "Progression over time. Remember, consistency is more
        important than perfection. Just keep going!"
        — ChatGPT
      `,
  },
  {
    tile: [53.5, 75.5],
    message: `
        "Simplicity is the ultimate sophistication."
        — Anonymous
      `,
  },
];

const MSG_BOTTLES = createReadables(IMG_MESSAGE_BOTTLE_H, MSG_BOTTLE_CFGS);

const coreMsgBottle = new Sprite({ src: IMG_MESSAGE_BOTTLE_H, scale: 2 });
// Only ever placed/added to DECORS inside initMainEvent() — doesn't exist in
// the world before then, torn down again by cleanupMainEvent().
const balloonArch = new Sprite({
  src: IMG_WOODEN_BALLOON_ARCH,
  scale: 2,
  // AISLE_GUARDS_ROW_A (row 54.5, 96px tall) has feetY 3568 — 16px less than
  // this sprite's own box-bottom feetY of 3584 (tile row 55, anchor
  // "bottom", 256px box) — pulls the sort reference up past that gap so
  // those two guards correctly draw in front instead of behind the arch.
  feetOffset: -32,
});
const bulletinBoard = new Sprite({
  src: IMG_BULLETIN_BOARD,
  scale: 2,
  collisionBox: { height: 32 },
});
// Built once, not inline inside initBulletinBoard() — that function runs
// every enter() while the quest is active, and addOnce() only dedupes by
// reference. A fresh `{ sprite, label, ... }` literal built on every call
// would never match itself, so re-entries would keep stacking duplicate
// wrapper entries in INTERACTABLES, and removeInteractable() (on resolve)
// only ever clears the first one — leaving the "Read" prompt as a ghost.
const BULLETIN_BOARD_INTERACTABLE: Interactable = {
  sprite: bulletinBoard,
  label: "Read",
  labelOffset: { y: 16 },
};
const balloonCrates = Array.from(
  { length: 6 },
  () => new Sprite({ src: IMG_BALLOON_CRATES, scale: 2 }),
);

const chestCfgs: Partial<Sprite> = {
  scale: 2,
  boxSize: { width: 32, height: 32 },
};

const chestClose = new Sprite({ ...chestCfgs, src: IMG_CHEST_CLOSE });
const chestOpen = new Sprite({ ...chestCfgs, src: IMG_CHEST_OPEN });
const chestEmpty = new Sprite({ ...chestCfgs, src: IMG_CHEST_EMPTY });

const createStreetLight = (tileX: number, tileY: number) => {
  const streetLight = new Sprite({
    src: IMG_STREET_LIGHT,
    scale: 2,
    boxSize: {
      width: 15 * ZOOM_LEVEL, // check the actual width of the pixel art
      height: TILE_SIZE * 2,
    },
    collisionBox: {
      height: 24,
    },
  });
  placeAtTile(streetLight, [tileX, tileY]);
  return streetLight;
};

const STREET_LIGHTS: Sprite[] = [
  createStreetLight(110, 6),
  createStreetLight(52, 8),
  createStreetLight(48, 8),
  createStreetLight(40, 8),
  createStreetLight(31, 8),
  createStreetLight(26, 8),
  createStreetLight(19, 8),
  createStreetLight(43, 15),
  createStreetLight(49, 15),
  createStreetLight(108, 15),
  createStreetLight(114, 15),
  createStreetLight(69, 18),
  createStreetLight(62, 18),
  createStreetLight(52, 18),
  createStreetLight(47, 18),
  createStreetLight(34, 18),
  createStreetLight(114, 20),
  createStreetLight(108, 20),
  createStreetLight(89, 20),
  createStreetLight(84, 20),
  createStreetLight(84, 24),
  createStreetLight(89, 24),
  createStreetLight(50, 25),
  createStreetLight(69, 28),
  createStreetLight(34, 28),
  createStreetLight(47, 28),
  createStreetLight(46, 30),
  createStreetLight(80, 34),
  createStreetLight(79, 35),
  createStreetLight(109, 35),
  createStreetLight(46, 36),
  createStreetLight(110, 36),
  createStreetLight(118, 37),
  createStreetLight(23, 38),
  createStreetLight(118, 41),
  createStreetLight(23, 43),
  createStreetLight(46, 44),
  createStreetLight(70, 44),
  createStreetLight(105, 50),
  createStreetLight(83, 50),
  createStreetLight(35, 51),
  createStreetLight(62, 52),
  createStreetLight(69, 52),
  createStreetLight(80, 53),
  createStreetLight(108, 53),
  createStreetLight(96, 57),
  createStreetLight(35, 51),
  createStreetLight(35, 58),
  createStreetLight(73, 61),
  createStreetLight(39, 61),
  createStreetLight(69, 61),
  createStreetLight(115, 61),
  createStreetLight(39, 65),
  createStreetLight(47, 65),
  createStreetLight(50, 65),
  createStreetLight(58, 65),
  createStreetLight(61, 65),
  createStreetLight(69, 65),
  createStreetLight(81, 66),
  createStreetLight(87, 66),
  createStreetLight(99, 66),
  createStreetLight(105, 66),
  createStreetLight(114, 66),
  createStreetLight(123, 68),
  createStreetLight(128, 68),
  createStreetLight(36, 69),
  createStreetLight(39, 69),
  createStreetLight(91, 69),
  createStreetLight(95, 69),
  createStreetLight(77, 74),
  createStreetLight(109, 74),
  createStreetLight(91, 75),
  createStreetLight(95, 75),
  createStreetLight(91, 78),
  createStreetLight(69, 78),
  createStreetLight(95, 78),
  createStreetLight(109, 78),
  createStreetLight(77, 78),
  createStreetLight(91, 84),
  createStreetLight(95, 84),
  createStreetLight(69, 85),
  createStreetLight(81, 87),
  createStreetLight(87, 87),
  createStreetLight(99, 87),
  createStreetLight(105, 87),
  createStreetLight(114, 87),
  createStreetLight(99, 91),
  createStreetLight(81, 91),
  createStreetLight(70, 91),
  createStreetLight(87, 91),
  createStreetLight(105, 91),
  createStreetLight(114, 91),
  createStreetLight(119, 92),
];

const createProps = (src: string, tile: [number, number]) => {
  const sprite = new Sprite({ src, scale: 2 });
  // Explicit spriteSize: placeAtTile's own default (sprite.size) is the RAW,
  // unscaled image size — fine when boxSize matches that raw size, wrong
  // here since boxSize is TILE_SIZE (already 2x-scaled) while the source art
  // is native 32x32. Centering on the raw size instead of boxSize is what
  // produced the consistent 16px-off placement.
  placeAtTile({ sprite, tile, spriteSize: sprite.boxSize });
  return sprite;
};

function createPropsRow(src: string, tile: [number, number], count: number) {
  return Array.from({ length: count }, (_, i) => createProps(src, [tile[0] + i, tile[1]]));
}

const woodenCrates: Sprite[] = [
  ...createPropsRow(IMG_WOODEN_CRATE, [90, 40], 9), // Row 1 — solid line of 9
  ...createPropsRow(IMG_WOODEN_CRATE, [90, 41], 2), // Row 2 — left half, before the gap
  ...createPropsRow(IMG_WOODEN_CRATE, [97, 41], 2), // Row 2 — right half, after a 4-tile gap
];

const balloonBarrelRow: Sprite[] = [
  createProps(IMG_BALLOON_CRATES, [90, 39]),
  ...createPropsRow(IMG_WOODEN_BARREL, [91, 39], 2),
  ...createPropsRow(IMG_WOODEN_BARREL, [96, 39], 2),
  createProps(IMG_BALLOON_CRATES, [98, 39]),
];

const BEFORE_MAIN_EVENT_PROPS = [...balloonBarrelRow, ...woodenCrates];

// removable decors
const wildBushConfigs = {
  scale: 2,
  boxSize: { height: 32 },
  collisionBox: { height: 32, anchor: "center" as const },
};
const wildBushPaper = new Sprite({ ...wildBushConfigs, src: IMG_WILD_BUSH_CENTER });
const wildBushMazeEntrance = new Sprite({ ...wildBushConfigs, src: IMG_WILD_BUSH_CENTER });
const wildBushMazeChest = new Sprite({ ...wildBushConfigs, src: IMG_WILD_BUSH_CENTER });
const wildBushBeach1 = new Sprite({ ...wildBushConfigs, src: IMG_WILD_BUSH_CENTER });
const wildBushBeach2 = new Sprite({ ...wildBushConfigs, src: IMG_WILD_BUSH_CENTER });

const paperSingle = new Sprite({ src: IMG_PAPER_SINGLE, scale: 2 });
const paperMulti = new Sprite({
  src: IMG_PAPER_MULTI,
  scale: 2,
  boxSize: { width: 32, height: 32 },
});

// temp decors
const paperWind1 = new Sprite({ src: IMG_PAPER_WIND, scale: 2, frames: { max: 8, hold: 180 } });
const paperWind2 = new Sprite({ src: IMG_PAPER_WIND, scale: 2, frames: { max: 8, hold: 180 } });

/** This map's own static/animated decor — drawn after the background, before the player. */
const DECORS: Sprite[] = [
  smallFountainA,
  smallFountainB,
  smallFountainC,
  bigFountainA,
  bigFountainB,
  wildBushPaper,
  wildBushMazeEntrance,
  wildBushMazeChest,
  wildBushBeach1,
  wildBushBeach2,
  ...MSG_BOTTLES.map(({ sprite }) => sprite),
];

/**
 * Candidate decor-obstacles, re-checked against DECORS on every enter()
 * below instead of hardcoded wholesale — so a bush interactWildBush already
 * cut (removed from DECORS once, permanently — nothing ever adds it back)
 * or a chest not reached yet correctly stays out of GAME_STATE.obstacles
 * too, rather than being unconditionally resurrected on the next re-entry.
 */
const OBSTACLE_DECORS = [
  wildBushPaper,
  wildBushMazeEntrance,
  wildBushMazeChest,
  wildBushBeach1,
  wildBushBeach2,
  chestClose,
  chestOpen,
  chestEmpty,
  ...BEFORE_MAIN_EVENT_PROPS,
];

const NPCS: PlayerSprite[] = [GAME_STATE.papa];

const spawnGuards = () => [
  new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_MALE_1_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_FEMALE_1_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_MALE_1_IDLE } }),
];

const NORTH_GUARDS: PlayerSprite[] = spawnGuards();
const WEST_GUARDS: PlayerSprite[] = spawnGuards();
const EAST_GUARDS: PlayerSprite[] = spawnGuards();
const PARK_EVENT_GUARDS: PlayerSprite[] = [...NORTH_GUARDS, ...WEST_GUARDS, ...EAST_GUARDS];

// Built once, not inline per-call inside initMainEventGuards() — addOnce()
// dedupes by reference, so a fresh `{ sprite, probeDistance }` literal
// created on every call would never match its own earlier copy, silently
// piling up duplicate entries in INTERACTABLES on every re-entry.
const PARK_EVENT_GUARDS_INTERACTABLES: Interactable[] = PARK_EVENT_GUARDS.map((npc) => ({
  sprite: npc,
  probeDistance: 8,
}));

const AISLE_GUARDS_ROW_A: PlayerSprite[] = [
  new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_FEMALE_1_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_FEMALE_1_IDLE } }),
];

const AISLE_GUARDS_ROW_B: PlayerSprite[] = [
  new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_MALE_1_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_MALE_1_IDLE } }),
];

const AISLE_GUARDS = [...AISLE_GUARDS_ROW_A, ...AISLE_GUARDS_ROW_B];

const MARKET_EVENT_GIRLS_A = [
  new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_FEMALE_1_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_SCHOOL_GIRL_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_TEENAGE_GIRL_IDLE } }),
];
const MARKET_EVENT_GIRLS_B = [
  new PlayerSprite({ sprites: { idle: IMGS_ELDER_WOMAN_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_FEMALE_1_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_SCHOOL_GIRL_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_TEENAGE_GIRL_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_FEMALE_2_IDLE } }),
];
const MARKET_EVENT_GIRLS_C = [
  new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_FEMALE_1_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_SCHOOL_GIRL_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_TEENAGE_GIRL_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_FEMALE_2_IDLE } }),
];
const MARKET_EVENT_GIRLS_D = [
  new PlayerSprite({ sprites: { idle: IMGS_SCHOOL_GIRL_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_FEMALE_2_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_FEMALE_1_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_FEMALE_1_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_TEENAGE_GIRL_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_SCHOOL_GIRL_IDLE } }),
];
const MARKET_EVENT_GIRLS_E = [
  new PlayerSprite({ sprites: { idle: IMGS_SCHOOL_GIRL_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_TEENAGE_GIRL_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_FEMALE_1_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_FEMALE_1_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_SCHOOL_GIRL_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_FEMALE_2_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_FEMALE_1_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_ELDER_WOMAN_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_FEMALE_2_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_TEENAGE_GIRL_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_FEMALE_1_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_SCHOOL_GIRL_IDLE } }),
];
const MARKET_EVENT_GIRLS = [
  ...MARKET_EVENT_GIRLS_A,
  ...MARKET_EVENT_GIRLS_B,
  ...MARKET_EVENT_GIRLS_C,
  ...MARKET_EVENT_GIRLS_D,
  ...MARKET_EVENT_GIRLS_E,
];

/** When `false` — The 2 golden jubilarian couple is standing in middle of flower garden. */
let isFlowerGardenAvailable = false;
const npcFloristHeart = new PlayerSprite({ sprites: { idle: IMGS_FLORIST_FEMALE_IDLE } });
const npcElderManHeart = new PlayerSprite({ sprites: { idle: IMGS_ELDER_MAN_IDLE } });
const npcElderWomanHeart = new PlayerSprite({ sprites: { idle: IMGS_ELDER_WOMAN_IDLE } });

/**
 * Pauses jp's companion-follow for a scripted walk() — folded directly into
 * jpActive (see update()), so the NPCS-exclusion-filter and
 * jpCompanion.follow() keep reading that one single source of truth instead
 * of each needing their own check. Set true right before walk()-ing jp
 * somewhere specific; false once follow should resume from wherever jp was
 * left standing.
 */
let jpFollowPaused = false;

const wildBushInteractablesCfgs: Partial<Interactable> = {
  label: "Interact",
  labelOffset: { y: -16 },
};

const signpostInteractablesCfgs: Partial<Interactable> = {
  label: "Read",
  labelOffset: { y: 32 },
  probeDistance: 0,
  // collisionBox is trimmed to just the post for movement precision — way
  // too thin to reliably land the interact probe on. {} falls back to the
  // sprite's full boxSize for probing purposes only; movement collision is
  // untouched.
  probeBox: {},
};

const msgBottleInteractablesCfgs: Partial<Interactable> = {
  label: "Read",
  labelOffset: { y: 16 },
};

// Named (not inline) specifically so spawnHeartGardenNpcs() can mutate
// .facePlayer on these same objects later — INTERACTABLES holds this exact
// reference, so the change takes effect immediately, no re-registration
// needed. false while the couple stands together at the garden's center
// (shouldn't break their own pose for the player); true once they've
// stepped aside to [40,19]/[41,19] and are just chatting individually.
const ELDER_MAN_HEART_INTERACTABLE: InteractableConfig = {
  sprite: npcElderManHeart,
  facePlayer: false,
};
const ELDER_WOMAN_HEART_INTERACTABLE: InteractableConfig = {
  sprite: npcElderWomanHeart,
  facePlayer: false,
};

const INTERACTABLES: Interactable[] = [
  GAME_STATE.papa,
  { sprite: wildBushPaper, ...wildBushInteractablesCfgs },
  { sprite: wildBushMazeEntrance, ...wildBushInteractablesCfgs },
  { sprite: wildBushMazeChest, ...wildBushInteractablesCfgs },
  { sprite: wildBushBeach1, ...wildBushInteractablesCfgs },
  { sprite: wildBushBeach2, ...wildBushInteractablesCfgs },
  ...SIGNPOSTS.map(({ sprite }) => ({ sprite, ...signpostInteractablesCfgs })),
  ...MSG_BOTTLES.map(({ sprite }) => ({ sprite, ...msgBottleInteractablesCfgs })),
  // npcElderWomanHeart is NOT here — see spawnHeartGardenNpcs(), which
  // adds/removes her depending on isFlowerGardenAvailable.
  ELDER_MAN_HEART_INTERACTABLE,
];
const HUAZELEI_INTERACTABLE: Interactable = huazelei;
const { respawnNPC, despawnNPC } = createNpcSpawner(NPCS, INTERACTABLES);
let paperWindAnimating = false;

let fxCherryBlossomsHandle: EffectHandle | undefined;
let tracingPaper2ShineHandle: EffectHandle | undefined;
let coreMsgBottleShineHandle: EffectHandle | undefined;
let jpShineHandle: EffectHandle | undefined;

function scheduleMamaFacePapa() {
  scheduleFaceDirection(GAME_STATE.mama, "d");
}

function schedulePapaFaceMama() {
  scheduleFaceDirection(GAME_STATE.papa, "a");
}

function exitMap() {
  audioStopMusic(overworldScene.fadeOut);
  audioStopAmbience(undefined, 2);
  hudSetBagIconVisible(false);
  GAME_STATE.movementLocked = true;
  tracingPaper2ShineHandle?.stop();
  coreMsgBottleShineHandle?.stop();
}

const TRIGGER_HANDLERS: TriggerHandlers<TriggerName> = {
  enter_home: {
    onEnter: () => {
      GAME_STATE.sceneName = "home";
      exitMap();
    },
  },
  enter_mansion: {
    onEnter: () => {
      GAME_STATE.sceneName = "mansion";
      exitMap();
    },
  },
  enter_flowershop: {
    onEnter: () => {
      GAME_STATE.sceneName = "flowershop";
      exitMap();
    },
  },
  enter_teashop: {
    onEnter: () => {
      GAME_STATE.sceneName = "teashop";
      exitMap();
    },
  },
  cutscene_running_shoes: { onEnter: cutsceneRunningShoes },
  cutscene_mid_aisle: { onEnter: () => cutsceneMidAisle() },
  cutscene_mid_aisle_lei: { onEnter: () => cutsceneMidAisleLei() },
  cutscene_mid_aisle_jp: { onEnter: () => cutsceneMidAisleJp() },
  restrict_allow_run: { onEnter: () => restrictRun(false) },
  restrict_disallow_run: { onEnter: () => restrictRun(true) },
  restrict_mid_aisle_lock: { onEnter: () => restrictMidAisleExit() },
  sound_main: { onEnter: soundMain },
  sound_market: { onEnter: () => soundMarket() },
  sound_fountain: { onEnter: () => soundFountain(), onLeave: () => soundFountain(false) },
  sound_beach: { onEnter: () => soundBeach() },
  sound_garden_maze: { onEnter: () => soundGardenMaze() },
  sound_park: { onEnter: () => soundPark() },
  sound_park_exit: { onEnter: () => soundPark(false) },
  sound_teashop: { onEnter: () => soundTeashop() },
};

const quests = GAME_STATE.quests;
const questMain = quests.get("invitation_postcard")!;
const jpCompanion = createCompanion(jp, { followDistance: 1 });
const questCatchSheets = quests.get("catch_sheets")!;
const questRunningShoes = quests.get("running_shoes")!;
const questMessageBottle = quests.get("message_in_bottle")!;
const questMazeChest = quests.get("maze_chest")!;
const questDaoMingKeys = quests.get("daoming_keys")!;
const questSketchUnity = quests.get("sketch_unity")!;

// Static sprites that never relocates
placeAtTile(GAME_STATE.papa, [63, 39]);
placeAtTile(smallFountainA, [80.75, 51.5]);
placeAtTile(smallFountainB, [105.75, 51.5]);
placeAtTile(smallFountainC, [92.25, 76.5]);
placeAtTile(bigFountainA, [80.25, 21.75]);
placeAtTile(bigFountainB, [90.25, 21.75]);
placeAtTile(wildBushPaper, [42, 73.5]);
placeAtTile(wildBushMazeEntrance, [106, 10]);
placeAtTile(wildBushMazeChest, [117, 9]);
placeAtTile(wildBushBeach1, [20, 51]);
placeAtTile(wildBushBeach2, [20, 52]);
placeAtTile(chestEmpty, [119.75, 7.75]);
placeAtTile(balloonCrates[0], [99, 74]);
placeAtTile(balloonCrates[1], [99, 75]);
placeAtTile(balloonCrates[2], [100, 75]);
placeAtTile(balloonCrates[3], [108, 74]);
placeAtTile(balloonCrates[4], [107, 75]);
placeAtTile(balloonCrates[5], [108, 75]);
placeAtTile(bulletinBoard, [93, 40]);

let nLoc = [92.5, 32.4] as [number, number];
NORTH_GUARDS.forEach((npc, i) => {
  let y = nLoc[1];
  if (i % 2 === 0) y -= 0.15;
  placeAtTile({ sprite: npc, tile: [(nLoc[0] += 0.85), y] });
  npc.face("w");
});

let wLoc = [78.5, 45] as [number, number];
WEST_GUARDS.forEach((npc, i) => {
  let x = wLoc[0];
  if (i % 2 === 0) x -= 0.5;
  placeAtTile({ sprite: npc, tile: [x, (wLoc[1] += 0.5)] });
  npc.face("a");
});

let eLoc = [110, 45] as [number, number];
EAST_GUARDS.forEach((npc, i) => {
  let x = eLoc[0];
  if (i % 2 === 0) x += 0.5;
  placeAtTile({ sprite: npc, tile: [x, (eLoc[1] += 0.5)] });
  npc.face("d");
});

// Other NPCs scattered around
const npcCfg: Partial<PlayerProps> = {
  boxSize: { width: 64 },
  shadowOffset: { y: -3 },
};

const npcAang = new PlayerSprite({ sprites: { idle: IMGS_AANG_MOMO_IDLE }, ...npcCfg });
const npcAppa = new PlayerSprite({
  sprites: { idle: IMGS_APPA_IDLE },
  scale: 2.5,
  shadowOffset: { y: -80 },
});
const npcKatara = new PlayerSprite({ sprites: { idle: IMGS_KATARA_IDLE }, ...npcCfg });
const npcSokka = new PlayerSprite({ sprites: { idle: IMGS_SOKKA_IDLE }, ...npcCfg });
const npcToph = new PlayerSprite({ sprites: { idle: IMGS_TOPH_IDLE }, ...npcCfg });

const npcZuko = new PlayerSprite({ sprites: { idle: IMGS_ZUKO_IDLE }, ...npcCfg });
const npcIroh = new PlayerSprite({
  sprites: { idle: IMGS_IROH_EARTH_IDLE },
  ...npcCfg,
  scale: 1.1,
});

const npcAdultMale1 = new PlayerSprite({ sprites: { idle: IMGS_ADULT_MALE_1_IDLE }, ...npcCfg, scale: 1.05 }); // prettier-ignore
const npcAdultMale2 = new PlayerSprite({ sprites: { idle: IMGS_ADULT_MALE_2_IDLE }, ...npcCfg, scale: 1.05 }); // prettier-ignore
const npcAdultMale3 = new PlayerSprite({ sprites: { idle: IMGS_ADULT_MALE_1_IDLE }, ...npcCfg, scale: 1.05 }); // prettier-ignore
const npcAdultMale4 = new PlayerSprite({ sprites: { idle: IMGS_ADULT_MALE_2_IDLE }, ...npcCfg, scale: 1.05 }); // prettier-ignore
const npcAdultMale5 = new PlayerSprite({ sprites: { idle: IMGS_ADULT_MALE_2_IDLE }, ...npcCfg, scale: 1.05 }); // prettier-ignore
const npcAdultFemale1 = new PlayerSprite({sprites: {idle: IMGS_ADULT_FEMALE_1_IDLE}, ...npcCfg, scale: 1.05 }) // prettier-ignore
const npcAdultFemale2 = new PlayerSprite({sprites: {idle: IMGS_ADULT_FEMALE_2_IDLE}, ...npcCfg, scale: 1.05 }) // prettier-ignore
const npcAdultFemale3 = new PlayerSprite({sprites: {idle: IMGS_ADULT_FEMALE_1_IDLE}, ...npcCfg, scale: 1.05 }) // prettier-ignore
const npcAdultFemale4 = new PlayerSprite({sprites: {idle: IMGS_ADULT_FEMALE_2_IDLE}, ...npcCfg, scale: 1.05 }) // prettier-ignore
const npcAdultFemale5 = new PlayerSprite({sprites: {idle: IMGS_ADULT_FEMALE_1_IDLE}, ...npcCfg, scale: 1.05 }) // prettier-ignore
const npcTeenBoy2 = new PlayerSprite({ sprites: { idle: IMGS_TEENAGE_BOY_IDLE }, ...npcCfg, scale: 0.98 }); // prettier-ignore
const npcTeenBoy3 = new PlayerSprite({ sprites: { idle: IMGS_TEENAGE_BOY_IDLE }, ...npcCfg, scale: 0.98 }); // prettier-ignore
const npcTeenBoy1 = new PlayerSprite({ sprites: { idle: IMGS_TEENAGE_BOY_IDLE }, ...npcCfg, scale: 0.98 }); // prettier-ignore
const npcTeenGirl1 = new PlayerSprite({ sprites: { idle: IMGS_TEENAGE_GIRL_IDLE }, ...npcCfg });
const npcTeenGirl2 = new PlayerSprite({ sprites: { idle: IMGS_TEENAGE_GIRL_IDLE }, ...npcCfg });
const npcTeenGirl3 = new PlayerSprite({ sprites: { idle: IMGS_TEENAGE_GIRL_IDLE }, ...npcCfg });
const npcElderMan = new PlayerSprite({ sprites: {idle: IMGS_ELDER_MAN_IDLE}, ...npcCfg}) // prettier-ignore
const npcElderWoman = new PlayerSprite({ sprites: {idle: IMGS_ELDER_WOMAN_IDLE}, ...npcCfg}) // prettier-ignore
const npcBeachMale1 = new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_MALE_1_IDLE }, ...npcCfg }); // prettier-ignore
const npcBeachMale2 = new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_MALE_2_IDLE }, ...npcCfg }); // prettier-ignore
const npcBeachFemale1 = new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_FEMALE_1_IDLE }, ...npcCfg }); // prettier-ignore
const npcBeachFemale2 = new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_FEMALE_2_IDLE }, ...npcCfg }); // prettier-ignore
const npcFloristMale1 = new PlayerSprite({ sprites: { idle: IMGS_FLORIST_MALE_IDLE }, ...npcCfg }); // prettier-ignore
const npcFloristFemale1 = new PlayerSprite({ sprites: { idle: IMGS_FLORIST_FEMALE_IDLE }, ...npcCfg }); // prettier-ignore

// Then call that function once in module-level and at the end of the event (never in scene.enter)
function spawnOverworldNpcs() {
  // 2 people near house
  respawnNPC(npcAdultFemale4, [66.55, 48 + 3]);
  respawnNPC(npcAdultMale2, [66.5, 49.5 + 3]);
  // 2 people south of house (yellow roof)
  respawnNPC(npcAdultMale3, [55, 61]);
  respawnNPC(npcTeenGirl1, [54.15, 62]);
  // 1 people at the small park near bunch of coconut trees
  respawnNPC(npcAdultMale4, [35, 60.5]);
  // 1 people at the gazebos
  respawnNPC(npcAdultMale5, [26.5, 38]);
  // 2 people at the top-left near the blue roof house
  respawnNPC(npcAdultFemale2, [18.25, 6]);
  respawnNPC(npcAdultFemale3, [19.25, 6]);
  // 1 people under the tree of the blue roof house with 2 people on top
  respawnNPC(npcAdultFemale1, [22.5, 12]);
  // 2 people near south of house with lots of garden
  respawnNPC(npcAdultFemale5, [54, 56.5]);
  respawnNPC(npcTeenGirl3, [55.75, 58]);
  // 1 people north of market
  respawnNPC(npcTeenBoy2, [98, 67.25]);
  // 1 people near the 2 elder couple at the shore of beach
  respawnNPC(npcTeenGirl2, [61.75, 91]);
  // 4 people on the beach blocking path to the avatar
  respawnNPC(npcBeachFemale1, [11.25, 55.5]);
  respawnNPC(npcBeachFemale2, [10.25, 57.5]);

  npcAdultFemale4.face("s");
  npcAdultMale3.face("s");
  npcAdultMale4.face("s");
  npcTeenBoy2.face("s");
  npcTeenGirl2.face("s");
  npcBeachFemale1.face("s");
  npcBeachMale2.face("s");
  npcBeachFemale2.face("s");
  npcAdultMale5.face("d");
  npcAdultFemale1.face("a");
  npcAdultFemale2.face("d");
  npcAdultFemale3.face("a");
  npcAdultFemale5.face("w");
  npcTeenGirl1.face("d");
  npcAdultMale2.face("a");
  npcTeenGirl3.face("a");

  // ======================================================
  // SKIP ALL interactions below this line ================

  // The Avatar Casts
  respawnNPC(npcAppa, [6.75, 30]);
  respawnNPC(npcAang, [18, 30.5]);
  respawnNPC(npcKatara, [18.5, 30.5]);
  respawnNPC(npcSokka, [11, 33.5]);
  respawnNPC(npcToph, [12.5, 33.5]);
  npcAppa.face("d");
  npcAang.face("d");
  npcKatara.face("a");
  npcSokka.face("d");
  npcToph.face("a");

  respawnNPC(npcBeachMale2, [9.25, 57.5]);
  respawnNPC(npcBeachMale1, [6.5, 55]);
  npcBeachMale1.face("a");

  respawnNPC(npcTeenBoy1, [123, 27.5]);
  npcTeenBoy1.face("s");

  respawnNPC(npcFloristMale1, [42.5, 40]);
  respawnNPC(npcFloristFemale1, [42.5, 41]);
  npcFloristMale1.face("d");
  npcFloristFemale1.face("d");

  respawnNPC(npcElderWoman, [60.5, 94]);
  respawnNPC(npcElderMan, [60.65, 94.5]);
  npcElderWoman.face("a");
  npcElderMan.face("a");

  respawnNPC(npcAdultMale1, [78.5, 95.85]);
  respawnNPC(npcTeenBoy3, [78, 96]);
  npcAdultMale1.face("a");
  npcTeenBoy3.face("d");
}

spawnOverworldNpcs();

// A rare, story-relevant side event — kept idempotent and re-derived every
// call rather than placed once, so calling it from initSideQuests() (every
// enter(), not re-entrant spawnOverworldNpcs(), see its own doc) keeps the
// elder couple positioned correctly across scene re-entries, and
// interactFloristHeart() can call it again immediately once
// isFlowerGardenAvailable flips, without waiting for the next scene
// transition.
function spawnHeartGardenNpcs() {
  respawnNPC(npcFloristHeart, [45, 45]);
  npcFloristHeart.face("s");

  const atCenter = !isFlowerGardenAvailable;
  // respawnNPC(npcElderWomanHeart, atCenter ? [40.25, 24] : [41, 19]);
  // respawnNPC(npcElderManHeart, atCenter ? [40.85, 24] : [40, 19]);
  respawnNPC(npcElderWomanHeart, atCenter ? [40.25, 24] : [44.25, 31.7]);
  respawnNPC(npcElderManHeart, atCenter ? [40.85, 24] : [44.85, 31.7]);
  npcElderManHeart.face(atCenter ? "a" : "s");
  npcElderWomanHeart.face(atCenter ? "d" : "s");

  // Facing each other while at center is deliberate (see their own .face()
  // calls above) — facePlayer would undo that the moment either is talked
  // to. Once stepped aside, there's no pose left to protect.
  ELDER_MAN_HEART_INTERACTABLE.facePlayer = !atCenter;
  ELDER_WOMAN_HEART_INTERACTABLE.facePlayer = !atCenter;

  // Only the man is talked to while they're together at center (he speaks
  // for both); once stepped aside, both are their own separate conversation.
  if (atCenter) remove(INTERACTABLES, ELDER_WOMAN_HEART_INTERACTABLE);
  else addOnce(INTERACTABLES, ELDER_WOMAN_HEART_INTERACTABLE);
}

// createNpcMessages/npcMessagesInteractions: a tuple entry is an existing,
// already-spawned sprite (respawnNPC above already handled it — this just
// wires up its line + interactable registration); an object entry is a
// brand-new NPC, spawned/obstacled/interactable here too.
// Override before createNpcMessages() registers their tuple entries below —
// its own addOnce(interactables, sprite) call would otherwise win with the
// facePlayer:true default, since a bare sprite is added either way.
addOnce(INTERACTABLES, { sprite: npcBeachFemale1, facePlayer: false });
addOnce(INTERACTABLES, { sprite: npcBeachFemale2, facePlayer: false });

const NPC_MESSAGES = createNpcMessages(NPCS, INTERACTABLES, [
  [
    npcAdultFemale4,
    "f",
    "Grabe ang sarap mabuhay dito, napakalinis at relaxing ang paligid!",
    () => {
      DIALOGUE.effect(() => playExclamation(npcAdultMale2));
      DIALOGUE.effect(() => npcAdultMale2.face("w"), 0.5);
      DIALOGUE.queue({
        text: "At lalong masarap kasama ang mga taong mahal mo sa buhay.",
        color: "blue",
      });
    },
  ],
  [
    npcAdultMale2,
    "m",
    "Ang tao, kahit gaano mapag-isa, maaaring hindi niya lang nahahanap pa ang taong gusto niya kasama sa buhay na comfortable siya.",
  ],
  [
    npcAdultMale3,
    "m",
    "Mahilig ako mag-exercise upang mapanatiling malakas at malusog at ating mga katawan!",
  ],
  [
    npcTeenGirl1,
    "f",
    "Matatawag ko rin na responsable si Ama sapagkat siya ay nananatiling malakas at malusog!",
  ],
  [
    npcAdultMale4,
    "m",
    `Gumagamit ako ng GARDEN SHEARS para malinis tingnan ang mga bakod na halaman.`,
    () => DIALOGUE.queue(`Kapag hindi gin-trim, makikita mo parang gubat sa kabilang bahay.`),
  ],
  [npcAdultMale4, "m", "Ang sarap mabuhay dito at simple lamang ang mabuhay!"],
  [
    npcAdultFemale2,
    "f",
    "d",
    "Oy mars, nabalitaan ko, pagkatapos daw ng event mamaya, yung F4 pupunta sa beach!",
  ],
  [npcAdultFemale3, "f", "a", "Ako naman nabalitaan ko na namataan daw ang Avatar sa beach!"],
  [npcAdultFemale1, "f", "a", "Ang sarap tingnan ng beach lalo na kung tahimik ang alon ng tubig."],
  [
    npcAdultFemale5,
    "f",
    "s",
    "Nagtatanim ako dahil sapat na ito sa kabuhayan namin at stress-free!",
  ],
  [
    npcTeenGirl3,
    "f",
    "a",
    "Tama si inay na simple lang ang mamuhay, at meron rin ako napuulot na maganda lesson sa mga messages in a bottle sa beach!",
  ],
  [
    npcTeenBoy2,
    "m",
    "d",
    `
    Si mama mahilig mag window shopping, 
    at literal na nandito lang kami ganito
    kalayo ang tingin sa market.
    Pero sa totoo lang, inaabangan niya sila MEIZUO at XIMEN.
    `,
  ],
  {
    idleSprites: IMGS_ADULT_FEMALE_1_IDLE,
    tile: [98.5, 67.25],
    face: "s",
    gender: "f",
    direction: "s",
    message: `Nagwiwindow shopping lang kami ng anak ko sa market.`,
  },
  [
    npcTeenGirl2,
    "f",
    "s",
    "Idol ko si lolo at lola na magkasama pa rin hanggang ngayon at nagbobonding everyday!",
  ],
  [
    npcBeachFemale1,
    "f",
    "Super sarap dito magpahinga at humiga! Maganda na pwesto ko ayaw ko na kumilos pa muna.",
  ],
  [
    npcBeachFemale2,
    "f",
    "Ang gusto ko sa buhay ay makasama ng ganitong moment palagi ang mahal ko.w",
  ],
  {
    idleSprites: IMGS_ELDER_MAN_IDLE,
    tile: [68, 51.5],
    face: "w",
    gender: "m",
    message: `Kailangan panatilihin malinis ang kapaligiran.`,
  },
  [
    npcFloristHeart,
    "f",
    "s",
    "FLORIST: Hi! Tuloy lang po kayo sa flowershop namin — The heart behind every garden in town!",
    interactFloristHeart,
  ],
]);

const MAIN_EVENT_GUESTS_LEFT_SIDE = [
  npcAdultMale2,
  npcAdultFemale1,
  npcAdultFemale2,
  npcTeenBoy1,
  npcBeachMale2,
  npcAdultFemale4,
  npcBeachFemale1,
];

const MAIN_EVENT_GUESTS_RIGHT_SIDE = [
  npcTeenGirl1,
  npcElderMan,
  npcElderWoman,
  npcBeachFemale2,
  npcAdultFemale3,
  npcBeachMale1,
];

const OVERWORLD_NPCS_ATTENDING_MAIN_EVENT = [
  ...MAIN_EVENT_GUESTS_LEFT_SIDE,
  ...MAIN_EVENT_GUESTS_RIGHT_SIDE,

  // Not seated (Left side)
  npcFloristMale1,
  npcFloristFemale1,
  npcTeenGirl2,
  npcTeenBoy2,

  // Not seated (Right side)
  npcAdultMale1,
  npcAdultMale3,
  npcAdultMale4,
  npcAdultMale5,
  npcAdultFemale5,
  npcTeenGirl3,
  npcTeenBoy3,
];

const MAIN_EVENT_GUESTS = [
  GAME_STATE.mama,
  GAME_STATE.papa,
  npcAang,
  npcAppa,
  npcKatara,
  npcSokka,
  npcToph,
  npcIroh,
  npcZuko,

  ...OVERWORLD_NPCS_ATTENDING_MAIN_EVENT,
];

const BOUNDARIES_MAIN_EVENT = createBoundaries(COLLISION_OVERWORLD_EVENT);
const BOUNDARIES_PARK_NORMAL = createBoundaries(COLLISION_OVERWORLD_NON_EVENT);

export const overworldScene: Scene = {
  fadeIn: 1,
  fadeOut: 0.5,
  ready: preload([
    background.image,
    foreground.image,
    backgroundEvent.image,
    // TODO: is this the right place for the backgroundEvent, where we want to lazy load it once in a specific time?
  ]).then(() => prepareViewportClamped([background, foreground, backgroundEvent])),

  enter() {
    let bgMusicDelay = 0.5;
    if (!GAME_STATE.sequence.intro) bgMusicDelay = 1;
    gsap.delayedCall(overworldScene.fadeIn! + bgMusicDelay, () => {
      // This timer runs independently of the trigger-zone system, so check
      // fresh whether the player's still standing in sound_teashop (e.g.
      // spawned right at the door on exit, see soundTeashop) before blindly
      // starting the default theme over whatever that zone's onEnter
      // already set up — sound_teashop has no onLeave of its own to redo
      // this once the player walks away, so this check runs at fire time,
      // not spawn time, and correctly finds them already gone by then too.
      // "sound_teashop" names TWO separate zone rects (two separate
      // TriggerZone instances, each tracking its own `entered`) — `some`,
      // not `find`+`?.`, since checking only the first instance missed the
      // player standing in the other one.
      const nearTeashop = GAME_STATE.triggerZones.some(
        (z) => z.name === "sound_teashop" && z.entered,
      );
      if (!nearTeashop) audioPlayMusic("overworld", { seek: 0, fade: 2, volume: VOLUME_MAIN_BG });
    });

    if (!GAME_STATE.bagIconVisible)
      gsap.delayedCall(overworldScene.fadeIn! + 0.5, () => hudSetBagIconVisible(true));

    player.face("s");
    GAME_STATE.papa.face("s");
    // Spawn at specific tiles (col, row from Tiled's bottom-left readout).
    // Default here is "arrived from home" — whichever scene set spawnLocation
    // (e.g. mansion's exit) takes priority; consumed so it doesn't leak into
    // a later, unrelated entry (e.g. a straight game boot into overworld).
    // spriteSize pins this to the player's stable boxSize — see the same
    // comment in home.ts, or spriteSize's own doc in positioning.ts.
    const spawnTile = GAME_STATE.spawnLocation ?? [58.9, 42];
    placeAtTile({
      sprite: player,
      tile: spawnTile,
      spriteSize: player.boxSize,
    });
    GAME_STATE.spawnLocation = undefined;

    GAME_STATE.boundaries = createBoundaries(COLLISION_OVERWORLD);
    // Normal park boundaries — before questDaoMingKeys resolves (main event
    // not unlocked yet) and after questMain resolves (main event already
    // torn down by closingRemarks()). Not during: initMainEvent() (called
    // from initMainQuests(), below) layers BOUNDARIES_MAIN_EVENT on top instead
    // for that window, and nothing here must also be active then.
    if (questDaoMingKeys.status !== "resolved" || isQuestResolved(questMain)) {
      BOUNDARIES_PARK_NORMAL.forEach((b) => addOnce(GAME_STATE.boundaries, b));
    }
    GAME_STATE.triggerZones = createTriggerZones(TRIGGER_OVERWORLD);

    GAME_STATE.obstacles = [...NPCS, ...STREET_LIGHTS, ...SIGNPOSTS.map(({ sprite }) => sprite)];

    // `&& GAME_STATE.gameStarted` guards against this scene's `enter()` ever
    // running before the boot Start screen has been dismissed (currently
    // possible via the dev-boot shortcut that defaults straight into
    // "overworld") — this overlay's `.game-effect-overlay` class carries a
    // `z-index: 9999`, so without this guard it would render right on top
    // of the Start screen's own cover, visibly animating before the player
    // ever clicked Start. The only place this reveal should ever play is
    // the real in-game first-ever arrival at overworld, which can only
    // happen after Start, by definition.
    if (!GAME_STATE.sequence.intro && GAME_STATE.gameStarted) {
      GAME_STATE.sequence.intro = true;
      overworldScene.fadeIn = 0.5;
      playIrisReveal({
        duration: 3,
        delay: 1, // matches home's fadeOut (1s) so it starts as the fade-in begins, not during the fade-out
        softness: 20,
        onComplete: () => (GAME_STATE.movementLocked = false),
      });
    } else {
      GAME_STATE.movementLocked = false; // no cutscene this time — nothing to wait for
    }

    if (questRunningShoes.status !== "inactive") {
      spawnMamaAtOverworld();
    }

    // New companion
    if (isQuestResolved(questMain)) {
      addOnce(INTERACTABLES, jp);
      respawnNPC(jp, [spawnTile[0] - 1, spawnTile[1]]);
      jp.face("s");
    }

    initMainQuests();
    initSideQuests();
    // DECORS may have just changed inside initMainQuests()/initSideQuests()
    // (e.g. a quest-gated prop toggling on/off this same visit) — filtering
    // OBSTACLE_DECORS against DECORS here, after both have run, means a prop that
    // just appeared/disappeared this visit obstructs (or stops) right away
    // instead of only taking effect from the next re-entry.
    OBSTACLE_DECORS.filter((d) => DECORS.includes(d)).forEach((d) =>
      addOnce(GAME_STATE.obstacles, d),
    );
  },

  update(dt) {
    DECORS.filter(isInViewport).forEach((sprite) => sprite.update(dt));

    const jpActive = isQuestResolved(questMain) && !jpFollowPaused;
    // jp is only excluded here once jpActive — otherwise followSprite()
    // never runs (it's a no-op while inactive), so nothing would ever call
    // jp.update(dt) at all: any scripted walk() on jp before questMain
    // resolves (e.g. cutsceneMidAisleJp) would tween its position with no
    // animation, frozen on whatever frame it last had.
    NPCS.filter(isInViewport)
      .filter((npc) => npc !== jp || !jpActive)
      .forEach((n) => n.update(dt));

    if (paperWindAnimating) paperWind1.update(dt);

    const playerBox = movePlayer(dt);
    checkTriggerZones(playerBox, GAME_STATE.triggerZones, TRIGGER_HANDLERS);

    jpCompanion.follow(dt, jpActive);
    if (jpActive) trackFootstep(jp, isInsideZone("sand", jp.collisionBox, GAME_STATE.triggerZones));

    updateFootprints(dt);
    trackFootstep(player, isInsideZone("sand", playerBox, GAME_STATE.triggerZones));
    updateInteraction(INTERACTABLES, interactions);
  },

  draw(ctx) {
    if (questDaoMingKeys.status === "resolved" && !GAME_STATE.sequence.closing_remarks)
      drawViewportClamped(ctx, backgroundEvent);
    else drawViewportClamped(ctx, background);

    // GAME_STATE.boundaries.forEach((b) => b.draw(ctx)); // for debugging and boundary visibility
    DECORS.filter(isInViewport).forEach((sprite) => sprite.draw(ctx));
    drawFootprints(ctx);
    drawYSorted(ctx, [
      player,
      ...NPCS.filter(isInViewport),
      ...STREET_LIGHTS.filter(isInViewport),
      ...SIGNPOSTS.map(({ sprite }) => sprite).filter(isInViewport),
      ...[bulletinBoard, balloonArch].filter((s) => isInViewport(s) && DECORS.includes(s)),
    ]);

    // There were supposed to have a different foreground for each background
    // but it turns out that there's only a single foreground during the event
    // and not worth it at all to create another foreground of a large size
    // but still keeping this condition here as an example
    // and in case foreground increases, then it's only worth
    // to create another foreground image of the same large size
    if (questDaoMingKeys.status === "resolved" && !GAME_STATE.sequence.closing_remarks)
      drawViewportClamped(ctx, foreground);
    else drawViewportClamped(ctx, foreground);

    if (GAME_STATE.facedTarget) drawInteractPrompt(ctx, GAME_STATE.facedTarget, INTERACTABLES);

    if (paperWindAnimating) paperWind1.draw(ctx);
  },
};

function initMainQuests() {
  // Main event's already been torn down once, by closingRemarks() itself,
  // right as it happened — nothing left to do on any later re-entry.
  if (isQuestResolved(questMain)) return;

  // Season 1:
  initQuestsDaomingsi();
  initBulletinBoard();
  initQuestsHuazelei();
  initTracingPaper2();
  initCoreMessageBottle();
  spawnMazeChest();
  initMarketEvent();
  initMainEventGuards();
  initMainEvent();
}

// Side events outside questMain's own timeline — grouped separately so a
// future one (unlike initMainQuests' own contents) doesn't need to care
// about, or get bailed out by, questMain's own resolved/not-resolved state.
function initSideQuests() {
  // Resets here only — not inside spawnHeartGardenNpcs() itself, since
  // interactFloristHeart() also calls that one directly, right after
  // setting isFlowerGardenAvailable = true to step the couple aside
  // immediately. A reset inside the shared function would undo that same call.
  isFlowerGardenAvailable = false;
  spawnHeartGardenNpcs();
}

function initQuestsDaomingsi() {
  // Spawn Hua Ze Lei after meeting Dao Ming Si. Re-checked on every
  // re-entry (we don't know which visit is the first one after the flag
  // flips), so both additions go through addOnce to stay idempotent.
  if (GAME_STATE.sequence.meet_daomingsi) {
    if (questMazeChest.status === "active") {
      return; // Do not spawn Hua Ze Lei at the park to prep for maze chest cutscene
    }
    respawnNPC(huazelei, [81.5, 35]);
    addOnce(INTERACTABLES, HUAZELEI_INTERACTABLE);
    huazelei.face("w");
  }
}

function initQuestsHuazelei() {
  if (!GAME_STATE.sequence.meet_huazelei) {
    placeAtTile({ sprite: paperWind1, tile: [81.25, 34] });
    placeAtTile({ sprite: paperSingle, tile: [81, 34] });
    addOnce(DECORS, paperSingle);
  }

  // Catching sheets just started OR still meeting Lei
  if (
    (questCatchSheets.status === "active" && questCatchSheets.qty === 0) ||
    !GAME_STATE.sequence.meet_huazelei
  )
    placeAtTile({ sprite: paperMulti, tile: [82, 44] });

  if (questCatchSheets.status === "active" && questCatchSheets.qty === 0) {
    spawnPaperMulti();
  }
}

function initTracingPaper2() {
  if (questCatchSheets.qty !== 1) return;
  remove(DECORS, paperSingle);
  removeInteractable(INTERACTABLES, paperSingle);

  const { chasing_sheet_2, retrieving_sheet_2 } = GAME_STATE.sequence;

  let spawnLocation: [number, number] | null = null;

  // Spawn tracing paper #2 (part 1)
  if (!chasing_sheet_2 && !retrieving_sheet_2) {
    spawnLocation = [37, 43];
  }

  // Part 2
  if (chasing_sheet_2 && !retrieving_sheet_2) {
    spawnLocation = [42, 72];
  }

  if (spawnLocation) {
    const [a, b] = spawnLocation;
    placeAtTile({ sprite: paperSingle, tile: spawnLocation });
    placeAtTile({ sprite: paperWind1, tile: [a + 0.25, b] });
    addOnce(DECORS, paperSingle);
    addOnce(INTERACTABLES, {
      sprite: paperSingle,
      label: "Pick up",
      probeDistance: 8,
      labelOffset: { y: 40 },
    });
    tracingPaper2ShineHandle?.stop();
    tracingPaper2ShineHandle = playShine(paperSingle, {
      color: "#fff",
      mode: "hidden",
      size: 32,
      delay: overworldScene.fadeIn!,
    });
  }
}

function spawnMamaAtOverworld() {
  respawnNPC(GAME_STATE.mama, [62, 39]);
  GAME_STATE.mama.face("d");
  GAME_STATE.papa.face("a");
  addOnce(INTERACTABLES, GAME_STATE.mama);
}

function cutsceneRunningShoes() {
  if (
    questRunningShoes.status !== "active" || //
    GAME_STATE.sequence.mama_running_shoes
  ) {
    return;
  }

  cancelScheduledFace(GAME_STATE.mama);

  hudSetBagIconVisible(false);

  DIALOGUE.effect(beginCutscene, 0.00001);
  DIALOGUE.effect(() => walk(player, [58.9, 42], { onComplete: convo }), 0.5);

  function convo() {
    const mama = GAME_STATE.mama;
    mama.face("s");
    playAttentionBounce(mama);
    playExclamation(mama);

    DIALOGUE.show({
      text: `MAMA: CHING! Nakita ko hinahabol mo yung papel...`,
      color: "red",
    });
    DIALOGUE.queue(`Buti nakita ko si HUA ZE LEI, pinatawag kita.`);
    DIALOGUE.queue(`
    Yung RUNNING SHOES nasa loob ng bahay,
    kunin mo na lang para mas mabilis ka makapunta
    sa bawat iba't ibang lugar sa paligid.
  `);
    DIALOGUE.onComplete = () => {
      hudSetBagIconVisible(true);
      scheduleMamaFacePapa();
    };
  }
}

function cutsceneStartMessageBottle() {
  if (
    //
    GAME_STATE.sequence.mama_starts_bottle
  ) {
    return;
  }

  cancelScheduledFace(GAME_STATE.mama);

  beginCutscene(); // stays within overworld — unlike exitMap(), this doesn't stop the music/ambience meant for an actual scene transition

  player.face("w");
  const mama = GAME_STATE.mama;
  mama.face("s");
  playAttentionBounce(mama);
  playExclamation(mama);

  DIALOGUE.show({
    text: `MAMA: CHING! May nasagap ako na balita tungkol sa treasure...`,
    color: "red",
  });
  DIALOGUE.queue(`Narinig ko kwento ng iba meron daw "Message-in-a-bottle" sa beach area.`);
  DIALOGUE.queue(`May nilalaman daw ito kaalaman tungkol sa kayamanan para sa event mamaya.`);
  DIALOGUE.onComplete = () => {
    GAME_STATE.sequence.mama_starts_bottle = true;
    hudSetBagIconVisible(true);
    scheduleMamaFacePapa();
    spawnCoreMessageBottle();
    questSetStatus(questMessageBottle, "active");
    playQuestToast(questMessageBottle);
  };
}

function interactions(target: Sprite | undefined) {
  const { readMessage } = createReadDispatch(target);

  if (readMessage(bulletinBoard, `An announcement from the bulletin reads...`)) {
    DIALOGUE.queue(`PARK ANNOUNCEMENT`);
    DIALOGUE.queue(`
      We are delighted to announce that preparations for a
      very special celebration will soon begin within the
      park grounds.
      
      For the duration of these preparations, the park will
      be closed to the public. We kindly ask for your
      understanding — and warmly welcome any volunteers
      wishing to help bring this celebration to life.

      — Park's Event Coordinator
    `);
    return;
  }

  SIGNPOSTS.forEach(({ sprite, message }) => readMessage(sprite, message));
  MSG_BOTTLES.forEach(({ sprite, message }) => {
    if (readMessage(sprite, "[MESSAGE IN A BOTTLE]")) {
      DIALOGUE.queue(message);
      queueMsgBottleNudge();
    }
  });

  npcMessagesInteractions(target, NPC_MESSAGES);

  switch (target) {
    case jp:
      interactJp();
      break;
    case GAME_STATE.papa:
      interactPapa();
      break;
    case GAME_STATE.mama:
      interactMama();
      break;
    case huazelei:
      interactHuazelei();
      break;
    case paperMulti:
      interactPaperMulti();
      break;
    case paperSingle:
      const { chasing_sheet_2, retrieving_sheet_2 } = GAME_STATE.sequence;
      if (!chasing_sheet_2 && !retrieving_sheet_2) interactPaper2Part1();
      if (chasing_sheet_2 && !retrieving_sheet_2) interactPaper2Part2();
      break;
    case wildBushPaper:
      interactWildBush(wildBushPaper);
      break;
    case wildBushMazeEntrance:
      interactWildBush(wildBushMazeEntrance);
      break;
    case wildBushMazeChest:
      interactWildBush(wildBushMazeChest);
      break;
    case wildBushBeach1:
      interactWildBush(wildBushBeach1);
      break;
    case wildBushBeach2:
      interactWildBush(wildBushBeach2);
      break;
    case coreMsgBottle:
      readCoreMsgBottle();
      break;
    case chestClose:
      openMazeChest();
      break;
    case ximen:
      interactXimen();
      break;
    case meizuo:
      interactMeizuo();
      break;
    case npcElderManHeart:
    case npcElderWomanHeart:
      interactGoldenWed(target);
      break;
  }

  if (PARK_EVENT_GUARDS.includes(target as PlayerSprite)) {
    DIALOGUE.show(
      `DAO MING STAFF: Bawal po muna dito ang entrance. Pasensiya na. May private event lang po...`,
    );
    return;
  }

  if (AISLE_GUARDS.includes(target as PlayerSprite)) {
    if (questDaoMingKeys.status !== "resolved") {
      DIALOGUE.show(
        `DAO MING STAFF: Bawal po muna dito ang entrance. Pasensiya na. May private event lang po...`,
      );
    } else {
      DIALOGUE.show(`DAO MING STAFF: Tuloy po kayo at nag simula na ang event.`);
    }
    return;
  }
}

function interactJp() {
  DIALOGUE.effect(() => {
    beginCutscene();
    playExclamation(jp, { glyph: "😎", hold: 3 });
  }, 0.00001);
  DIALOGUE.queue({ text: `JP: Leeeet's gooo Love! Saan tayo?`, color: "blue" });
  DIALOGUE.onComplete = () => hudSetBagIconVisible(true);
}

function interactPapa() {
  if (!GAME_STATE.sequence.meet_daomingsi) {
    DIALOGUE.show({
      text: `
        PAPA: Punta kayo sa mansion, daan sa kanan tapos taas.
        Meron daw pogi dun.
      `,
      color: "blue",
    });
  } else if (!GAME_STATE.sequence.meet_huazelei) {
    DIALOGUE.show({
      text: `
        PAPA: Punta ka sa park, daan sa kanan. May pogi rin dun!
      `,
      color: "blue",
    });
  }

  // No hints
  else {
    DIALOGUE.show({ text: "PAPA: Yes CHING?", color: "blue" });
  }

  if (questRunningShoes.status !== "inactive") cancelScheduledFace(GAME_STATE.papa);

  DIALOGUE.onComplete = () => {
    if (questRunningShoes.status !== "inactive") schedulePapaFaceMama();
  };
}

function interactMama() {
  if (questCatchSheets.status === "inactive") return;

  if (questRunningShoes.status !== "inactive") cancelScheduledFace(GAME_STATE.mama);

  if (questMessageBottle.status === "active") {
    DIALOGUE.show({
      text: `MAMA: Yung message-in-a-bottle matatagpuan daw sa tabing-dagat.`,
      color: "red",
    });
  } else if (questMazeChest.status === "active") {
    DIALOGUE.show({
      text: `MAMA: Abaw! Meron nga itong treasure map! Galing mo CHING!`,
      color: "red",
    });
    DIALOGUE.queue(`Go kunin mo na ang kayamanan at manalo sa event!`);
    DIALOGUE.effect(() => playExclamation(GAME_STATE.papa), 0.3);
    DIALOGUE.queue({
      text: `PAPA: Congrats CHING!`,
      color: "blue",
    });
    DIALOGUE.effect(() => schedulePapaFaceMama());
  }

  // No hints
  else {
    DIALOGUE.show({
      text: "MAMA: Yes CHING?",
      color: "red",
    });
  }

  DIALOGUE.onComplete = () => {
    if (questRunningShoes.status !== "inactive") scheduleMamaFacePapa();
  };
}

function interactHuazelei() {
  if (!GAME_STATE.sequence.meet_huazelei) {
    meetLeiConversation();
    return;
  }

  DIALOGUE.show({
    text: `HUA ZE LEI: Hello CHERYL.`,
    color: DIALOGUE_COLOR_HUAZELEI,
    portrait: PORTRAIT_HUAZELEI,
  });
}

function meetLeiConversation() {
  hudSetBagIconVisible(false);
  let shineHandle: EffectHandle | null = null;
  const cherryBlossomHandle = playCherryBlossoms({ duration: 60 * 60 * 24 * 2 });

  audioPlayMusic("zz_makeawish", { seek: 60 + 5.5, fade: 1, volume: VOLUME_MAIN_BG + 0.25 });

  DIALOGUE.effect(beginCutscene, 0.00001);

  DIALOGUE.effect(() => {
    DIALOGUE.lock();
    const quest = GAME_STATE.quests.get("meet_huazelei")!;
    gsap.delayedCall(6.5, () => {
      questSetStatus(quest, "resolved");
      playQuestToast(quest);
      playQuestCompleteBanner(`Meet Hua Ze Lei Completed!`);
    });
    gsap.delayedCall(10, () => DIALOGUE.unlock());
  });

  DIALOGUE.queue({
    text: "F4 HUA ZE LEI: Hello CHERYL...",
    color: DIALOGUE_COLOR_HUAZELEI,
    portrait: PORTRAIT_HUAZELEI,
  });
  f4Speaker("huazelei", `F4 HUA ZE LEI: Hello CHERYL, naghahanap ka ng kiss?`);

  DIALOGUE.effect(() => {
    playExclamation(player);
    playAttentionBounce(player, { hops: 3, duration: 0.1 });
    shineHandle = playShine(player);
    gsap.delayedCall(8, () => shineHandle?.stop());
  }, 0.5);
  DIALOGUE.queue(`...si "DAO MING SI" naghahanap ng kiss?`);
  DIALOGUE.effect(() => playExclamation(player), 0.5);
  DIALOGUE.queue(`Ahh, hinahanap niya ang "keys" o susi niya...`);
  DIALOGUE.queue(`Paumanhin ngunit wala naman sa akin ang mga keys niya.`);
  DIALOGUE.effect(() => {
    cherryBlossomHandle.fade();
    audioPlayAmbience("amb_wind_interior");
    DIALOGUE.clearPortrait();
    DIALOGUE.hideBox();
    playExclamation(huazelei);
    playAttentionBounce(paperSingle, { hops: 8, delay: 1, onComplete: removePaperSingle });

    function removePaperSingle() {
      remove(DECORS, paperSingle);
      paperWindAnimating = true;
      gsap.delayedCall(1.5, () => {
        huazelei.face("s");
        player.face("s");
      });
      gsap.delayedCall(0.5, () => audioPlaySound("quick_air_woosh"));
      drift(paperWind1, {
        to: [82, 45],
        waypoints: 8,
        wobble: 150,
        delay: 0.5,
        duration: 5,
        onComplete: () => {
          paperWindAnimating = false;
          audioStopAmbience("amb_wind_interior", 2);
        },
      });
    }
  }, 8);

  DIALOGUE.queue(`Nako, nilipad na ng hangin ang 3 pages ko na sketch!`);
  DIALOGUE.queue(`Hayaan na makita ng ibang tao ang sketch ko.`);
  DIALOGUE.effect(() => {
    DIALOGUE.clearPortrait();
    DIALOGUE.hideBox();
    gsap.delayedCall(0.5, () => {
      playExclamation(player);
      playAttentionBounce(player, { hops: 2 });
    });
  }, 1);

  DIALOGUE.queue({
    text: `Kunin ko na lang rin para makita ko ang ginagawa ni LEI!`,
    color: "black",
    portrait: null,
  });

  DIALOGUE.effect(() => {
    DIALOGUE.hideBox();
    const quest = GAME_STATE.quests.get("catch_sheets")!;
    playQuestToast(quest);
    questSetStatus(quest, "active");
    spawnPaperMulti();
  }, 0.5);

  DIALOGUE.onComplete = () => {
    GAME_STATE.sequence.meet_huazelei = true;
    hudSetBagIconVisible(true);
    audioPlayMusic("overworld", { fade: 2, volume: 0.2 });
  };
}

function interactPaperMulti() {
  remove(DECORS, paperMulti);
  removeInteractable(INTERACTABLES, paperMulti);

  hudSetBagIconVisible(false);
  GAME_STATE.movementLocked = true;
  playExclamation(player);
  playAttentionBounce(player);

  // Based on the initial tile spawn of paperMulti
  placeAtTile({ sprite: paperWind1, tile: [82 - 0.5, 44] });
  placeAtTile({ sprite: paperWind2, tile: [82 + 0.5, 44] });

  addOnce(DECORS, paperWind1);
  addOnce(DECORS, paperWind2);

  audioPlayAmbience("amb_wind_interior");
  paperWindAnimating = true;

  gsap.delayedCall(1, () =>
    walk(huazelei, [
      [82, 36],
      [82, 41],
    ]),
  );

  let gsapDelay = 0.5;
  gsap.delayedCall(0.5, () => player.face("a"));
  gsap.delayedCall((gsapDelay += 0.5), () => player.face("d"));
  gsap.delayedCall((gsapDelay += 0.5), () => player.face("a"));
  gsap.delayedCall((gsapDelay += 0.5), () => player.face("d"));
  gsap.delayedCall((gsapDelay += 0.5), () => player.face("a"));
  gsap.delayedCall((gsapDelay += 0.5), () => player.face("w"));
  gsap.delayedCall((gsapDelay += 0.5), () => {
    playExclamation(player);
    playAttentionBounce(player, {
      onComplete: () => gsap.delayedCall(0.5, convo),
    });
  });

  walk(player, [82, 43]);

  audioPlaySound("quick_air_woosh");
  drift(paperWind1, {
    to: { direction: "a", distance: 11 * TILE_SIZE },
    waypoints: 8,
    wobble: 150,
    duration: 3,
  });

  drift(paperWind2, {
    to: { direction: "d", distance: 11 * TILE_SIZE },
    waypoints: 8,
    wobble: 150,
    duration: 3,
    onComplete: () => {
      paperWindAnimating = false;
      gsap.delayedCall(5, () => audioStopAmbience("amb_wind_interior", 5));
    },
  });

  function convo() {
    DIALOGUE.show({
      text: `HUA ZE LEI: Walang problema, hindi mo na kailangan kunin ang mga papel na iyan.`,
      color: DIALOGUE_COLOR_HUAZELEI,
      portrait: PORTRAIT_HUAZELEI,
    });

    DIALOGUE.queue(`Basta ang mahalaga, nakuha mo na siya.`);
    DIALOGUE.queue(`Siya na may mahalagang papel sa buhay mo.`);
    DIALOGUE.queue(`Ang papel na gampanan niyo makasama ang isa't isa — habambuhay.`);

    DIALOGUE.effect(() => {
      DIALOGUE.clearPortrait();
      DIALOGUE.hideBox();
      gsap.delayedCall(1, () => {
        walk(
          huazelei,
          [
            [82, 37],
            [84.5, 37],
            [84.5, 36],
          ],
          {
            onComplete: () => huazelei.face("w"),
          },
        );
      });
    }, 0.5);

    DIALOGUE.effect(() => player.face("s"), 0.5);

    DIALOGUE.queue({
      text: `May nakuha naman ako isa bwehehehe. Hanapin ko pa yung iba...`,
      color: "black",
      portrait: null,
    });

    DIALOGUE.onComplete = () => {
      hudSetBagIconVisible(true);
      questIncreaseProgress(questCatchSheets, 1);
      playQuestToast(questCatchSheets);
      bagIncItem("paper1");
      initTracingPaper2();
      remove(DECORS, paperWind1);
      remove(DECORS, paperWind2);
    };
  }
}

function spawnPaperMulti() {
  addOnce(DECORS, paperMulti);
  addOnce(INTERACTABLES, {
    sprite: paperMulti,
    label: "Pick up",
  });
}

function interactPaper2Part1() {
  if (questCatchSheets.qty !== 1) return;

  audioPlayAmbience("amb_wind_interior");
  tracingPaper2ShineHandle?.stop();
  GAME_STATE.sequence.chasing_sheet_2 = true;
  remove(DECORS, paperSingle);
  removeInteractable(INTERACTABLES, paperSingle);

  gsap.delayedCall(0.5, () => {
    player.face("s");
    playAttentionBounce(player);
    playExclamation(player);
  });

  DIALOGUE.effect(() => {
    paperWindAnimating = true;
    hudSetBagIconVisible(false);
    gsap.delayedCall(0.3, () => audioPlaySound("quick_air_woosh"));
    drift(paperWind1, {
      to: { direction: "s", distance: 11 * TILE_SIZE },
      waypoints: 6,
      wobble: 120,
      delay: 0.5,
      duration: 3,
      onComplete: () => {
        paperWindAnimating = false;
        initTracingPaper2();
        hudSetBagIconVisible(true);
        playQuestToast(questCatchSheets);
        gsap.delayedCall(5, () => audioStopAmbience("amb_wind_interior", 5));
      },
    });
  }, 2.5);

  GAME_STATE.movementLocked = true;
  DIALOGUE.queue({
    text: `Oh no! Hinangin na naman!`,
    color: "black",
  });
}

function interactPaper2Part2() {
  if (questCatchSheets.qty !== 1) return;
  tracingPaper2ShineHandle?.stop();
  GAME_STATE.sequence.retrieving_sheet_2 = true;
  remove(DECORS, paperSingle);
  removeInteractable(INTERACTABLES, paperSingle);

  hudSetBagIconVisible(false);
  GAME_STATE.movementLocked = true;
  placeAtTile({ sprite: huazelei, tile: [37, 65] });

  DIALOGUE.show(`Nahuli rin kita — 2 down! 1 to go...`);
  DIALOGUE.effect(() => {
    DIALOGUE.hideBox();
    questSetProgress(questCatchSheets, 2);
    playQuestToast(questCatchSheets);
    bagIncItem("paper2");
  }, 1.5);
  DIALOGUE.effect(() => {
    walk(huazelei, [37, 71]);
    playAttentionBounce(player, { delay: 1 });
    playExclamation(player, { delay: 1 });
    gsap.delayedCall(0.5, () => player.face("a"));
  }, 2);
  DIALOGUE.effect(() => huazelei.face("d"));

  DIALOGUE.queue({
    text: `HUA ZE LEI: Oh CHERYL, nakita ko hinahabol mo pa rin sketch paper ko.`,
    portrait: PORTRAIT_HUAZELEI,
    color: DIALOGUE_COLOR_HUAZELEI,
  });
  DIALOGUE.queue(`Nagawa ako ulit bagong sketch...`);
  DIALOGUE.queue(`Para kasi yun sa event mamaya...`);
  DIALOGUE.queue(`Ikaw ba, nahanap mo na ang treasure na ipapakita para sa event?`);
  DIALOGUE.queue(`
    Oo nga pala, nakita ka kasi ni mama mo
    na hinahabol mo mga sketch papers ko.
  `);
  DIALOGUE.queue(`
    Tapos nakita niya ako, sabihin ko raw sa iyo
    na suotin mo ang "RUNNING SHOES", nasa bahay niyo.
  `);
  DIALOGUE.queue(`
    Mas makakatulong ito para mas mabilis ka makagalaw sa paligid.
  `);
  DIALOGUE.effect(() => {
    DIALOGUE.clearPortrait();
    DIALOGUE.hideBox();
  });
  DIALOGUE.effect(() => walk(huazelei, [37, 65]), 2);
  DIALOGUE.effect(() => {
    const q = GAME_STATE.quests.get("running_shoes")!;
    playQuestToast(questCatchSheets);
    gsap.delayedCall(0.8, () => playQuestToast(q));
    questSetStatus(q, "active");
    placeAtTile({ sprite: huazelei, tile: [84.5, 36] });
    hudSetBagIconVisible(true);
    spawnMamaAtOverworld();
  });
}

let shearsToastHandle: EffectHandle | null;

function interactWildBush(bushSprite: Sprite) {
  if (!bagHasItem("shears")) {
    DIALOGUE.show(`Di ako makadaan, may halaman sa daan...`);

    if (bushSprite === wildBushPaper && GAME_STATE.sequence.chasing_sheet_2) {
      DIALOGUE.onComplete = () => {
        shearsToastHandle?.stop();
        const quest = GAME_STATE.quests.get("garden_shears")!;
        questSetStatus(quest, "active");
        shearsToastHandle = playQuestToast(quest, {
          hold: 10,
          onComplete() {
            shearsToastHandle = null;
          },
        });
      };
    }

    return;
  }

  playExclamation(player, { icon: ICON_SHEARS, hold: 3 });
  DIALOGUE.show(`Using garden shears to trim the wild bush...`);
  DIALOGUE.effect(() => {
    audioPlaySound("garden_shovel_stab");
    playLeafBurst(bushSprite);

    gsap.delayedCall(0.5, () => audioPlaySound("garden_shovel_stab"));
    playLeafBurst(bushSprite, { delay: 0.5 });
  }, 0.00001);
  DIALOGUE.onComplete = () => {
    removeInteractable(INTERACTABLES, bushSprite); // dropped from here immediately — only the visual removal below is deferred

    // A few quick blinks (cut down, not just vanishing), then a final fade
    // to fully transparent — the actual removal from DECORS/obstacles
    // happens right as that last fade completes, so nothing lingers
    // invisible-but-still-there in between.
    gsap
      .timeline({
        onComplete: () => {
          remove(DECORS, bushSprite);
          remove(GAME_STATE.obstacles, bushSprite);
        },
      })
      .to(bushSprite, { opacity: 0.25, duration: 0.07, repeat: 5, yoyo: true })
      .to(bushSprite, { opacity: 0, duration: 0.15 });
  };
}

/**
 * Queued right after any common message bottle's own text — "this isn't
 * the one I'm looking for" — only while that quest is still active. Used by
 * the MSG_BOTTLES dispatch in interactions(); coreMsgBottle never calls
 * this, it's the one true bottle.
 */
function queueMsgBottleNudge() {
  if (questMessageBottle.status === "active") {
    DIALOGUE.queue(`Dili ito ang message-in-a-bottle na hinahanap ko...`);
  }
}

function readCoreMsgBottle() {
  DIALOGUE.show({ text: `[MESSAGE IN A BOTTLE]`, color: "black" });
  hudSetBagIconVisible(false);
  completeCoreMsgBottle();
}

/**
 * Dao Ming Si's "missing keys" flyer — visible only while questDaoMingKeys
 * is active, gone for good once it resolves. Unlike coreMsgBottle (spawn
 * once, never removed), this needs an explicit despawn branch too, since
 * it must disappear on resolution, not just stop re-appearing — re-checked
 * every initMainQuests() call so a resolve mid-visit still takes it down on the
 * very next entry.
 */
function initBulletinBoard() {
  if (questDaoMingKeys.status === "active") {
    addOnce(DECORS, bulletinBoard);
    addOnce(INTERACTABLES, BULLETIN_BOARD_INTERACTABLE);
    addOnce(GAME_STATE.obstacles, bulletinBoard);
    BEFORE_MAIN_EVENT_PROPS.forEach((props) => addOnce(DECORS, props));
  } else {
    remove(DECORS, bulletinBoard);
    remove(GAME_STATE.obstacles, bulletinBoard);
    removeInteractable(INTERACTABLES, bulletinBoard);
    BEFORE_MAIN_EVENT_PROPS.forEach((props) => remove(DECORS, props));
  }
}

function initCoreMessageBottle() {
  if (questRunningShoes.status === "resolved" && !GAME_STATE.sequence.mama_starts_bottle) {
    GAME_STATE.movementLocked = true;
    gsap.delayedCall(overworldScene.fadeIn! + 0.5, cutsceneStartMessageBottle);
  }

  if (questMessageBottle.status === "active") spawnCoreMessageBottle();
}

function spawnCoreMessageBottle() {
  if (!GAME_STATE.sequence.mama_starts_bottle) return;

  placeAtTile({ sprite: coreMsgBottle, tile: [24, 79] });
  addOnce(DECORS, coreMsgBottle);
  addOnce(INTERACTABLES, { sprite: coreMsgBottle, label: "Read", labelOffset: { y: 16 } });

  coreMsgBottleShineHandle = playShine(coreMsgBottle, { color: "#fff", mode: "hidden" });
}

function completeCoreMsgBottle() {
  if (questMessageBottle.status !== "active") return;
  GAME_STATE.movementLocked = true;

  DIALOGUE.queue(`... ... ...`);
  DIALOGUE.effect(() => {
    playAttentionBounce(player);
    playExclamation(player);
  }, 1.5);
  DIALOGUE.queue(`Ito na yung meron treasure map sa loob!`);
  DIALOGUE.effect(() => {
    GAME_STATE.movementLocked = true;
    DIALOGUE.hideBox();

    coreMsgBottleShineHandle?.stop();
    remove(DECORS, coreMsgBottle);
    removeInteractable(INTERACTABLES, coreMsgBottle);

    bagIncItem("treasure_map", 1);
    questSetStatus(questMessageBottle, "resolved");
    playQuestToast(questMessageBottle);
    playQuestCompleteBanner(`Treasure Map Obtained!`);

    despawnNPC(huazelei);
  }, 3);

  // Nothing queued here on purpose — queuing the lines below (and locking)
  // while playImagePreview is up is what let its lock icon (always above
  // the preview's own lower z-index, see image-preview.ts) and even the
  // lines themselves bleed through before the player closed it. Queuing
  // them from inside onComplete instead means there's nothing to show or
  // lock until the preview is already gone.
  DIALOGUE.effect(() => {
    beginCutscene();
    audioPlaySound("page_turn_forward", { volume: PAGE_SOUND_VOLUME });
    playImagePreview(PHOTO_TREASURE_MAP, {
      onComplete: () => {
        audioPlaySound("page_turn_backward", { volume: PAGE_SOUND_VOLUME });
        // .show(), not .queue() — this starts the conversation fresh, which
        // also sets GAME_STATE.movementLocked = true again on its own, so
        // movement stays locked once the image preview is actually closed.
        DIALOGUE.show(`Mahahanap ko na rin ang teasure para sa event!`);
        DIALOGUE.queue(`Ilagay ko lang sa bag ito treasure map para maalala ko...`);

        DIALOGUE.effect(() => {
          questSetStatus(questMazeChest, "active");
          playQuestToast(questMazeChest);
        }, 0.00001);

        DIALOGUE.onComplete = () => {
          GAME_STATE.movementLocked = false;
          hudSetBagIconVisible(true);
          spawnMazeChest();
        };
      },
    });
    // DIALOGUE's own queue goes idle right after this effect (nothing is
    // queued until playImagePreview's onComplete above queues more) — its
    // own idle-completion unconditionally releases movementLocked, which
    // would let the player move for however long the preview stays open.
    // Re-locking here runs synchronously from inside that same idle-check
    // (see pullPending() in dialogue.ts), so the false-then-true flip never
    // lands on a frame the game loop can actually observe as unlocked.
    DIALOGUE.onComplete = () => {
      GAME_STATE.movementLocked = true;
    };
  }, 0.00001);
}

function spawnMazeChest() {
  if (questMazeChest.status !== "active") return;
  placeAtTile({ sprite: chestClose, tile: [119.75, 7.75] });
  addOnce(DECORS, chestClose);
  addOnce(GAME_STATE.obstacles, chestClose);
  addOnce(INTERACTABLES, { sprite: chestClose, label: "Open", probeDistance: TILE_SIZE / 2 });
}

function openMazeChest() {
  if (questMazeChest.status !== "active") return;

  DIALOGUE.show("A chest— open ko na ito...");
  DIALOGUE.effect(() => {
    beginCutscene();
    placeAtTile({ sprite: chestOpen, tile: [119.75, 7.75] });
    addOnce(DECORS, chestOpen);
    addOnce(GAME_STATE.obstacles, chestOpen);
    playExclamation(chestOpen, { icon: ICON_UNLOCKED });
    audioPlaySound("gear_metallic_unlock");
    audioPauseMusic();
    removeInteractable(INTERACTABLES, chestClose);
    playExclamation(player);
  });
  DIALOGUE.effect(beginCutscene, 1.5);
  DIALOGUE.queue(`A music box...!`);
  DIALOGUE.queue(`Kunin ko na...`);
  DIALOGUE.effect(() => {
    beginCutscene();
    addOnce(DECORS, chestEmpty);
    addOnce(GAME_STATE.obstacles, chestEmpty);
    respawnNPC(daomingsi, [108, 7]);
    respawnNPC(huazelei, [107.5, 7.25]);
    gsap.delayedCall(0.5, () => {
      // audioPauseMusic();
      audioPlaySound("drums_of_preparations");
    });
    // gsap.delayedCall(2, () => audioPlayMusic("a_guitar_rock", { seek: 0, fade: 0, volume: 0.7 }));
    walk(daomingsi, [111.5, 7], {
      onComplete: () => daomingsi.face("s"),
    });
    gsap.delayedCall(0.1, () =>
      walk(huazelei, [111, 7.25], {
        onComplete: () => huazelei.face("w"),
      }),
    );
    gsap.delayedCall(0.5, () => player.face("a"));
    gsap.delayedCall(1.3, () => {
      playAttentionBounce(player, { hops: 3, duration: 0.09 });
      playExclamation(player);
    });
  }, 0.3);
  DIALOGUE.queue({
    text: `DAO MING SI: LEI, kailangan natin maayos na ang park para sa event mamaya dahil meron na'ng nakahanap ng treasure...`,
    color: DIALOGUE_COLOR_DAOMINGSI,
    portrait: PORTRAIT_DAOMINGSI,
  });
  DIALOGUE.effect(() => {
    beginCutscene();
    daomingsi.face("d");
  }, 2);
  DIALOGUE.effect(() => {
    beginCutscene();
    huazelei.face("d");
    playExclamation(daomingsi, {
      glyph: "?",
      color: "darkviolet",
      onComplete: () => walk(daomingsi, { direction: "d", steps: 2 }),
    });
    playAttentionBounce(daomingsi, { hops: 5, duration: 0.05, delay: 2 });
    playExclamation(daomingsi, { delay: 2 });
    playExclamation(player, { delay: 2 });
    playAttentionBounce(daomingsi, { hops: 5, duration: 0.05, delay: 4 });
    gsap.delayedCall(4, () => audioPlayMusic("a_guitar_rock", { seek: 0, volume: 0.7, fade: 0 }));
    playExclamation(daomingsi, { glyph: "🔥", delay: 4 });
    playExclamation(player, { delay: 4 });
    gsap.delayedCall(0.8, () =>
      walk(huazelei, [
        { direction: "a", steps: 2 },
        { direction: "s", steps: 2.5 },
        { direction: "d", steps: 8.5 },
      ]),
    );
  }, 5);
  DIALOGUE.queue({
    text: `DAO MING SI: Bakit mo naman pinutol ang mga halaman sa hardin ko?!`,
    portrait: PORTRAIT_DAOMINGSI_INTIMIDATE,
  });
  DIALOGUE.effect(() => {
    beginCutscene();
    walk(huazelei, { direction: "w", steps: 2.5 });
    playAttentionBounce(player, { hops: 2, duration: 0.09 });
    playExclamation(player, { hold: 5 });
  }, 1);
  DIALOGUE.queue({ text: `... ... ...`, portrait: null, color: "teal" });
  DIALOGUE.effect(() => huazelei.face("a"));
  DIALOGUE.queue({
    text: `HUA ZE LEI: Pasensiya ka na AH SI. May pinapahanap kasi ako sa kanya kanina...`,
    color: DIALOGUE_COLOR_HUAZELEI,
    portrait: PORTRAIT_HUAZELEI,
  });
  DIALOGUE.effect(() => huazelei.face("d"));
  DIALOGUE.queue(`
    (pabulong) Ibigay mo na sa akin yung
    nakuha mo bago pa tayo mabisto ni AH SI
    na nagpapanggap.
  `);
  DIALOGUE.queue(`Maraming salamat sa paghanap nito sa akin.`);
  DIALOGUE.effect(() => huazelei.face("a"));
  DIALOGUE.queue({
    text: `DAO MING SI: Bakit naman kasi meron ka iniiwan na gamit mo dito sa hardin ko...`,
    portrait: PORTRAIT_DAOMINGSI_INTIMIDATE,
    color: DIALOGUE_COLOR_DAOMINGSI,
  });
  DIALOGUE.effect(() => {
    audioStopMusic(5);
    gsap.delayedCall(5.5, () => soundGardenMaze(20));
  }, 0.00001);
  DIALOGUE.queue({
    text: `HUA ZE LEI: Pasensiya na AH SI...`,
    portrait: PORTRAIT_HUAZELEI,
    color: DIALOGUE_COLOR_HUAZELEI,
  });
  DIALOGUE.effect(() => daomingsi.face("s"));
  DIALOGUE.queue({
    text: `DAO MING SI: Tumatakbo ang oras, tayo na LEI, may gagawin pa tayo sa park.`,
    portrait: PORTRAIT_DAOMINGSI,
    color: DIALOGUE_COLOR_DAOMINGSI,
  });
  DIALOGUE.effect(() => {
    walk(
      daomingsi,
      { direction: "a", steps: 10 },
      {
        onComplete() {
          despawnNPC(daomingsi);
        },
      },
    );
    huazelei.face("d");
  });
  DIALOGUE.queue({
    text: `
      HUA ZE LEI: CHERYL, sa pagkakatanda ko ay hinahanap mo
      sila XI MEN at MEI ZUO para mahanap ang keys ni AH SI...`,
    portrait: PORTRAIT_HUAZELEI,
    color: DIALOGUE_COLOR_HUAZELEI,
  });
  DIALOGUE.effect(() => huazelei.face("s"));
  DIALOGUE.effect(() => {
    GAME_STATE.cameraFollow = false;
    DIALOGUE.lock();
    gsap.delayedCall(2, () => setCameraToTile([86, 19]));
    gsap.delayedCall(3, () => panCameraToTile([91, 31]));
    gsap.delayedCall(6, () => DIALOGUE.unlock());
  });
  DIALOGUE.queue(`Makikita mo lang sila kung pumunta ka sa timog na bahagi nitong mansion.`);
  DIALOGUE.effect(() => {
    DIALOGUE.lock();
    panCameraToTile([92, 66], {
      duration: 5,
      onComplete() {
        gsap.delayedCall(3, () => {
          GAME_STATE.cameraFollow = true;
          DIALOGUE.unlock();
        });
      },
    });
  });
  DIALOGUE.queue(`Sa timog ng park mismo makikita mo ang market dito.`);
  DIALOGUE.queue(`Sa market ginagawa ni XI MEN at MEI ZUO ang bahagi nila para sa event.`);
  DIALOGUE.queue(`Mauna na ako...`);
  DIALOGUE.effect(() => {
    beginCutscene();
    walk(
      huazelei,
      [
        { direction: "s", steps: 2.5 },
        { direction: "a", steps: 10 },
      ],
      {
        onComplete: () => {
          despawnNPC(huazelei);
          initMarketEvent();
        },
      },
    );
  }, 1.5);
  DIALOGUE.effect(() => {
    playAttentionBounce(player);
    playExclamation(player);
  });
  DIALOGUE.queue({ text: `Pero iyung teasure ko...`, portrait: null, color: "black" });
  DIALOGUE.effect(() => {
    beginCutscene();
    questSetStatus(questMazeChest, "resolved");
    playQuestToast(questMazeChest);
    playQuestCompleteBanner(`Completed!`);
    gsap.delayedCall(2, () => playQuestToast(quests.get("meet_meizuo")!));
    gsap.delayedCall(2.5, () => playQuestToast(quests.get("meet_ximen")!));
    initMainEventGuards();
  }, 3.5);
  DIALOGUE.onComplete = () => {
    hudSetBagIconVisible(true);
  };
}

function initMarketEvent() {
  if (questMazeChest.status !== "resolved") return;

  despawnNPC(huazelei);
  respawnNPC(meizuo, [101.5, 74]);
  respawnNPC(ximen, [105.5, 74]);
  addOnce(INTERACTABLES, meizuo);
  addOnce(INTERACTABLES, ximen);
  balloonCrates.forEach((decor) => {
    addOnce(DECORS, decor);
    addOnce(GAME_STATE.obstacles, decor);
  });

  let spawn = [102.5, 75] as [number, number];
  MARKET_EVENT_GIRLS_A.forEach((g, i) => {
    g.face("w");
    const x = i % 2 !== 0 ? spawn[0] + 0.25 : spawn[0];
    respawnNPC(g, [x, (spawn[1] += 0.5)]);
  });

  MARKET_EVENT_GIRLS_B.forEach((g, i) => {
    g.face("d");
    const y = i % 2 !== 0 ? spawn[1] + 0.25 : spawn[1];
    respawnNPC(g, [(spawn[0] -= 0.5), y]);
  });

  MARKET_EVENT_GIRLS_C.forEach((g, i) => {
    g.face("d");
    const y = i % 2 !== 0 ? spawn[1] + 0.25 : spawn[1];
    respawnNPC(g, [(spawn[0] -= 0.5), y]);
  });

  spawn = [104.5, 75];
  MARKET_EVENT_GIRLS_D.forEach((g, i) => {
    g.face("w");
    const x = i % 2 !== 0 ? spawn[0] + 0.25 : spawn[0];
    respawnNPC(g, [x, (spawn[1] += 0.5)]);
  });

  MARKET_EVENT_GIRLS_E.forEach((g, i) => {
    g.face("d");
    const y = i % 2 !== 0 ? spawn[1] + 0.25 : spawn[1];
    respawnNPC(g, [(spawn[0] -= 0.5), y]);
  });
}

function cutsceneMarket() {
  if (questMazeChest.status !== "resolved") return;
  hudSetBagIconVisible(false);

  // ! This pattern is IMPORTANT before a "Walk effect"
  // ! If this is missing, the walk effect will have a bug during animation
  // ! that it would move the player but stays in "idle" frame instead of "walk"
  DIALOGUE.effect(beginCutscene, 0.00000000000001);

  DIALOGUE.effect(() => {
    walk(player, [101.5, 75], {
      onComplete: () => {
        player.face("w");
        meizuo.face("w");
        ximen.face("s");
        playExclamation(meizuo);
        playExclamation(ximen);
      },
    });
  }, 3);

  f4Speaker("meizuo", `F4 MEI ZUO: Oh pumila lang kayo ng maayos diyan!`);

  DIALOGUE.effect(() => {
    beginCutscene();
    playExclamation(ximen);
  }, 0.5);

  f4Speaker("ximen", `F4 XI MEN: Isang halik kay MEI ZUO kada isang gawa/humihip ng lobo!`);
  f4Speaker("ximen", `Pinakamaraming kiss sa pinakamaraming lobo na magagawa!`);
  f4Speaker("meizuo", `MEI ZUO: Whoaooooooh yeah alright!`);

  DIALOGUE.effect(() => {
    audioPlayMusic("market", { volume: 0.01, fade: 0.5 });
    audioPlayAmbience("amb_shopping_crowd", { fade: 0.5, volume: 0.01 });
    beginCutscene();
    const q1 = quests.get("meet_meizuo")!;
    const q2 = quests.get("meet_ximen")!;
    questSetStatus(q1, "resolved");
    questSetStatus(q2, "resolved");
    playQuestToast(q1, { hold: 8 });
    playQuestToast(q2, { delay: 0.2, hold: 8 });
    playQuestCompleteBanner(`Meet Mei Zuo & Xi Men Complete!`);
    gsap.delayedCall(4, () => {
      audioPlayMusic("market", { volume: 0.3, fade: 0.5 });
      audioPlayAmbience("amb_shopping_crowd", { fade: 0.5, volume: 0.2 });
    });
  }, 5);

  DIALOGUE.effect(() => playExclamation(meizuo), 0.5);

  DIALOGUE.effect(() => {
    playAttentionBounce(meizuo);
    playExclamation(meizuo);
  }, 0.5);

  f4Speaker("meizuo", `Oii si CHE pala nandito!`);
  f4Speaker("meizuo", `XI MEN tingnan mo hahaha!`);

  DIALOGUE.effect(() => {
    playAttentionBounce(ximen);
    playExclamation(ximen);
  }, 0.5);

  f4Speaker(
    "ximen",
    `XI MEN: Hi CHE, naghahanda kami ni MEI ZUO ng mga lobo para sa event mamaya.`,
  );

  DIALOGUE.effect(() => playExclamation(player), 0.5);

  f4Speaker("meizuo", `MEI ZUO: Anu sabi mo CHE— naghahanap ka rin ng kiss?`);

  DIALOGUE.effect(() => playExclamation(player), 0.5);

  f4Speaker("meizuo", `Ahh yung "keys" ni AH SI?`);

  DIALOGUE.effect(() =>
    gsap.delayedCall(1, () => {
      meizuo.face("d");
      playAttentionBounce(meizuo);
    }),
  );

  f4Speaker("meizuo", `Wala sa akin. Nasa iyo ba XI MEN?`);
  f4Speaker("ximen", `XI MEN: Anung keys— ito talaga si AH SI.`);
  f4Speaker("ximen", `Alam ko binalik na namin iyun nasa mansion lang ni AH SI yun.`);
  DIALOGUE.effect(() => meizuo.face("s"));
  f4Speaker("meizuo", `MEI ZUO: CHE, Mabuti pa balik ka ulit sa mansion.`);
  f4Speaker("ximen", `XI MEN: Sabihin mo kay LIU wala sa amin.`);

  DIALOGUE.effect(() => meizuo.face("d"));
  f4Speaker("meizuo", `MEI ZUO: Hindi kaya keys ng treasure chest iyun?`);

  DIALOGUE.effect(() => {
    beginCutscene();
    ximen.face("a");
    gsap.delayedCall(0.5, () => playAttentionBounce(meizuo));
    gsap.delayedCall(0.7, () => playAttentionBounce(ximen));
    gsap.delayedCall(1, () => playExclamation(meizuo));
    gsap.delayedCall(1.7, () => playExclamation(ximen));
    gsap.delayedCall(2, () => meizuo.face("s"));
    gsap.delayedCall(2.3, () => ximen.face("s"));
  }, 3);

  f4Speaker(
    "meizuo",
    `
    Kami bahala CHE, balikan mo lang kami kapag hindi
    pa rin nahanap ang keys. Puntahan mo si LIU sa mansion.
    Kailangan pa namin tapusin ito mga lobo para sa event.
  `,
  );

  DIALOGUE.effect(beginCutscene, 1);
  DIALOGUE.effect(() => {
    meizuo.face("d");
    playAttentionBounce(meizuo);
    playExclamation(meizuo);
  }, 0.5);

  f4Speaker(
    `meizuo`,
    `MEI ZUO: Alam mo napaisip ako XI MEN, baka yung keys rin ni AH SI ang hanap ng mga babaeng nakapila dito sa atin.`,
  );

  DIALOGUE.effect(() => {
    beginCutscene();
    ximen.face("a");
  }, 1.5);

  DIALOGUE.effect(() => {
    beginCutscene();
    gsap.delayedCall(0.5, () => playAttentionBounce(meizuo));
    gsap.delayedCall(0.7, () => playAttentionBounce(ximen));
    gsap.delayedCall(1, () => playExclamation(meizuo));
    gsap.delayedCall(1.7, () => playExclamation(ximen));
  }, 3);

  f4Speaker(`ximen`, `XI MEN: Kiss ni AH SI?`);

  DIALOGUE.queue({ text: `... ... ...`, portrait: null, color: "black" });

  DIALOGUE.effect(() => {
    beginCutscene();
    gsap.delayedCall(0.5, () => playAttentionBounce(meizuo));
    gsap.delayedCall(0.7, () => playAttentionBounce(ximen));
    gsap.delayedCall(1, () => playExclamation(meizuo));
    gsap.delayedCall(1.7, () => playExclamation(ximen));
    gsap.delayedCall(2, () => meizuo.face("s"));
    gsap.delayedCall(2.3, () => ximen.face("s"));
  }, 3);

  DIALOGUE.effect(() => {
    beginCutscene();
    playExclamation(meizuo, { glyph: "🤣" });
    playAttentionBounce(meizuo, {
      hops: 5,
      onComplete() {
        playAttentionBounce(meizuo, { hops: 5, delay: 0.5 });
      },
    });
  });

  f4Speaker(`meizuo`, `MEI ZUO: HAHAHAHAHA! HAHAHAHAHAHA!`);

  DIALOGUE.onComplete = () => {
    playQuestToast(questDaoMingKeys, { delay: 0.5, hold: 10 });
    hudSetBagIconVisible(true);
    GAME_STATE.sequence.market_cutscene = true;
  };
}

function cutsceneMidAisle() {
  if (GAME_STATE.sequence.mid_aisle_cutscene && !isQuestResolved(questMain))
    player.moveSpeed = MAIN_EVENT_PLAYER_MOVESPEED;
  if (
    questDaoMingKeys.status !== "resolved" ||
    questMain.status !== "active" ||
    GAME_STATE.sequence.mid_aisle_cutscene
  )
    return;

  hudSetBagIconVisible(false);
  GAME_STATE.movementLocked = true;

  // ! This pattern is IMPORTANT before a "Walk effect"
  // ! If this is missing, the walk effect will have a bug during animation
  // ! that it would move the player but stays in "idle" frame instead of "walk"
  DIALOGUE.effect(beginCutscene, 0.00000000000001);

  DIALOGUE.effect(() => {
    walk(player, [94, 50.25], {
      onComplete: () => player.face("w"),
    });
  }, 1);

  DIALOGUE.effect(() => {
    playExclamation(daomingsi, {
      onComplete: () => {
        gsap.delayedCall(0.5, () => {
          playExclamation(daomingsi);
          playAttentionBounce(daomingsi);
        });
      },
    });
  }, 3);

  f4Speaker("daomingsi", `DAO MING SI: Okay, okay! Tahimik muna ang lahat!`);
  DIALOGUE.effect(() => {
    beginCutscene();
    audioStopAmbience(["amb_people_crowd", "amb_people_public"], 2);
    MAIN_EVENT_GUESTS_LEFT_SIDE.forEach((guest) => {
      gsap.delayedCall(Math.random(), () => guest.face("d"));
    });
    MAIN_EVENT_GUESTS_RIGHT_SIDE.forEach((guest) => {
      gsap.delayedCall(Math.random(), () => guest.face("a"));
    });
  }, 1.5);
  DIALOGUE.queue(`
      Alam kong napagod kayo kakahanap ng mga pahiwatig,
      pero hindi naman basta-bastang kayamanan ang hinahanap
      natin dito. Hindi lahat ng kayamanan ay ginto o alahas...
  `);
  DIALOGUE.effect(beginCutscene, 1.5);
  DIALOGUE.effect(() => {
    walk(huazelei, [
      //
      { direction: "s", steps: 2 },
      { direction: "d", steps: 1 },
      [95.25, 46.5],
    ]);
  });
  DIALOGUE.effect(() => {
    playExclamation(daomingsi);
    playAttentionBounce(daomingsi);
  }, 0.5);
  DIALOGUE.queue(`Minsan...`);
  DIALOGUE.queue(`
    ...ang pinakamahalagang kayamanan ay isang taong
    hindi kayang tumbasan ng kahit anong yaman.
  `);
  DIALOGUE.effect(beginCutscene, 1.5);
  DIALOGUE.effect(() => {
    playExclamation(daomingsi);
    playAttentionBounce(daomingsi);
  }, 0.5);
  DIALOGUE.queue(`
    Lubos rin ako nagpapasalamat kay CHE para sa suporta,
    bawat kilos, galaw at oras niya na ibinigay sa paghanap ng
    keys.
  `);
  DIALOGUE.effect(beginCutscene, 1.5);
  DIALOGUE.queue(`
    Sa katunayan nga ay muntik na madulas si LIU mabanggit
    ang "keyk".
  `);
  DIALOGUE.effect(() => {
    beginCutscene();
    mainEventGuestExpressions();
  }, 0.00001);
  DIALOGUE.queue(`
    OO Tama! Cake talaga iyun. Hindi keys. At hindi rin ito keys
    sa isang treasure chest.
  `);
  DIALOGUE.queue(`Pero tama na ang daldal. Ituloy na natin ang kaganapang ito.`);
  DIALOGUE.queue(`
    Pero siyempre, palakpakan n'yo rin naman ako.
    Hindi basta-basta ang pinaghandaan ko rito!
  `);
  DIALOGUE.effect(() => {
    audioPlaySound("applause_light", { volume: 0.3 });
    gsap.delayedCall(1, () => audioPlaySound("applause_light", { volume: 0.3 }));
    beginCutscene();
    player.moveSpeed = MAIN_EVENT_PLAYER_MOVESPEED;
    walk(daomingsi, [
      //
      { direction: "a", steps: 1.25 },
      [92.75, 46.5],
    ]);
  }, 5);
  DIALOGUE.queue(`Sige na CHE, diretso ka lang pumunta sa stage.`);
  DIALOGUE.effect(() => {
    beginCutscene();
    spawnJp();
    daomingsi.face("d");
    huazelei.face("a");
    playQuestToast(questMain);
  }, 1.5);
  DIALOGUE.onComplete = () => {
    hudSetBagIconVisible(true);
    GAME_STATE.sequence.mid_aisle_cutscene = true;
  };
}

function cutsceneMidAisleLei() {
  if (
    questDaoMingKeys.status !== "resolved" ||
    questMain.status !== "active" ||
    GAME_STATE.sequence.mid_aisle_lei_cutscene
  )
    return;

  hudSetBagIconVisible(false);
  DIALOGUE.effect(() => {
    beginCutscene();
    playExclamation(huazelei);
    gsap.delayedCall(1, () => {
      [...MAIN_EVENT_GUESTS_LEFT_SIDE, ...MAIN_EVENT_GUESTS_RIGHT_SIDE].forEach((guest) => {
        gsap.delayedCall(Math.random(), () => guest.face("w"));
      });
    });
  }, 0.5);
  f4Speaker("huazelei", "HUA ZE LEI: CHERYL...");
  DIALOGUE.effect(() => {
    gsap.delayedCall(2, () => {
      [npcSokka, npcAang, npcKatara, GAME_STATE.mama, GAME_STATE.papa].forEach((npc) => {
        gsap.delayedCall(Math.random(), () => npc.face("d"));
      });

      [npcToph, npcIroh, npcZuko].forEach((npc) => {
        gsap.delayedCall(Math.random(), () => npc.face("a"));
      });
    });
  });
  DIALOGUE.queue("Yung last page ng sketch ko na hinahabol mo ay nahanap na.");
  DIALOGUE.queue("...iaabot niya na lang sa iyo kasama ang music box.");
  DIALOGUE.effect(beginCutscene, 0.5);
  DIALOGUE.queue({ text: "... ... ...", portrait: null, color: "black" });
  DIALOGUE.effect(() => {
    beginCutscene();
    playExclamation(player, { glyph: "?", color: "darkviolet", hold: 5 });
  }, 2.5);
  DIALOGUE.queue(`...niya?`);
  DIALOGUE.effect(() => {
    beginCutscene();
    playQuestToast(questCatchSheets);
  }, 1.5);
  DIALOGUE.onComplete = () => {
    GAME_STATE.sequence.mid_aisle_lei_cutscene = true;
    hudSetBagIconVisible(true);
  };
}

function cutsceneMidAisleJp() {
  if (
    questDaoMingKeys.status !== "resolved" ||
    questMain.status !== "active" ||
    GAME_STATE.sequence.mid_aisle_jp_cutscene
  )
    return;

  hudSetBagIconVisible(false);

  DIALOGUE.effect(beginCutscene, 0.00001);

  DIALOGUE.effect(() => {
    GAME_STATE.cameraFollow = false;
    panCameraToTile([94, 43.05], {
      onComplete: () => {
        playExclamation(player, { delay: 0.5 });
        jpShineHandle = playShine(jp);
      },
    });
  }, 1);

  DIALOGUE.effect(() => {
    playExclamation(player, { glyph: "😳", hold: 2 });
    playAttentionBounce(player);
  }, 0.5);

  DIALOGUE.effect(() => {
    playAttentionBounce(player);
    player.face("s");
  }, 0.5);

  DIALOGUE.effect(() => {
    playExclamation(player, { glyph: "?", color: "darkviolet", hold: 2 });
    playAttentionBounce(player);
    player.face("a");
  }, 0.5);

  DIALOGUE.effect(() => {
    playExclamation(player);
    playAttentionBounce(player);
    player.face("w");
  }, 0.5);

  DIALOGUE.effect(() => {
    gsap.delayedCall(1, () => {
      GAME_STATE.mama.face("d");
      GAME_STATE.papa.face("a");
      [
        npcSokka,
        npcAang,
        npcKatara,
        npcToph,
        npcIroh,
        npcZuko,
        GAME_STATE.mama,
        GAME_STATE.papa,
      ].forEach((npc) => gsap.delayedCall(Math.random(), () => npc.face("w")));
    });

    gsap.delayedCall(0.2, () => playExclamation(jp, { glyph: "🤗" }));
  });

  DIALOGUE.queue({
    text: `JP: Hi Love Love, Cheryl ko...`,
    color: "blue",
  });

  DIALOGUE.effect(() => {
    beginCutscene();
    playExclamation(player, { icon: ICON_RED_HEART, hold: 1.5 });
    playAttentionBounce(player, { hops: 2 });
  }, 2);

  DIALOGUE.effect(() => {
    jpShineHandle?.stop();
    GAME_STATE.cameraFollow = false;
    panCameraToTile([94, 44.05], { duration: 2 });

    gsap.delayedCall(3.5, () => walk(jp, [94.35, 42]));

    player.moveSpeed = 50;
    walk(
      player, //
      [93.75, 42],
      {
        onComplete: () => {
          player.face("d");
          jp.face("a");
        },
      },
    );

    // slowly prep the F4
    gsap.delayedCall(2, () => {
      walk(ximen, [93.5, 47]);
      walk(meizuo, [94.5, 47], {
        onComplete: () => {
          daomingsi.face("w");
          huazelei.face("w");
          let delay = 0;
          f4.forEach((f, i) =>
            gsap.delayedCall((delay += f === meizuo ? 0.6 : 0.3), () =>
              walk(
                f,
                { direction: "w", steps: 2 },
                {
                  onComplete: () => {
                    if (i !== f4.length - 1) return; // not yet the last walk
                    // the last walk
                    gsap.delayedCall(2, () => DIALOGUE.unlock());
                    // walking animation is still ongoing
                    // until to the dialogue part of the
                    // happy birthday greeting
                    // so you'll find the "lock" at that line
                    // and this will unlock that lock.
                  },
                },
              ),
            ),
          );
        },
      });
    });
  }, 6.5);

  DIALOGUE.effect(() => {
    playExclamation(GAME_STATE.jp);
    gsap.delayedCall(0.3, () => {
      birthdayConfetti();
    });
    gsap.delayedCall(1, () => {
      playExclamation(GAME_STATE.jp, { icon: ICON_RED_HEART, hold: 10 });
      playExclamation(player, { icon: ICON_RED_HEART, hold: 10 });
      playAttentionBounce(player, { hops: 2 });
    });
  }, 0.1);
  // lock() and the walks that will eventually unlock() it must start from
  // the SAME effect, before the locked message — not a later one queued
  // after it. DIALOGUE.pending runs strictly in order, so anything queued
  // after a locked message can never run until that message is dismissed,
  // and dismissing it is exactly what the lock is blocking: a deadlock,
  // the key sitting on the far side of the locked door. Once *started*
  // here, the walks run on their own independent gsap timers, so they can
  // call unlock() whenever they actually finish regardless of what the
  // dialogue queue is doing.
  DIALOGUE.effect(() => {
    beginCutscene();
    DIALOGUE.lock();
    mainEventGuestExpressions();
    audioPlayMusic("happy_birthday", { fade: 2 });
    audioPlaySound("applause_light", { volume: 0.3 });
  }, 0.00001);
  DIALOGUE.queue(`JP: 🎂 HAPPY BIRTHDAY LOVE LOVE!`);
  DIALOGUE.effect(() => {
    gsap.delayedCall(0.3, () =>
      walk(
        daomingsi,
        [
          { direction: "d", steps: 0.75 },
          { direction: "w", steps: 2 },
          { direction: "a", steps: 0.5 },
          { direction: "w", steps: 1.5 },
        ],
        {
          onComplete() {
            daomingsi.face("d");
            gsap.delayedCall(0.5, () => daomingsi.face("s"));
          },
        },
      ),
    );
    gsap.delayedCall(0.6, () =>
      walk(
        huazelei,
        [
          { direction: "a", steps: 0.75 },
          { direction: "w", steps: 2 },
          { direction: "d", steps: 0.5 },
          { direction: "w", steps: 1.5 },
        ],
        {
          onComplete() {
            huazelei.face("a");
            gsap.delayedCall(0.5, () => huazelei.face("s"));
          },
        },
      ),
    );
    gsap.delayedCall(1.5, () =>
      walk(
        ximen,
        [
          { direction: "w", steps: 2.5 },
          { direction: "a", steps: 1 },
          { direction: "w", steps: 1 },
        ],
        {
          onComplete() {
            ximen.face("d");
          },
        },
      ),
    );
    gsap.delayedCall(1.8, () =>
      walk(
        meizuo,
        [
          { direction: "w", steps: 2.5 },
          { direction: "d", steps: 1 },
          { direction: "w", steps: 1 },
        ],
        {
          onComplete() {
            meizuo.face("a");
          },
        },
      ),
    );
  }, 0.1);
  DIALOGUE.queue(`Ito nga pala yung last page na sketch paper na hinahabol mo...`);
  DIALOGUE.effect(() => {
    beginCutscene();
    playExclamation(player, { icon: ICON_PAPERS, hold: 3 });
    playAttentionBounce(player, { hops: 3 });
  }, 1.5);
  DIALOGUE.effect(() => {
    questSetProgress(questCatchSheets, 3);
    questSetStatus(questCatchSheets, "resolved");
    playQuestToast(questCatchSheets);
    playQuestCompleteBanner(`Quest Completed!`);
    bagIncItem("paper3");
    bagIncItem("papers");
  }, 3.5);
  DIALOGUE.queue(`
    Makikita mo lang ang nilalaman ng tracing papers na iyan
    once na stacked or patong-patong mo na ang mga papel na
    iyan sa isa't isa.
  `);
  DIALOGUE.queue(`Saka mo lang makikita yung buong sketch.`);
  DIALOGUE.queue(`Tingnan mo ngayon sa bag kung anu nilalaman ng sketch.`);
  DIALOGUE.effect(() => {
    beginCutscene();
    questSetStatus("sketch_unity", "active");
    playQuestToast(questSketchUnity);
    mainEventGuestExpressions("?", "darkviolet");
  }, 2.5);
  DIALOGUE.effect(() =>
    gsap.delayedCall(0.3, () => playExclamation(player, { icon: ICON_PAPERS, hold: 3 })),
  );
  DIALOGUE.queue({ text: `Check ko sa bag yung tracing papers...`, color: "black" });
  DIALOGUE.onComplete = () => {
    GAME_STATE.movementLocked = true;
    GAME_STATE.sequence.mid_aisle_jp_cutscene = true;
    hudSetBagIconVisible(true);

    const checkSketchCompletion = () => {
      if (questSketchUnity.status === "resolved") {
        cutsceneShowBirthdayPostcard();
        return;
      }

      beginCutscene();
      DIALOGUE.effect(() => playExclamation(player, { icon: ICON_PAPERS }), 0.5);
      DIALOGUE.show(`Wait lang, hindi ko pa nakikita yung nilalaman ng sketch`);
      DIALOGUE.queue(`Nasa bag ko na lahat ng 3 tracing paper ni ZZ`);
      DIALOGUE.queue(`Kailangan ko lang pagpatungin ng tama lahat ng papers.`);

      GAME_STATE.onBagClose = checkSketchCompletion;
      DIALOGUE.onComplete = () => {
        GAME_STATE.movementLocked = true;
        hudSetBagIconVisible(true);
        playQuestToast(questSketchUnity);
      };
    };

    GAME_STATE.onBagClose = checkSketchCompletion;
  };
}

function cutsceneShowBirthdayPostcard() {
  if (questSketchUnity.status !== "resolved") return;
  DIALOGUE.effect(beginCutscene, 0.00001);

  DIALOGUE.effect(() => {
    DIALOGUE.lock();
    playExclamation(daomingsi);
    gsap.delayedCall(2, () => {
      playExclamation(huazelei, {
        glyph: "😅",
        hold: 5,
      });
    });
    gsap.delayedCall(4.5, () => DIALOGUE.unlock());
  });
  f4Speaker(`daomingsi`, "DAO MING SI: Pero sketch lang iyan ni HUA ZE LEI!");
  DIALOGUE.effect(() => mainEventGuestExpressions("?", "darkviolet"));
  DIALOGUE.effect(() => playExclamation(ximen));
  f4Speaker(`ximen`, `XI MEN: Ibig sabihin hindi pa ito final...`);
  DIALOGUE.effect(() => playExclamation(huazelei));
  f4Speaker(`huazelei`, `HUA ZE LEI: Hindi ka nagkakamali.`);
  DIALOGUE.effect(() => {
    DIALOGUE.lock();
    gsap.delayedCall(0.2, () => {
      playExclamation(meizuo, { glyph: `🤘🏻`, hold: 2, onComplete: () => DIALOGUE.unlock() });
      playAttentionBounce(meizuo);
    });
  });
  f4Speaker(`meizuo`, `MEI ZUO: 🤘🏻 Yeah alright ipakita na natin! Whooo!`);
  DIALOGUE.effect(() => playExclamation(huazelei, { glyph: "😅" }));
  DIALOGUE.queue({ text: "... ... ...", portrait: null, color: "black" });
  DIALOGUE.onComplete = () => {
    GAME_STATE.movementLocked = true;
    playImagePreview(BIRTHDAY_POSTCARD_SRC, { hold: 20, onComplete: cutsceneMainQuestReminder });
    birthdayConfetti();
    bagIncItem("birthday_postcard");
    audioPlayMusic("happy_birthday", { fade: 1, volume: 0.3 });
    audioPlayAmbience("zz_makeawish", { seek: 60 + 14, volume: 0.9 });
    audioPlaySound("applause_light", { volume: 0.3 });
    gsap.delayedCall(2, () => audioPlaySound("applause_light", { volume: 0.3 }));
    gsap.delayedCall(4, () => audioPlaySound("applause_light", { volume: 0.3 }));
    gsap.delayedCall(6, () => audioPlaySound("applause_light", { volume: 0.3 }));
    gsap.delayedCall(8, () => audioPlaySound("applause_light", { volume: 0.3 }));
  };
}

let questToast: EffectHandle | undefined;

function cutsceneMainQuestReminder() {
  DIALOGUE.effect(beginCutscene, 0.00001);
  DIALOGUE.effect(() => {
    audioStopAmbience("zz_makeawish", 5);
    audioPlayMusic("f4_loop", { fade: 5, volume: 0.3 });
    // audioPlayAmbience("f4_loop", { fade: 1, volume: 0.3 });
    playExclamation(daomingsi);
    gsap.delayedCall(0.5, () => {
      playExclamation(daomingsi);
      playAttentionBounce(daomingsi);
    });
  });
  f4Speaker("daomingsi", "DAO MING SI: Teka nga muna, meron pa isang last quest!");
  DIALOGUE.effect(() => {
    beginCutscene();
    playQuestToast(questMain, { hold: 8 });
    gsap.delayedCall(0.5, () => {
      player.face("s");
      jp.face("s");
    });
    mainEventGuestExpressions("?", "darkviolet");
  }, 3);
  DIALOGUE.effect(() => {
    beginCutscene();
    playExclamation(meizuo);
    playAttentionBounce(meizuo);
    meizuo.face("s");
  });
  f4Speaker("meizuo", "MEI ZUO: Ou nga tama si AH SI.");
  f4Speaker("meizuo", "Kaya nandito tayo lahat para ipadiwang sa kaganapang ito...");
  f4Speaker("daomingsi", "DAO MING SI: Kaya sino sa inyo ang nakahanap ng treasure?");
  DIALOGUE.effect(() => {
    beginCutscene();
    playExclamation(ximen);
    playAttentionBounce(ximen);
    ximen.face("s");
  });
  f4Speaker("ximen", "XI MEN: Kasama ito sa mga invitation at parcel sa simula pa lamang.");
  DIALOGUE.queue({ text: "... ... ...", portrait: null, color: "black" });
  DIALOGUE.effect(beginCutscene, 1.5);
  DIALOGUE.effect(() => {
    playExclamation(player, { icon: ICON_PARCEL, hold: 5 });
    playAttentionBounce(player);
  }, 2.5);
  DIALOGUE.queue({
    text: "Kailangan ko tingnan iyung parcel sa bag ko...",
    portrait: null,
    color: "black",
  });
  DIALOGUE.effect(() => playQuestToast(questMain));
  DIALOGUE.onComplete = () => {
    GAME_STATE.movementLocked = true;
    hudSetBagIconVisible(true);

    GAME_STATE.onBagClose = function onParcelBagClose(viewed) {
      if (!viewed.has("parcel")) {
        hudSetBagIconVisible(false);
        DIALOGUE.effect(() => playExclamation(player, { icon: ICON_PARCEL }));
        DIALOGUE.show("Nalimot ko, kailangan ko muna makita yung parcel sa bag ko...");
        DIALOGUE.onComplete = () => {
          hudSetBagIconVisible(true);
          questToast?.stop();
          questToast = playQuestToast(questMain);
          GAME_STATE.movementLocked = true;
          GAME_STATE.onBagClose = onParcelBagClose; // closed without opening it — re-arm for next time (cleared before this call, see game-state.ts)
        };
        return;
      }
      cutsceneMainQuestReveal();
    };
  };
}

function cutsceneMainQuestReveal() {
  beginCutscene();
  DIALOGUE.effect(() => playExclamation(daomingsi), 0.5);
  DIALOGUE.effect(() => {
    playExclamation(daomingsi);
    playAttentionBounce(daomingsi);
  }, 0.5);
  f4Speaker("daomingsi", `DAO MING SI: Tulad ng nabanggit ko kanina...`);
  f4Speaker(
    "daomingsi",
    `...na hindi lahat ng treasure o kayamanan ay 
    isang uri ng GOLD o bagay tulad na lamang ng music box,
    at hindi rin ito treasure chest na kailangan buksan
    ng keys o ng kung anuman.`,
  );
  DIALOGUE.effect(() => playExclamation(huazelei), 0.5);
  DIALOGUE.effect(() => {
    playExclamation(huazelei);
    playAttentionBounce(huazelei);
  }, 0.5);
  f4Speaker(
    "huazelei",
    `HUA ZE LEI: Tama ka AH SI. At tulad na rin ng nasabi ko kanina kay CHERYL...`,
  );
  f4Speaker(`huazelei`, `Ang tunay na kayamanan ay nasa puso ng tao...`);
  f4Speaker(`huazelei`, `At ang keys o susi nito, ay nasa tamang tao lamang...`);
  f4Speaker(`huazelei`, `At siya lang ang taong makakakita ng tunay na kayamanan.`);
  DIALOGUE.effect(() => playExclamation(jp), 0.5);
  DIALOGUE.effect(() => {
    playExclamation(jp);
    playAttentionBounce(jp);
    gsap.delayedCall(2, () => jp.face("a"));
    gsap.delayedCall(3, () => player.face("d"));
    gsap.delayedCall(3.5, () => {
      playExclamation(jp, { icon: ICON_RED_HEART, hold: 3 });
      playExclamation(player, { icon: ICON_RED_HEART, hold: 3 });
    });
  }, 0.5);
  DIALOGUE.queue({
    text: `JP: At nasa ating mga puso ang susi na mabigyan ng halaga...`,
    portrait: null,
    color: "blue",
  });
  DIALOGUE.queue({
    text: `LOVE LOVE, buksan mo ulit yung chest na nakuha mo sa parcel.`,
    color: "blue",
  });
  DIALOGUE.queue(
    `Iyung missing treasure, ay natakpan lamang ng mabuti sa ilalim ng top layer nito.`,
  );
  DIALOGUE.effect(() => {
    GAME_STATE.movementLocked = true;
    bagIncItem("parcel");
  }, 0.000001);
  DIALOGUE.queue({
    text: `YOU: (thinking) Kailangan ko buksan yung chest na galing parcel sa bag...`,
    color: "black",
  });
  DIALOGUE.queue(`Yung treasure nasa ilalim lang ng top layer nito...`);
  DIALOGUE.effect(() => {
    playExclamation(player);
    playAttentionBounce(player, { hops: 3 });
    gsap.delayedCall(2, () => playExclamation(jp, { glyph: "☺️", hold: 2.5 }));
  }, 2.5);
  DIALOGUE.queue(`... ... ...!`);
  DIALOGUE.effect(() => {
    playExclamation(player, { icon: ICON_RED_HEART, hold: 1.5 });
    playAttentionBounce(player, { hops: 3 });
  }, 0.5);
  DIALOGUE.queue(`... ... ...!`);
  DIALOGUE.onComplete = () => {
    GAME_STATE.movementLocked = true;
    bagRemoveItem("parcel");
    bagIncItem("treasure");
    questSetStatus(questMain, "resolved");
    playQuestToast(questMain);
    playQuestCompleteBanner("Treasure Found — Quest Completed!");
    birthdayConfetti(20);
    audioPlayMusic("f4", { volume: 0.5, seek: 1 * 60 + 35 }); // starts at chorus

    let delay = 0;
    Array.from({ length: 5 }, () =>
      gsap.delayedCall((delay += 2), () => audioPlaySound("applause", { volume: 0.3 })),
    );

    playImagePreview(PHOTO_TREASURE, {
      hold: 5,
      onComplete() {
        playImagePreview(PHOTO_TREASURE_CLOSEUP, { hold: 10, onComplete: cutsceneClosingRemarks });
      },
    });
  };
}

function cutsceneClosingRemarks() {
  DIALOGUE.effect(() => {
    playExclamation(player, { icon: ICON_RED_HEART, hold: 2 });
    playExclamation(jp, { icon: ICON_RED_HEART, hold: 2 });
    gsap.delayedCall(1, () => mainEventGuestExpressions());
  }, 3);
  DIALOGUE.queue({
    text: `HAPPY BIRTHDAY LOVE LOVE! You're my Treasure!`,
    color: "blue",
    // TODO: add my portrait
  });
  DIALOGUE.queue(`I love you always and more!`);
  DIALOGUE.onComplete = () => {
    GAME_STATE.movementLocked = true;
    // GAME_STATE.sequence.closing_remarks = true; // set at home scene
    panCameraToTile([94, 42], { duration: 3 });
    const iris = playIrisReveal({
      direction: "out",
      duration: 3,
      softness: 20,
      onComplete: () => {
        audioStopAmbience(undefined, 5);
        gsap.delayedCall(overworldScene.fadeOut! + 0.5, () => iris.stop());
        GAME_STATE.player.moveSpeed = 200; // restore
        GAME_STATE.jp.moveSpeed = 200; // restore
        GAME_STATE.allowRunning = true; // restore
        GAME_STATE.sceneName = "home";
        // reset npcs
        spawnOverworldNpcs();
        despawnNPC(npcIroh);
        despawnNPC(npcZuko);
        cleanupMainEvent(); // f4 + both guard formations, papa back to his free-roam spot
      },
    });
  };
}

/** One-time teardown of everything spawned only for the main event — called once, directly by closingRemarks(), not re-run on every later re-entry. */
function cleanupMainEvent() {
  if (!isQuestResolved(questMain)) return;
  const cleanupNpcs = [...f4, ...AISLE_GUARDS, ...PARK_EVENT_GUARDS];
  cleanupNpcs.forEach((npc) => despawnNPC(npc));
  respawnNPC(GAME_STATE.papa, [63, 39]);
  remove(DECORS, balloonArch);
}

function interactMeizuo() {
  if (!GAME_STATE.sequence.market_cutscene) {
    cutsceneMarket();
    return;
  }

  cancelScheduledFace(meizuo);
  playAttentionBounce(meizuo);
  playExclamation(meizuo);

  DIALOGUE.show({
    text: `MEI ZUO: Yo! CHERYL whazzup?`,
    color: DIALOGUE_COLOR_MEIZUO,
    portrait: PORTRAIT_MEIZUO,
  });

  DIALOGUE.onComplete = () => {
    if (questDaoMingKeys.status !== "resolved") scheduleFaceDirection(meizuo, "s");
  };
}

function interactXimen() {
  if (!GAME_STATE.sequence.market_cutscene) {
    cutsceneMarket();
    return;
  }

  const color = DIALOGUE_COLOR_XIMEN;
  const portrait = PORTRAIT_XIMEN;

  cancelScheduledFace(ximen);

  if (GAME_STATE.sequence.market_cutscene && questDaoMingKeys.status !== "resolved") {
    DIALOGUE.show({
      text: `XI MEN: Punta ka sa mansion kausapin mo si LIU. Kailangan pa namin tapusin ito mga paggawa ng lobo para sa event mamaya.`,
      color,
      portrait,
    });
  }

  // No hints
  else {
    DIALOGUE.show({
      text: `XI MEN: Hi...`,
      color,
      portrait,
    });
  }

  DIALOGUE.onComplete = () => {
    if (questDaoMingKeys.status !== "resolved") scheduleFaceDirection(ximen, "s");
  };
}

function interactFloristHeart() {
  if (!isQuestResolved(questMain)) return;

  DIALOGUE.queue(`FLORIST: Sandali... kasama mo pala ang mahal mo ngayon?`);
  DIALOGUE.effect(() => gsap.delayedCall(0.5, () => playExclamation(jp)));
  DIALOGUE.queue(
    `FLORIST: Ang sweet niyo! Bakit hindi niyo puntahan ang flower garden? Doon pa rin kami nagtatanim ng pinakamagandang bulaklak.`,
  );

  isFlowerGardenAvailable = true;
  spawnHeartGardenNpcs(); // right away — don't wait for the next scene re-entry to move the elder couple

  jpFollowPaused = true;
  const scoutWalk = walk(jp, [46, 46], {
    onComplete() {
      jp.face("a");
    },
  });

  walk(player, [45.25, 46], { onComplete: () => player.face("w") });

  // beginCutscene() isn't needed here — talkCommonF (via npcMessagesInteractions)
  // already locked movement before this function even ran.
  DIALOGUE.onComplete = () => {
    GAME_STATE.movementLocked = true;
    scoutWalk?.stop(); // in case jp's still mid-scout-walk once the florist's lines wrap up first
    DIALOGUE.effect(() => {
      playExclamation(jp);
      playAttentionBounce(jp);
      player.face("d");
    });
    DIALOGUE.show({
      text: "JP: Alam ko kung saan iyan...",
      color: "blue",
    });
    DIALOGUE.effect(() => walk(player, [45.5, 46]));
    DIALOGUE.queue(`I'll lead the way love love!`);
    DIALOGUE.effect(() => {
      playExclamation(player, { icon: ICON_RED_HEART, hold: 8 });
      gsap.delayedCall(5, () => {
        fxCherryBlossomsHandle = playCherryBlossoms({ duration: 60 * 60 * 24 * 2 });
      });
      gsap.delayedCall(6.5, () => playExclamation(player));

      // side-by-side -> up -> turn left, onto their final spots
      walk(
        player,
        [
          [47.5, 46],
          [47.5, 24],
          [40, 24],
        ],
        { onComplete: onArrive },
      );
      walk(
        jp,
        [
          [48, 45.85],
          [48, 24],
          [41, 24],
        ],
        { onComplete: onArrive },
      );

      let arrived = 0;
      function onArrive() {
        beginCutscene();
        if (++arrived < 2) return;

        faceDirection(player, jp);
        faceDirection(jp, player);

        jpFollowPaused = false; // resumes right where jp was left standing
        sideCutsceneFlowerGarden();
      }

      // Same reasoning as cutsceneFlowerGarden() used to have — this effect
      // is the only thing queued, so right after it fires, DIALOGUE's own
      // queue-empty pullPending() would force-unlock movement well before
      // either walk() actually finishes. Re-lock immediately, same tick.
      DIALOGUE.onComplete = () => {
        GAME_STATE.movementLocked = true;
      };
    }, 0.00001);
  };
}

function interactGoldenWed(target: Sprite | undefined) {
  // Still together at the garden's center — only the husband is
  // interactable (see ELDER_MAN_HEART_INTERACTABLE), but talking to him
  // plays both of their voices as one scripted exchange.
  if (!isFlowerGardenAvailable) {
    beginCutscene();

    const { talk } = createGroupConversation([
      ["husband", "m"],
      ["wife", "f"],
    ]);

    DIALOGUE.effect(() => playExclamation(npcElderManHeart), 0.5);
    talk(
      "husband",
      `GOLDWED HUSBAND: Limampung taon na kaming kasal ng asawa ko. Ang sikreto? Patuloy lang magmahal, kahit anong pagsubok ang dumating.`,
    );
    DIALOGUE.effect(() => playExclamation(npcElderWomanHeart), 0.5);
    talk(
      "wife",
      "GOLDWED WIFE: Hindi laging madali, pero kung piniling magkasama araw-araw, lalago lang ang pagmamahalan niyo.",
    );
    DIALOGUE.effect(() => playExclamation(npcElderManHeart), 0.5);
    talk("husband", `Hindi kami naghahanap ng kayamanan sa mundo...`);
    talk("husband", `...pero ginawa kaming GOLDEN JUBILARIANS ng panahon.`);
    DIALOGUE.effect(() => {
      playExclamation(npcElderWomanHeart);
      faceDirection(npcElderWomanHeart, player);
      playAttentionBounce(npcElderWomanHeart);
    }, 0.5);
    talk("wife", `Kumukupas ang kinang ng ginto anak...`);
    talk("wife", `...kaya ikaw ay pumili ng tao na kasamang mas nagpapayaman sa "PAGKATAO" mo.`);
    DIALOGUE.effect(() => playExclamation(npcElderManHeart), 0.5);
    talk("husband", `At hindi kasi kinakalawang ang ginto...`);
    talk("husband", `...kaya GOLDEN JUBILARIANS ang tawag sa mga umabot ng fifty years.`);
    DIALOGUE.effect(() => {
      playExclamation(npcElderWomanHeart);
      faceDirection(npcElderWomanHeart, player);
      playAttentionBounce(npcElderWomanHeart);
    }, 0.5);
    talk("wife", `Mas kumikinang ang relasyon habang...`);
    talk("wife", `...maraming bagyo ang nilalampasan nang magkasama.`);
    DIALOGUE.effect(() => {
      playExclamation(npcElderManHeart, { glyph: "💯" });
      playAttentionBounce(npcElderManHeart);
      faceDirection(npcElderManHeart, player);
      faceDirection(npcElderWomanHeart, npcElderManHeart);
    }, 0.5);
    talk("husband", `Bilang GOLDEN JUBILARIANS...`);
    talk(
      "husband",
      `...halos lahat ng bagay ay pinagkasunduan na namin simula noong kinasal kami.`,
    );
    DIALOGUE.effect(() => {
      playExclamation(npcElderWomanHeart, { glyph: "😏" });
      faceDirection(npcElderWomanHeart, player);
    }, 0.5);
    talk(
      "wife",
      `Halos lahat, mahal, maliban kung sino talaga ang nanalo sa unang laro natin ng sungka!`,
    );
    DIALOGUE.effect(() => {
      beginCutscene();
      playExclamation(npcElderManHeart);
      playAttentionBounce(npcElderManHeart);
      faceDirection(npcElderManHeart, npcElderWomanHeart);
    }, 1.5);
    DIALOGUE.effect(() => {
      let delay = 0;
      for (let i = 1; i <= 5; i++) {
        if (i !== 5)
          gsap.delayedCall((delay += 0.3), () => npcElderManHeart.face(i % 2 !== 0 ? "s" : "a"));
        else gsap.delayedCall((delay += 0.5), () => npcElderManHeart.face("s"));
      }
    }, 2.5);
    DIALOGUE.effect(() => {
      playExclamation(npcElderManHeart, { glyph: "🤣" });
      playAttentionBounce(npcElderManHeart, {
        hops: 5,
        onComplete() {
          playExclamation(npcElderManHeart, { glyph: "🤣", delay: 0.3 });
          playAttentionBounce(npcElderManHeart, { hops: 5, delay: 0.5 });
        },
      });
    });
    talk("husband", `HAHAHAHAHAHAHAHAHAHA!`);
    endCutscene(() => {
      hudSetBagIconVisible(true);
      scheduleFaceDirection(npcElderWomanHeart, "d");
      scheduleFaceDirection(npcElderManHeart, "a");
    });
    return;
  }

  // Stepped aside — both are individually interactable now, each with
  // their own separate line instead of the shared exchange above. Still
  // createGroupConversation (not talkCommonM/F) — its talk() checks
  // DIALOGUE.isActive itself, so the 2nd line queues instead of stomping
  // the 1st before it's ever shown.
  beginCutscene();

  const { talk } = createGroupConversation([
    ["husband", "m"],
    ["wife", "f"],
  ]);

  if (target === npcElderManHeart) {
    talk("husband", "GOLDENWED HUSBAND: Hindi kasi kinakalawang ang ginto...");
    talk("husband", "kaya Golden Jubilarians ang tawag sa mga umabot ng fifty years.");
  } else if (target === npcElderWomanHeart) {
    talk("wife", "GOLDENWED WIFE: Mas kumikinang ang relasyon...");
    talk("wife", "habang mas maraming bagyo ang nilalampasan nang magkasama.");
  }

  endCutscene();
}

function initMainEventGuards() {
  if (questMazeChest.status !== "resolved") return;

  PARK_EVENT_GUARDS.forEach((npc) => respawnNPC(npc));
  PARK_EVENT_GUARDS_INTERACTABLES.forEach((entry) => addOnce(INTERACTABLES, entry));
  AISLE_GUARDS.forEach((npc) => addOnce(INTERACTABLES, npc));

  if (questDaoMingKeys.status !== "resolved") {
    placeAtTile({ sprite: AISLE_GUARDS_ROW_A[0], tile: [92.5, 58] });
    placeAtTile({ sprite: AISLE_GUARDS_ROW_A[1], tile: [93.5, 57.5] });
    placeAtTile({ sprite: AISLE_GUARDS_ROW_B[0], tile: [94.5, 57.5] });
    placeAtTile({ sprite: AISLE_GUARDS_ROW_B[1], tile: [95.5, 58] });
    AISLE_GUARDS.forEach((npc) => {
      respawnNPC(npc);
      npc.face("s");
    });
  }
}

function initMainEvent() {
  if (questDaoMingKeys.status !== "resolved") return;
  // Cleanup old decors
  balloonCrates.forEach((decor) => {
    remove(DECORS, decor);
    remove(GAME_STATE.obstacles, decor);
  });
  MARKET_EVENT_GIRLS.forEach((g) => despawnNPC(g));

  addOnce(DECORS, chestEmpty);
  addOnce(GAME_STATE.obstacles, chestEmpty);
  BOUNDARIES_MAIN_EVENT.forEach((b) => addOnce(GAME_STATE.boundaries, b));

  // No retry-on-load needed here (unlike createReadables/createProps) —
  // this only ever runs from initMainEvent(), inside enter(), which can't
  // fire before GameEngine.start()'s own image-preload gate has already
  // resolved every sprite's image, this one included.
  placeAtTile({
    sprite: balloonArch,
    tile: [94, 55],
    spriteSize: balloonArch.boxSize,
    anchor: "bottom",
  });
  addOnce(DECORS, balloonArch);

  jp.moveSpeed = 50;
  huazelei.moveSpeed = 50;
  daomingsi.moveSpeed = 50;
  meizuo.moveSpeed = 50;
  ximen.moveSpeed = 50;

  // Mei Zuo & Xi Men
  placeAtTile({ sprite: meizuo, tile: [95.25, 51] });
  placeAtTile({ sprite: ximen, tile: [92.75, 51] });
  meizuo.face("a");
  ximen.face("d");

  // Papa & Mama
  placeAtTile({ sprite: GAME_STATE.mama, tile: [91.35, 45.75] });
  placeAtTile({ sprite: GAME_STATE.papa, tile: [92.15, 45.75] });
  GAME_STATE.mama.face("s");
  GAME_STATE.papa.face("s");

  // Ah Si & Lei
  if (GAME_STATE.sequence.mid_aisle_cutscene) {
    respawnNPC(daomingsi, [92.75, 46.5]);
    respawnNPC(huazelei, [95.25, 46.5]);
    daomingsi.face("d");
    huazelei.face("a");
    spawnJp();
  } else {
    respawnNPC(daomingsi, [94, 45.5]);
    respawnNPC(huazelei, [94.25, 43]);
    daomingsi.face("s");
  }

  placeAtTile({ sprite: AISLE_GUARDS_ROW_A[0], tile: [92.75, 54.5] });
  placeAtTile({ sprite: AISLE_GUARDS_ROW_A[1], tile: [95.25, 54.5] });
  placeAtTile({ sprite: AISLE_GUARDS_ROW_B[0], tile: [92.75, 58] });
  placeAtTile({ sprite: AISLE_GUARDS_ROW_B[1], tile: [95.25, 58] });
  AISLE_GUARDS.forEach((npc) => respawnNPC(npc));
  AISLE_GUARDS.forEach((npc, i) => {
    if (i % 2 === 0) npc.face("d");
    else npc.face("a");
  });

  // Other NPC guests (no cleanup needed)
  respawnNPC(npcAang, [90.1, 45.75]);
  npcAang.face("s");
  respawnNPC(npcAppa, [82, 38.5]);
  npcAppa.face("d");
  respawnNPC(npcKatara, [89.3, 45.75]);
  npcKatara.face("s");
  respawnNPC(npcSokka, [87, 45]);
  npcSokka.face("w");
  respawnNPC(npcToph, [96.25, 45.75]);
  npcToph.face("s");

  // Seated (left side)
  respawnNPC(npcAdultMale2, [89.3, 47.75]);
  respawnNPC(npcAdultFemale1, [90.1, 47.75]);
  respawnNPC(npcAdultFemale2, [91.35, 47.75]);
  respawnNPC(npcTeenBoy1, [92.15, 47.75]);
  respawnNPC(npcBeachMale2, [89.3, 49.75]);
  respawnNPC(npcAdultFemale4, [90.1, 49.75]);
  respawnNPC(npcBeachFemale1, [92.15, 49.75]);

  // Seated (Right side)
  respawnNPC(npcTeenGirl1, [96.25, 47.75]);
  respawnNPC(npcElderMan, [98.25, 47.75]);
  respawnNPC(npcElderWoman, [99.25, 47.75]);
  respawnNPC(npcBeachFemale2, [96.15, 49.75]);
  respawnNPC(npcAdultFemale3, [97.15, 49.75]);
  respawnNPC(npcBeachMale1, [98.15, 49.75]);

  // Not seated (Left side)
  respawnNPC(npcFloristMale1, [85, 45]);
  respawnNPC(npcFloristFemale1, [85.5, 44.75]);
  respawnNPC(npcTeenGirl2, [88.5, 47.25]);
  respawnNPC(npcTeenBoy2, [88, 49.5]);
  npcFloristFemale1.face("d");
  npcFloristMale1.face("d");
  npcTeenGirl2.face("w");
  npcTeenBoy2.face("w");

  // Not seated (Right side)
  respawnNPC(npcAdultMale1, [100, 45.25]);
  respawnNPC(npcAdultMale3, [102.5, 44]);
  respawnNPC(npcAdultMale4, [103, 45]);
  respawnNPC(npcAdultMale5, [100, 48.65]);
  respawnNPC(npcAdultFemale5, [100.75, 48.65]);
  npcAdultMale1.face("w");
  npcAdultMale3.face("a");
  npcAdultMale4.face("a");
  npcAdultMale5.face("w");
  npcAdultFemale5.face("w");
  respawnNPC(npcTeenGirl3, [103.25, 40.75]);
  respawnNPC(npcTeenBoy3, [103.75, 41.5]);
  npcTeenGirl3.face("a");
  npcTeenBoy3.face("a");

  // Other NPC guests (needs cleanup after event)
  respawnNPC(npcIroh, [97.25, 45.75]);
  respawnNPC(npcZuko, [98.25, 45.75]);
}

function f4Speaker(speaker: "daomingsi" | "huazelei" | "meizuo" | "ximen", message: string) {
  let color = DIALOGUE_COLOR_DAOMINGSI;
  let portrait = PORTRAIT_DAOMINGSI;
  switch (speaker) {
    case "huazelei":
      color = DIALOGUE_COLOR_HUAZELEI;
      portrait = PORTRAIT_HUAZELEI;
      break;
    case "meizuo":
      color = DIALOGUE_COLOR_MEIZUO;
      portrait = PORTRAIT_MEIZUO;
      break;
    case "ximen":
      color = DIALOGUE_COLOR_XIMEN;
      portrait = PORTRAIT_XIMEN;
      break;
  }
  DIALOGUE.queue({
    text: message,
    color,
    portrait,
  });
}

function restrictRun(restricted = true) {
  if (isQuestResolved(questMain)) return;
  if (questDaoMingKeys.status !== "resolved") return;

  if (restricted) {
    GAME_STATE.allowRunning = false;
    audioPlayMusic("overworld_event", { seek: 0, volume: 0.8 });
    audioPlayAmbience("amb_people_public", { volume: 0.1, fade: 5 });
    audioPlayAmbience("amb_people_crowd", { volume: 0.2, fade: 5 });
  } else {
    GAME_STATE.allowRunning = true;
    soundMain();
  }
}

function restrictMidAisleExit() {
  if (!GAME_STATE.sequence.mid_aisle_cutscene || isQuestResolved(questMain)) return;

  DIALOGUE.effect(beginCutscene, 0.00000000000001);

  DIALOGUE.effect(() => {
    audioStopAmbience(["amb_people_public", "amb_people_crowd"], 5);
    walk(player, [94, 50.25], {
      onComplete: () => player.face("w"),
    });
  }, 1);

  f4Speaker(`daomingsi`, `Diretso ka na sa stage...`);

  DIALOGUE.onComplete = () => hudSetBagIconVisible(true);
}

function spawnJp() {
  respawnNPC(GAME_STATE.jp, [94.5, 41]);
}

function soundMain() {
  audioPlayMusic("overworld", { fade: 2, volume: VOLUME_MAIN_BG });
  audioStopAmbience(undefined, 5);
}

function soundMarket() {
  audioPlayMusic("market", { fade: 2, volume: 0.3 });
  audioPlayAmbience("amb_shopping_crowd", { fade: 2, volume: 0.2 });
}

function soundFountain(enable = true) {
  if (enable) audioPlayAmbience("amb_water_flowing", { fade: 2, volume: 0.2 });
  else audioStopAmbience("amb_water_flowing", 2);
}

function soundPark(enable = true) {
  if (enable) {
    const isOngoingEvent =
      questDaoMingKeys.status === "resolved" && !GAME_STATE.sequence.closing_remarks;
    if (!isOngoingEvent) audioPlayMusic("overworld", { fade: 2, volume: 0.15 });
    audioPlayAmbience("amb_birds_forest", { seek: 22, fade: 2, volume: 0.5 });
  } else {
    audioStopAmbience("amb_birds_forest", 2);
    audioPlayMusic("overworld", { fade: 2, volume: VOLUME_MAIN_BG });
  }
}

function soundBeach() {
  audioPlayAmbience("amb_beach", { fade: 2, volume: 0.4 });
}

function soundGardenMaze(fade = 2) {
  // Guards against the zone's onEnter firing again on a re-entry while
  // "maze" is still the playing track — seek forces a restart regardless of
  // what's already active (see audioIsMusicActive's own doc comment), which
  // would otherwise crossfade in a second overlapping instance of itself.
  if (audioIsMusicActive("maze")) return;
  audioPlayMusic("maze", { seek: 12, fade, volume: 0.25 });
}

function soundTeashop() {
  audioStopMusic(1);
  audioPlayAmbience("amb_birds_singing", { fade: 2, volume: 0.3 });
}

function mainEventGuestExpressions(glyphInput?: string, color?: string) {
  const glyphemojis = ["💖", "🔥", "🎂", "♥️", "🎁"];
  MAIN_EVENT_GUESTS.filter(isInViewport).forEach((guest) => {
    gsap.delayedCall(Math.random(), () => {
      const random = Math.floor(Math.random() * glyphemojis.length);
      const glyphChance = Math.random() < 0.6; // 60% to glyph instead of default "!"
      const bubbleChance = Math.random() < 0.35; // 35% chance to exclamation bubble
      if (bubbleChance)
        playExclamation(guest, {
          glyph: glyphChance ? glyphInput || glyphemojis[random] : undefined,
          hold: glyphChance ? 3 : 1,
          color: glyphChance ? color : undefined,
        });
      playAttentionBounce(guest, {
        hops: guest === npcAppa ? 3 : undefined,
      });
    });
  });
}

// ==============================================
// Cutscenes not part of Main Quests...
// ==============================================
function sideCutsceneFlowerGarden() {
  DIALOGUE.show({ text: "JP: Love Love...", color: "blue" });
  DIALOGUE.onComplete = () => {
    hudSetBagIconVisible(true);
    jpFollowPaused = false;
    fxCherryBlossomsHandle?.stop();
  };
}

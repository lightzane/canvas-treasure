import { COLLISION_OVERWORLD, COLLISION_OVERWORLD_EVENT } from "@/constants/collisions/overworld";
import { TILE_SIZE } from "@/constants/game-settings";
import { TRIGGER_OVERWORLD, type TriggerName } from "@/constants/triggers/overworld";
import { GAME_STATE } from "@/features/game-state";
import {
  drawInteractPrompt,
  removeInteractable,
  updateInteraction,
  type Interactable,
} from "@/features/interact";
import type { Scene } from "@/features/scene";
import { Sprite } from "@/features/sprite";
import { PlayerSprite } from "@/features/sprite-player";
import {
  checkTriggerZones,
  createBoundaries,
  createTriggerZones,
  type TriggerHandlers,
} from "@/features/zone";
import { addOnce, remove } from "@/lib/array";
import { bagHasItem, bagIncItem, bagRemoveItem } from "@/lib/bag";
import { DIALOGUE } from "@/lib/canvas/dialogue";
import { isInViewport } from "@/lib/canvas/viewport";
import { drawViewportClamped, prepareViewportClamped } from "@/lib/canvas/viewport-clamp";
import { drawYSorted } from "@/lib/canvas/y-sort";
import { birthdayConfetti } from "@/lib/confetti";
import { drift } from "@/lib/drift";
import { playAttentionBounce } from "@/lib/effects/attention-bounce";
import { playExclamation } from "@/lib/effects/exclamation-bubble";
import { playImagePreview } from "@/lib/effects/image-preview";
import { playIrisReveal } from "@/lib/effects/iris-reveal";
import {
  playQuestCompleteBanner,
  playQuestToast,
  type QuestToastHandle,
} from "@/lib/effects/quest-toast";
import { playShine, type ShineHandle } from "@/lib/effects/shine";
import { drawFootprints, trackFootstep, updateFootprints } from "@/lib/footprints";
import { hudSetBagIconVisible } from "@/lib/hud";
import { img } from "@/lib/img";
import { movePlayer, panCameraToTile, setCameraToTile } from "@/lib/map-movement";
import { cancelScheduledFace, scheduleFaceDirection } from "@/lib/npc-auto";
import { placeAtTile } from "@/lib/positioning";
import { preload } from "@/lib/preload";
import { questIncreaseProgress, questSetProgress, questSetStatus } from "@/lib/quests";
import { walk } from "@/lib/walk";
import {
  DIALOGUE_COLOR_DAOMINGSI,
  PORTRAIT_DAOMINGSI,
  PORTRAIT_DAOMINGSI_INTIMIDATE,
} from "@/sprites/dao-ming-si";
import { IMGS_HH_STAFF_FEMALE_1_IDLE } from "@/sprites/hh-staff-female-1";
import { IMGS_HH_STAFF_MALE_1_IDLE } from "@/sprites/hh-staff-male-1";
import { DIALOGUE_COLOR_HUAZELEI, PORTRAIT_HUAZELEI } from "@/sprites/hua-ze-lei";
import { DIALOGUE_COLOR_MEIZUO, PORTRAIT_MEIZUO } from "@/sprites/mei-zuo";
import { DIALOGUE_COLOR_XIMEN, PORTRAIT_XIMEN } from "@/sprites/xi-men";
import gsap from "gsap";

const PHOTO_BIRTHDAY_POSTCARD = img("treasure/cheryl_birthday_postcard.jpg");
const PHOTO_TREASURE = img("treasure/treasure-full.png");
const PHOTO_TREASURE_CLOSEUP = img("treasure/treasure-full-closeup.png");

const IMG_MAP_BG = img("maps/overworld.png");
const IMG_MAP_FG = img("maps/overworld-fg.png");

const IMG_MAP_EVENT_BG = img("maps/overworld_event.png");
// const IMG_MAP_FG = img("maps/overworld-fg.png");

const IMG_FOUNTAIN_SMALL = img("others/fountain-small.png");
const IMG_FOUNTAIN_BIG = img("others/fountain-big.png");
const IMG_PAPER_SINGLE = img("others/paper-single.png");
const IMG_PAPER_MULTI = img("others/paper-multi.png");
const IMG_PAPER_WIND = img("others/paper-wind.png");
const IMG_WILD_BUSH_CENTER = img("others/wild-bush-center.png");
const IMG_SIGNPOST = img("others/signpost.png");
const IMG_MESSAGE_BOTTLE_H = img("others/message-bottle-h.png");
const IMG_CHEST_CLOSE = img("others/chest-close.png");
const IMG_CHEST_OPEN = img("others/chest-open.png");
const IMG_CHEST_EMPTY = img("others/chest-empty.png");
const IMG_BALLOON_CRATES = img("others/balloon-crates.png");
const ICON_RED_HEART = img("others/red-heart.png");
const ICON_SHEARS = img("others/garden-shears.png");
const ICON_PAPERS = img("others/paper-multi-32x32.png");
const ICON_PARCEL = img("others/parcel-32x32.png");

const MAIN_EVENT_PLAYER_MOVESPEED = 100;

const background = new Sprite({ src: IMG_MAP_BG });
/** Drawn on top of the player (tree canopies, roof overhangs, etc). */
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
const spHouse = new Sprite({ src: IMG_SIGNPOST, scale: 2 });
const spMansion1 = new Sprite({ src: IMG_SIGNPOST, scale: 2 });
const spMansion2 = new Sprite({ src: IMG_SIGNPOST, scale: 2 });
const coreMsgBottle = new Sprite({ src: IMG_MESSAGE_BOTTLE_H, scale: 2 });
const msgBottle1 = new Sprite({ src: IMG_MESSAGE_BOTTLE_H, scale: 2 });
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
  msgBottle1,
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

const AISLE_GUARDS_ROW_A: PlayerSprite[] = [
  new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_FEMALE_1_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_FEMALE_1_IDLE } }),
];

const AISLE_GUARDS_ROW_B: PlayerSprite[] = [
  new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_MALE_1_IDLE } }),
  new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_MALE_1_IDLE } }),
];

const AISLE_GUARDS = [...AISLE_GUARDS_ROW_A, ...AISLE_GUARDS_ROW_B];

const wildBushInteractablesCfgs: Partial<Interactable> = {
  label: "Interact",
  labelOffset: { y: -16 },
};

const signpostInteractablesCfgs: Partial<Interactable> = {
  label: "Read",
  labelOffset: { x: -12.5, y: 32 },
  probeDistance: 0,
};

const msgBottleInteractablesCfgs: Partial<Interactable> = {
  label: "Read",
  labelOffset: { y: 16 },
};

const INTERACTABLES: Interactable[] = [
  { sprite: GAME_STATE.papa, label: "Talk" },
  { sprite: wildBushPaper, ...wildBushInteractablesCfgs },
  { sprite: wildBushMazeEntrance, ...wildBushInteractablesCfgs },
  { sprite: wildBushMazeChest, ...wildBushInteractablesCfgs },
  { sprite: wildBushBeach1, ...wildBushInteractablesCfgs },
  { sprite: wildBushBeach2, ...wildBushInteractablesCfgs },
  { sprite: spHouse, ...signpostInteractablesCfgs },
  { sprite: spMansion1, ...signpostInteractablesCfgs },
  { sprite: spMansion2, ...signpostInteractablesCfgs },
  { sprite: msgBottle1, ...msgBottleInteractablesCfgs },
];
const HUAZELEI_INTERACTABLE: Interactable = { sprite: huazelei, label: "Talk" };
let paperWindAnimating = false;

// Incremented/decremented by the "sand" trigger below, not a plain boolean —
// several same-named "sand" rectangles approximate one irregular beach
// shape (see triggers/overworld.ts), so this is the count of how many of
// them the player is currently inside, with ">0" meaning "on sand" overall.
let sandZoneCount = 0;

let tracingPaper2ShineHandle: ShineHandle | undefined;
let coreMsgBottleShineHandle: ShineHandle | undefined;
let jpShineHandle: ShineHandle | undefined;

function scheduleMamaFacePapa() {
  scheduleFaceDirection(GAME_STATE.mama, "d");
}

function schedulePapaFaceMama() {
  scheduleFaceDirection(GAME_STATE.papa, "a");
}

function exitMap() {
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
  cutscene_running_shoes: { onEnter: cutsceneRunningShoes },
  cutscene_mid_aisle: { onEnter: () => cutsceneMidAisle() },
  cutscene_mid_aisle_lei: { onEnter: () => cutsceneMidAisleLei() },
  cutscene_mid_aisle_jp: { onEnter: () => cutsceneMidAisleJp() },
  restrict_allow_run: { onEnter: () => restrictRun(false) },
  restrict_disallow_run: { onEnter: () => restrictRun(true) },
  restrict_mid_aisle_lock: { onEnter: () => restrictMidAisleExit() },
  sand: {
    onEnter: () => sandZoneCount++,
    onLeave: () => sandZoneCount--,
  },
};

const quests = GAME_STATE.quests;
const questMain = quests.get("invitation_postcard")!;
const questCatchSheets = quests.get("catch_sheets")!;
const questRunningShoes = quests.get("running_shoes")!;
const questMessageBottle = quests.get("message_in_bottle")!;
const questMazeChest = quests.get("maze_chest")!;
const questDaoMingKeys = quests.get("daoming_keys")!;
const questSketchUnity = quests.get("sketch_unity")!;

// Static sprites that never relocates
placeAtTile({ sprite: GAME_STATE.papa, tile: [63, 39] });
placeAtTile({ sprite: smallFountainA, tile: [80.75, 51.5] });
placeAtTile({ sprite: smallFountainB, tile: [105.75, 51.5] });
placeAtTile({ sprite: smallFountainC, tile: [92.25, 76.5] });
placeAtTile({ sprite: bigFountainA, tile: [80.25, 21.75] });
placeAtTile({ sprite: bigFountainB, tile: [90.25, 21.75] });
placeAtTile({ sprite: wildBushPaper, tile: [42, 73.5] });
placeAtTile({ sprite: wildBushMazeEntrance, tile: [106, 10] });
placeAtTile({ sprite: wildBushMazeChest, tile: [117, 9] });
placeAtTile({ sprite: wildBushBeach1, tile: [20, 51] });
placeAtTile({ sprite: wildBushBeach2, tile: [20, 52] });
placeAtTile({ sprite: spHouse, tile: [60, 45] });
placeAtTile({ sprite: spMansion1, tile: [85, 30] });
placeAtTile({ sprite: spMansion2, tile: [88, 30] });
placeAtTile({ sprite: msgBottle1, tile: [45, 74] });
placeAtTile({ sprite: chestEmpty, tile: [119.75, 7.75] });
placeAtTile({ sprite: balloonCrates[0], tile: [99, 74] });
placeAtTile({ sprite: balloonCrates[1], tile: [99, 75] });
placeAtTile({ sprite: balloonCrates[2], tile: [100, 75] });
placeAtTile({ sprite: balloonCrates[3], tile: [108, 74] });
placeAtTile({ sprite: balloonCrates[4], tile: [107, 75] });
placeAtTile({ sprite: balloonCrates[5], tile: [108, 75] });

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

const BOUNDARIES_MAIN_EVENT = createBoundaries(COLLISION_OVERWORLD_EVENT);
// TODO: boundaries non-event

export const overworldScene: Scene = {
  fadeIn: 1,
  fadeOut: 0.5,
  ready: preload([
    background.image,
    foreground.image,
    smallFountainA.image,
    bigFountainA.image,
    backgroundEvent.image,
    // TODO: is this the right place for the backgroundEvent, where we want to lazy load it once in a specific time?
  ]).then(() => prepareViewportClamped([background, foreground, backgroundEvent])),

  enter() {
    sandZoneCount = 0; // fresh trigger-zone instances below all start un-entered — stay in sync regardless of leftover state from a previous visit
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
    GAME_STATE.triggerZones = createTriggerZones(TRIGGER_OVERWORLD);

    GAME_STATE.obstacles = [
      ...NPCS,
      wildBushPaper,
      wildBushMazeEntrance,
      wildBushMazeChest,
      wildBushBeach1,
      wildBushBeach2,
    ];

    if (!GAME_STATE.sequence.intro) {
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

    initQuests();
  },

  update(dt) {
    DECORS.filter(isInViewport).forEach((sprite) => sprite.update(dt));
    NPCS.filter(isInViewport).forEach((n) => n.update(dt));

    if (paperWindAnimating) paperWind1.update(dt);
    // if (GAME_STATE.sceneElapsed === 0) playMusic("map");

    const playerBox = movePlayer(dt);
    if (playerBox) checkTriggerZones(playerBox, GAME_STATE.triggerZones, TRIGGER_HANDLERS);

    updateFootprints(dt);
    trackFootstep(player, sandZoneCount > 0);
    updateInteraction(INTERACTABLES, interactions);
  },

  draw(ctx) {
    if (questDaoMingKeys.status === "resolved" && !GAME_STATE.sequence.closing_remarks)
      drawViewportClamped(ctx, backgroundEvent);
    else drawViewportClamped(ctx, background);

    // GAME_STATE.boundaries.forEach((b) => b.draw(ctx)); // for debugging and boundary visibility
    DECORS.filter(isInViewport).forEach((sprite) => sprite.draw(ctx));
    drawFootprints(ctx);
    drawYSorted(ctx, [player, ...NPCS.filter(isInViewport)]);

    if (questDaoMingKeys.status === "resolved" && !GAME_STATE.sequence.closing_remarks)
      drawViewportClamped(ctx, foreground);
    else drawViewportClamped(ctx, foreground);

    if (GAME_STATE.facedTarget) drawInteractPrompt(ctx, GAME_STATE.facedTarget, INTERACTABLES);

    if (paperWindAnimating) paperWind1.draw(ctx);
  },
};

function initQuests() {
  if (questMain.status === "resolved") {
    initFreeRoam();
    return;
  }

  // Season 1:
  initQuestsDaomingsi();
  initQuestsHuazelei();
  initTracingPaper2();
  initCoreMessageBottle();
  spawnMazeChest();
  initMarketEvent();
  initMainEventGuards();
  initMainEvent();
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
  addOnce(INTERACTABLES, {
    sprite: GAME_STATE.mama,
    label: "Talk",
  });
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

  DIALOGUE.effect(disableAccess, 0.00001);
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

  exitMap();

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
  switch (target) {
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
    case spHouse:
      DIALOGUE.show("Your house...");
      break;
    case spMansion1:
    case spMansion2:
      DIALOGUE.show("DAO MING Mansion");
      break;
    case coreMsgBottle:
      readBottle(coreMsgBottle);
      break;
    case msgBottle1:
      readBottle(msgBottle1);
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
  let shineHandle: ShineHandle | null = null;

  DIALOGUE.show({
    text: "F4 HUA ZE LEI: Hello CHERYL...",
    color: DIALOGUE_COLOR_HUAZELEI,
    portrait: PORTRAIT_HUAZELEI,
  });

  DIALOGUE.effect(() => {
    disableAccess();
    const quest = GAME_STATE.quests.get("meet_huazelei")!;
    questSetStatus(quest, "resolved");
    playQuestToast(quest);
    playQuestCompleteBanner(`Meet Hua Ze Lei Completed!`);
  }, 5);

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
      drift(paperWind1, {
        to: [82, 45],
        waypoints: 8,
        wobble: 150,
        delay: 0.5,
        duration: 5,
        onComplete: () => {
          paperWindAnimating = false;
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
  tracingPaper2ShineHandle?.stop();
  GAME_STATE.sequence.chasing_sheet_2 = true;
  remove(DECORS, paperSingle);

  gsap.delayedCall(0.5, () => {
    player.face("s");
    playAttentionBounce(player);
    playExclamation(player);
  });

  DIALOGUE.effect(() => {
    paperWindAnimating = true;
    hudSetBagIconVisible(false);
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
      },
    });
  }, 2.5);

  GAME_STATE.movementLocked = true;
  DIALOGUE.queue(`Oh no! Hinangin na naman!`);
}

function interactPaper2Part2() {
  if (questCatchSheets.qty !== 1) return;
  tracingPaper2ShineHandle?.stop();
  GAME_STATE.sequence.retrieving_sheet_2 = true;
  remove(DECORS, paperSingle);
  gsap.delayedCall(1, () => removeInteractable(INTERACTABLES, paperSingle));

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

let shearsToastHandle: QuestToastHandle | null;

function interactWildBush(bushSprite: Sprite) {
  if (!bagHasItem("shears")) {
    DIALOGUE.show(`Di ako makadaan, may halaman sa daan...`);

    if (bushSprite === wildBushPaper && GAME_STATE.sequence.chasing_sheet_2) {
      DIALOGUE.onComplete = () => {
        shearsToastHandle?.stop();
        const quest = GAME_STATE.quests.get("garden_shears")!;
        questSetStatus(quest, "active");
        shearsToastHandle = playQuestToast({
          ...quest,
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
  DIALOGUE.onComplete = () => {
    removeInteractable(INTERACTABLES, bushSprite);
    remove(DECORS, bushSprite);
    remove(GAME_STATE.obstacles, bushSprite);
  };
}

function readBottle(msgBottle: Sprite) {
  GAME_STATE.movementLocked = true;
  const prefix = `[MESSAGE IN A BOTTLE]`;
  DIALOGUE.show(prefix);

  switch (msgBottle) {
    case coreMsgBottle:
      hudSetBagIconVisible(false);
      completeCoreMsgBottle();
      return; // stop reading all the way down below (overrides DIALOGUE.onComplete)
    case msgBottle1:
      DIALOGUE.queue(`
        "You'll never realize how important something, or someone...
        IS to you, until the moment they are about to fade."
        — JP Aguilar
      `);
      break;
  }

  DIALOGUE.onComplete = () => {
    GAME_STATE.movementLocked = false;
    if (questMessageBottle.status === "active" && msgBottle !== coreMsgBottle) {
      DIALOGUE.show(`Dili ito ang message-in-a-bottle na hinahanap ko...`);
    }
  };
}

function initCoreMessageBottle() {
  if (questRunningShoes.status === "resolved" && !GAME_STATE.sequence.mama_starts_bottle) {
    GAME_STATE.movementLocked = true;
    gsap.delayedCall(overworldScene.fadeIn! + 0.5, cutsceneStartMessageBottle);
  }

  if (questCatchSheets.status === "active") spawnCoreMessageBottle();
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

  DIALOGUE.queue(`Mahahanap ko na rin ang teasure para sa event!`);
  DIALOGUE.effect(() => {
    questSetStatus(questMazeChest, "active");
    playQuestToast(questMazeChest);
  });

  DIALOGUE.onComplete = () => {
    GAME_STATE.movementLocked = false;
    hudSetBagIconVisible(true);
    spawnMazeChest();
  };
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
    disableAccess();
    placeAtTile({ sprite: chestOpen, tile: [119.75, 7.75] });
    addOnce(DECORS, chestOpen);
    addOnce(GAME_STATE.obstacles, chestOpen);
    removeInteractable(INTERACTABLES, chestClose);
    playExclamation(player);
  });
  DIALOGUE.effect(disableAccess, 1.5);
  DIALOGUE.queue(`A music box...!`);
  DIALOGUE.queue(`Kunin ko na...`);
  DIALOGUE.effect(() => {
    disableAccess();
    addOnce(DECORS, chestEmpty);
    addOnce(GAME_STATE.obstacles, chestEmpty);
    respawnNPC(daomingsi, [108, 7]);
    respawnNPC(huazelei, [107.5, 7.25]);
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
    disableAccess();
    daomingsi.face("d");
  }, 2);
  DIALOGUE.effect(() => {
    disableAccess();
    huazelei.face("d");
    playExclamation(daomingsi, {
      onComplete: () => walk(daomingsi, { direction: "d", steps: 2 }),
    });
    playAttentionBounce(daomingsi, { hops: 5, duration: 0.05, delay: 2 });
    playExclamation(daomingsi, { delay: 2 });
    playExclamation(player, { delay: 2 });
    playAttentionBounce(daomingsi, { hops: 5, duration: 0.05, delay: 4 });
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
    disableAccess();
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
    disableAccess();
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
    disableAccess();
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

function respawnNPC(npc: PlayerSprite, tile?: [number, number]) {
  if (tile) placeAtTile({ sprite: npc, tile });
  addOnce(NPCS, npc);
  addOnce(GAME_STATE.obstacles, npc);
}

function despawnNPC(npc: PlayerSprite) {
  remove(NPCS, npc);
  remove(GAME_STATE.obstacles, npc);
  removeInteractable(INTERACTABLES, npc);
}

/** Locks movement, hides bag icon, dialogue box and portrait. */
function disableAccess() {
  hudSetBagIconVisible(false);
  GAME_STATE.movementLocked = true;
  DIALOGUE.hideBox();
  DIALOGUE.clearPortrait();
}

function initMarketEvent() {
  if (questMazeChest.status !== "resolved") return;
  despawnNPC(huazelei);
  respawnNPC(meizuo, [101.5, 74]);
  respawnNPC(ximen, [105.5, 74]);
  addOnce(INTERACTABLES, { sprite: meizuo });
  addOnce(INTERACTABLES, { sprite: ximen });
  balloonCrates.forEach((decor) => {
    addOnce(DECORS, decor);
    addOnce(GAME_STATE.obstacles, decor);
  });
}

function cutsceneMarket() {
  if (questMazeChest.status !== "resolved") return;
  hudSetBagIconVisible(false);

  // ! This pattern is IMPORTANT before a "Walk effect"
  // ! If this is missing, the walk effect will have a bug during animation
  // ! that it would move the player but stays in "idle" frame instead of "walk"
  DIALOGUE.effect(disableAccess, 0.00000000000001);

  DIALOGUE.effect(() => {
    walk(player, [101.5, 75], {
      onComplete: () => {
        player.face("w");
        playExclamation(meizuo);
        playExclamation(ximen);
      },
    });
  }, 3);

  f4Speaker("meizuo", `F4 MEI ZUO: Oh pumila lang kayo ng maayos diyan!`);

  DIALOGUE.effect(() => {
    disableAccess();
    playExclamation(ximen);
  }, 0.5);

  f4Speaker("ximen", `F4 XI MEN: Isang halik kay MEI ZUO kada isang gawa/humihip ng lobo!`);
  f4Speaker("ximen", `Pinakamaraming kiss sa pinakamaraming lobo na magagawa!`);
  f4Speaker("meizuo", `MEI ZUO: Whoaooooooh yeah alright!`);

  DIALOGUE.effect(() => {
    disableAccess();
    const q1 = quests.get("meet_meizuo")!;
    const q2 = quests.get("meet_ximen")!;
    questSetStatus(q1, "resolved");
    questSetStatus(q2, "resolved");
    playQuestToast({ ...q1, hold: 8 });
    // playQuestToast({ ...q2, delay: 0.2, hold: 8 }); // TODO: why delay didn't worked?!
    gsap.delayedCall(0.2, () => playQuestToast({ ...q2, hold: 8 }));
    playQuestCompleteBanner(`Meet Mei Zuo & Xi Men Complete!`);
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
    disableAccess();
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

  DIALOGUE.effect(disableAccess, 1);
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
    disableAccess();
    ximen.face("a");
  }, 1.5);

  DIALOGUE.effect(() => {
    disableAccess();
    gsap.delayedCall(0.5, () => playAttentionBounce(meizuo));
    gsap.delayedCall(0.7, () => playAttentionBounce(ximen));
    gsap.delayedCall(1, () => playExclamation(meizuo));
    gsap.delayedCall(1.7, () => playExclamation(ximen));
  }, 3);

  f4Speaker(`ximen`, `XI MEN: Kiss ni AH SI?`);

  DIALOGUE.queue({ text: `... ... ...`, portrait: null, color: "black" });

  DIALOGUE.effect(() => {
    disableAccess();
    gsap.delayedCall(0.5, () => playAttentionBounce(meizuo));
    gsap.delayedCall(0.7, () => playAttentionBounce(ximen));
    gsap.delayedCall(1, () => playExclamation(meizuo));
    gsap.delayedCall(1.7, () => playExclamation(ximen));
    gsap.delayedCall(2, () => meizuo.face("s"));
    gsap.delayedCall(2.3, () => ximen.face("s"));
  }, 3);

  DIALOGUE.effect(() => {
    disableAccess();
    playAttentionBounce(meizuo, {
      hops: 5,
      onComplete() {
        playAttentionBounce(meizuo, { hops: 5, delay: 0.5 });
      },
    });
  });

  f4Speaker(`meizuo`, `MEI ZUO: HAHAHAHAHA! HAHAHAHAHAHA!`);

  DIALOGUE.onComplete = () => {
    gsap.delayedCall(0.5, () => playQuestToast({ ...questDaoMingKeys, hold: 10 }));
    hudSetBagIconVisible(true);
    GAME_STATE.sequence.market_cutscene = true;
  };
}

function cutsceneMidAisle() {
  if (GAME_STATE.sequence.mid_aisle_cutscene && questMain.status !== "resolved")
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
  DIALOGUE.effect(disableAccess, 0.00000000000001);

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
  DIALOGUE.effect(disableAccess, 1.5);
  DIALOGUE.queue(`
      Alam kong napagod kayo kakahanap ng mga pahiwatig,
      pero hindi naman basta-bastang kayamanan ang hinahanap
      natin dito. Hindi lahat ng kayamanan ay ginto o alahas...
  `);
  DIALOGUE.effect(disableAccess, 1.5);
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
  DIALOGUE.effect(disableAccess, 1.5);
  DIALOGUE.effect(() => {
    playExclamation(daomingsi);
    playAttentionBounce(daomingsi);
  }, 0.5);
  DIALOGUE.queue(`
    Lubos rin ako nagpapasalamat kay CHE para sa suporta,
    bawat kilos, galaw at oras niya na ibinigay sa paghanap ng
    keys.
  `);
  DIALOGUE.effect(disableAccess, 1.5);
  DIALOGUE.queue(`
    Sa katunayan nga ay muntik na madulas si LIU mabanggit
    ang "keyk".
  `);
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
    disableAccess();
    player.moveSpeed = MAIN_EVENT_PLAYER_MOVESPEED;
    walk(daomingsi, [
      //
      { direction: "a", steps: 1.25 },
      [92.75, 46.5],
    ]);
  }, 5);
  DIALOGUE.queue(`Sige na CHE, diretso ka lang pumunta sa stage.`);
  DIALOGUE.effect(() => {
    disableAccess();
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
    disableAccess();
    playExclamation(huazelei);
  }, 0.5);
  f4Speaker("huazelei", "HUA ZE LEI: CHERYL...");
  DIALOGUE.effect(() => {
    gsap.delayedCall(2, () => {
      GAME_STATE.papa.face("d");
      GAME_STATE.mama.face("d");
    });
  });
  DIALOGUE.queue("Yung last page ng sketch ko na hinahabol mo ay nahanap na.");
  DIALOGUE.queue("...iaabot niya na lang sa iyo kasama ang music box.");
  DIALOGUE.effect(disableAccess, 0.5);
  DIALOGUE.queue({ text: "... ... ...", portrait: null, color: "black" });
  DIALOGUE.effect(() => {
    disableAccess();
    playExclamation(player, { glyph: "?", color: "darkviolet", hold: 5 });
  }, 2.5);
  DIALOGUE.queue(`...niya?`);
  DIALOGUE.effect(() => {
    disableAccess();
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

  DIALOGUE.effect(disableAccess, 0.00001);

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
      GAME_STATE.mama.face("w");
      GAME_STATE.papa.face("w");
    });

    gsap.delayedCall(0.2, () => playExclamation(jp, { glyph: "🤗" }));
  });

  DIALOGUE.queue({
    text: `JP: Hi Love Love, Cheryl ko...`,
    color: "blue",
  });

  DIALOGUE.effect(() => {
    disableAccess();
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
  DIALOGUE.effect(() => DIALOGUE.lock());
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
    disableAccess();
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
    disableAccess();
    questSetStatus("sketch_unity", "active");
    playQuestToast(questSketchUnity);
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

      disableAccess();
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
  DIALOGUE.effect(disableAccess, 0.00001);

  DIALOGUE.effect(() => {
    playExclamation(daomingsi);
    gsap.delayedCall(3, () => playExclamation(huazelei, { glyph: "😅", hold: 5 }));
  });
  f4Speaker(`daomingsi`, "DAO MING SI: Pero sketch lang iyan ni HUA ZE LEI!");
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
    playImagePreview(PHOTO_BIRTHDAY_POSTCARD, { hold: 10, onComplete: cutsceneMainQuestReminder });
    birthdayConfetti();
    bagIncItem("birthday_postcard");
  };
}

let questToast: QuestToastHandle | undefined;

function cutsceneMainQuestReminder() {
  DIALOGUE.effect(disableAccess, 0.00001);
  DIALOGUE.effect(() => {
    playExclamation(daomingsi);
    gsap.delayedCall(0.5, () => {
      playExclamation(daomingsi);
      playAttentionBounce(daomingsi);
    });
  });
  f4Speaker("daomingsi", "DAO MING SI: Teka nga muna, meron pa isang last quest!");
  DIALOGUE.effect(() => {
    disableAccess();
    playQuestToast({ ...questMain, hold: 8 });
    gsap.delayedCall(0.5, () => {
      player.face("s");
      jp.face("s");
    });
  }, 3);
  DIALOGUE.effect(() => {
    disableAccess();
    playExclamation(meizuo);
    playAttentionBounce(meizuo);
    meizuo.face("s");
  });
  f4Speaker("meizuo", "MEI ZUO: Ou nga tama si AH SI.");
  f4Speaker("meizuo", "Kaya nandito tayo lahat para ipadiwang sa kaganapang ito...");
  f4Speaker("daomingsi", "DAO MING SI: Kaya sino sa inyo ang nakahanap ng treasure?");
  DIALOGUE.effect(() => {
    disableAccess();
    playExclamation(ximen);
    playAttentionBounce(ximen);
    ximen.face("s");
  });
  f4Speaker("ximen", "XI MEN: Kasama ito sa mga invitation at parcel sa simula pa lamang.");
  DIALOGUE.queue({ text: "... ... ...", portrait: null, color: "black" });
  DIALOGUE.effect(disableAccess, 1.5);
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
  disableAccess();
  hudSetBagIconVisible(false);
  DIALOGUE.effect(() => playExclamation(daomingsi), 0.5);
  DIALOGUE.effect(() => {
    playExclamation(daomingsi);
    playAttentionBounce(daomingsi);
  }, 0.5);
  f4Speaker("daomingsi", `DAO MING SI: Tulad ng nabanggit ko kanina...`);
  f4Speaker(
    "daomingsi",
    `...na hindi lahat ng treasure o kayamanan ay 
    isang uri ng bagay tulad na lamang ng music box,
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
    `Iyung missing treasure, ay natakpan lamang ng mabuti sa ilalim ng first layer nito.`,
  );
  DIALOGUE.effect(() => {
    GAME_STATE.movementLocked = true;
    bagIncItem("parcel");
  }, 0.000001);
  DIALOGUE.queue({
    text: `YOU: (thinking) Kailangan ko buksan yung chest na galing parcel sa bag...`,
    color: "black",
  });
  DIALOGUE.queue(`Yung treasure nasa ilalim lang ng first layer nito...`);
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
    playImagePreview(PHOTO_TREASURE, {
      hold: 5,
      onComplete() {
        playImagePreview(PHOTO_TREASURE_CLOSEUP, { hold: 10, onComplete: closingRemarks });
      },
    });
  };
}

function closingRemarks() {
  DIALOGUE.effect(() => {
    playExclamation(player, { icon: ICON_RED_HEART, hold: 2 });
    playExclamation(jp, { icon: ICON_RED_HEART, hold: 2 });
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
        gsap.delayedCall(overworldScene.fadeOut! + 0.5, () => iris.stop());
        GAME_STATE.player.moveSpeed = 200; // restore
        GAME_STATE.allowRunning = true; // restore
        GAME_STATE.sceneName = "home";
      },
    });
    // TODO: Download font game so it can be loaded offline
  };
}

function initFreeRoam() {
  if (questMain.status !== "resolved") return;
  const cleanupNpcs = [...f4, ...AISLE_GUARDS, ...PARK_EVENT_GUARDS];
  cleanupNpcs.forEach((npc) => despawnNPC(npc));
  respawnNPC(GAME_STATE.papa, [63, 39]);
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

function initMainEventGuards() {
  if (questMazeChest.status !== "resolved") return;

  PARK_EVENT_GUARDS.forEach((npc) => {
    respawnNPC(npc);
    addOnce(INTERACTABLES, { sprite: npc, probeDistance: 8 });
  });
  AISLE_GUARDS.forEach((npc) => addOnce(INTERACTABLES, { sprite: npc }));

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

  addOnce(DECORS, chestEmpty);
  addOnce(GAME_STATE.obstacles, chestEmpty);
  BOUNDARIES_MAIN_EVENT.forEach((b) => addOnce(GAME_STATE.boundaries, b));

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
  if (questMain.status === "resolved") return;
  if (questDaoMingKeys.status !== "resolved") return;

  if (restricted) {
    GAME_STATE.allowRunning = false;
  } else {
    GAME_STATE.allowRunning = true;
  }
}

function restrictMidAisleExit() {
  if (!GAME_STATE.sequence.mid_aisle_cutscene || questMain.status === "resolved") return;

  DIALOGUE.effect(disableAccess, 0.00000000000001);

  DIALOGUE.effect(() => {
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

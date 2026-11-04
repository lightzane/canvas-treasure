import { COLLISION_OVERWORLD } from "@/constants/collisions/overworld";
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
import { bagHasItem, bagIncItem } from "@/lib/bag";
import { DIALOGUE } from "@/lib/canvas/dialogue";
import { isInViewport } from "@/lib/canvas/viewport";
import { drawViewportClamped, prepareViewportClamped } from "@/lib/canvas/viewport-clamp";
import { drawYSorted } from "@/lib/canvas/y-sort";
import { drift } from "@/lib/drift";
import { playAttentionBounce } from "@/lib/effects/attention-bounce";
import { playExclamation } from "@/lib/effects/exclamation-bubble";
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
import { movePlayer } from "@/lib/map-movement";
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

const background = new Sprite({ src: IMG_MAP_BG });
/** Drawn on top of the player (tree canopies, roof overhangs, etc). */
const foreground = new Sprite({ src: IMG_MAP_FG });

const backgroundEvent = new Sprite({ src: IMG_MAP_EVENT_BG });

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
const HUAZELEI_INTERACTABLE: Interactable = { sprite: GAME_STATE.huazelei, label: "Talk" };
let paperWindAnimating = false;

// Incremented/decremented by the "sand" trigger below, not a plain boolean —
// several same-named "sand" rectangles approximate one irregular beach
// shape (see triggers/overworld.ts), so this is the count of how many of
// them the player is currently inside, with ">0" meaning "on sand" overall.
let sandZoneCount = 0;

let tracingPaper2ShineHandle: ShineHandle | undefined;
let coreMsgBottleShineHandle: ShineHandle | undefined;

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
  cutscene_running_shoes: {
    onEnter: cutsceneRunningShoes,
  },
  sand: {
    onEnter: () => sandZoneCount++,
    onLeave: () => sandZoneCount--,
  },
};

const quests = GAME_STATE.quests;
const questMainQuest = quests.get("invitation_postcard")!;
const questCatchSheets = quests.get("catch_sheets")!;
const questRunningShoes = quests.get("running_shoes")!;
const questMessageBottle = quests.get("message_in_bottle")!;
const questMazeChest = quests.get("maze_chest")!;
const questDaoMingKeys = quests.get("daoming_keys")!;

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

    GAME_STATE.player.face("s");
    GAME_STATE.papa.face("s");
    // Spawn at specific tiles (col, row from Tiled's bottom-left readout).
    // Default here is "arrived from home" — whichever scene set spawnLocation
    // (e.g. mansion's exit) takes priority; consumed so it doesn't leak into
    // a later, unrelated entry (e.g. a straight game boot into overworld).
    // spriteSize pins this to the player's stable boxSize — see the same
    // comment in home.ts, or spriteSize's own doc in positioning.ts.
    placeAtTile({
      sprite: GAME_STATE.player,
      tile: GAME_STATE.spawnLocation ?? [58.9, 42],
      spriteSize: GAME_STATE.player.boxSize,
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
    trackFootstep(GAME_STATE.player, sandZoneCount > 0);
    updateInteraction(INTERACTABLES, interactions);
  },

  draw(ctx) {
    if (questDaoMingKeys.status === "resolved") drawViewportClamped(ctx, backgroundEvent);
    else drawViewportClamped(ctx, background);

    // GAME_STATE.boundaries.forEach((b) => b.draw(ctx)); // for debugging and boundary visibility
    DECORS.filter(isInViewport).forEach((sprite) => sprite.draw(ctx));
    drawFootprints(ctx);
    drawYSorted(ctx, [GAME_STATE.player, ...NPCS.filter(isInViewport)]);

    if (questDaoMingKeys.status === "resolved") drawViewportClamped(ctx, foreground);
    else drawViewportClamped(ctx, foreground);

    if (GAME_STATE.facedTarget) drawInteractPrompt(ctx, GAME_STATE.facedTarget, INTERACTABLES);

    if (paperWindAnimating) paperWind1.draw(ctx);
  },
};

function initQuests() {
  initQuestsDaomingsi();
  initQuestsHuazelei();
  initTracingPaper2();
  initCoreMessageBottle();
  spawnMazeChest();
  initMarketEvent();
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
    respawnNPC(GAME_STATE.huazelei, [81.5, 35]);
    addOnce(INTERACTABLES, HUAZELEI_INTERACTABLE);
    GAME_STATE.huazelei.face("w");
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

  exitMap();
  walk(GAME_STATE.player, [58.9, 42], { animated: true, onComplete: convo });

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

  GAME_STATE.player.face("w");
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
    case GAME_STATE.huazelei:
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
    case GAME_STATE.ximen:
      interactXimen();
      break;
    case GAME_STATE.meizuo:
      interactMeizuo();
      break;
  }

  if (PARK_EVENT_GUARDS.includes(target as PlayerSprite)) {
    DIALOGUE.show(`Bawal po muna dito ang entrance. Pasensiya na. May private event lang po...`);
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
    dialogueLockAndFocus();
    const quest = GAME_STATE.quests.get("meet_huazelei")!;
    questSetStatus(quest, "resolved");
    playQuestToast(quest);
    playQuestCompleteBanner(`Meet Hua Ze Lei Completed!`);
  }, 5);

  f4Speaker("huazelei", `F4 HUA ZE LEI: Hello CHERYL, naghahanap ka ng kiss?`);

  DIALOGUE.effect(() => {
    playExclamation(GAME_STATE.player);
    playAttentionBounce(GAME_STATE.player, { hops: 3, duration: 0.1 });
    shineHandle = playShine(GAME_STATE.player);
    gsap.delayedCall(8, () => shineHandle?.stop());
  }, 0.5);
  DIALOGUE.queue(`...si "DAO MING SI" naghahanap ng kiss?`);
  DIALOGUE.effect(() => playExclamation(GAME_STATE.player), 0.5);
  DIALOGUE.queue(`Ahh, hinahanap niya ang "keys" o susi niya...`);
  DIALOGUE.queue(`Paumanhin ngunit wala naman sa akin ang mga keys niya.`);
  DIALOGUE.effect(() => {
    DIALOGUE.clearPortrait();
    DIALOGUE.hideBox();
    playExclamation(GAME_STATE.huazelei);
    playAttentionBounce(paperSingle, { hops: 8, delay: 1, onComplete: removePaperSingle });

    function removePaperSingle() {
      remove(DECORS, paperSingle);
      paperWindAnimating = true;
      gsap.delayedCall(1.5, () => {
        GAME_STATE.huazelei.face("s");
        GAME_STATE.player.face("s");
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
      playExclamation(GAME_STATE.player);
      playAttentionBounce(GAME_STATE.player, { hops: 2 });
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
  playExclamation(GAME_STATE.player);
  playAttentionBounce(GAME_STATE.player);

  // Based on the initial tile spawn of paperMulti
  placeAtTile({ sprite: paperWind1, tile: [82 - 0.5, 44] });
  placeAtTile({ sprite: paperWind2, tile: [82 + 0.5, 44] });

  addOnce(DECORS, paperWind1);
  addOnce(DECORS, paperWind2);

  paperWindAnimating = true;

  gsap.delayedCall(1, () =>
    walk(
      GAME_STATE.huazelei,
      [
        [82, 36],
        [82, 41],
      ],
      {
        animated: true,
      },
    ),
  );

  let gsapDelay = 0.5;
  gsap.delayedCall(0.5, () => GAME_STATE.player.face("a"));
  gsap.delayedCall((gsapDelay += 0.5), () => GAME_STATE.player.face("d"));
  gsap.delayedCall((gsapDelay += 0.5), () => GAME_STATE.player.face("a"));
  gsap.delayedCall((gsapDelay += 0.5), () => GAME_STATE.player.face("d"));
  gsap.delayedCall((gsapDelay += 0.5), () => GAME_STATE.player.face("a"));
  gsap.delayedCall((gsapDelay += 0.5), () => GAME_STATE.player.face("w"));
  gsap.delayedCall((gsapDelay += 0.5), () => {
    playExclamation(GAME_STATE.player);
    playAttentionBounce(GAME_STATE.player, {
      onComplete: () => gsap.delayedCall(0.5, convo),
    });
  });

  walk(GAME_STATE.player, [82, 43], { animated: true });

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
          GAME_STATE.huazelei,
          [
            [82, 37],
            [84.5, 37],
            [84.5, 36],
          ],
          {
            animated: true,
            onComplete: () => GAME_STATE.huazelei.face("w"),
          },
        );
      });
    }, 0.5);

    DIALOGUE.effect(() => GAME_STATE.player.face("s"), 0.5);

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
    GAME_STATE.player.face("s");
    playAttentionBounce(GAME_STATE.player);
    playExclamation(GAME_STATE.player);
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
  placeAtTile({ sprite: GAME_STATE.huazelei, tile: [37, 65] });

  DIALOGUE.show(`Nahuli rin kita — 2 down! 1 to go...`);
  DIALOGUE.effect(() => {
    DIALOGUE.hideBox();
    questSetProgress(questCatchSheets, 2);
    playQuestToast(questCatchSheets);
    bagIncItem("paper2");
  }, 1.5);
  DIALOGUE.effect(() => {
    walk(GAME_STATE.huazelei, [37, 71], { animated: true });
    playAttentionBounce(GAME_STATE.player, { delay: 1 });
    playExclamation(GAME_STATE.player, { delay: 1 });
    gsap.delayedCall(0.5, () => GAME_STATE.player.face("a"));
  }, 2);
  DIALOGUE.effect(() => GAME_STATE.huazelei.face("d"));

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
  DIALOGUE.effect(() => walk(GAME_STATE.huazelei, [37, 65], { animated: true }), 2);
  DIALOGUE.effect(() => {
    const q = GAME_STATE.quests.get("running_shoes")!;
    playQuestToast(questCatchSheets);
    gsap.delayedCall(0.8, () => playQuestToast(q));
    questSetStatus(q, "active");
    placeAtTile({ sprite: GAME_STATE.huazelei, tile: [84.5, 36] });
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
    playAttentionBounce(GAME_STATE.player);
    playExclamation(GAME_STATE.player);
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

    despawnNPC(GAME_STATE.huazelei);
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
    dialogueLockAndFocus();
    placeAtTile({ sprite: chestOpen, tile: [119.75, 7.75] });
    addOnce(DECORS, chestOpen);
    addOnce(GAME_STATE.obstacles, chestOpen);
    removeInteractable(INTERACTABLES, chestClose);
    playExclamation(GAME_STATE.player);
  });
  DIALOGUE.effect(dialogueLockAndFocus, 1.5);
  DIALOGUE.queue(`A music box...!`);
  DIALOGUE.queue(`Kunin ko na...`);
  DIALOGUE.effect(() => {
    dialogueLockAndFocus();
    addOnce(DECORS, chestEmpty);
    addOnce(GAME_STATE.obstacles, chestEmpty);
    respawnNPC(GAME_STATE.daomingsi, [108, 7]);
    respawnNPC(GAME_STATE.huazelei, [107.5, 7.25]);
    walk(GAME_STATE.daomingsi, [111.5, 7], {
      animated: true,
      onComplete: () => GAME_STATE.daomingsi.face("s"),
    });
    gsap.delayedCall(0.1, () =>
      walk(GAME_STATE.huazelei, [111, 7.25], {
        animated: true,
        onComplete: () => GAME_STATE.huazelei.face("w"),
      }),
    );
    gsap.delayedCall(0.5, () => GAME_STATE.player.face("a"));
    gsap.delayedCall(1.3, () => {
      playAttentionBounce(GAME_STATE.player, { hops: 3, duration: 0.09 });
      playExclamation(GAME_STATE.player);
    });
  }, 0.3);
  DIALOGUE.queue({
    text: `DAO MING SI: LEI, kailangan natin maayos na ang park para sa event mamaya...`,
    color: DIALOGUE_COLOR_DAOMINGSI,
    portrait: PORTRAIT_DAOMINGSI,
  });
  DIALOGUE.effect(() => {
    dialogueLockAndFocus();
    GAME_STATE.daomingsi.face("d");
  }, 2);
  DIALOGUE.effect(() => {
    dialogueLockAndFocus();
    GAME_STATE.huazelei.face("d");
    playExclamation(GAME_STATE.daomingsi, {
      onComplete: () =>
        walk(GAME_STATE.daomingsi, { direction: "d", steps: 2 }, { animated: true }),
    });
    playAttentionBounce(GAME_STATE.daomingsi, { hops: 5, duration: 0.05, delay: 2 });
    playExclamation(GAME_STATE.daomingsi, { delay: 2 });
    playExclamation(GAME_STATE.player, { delay: 2 });
    playAttentionBounce(GAME_STATE.daomingsi, { hops: 5, duration: 0.05, delay: 4 });
    playExclamation(GAME_STATE.daomingsi, { delay: 4 });
    playExclamation(GAME_STATE.player, { delay: 4 });
    gsap.delayedCall(0.8, () =>
      walk(
        GAME_STATE.huazelei,
        [
          { direction: "a", steps: 2 },
          { direction: "s", steps: 2.5 },
          { direction: "d", steps: 8.5 },
        ],
        { animated: true },
      ),
    );
  }, 5);
  DIALOGUE.queue({
    text: `DAO MING SI: Bakit mo naman pinutol ang mga halaman sa hardin ko?!`,
    portrait: PORTRAIT_DAOMINGSI_INTIMIDATE,
  });
  DIALOGUE.effect(() => {
    dialogueLockAndFocus();
    walk(GAME_STATE.huazelei, { direction: "w", steps: 2.5 }, { animated: true });
    playAttentionBounce(GAME_STATE.player, { hops: 2, duration: 0.09 });
    playExclamation(GAME_STATE.player, { hold: 10 });
  }, 1);
  DIALOGUE.queue({ text: `... ... ...`, portrait: null, color: "teal" });
  DIALOGUE.effect(() => GAME_STATE.huazelei.face("a"));
  DIALOGUE.queue({
    text: `HUA ZE LEI: Pasensiya ka na AH SI. May pinapahanap kasi ako sa kanya kanina...`,
    color: DIALOGUE_COLOR_HUAZELEI,
    portrait: PORTRAIT_HUAZELEI,
  });
  DIALOGUE.effect(() => GAME_STATE.huazelei.face("d"));
  DIALOGUE.queue(`
    (pabulong) Ibigay mo na sa akin yung
    nakuha mo bago pa tayo mabisto ni AH SI
    na nagpapanggap.
  `);
  DIALOGUE.queue(`Maraming salamat sa paghanap nito sa akin.`);
  DIALOGUE.effect(() => GAME_STATE.huazelei.face("a"));
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
  DIALOGUE.effect(() => GAME_STATE.daomingsi.face("s"));
  DIALOGUE.queue({
    text: `DAO MING SI: Tumatakbo ang oras, tayo na LEI, may gagawin pa tayo.`,
    portrait: PORTRAIT_DAOMINGSI,
    color: DIALOGUE_COLOR_DAOMINGSI,
  });
  DIALOGUE.effect(() => {
    walk(
      GAME_STATE.daomingsi,
      { direction: "a", steps: 10 },
      {
        animated: true,
        onComplete() {
          despawnNPC(GAME_STATE.daomingsi);
        },
      },
    );
    GAME_STATE.huazelei.face("d");
  });
  DIALOGUE.queue({
    text: `
      HUA ZE LEI: CHERYL, sa pagkakatanda ko ay hinahanap mo
      sila XI MEN at MEI ZUO para mahanap ang keys ni AH SI...`,
    portrait: PORTRAIT_HUAZELEI,
    color: DIALOGUE_COLOR_HUAZELEI,
  });
  DIALOGUE.effect(() => GAME_STATE.huazelei.face("s"));
  DIALOGUE.queue(`Makikita mo lang sila kung pumunta ka sa timog na bahagi nitong mansion.`);
  DIALOGUE.queue(`Sa timog ng park mismo makikita mo ang market dito.`);
  DIALOGUE.queue(`Sa market ginagawa ni XI MEN at MEI ZUO ang bahagi nila para sa event.`);
  DIALOGUE.queue(`Mauna na ako...`);
  DIALOGUE.effect(() => {
    dialogueLockAndFocus();
    walk(
      GAME_STATE.huazelei,
      [
        { direction: "s", steps: 2.5 },
        { direction: "a", steps: 10 },
      ],
      {
        animated: true,
        onComplete: initMarketEvent,
      },
    );
  }, 1.5);
  DIALOGUE.effect(() => {
    playAttentionBounce(GAME_STATE.player);
    playExclamation(GAME_STATE.player);
  });
  DIALOGUE.queue({ text: `Pero iyung teasure ko...`, portrait: null, color: "black" });
  DIALOGUE.effect(() => {
    dialogueLockAndFocus();
    questSetStatus(questMazeChest, "resolved");
    playQuestToast(questMazeChest);
    playQuestCompleteBanner(`Completed!`);
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

/** Locks movement, hides dialogue box and portrait. */
function dialogueLockAndFocus() {
  hudSetBagIconVisible(false);
  GAME_STATE.movementLocked = true;
  DIALOGUE.hideBox();
  DIALOGUE.clearPortrait();
}

function initMarketEvent() {
  if (questMazeChest.status !== "resolved") return;
  despawnNPC(GAME_STATE.huazelei);
  const meizuo = GAME_STATE.meizuo;
  const ximen = GAME_STATE.ximen;
  respawnNPC(meizuo, [101.5, 74]);
  respawnNPC(ximen, [105.5, 74]);
  addOnce(INTERACTABLES, { sprite: meizuo });
  addOnce(INTERACTABLES, { sprite: ximen });
}

function cutsceneMarket() {
  if (questMazeChest.status !== "resolved") return;
  hudSetBagIconVisible(false);
  dialogueLockAndFocus();

  DIALOGUE.effect(() => {
    playExclamation(GAME_STATE.meizuo);
    playExclamation(GAME_STATE.ximen);
    // TODO: Fix this! Walking animation doesn't walk and just stay's idle even though the animated is set to true!
    // walk(GAME_STATE.player, [101.5, 75], {
    //   animated: true,
    //   onComplete: () => GAME_STATE.player.face("w"),
    // });
  }, 1);

  f4Speaker("meizuo", `F4 MEI ZUO: Oh pumila lang kayo ng maayos diyan!`);

  DIALOGUE.effect(() => {
    dialogueLockAndFocus();
    playExclamation(GAME_STATE.ximen);
  }, 0.5);

  f4Speaker("ximen", `F4 XI MEN: Isang halik kay MEI ZUO kada isang gawa/humihip ng lobo!`);
  f4Speaker("ximen", `Pinakamaraming kiss sa pinakamaraming lobo na magagawa!`);
  f4Speaker("meizuo", `MEI ZUO: Whoaooooooh yeah alright!`);

  DIALOGUE.effect(() => {
    dialogueLockAndFocus();
    const q1 = quests.get("meet_meizuo")!;
    const q2 = quests.get("meet_ximen")!;
    questSetStatus(q1, "resolved");
    questSetStatus(q2, "resolved");
    playQuestToast({ ...q1, hold: 8 });
    // playQuestToast({ ...q2, delay: 0.2, hold: 8 }); // TODO: why delay didn't worked?!
    gsap.delayedCall(0.2, () => playQuestToast({ ...q2, hold: 8 }));
    playQuestCompleteBanner(`Meet Mei Zuo & Xi Men Complete!`);
  }, 5);

  DIALOGUE.effect(() => playExclamation(GAME_STATE.meizuo), 0.5);

  DIALOGUE.effect(() => {
    playAttentionBounce(GAME_STATE.meizuo);
    playExclamation(GAME_STATE.meizuo);
  }, 0.5);

  f4Speaker("meizuo", `Oii si CHE pala nandito!`);
  f4Speaker("meizuo", `XI MEN tingnan mo hahaha!`);

  DIALOGUE.effect(() => {
    playAttentionBounce(GAME_STATE.ximen);
    playExclamation(GAME_STATE.ximen);
  }, 0.5);

  f4Speaker(
    "ximen",
    `XI MEN: Hi CHE, naghahanda kami ni MEI ZUO ng mga lobo para sa event mamaya.`,
  );

  DIALOGUE.effect(() => playExclamation(GAME_STATE.player), 0.5);

  f4Speaker("meizuo", `MEI ZUO: Anu sabi mo CHE— naghahanap ka rin ng kiss?`);

  DIALOGUE.effect(() => playExclamation(GAME_STATE.player), 0.5);

  f4Speaker("meizuo", `Ahh yung "keys" ni AH SI?`);

  DIALOGUE.effect(() =>
    gsap.delayedCall(1, () => {
      GAME_STATE.meizuo.face("d");
      playAttentionBounce(GAME_STATE.meizuo);
    }),
  );

  f4Speaker("meizuo", `Wala sa akin. Nasa iyo ba XI MEN?`);
  f4Speaker("ximen", `XI MEN: Anung keys— ito talaga si AH SI.`);
  f4Speaker("ximen", `Alam ko nasa mansion lang ni AH SI yun.`);
  DIALOGUE.effect(() => GAME_STATE.meizuo.face("s"));
  f4Speaker("meizuo", `MEI ZUO: CHE, Mabuti pa balik ka ulit sa mansion.`);
  f4Speaker("ximen", `XI MEN: Sabihin mo kay LIU wala sa amin.`);

  DIALOGUE.effect(() => GAME_STATE.meizuo.face("d"));
  f4Speaker("meizuo", `MEI ZUO: Hindi kaya keys ng treasure chest iyun?`);

  DIALOGUE.effect(() => {
    dialogueLockAndFocus();
    GAME_STATE.ximen.face("a");
    gsap.delayedCall(0.5, () => playAttentionBounce(GAME_STATE.meizuo));
    gsap.delayedCall(0.7, () => playAttentionBounce(GAME_STATE.ximen));
    gsap.delayedCall(1, () => playExclamation(GAME_STATE.meizuo));
    gsap.delayedCall(1.7, () => playExclamation(GAME_STATE.ximen));
    gsap.delayedCall(2, () => GAME_STATE.meizuo.face("s"));
    gsap.delayedCall(2.3, () => GAME_STATE.ximen.face("s"));
  }, 3);

  f4Speaker(
    "meizuo",
    `
    Kami bahala CHE, balikan mo lang kami kapag hindi
    pa rin nahanap ang keys. Puntahan mo si LIU sa mansion.
    Kailangan pa namin tapusin ito mga lobo para sa event.
  `,
  );

  DIALOGUE.effect(dialogueLockAndFocus, 1);
  DIALOGUE.effect(() => {
    GAME_STATE.meizuo.face("d");
    playAttentionBounce(GAME_STATE.meizuo);
    playExclamation(GAME_STATE.meizuo);
  }, 0.5);

  f4Speaker(
    `meizuo`,
    `MEI ZUO: Alam mo napaisip ako XI MEN, baka yung keys rin ni AH SI ang hanap ng mga babaeng nakapila dito sa atin.`,
  );

  DIALOGUE.effect(() => {
    dialogueLockAndFocus();
    GAME_STATE.ximen.face("a");
  }, 1.5);

  DIALOGUE.effect(() => {
    dialogueLockAndFocus();
    gsap.delayedCall(0.5, () => playAttentionBounce(GAME_STATE.meizuo));
    gsap.delayedCall(0.7, () => playAttentionBounce(GAME_STATE.ximen));
    gsap.delayedCall(1, () => playExclamation(GAME_STATE.meizuo));
    gsap.delayedCall(1.7, () => playExclamation(GAME_STATE.ximen));
  }, 3);

  f4Speaker(`ximen`, `XI MEN: Kiss ni AH SI?`);

  DIALOGUE.queue({ text: `... ... ...`, portrait: null, color: "black" });

  DIALOGUE.effect(() => {
    dialogueLockAndFocus();
    gsap.delayedCall(0.5, () => playAttentionBounce(GAME_STATE.meizuo));
    gsap.delayedCall(0.7, () => playAttentionBounce(GAME_STATE.ximen));
    gsap.delayedCall(1, () => playExclamation(GAME_STATE.meizuo));
    gsap.delayedCall(1.7, () => playExclamation(GAME_STATE.ximen));
    gsap.delayedCall(2, () => GAME_STATE.meizuo.face("s"));
    gsap.delayedCall(2.3, () => GAME_STATE.ximen.face("s"));
  }, 3);

  DIALOGUE.effect(() => {
    dialogueLockAndFocus();
    playAttentionBounce(GAME_STATE.meizuo, {
      hops: 5,
      onComplete() {
        playAttentionBounce(GAME_STATE.meizuo, { hops: 5, delay: 0.5 });
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

function interactMeizuo() {
  if (!GAME_STATE.sequence.market_cutscene) {
    cutsceneMarket();
    return;
  }

  cancelScheduledFace(GAME_STATE.meizuo);
  playAttentionBounce(GAME_STATE.meizuo);
  playExclamation(GAME_STATE.meizuo);

  DIALOGUE.show({
    text: `MEI ZUO: Yo! CHERYL whazzup?`,
    color: DIALOGUE_COLOR_MEIZUO,
    portrait: PORTRAIT_MEIZUO,
  });

  DIALOGUE.onComplete = () => scheduleFaceDirection(GAME_STATE.meizuo, "s");
}

function interactXimen() {
  if (!GAME_STATE.sequence.market_cutscene) {
    cutsceneMarket();
    return;
  }

  const color = DIALOGUE_COLOR_XIMEN;
  const portrait = PORTRAIT_XIMEN;

  cancelScheduledFace(GAME_STATE.ximen);

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

  DIALOGUE.onComplete = () => scheduleFaceDirection(GAME_STATE.ximen, "s");
}

function initMainEvent() {
  if (questDaoMingKeys.status !== "resolved") return;
  addOnce(DECORS, chestEmpty);
  addOnce(GAME_STATE.obstacles, chestEmpty);
  despawnNPC(GAME_STATE.huazelei);
  despawnNPC(GAME_STATE.mama);
  despawnNPC(GAME_STATE.papa);

  let nLoc = [92.5, 32.4] as [number, number];
  NORTH_GUARDS.forEach((npc, i) => {
    let y = nLoc[1];
    if (i % 2 === 0) y -= 0.15;
    respawnNPC(npc, [(nLoc[0] += 0.85), y]);
    npc.face("w");
  });

  let wLoc = [78.5, 45] as [number, number];
  WEST_GUARDS.forEach((npc, i) => {
    let x = wLoc[0];
    if (i % 2 === 0) x -= 0.5;
    respawnNPC(npc, [x, (wLoc[1] += 0.5)]);
    npc.face("a");
  });

  let eLoc = [110, 45] as [number, number];
  EAST_GUARDS.forEach((npc, i) => {
    let x = eLoc[0];
    if (i % 2 === 0) x += 0.5;
    respawnNPC(npc, [x, (eLoc[1] += 0.5)]);
    npc.face("d");
  });

  PARK_EVENT_GUARDS.forEach((npc) => {
    addOnce(INTERACTABLES, { sprite: npc, probeDistance: 8 });
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

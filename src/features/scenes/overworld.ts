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
import type { PlayerSprite } from "@/features/sprite-player";
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
import { playQuestCompleteBanner, playQuestToast } from "@/lib/effects/quest-toast";
import { playShine, type ShineHandle } from "@/lib/effects/shine";
import { drawFootprints, trackFootstep, updateFootprints } from "@/lib/footprints";
import { hudSetBagIconVisible } from "@/lib/hud";
import { img } from "@/lib/img";
import { movePlayer } from "@/lib/map-movement";
import { placeAtTile } from "@/lib/positioning";
import { preload } from "@/lib/preload";
import { incQuestProgress, setQuestProgress, setQuestStatus } from "@/lib/quests";
import { walk } from "@/lib/walk";
import { PORTRAIT_HUAZELEI } from "@/sprites/hua-ze-lei";
import gsap from "gsap";

const IMG_MAP_BG = img("maps/overworld.png");
const IMG_MAP_FG = img("maps/overworld-fg.png");
const IMG_FOUNTAIN_SMALL = img("others/fountain-small.png");
const IMG_FOUNTAIN_BIG = img("others/fountain-big.png");
const IMG_PAPER_SINGLE = img("others/paper-single.png");
const IMG_PAPER_MULTI = img("others/paper-multi.png");
const IMG_PAPER_WIND = img("others/paper-wind.png");
const IMG_WILD_BUSH_CENTER = img("others/wild-bush-center.png");

const background = new Sprite({ src: IMG_MAP_BG });
/** Drawn on top of the player (tree canopies, roof overhangs, etc). */
const foreground = new Sprite({ src: IMG_MAP_FG });

// static decors
const smallFountainA = new Sprite({ src: IMG_FOUNTAIN_SMALL, frames: { max: 4 }, scale: 2 });
const smallFountainB = new Sprite({ src: IMG_FOUNTAIN_SMALL, frames: { max: 4 }, scale: 2 });
const bigFountainA = new Sprite({ src: IMG_FOUNTAIN_BIG, frames: { max: 4 }, scale: 2 });
const bigFountainB = new Sprite({ src: IMG_FOUNTAIN_BIG, frames: { max: 4 }, scale: 2 });

// removable decors
const wildBushPaper = new Sprite({
  src: IMG_WILD_BUSH_CENTER,
  scale: 2,
  boxSize: { height: 32 },
  collisionBox: { height: 32, anchor: "center" },
});

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
  bigFountainA,
  bigFountainB,
  wildBushPaper,
];
const NPCS: PlayerSprite[] = [GAME_STATE.papa];
const INTERACTABLES: Interactable[] = [
  { sprite: GAME_STATE.papa, label: "Talk" },
  { sprite: wildBushPaper, labelOffset: { y: -16 } },
];
const HUAZELEI_INTERACTABLE: Interactable = { sprite: GAME_STATE.huazelei, label: "Talk" };
let paperWindAnimating = false;

// Incremented/decremented by the "sand" trigger below, not a plain boolean —
// several same-named "sand" rectangles approximate one irregular beach
// shape (see triggers/overworld.ts), so this is the count of how many of
// them the player is currently inside, with ">0" meaning "on sand" overall.
let sandZoneCount = 0;

let tracingPaper2ShineHandle: ShineHandle | undefined;

let mamaFacePapaTimer: gsap.core.Tween | null = null;
function scheduleMamaFacePapa() {
  mamaFacePapaTimer?.kill();
  mamaFacePapaTimer = gsap.delayedCall(2, () => GAME_STATE.mama.face("d"));
}

let papaFaceMamaTimer: gsap.core.Tween | null = null;
function schedulePapaFaceMama() {
  papaFaceMamaTimer?.kill();
  papaFaceMamaTimer = gsap.delayedCall(2, () => GAME_STATE.papa.face("a"));
}

function exitMap() {
  hudSetBagIconVisible(false);
  GAME_STATE.movementLocked = true;
  tracingPaper2ShineHandle?.stop();
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
  sand: {
    onEnter: () => sandZoneCount++,
    onLeave: () => sandZoneCount--,
  },
};

const questCatchSheets = GAME_STATE.quests.get("catch_sheets")!;
const questRunningShoes = GAME_STATE.quests.get("running_shoes")!;

export const overworldScene: Scene = {
  fadeIn: 1,
  fadeOut: 0.5,
  ready: preload([
    background.image,
    foreground.image,
    smallFountainA.image,
    bigFountainA.image,
  ]).then(() => prepareViewportClamped([background, foreground])),

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
    placeAtTile({ sprite: GAME_STATE.papa, tile: [63, 39] });
    GAME_STATE.spawnLocation = undefined;
    placeAtTile({ sprite: smallFountainA, tile: [80.75, 51.5] });
    placeAtTile({ sprite: smallFountainA, tile: [80.75, 51.5] });
    placeAtTile({ sprite: smallFountainB, tile: [105.75, 51.5] });
    placeAtTile({ sprite: bigFountainA, tile: [80.25, 21.75] });
    placeAtTile({ sprite: bigFountainB, tile: [90.25, 21.75] });
    placeAtTile({ sprite: wildBushPaper, tile: [42, 73.5] });

    GAME_STATE.boundaries = createBoundaries(COLLISION_OVERWORLD);
    GAME_STATE.triggerZones = createTriggerZones(TRIGGER_OVERWORLD);

    GAME_STATE.obstacles = [...NPCS, wildBushPaper];

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
    drawViewportClamped(ctx, background);
    // GAME_STATE.boundaries.forEach((b) => b.draw(ctx)); // for debugging and boundary visibility
    DECORS.filter(isInViewport).forEach((sprite) => sprite.draw(ctx));
    drawFootprints(ctx);
    drawYSorted(ctx, [GAME_STATE.player, ...NPCS.filter(isInViewport)]);
    drawViewportClamped(ctx, foreground);
    if (GAME_STATE.facedTarget) drawInteractPrompt(ctx, GAME_STATE.facedTarget, INTERACTABLES);

    if (paperWindAnimating) paperWind1.draw(ctx);
  },
};

function initQuests() {
  initQuestsDaomingsi();
  initQuestsHuazelei();
  initTracingPaper2();
}

function initQuestsDaomingsi() {
  // Spawn Hua Ze Lei after meeting Dao Ming Si. Re-checked on every
  // re-entry (we don't know which visit is the first one after the flag
  // flips), so both additions go through addOnce to stay idempotent.
  if (GAME_STATE.sequence.meet_daomingsi) {
    addOnce(NPCS, GAME_STATE.huazelei);
    addOnce(INTERACTABLES, HUAZELEI_INTERACTABLE);
    placeAtTile({ sprite: GAME_STATE.huazelei, tile: [81.5, 35] });
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
    tracingPaper2ShineHandle = playShine(paperSingle, { color: "#fff", mode: "hidden", size: 32 });
  }
}

function spawnMamaAtOverworld() {
  placeAtTile({ sprite: GAME_STATE.mama, tile: [62, 39] });
  GAME_STATE.mama.face("d");
  GAME_STATE.papa.face("a");
  addOnce(NPCS, GAME_STATE.mama);
  addOnce(GAME_STATE.obstacles, GAME_STATE.mama);
  addOnce(INTERACTABLES, {
    sprite: GAME_STATE.mama,
    label: "Talk",
  });
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
      interactWildBushPaper();
      break;
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
    return;
  }

  if (!GAME_STATE.sequence.meet_huazelei) {
    DIALOGUE.show({
      text: `
        PAPA: Punta ka sa park, daan sa kanan. May pogi rin dun!
      `,
      color: "blue",
    });
    return;
  }

  DIALOGUE.show({ text: "PAPA: Yes Ching?", color: "blue" });

  DIALOGUE.onComplete = () => {
    if (questRunningShoes.status !== "inactive") schedulePapaFaceMama();
  };
}

function interactMama() {
  if (questCatchSheets.status === "inactive") return;

  DIALOGUE.show({
    text: "MAMA: Yes Ching?",
    color: "red",
  });

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
    color: "blue",
    portrait: PORTRAIT_HUAZELEI,
  });
}

function meetLeiConversation() {
  hudSetBagIconVisible(false);
  let shineHandle: ShineHandle | null = null;
  DIALOGUE.effect(() => {
    const quest = GAME_STATE.quests.get("meet_huazelei")!;
    playQuestToast({ description: quest.description, resolved: true });
    playQuestCompleteBanner(`Meet Hua Ze Lei Completed!`);
    setQuestStatus(quest, "resolved");
  }, 5);

  DIALOGUE.show({
    text: "F4 HUA ZE LEI: Hello CHERYL, naghahanap ka ng kiss?",
    color: "blue",
    portrait: PORTRAIT_HUAZELEI,
  });
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
    setQuestStatus(quest, "active");
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
      color: "blue",
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
      incQuestProgress(questCatchSheets, 1);
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
    setQuestProgress(questCatchSheets, 2);
    playQuestToast(questCatchSheets);
  }, 1.5);
  DIALOGUE.effect(() => {
    walk(GAME_STATE.huazelei, [37, 71], { animated: true });
    playAttentionBounce(GAME_STATE.player, { delay: 1 });
    playExclamation(GAME_STATE.player, { delay: 1 });
    gsap.delayedCall(0.5, () => GAME_STATE.player.face("a"));
  }, 2);
  DIALOGUE.effect(() => GAME_STATE.huazelei.face("d"));

  DIALOGUE.queue({
    text: `HUA ZE LEI: Oh Cheryl, nakita ko hinahabol mo pa rin sketch paper ko.`,
    portrait: PORTRAIT_HUAZELEI,
    color: "blue",
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
    setQuestStatus(q, "active");
    placeAtTile({ sprite: GAME_STATE.huazelei, tile: [84.5, 36] });
    hudSetBagIconVisible(true);
    spawnMamaAtOverworld();
  });
}

function interactWildBushPaper() {
  if (!bagHasItem("shears")) {
    DIALOGUE.show(`Di ako makadaan, may halaman sa daan...`);
    return;
  }

  DIALOGUE.show(`Using garden shears to trim the wild bush...`);
  DIALOGUE.onComplete = () => {
    removeInteractable(INTERACTABLES, wildBushPaper);
    remove(DECORS, wildBushPaper);
    remove(GAME_STATE.obstacles, wildBushPaper);
  };
}

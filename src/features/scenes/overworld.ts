import { COLLISION_OVERWORLD } from "@/constants/collisions/overworld";
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
import { setQuestStatus } from "@/lib/quests";
import { PORTRAIT_HUAZELEI } from "@/sprites/hua-ze-lei";
import gsap from "gsap";

const IMG_MAP_BG = img("maps/overworld.png");
const IMG_MAP_FG = img("maps/overworld-fg.png");
const IMG_FOUNTAIN_SMALL = img("others/fountain-small.png");
const IMG_FOUNTAIN_BIG = img("others/fountain-big.png");
const IMG_PAPER_SINGLE = img("others/paper-single.png");
const IMG_PAPER_MULTI = img("others/paper-multi.png");
const IMG_PAPER_WIND = img("others/paper-wind.png");

const background = new Sprite({ src: IMG_MAP_BG });
/** Drawn on top of the player (tree canopies, roof overhangs, etc). */
const foreground = new Sprite({ src: IMG_MAP_FG });

const smallFountainA = new Sprite({ src: IMG_FOUNTAIN_SMALL, frames: { max: 4 }, scale: 2 });
const smallFountainB = new Sprite({ src: IMG_FOUNTAIN_SMALL, frames: { max: 4 }, scale: 2 });
const bigFountainA = new Sprite({ src: IMG_FOUNTAIN_BIG, frames: { max: 4 }, scale: 2 });
const bigFountainB = new Sprite({ src: IMG_FOUNTAIN_BIG, frames: { max: 4 }, scale: 2 });
const paperSingle = new Sprite({ src: IMG_PAPER_SINGLE, scale: 2 });
const paperMulti = new Sprite({
  src: IMG_PAPER_MULTI,
  scale: 2,
  boxSize: { width: 32, height: 32 },
});
const paperWind = new Sprite({ src: IMG_PAPER_WIND, scale: 2, frames: { max: 8, hold: 180 } });

/** This map's own static/animated decor — drawn after the background, before the player. */
const DECORS: Sprite[] = [smallFountainA, smallFountainB, bigFountainA, bigFountainB];
const NPCS: PlayerSprite[] = [GAME_STATE.papa];
const INTERACTABLES: Interactable[] = [{ sprite: GAME_STATE.papa, label: "Talk" }];
const HUAZELEI_INTERACTABLE: Interactable = { sprite: GAME_STATE.huazelei, label: "Talk" };
let paperWindAnimating = false;

// Incremented/decremented by the "sand" trigger below, not a plain boolean —
// several same-named "sand" rectangles approximate one irregular beach
// shape (see triggers/overworld.ts), so this is the count of how many of
// them the player is currently inside, with ">0" meaning "on sand" overall.
let sandZoneCount = 0;

const TRIGGER_HANDLERS: TriggerHandlers<TriggerName> = {
  enter_home: {
    onEnter: () => {
      hudSetBagIconVisible(false);
      GAME_STATE.sceneName = "home";
      GAME_STATE.movementLocked = true;
    },
  },
  enter_mansion: {
    onEnter: () => {
      hudSetBagIconVisible(false);
      GAME_STATE.sceneName = "mansion";
      GAME_STATE.movementLocked = true;
    },
  },
  sand: {
    onEnter: () => sandZoneCount++,
    onLeave: () => sandZoneCount--,
  },
};

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

    GAME_STATE.boundaries = createBoundaries(COLLISION_OVERWORLD);
    GAME_STATE.triggerZones = createTriggerZones(TRIGGER_OVERWORLD);

    GAME_STATE.obstacles = NPCS;
    sandZoneCount = 0; // fresh trigger-zone instances below all start un-entered — stay in sync regardless of leftover state from a previous visit

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

    // Spawn Hua Ze Lei after meeting Dao Ming Si. Re-checked on every
    // re-entry (we don't know which visit is the first one after the flag
    // flips), so both additions go through addOnce to stay idempotent.
    if (GAME_STATE.sequence.meet_daomingsi) {
      addOnce(NPCS, GAME_STATE.huazelei);
      addOnce(INTERACTABLES, HUAZELEI_INTERACTABLE);
      placeAtTile({ sprite: GAME_STATE.huazelei, tile: [81.5, 35] });
      GAME_STATE.huazelei.face("w");
    }

    if (!GAME_STATE.sequence.meet_huazelei) {
      placeAtTile({ sprite: paperWind, tile: [81.25, 34] });
      placeAtTile({ sprite: paperMulti, tile: [82, 44] });
      placeAtTile({ sprite: paperSingle, tile: [81, 34] });
      addOnce(DECORS, paperSingle);
    }
  },

  update(dt) {
    DECORS.filter(isInViewport).forEach((sprite) => sprite.update(dt));
    NPCS.filter(isInViewport).forEach((n) => n.update(dt));

    if (paperWindAnimating) paperWind.update(dt);
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
    // GAME_STATE.player.draw(ctx);
    drawYSorted(ctx, [GAME_STATE.player, ...NPCS.filter(isInViewport)]);
    drawViewportClamped(ctx, foreground);
    if (GAME_STATE.facedTarget) drawInteractPrompt(ctx, GAME_STATE.facedTarget, INTERACTABLES);

    if (paperWindAnimating) paperWind.draw(ctx);
  },
};

function interactions(target: Sprite | undefined) {
  switch (target) {
    case GAME_STATE.papa:
      interactPapa();
      break;
    case GAME_STATE.huazelei:
      interactHuazelei();
      break;
    case paperMulti:
      interactPaperMulti();
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
}

function interactHuazelei() {
  if (!GAME_STATE.sequence.meet_huazelei) {
    meetLeiConversation();
    return;
  }

  DIALOGUE.show({ text: `HUA ZE LEI: Hello CHERYL!`, color: "blue", portrait: PORTRAIT_HUAZELEI });
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
      drift(paperWind, {
        to: [82, 45],
        waypoints: 8,
        wobble: 150,
        delay: 0.5,
        duration: 5,
        onComplete: () => {
          paperWindAnimating = false;
          addOnce(DECORS, paperMulti);
          addOnce(INTERACTABLES, {
            sprite: paperMulti,
            label: "Pick up",
          });
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
  }, 0.5);

  DIALOGUE.onComplete = () => {
    GAME_STATE.sequence.meet_huazelei = true;
    hudSetBagIconVisible(true);
  };
}

function interactPaperMulti() {
  remove(DECORS, paperMulti);
  removeInteractable(INTERACTABLES, paperMulti);
}

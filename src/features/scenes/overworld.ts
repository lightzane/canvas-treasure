import { COLLISION_OVERWORLD } from "@/constants/collisions/overworld";
import { TRIGGER_OVERWORLD, type TriggerName } from "@/constants/triggers/overworld";
import { GAME_STATE } from "@/features/game-state";
import { drawInteractPrompt, updateInteraction, type Interactable } from "@/features/interact";
import type { Scene } from "@/features/scene";
import { Sprite } from "@/features/sprite";
import type { PlayerSprite } from "@/features/sprite-player";
import {
  checkTriggerZones,
  createBoundaries,
  createTriggerZones,
  type TriggerHandlers,
} from "@/features/zone";
import { addOnce } from "@/lib/array";
import { DIALOGUE } from "@/lib/canvas/dialogue";
import { isInViewport } from "@/lib/canvas/viewport";
import { drawViewportClamped, prepareViewportClamped } from "@/lib/canvas/viewport-clamp";
import { drawYSorted } from "@/lib/canvas/y-sort";
import { playExclamation } from "@/lib/effects/exclamation-bubble";
import { playIrisReveal } from "@/lib/effects/iris-reveal";
import { playShine, type ShineHandle } from "@/lib/effects/shine";
import { img } from "@/lib/img";
import { movePlayer } from "@/lib/map-movement";
import { placeAtTile } from "@/lib/positioning";
import { preload } from "@/lib/preload";
import { walk } from "@/lib/walk";
import { PORTRAIT_HUAZELEI } from "@/sprites/hua-ze-lei";
import gsap from "gsap";

const IMG_MAP_BG = img("maps/overworld.png");
const IMG_MAP_FG = img("maps/overworld-fg.png");
const IMG_FOUNTAIN_SMALL = img("others/fountain-small.png");
const IMG_FOUNTAIN_BIG = img("others/fountain-big.png");

const background = new Sprite({ src: IMG_MAP_BG });
/** Drawn on top of the player (tree canopies, roof overhangs, etc). */
const foreground = new Sprite({ src: IMG_MAP_FG });

const smallFountainA = new Sprite({ src: IMG_FOUNTAIN_SMALL, frames: { max: 4 }, scale: 2 });
const smallFountainB = new Sprite({ src: IMG_FOUNTAIN_SMALL, frames: { max: 4 }, scale: 2 });
const bigFountainA = new Sprite({ src: IMG_FOUNTAIN_BIG, frames: { max: 4 }, scale: 2 });
const bigFountainB = new Sprite({ src: IMG_FOUNTAIN_BIG, frames: { max: 4 }, scale: 2 });

/** This map's own static/animated decor — drawn after the background, before the player. */
const DECORS: Sprite[] = [smallFountainA, smallFountainB, bigFountainA, bigFountainB];
const NPCS: PlayerSprite[] = [GAME_STATE.papa];
const INTERACTABLES: Interactable[] = [{ sprite: GAME_STATE.papa, label: "Talk" }];
const HUAZELEI_INTERACTABLE: Interactable = { sprite: GAME_STATE.huazelei, label: "Talk" };

const TRIGGER_HANDLERS: TriggerHandlers<TriggerName> = {
  enter_home: {
    onEnter: () => {
      GAME_STATE.sceneName = "home";
      GAME_STATE.movementLocked = true;
    },
  },
  enter_mansion: {
    onEnter: () => {
      GAME_STATE.sceneName = "mansion";
      GAME_STATE.movementLocked = true;
    },
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
  },

  update(dt) {
    DECORS.filter(isInViewport).forEach((sprite) => sprite.update(dt));
    NPCS.forEach((n) => n.update(dt));

    // if (GAME_STATE.sceneElapsed === 0) playMusic("map");

    const playerBox = movePlayer(dt);
    if (playerBox) checkTriggerZones(playerBox, GAME_STATE.triggerZones, TRIGGER_HANDLERS);

    updateInteraction(INTERACTABLES, interactions);
  },

  draw(ctx) {
    drawViewportClamped(ctx, background);
    // GAME_STATE.boundaries.forEach((b) => b.draw(ctx)); // for debugging and boundary visibility
    DECORS.filter(isInViewport).forEach((sprite) => sprite.draw(ctx));
    // GAME_STATE.player.draw(ctx);
    drawYSorted(ctx, [GAME_STATE.player, ...NPCS]);
    drawViewportClamped(ctx, foreground);
    if (GAME_STATE.facedTarget) drawInteractPrompt(ctx, GAME_STATE.facedTarget, INTERACTABLES);
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

  DIALOGUE.show({ text: "PAPA: Yes Ching?", color: "blue" });
}

function interactHuazelei() {
  if (!GAME_STATE.sequence.meet_huazelei) {
    let shineHandle: ShineHandle | null = null;

    walk(
      GAME_STATE.player,
      [
        { direction: "s", steps: 2 },
        { direction: "d", steps: 2 },
      ],
      { animated: true },
    );

    DIALOGUE.show({
      text: "F4 HUA ZE LEI: Hello CHERYL, naghahanap ka ng kiss?",
      color: "blue",
      portrait: PORTRAIT_HUAZELEI,
    });
    DIALOGUE.effect(() => {
      playExclamation(GAME_STATE.player);
      shineHandle = playShine(GAME_STATE.player);
      gsap.delayedCall(8, () => shineHandle?.stop());
    }, 0.5);
    DIALOGUE.queue(`...si "DAO MING SI" naghahanap ng kiss?`);
    DIALOGUE.effect(() => playExclamation(GAME_STATE.player), 0.5);
    DIALOGUE.queue(`Ahh, hinahanap niya ang "keys" o susi niya...`);
    DIALOGUE.queue(`Paumanhin ngunit wala naman sa akin ang mga keys niya.`);
    DIALOGUE.onComplete = () => {
      GAME_STATE.sequence.meet_huazelei = true;
    };
    return;
  }

  DIALOGUE.show({ text: `HUA ZE LEI: Hello CHE!`, color: "blue", portrait: PORTRAIT_HUAZELEI });
}

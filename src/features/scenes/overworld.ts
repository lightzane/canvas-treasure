import { COLLISION_OVERWORLD } from "@/constants/collisions/overworld";
import { TRIGGER_OVERWORLD, type TriggerName } from "@/constants/triggers/overworld";
import { GAME_STATE } from "@/features/game-state";
import { drawInteractPrompt, findFacedTarget, interact } from "@/features/interact";
import type { Scene } from "@/features/scene";
import { Sprite } from "@/features/sprite";
import {
  checkTriggerZones,
  createBoundaries,
  createTriggerZones,
  Zone,
  type TriggerHandlers,
} from "@/features/zone";
import { DIALOGUE } from "@/lib/canvas/dialogue";
import { isInViewport } from "@/lib/canvas/viewport";
import { drawViewportClamped, prepareViewportClamped } from "@/lib/canvas/viewport-clamp";
import { drawYSorted } from "@/lib/canvas/y-sort";
import { playIrisReveal } from "@/lib/effects/iris-reveal";
import { img } from "@/lib/img";
import { movePlayer } from "@/lib/map-movement";
import { placeAtTile } from "@/lib/positioning";
import { preload } from "@/lib/preload";

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
const decor: Sprite[] = [smallFountainA, smallFountainB, bigFountainA, bigFountainB];

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
    placeAtTile({ sprite: GAME_STATE.player, tile: GAME_STATE.spawnLocation ?? [58.9, 42] });
    placeAtTile({ sprite: GAME_STATE.papa, tile: [63, 39] });
    GAME_STATE.spawnLocation = undefined;
    placeAtTile({ sprite: smallFountainA, tile: [80.75, 51.5] });
    placeAtTile({ sprite: smallFountainA, tile: [80.75, 51.5] });
    placeAtTile({ sprite: smallFountainB, tile: [105.75, 51.5] });
    placeAtTile({ sprite: bigFountainA, tile: [80.25, 21.75] });
    placeAtTile({ sprite: bigFountainB, tile: [90.25, 21.75] });

    GAME_STATE.boundaries = createBoundaries(COLLISION_OVERWORLD);
    GAME_STATE.triggerZones = createTriggerZones(TRIGGER_OVERWORLD);

    GAME_STATE.boundaries.push(new Zone(GAME_STATE.papa.collisionBox));
    GAME_STATE.interactables = [{ sprite: GAME_STATE.papa, label: "Talk" }];

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
  },

  update(dt) {
    decor.filter(isInViewport).forEach((sprite) => sprite.update(dt));
    GAME_STATE.papa.update(dt);

    // if (GAME_STATE.sceneElapsed === 0) playMusic("map");

    const playerBox = movePlayer(dt);
    if (playerBox) checkTriggerZones(playerBox, GAME_STATE.triggerZones, TRIGGER_HANDLERS);

    const canAct = !DIALOGUE.isActive && !GAME_STATE.movementLocked;
    GAME_STATE.facedTarget = canAct ? findFacedTarget(GAME_STATE.player) : undefined;
    if (canAct && GAME_STATE.keys.justPressed.z) interactions(interact(GAME_STATE.player));
  },

  draw(ctx) {
    drawViewportClamped(ctx, background);
    // GAME_STATE.boundaries.forEach((b) => b.draw(ctx)); // for debugging and boundary visibility
    decor.filter(isInViewport).forEach((sprite) => sprite.draw(ctx));
    // GAME_STATE.player.draw(ctx);
    drawYSorted(ctx, [GAME_STATE.player, GAME_STATE.papa]);
    drawViewportClamped(ctx, foreground);
    if (GAME_STATE.facedTarget) drawInteractPrompt(ctx, GAME_STATE.facedTarget);
  },
};

function interactions(target: Sprite | undefined) {
  if (target === GAME_STATE.papa) {
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
}

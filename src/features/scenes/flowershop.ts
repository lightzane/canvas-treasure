import { TRIGGER_FLOWERSHOP } from "@/constants/triggers/flowershop";
import { type TriggerName } from "@/constants/triggers/mansion";
import { GAME_STATE } from "@/features/game-state";
import { drawInteractPrompt, updateInteraction, type Interactable } from "@/features/interact";
import type { Scene } from "@/features/scene";
import { Sprite } from "@/features/sprite";
import { PlayerSprite } from "@/features/sprite-player";
import {
  checkTriggerZones,
  createBoundaries,
  createTriggerZones,
  type TriggerHandlers,
} from "@/features/zone";
import { isInViewport } from "@/lib/canvas/viewport";
import { drawViewportClamped, prepareViewportClamped } from "@/lib/canvas/viewport-clamp";
import { drawYSorted } from "@/lib/canvas/y-sort";
import { hudSetBagIconVisible } from "@/lib/hud";
import { img } from "@/lib/img";
import { movePlayer } from "@/lib/map-movement";
import { placeAtTile } from "@/lib/positioning";
import { preload } from "@/lib/preload";
import gsap from "gsap";

const IMG_MAP_BG = img("maps/flowershop.png");
const IMG_MAP_FG = img("maps/flowershop-fg.png");

const background = new Sprite({ src: IMG_MAP_BG });
const foreground = new Sprite({ src: IMG_MAP_FG });

const NPCS: PlayerSprite[] = [];

// Fixed for the whole scene — nobody else ever becomes interactable here, so
// this never needs rebuilding on re-entry.
const INTERACTABLES: Interactable[] = [];

const TRIGGER_HANDLERS: TriggerHandlers<TriggerName> = {
  exit: { onEnter: exitZone },
};

export const flowershopScene: Scene = {
  fadeIn: 0.5,
  fadeOut: 0.5,
  ready: preload([background.image, foreground.image]).then(() =>
    prepareViewportClamped([background, foreground]),
  ),

  enter() {
    if (!GAME_STATE.bagIconVisible)
      gsap.delayedCall(flowershopScene.fadeIn! + 0.5, () => hudSetBagIconVisible(true));

    GAME_STATE.boundaries = createBoundaries([]);
    GAME_STATE.triggerZones = createTriggerZones(TRIGGER_FLOWERSHOP);

    const spawnLocation: [number, number] = [10, 9];

    // spriteSize pins this to the player's stable boxSize — see the same
    // comment in home.ts, or spriteSize's own doc in positioning.ts.
    placeAtTile({
      sprite: GAME_STATE.player,
      tile: spawnLocation,
      spriteSize: GAME_STATE.player.boxSize,
    });

    GAME_STATE.obstacles = [];
    GAME_STATE.player.face("w");
    GAME_STATE.movementLocked = false;
  },

  update(dt) {
    // if (GAME_STATE.sceneElapsed === 0) playMusic("map");
    NPCS.filter(isInViewport).forEach((n) => n.update(dt));

    const playerBox = movePlayer(dt);
    if (playerBox) checkTriggerZones(playerBox, GAME_STATE.triggerZones, TRIGGER_HANDLERS);

    updateInteraction(INTERACTABLES, interactions);
  },

  draw(ctx) {
    drawViewportClamped(ctx, background);

    // GAME_STATE.boundaries.forEach((b) => b.draw(ctx)); // for debugging and boundary visibility

    drawYSorted(ctx, [GAME_STATE.player, ...NPCS.filter(isInViewport)]);
    drawViewportClamped(ctx, foreground);

    if (GAME_STATE.facedTarget) drawInteractPrompt(ctx, GAME_STATE.facedTarget, INTERACTABLES);
  },
};

function exitZone() {
  hudSetBagIconVisible(false);
  GAME_STATE.movementLocked = true; // for the scene transition — released by overworld's own enter()
  GAME_STATE.spawnLocation = [37.65, 42]; // rough placeholder, just south of enter_mansion's own tile — adjust to taste
  GAME_STATE.sceneName = "overworld";
}

function interactions(target: Sprite | undefined) {}

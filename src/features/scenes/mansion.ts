import { TRIGGER_MANSION } from "@/constants/triggers/mansion";
import { GAME_STATE, img } from "@/features/game-state";
import { drawInteractPrompt, findFacedTarget } from "@/features/interact";
import type { Scene } from "@/features/scene";
import { Sprite } from "@/features/sprite";
import { checkTriggerZones, TriggerZone, type TriggerHandlers } from "@/features/zone";
import { DIALOGUE } from "@/lib/canvas/dialogue";
import { drawYSorted } from "@/lib/canvas/y-sort";
import { movePlayer } from "@/lib/map-movement";
import { placeAtTile } from "@/lib/positioning";
import { preload } from "@/lib/preload";

const IMG_MAP_BG = img("maps/mansion.png");
// const IMG_MAP_FG = img("maps/home-fg.png");

const background = new Sprite({ src: IMG_MAP_BG });
// const foreground = new Sprite({ src: IMG_MAP_FG });

const TRIGGER_HANDLERS: TriggerHandlers = {
  exit: { onEnter: exitZone },
};

export const mansionScene: Scene = {
  fadeIn: 0.5,
  fadeOut: 0.5,
  ready: preload([background.image]),

  enter() {
    GAME_STATE.boundaries = [];
    // GAME_STATE.boundaries = COLLISION_HOME.map(
    //   (c) =>
    //     new Zone({
    //       position: {
    //         x: c.x,
    //         y: c.y,
    //       },
    //       width: c.width,
    //       height: c.height,
    //     }),
    // );

    GAME_STATE.triggerZones = TRIGGER_MANSION.map(
      (t) =>
        new TriggerZone({
          name: t.name,
          position: {
            x: t.x,
            y: t.y,
          },
          width: t.width,
          height: t.height,
        }),
    );

    const spawnLocation: [number, number] = [11, 20];

    placeAtTile({ sprite: GAME_STATE.player, tile: spawnLocation });

    GAME_STATE.player.face("w");
    GAME_STATE.movementLocked = false;
  },

  update(dt) {
    // if (GAME_STATE.sceneElapsed === 0) playMusic("map");

    const playerBox = movePlayer(dt);
    if (playerBox) checkTriggerZones(playerBox, GAME_STATE.triggerZones, TRIGGER_HANDLERS);

    // Shared gate for anything triggered by facing + pressing Z — combine
    // with a target-specific condition per interactable (progress flags,
    // item ownership, ...), same as mama's check below.
    const canAct = !DIALOGUE.isActive && !GAME_STATE.movementLocked;
    GAME_STATE.facedTarget = canAct ? findFacedTarget(GAME_STATE.player) : undefined;

    if (canAct && GAME_STATE.keys.justPressed.z) {
      //   interactions(interact(GAME_STATE.player));
    }
  },

  draw(ctx) {
    background.draw(ctx);

    // GAME_STATE.boundaries.forEach((b) => b.draw(ctx)); // for debugging and boundary visibility

    drawYSorted(ctx, [GAME_STATE.player]);
    // foreground.draw(ctx);

    if (GAME_STATE.facedTarget) drawInteractPrompt(ctx, GAME_STATE.facedTarget);
  },
};

function exitZone() {
  GAME_STATE.movementLocked = true; // for the scene transition — released by overworld's own enter()
  GAME_STATE.spawnLocation = [86.4, 16.5]; // rough placeholder, just south of enter_mansion's own tile — adjust to taste
  GAME_STATE.sceneName = "overworld";
}

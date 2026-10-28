import { COLLISION_HOME } from "@/constants/collisions/home";
import { TRIGGER_HOME } from "@/constants/triggers/home";
import { GAME_STATE, img } from "@/features/game-state";
import type { Scene } from "@/features/scene";
import { Sprite } from "@/features/sprite";
import { checkTriggerZones, TriggerZone, Zone, type TriggerHandlers } from "@/features/zone";
import { drawYSorted } from "@/lib/canvas/y-sort";
import { playAttentionBounce } from "@/lib/effects/attention-bounce";
import { playExclamation } from "@/lib/effects/exclamation-bubble";
import { movePlayer } from "@/lib/map-movement";
import { placeAtTile } from "@/lib/positioning";
import { preload } from "@/lib/preload";

const IMG_MAP_BG = img("maps/home.png");
const IMG_MAP_FG = img("maps/home-fg.png");
const IMG_PARCEL = img("others/parcel.png");

const background = new Sprite({ src: IMG_MAP_BG });
const foreground = new Sprite({ src: IMG_MAP_FG });
const parcel = new Sprite({ src: IMG_PARCEL, scale: 2 });

const TRIGGER_HANDLERS: TriggerHandlers = {
  exit: {
    onEnter: () => {
      playAttentionBounce(GAME_STATE.mama); // just to see it in action for now — not blocking the exit
      playExclamation(GAME_STATE.mama);
      //   GAME_STATE.sceneName = "overworld";
      GAME_STATE.movementLocked = true;
    },
  },
};

export const homeScene: Scene = {
  fadeIn: 1,
  fadeOut: 1,
  ready: preload([background.image, foreground.image, parcel.image]),

  enter() {
    GAME_STATE.boundaries = COLLISION_HOME.map(
      (c) =>
        new Zone({
          position: {
            x: c.x,
            y: c.y,
          },
          width: c.width,
          height: c.height,
        }),
    );

    GAME_STATE.triggerZones = TRIGGER_HOME.map(
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

    let spawnLocation: [number, number] = [13, 19];

    if (GAME_STATE.sequence.intro) {
      spawnLocation = [3, 14];
      homeScene.fadeIn = 0.5;
      GAME_STATE.mama.face("w");
    } else {
      GAME_STATE.player.face("a");
    }

    placeAtTile({ sprite: GAME_STATE.player, tile: spawnLocation });
    // placeAtTile({ sprite: GAME_STATE.mama, tile: [3.5, 3] });
    placeAtTile({ sprite: GAME_STATE.mama, tile: [10, 18.5] });
    placeAtTile({ sprite: parcel, tile: [8, 4] });
    GAME_STATE.boundaries.push(new Zone(GAME_STATE.mama.collisionBox)); // blocks walking through mama — must run after she's placed, so the box matches her actual spawn position
    GAME_STATE.movementLocked = false;
  },

  update(dt) {
    // if (GAME_STATE.sceneElapsed === 0) playMusic("map");
    // parcel.update(dt);
    GAME_STATE.mama.update(dt);

    const playerBox = movePlayer(dt);
    if (playerBox) checkTriggerZones(playerBox, GAME_STATE.triggerZones, TRIGGER_HANDLERS);
  },

  draw(ctx) {
    background.draw(ctx);
    parcel.draw(ctx);

    // GAME_STATE.boundaries.forEach((b) => b.draw(ctx)); // for debugging and boundary visibility

    drawYSorted(ctx, [GAME_STATE.mama, GAME_STATE.player]);
    foreground.draw(ctx);
  },
};

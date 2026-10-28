import { COLLISION_HOME } from "@/constants/collisions/home";
import { TRIGGER_HOME } from "@/constants/triggers/home";
import { GAME_STATE, img } from "@/features/game-state";
import type { Scene } from "@/features/scene";
import { Sprite } from "@/features/sprite";
import { checkTriggerZones, TriggerZone, Zone, type TriggerHandlers } from "@/features/zone";
import { movePlayer } from "@/lib/map-movement";
import { placeAtTile } from "@/lib/positioning";
import { preload } from "@/lib/preload";

const IMG_MAP_BG = img("maps/home.png");
const IMG_MAP_FG = img("maps/home-fg.png");

const background = new Sprite({ src: IMG_MAP_BG });
const foreground = new Sprite({ src: IMG_MAP_FG });

const TRIGGER_HANDLERS: TriggerHandlers = {
  exit: { onEnter: () => (GAME_STATE.sceneName = "overworld") },
};

export const homeScene: Scene = {
  fadeIn: 1,
  fadeOut: 1,
  ready: preload([background.image, foreground.image]),

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
    placeAtTile({ sprite: GAME_STATE.player, tile: [3, 14] });
  },

  update(dt) {
    // if (GAME_STATE.sceneElapsed === 0) playMusic("map");

    const playerBox = movePlayer(dt);
    if (playerBox) checkTriggerZones(playerBox, GAME_STATE.triggerZones, TRIGGER_HANDLERS);
  },

  draw(ctx) {
    background.draw(ctx);

    // GAME_STATE.boundaries.forEach((b) => b.draw(ctx)); // for debugging and boundary visibility

    GAME_STATE.player.draw(ctx);
    foreground.draw(ctx);
  },
};

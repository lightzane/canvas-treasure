import { COLLISION_MANSION } from "@/constants/collisions/mansion";
import { TRIGGER_MANSION, type TriggerName } from "@/constants/triggers/mansion";
import { GAME_STATE } from "@/features/game-state";
import { drawInteractPrompt, findFacedTarget, interact } from "@/features/interact";
import type { Scene } from "@/features/scene";
import { Sprite } from "@/features/sprite";
import { PlayerSprite } from "@/features/sprite-player";
import {
  checkTriggerZones,
  createBoundaries,
  createTriggerZones,
  Zone,
  type TriggerHandlers,
} from "@/features/zone";
import { DIALOGUE } from "@/lib/canvas/dialogue";
import { drawViewportClamped, prepareViewportClamped } from "@/lib/canvas/viewport-clamp";
import { drawYSorted } from "@/lib/canvas/y-sort";
import { playAttentionBounce } from "@/lib/effects/attention-bounce";
import { playExclamation } from "@/lib/effects/exclamation-bubble";
import { img } from "@/lib/img";
import { movePlayer } from "@/lib/map-movement";
import { placeAtTile } from "@/lib/positioning";
import { preload } from "@/lib/preload";
import { IMGS_BUTLER_IDLE } from "@/sprites/butler";
import { IMGS_HH_STAFF_FEMALE_1_IDLE } from "@/sprites/hh-staff-female-1";
import { IMGS_HH_STAFF_MALE_1_IDLE } from "@/sprites/hh-staff-male-1";
import gsap from "gsap";

const BUTLER = new PlayerSprite({ sprites: { idle: IMGS_BUTLER_IDLE } });
const STAFF_M1 = new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_MALE_1_IDLE } });
const STAFF_M2 = new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_MALE_1_IDLE } });
const STAFF_M3 = new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_MALE_1_IDLE } });
const STAFF_M4 = new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_MALE_1_IDLE } });
const STAFF_F1 = new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_FEMALE_1_IDLE } });
const STAFF_F2 = new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_FEMALE_1_IDLE } });
const STAFF_F3 = new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_FEMALE_1_IDLE } });
const STAFF_F4 = new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_FEMALE_1_IDLE } });

const COL_A = [STAFF_M1, STAFF_M2, STAFF_F1, STAFF_F2];
const COL_B = [STAFF_M3, STAFF_M4, STAFF_F3, STAFF_F4];
const NPCS: PlayerSprite[] = [GAME_STATE.daomingsi, BUTLER, ...COL_A, ...COL_B];

const IMG_MAP_BG = img("maps/mansion.png");
// const IMG_MAP_FG = img("maps/home-fg.png");

const background = new Sprite({ src: IMG_MAP_BG });
// const foreground = new Sprite({ src: IMG_MAP_FG });

const TRIGGER_HANDLERS: TriggerHandlers<TriggerName> = {
  exit: { onEnter: exitZone },
  meet_daomingsi: {
    onEnter: nearMissConversation,
  },
};

export const mansionScene: Scene = {
  fadeIn: 0.5,
  fadeOut: 0.5,
  ready: preload([
    background.image,
    ...NPCS.flatMap((npc) => npc.images),
    ...GAME_STATE.daomingsi.images,
  ]).then(() => prepareViewportClamped([background])),

  enter() {
    GAME_STATE.boundaries = createBoundaries(COLLISION_MANSION);
    GAME_STATE.triggerZones = createTriggerZones(TRIGGER_MANSION);
    GAME_STATE.interactables = [{ sprite: BUTLER, label: "Talk" }];

    const spawnLocation: [number, number] = [11.5, 20];

    placeAtTile({ sprite: GAME_STATE.player, tile: spawnLocation });
    placeAtTile({ sprite: BUTLER, tile: [11, 6] });
    placeAtTile({ sprite: GAME_STATE.daomingsi, tile: [11.5, 4] });

    let col = 21;
    for (const npc of COL_A) {
      placeAtTile({ sprite: npc, tile: [10, col] });
      col--;
    }

    col = 21;
    for (const npc of COL_B) {
      placeAtTile({ sprite: npc, tile: [13, col] });
      col--;
    }

    for (const npc of NPCS) {
      GAME_STATE.boundaries.push(new Zone(npc.collisionBox));
    }

    BUTLER.face("w");
    COL_A.forEach((npc) => npc.face("d"));
    COL_B.forEach((npc) => npc.face("a"));

    GAME_STATE.player.face("w");
    GAME_STATE.movementLocked = false;
  },

  update(dt) {
    // if (GAME_STATE.sceneElapsed === 0) playMusic("map");
    NPCS.forEach((n) => n.update(dt));

    const playerBox = movePlayer(dt);
    if (playerBox) checkTriggerZones(playerBox, GAME_STATE.triggerZones, TRIGGER_HANDLERS);

    const canAct = !DIALOGUE.isActive && !GAME_STATE.movementLocked;
    GAME_STATE.facedTarget = canAct ? findFacedTarget(GAME_STATE.player) : undefined;
    if (canAct && GAME_STATE.keys.justPressed.z) interactions(interact(GAME_STATE.player));
  },

  draw(ctx) {
    drawViewportClamped(ctx, background);

    // GAME_STATE.boundaries.forEach((b) => b.draw(ctx)); // for debugging and boundary visibility

    drawYSorted(ctx, [GAME_STATE.player, ...NPCS]);
    // foreground.draw(ctx);

    if (GAME_STATE.facedTarget) drawInteractPrompt(ctx, GAME_STATE.facedTarget);
  },
};

function exitZone() {
  GAME_STATE.movementLocked = true; // for the scene transition — released by overworld's own enter()
  GAME_STATE.spawnLocation = [86.4, 16.5]; // rough placeholder, just south of enter_mansion's own tile — adjust to taste
  GAME_STATE.sceneName = "overworld";
}

function interactions(target: Sprite | undefined) {
  if (target === BUTLER) {
    DIALOGUE.show({ text: "BUTLER LIU: Hello!" });
  }
}

function nearMissConversation() {
  if (GAME_STATE.sequence.meet_daomingsi) return;
  GAME_STATE.sequence.meet_daomingsi = true;

  DIALOGUE.show({ text: `BUTLER LIU: Young Master, saan po natin ilalagay ang ke—k!` });
  DIALOGUE.effect(() => {
    playAttentionBounce(GAME_STATE.daomingsi, { hops: 5, duration: 0.1 });
    playExclamation(GAME_STATE.daomingsi);
    gsap.delayedCall(0.5, () => {
      BUTLER.face("s");
      playAttentionBounce(BUTLER);
      playExclamation(BUTLER);
    });
  }, 0.5);
  DIALOGUE.queue({ text: `[F4] DAO MING SI: Saan ilalagay ang "keys"?`, color: "blue" });
  DIALOGUE.effect(() => BUTLER.face("w"));
  DIALOGUE.queue(`LIU! Ihanda mo ang almusal ko nagugutom na ako!`);
  DIALOGUE.queue(`Hahanapin ko lang ang keys ko...`);
}

import { COLLISION_MANSION } from "@/constants/collisions/mansion";
import { TRIGGER_MANSION, type TriggerName } from "@/constants/triggers/mansion";
import { GAME_STATE } from "@/features/game-state";
import { drawInteractPrompt, updateInteraction } from "@/features/interact";
import type { Scene } from "@/features/scene";
import { Sprite } from "@/features/sprite";
import { PlayerSprite } from "@/features/sprite-player";
import {
  checkTriggerZones,
  createBoundaries,
  createTriggerZones,
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
import { walkToTile, type WalkHandle } from "@/lib/walk-to-tile";
import { IMGS_BUTLER_IDLE } from "@/sprites/butler";
import { IMGS_HH_STAFF_FEMALE_1_IDLE } from "@/sprites/hh-staff-female-1";
import { IMGS_HH_STAFF_MALE_1_IDLE } from "@/sprites/hh-staff-male-1";
import gsap from "gsap";

let daoMingSiWalk: WalkHandle | null = null;

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

    // Once he's left (see removeNpc in nearMissConversation), he's out of NPCS for
    // good — skip re-placing/re-adding him on a later re-entry to this scene.
    if (!GAME_STATE.sequence.meet_daomingsi) {
      placeAtTile({ sprite: BUTLER, tile: [11, 6] });
      placeAtTile({ sprite: GAME_STATE.daomingsi, tile: [11.5, 4] });
      BUTLER.face("w");
    } else {
      placeAtTile({ sprite: BUTLER, tile: [11, 17] });
      BUTLER.face("s");
    }

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

    GAME_STATE.obstacles = NPCS; // blocks walking through any of them, tracking wherever each currently is

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

    updateInteraction(interactions);
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

/** Drops `npc` from this scene's cast — out of `NPCS`, so it stops drawing and updating, and out of `GAME_STATE.obstacles` for free, since that's assigned the same array (not a copy). Use when an NPC has scripted-walked off and shouldn't still be standing there (or blocking the player) once the camera catches up. */
function removeNpc(npc: PlayerSprite) {
  const i = NPCS.indexOf(npc);
  if (i !== -1) NPCS.splice(i, 1);
}

function interactions(target: Sprite | undefined) {
  if (target === BUTLER) {
    DIALOGUE.show({ text: "BUTLER LIU: Binibining CHE! Wala po dito si Young Master..." });
  }
}

function nearMissConversation() {
  if (GAME_STATE.sequence.meet_daomingsi) return; // already met him (and he's gone) — don't replay this

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
  DIALOGUE.queue({ text: `F4 DAO MING SI: Saan ilalagay ang "keys"?`, color: "red" });
  DIALOGUE.effect(() => BUTLER.face("w"));
  DIALOGUE.effect(() => playAttentionBounce(GAME_STATE.daomingsi, { hops: 2 }));
  DIALOGUE.queue(`Liu— ihanda mo ang almusal ko nagugutom na ako!`);
  DIALOGUE.queue(`Hahanapin ko lang ang keys ko...`);
  DIALOGUE.effect(() => {
    daoMingSiWalk = walkToTile(GAME_STATE.daomingsi, [[23, 4]], { animated: true });
  }, 1);
  DIALOGUE.effect(() => {
    BUTLER.face("d");
    gsap.delayedCall(0.5, () => daoMingSiWalk?.stop());
  });
  DIALOGUE.queue({
    text: `BUTLER LIU: Pero ang alam ko ay hindi naman po nawawala ang keys niyo...`,
    color: "black",
  });
  DIALOGUE.effect(() => playExclamation(GAME_STATE.daomingsi), 0.5);
  DIALOGUE.effect(() => {
    GAME_STATE.daomingsi.face("a");
    gsap.delayedCall(0.5, () => playAttentionBounce(GAME_STATE.daomingsi, { hops: 6 }));
    gsap.delayedCall(0.8, () => {
      playAttentionBounce(BUTLER);
      playExclamation(BUTLER);
    });
  }, 0.5);
  DIALOGUE.queue({ text: `DAO MING SI: Hinihingi ko ba ang opinyon mo HA?`, color: "red" });
  DIALOGUE.effect(() => gsap.delayedCall(0.5, () => GAME_STATE.daomingsi.face("s")));
  DIALOGUE.queue(`
    Basta alam ko yung keys ko naiwan ko lang yun kay LEI, 
    o kay XI MEN man o MEI ZUO. Bahala ka na jan mauna na ako umalis...!`);
  DIALOGUE.effect(() => {
    walkToTile(GAME_STATE.daomingsi, [[25, 4]], { animated: true });
    gsap.delayedCall(0.5, () => BUTLER.face("s"));
  }, 1);
  DIALOGUE.effect(() => playExclamation(BUTLER), 0.5);
  DIALOGUE.queue({
    text: `
      BUTLER LIU: Mawalang galang na po binibining CHE, 
      pero nahihiya lang po si Young Master manghingi ng tulong.
      Kung maaari po tulungan po ninyo siya mahanap ang keys niya.
    `,
    color: "black",
  });
  DIALOGUE.onComplete = () => {
    GAME_STATE.sequence.meet_daomingsi = true;
    removeNpc(GAME_STATE.daomingsi); // he's left — also drops him from GAME_STATE.obstacles, same array reference
  };
}

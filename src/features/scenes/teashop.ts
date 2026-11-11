import { COLLISION_TEASHOP } from "@/constants/collisions/teashop";
import { TRIGGER_TEASHOP, type TriggerName } from "@/constants/triggers/teashop";
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
import { addOnce } from "@/lib/array";
import { audioPlayMusic, audioStopMusic } from "@/lib/audio";
import { drawSpriteClipped } from "@/lib/canvas/sprite-clip";
import { isInViewport } from "@/lib/canvas/viewport";
import { drawViewportClamped, prepareViewportClamped } from "@/lib/canvas/viewport-clamp";
import { drawYSorted } from "@/lib/canvas/y-sort";
import { createCompanion } from "@/lib/companion";
import { hudSetBagIconVisible } from "@/lib/hud";
import { img } from "@/lib/img";
import { movePlayer } from "@/lib/map-movement";
import { createNpcSpawner } from "@/lib/npc-spawn";
import { createTalkDispatch } from "@/lib/npc-talk";
import { placeAtTile } from "@/lib/positioning";
import { preload } from "@/lib/preload";
import { isQuestResolved } from "@/lib/quests";
import { IMGS_ADULT_MALE_1_IDLE } from "@/sprites/adult-male-1";
import { IMGS_BEACH_OUTFIT_FEMALE_2_IDLE } from "@/sprites/beach-outfit-female-2";
import { IMGS_BEACH_OUTFIT_MALE_1_IDLE } from "@/sprites/beach-outfit-male-1";
import { IMGS_ELDER_MAN_IDLE } from "@/sprites/elder-man";
import { IMGS_FLORIST_FEMALE_IDLE } from "@/sprites/florist-female";
import { IMGS_IROH_EARTH_IDLE } from "@/sprites/iroh-earth";
import { IMGS_SCHOOL_BOY_IDLE } from "@/sprites/school-boy";
import { IMGS_SCHOOL_GIRL_IDLE } from "@/sprites/school-girl";
import { IMGS_TEENAGE_BOY_IDLE } from "@/sprites/teenage-boy";
import { IMGS_TEENAGE_GIRL_IDLE } from "@/sprites/teenage-girl";
import { IMGS_ZUKO_IDLE } from "@/sprites/zuko";
import gsap from "gsap";

const IMG_MAP_BG = img("maps/teashop.png");
const IMG_MAP_FG = img("maps/teashop-fg.png");

const background = new Sprite({ src: IMG_MAP_BG });
const foreground = new Sprite({ src: IMG_MAP_FG });

const npcExampleMale = new PlayerSprite({ sprites: { idle: IMGS_ADULT_MALE_1_IDLE }, scale: 1.05 });
const npcExampleFemale = new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_FEMALE_2_IDLE } });
const npcIroh = new PlayerSprite({ sprites: { idle: IMGS_IROH_EARTH_IDLE }, scale: 1.1 });
const npcZuko = new PlayerSprite({ sprites: { idle: IMGS_ZUKO_IDLE } });
const npcCustomerM1 = new PlayerSprite({ sprites: { idle: IMGS_ELDER_MAN_IDLE } });
const npcCustomerF1 = new PlayerSprite({ sprites: { idle: IMGS_FLORIST_FEMALE_IDLE } });
const npcCustomerM2 = new PlayerSprite({ sprites: { idle: IMGS_TEENAGE_BOY_IDLE }, scale: 1.05 });
const npcCustomerF2 = new PlayerSprite({ sprites: { idle: IMGS_SCHOOL_GIRL_IDLE } });
const npcCustomerM3 = new PlayerSprite({ sprites: { idle: IMGS_BEACH_OUTFIT_MALE_1_IDLE } });
const npcCustomerF3 = new PlayerSprite({ sprites: { idle: IMGS_TEENAGE_GIRL_IDLE } });
const npcCustomerM4 = new PlayerSprite({ sprites: { idle: IMGS_SCHOOL_BOY_IDLE } });

const NPCS: PlayerSprite[] = [];
const NPCS_DINING: PlayerSprite[] = []; // drawn on top foreground chairs

// Seated at the table already — shouldn't snap to face the player on
// interact like a standing NPC would.
const INTERACTABLES_DINING: Interactable[] = [
  npcCustomerM1,
  npcCustomerF1,
  npcCustomerM2,
  npcCustomerF2,
  npcCustomerM3,
].map((sprite) => ({ sprite, facePlayer: false, probeDistance: 96 }));
const INTERACTABLES: Interactable[] = [
  npcExampleMale,
  npcExampleFemale,
  npcCustomerF3,
  npcCustomerM4,
  ...INTERACTABLES_DINING,
];

const { respawnNPC } = createNpcSpawner(NPCS, INTERACTABLES);
const { respawnNPC: respawnNPCFG } = createNpcSpawner(NPCS_DINING, INTERACTABLES_DINING);

const jpCompanion = createCompanion(GAME_STATE.jp, { followDistance: 1 });

respawnNPC(npcExampleMale, [11, 5]);
respawnNPC(npcExampleFemale, [12, 5]);
npcExampleMale.face("w");
npcExampleFemale.face("w");
respawnNPC(npcIroh, [11, 3]);
respawnNPC(npcZuko, [12, 3]);
respawnNPCFG(npcCustomerM1, [2.5, 7.1]);
respawnNPCFG(npcCustomerF1, [6.5, 9.15]);
respawnNPCFG(npcCustomerM2, [10.5, 6.1]);
respawnNPCFG(npcCustomerF2, [14.5, 7.15]);
respawnNPCFG(npcCustomerM3, [14.5, 10.2]);
respawnNPC(npcCustomerF3, [11.5, 12.7]);
respawnNPC(npcCustomerM4, [12.5, 12.7]);
npcCustomerM4.face("a");
npcCustomerF3.face("d");

const TRIGGER_HANDLERS: TriggerHandlers<TriggerName> = {
  exit: { onEnter: exitZone },
};

export const teashopScene: Scene = {
  fadeIn: 0.5,
  fadeOut: 0.5,
  ready: preload([background.image, foreground.image]).then(() =>
    prepareViewportClamped([background, foreground]),
  ),

  enter() {
    audioPlayMusic("jazz", { seek: 0, fade: 1, volume: 0.2 });

    if (!GAME_STATE.bagIconVisible)
      gsap.delayedCall(teashopScene.fadeIn! + 0.5, () => hudSetBagIconVisible(true));

    GAME_STATE.boundaries = createBoundaries(COLLISION_TEASHOP);
    GAME_STATE.triggerZones = createTriggerZones(TRIGGER_TEASHOP);

    const spawnLocation: [number, number] = [8.5, 14];

    // spriteSize pins this to the player's stable boxSize — see the same
    // comment in home.ts, or spriteSize's own doc in positioning.ts.
    placeAtTile({
      sprite: GAME_STATE.player,
      tile: spawnLocation,
      spriteSize: GAME_STATE.player.boxSize,
    });

    // New companion
    if (isQuestResolved("invitation_postcard")) {
      addOnce(INTERACTABLES, GAME_STATE.jp);
      respawnNPC(GAME_STATE.jp, [spawnLocation[0] - 1, spawnLocation[1]]);
      GAME_STATE.jp.face("w");
    }

    GAME_STATE.obstacles = [...NPCS];
    GAME_STATE.player.face("w");
    GAME_STATE.movementLocked = false;
  },

  update(dt) {
    NPCS.filter(isInViewport).forEach((n) => n.update(dt));
    // NPCS_DINING.filter(isInViewport).forEach((n) => n.update(dt)); // no need to change direction `.face(...)`

    const playerBox = movePlayer(dt);
    checkTriggerZones(playerBox, GAME_STATE.triggerZones, TRIGGER_HANDLERS);

    jpCompanion.follow(dt, isQuestResolved("invitation_postcard"));

    updateInteraction(INTERACTABLES, interactions);
  },

  draw(ctx) {
    drawViewportClamped(ctx, background);

    drawYSorted(ctx, [GAME_STATE.player, ...NPCS.filter(isInViewport)]);
    drawViewportClamped(ctx, foreground);
    NPCS_DINING.filter(isInViewport).forEach((npc) => drawSpriteClipped(ctx, npc, { height: 64 }));

    if (GAME_STATE.facedTarget) drawInteractPrompt(ctx, GAME_STATE.facedTarget, INTERACTABLES);
  },
};

function exitZone() {
  hudSetBagIconVisible(false);
  audioStopMusic(teashopScene.fadeOut);
  GAME_STATE.movementLocked = true;
  GAME_STATE.spawnLocation = [125.5, 60.5];
  GAME_STATE.sceneName = "overworld";
}

function interactions(target: Sprite | undefined) {
  const { talkCommonM, talkCommonF } = createTalkDispatch(target);
  talkCommonM(npcExampleMale, "w", "CUSTOMER: Kahanga-hanga ang wisdom ni UNCLE IROH!");
  talkCommonF(npcExampleFemale, "w", "CUSTOMER: Ang gwapo ni ZUKO oh my khaaaaaaad!");
  talkCommonM(
    npcCustomerM1,
    "TEA LOVER: Ahhh JAZZMINE TEA! Yes, pinagsamang JAZZ at JASMINE MILK TEA.",
  );
  talkCommonF(
    npcCustomerF1,
    `FLORIST: Pahinga muna ako mag gupit ng flowers.
    Iinumin ko muna sila. Get's mo? Kasi jasmine flower!
    Hahahaha, ganda business mag tayo ng flowershop tapos
    meron jasmine tea!`,
  );
  talkCommonM(
    npcCustomerM2,
    `IROH FAN: Tagal nila mag-usap, ako sunod na kakausap kay IROH at ZUKO!`,
  );
  talkCommonF(npcCustomerF2, `STUDENT: Di ako nainom coffee and alcohol. But I love Jasmine Tea!`);
  talkCommonF(npcCustomerF3, "d", `DAO MING FAN: Mas gwapo si DAO MING SI kaysa kay HUA ZE LEI!`);
  talkCommonM(npcCustomerM4, "a", `ZAI ZAI FAN: Mas gwapo si HUA ZE LEI kaysa kay DAO MING SI!`);
  talkCommonM(npcCustomerM3, `ZUKO FAN: Sa wakas si ZUKO rin ang nakapag serve ng hot tea ko!`);
}

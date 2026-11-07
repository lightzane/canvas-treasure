import { COLLISION_MANSION } from "@/constants/collisions/mansion";
import { TRIGGER_MANSION, type TriggerName } from "@/constants/triggers/mansion";
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
import { remove } from "@/lib/array";
import { audioPlayMusic, audioStopMusic } from "@/lib/audio";
import { DIALOGUE } from "@/lib/canvas/dialogue";
import { isInViewport } from "@/lib/canvas/viewport";
import { drawViewportClamped, prepareViewportClamped } from "@/lib/canvas/viewport-clamp";
import { drawYSorted } from "@/lib/canvas/y-sort";
import { playAttentionBounce } from "@/lib/effects/attention-bounce";
import { playExclamation } from "@/lib/effects/exclamation-bubble";
import { playQuestCompleteBanner, playQuestToast } from "@/lib/effects/quest-toast";
import { hudSetBagIconVisible } from "@/lib/hud";
import { img } from "@/lib/img";
import { movePlayer } from "@/lib/map-movement";
import { placeAtTile } from "@/lib/positioning";
import { preload } from "@/lib/preload";
import { questSetStatus, type QuestEntry, type QuestId } from "@/lib/quests";
import { walk, type WalkHandle } from "@/lib/walk";
import { IMGS_BUTLER_IDLE, PORTRAIT_BUTLER } from "@/sprites/butler";
import {
  DIALOGUE_COLOR_DAOMINGSI,
  PORTRAIT_DAOMINGSI,
  PORTRAIT_DAOMINGSI_INTIMIDATE,
} from "@/sprites/dao-ming-si";
import { IMGS_HH_STAFF_FEMALE_1_IDLE } from "@/sprites/hh-staff-female-1";
import { IMGS_HH_STAFF_MALE_1_IDLE } from "@/sprites/hh-staff-male-1";
import gsap from "gsap";

let daoMingSiWalk: WalkHandle | null = null;
const staffCfg = {
  boxSize: { width: 64 },
  shadowOffset: { y: -5 },
};

const BUTLER = new PlayerSprite({ sprites: { idle: IMGS_BUTLER_IDLE }, ...staffCfg });
const STAFF_M1 = new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_MALE_1_IDLE }, ...staffCfg });
const STAFF_M2 = new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_MALE_1_IDLE }, ...staffCfg });
const STAFF_M3 = new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_MALE_1_IDLE }, ...staffCfg });
const STAFF_M4 = new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_MALE_1_IDLE }, ...staffCfg });
const STAFF_F1 = new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_FEMALE_1_IDLE }, ...staffCfg });
const STAFF_F2 = new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_FEMALE_1_IDLE }, ...staffCfg });
const STAFF_F3 = new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_FEMALE_1_IDLE }, ...staffCfg });
const STAFF_F4 = new PlayerSprite({ sprites: { idle: IMGS_HH_STAFF_FEMALE_1_IDLE }, ...staffCfg });

const COL_A = [STAFF_M1, STAFF_M2, STAFF_F1, STAFF_F2];
const COL_B = [STAFF_M3, STAFF_M4, STAFF_F3, STAFF_F4];
const NPCS: PlayerSprite[] = [GAME_STATE.daomingsi, BUTLER, ...COL_A, ...COL_B];

let col = 21;
for (const npc of COL_A) {
  placeAtTile({ sprite: npc, tile: [10.25, col] });
  col--;
}

col = 21;
for (const npc of COL_B) {
  placeAtTile({ sprite: npc, tile: [13.25, col] });
  col--;
}

COL_A.forEach((npc) => npc.face("d"));
COL_B.forEach((npc) => npc.face("a"));

// Fixed for the whole scene — nobody else ever becomes interactable here, so
// this never needs rebuilding on re-entry.
const INTERACTABLES: Interactable[] = [{ sprite: BUTLER, label: "Talk" }];

const IMG_MAP_BG = img("maps/mansion.png");
// const IMG_MAP_FG = img("maps/home-fg.png");

const background = new Sprite({ src: IMG_MAP_BG });
// const foreground = new Sprite({ src: IMG_MAP_FG });

const questDaomingKeys = GAME_STATE.quests.get("daoming_keys")!;

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
    gsap.delayedCall(mansionScene.fadeIn! + 0.5, () =>
      audioPlayMusic("mansion", { seek: 63, fade: 2, volume: 0.7 }),
    );

    if (!GAME_STATE.bagIconVisible)
      gsap.delayedCall(mansionScene.fadeIn! + 0.5, () => hudSetBagIconVisible(true));

    GAME_STATE.boundaries = createBoundaries(COLLISION_MANSION);
    GAME_STATE.triggerZones = createTriggerZones(TRIGGER_MANSION);

    const spawnLocation: [number, number] = [11.5, 20];

    // spriteSize pins this to the player's stable boxSize — see the same
    // comment in home.ts, or spriteSize's own doc in positioning.ts.
    placeAtTile({
      sprite: GAME_STATE.player,
      tile: spawnLocation,
      spriteSize: GAME_STATE.player.boxSize,
    });

    // Once he's left (see `remove()` in nearMissConversation), he's out of
    // NPCS for good — skip re-placing/re-adding him on a later re-entry.
    if (!GAME_STATE.sequence.meet_daomingsi) {
      placeAtTile({ sprite: BUTLER, tile: [11.25, 6] });
      placeAtTile({ sprite: GAME_STATE.daomingsi, tile: [11.5, 4] });
      BUTLER.face("w");
    } else {
      placeAtTile({ sprite: BUTLER, tile: [11.25, 17] });
      BUTLER.face("s");
    }

    GAME_STATE.obstacles = [...NPCS]; // blocks walking through any of them, tracking wherever each currently is

    GAME_STATE.player.face("w");
    GAME_STATE.movementLocked = false;
  },

  update(dt) {
    // if (GAME_STATE.sceneElapsed === 0) audioPlayMusic("map");
    NPCS.filter(isInViewport).forEach((n) => n.update(dt));

    const playerBox = movePlayer(dt);
    if (playerBox) checkTriggerZones(playerBox, GAME_STATE.triggerZones, TRIGGER_HANDLERS);

    updateInteraction(INTERACTABLES, interactions);
  },

  draw(ctx) {
    drawViewportClamped(ctx, background);

    // GAME_STATE.boundaries.forEach((b) => b.draw(ctx)); // for debugging and boundary visibility

    drawYSorted(ctx, [GAME_STATE.player, ...NPCS.filter(isInViewport)]);
    // foreground.draw(ctx);

    if (GAME_STATE.facedTarget) drawInteractPrompt(ctx, GAME_STATE.facedTarget, INTERACTABLES);
  },
};

function exitZone() {
  audioStopMusic(mansionScene.fadeOut);
  hudSetBagIconVisible(false);
  GAME_STATE.movementLocked = true; // for the scene transition — released by overworld's own enter()
  GAME_STATE.spawnLocation = [86.5, 16.5]; // rough placeholder, just south of enter_mansion's own tile — adjust to taste
  GAME_STATE.sceneName = "overworld";
}

function interactions(target: Sprite | undefined) {
  if (target === BUTLER) {
    if (GAME_STATE.sequence.market_cutscene && questDaomingKeys.status !== "resolved") {
      keysFoundConversation();
      return;
    }

    let message = "BUTLER LIU: Binibining CHE! Wala po dito si Young Master...";

    if (GAME_STATE.quests.get("daoming_keys")!.status === "resolved") {
      message = `
        BUTLER LIU: Binibining CHE! Nahanap na po ang keys. 
        Nasa park na po si Young Master.
      `;
    }

    DIALOGUE.show({
      text: message,
      portrait: PORTRAIT_BUTLER,
      color: "darkblue",
    });
  }
}

function nearMissConversation() {
  if (GAME_STATE.sequence.meet_daomingsi) return; // already met him (and he's gone) — don't replay this
  hudSetBagIconVisible(false);
  playExclamation(BUTLER);
  DIALOGUE.show({
    text: `BUTLER LIU: Young Master, saan po natin ilalagay ang ke#&@—k!`,
    portrait: PORTRAIT_BUTLER,
    color: "darkblue",
  });
  DIALOGUE.effect(() => {
    DIALOGUE.clearPortrait();
    playAttentionBounce(GAME_STATE.daomingsi, { hops: 5, duration: 0.1 });
    playExclamation(GAME_STATE.daomingsi);
    gsap.delayedCall(0.5, () => {
      BUTLER.face("s");
      playAttentionBounce(BUTLER);
      playExclamation(BUTLER);
    });
  }, 0.5);
  DIALOGUE.queue({
    text: `F4 DAO MING SI: Saan ilalagay ang "keys"?`,
    color: DIALOGUE_COLOR_DAOMINGSI,
    portrait: PORTRAIT_DAOMINGSI,
  });
  DIALOGUE.effect(() => BUTLER.face("w"));
  DIALOGUE.effect(() => playAttentionBounce(GAME_STATE.daomingsi, { hops: 2 }));
  DIALOGUE.queue(`Liu— ihanda mo ang almusal ko nagugutom na ako!`);
  DIALOGUE.queue(`Hahanapin ko lang ang keys ko...`);
  DIALOGUE.effect(() => {
    DIALOGUE.clearPortrait();
    DIALOGUE.hideBox();
    daoMingSiWalk = walk(GAME_STATE.daomingsi, [[23, 4]]);
  }, 1);
  DIALOGUE.effect(() => {
    BUTLER.face("d");
    gsap.delayedCall(0.5, () => daoMingSiWalk?.stop());
  });
  DIALOGUE.queue({
    text: `BUTLER LIU: Pero ang alam ko ay hindi naman po nawawala ang keys niyo...`,
    color: "darkblue",
    portrait: PORTRAIT_BUTLER,
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
  DIALOGUE.queue({
    text: `DAO MING SI: Hinihingi ko ba ang opinyon mo HA?`,
    color: DIALOGUE_COLOR_DAOMINGSI,
    portrait: PORTRAIT_DAOMINGSI_INTIMIDATE,
  });
  DIALOGUE.effect(() => gsap.delayedCall(0.5, () => GAME_STATE.daomingsi.face("s")));
  DIALOGUE.queue({
    text: `
    Basta alam ko yung keys ko naiwan ko lang yun kay LEI, 
    o kay XI MEN man o MEI ZUO. Bahala ka na jan mauna na ako umalis...!`,
    portrait: PORTRAIT_DAOMINGSI,
  });
  DIALOGUE.effect(() => {
    DIALOGUE.clearPortrait();
    DIALOGUE.hideBox();
    walk(GAME_STATE.daomingsi, [25, 4]);
    gsap.delayedCall(0.5, () => BUTLER.face("s"));
  }, 1);
  DIALOGUE.effect(() => playExclamation(BUTLER), 0.5);
  DIALOGUE.queue({
    text: `
      BUTLER LIU: Mawalang galang na po binibining CHE, 
      pero nahihiya lang po si Young Master manghingi ng tulong.
      Kung maaari po tulungan po ninyo siya mahanap ang keys niya.
    `,
    color: "darkblue",
    portrait: PORTRAIT_BUTLER,
  });
  DIALOGUE.effect(() => {
    DIALOGUE.clearPortrait();
    DIALOGUE.hideBox();

    const quests: QuestEntry[] = ["daoming_keys", "meet_huazelei", "meet_meizuo", "meet_ximen"].map(
      (id) => {
        const quest = GAME_STATE.quests.get(id as QuestId)!;
        questSetStatus(quest, "active");
        return quest;
      },
    );

    let delay = 0;

    quests.forEach(({ description }) => {
      playQuestToast({
        description,
        delay: (delay += 0.3),
      });
    });
  }, 5);
  DIALOGUE.onComplete = () => {
    hudSetBagIconVisible(true);
    GAME_STATE.sequence.meet_daomingsi = true;
    remove(NPCS, GAME_STATE.daomingsi); // he's left — also drops him from GAME_STATE.obstacles, same array reference
  };
}

function keysFoundConversation() {
  GAME_STATE.movementLocked = true;
  hudSetBagIconVisible(false);

  DIALOGUE.show({
    text: `BUTLER LIU: Hello po binibining CHE.`,
    portrait: PORTRAIT_BUTLER,
    color: "darkblue",
  });

  DIALOGUE.queue("Pinapasabi po ni Young Master na ang keys ay nahanap na.");
  DIALOGUE.queue(
    "At dahil nga po dito ay magsisimula na rin po ang event para ipakita ang treasure...",
  );
  DIALOGUE.queue(
    `Kung inyong mararapatin ay pumunta lang po kayo
    sa timog na bahagi na park para sa mga dadalo sa kaganapan
    upang ipagdiwang ang isang napakahalagang treasure na natagpuan.
    `,
  );
  DIALOGUE.queue("Makikita niyo rin po dun si Young Master.");

  DIALOGUE.effect(() => {
    GAME_STATE.movementLocked = true;
    DIALOGUE.hideBox();
    DIALOGUE.clearPortrait();
    questSetStatus(questDaomingKeys, "resolved");
    playQuestToast(questDaomingKeys);
    playQuestCompleteBanner("Completed!");
  }, 5);

  DIALOGUE.onComplete = () => hudSetBagIconVisible(true);
}

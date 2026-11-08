import { COLLISION_MANSION } from "@/constants/collisions/mansion";
import { TILE_SIZE, ZOOM_LEVEL } from "@/constants/game-settings";
import { TRIGGER_MANSION, type TriggerName } from "@/constants/triggers/mansion";
import type { Direction } from "@/features/controller";
import { GAME_STATE } from "@/features/game-state";
import { drawInteractPrompt, updateInteraction, type Interactable } from "@/features/interact";
import type { Scene } from "@/features/scene";
import { Sprite } from "@/features/sprite";
import { PlayerSprite, type AnimationSource } from "@/features/sprite-player";
import {
  checkTriggerZones,
  createBoundaries,
  createTriggerZones,
  type TriggerHandlers,
} from "@/features/zone";
import { audioPlayMusic, audioStopMusic } from "@/lib/audio";
import { DIALOGUE } from "@/lib/canvas/dialogue";
import { isInViewport } from "@/lib/canvas/viewport";
import { drawViewportClamped, prepareViewportClamped } from "@/lib/canvas/viewport-clamp";
import { drawYSorted } from "@/lib/canvas/y-sort";
import { beginCutscene } from "@/lib/cutscene";
import { playAttentionBounce } from "@/lib/effects/attention-bounce";
import { playExclamation } from "@/lib/effects/exclamation-bubble";
import { playQuestCompleteBanner, playQuestToast } from "@/lib/effects/quest-toast";
import { hudSetBagIconVisible } from "@/lib/hud";
import { img } from "@/lib/img";
import { movePlayer } from "@/lib/map-movement";
import { createNpcSpawner } from "@/lib/npc-spawn";
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

// ---- Map ----

const IMG_MAP_BG = img("maps/mansion.png");
const IMG_MAP_FG = img("maps/mansion-fg.png");

const background = new Sprite({ src: IMG_MAP_BG });
const foreground = new Sprite({ src: IMG_MAP_FG });

// ---- NPCs ----

const staffCfg = {
  boxSize: { width: 64 },
  shadowOffset: { y: -5 },
};

// BUTLER included on purpose, not just the anonymous STAFF_* — he's the
// household's head butler, same visual treatment as the rest of the staff.
function createStaff(idle: Record<Direction, AnimationSource>): PlayerSprite {
  return new PlayerSprite({ sprites: { idle }, ...staffCfg });
}

const BUTLER = createStaff(IMGS_BUTLER_IDLE);
const STAFF_M1 = createStaff(IMGS_HH_STAFF_MALE_1_IDLE);
const STAFF_M2 = createStaff(IMGS_HH_STAFF_MALE_1_IDLE);
const STAFF_M3 = createStaff(IMGS_HH_STAFF_MALE_1_IDLE);
const STAFF_M4 = createStaff(IMGS_HH_STAFF_MALE_1_IDLE);
const STAFF_F1 = createStaff(IMGS_HH_STAFF_FEMALE_1_IDLE);
const STAFF_F2 = createStaff(IMGS_HH_STAFF_FEMALE_1_IDLE);
const STAFF_F3 = createStaff(IMGS_HH_STAFF_FEMALE_1_IDLE);
const STAFF_F4 = createStaff(IMGS_HH_STAFF_FEMALE_1_IDLE);

const COL_A = [STAFF_M1, STAFF_M2, STAFF_F1, STAFF_F2];
const COL_B = [STAFF_M3, STAFF_M4, STAFF_F3, STAFF_F4];

// Starts blank — respawnNPC (below) is what actually populates this. Don't
// push into this array directly (see @/lib/npc-spawn).
const NPCS: PlayerSprite[] = [];

// Fixed for the whole scene — nobody else ever becomes interactable here, so
// this never needs rebuilding on re-entry.
const INTERACTABLES: Interactable[] = [BUTLER];

const { respawnNPC, despawnNPC } = createNpcSpawner(NPCS, INTERACTABLES);

// COL_A/COL_B are permanent, fixed from the very start — same idiom as
// overworld.ts's own spawnOverworldNpcs(). BUTLER and daomingsi aren't here:
// both are game-state-conditional (which tile, or whether daomingsi exists
// at all), so they're respawnNPC'd from inside enter() instead — see there,
// and despawnNPC in nearMissConversation.
let col = 21;
for (const npc of COL_A) {
  respawnNPC(npc, [10.25, col]);
  col--;
}

col = 21;
for (const npc of COL_B) {
  respawnNPC(npc, [13.25, col]);
  col--;
}

COL_A.forEach((npc) => npc.face("d"));
COL_B.forEach((npc) => npc.face("a"));

// ---- Decor / furniture ----

const IMG_BEIGE_CHAIR_WEST = img("others/beige-chair-west.png");
const IMG_BEIGE_CHAIR_EAST = img("others/beige-chair-east.png");
const IMG_BEIGE_SOFA_SOUTH = img("others/beige-sofa-south.png");
const IMG_TABLE_FLOWER_BOOK_COFFEE = img("others/table-flower-book-coffee.png");
const IMG_TABLE_FLOWER_BOOK = img("others/table-flower-book.png");

function createChair(src: string): Sprite {
  return new Sprite({
    src,
    scale: 2,
    boxSize: { width: TILE_SIZE, height: TILE_SIZE },
    collisionBox: { height: 56 },
  });
}

const chairWest1 = createChair(IMG_BEIGE_CHAIR_WEST);
const chairWest2 = createChair(IMG_BEIGE_CHAIR_WEST);
const chairEast1 = createChair(IMG_BEIGE_CHAIR_EAST);
const chairEast2 = createChair(IMG_BEIGE_CHAIR_EAST);
const sofa = new Sprite({
  src: IMG_BEIGE_SOFA_SOUTH,
  scale: 2,
  boxSize: { width: TILE_SIZE * 4, height: TILE_SIZE * 2 },
  collisionBox: { height: 56 },
});
const table1 = new Sprite({
  src: IMG_TABLE_FLOWER_BOOK,
  scale: 2,
  boxSize: { width: 80 * ZOOM_LEVEL, height: 35 * ZOOM_LEVEL },
  collisionBox: { height: 56 },
});
const table2 = new Sprite({
  src: IMG_TABLE_FLOWER_BOOK_COFFEE,
  scale: 2,
  boxSize: {
    // Use Tiled to assist getting the actual
    // width/height of the pixel art
    // without the blank spaces
    width: 50 * ZOOM_LEVEL,
    height: 35 * ZOOM_LEVEL,
  },
  collisionBox: { height: 56 },
});
const table3 = new Sprite({
  src: IMG_TABLE_FLOWER_BOOK_COFFEE,
  scale: 2,
  boxSize: { width: 50 * ZOOM_LEVEL, height: 35 * ZOOM_LEVEL },
  collisionBox: { height: 56 },
});

const FURNITURES: Sprite[] = [
  chairWest1,
  chairWest2,
  chairEast1,
  chairEast2,
  sofa,
  table1,
  table2,
  table3,
];
const DECORS: Sprite[] = [...FURNITURES];

placeAtTile(chairEast1, [1.5, 17.5]);
placeAtTile(chairWest1, [7.5, 17.5]);
placeAtTile(chairEast2, [15.5, 17.5]);
placeAtTile(chairWest2, [21.5, 17.5]);
placeAtTile(sofa, [3.5, 15]);
placeAtTile(table1, [4.25, 17.45]);
placeAtTile(table2, [17.22, 17.4]);
placeAtTile(table3, [19.22, 17.4]);

// ---- Quests / triggers ----

const questDaomingKeys = GAME_STATE.quests.get("daoming_keys")!;

const TRIGGER_HANDLERS: TriggerHandlers<TriggerName> = {
  exit: { onEnter: exitZone },
  meet_daomingsi: {
    onEnter: nearMissConversation,
  },
};

// ---- Scene ----

export const mansionScene: Scene = {
  fadeIn: 0.5,
  fadeOut: 0.5,
  ready: preload([background.image, foreground.image]).then(() =>
    prepareViewportClamped([background, foreground]),
  ),

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

    // Once he's left (see despawnNPC in nearMissConversation), he's out of
    // NPCS for good — skip re-placing/re-adding him on a later re-entry.
    if (!GAME_STATE.sequence.meet_daomingsi) {
      respawnNPC(BUTLER, [11.25, 6]);
      respawnNPC(GAME_STATE.daomingsi, [11.5, 4]);
      BUTLER.face("w");
    } else {
      respawnNPC(BUTLER, [11.25, 17]);
      BUTLER.face("s");
    }

    GAME_STATE.obstacles = [...NPCS, ...DECORS]; // blocks walking through any of them, tracking wherever each currently is

    GAME_STATE.player.face("w");
    GAME_STATE.movementLocked = false;
  },

  update(dt) {
    // if (GAME_STATE.sceneElapsed === 0) audioPlayMusic("map");
    NPCS.filter(isInViewport).forEach((n) => n.update(dt));

    const playerBox = movePlayer(dt);
    checkTriggerZones(playerBox, GAME_STATE.triggerZones, TRIGGER_HANDLERS);

    updateInteraction(INTERACTABLES, interactions);
  },

  draw(ctx) {
    drawViewportClamped(ctx, background);

    // GAME_STATE.boundaries.forEach((b) => b.draw(ctx)); // for debugging and boundary visibility

    drawYSorted(ctx, [
      GAME_STATE.player,
      ...NPCS.filter(isInViewport),
      ...DECORS.filter(isInViewport),
    ]);
    drawViewportClamped(ctx, foreground);

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

let daoMingSiWalk: WalkHandle | null = null;

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
    beginCutscene();
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
    beginCutscene();
    daoMingSiWalk = walk(GAME_STATE.daomingsi, [[23, 4]]);
  }, 1);
  DIALOGUE.effect(() => {
    BUTLER.face("d");
    gsap.delayedCall(0.5, () => daoMingSiWalk?.stop());
  });
  DIALOGUE.queue({
    text: `
      BUTLER LIU: Pero kung makikita niyo po ay 
      nakahain na ang mga pagkain sa mesa at ang
      alam ko ay hindi naman po nawawala ang keys niyo...`,
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
    beginCutscene();
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
    beginCutscene();

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
    despawnNPC(GAME_STATE.daomingsi); // he's left — also drops him from GAME_STATE.obstacles, same array reference
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

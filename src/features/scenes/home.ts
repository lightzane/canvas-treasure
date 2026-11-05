import { COLLISION_HOME } from "@/constants/collisions/home";
import { TILE_SIZE } from "@/constants/game-settings";
import { TRIGGER_HOME, type TriggerName } from "@/constants/triggers/home";
import { GAME_STATE } from "@/features/game-state";
import {
  drawInteractPrompt,
  removeInteractable,
  updateInteraction,
  type Interactable,
} from "@/features/interact";
import type { Scene } from "@/features/scene";
import { Sprite } from "@/features/sprite";
import {
  checkTriggerZones,
  createBoundaries,
  createTriggerZones,
  type TriggerHandlers,
} from "@/features/zone";
import { addOnce } from "@/lib/array";
import { bagAddItem, bagHasItem } from "@/lib/bag";
import { DIALOGUE } from "@/lib/canvas/dialogue";
import { drawViewportClamped, prepareViewportClamped } from "@/lib/canvas/viewport-clamp";
import { drawYSorted } from "@/lib/canvas/y-sort";
import { playAttentionBounce, type AttentionBounceHandle } from "@/lib/effects/attention-bounce";
import { playExclamation } from "@/lib/effects/exclamation-bubble";
import {
  playQuestCompleteBanner,
  playQuestToast,
  type QuestToastHandle,
} from "@/lib/effects/quest-toast";
import { playShine, type ShineHandle } from "@/lib/effects/shine";
import { hudSetBagIconVisible } from "@/lib/hud";
import { img } from "@/lib/img";
import { movePlayer } from "@/lib/map-movement";
import { cancelScheduledFace, scheduleFaceDirection } from "@/lib/npc-auto";
import { placeAtTile } from "@/lib/positioning";
import { preload } from "@/lib/preload";
import { QUESTS, questSetStatus } from "@/lib/quests";
import gsap from "gsap";

const IMG_MAP_BG = img("maps/home.png");
const IMG_MAP_FG = img("maps/home-fg.png");
const IMG_PARCEL = img("others/parcel.png");
const IMG_JOURNAL = img("others/book-and-pencil.png");
const IMG_RUNNING_SHOES = img("others/shoes.png");

const background = new Sprite({ src: IMG_MAP_BG });
const foreground = new Sprite({ src: IMG_MAP_FG });
const parcel = new Sprite({ src: IMG_PARCEL, scale: 2, boxSize: { height: 64, width: 64 } });
const journal = new Sprite({ src: IMG_JOURNAL, scale: 2 });
const runningShoes = new Sprite({ src: IMG_RUNNING_SHOES, scale: 1.5 });

const MAMA_INTERACTABLE: Interactable = { sprite: GAME_STATE.mama, label: "Talk" };
// Sits across the table — needs a wider reach; a plain Sprite has nothing to face anyway.
const PARCEL_INTERACTABLE: Interactable = {
  sprite: parcel,
  probeDistance: 32 * 4,
  facePlayer: false,
  label: "Get",
};
// Rebuilt each enter() (parcel presence depends on hasItem, not a fixed
// story flag) and mutated in place on pickup — see interactions() below.
let interactables: Interactable[] = [];

let firstQuest: QuestToastHandle | undefined;
let parcelBounce: AttentionBounceHandle | null = null;
let parcelShine: ShineHandle | null = null;
let journalShine: ShineHandle | null = null;
function scheduleMamaFaceNorth() {
  if (bagHasItem("parcel")) hudSetBagIconVisible(true);
  scheduleFaceDirection(GAME_STATE.mama, "w");
}

let isMamaOutside = false;

const questRunningShoes = GAME_STATE.quests.get("running_shoes")!;

const TRIGGER_HANDLERS: TriggerHandlers<TriggerName> = {
  exit: { onEnter: exitZone },
  story_mama_parcel: { onEnter: mamaParcelConversation },
};

export const homeScene: Scene = {
  fadeIn: 1,
  fadeOut: 0.5,
  ready: preload([background.image, foreground.image, parcel.image]).then(() =>
    prepareViewportClamped([background, foreground]),
  ),

  enter() {
    if (bagHasItem("parcel") && !GAME_STATE.bagIconVisible)
      gsap.delayedCall(homeScene.fadeIn! + 0.5, () => hudSetBagIconVisible(true));

    if (GAME_STATE.sequence.closing_remarks) GAME_STATE.cameraFollow = true;

    isMamaOutside = questRunningShoes.status !== "inactive";

    GAME_STATE.boundaries = createBoundaries(COLLISION_HOME);
    GAME_STATE.triggerZones = createTriggerZones(TRIGGER_HOME);

    let spawnLocation: [number, number] = [13, 19];

    if (!GAME_STATE.sequence.intro) {
      spawnLocation = [3, 14];
      homeScene.fadeIn = 0.5;
      homeScene.fadeOut = 1;
    } else {
      GAME_STATE.player.face("a");
    }

    if (!isMamaOutside) GAME_STATE.mama.face("w");

    // spriteSize pins this to the player's stable boxSize — its `run` clip
    // is a different pixel size than walk/idle (unlike every other sprite
    // here), so the default sprite.size would center differently depending
    // on whichever animation was active when this ran. See spriteSize's own
    // doc in positioning.ts for the full reasoning.
    placeAtTile({
      sprite: GAME_STATE.player,
      tile: spawnLocation,
      spriteSize: GAME_STATE.player.boxSize,
    });
    if (!bagHasItem("parcel")) placeAtTile({ sprite: parcel, tile: [8.7, 4.3] });
    if (!bagHasItem("journal")) placeAtTile({ sprite: journal, tile: [7, 4] });

    placeAtTile({ sprite: GAME_STATE.mama, tile: [3.5, 3] });

    // Mama at home
    if (!isMamaOutside) {
      GAME_STATE.obstacles = [GAME_STATE.mama]; // blocks walking through her, tracking wherever she currently is
    }

    interactables = bagHasItem("parcel")
      ? [MAMA_INTERACTABLE]
      : [MAMA_INTERACTABLE, PARCEL_INTERACTABLE];

    if (!bagHasItem("shoes") && questRunningShoes.status === "active") {
      placeAtTile({ sprite: runningShoes, tile: [10, 22] });
      addOnce(interactables, {
        sprite: runningShoes,
        label: "Wear",
        probeDistance: TILE_SIZE * 3,
      });
    }

    GAME_STATE.movementLocked = false;
  },

  update(dt) {
    // if (GAME_STATE.sceneElapsed === 0) playMusic("map");
    if (!isMamaOutside) GAME_STATE.mama.update(dt);

    const playerBox = movePlayer(dt);
    if (playerBox) checkTriggerZones(playerBox, GAME_STATE.triggerZones, TRIGGER_HANDLERS);

    updateInteraction(interactables, interactions);
  },

  draw(ctx) {
    drawViewportClamped(ctx, background);

    // GAME_STATE.boundaries.forEach((b) => b.draw(ctx)); // for debugging and boundary visibility

    if (!isMamaOutside) drawYSorted(ctx, [GAME_STATE.mama, GAME_STATE.player]);
    else GAME_STATE.player.draw(ctx);
    drawViewportClamped(ctx, foreground);

    if (!bagHasItem("parcel")) parcel.draw(ctx);
    if (!bagHasItem("journal")) journal.draw(ctx);
    if (!bagHasItem("shoes") && questRunningShoes.status === "active") runningShoes.draw(ctx);
    if (GAME_STATE.facedTarget) drawInteractPrompt(ctx, GAME_STATE.facedTarget, interactables);
  },
};

function interactions(target: Sprite | undefined) {
  if (target === runningShoes && questRunningShoes.status === "active") {
    interactShoes();
    return;
  }

  if (target === GAME_STATE.mama) {
    hudSetBagIconVisible(false);
    cancelScheduledFace(GAME_STATE.mama);
    if (!bagHasItem("parcel"))
      DIALOGUE.show({ text: "MAMA: Paki kuha mo na ang parcel at tingnan.", color: "red" });
    else {
      DIALOGUE.show({
        text: "MAMA: Check mo nga rin sa labas kung anu kaya event meron sa invitation na iyan.",
        color: "red",
      });
    }
    DIALOGUE.onComplete = scheduleMamaFaceNorth;
  }

  if (target === parcel && !bagHasItem("parcel")) {
    DIALOGUE.show("A parcel — kunin ko na...");

    DIALOGUE.effect(() => {
      DIALOGUE.hideBox();
      firstQuest?.stop();
      const quest = QUESTS.get("parcel")!;
      playQuestToast({ description: quest.description, resolved: true });
      playQuestCompleteBanner(`Completed. A Journey Begins...!`);
      questSetStatus(quest, "resolved");

      GAME_STATE.bag.set("parcel", {
        type: "item",
        quantity: (GAME_STATE.bag.get("parcel")?.quantity ?? 0) + 1,
      });
      GAME_STATE.bag.set("journal", {
        type: "item",
        quantity: 1,
      });
      interactables = interactables.filter((i) => i.sprite !== parcel);
      parcelShine?.stop();
      parcelShine = null;
      parcelBounce?.stop(); // it's picked up now — stop the infinite tween, don't leave it running forever on a sprite nothing draws anymore
      parcelBounce = null;
      journalShine?.stop();
      journalShine = null;
    }, 5);

    DIALOGUE.effect(() => {
      playExclamation(GAME_STATE.player);
      playAttentionBounce(GAME_STATE.player);
    });

    DIALOGUE.onComplete = () => {
      GAME_STATE.movementLocked = true;
      gsap.delayedCall(0.5, revealParcel);
    };
  }
}

function revealParcel() {
  DIALOGUE.effect(() => gsap.delayedCall(1, () => GAME_STATE.mama.face("d")));
  GAME_STATE.movementLocked = true;
  DIALOGUE.queue({
    text: "YOU: Ma, yung parcel meron maliit na chest tapos invitation lang rin ang laman.",
    color: "teal",
  });
  DIALOGUE.queue({
    text: "MAMA: Mga marites sa labas— sabi treasure-hunting, meron daw prize yung makahanap ng missing gold treasure hidden sa isang lugar.",
    color: "red",
  });
  DIALOGUE.queue(
    `Palagay ko meron event ng treasure-hunting at ang reward ay yung gold mismo na laman ng chest!`,
  );
  DIALOGUE.queue(`Iyan usap-usapan ngayon, mag marites ulit ako sa labas mamaya.`);
  DIALOGUE.effect(() => {
    DIALOGUE.hideBox();
    const quest = QUESTS.get("invitation_postcard")!;
    playQuestToast({ description: quest.description });
    questSetStatus(quest, "active");
    playQuestCompleteBanner(`Treasure Hunt Begins...!`);
  }, 3.5);
  DIALOGUE.effect(() => {
    DIALOGUE.hideBox();
    gsap.delayedCall(0.8, () => {
      GAME_STATE.player.face("s");
      playExclamation(GAME_STATE.player);
      hudSetBagIconVisible(true);
    });
  }, 0.8);
  DIALOGUE.queue({
    text: `Yung mga gusto ko maalala na gawin ay...`,
    color: "black",
  });
  DIALOGUE.queue(`...check ko na lang sa bag (Press ENTER or click sa top-right corner).`);
  DIALOGUE.onComplete = scheduleMamaFaceNorth;
}

function mamaParcelConversation() {
  if (bagHasItem("parcel") || GAME_STATE.sequence.mama_parcel) return;

  GAME_STATE.movementLocked = true; // covers the pre-dialogue beat below; DIALOGUE.show() keeps it locked once the conversation itself starts
  GAME_STATE.mama.face("s");

  playAttentionBounce(GAME_STATE.mama);
  playExclamation(GAME_STATE.mama);

  gsap.delayedCall(1, () => {
    DIALOGUE.effect(() => (parcelShine = playShine(parcel, { mode: "hidden", color: "#fff" })));
    DIALOGUE.show({
      text: "MAMA: CHING, meron tayo nareceive na parcel.",
      color: "red",
    });
    DIALOGUE.effect(() => playAttentionBounce(parcel, { hops: 3 }), 1);
    DIALOGUE.queue(`
            Invitation daw yan.
            Nareceive rin ng ibang mga kapitbahay.
        `);
    DIALOGUE.queue(`Pero di naman yan tulad ng natanggap nila na invitation.`);
    DIALOGUE.effect(() => {
      GAME_STATE.mama.face("d");
      playExclamation(GAME_STATE.mama, { hold: 1 });
    }, 1);
    DIALOGUE.effect(() => (journalShine = playShine(journal)));
    DIALOGUE.queue(
      `Paki tingin naman muna ng parcel. Kunin mo na rin notebook mo sa table bago mo pa malimutan.`,
    );

    DIALOGUE.effect(() => {
      firstQuest = playQuestToast({
        description: QUESTS.get("parcel")!.description,
        hold: "infinite",
      });
    });

    DIALOGUE.onComplete = () => {
      parcelBounce = playAttentionBounce(parcel, { hops: "infinite", duration: 0.25 });
      GAME_STATE.sequence.mama_parcel = true;

      scheduleMamaFaceNorth();
    };
  });
}

function interactShoes() {
  if (questRunningShoes.status !== "active" || bagHasItem("shoes")) return;
  hudSetBagIconVisible(false);
  DIALOGUE.show(`Suotin ko na shoes...`);
  DIALOGUE.effect(() => {
    removeInteractable(interactables, runningShoes);
    DIALOGUE.hideBox();
    questSetStatus(questRunningShoes, "resolved");
    bagAddItem("shoes");
    playQuestToast({ description: questRunningShoes.description, resolved: true });
    playQuestCompleteBanner(`Running Shoes Acquired!`);
  }, 3);
  DIALOGUE.queue(`Para tumakbo, i-hold ko lang iyung SHIFT or X keys sa keyboard while moving.`);
  DIALOGUE.onComplete = () => {
    GAME_STATE.sequence.mama_running_shoes = true;
    hudSetBagIconVisible(true);
  };
}

function exitZone() {
  hudSetBagIconVisible(false);

  if (!GAME_STATE.sequence.mama_parcel) {
    DIALOGUE.show({ text: "MAMA: CHINGKAY! Nasan ka?", color: "red" });
    return; // no parcel yet — stay home
  }

  if (!bagHasItem("parcel")) {
    DIALOGUE.show({ text: "MAMA: CHINGKAY! Paki kuha nitong parcel.", color: "red" });
    return; // no parcel yet — stay home
  }

  GAME_STATE.movementLocked = true; // for the scene transition — released by overworld's own enter()
  GAME_STATE.sceneName = "overworld";
}

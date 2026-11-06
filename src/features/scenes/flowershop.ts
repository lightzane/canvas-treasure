import { TILE_SIZE } from "@/constants/game-settings";
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
import { bagHasItem, bagIncItem } from "@/lib/bag";
import { DIALOGUE } from "@/lib/canvas/dialogue";
import { isInViewport } from "@/lib/canvas/viewport";
import { drawViewportClamped, prepareViewportClamped } from "@/lib/canvas/viewport-clamp";
import { drawYSorted } from "@/lib/canvas/y-sort";
import { playExclamation } from "@/lib/effects/exclamation-bubble";
import { playQuestCompleteBanner, playQuestToast } from "@/lib/effects/quest-toast";
import { hudSetBagIconVisible } from "@/lib/hud";
import { img } from "@/lib/img";
import { movePlayer } from "@/lib/map-movement";
import { scheduleFaceDirection } from "@/lib/npc-auto";
import { placeAtTile } from "@/lib/positioning";
import { preload } from "@/lib/preload";
import { questSetStatus } from "@/lib/quests";
import { IMGS_FLORIST_FEMALE_IDLE } from "@/sprites/florist-female";
import { IMGS_FLORIST_MALE_IDLE } from "@/sprites/florist-male";
import gsap from "gsap";

const IMG_MAP_BG = img("maps/flowershop.png");
const IMG_MAP_FG = img("maps/flowershop-fg.png");
const ICON_SHEARS = img("others/garden-shears.png");

const background = new Sprite({ src: IMG_MAP_BG });
const foreground = new Sprite({ src: IMG_MAP_FG });

const npcCashier = new PlayerSprite({ sprites: { idle: IMGS_FLORIST_MALE_IDLE } });
const npcStaffM1 = new PlayerSprite({ sprites: { idle: IMGS_FLORIST_MALE_IDLE } });
const npcStaffF1 = new PlayerSprite({ sprites: { idle: IMGS_FLORIST_FEMALE_IDLE } });
const npcStaffM2 = new PlayerSprite({ sprites: { idle: IMGS_FLORIST_MALE_IDLE } });
const npcStaffF2 = new PlayerSprite({ sprites: { idle: IMGS_FLORIST_FEMALE_IDLE } });
const npcStaffF3 = new PlayerSprite({ sprites: { idle: IMGS_FLORIST_FEMALE_IDLE } });

const NPCS: PlayerSprite[] = [
  npcCashier,
  npcStaffM1,
  npcStaffF1,
  npcStaffM2,
  npcStaffF2,
  npcStaffF3,
];

// Fixed for the whole scene — nobody else ever becomes interactable here, so
// this never needs rebuilding on re-entry.
const INTERACTABLES: Interactable[] = [
  {
    sprite: npcCashier,
    probeDistance: TILE_SIZE + 16,
  },
  { sprite: npcStaffM1 },
  { sprite: npcStaffF1 },
  { sprite: npcStaffM2 },
  { sprite: npcStaffF2 },
  { sprite: npcStaffF3 },
];

const questGardenShears = GAME_STATE.quests.get("garden_shears")!;

const TRIGGER_HANDLERS: TriggerHandlers<TriggerName> = {
  exit: { onEnter: exitZone },
};

placeAtTile({ sprite: npcCashier, tile: [10, 2.6] });
placeAtTile({ sprite: npcStaffM1, tile: [2.5, 4.2] });
placeAtTile({ sprite: npcStaffF1, tile: [1.5, 4.2] });
placeAtTile({ sprite: npcStaffM2, tile: [3.5, 6.7] });
placeAtTile({ sprite: npcStaffF2, tile: [6.5, 6.2] });
placeAtTile({ sprite: npcStaffF3, tile: [9, 5] });

npcStaffM1.face("w");
npcStaffF1.face("w");
// npcStaffM2.face("s"); // default is 's'
npcStaffF2.face("w");

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

    GAME_STATE.obstacles = [...NPCS];
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

function interactions(target: Sprite | undefined) {
  if (target === npcCashier) {
    DIALOGUE.show(`
        FLORIST: Nag-aayos kami ng flowers
        for the event later! Sisiguraduhin nating
        super green and flowery ang vibe para
        damang-dama ang nature at alive na alive ang
        place natin!
    `);
    DIALOGUE.onComplete = () => scheduleFaceDirection(npcCashier, "s");
  }

  if (target === npcStaffM1) {
    DIALOGUE.show(`FLORIST: Hello po...`);
    DIALOGUE.onComplete = () => scheduleFaceDirection(npcStaffM1, "w");
  }

  if (target === npcStaffF1) {
    DIALOGUE.show(
      `FLORIST: Hello te! Exiciting! Dami namin requests sa
      flowers ngayon dahil sa event mamaya!`,
    );
    DIALOGUE.onComplete = () => scheduleFaceDirection(npcStaffF1, "w");
  }

  if (target === npcStaffM2) {
    DIALOGUE.show(`FLORIST: Yes ma'am?`);
    DIALOGUE.onComplete = () => scheduleFaceDirection(npcStaffM2, "s");
  }

  if (target === npcStaffF2) {
    DIALOGUE.show(`FLORIST: Ginagamit ko po ito'ng "GARDEN SHEARS" pang gupit or trim sa halaman.`);
    DIALOGUE.onComplete = () => scheduleFaceDirection(npcStaffF2, "w");
  }

  if (target === npcStaffF3) {
    mainQuestGardenShears();
  }
}

function mainQuestGardenShears() {
  if (!bagHasItem("shears")) DIALOGUE.show(`FLORIST: Ma'am? Anu po hanap nila...`);
  else DIALOGUE.show(`FLORIST: Keep the garden shears po. I hope nakatulong po ito.`);

  if (!bagHasItem("shears") && questGardenShears.status === "active") {
    hudSetBagIconVisible(false);
    GAME_STATE.movementLocked = true;
    DIALOGUE.effect(() => playExclamation(GAME_STATE.player, { icon: ICON_SHEARS, hold: 3 }), 0.5);
    DIALOGUE.queue(`Ahh pang gupit o trim sa halaman...`);
    DIALOGUE.queue(`Ito po, hiramin niyo ang GARDEN SHEARS namin.`);
    DIALOGUE.effect(() => {
      DIALOGUE.hideBox();
      bagIncItem("shears");
      questSetStatus(questGardenShears, "resolved");
      playQuestToast(questGardenShears);
      playQuestCompleteBanner("Garden Shears Acquired!");
    }, 3);
    DIALOGUE.queue(`
      Ayan makipag interact lang po sa mga tiyak na halaman
      at temporary po sila mawawala at ito ay likas rin na 
      tutubong muli.
    `);
    DIALOGUE.effect(() => hudSetBagIconVisible(true));
  }

  DIALOGUE.onComplete = () => scheduleFaceDirection(npcStaffF3, "s");
}

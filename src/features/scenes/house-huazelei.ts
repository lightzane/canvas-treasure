import { COLLISION_HOUSE_HUAZELEI } from "@/constants/collisions/house_huazelei";
import { TILE_SIZE, ZOOM_LEVEL } from "@/constants/game-settings";
import { TRIGGER_HOUSE_HUAZELEI, type TriggerName } from "@/constants/triggers/house_huazelei";
import { GAME_STATE } from "@/features/game-state";
import { drawInteractPrompt, updateInteraction, type Interactable } from "@/features/interact";
import type { Scene } from "@/features/scene";
import { Sprite } from "@/features/sprite";
import type { PlayerSprite } from "@/features/sprite-player";
import {
  checkTriggerZones,
  createBoundaries,
  createTriggerZones,
  type TriggerHandlers,
} from "@/features/zone";
import { addOnce } from "@/lib/array";
import { audioPlayMusic, audioStopMusic } from "@/lib/audio";
import { DIALOGUE } from "@/lib/canvas/dialogue";
import { isInViewport } from "@/lib/canvas/viewport";
import { drawViewportClamped, prepareViewportClamped } from "@/lib/canvas/viewport-clamp";
import { drawYSorted } from "@/lib/canvas/y-sort";
import { createCompanion } from "@/lib/companion";
import { hudSetBagIconVisible } from "@/lib/hud";
import { img } from "@/lib/img";
import { movePlayer } from "@/lib/map-movement";
import { createNpcSpawner } from "@/lib/npc-spawn";
import { placeAtTile } from "@/lib/positioning";
import { preload } from "@/lib/preload";
import { isQuestResolved } from "@/lib/quests";
import gsap from "gsap";

const IMG_MAP_BG = img("maps/house_huazelei.png");
const IMG_BLUE_CHAIR_WEST = img("others/chair-blue-west.png");
const IMG_BLUE_CHAIR_EAST = img("others/chair-blue-east.png");
const IMG_BLUE_SOFA_SOUTH = img("others/sofa-blue-south.png");

const background = new Sprite({ src: IMG_MAP_BG });

// ---- Decor / furniture ---- same setup as mansion.ts's own chair/sofa.

function createChair(src: string): Sprite {
  return new Sprite({
    src,
    scale: 2,
    boxSize: { width: 64 * ZOOM_LEVEL, height: 43 * ZOOM_LEVEL },
    collisionBox: { height: 56 },
  });
}

const chairWest1 = createChair(IMG_BLUE_CHAIR_WEST);
const chairEast1 = createChair(IMG_BLUE_CHAIR_EAST);
const sofa = new Sprite({
  src: IMG_BLUE_SOFA_SOUTH,
  scale: 2,
  boxSize: { width: TILE_SIZE * 4, height: TILE_SIZE * 2 },
  collisionBox: { height: 56 },
});

const FURNITURES: Sprite[] = [chairWest1, chairEast1, sofa];
const DECORS: Sprite[] = [...FURNITURES];

// Rough placeholders — adjust to taste once rendered against the real map.
// spriteSize pins each to its own boxSize — see placeAtTile's doc comment:
// its default fallback is sprite.size (the RAW, unscaled image pixels), not
// boxSize. That's invisible for the chairs (their 64x64 art happens to equal
// their own TILE_SIZE boxSize), but the sofa's 128x64 art is HALF its
// 256x128 boxSize (4x2 tiles) — so without this, it centers as if it were
// half as big, landing ~1 tile right and half a tile down from [2, 2].
placeAtTile({ sprite: chairWest1, tile: [5.5, 4.5], spriteSize: chairWest1.boxSize });
placeAtTile({ sprite: chairEast1, tile: [1.5, 4.5], spriteSize: chairEast1.boxSize });
placeAtTile({ sprite: sofa, tile: [3.5, 2.5], spriteSize: sofa.boxSize });

// Starts blank — respawnNPC (below) is what actually populates this. Don't
// push into this array directly (see @/lib/npc-spawn).
const NPCS: PlayerSprite[] = [];

const INTERACTABLES: Interactable[] = [];

const { respawnNPC } = createNpcSpawner(NPCS, INTERACTABLES);

const jpCompanion = createCompanion(GAME_STATE.jp, { followDistance: 1 });

const TRIGGER_HANDLERS: TriggerHandlers<TriggerName> = {
  exit: { onEnter: exitZone },
};

export const houseHuazeleiScene: Scene = {
  fadeIn: 0.5,
  fadeOut: 0.5,

  ready: preload([background.image]).then(() => prepareViewportClamped([background])),

  enter() {
    audioPlayMusic("house_huazelei", { seek: 0, fade: 1, volume: 0.5 });

    if (!GAME_STATE.bagIconVisible)
      gsap.delayedCall(houseHuazeleiScene.fadeIn! + 0.5, () => hudSetBagIconVisible(true));

    GAME_STATE.boundaries = createBoundaries(COLLISION_HOUSE_HUAZELEI);
    GAME_STATE.triggerZones = createTriggerZones(TRIGGER_HOUSE_HUAZELEI);

    let spawnLocation: [number, number] = [7, 9];
    const jpSpawnLocation: [number, number] = [8, 9];

    // No companion yet — nobody's sharing the doorway, so the player lands
    // centered instead of shifted aside for jp.
    if (!isQuestResolved("invitation_postcard")) spawnLocation = [7.5, 9];

    // spriteSize pins this to the player's stable boxSize — see the same
    // comment in home.ts, or spriteSize's own doc in positioning.ts.
    placeAtTile({
      sprite: GAME_STATE.player,
      tile: spawnLocation,
      spriteSize: GAME_STATE.player.boxSize,
    });

    // Companion — same gate as every other scene (overworld.ts, flowershop.ts, ...).
    if (isQuestResolved("invitation_postcard")) {
      addOnce(INTERACTABLES, GAME_STATE.jp);
      respawnNPC(GAME_STATE.jp, jpSpawnLocation);
      GAME_STATE.jp.face("w");
    }

    GAME_STATE.obstacles = [...NPCS, ...DECORS]; // blocks walking through any of them, tracking wherever each currently is
    GAME_STATE.player.face("w");
    GAME_STATE.movementLocked = false;
  },

  update(dt) {
    NPCS.filter(isInViewport).forEach((n) => n.update(dt));

    const playerBox = movePlayer(dt);
    checkTriggerZones(playerBox, GAME_STATE.triggerZones, TRIGGER_HANDLERS);

    jpCompanion.follow(dt, isQuestResolved("invitation_postcard"));

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

    if (GAME_STATE.facedTarget) drawInteractPrompt(ctx, GAME_STATE.facedTarget, INTERACTABLES);
  },
};

function exitZone() {
  hudSetBagIconVisible(false);
  audioStopMusic(houseHuazeleiScene.fadeOut);
  GAME_STATE.movementLocked = true; // for the scene transition — released by overworld's own enter()
  GAME_STATE.spawnLocation = [58.15, 26.5];
  GAME_STATE.sceneName = "overworld";
}

function interactions(target: Sprite | undefined) {
  // void target;
  if (target === GAME_STATE.jp) {
    DIALOGUE.show({ text: "Love Love: Oops walang tao here...", color: "blue" });
    DIALOGUE.queue(`Tsk tsk, iniiwang bukas ang pinto.`);
  }
}

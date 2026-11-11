/**
 * Starting point for a new scene — copy this file, rename it (and
 * `templateScene`/other identifiers below) to match the new area, then work
 * through the TODOs. Deliberately NOT wired into `SceneName` (scene.ts) or
 * `SCENES` (game-engine.ts) — those two are the only places a scene becomes
 * real/navigable, and that's a per-scene decision for whoever uses this.
 *
 * Modeled on the shape shared by home.ts/mansion.ts/flowershop.ts (not
 * overworld.ts, which is the one large hub scene with story-specific
 * extras) — background/foreground map, player spawn, boundaries + trigger
 * zones, NPCs + interactables via `createNpcSpawner` (both the permanent
 * and the spawn-later-on-a-story-beat case), and three dialogue-dispatch
 * shapes: `createNpcMessages`/`npcMessagesInteractions` (@/lib/npc-messages)
 * for a flat one-off line with no state — prefer this for any NEW ambient
 * NPC, one declarative entry instead of a separate PlayerSprite const +
 * respawnNPC + INTERACTABLES entry + dispatch call; `createTalkDispatch(target)`
 * + `talkCommonM`/`talkCommonF` (@/lib/npc-talk) for that same flat-line case
 * on a sprite that's already being spawned/managed some other way (see
 * teashop.ts for a whole scene that's only ever this); and a `switch` + named
 * function + `beginCutscene` for anything stateful (first-meet vs.
 * already-met, multi-line, spawning another NPC afterward, ...).
 */
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
import { DIALOGUE } from "@/lib/canvas/dialogue";
import { isInViewport } from "@/lib/canvas/viewport";
import { drawViewportClamped, prepareViewportClamped } from "@/lib/canvas/viewport-clamp";
import { drawYSorted } from "@/lib/canvas/y-sort";
import { beginCutscene } from "@/lib/cutscene";
import { hudSetBagIconVisible } from "@/lib/hud";
import { img } from "@/lib/img";
import { movePlayer } from "@/lib/map-movement";
import { createNpcMessages, npcMessagesInteractions } from "@/lib/npc-messages";
import { createNpcSpawner } from "@/lib/npc-spawn";
import { createTalkDispatch } from "@/lib/npc-talk";
import { placeAtTile } from "@/lib/positioning";
import { preload } from "@/lib/preload";
import { IMGS_ADULT_MALE_1_IDLE } from "@/sprites/adult-male-1";
import gsap from "gsap";

// TODO: once this map has real Tiled exports, swap these in and drop the
// `[]`s passed to createBoundaries/createTriggerZones below:
//   import { COLLISION_TEMPLATE } from "@/constants/collisions/template";
//   import { TRIGGER_TEMPLATE, type TriggerName } from "@/constants/triggers/template";
// TriggerHandlers below also becomes TriggerHandlers<TriggerName> then.

const IMG_MAP_BG = img("maps/template.png");
const IMG_MAP_FG = img("maps/template-fg.png"); // delete this + `foreground` below if this map has no foreground layer (see mansion.ts)

const background = new Sprite({ src: IMG_MAP_BG });
const foreground = new Sprite({ src: IMG_MAP_FG });

// TODO: swap IMGS_ADULT_MALE_1_IDLE for this scene's real cast — one
// PlayerSprite per NPC, same as home.ts's GAME_STATE.mama or flowershop.ts's
// npcStaffM1/F1/etc.
const npcExample = new PlayerSprite({ sprites: { idle: IMGS_ADULT_MALE_1_IDLE } });
// A second NPC, deliberately NOT spawned yet — demonstrates the "appears
// after some story beat" half of the pattern below (like overworld.ts's
// huazelei). Delete this one if every NPC here is permanent from the start.
const npcLater = new PlayerSprite({ sprites: { idle: IMGS_ADULT_MALE_1_IDLE } });
// A third NPC with nothing stateful to say — demonstrates the OTHER half
// of interactions() below: a flat one-off line needs neither a switch
// case nor its own named function, just a direct talkCommonM/
// talkCommonF call. See teashop.ts for a whole scene built only out
// of this NPC's kind.
const npcSimple = new PlayerSprite({ sprites: { idle: IMGS_ADULT_MALE_1_IDLE } });
// A fourth NPC, spawned/managed the normal way (like npcSimple above) —
// but its line is wired through createNpcMessages' tuple form below
// instead of a direct talkCommonM call, see NPC_MESSAGES below.
const npcManaged = new PlayerSprite({ sprites: { idle: IMGS_ADULT_MALE_1_IDLE } });

// Starts blank — respawnNPC (below) is what actually populates this, so it
// doubles as both "who's currently in this scene" and the GAME_STATE.obstacles
// source of truth. Don't push into this array directly.
const NPCS: PlayerSprite[] = [];

// respawnNPC never touches this on its own (an Interactable can carry its
// own config — label, probeDistance, ... — so making something interactable
// again is always a deliberate, separate call). Fixed here for npcExample/
// npcSimple since both are permanent; npcLater's entry gets added
// dynamically when it actually spawns, see npcExampleIntro() below. Bare
// sprites, not `{ sprite: ... }` — neither has a label/probeDistance/... to
// customize, so the shorthand form applies (see Interactable's own doc in
// @/features/interact).
const INTERACTABLES: Interactable[] = [npcExample, npcSimple];

const { respawnNPC, despawnNPC } = createNpcSpawner(NPCS, INTERACTABLES);

// Shorthand for placeAtTile + registering into NPCS + GAME_STATE.obstacles,
// all at once (see createNpcSpawner in @/lib/npc-spawn). Called once here, at
// module scope, for a baseline NPC present from the very start — same idiom
// as overworld.ts's own spawnOverworldNpcs(). A conditional NPC instead calls
// respawnNPC/despawnNPC from wherever that story beat actually happens (a
// dialogue's onComplete, a trigger zone, ...) — see npcLater below.
respawnNPC(npcExample, [5, 5]);
respawnNPC(npcSimple, [7, 5]);
npcSimple.face("s");
respawnNPC(npcManaged, [9, 7]);

// createNpcMessages: a flat one-off line with no state, same case as
// npcSimple above, but declarative — no switch case or dispatch call of
// its own needed in interactions() below, just one array entry per NPC.
// Two shapes, see npc-messages.ts's own doc:
// - a tuple ([sprite, gender, message]) for a sprite already spawned/
//   managed some other way (npcManaged above) — only its line gets wired
//   up here, nothing about spawning happens.
// - an object ({idleSprites, tile, gender, message}) for a brand-new
//   NPC — this one call places it and adds it to NPCS/obstacles/
//   INTERACTABLES too, no separate PlayerSprite const or respawnNPC call
//   needed at all.
const NPC_MESSAGES = createNpcMessages(NPCS, INTERACTABLES, [
  [npcManaged, "m", `NPC: Nice weather we're having.`],
  {
    idleSprites: IMGS_ADULT_MALE_1_IDLE,
    tile: [9, 5],
    gender: "m",
    message: `NPC: Haven't seen you around before!`,
  },
]);

const TRIGGER_HANDLERS: TriggerHandlers = {
  exit: { onEnter: exitZone },
};

export const templateScene: Scene = {
  fadeIn: 0.5,
  fadeOut: 0.5,
  // Goes in `ready` below (same list in BOTH preload([...]) AND
  // prepareViewportClamped([...]) — never just one):
  //   - background, foreground
  //   - any other map-scale layer this scene also draws via
  //     drawViewportClamped() in its own draw() (e.g. overworld.ts's
  //     backgroundEvent)
  // Never goes here: NPCs, items, decor — anything drawn via plain
  // sprite.draw()/drawYSorted instead. Not even a lot of them (see
  // overworld.ts, which never lists any of its many NPCs here).
  //
  // Why: every image in the game already loads before gameplay starts,
  // via GameEngine.start()'s preload(getAllLoadedImages()) — a complete
  // inventory by construction (@/lib/load-image). This list's actual job is
  // narrower: it's what lets prepareViewportClamped createImageBitmap the
  // big map layers up front, avoiding a measured ~400ms decode stall
  // (@/lib/canvas/viewport-clamp) — only relevant at that size, and never
  // read back out for a regular sprite (those never draw via
  // drawViewportClamped, so decoding one here would be dead work).
  ready: preload([background.image, foreground.image]).then(() =>
    prepareViewportClamped([background, foreground]),
  ),

  enter() {
    // TODO: this scene's own key, once one exists in audio.ts's MUSIC_REGISTRY:
    // audioPlayMusic("template", { seek: 0, fade: 1, volume: 0.5 });

    if (!GAME_STATE.bagIconVisible)
      gsap.delayedCall(templateScene.fadeIn! + 0.5, () => hudSetBagIconVisible(true));

    GAME_STATE.boundaries = createBoundaries([]); // TODO: createBoundaries(COLLISION_TEMPLATE)
    GAME_STATE.triggerZones = createTriggerZones([]); // TODO: createTriggerZones(TRIGGER_TEMPLATE)

    const spawnLocation: [number, number] = [5, 10];

    // spriteSize pins this to the player's stable boxSize — see the same
    // comment in home.ts, or spriteSize's own doc in positioning.ts.
    placeAtTile({
      sprite: GAME_STATE.player,
      tile: spawnLocation,
      spriteSize: GAME_STATE.player.boxSize,
    });

    // Still needed even though respawnNPC already added npcExample to
    // GAME_STATE.obstacles once above — that's a single array every scene
    // reassigns wholesale in its own enter(), so whichever scene was active
    // right before this one has since overwritten it with its own NPCs. This
    // re-asserts this scene's own current NPCS every time it becomes active.
    GAME_STATE.obstacles = [...NPCS];
    GAME_STATE.player.face("s");
    GAME_STATE.movementLocked = false;
  },

  update(dt) {
    NPCS.filter(isInViewport).forEach((n) => n.update(dt));

    const playerBox = movePlayer(dt);
    checkTriggerZones(playerBox, GAME_STATE.triggerZones, TRIGGER_HANDLERS);

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
  // audioStopMusic(templateScene.fadeOut); // once this scene has real music playing above
  GAME_STATE.movementLocked = true; // for the scene transition — released by overworld's own enter()
  GAME_STATE.spawnLocation = [0, 0]; // TODO: wherever this scene's exit should drop the player in overworld
  GAME_STATE.sceneName = "overworld"; // TODO: change if this scene should return somewhere else
}

// createTalkDispatch binds once to this call's own target, so talkCommonM
// below needs neither an `if`/case nor to repeat `target` itself — it's a
// no-op unless npcSimple is actually the one faced. Already does the
// beginCutscene + DIALOGUE.show + re-face + bag-icon dance in one call, so
// a flat one-off line like this one doesn't need a case/break of its own.
// See teashop.ts's own interactions() for a scene where every NPC is this
// simple (no switch at all).
function interactions(target: Sprite | undefined) {
  const { talkCommonM } = createTalkDispatch(target);
  talkCommonM(npcSimple, "s", `NPC: Just passing through, nothing much to say.`);

  npcMessagesInteractions(target, NPC_MESSAGES);

  // Mirrors overworld.ts's own `interactions()` — one case per
  // sprite/PlayerSprite, delegating to a named function for anything
  // stateful (first-meet vs. already-met, multi-line, spawning another NPC
  // afterward, ...) beyond a one-line DIALOGUE.show().
  switch (target) {
    case npcExample:
      if (!hasMetNpcExample) npcExampleIntro();
      else DIALOGUE.show(`NPC: Hello again!`);
      break;
    case npcLater:
      DIALOGUE.show(`NPC: Thanks for finding me. Bye for now!`);
      DIALOGUE.onComplete = () => despawnNPC(npcLater);
      break;
  }
}

// TODO: a real scene usually tracks this on GAME_STATE.sequence instead
// (e.g. mansion.ts's `meet_daomingsi`) so it persists across re-entries —
// kept as a local flag here since this template isn't a registered scene.
let hasMetNpcExample = false;

/**
 * A short one-time scripted beat on first meeting — the beginCutscene +
 * tiny-delay pattern used throughout overworld.ts for anything more
 * involved than a single DIALOGUE.show(). The `0.00001` matters: a
 * zero/omitted delay can let a frame of movement slip through before the
 * lock actually bites. See beginCutscene's own doc in @/lib/cutscene.
 */
function npcExampleIntro() {
  DIALOGUE.effect(beginCutscene, 0.00001);
  DIALOGUE.show(`NPC: Oh — you must be new here!`);
  DIALOGUE.queue(`NPC: Welcome. Someone else around here's been looking for you too...`);
  DIALOGUE.onComplete = () => {
    hasMetNpcExample = true;
    hudSetBagIconVisible(true);
    GAME_STATE.movementLocked = false;
    respawnNPC(npcLater, [8, 8]); // the dynamic half of the pattern — appears only now
    addOnce(INTERACTABLES, npcLater); // respawnNPC never does this part, see the comment on INTERACTABLES above — "Talk" is already the default label, so the bare-sprite shorthand applies here too
  };
}

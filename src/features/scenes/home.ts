import { COLLISION_HOME } from "@/constants/collisions/home";
import { TRIGGER_HOME } from "@/constants/triggers/home";
import { GAME_STATE, img } from "@/features/game-state";
import { drawInteractPrompt, findFacedTarget, interact } from "@/features/interact";
import type { Scene } from "@/features/scene";
import { Sprite } from "@/features/sprite";
import { checkTriggerZones, TriggerZone, Zone, type TriggerHandlers } from "@/features/zone";
import { DIALOGUE } from "@/lib/canvas/dialogue";
import { drawYSorted } from "@/lib/canvas/y-sort";
import { playAttentionBounce, type AttentionBounceHandle } from "@/lib/effects/attention-bounce";
import { playExclamation } from "@/lib/effects/exclamation-bubble";
import { playShine, type ShineHandle } from "@/lib/effects/shine";
import { movePlayer } from "@/lib/map-movement";
import { placeAtTile } from "@/lib/positioning";
import { preload } from "@/lib/preload";
import gsap from "gsap";

const IMG_MAP_BG = img("maps/home.png");
const IMG_MAP_FG = img("maps/home-fg.png");
const IMG_PARCEL = img("others/parcel.png");

const background = new Sprite({ src: IMG_MAP_BG });
const foreground = new Sprite({ src: IMG_MAP_FG });
const parcel = new Sprite({ src: IMG_PARCEL, scale: 2, boxSize: { height: 64, width: 64 } });

let parcelBounce: AttentionBounceHandle | null = null;
let parcelShine: ShineHandle | null = null;
let mamaFaceNorthTimer: gsap.core.Tween | null = null;
function scheduleMamaFaceNorth() {
  mamaFaceNorthTimer?.kill(); // cancel any earlier pending one — e.g. from spam-talking — so only the latest survives
  mamaFaceNorthTimer = gsap.delayedCall(2, () => GAME_STATE.mama.face("w"));
}

const TRIGGER_HANDLERS: TriggerHandlers = {
  exit: { onEnter: exitZone },
  mama_parcel: { onEnter: mamaParcelConversation },
};

export const homeScene: Scene = {
  fadeIn: 1,
  fadeOut: 0.5,
  ready: preload([background.image, foreground.image, parcel.image]),

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

    let spawnLocation: [number, number] = [13, 19];

    if (!GAME_STATE.sequence.intro) {
      spawnLocation = [3, 14];
      homeScene.fadeIn = 0.5;
      homeScene.fadeOut = 1;
      GAME_STATE.mama.face("w");
    } else {
      GAME_STATE.player.face("a");
    }

    placeAtTile({ sprite: GAME_STATE.player, tile: spawnLocation });
    placeAtTile({ sprite: GAME_STATE.mama, tile: [3.5, 3] });
    placeAtTile({ sprite: parcel, tile: [8.7, 4.3] });

    GAME_STATE.boundaries.push(new Zone(GAME_STATE.mama.collisionBox)); // blocks walking through mama — must run after she's placed, so the box matches her actual spawn position
    GAME_STATE.interactables = [
      { sprite: GAME_STATE.mama, label: "Talk" },
      { sprite: parcel, probeDistance: 32 * 4, facePlayer: false, label: "Get" }, // sits across the table — needs a wider reach; a plain Sprite has nothing to face anyway
    ];
    GAME_STATE.movementLocked = false;
  },

  update(dt) {
    // if (GAME_STATE.sceneElapsed === 0) playMusic("map");
    // parcel.update(dt);
    GAME_STATE.mama.update(dt);

    const playerBox = movePlayer(dt);
    if (playerBox) checkTriggerZones(playerBox, GAME_STATE.triggerZones, TRIGGER_HANDLERS);

    // Shared gate for anything triggered by facing + pressing Z — combine
    // with a target-specific condition per interactable (progress flags,
    // item ownership, ...), same as mama's check below.
    const canAct = !DIALOGUE.isActive && !GAME_STATE.movementLocked;
    GAME_STATE.facedTarget = canAct ? findFacedTarget(GAME_STATE.player) : undefined;

    if (canAct && GAME_STATE.keys.justPressed.z) {
      interactions(interact(GAME_STATE.player));
    }
  },

  draw(ctx) {
    background.draw(ctx);

    // GAME_STATE.boundaries.forEach((b) => b.draw(ctx)); // for debugging and boundary visibility

    drawYSorted(ctx, [GAME_STATE.mama, GAME_STATE.player]);
    foreground.draw(ctx);

    if (!GAME_STATE.bag.get("parcel")) parcel.draw(ctx);
    if (GAME_STATE.facedTarget) drawInteractPrompt(ctx, GAME_STATE.facedTarget);
  },
};

function interactions(target: Sprite | undefined) {
  if (target === GAME_STATE.mama) {
    mamaFaceNorthTimer?.kill();
    if (!GAME_STATE.bag.get("parcel"))
      DIALOGUE.show({ text: "MAMA: Paki kuha mo na ang parcel at tingnan.", color: "red" });
    else
      DIALOGUE.show({
        text: "MAMA: Check mo nga rin sa labas kung anu kaya event meron sa invitation na iyan.",
        color: "red",
      });
    DIALOGUE.onComplete = scheduleMamaFaceNorth;
  }

  if (target === parcel && !GAME_STATE.bag.get("parcel")) {
    DIALOGUE.show("A parcel — kunin ko na...");
    DIALOGUE.effect(() => {
      playExclamation(GAME_STATE.player);
      playAttentionBounce(GAME_STATE.player);
    });
    DIALOGUE.onComplete = () => {
      GAME_STATE.movementLocked = true;
      GAME_STATE.bag.set("parcel", (GAME_STATE.bag.get("parcel") ?? 0) + 1);
      GAME_STATE.interactables = GAME_STATE.interactables.filter((i) => i.sprite !== parcel);
      parcelShine?.stop();
      parcelShine = null;
      parcelBounce?.stop(); // it's picked up now — stop the infinite tween, don't leave it running forever on a sprite nothing draws anymore
      parcelBounce = null;
      gsap.delayedCall(0.5, revealParcel);
    };
  }
}

function revealParcel() {
  DIALOGUE.effect(() => gsap.delayedCall(1, () => GAME_STATE.mama.face("d")));
  GAME_STATE.movementLocked = true;
  DIALOGUE.queue({
    text: "Ma, yung parcel meron maliit na chest tapos invitation lang rin ang laman.",
    color: "teal",
  });
  DIALOGUE.queue({
    text: "MAMA: Sige makapag marites na lang ako sa labas mamaya kung anung event meron.",
    color: "red",
  });
  DIALOGUE.onComplete = scheduleMamaFaceNorth;
}

function mamaParcelConversation() {
  if (GAME_STATE.bag.get("parcel") || GAME_STATE.sequence.mama_parcel) return;

  GAME_STATE.movementLocked = true; // covers the pre-dialogue beat below; DIALOGUE.show() keeps it locked once the conversation itself starts
  GAME_STATE.mama.face("s");

  playAttentionBounce(GAME_STATE.mama);
  playExclamation(GAME_STATE.mama);

  gsap.delayedCall(1, () => {
    DIALOGUE.effect(() => (parcelShine = playShine(parcel, { mode: "hidden", color: "#fff" })));
    DIALOGUE.show({
      text: "MAMA: Che, meron tayo nareceive na parcel.",
      color: "red",
    });
    DIALOGUE.effect(() => playAttentionBounce(parcel, { hops: 3 }), 2);
    DIALOGUE.queue(`
            Invitation daw yan.
            Nareceive rin ng ibang mga kapitbahay.
        `);
    DIALOGUE.queue(`Pero di naman yan tulad ng natanggap nila na invitation.`);
    DIALOGUE.effect(() => {
      GAME_STATE.mama.face("d");
      playExclamation(GAME_STATE.mama, { hold: 2 });
    }, 2);
    DIALOGUE.queue(`Paki tingin naman ng parcel.`);

    DIALOGUE.onComplete = () => {
      parcelBounce = playAttentionBounce(parcel, { hops: "infinite", duration: 0.25 });
      GAME_STATE.sequence.mama_parcel = true;

      scheduleMamaFaceNorth();
    };
  });
}

function exitZone() {
  if (!GAME_STATE.sequence.mama_parcel) {
    DIALOGUE.show({ text: "MAMA: Cheng! Nasan ka?", color: "red" });
    return; // no parcel yet — stay home
  }

  if (!GAME_STATE.bag.get("parcel")) {
    DIALOGUE.show({ text: "MAMA: Cheng! Paki kuha nitong parcel.", color: "red" });
    return; // no parcel yet — stay home
  }

  GAME_STATE.movementLocked = true; // for the scene transition — released by overworld's own enter()
  GAME_STATE.sceneName = "overworld";
}

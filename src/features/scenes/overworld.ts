import { GAME_STATE, img } from "@/features/game-state";
import type { Scene } from "@/features/scene";
import { Sprite } from "@/features/sprite";
import { playIrisReveal } from "@/lib/iris-reveal";
import { movePlayer } from "@/lib/map-movement";
import { placeAtTile } from "@/lib/positioning";
import { preload } from "@/lib/preload";

const IMG_MAP_BG = img("maps/overworld.png");
const IMG_MAP_FG = img("pallet-town-foreground.png");
const IMG_FOUNTAIN_SMALL = img("others/fountain-small.png");
const IMG_FOUNTAIN_BIG = img("others/fountain-big.png");

const background = new Sprite({ src: IMG_MAP_BG });
/** Drawn on top of the player (tree canopies, roof overhangs, etc). */
const foreground = new Sprite({ src: IMG_MAP_FG });

const smallFountainA = new Sprite({ src: IMG_FOUNTAIN_SMALL, frames: { max: 4 }, scale: 2 });
const smallFountainB = new Sprite({ src: IMG_FOUNTAIN_SMALL, frames: { max: 4 }, scale: 2 });
const bigFountainA = new Sprite({ src: IMG_FOUNTAIN_BIG, frames: { max: 4 }, scale: 2 });
const bigFountainB = new Sprite({ src: IMG_FOUNTAIN_BIG, frames: { max: 4 }, scale: 2 });

/** This map's own static/animated decor — drawn after the background, before the player. */
const decor: Sprite[] = [smallFountainA, smallFountainB, bigFountainA, bigFountainB];

export const overworldScene: Scene = {
  fadeIn: 1,
  fadeOut: 1,
  ready: preload([background.image, foreground.image, smallFountainA.image, bigFountainA.image]),

  enter() {
    GAME_STATE.player.face("s");
    // Spawn at specific tiles (col, row from Tiled's bottom-left readout)
    placeAtTile({ sprite: GAME_STATE.player, tile: [58.9, 42] });
    placeAtTile({ sprite: smallFountainA, tile: [80.75, 51.5] });
    placeAtTile({ sprite: smallFountainB, tile: [105.75, 51.5] });
    placeAtTile({ sprite: bigFountainA, tile: [80.25, 21.75] });
    placeAtTile({ sprite: bigFountainB, tile: [90.25, 21.75] });

    if (GAME_STATE.sequence.intro) {
      GAME_STATE.sequence.intro = false;
      playIrisReveal({ duration: 5, delay: 1, softness: 20 }); // delay matches home's fadeOut (1s) so it starts as the fade-in begins, not during the fade-out
    }
  },

  update(dt) {
    decor.forEach((sprite) => sprite.update(dt));

    // if (GAME_STATE.sceneElapsed === 0) playMusic("map");

    movePlayer(dt);
  },

  draw(ctx) {
    background.draw(ctx);
    // GAME_STATE.boundaries.forEach((b) => b.draw(ctx)); // for debugging and boundary visibility
    decor.forEach((sprite) => sprite.draw(ctx));
    GAME_STATE.player.draw(ctx);
    foreground.draw(ctx);
  },
};

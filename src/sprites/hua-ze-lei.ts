import type { Direction } from "@/features/controller";
import type { AnimationSource } from "@/features/sprite-player";
import { img } from "@/lib/img";
import { loadImage } from "@/lib/load-image";

const IMG_PATH = "characters/f4/hua-ze-lei";
const IMG_WALK_DOWN = img(`${IMG_PATH}/walk/south.png`);
const IMG_WALK_LEFT = img(`${IMG_PATH}/walk/west.png`);
const IMG_WALK_RIGHT = img(`${IMG_PATH}/walk/east.png`);
const IMG_WALK_UP = img(`${IMG_PATH}/walk/north.png`);
const IMG_IDLE_DOWN = img(`${IMG_PATH}/idle/south.png`);
const IMG_IDLE_LEFT = img(`${IMG_PATH}/idle/west.png`);
const IMG_IDLE_RIGHT = img(`${IMG_PATH}/idle/east.png`);
const IMG_IDLE_UP = img(`${IMG_PATH}/idle/north.png`);

export const IMGS_HUAZELEI_WALK: Record<Direction, AnimationSource> = {
  w: { src: IMG_WALK_UP, frames: { max: 8 } },
  a: { src: IMG_WALK_LEFT, frames: { max: 8 } },
  s: { src: IMG_WALK_DOWN, frames: { max: 8 } },
  d: { src: IMG_WALK_RIGHT, frames: { max: 8 } },
};

export const IMGS_HUAZELEI_IDLE: Record<Direction, AnimationSource> = {
  w: IMG_IDLE_UP,
  a: IMG_IDLE_LEFT,
  s: IMG_IDLE_DOWN,
  d: IMG_IDLE_RIGHT,
};

export const PORTRAIT_HUAZELEI = img("portraits/huazelei-blue.jpg");
// Eagerly warms the shared image cache (load-image.ts) so this is already
// decoded by the time GameEngine.start()'s preload gate resolves. Without
// this, dialogue.ts's portrait <img> (one shared element, reused for every
// NPC) just keeps showing whoever was shown last for however long THIS
// fetch takes the first time it's ever needed — invisible in dev (already
// browser-cached from repeat testing), a real multi-second wrong-face flash
// in production on a first-ever page load.
loadImage(PORTRAIT_HUAZELEI);
export const DIALOGUE_COLOR_HUAZELEI = "blue";

import type { Direction } from "@/features/controller";
import type { AnimationSource } from "@/features/sprite-player";
import { img } from "@/lib/img";
import { loadImage } from "@/lib/load-image";

const IMG_PATH = "characters/f4/dao-ming-si";
const IMG_WALK_DOWN = img(`${IMG_PATH}/walk/south.png`);
const IMG_WALK_LEFT = img(`${IMG_PATH}/walk/west.png`);
const IMG_WALK_RIGHT = img(`${IMG_PATH}/walk/east.png`);
const IMG_WALK_UP = img(`${IMG_PATH}/walk/north.png`);
const IMG_IDLE_DOWN = img(`${IMG_PATH}/idle/south.png`);
const IMG_IDLE_LEFT = img(`${IMG_PATH}/idle/west.png`);
const IMG_IDLE_RIGHT = img(`${IMG_PATH}/idle/east.png`);
const IMG_IDLE_UP = img(`${IMG_PATH}/idle/north.png`);

export const IMGS_DAOMINGSI_WALK: Record<Direction, AnimationSource> = {
  w: { src: IMG_WALK_UP, frames: { max: 8 } },
  a: { src: IMG_WALK_LEFT, frames: { max: 8 } },
  s: { src: IMG_WALK_DOWN, frames: { max: 8 } },
  d: { src: IMG_WALK_RIGHT, frames: { max: 8 } },
};

export const IMGS_DAOMINGSI_IDLE: Record<Direction, AnimationSource> = {
  w: IMG_IDLE_UP,
  a: IMG_IDLE_LEFT,
  s: IMG_IDLE_DOWN,
  d: IMG_IDLE_RIGHT,
};

export const PORTRAIT_DAOMINGSI = img("portraits/daomingsi.jpg");
export const PORTRAIT_DAOMINGSI_INTIMIDATE = img("portraits/daomingsi-intimidate.jpg");
// Eagerly warms the shared image cache — see hua-ze-lei.ts's own PORTRAIT_
// loadImage() call for why.
loadImage(PORTRAIT_DAOMINGSI);
loadImage(PORTRAIT_DAOMINGSI_INTIMIDATE);
export const DIALOGUE_COLOR_DAOMINGSI = "red";

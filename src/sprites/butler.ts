import type { Direction } from "@/features/controller";
import type { AnimationSource } from "@/features/sprite-player";
import { img } from "@/lib/img";
import { loadImage } from "@/lib/load-image";

const IMG_PATH = "characters/others/butler";
const IMG_IDLE_DOWN = img(`${IMG_PATH}/idle/south.png`);
const IMG_IDLE_LEFT = img(`${IMG_PATH}/idle/west.png`);
const IMG_IDLE_RIGHT = img(`${IMG_PATH}/idle/east.png`);
const IMG_IDLE_UP = img(`${IMG_PATH}/idle/north.png`);

export const IMGS_BUTLER_IDLE: Record<Direction, AnimationSource> = {
  w: IMG_IDLE_UP,
  a: IMG_IDLE_LEFT,
  s: IMG_IDLE_DOWN,
  d: IMG_IDLE_RIGHT,
};

export const PORTRAIT_BUTLER = img("portraits/liu.jpg");
// Eagerly warms the shared image cache — see hua-ze-lei.ts's own PORTRAIT_
// loadImage() call for why.
loadImage(PORTRAIT_BUTLER);

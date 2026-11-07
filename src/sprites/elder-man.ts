import type { Direction } from "@/features/controller";
import type { AnimationSource } from "@/features/sprite-player";
import { img } from "@/lib/img";

const IMG_PATH = "characters/others/elder-man";
const IMG_IDLE_DOWN = img(`${IMG_PATH}/idle/south.png`);
const IMG_IDLE_LEFT = img(`${IMG_PATH}/idle/west.png`);
const IMG_IDLE_RIGHT = img(`${IMG_PATH}/idle/east.png`);
const IMG_IDLE_UP = img(`${IMG_PATH}/idle/north.png`);

export const IMGS_ELDER_MAN_IDLE: Record<Direction, AnimationSource> = {
  w: IMG_IDLE_UP,
  a: IMG_IDLE_LEFT,
  s: IMG_IDLE_DOWN,
  d: IMG_IDLE_RIGHT,
};

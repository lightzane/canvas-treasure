import type { Direction } from "@/features/controller";
import type { AnimationSource } from "@/features/sprite-player";
import { img } from "@/lib/img";

const IMG_MAMA = "characters/parents/mama";
const IMG_MAMA_IDLE_DOWN = img(`${IMG_MAMA}/idle/south.png`);
const IMG_MAMA_IDLE_LEFT = img(`${IMG_MAMA}/idle/west.png`);
const IMG_MAMA_IDLE_RIGHT = img(`${IMG_MAMA}/idle/east.png`);
const IMG_MAMA_IDLE_UP = img(`${IMG_MAMA}/idle/north.png`);

export const IMGS_MAMA_IDLE: Record<Direction, AnimationSource> = {
  w: IMG_MAMA_IDLE_UP,
  a: IMG_MAMA_IDLE_LEFT,
  s: IMG_MAMA_IDLE_DOWN,
  d: IMG_MAMA_IDLE_RIGHT,
};

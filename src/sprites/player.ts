import type { Direction } from "@/features/controller";
import type { AnimationSource } from "@/features/sprite-player";
import { img } from "@/lib/img";

const IMG_PLAYER = "characters/main/female";
const IMG_PLAYER_WALK_DOWN = img(`${IMG_PLAYER}/walk/south.png`);
const IMG_PLAYER_WALK_LEFT = img(`${IMG_PLAYER}/walk/west.png`);
const IMG_PLAYER_WALK_RIGHT = img(`${IMG_PLAYER}/walk/east.png`);
const IMG_PLAYER_WALK_UP = img(`${IMG_PLAYER}/walk/north.png`);
const IMG_PLAYER_IDLE_DOWN = img(`${IMG_PLAYER}/idle/south.png`);
const IMG_PLAYER_IDLE_LEFT = img(`${IMG_PLAYER}/idle/west.png`);
const IMG_PLAYER_IDLE_RIGHT = img(`${IMG_PLAYER}/idle/east.png`);
const IMG_PLAYER_IDLE_UP = img(`${IMG_PLAYER}/idle/north.png`);

export const IMGS_PLAYER_WALK: Record<Direction, AnimationSource> = {
  w: { src: IMG_PLAYER_WALK_UP, frames: { max: 8 } },
  a: { src: IMG_PLAYER_WALK_LEFT, frames: { max: 8 } },
  s: { src: IMG_PLAYER_WALK_DOWN, frames: { max: 8 } },
  d: { src: IMG_PLAYER_WALK_RIGHT, frames: { max: 8 } },
};

export const IMGS_PLAYER_IDLE: Record<Direction, AnimationSource> = {
  w: IMG_PLAYER_IDLE_UP,
  a: IMG_PLAYER_IDLE_LEFT,
  s: IMG_PLAYER_IDLE_DOWN,
  d: IMG_PLAYER_IDLE_RIGHT,
};

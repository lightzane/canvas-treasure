import type { Direction } from "@/features/controller";
import { Sprite } from "@/features/sprite";
import { loadImage } from "@/lib/load-image";

/** A bare string uses that clip's default { max: 1, hold: 90 } — same static default Sprite itself uses. */
export type AnimationSource = string | { src: string; frames?: { max?: number; hold?: number } };

/** Feet-sized hitbox shared by most player/NPC sprites — override per-instance only when a character's footprint actually differs. */
const DEFAULT_COLLISION_BOX = { width: 32, height: 32, anchor: "bottom" as const };

interface AnimationClip {
  image: HTMLImageElement;
  frames: { max: number; hold: number; val: number; elapsed: number };
}

function loadClip(source: AnimationSource): AnimationClip {
  const { src, frames } = typeof source === "string" ? { src: source, frames: undefined } : source;
  return {
    image: loadImage(src),
    frames: { max: frames?.max ?? 1, hold: frames?.hold ?? 90, val: 0, elapsed: 0 },
  };
}

function loadClips(sprites: Record<string, Record<Direction, AnimationSource>>) {
  const clips: Record<string, Record<Direction, AnimationClip>> = {};
  for (const state in sprites) {
    clips[state] = {} as Record<Direction, AnimationClip>;
    for (const direction in sprites[state]) {
      clips[state][direction as Direction] = loadClip(sprites[state][direction as Direction]);
    }
  }
  return clips;
}

export interface PlayerProps {
  position?: { x: number; y: number };
  /**
   * Only declare the states this entity actually has — an idle-only NPC
   * supplies just `{ idle: {...} }`. A declared state must cover every
   * direction the entity can face — point a direction at a substitute
   * source yourself if dedicated art isn't ready; this class does no
   * borrowing/guessing on your behalf.
   */
  sprites: Record<string, Record<Direction, AnimationSource>>;
  /** Which key of `sprites` to start on. Defaults to the first one declared. */
  initialSprite?: string;
  facing?: Direction;
  moveSpeed?: number;
  /** Fixed size for camera/drawing. Each axis defaults independently to the starting sprite's own rendered size. */
  boxSize?: { width?: number; height?: number };
  /** Smaller rect used only for wall-collision checks. See `Sprite`'s `collisionBox` for details. */
  collisionBox?: { width?: number; height?: number; anchor?: "top" | "center" | "bottom" };
  /** Nudges this sprite's shadow — see `Sprite`'s `shadowOffset` for details. @default { x: 0, y: 0 } */
  shadowOffset?: { x?: number; y?: number };
  /** Multiplier applied to the drawn size only — never affects frame cropping. @default 1 */
  scale?: number;
}

export class PlayerSprite extends Sprite {
  private readonly clips: Record<string, Record<Direction, AnimationClip>>;

  private _state: string;
  private _facing: Direction;

  get state() {
    return this._state;
  }
  get facing() {
    return this._facing;
  }

  /** Movement speed per second (e.g. **200px/sec**) @default 200 */
  moveSpeed: NonNullable<PlayerProps["moveSpeed"]>;

  constructor({
    sprites,
    position,
    initialSprite,
    facing = "s",
    moveSpeed = 200,
    boxSize,
    collisionBox,
    shadowOffset,
    scale = 1,
  }: PlayerProps) {
    const clips = loadClips(sprites);
    const initial = initialSprite ?? Object.keys(clips)[0];
    const initialClip = clips[initial][facing];
    const resolvedBoxSize = boxSize ?? {
      width: (initialClip.image.width / initialClip.frames.max) * scale,
      height: initialClip.image.height * scale,
    };

    super({
      src: initialClip.image.src,
      position,
      frames: initialClip.frames,
      boxSize: resolvedBoxSize,
      // Merged, not replaced by `??` — overriding just one axis (e.g.
      // `{ width: 20 }`) would otherwise silently drop the default
      // `anchor`/other axis instead of only overriding what was given.
      collisionBox: { ...DEFAULT_COLLISION_BOX, ...collisionBox },
      shadow: true,
      shadowOffset,
      scale,
    });

    this.clips = clips;
    this._state = initial;
    this._facing = facing;
    this.moveSpeed = moveSpeed;
  }

  /** Which state to play (idle/walk/run/...). Just tracks intent — update() picks it up next frame. */
  play(state: string) {
    this._state = state;
  }

  /** Which direction to face. Independent of play() — not every frame changes both. */
  face(direction: Direction) {
    this._facing = direction;
  }

  update(dt: number) {
    const clip = this.clips[this._state][this._facing];
    this.image = clip.image;
    this.frames = clip.frames;
    super.update(dt);
  }

  /** All loaded images across every state — used by preload(), not for drawing. */
  get images() {
    return Object.values(this.clips).flatMap((byDirection) =>
      Object.values(byDirection).map((clip) => clip.image),
    );
  }
}

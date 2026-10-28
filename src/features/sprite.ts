import { toScreen } from "@/lib/canvas/screen";
import { loadImage } from "@/lib/load-image";

export type Position = { x: number; y: number };

// Shadow matches the map art's light source: sun at ~12 o'clock, ~70° above the horizon.
const SUN_CLOCK_HOUR = 12;
const SUN_ELEVATION_DEG = 70;

// The shadow falls opposite the sun; its length shrinks as the sun gets higher (H / tan(elevation)).
const SHADOW_ANGLE = (((SUN_CLOCK_HOUR + 6) % 12) * 30 * Math.PI) / 180;
const SHADOW_DIRECTION = { x: Math.sin(SHADOW_ANGLE), y: -Math.cos(SHADOW_ANGLE) };
const SHADOW_LENGTH_RATIO = 1 / Math.tan((SUN_ELEVATION_DEG * Math.PI) / 180);

interface SpriteProps {
  /** The `src` for the underlying `<img>` element. */
  src: string;
  position?: Position;
  frames?: SpriteFrames;
  /**
   * Fixed size used for camera/drawing math, independent of the current
   * frame's own pixel size. Defaults to the current frame's own size when
   * omitted — so most sprites never need to set this at all.
   */
  boxSize?: { width: number; height: number };
  /**
   * Smaller rect used only for wall-collision checks — independent of
   * `boxSize`, which keeps driving the camera and drawing. Always centered
   * horizontally inside `boxSize`; `anchor` picks where it sits vertically
   * (e.g. `"bottom"` for a feet-only hitbox under a taller sprite). Defaults
   * to `boxSize` itself (anchored at `position`) when omitted.
   */
  collisionBox?: { width: number; height: number; anchor?: "top" | "center" | "bottom" };
  /** A flat ellipse drawn under the sprite, anchored to `boxSize`'s bottom edge. @default false */
  shadow?: boolean;
  /** Multiplier applied to the drawn size only — never affects frame cropping. @default 1 */
  scale?: number;
}

interface SpriteFrames {
  /** frames in the sprite sheet @default 1 */
  max?: number;
  /** current frame index @default 0 */
  val?: number;
  /** milliseconds since last advance @default 0 */
  elapsed?: number;
  /**
   * milliseconds to wait before advancing
   * is what keeps the walk cycle human-paced — without it
   * you'd advance a frame every tick, which looks like a
   * blur, not a walk.
   * @default 167
   */
  hold?: number;
}

export class Sprite {
  image: HTMLImageElement;
  position: NonNullable<SpriteProps["position"]>;
  frames: Required<NonNullable<SpriteProps["frames"]>>;
  opacity = 1;
  scale: number;
  private readonly _boxSize?: { width: number; height: number };
  private readonly _collisionBoxSize?: SpriteProps["collisionBox"];
  private readonly shadow: boolean;

  constructor({
    src,
    position = { x: 0, y: 0 },
    frames = { max: 1 },
    boxSize,
    collisionBox,
    shadow = false,
    scale = 1,
  }: SpriteProps) {
    this.image = loadImage(src);
    this.position = position;
    this.frames = { max: 1, hold: 90, val: 0, elapsed: 0, ...frames };
    this._boxSize = boxSize;
    this._collisionBoxSize = collisionBox;
    this.shadow = shadow;
    this.scale = scale;
  }

  get width() {
    return this.image.width / this.frames.max;
  }

  get height() {
    return this.image.height;
  }

  get size() {
    return {
      width: this.width,
      height: this.height,
    };
  }

  /** The size the current frame is actually drawn at, after `scale`. Crop size (`width`/`height`) is unaffected. */
  get renderSize() {
    return {
      width: this.width * this.scale,
      height: this.height * this.scale,
    };
  }

  /** Fixed box for camera/drawing — defaults to the current frame's own rendered size. */
  get boxSize() {
    return this._boxSize ?? this.renderSize;
  }

  /** Rect used for wall-collision checks. Defaults to `boxSize` (anchored at `position`) when `collisionBox` isn't set. */
  get collisionBox(): { position: Position; width: number; height: number } {
    const box = this.boxSize;
    const size = this._collisionBoxSize;

    if (!size) {
      return {
        position: { x: this.position.x, y: this.position.y },
        width: box.width,
        height: box.height,
      };
    }

    const y =
      size.anchor === "top"
        ? 0
        : size.anchor === "center"
          ? (box.height - size.height) / 2
          : box.height - size.height;

    return {
      position: {
        x: this.position.x + (box.width - size.width) / 2,
        y: this.position.y + y,
      },
      width: size.width,
      height: size.height,
    };
  }

  /**
   * How far off `position` to actually paint the current frame so it stays
   * centered on `boxSize` regardless of the frame's own pixel size. Zero for
   * any sprite that never sets `boxSize` — draw() behaves exactly as before.
   */
  get drawOffset() {
    const render = this.renderSize;
    return {
      x: (this.boxSize.width - render.width) / 2,
      y: (this.boxSize.height - render.height) / 2,
    };
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.image) return;

    const { x, y } = toScreen(this.position);
    const offset = this.drawOffset;
    const render = this.renderSize;

    if (this.shadow) this.drawShadow(ctx, x, y);

    // Basic
    // ctx.drawImage(this.image, x, y);

    // With Sprite frames
    const sx = this.frames.val * this.width;

    ctx.globalAlpha = this.opacity;
    ctx.drawImage(
      this.image,
      // (source) crop here — always the real pixel size, unaffected by scale
      sx, // starts at 0
      0,
      this.width,
      this.height,
      // (destination) paint here — scaled
      x + offset.x,
      y + offset.y,
      render.width,
      render.height,
    );

    // Debug Collision Box
    // if (import.meta.env.DEV) {
    //   if (this._collisionBoxSize) {
    //     ctx.strokeStyle = "lime";
    //     ctx.lineWidth = 2;
    //     const { x: collisionX, y: collisionY } = toScreen(this.collisionBox.position);
    //     ctx.strokeRect(collisionX, collisionY, this.collisionBox.width, this.collisionBox.height);
    //   }
    // }
  }

  /** A flat ellipse under the sprite, nudged toward the map's implied shadow direction. */
  private drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const box = this.boxSize;
    const shadowWidth = box.width * 0.6;
    const shadowHeight = shadowWidth * 0.35;
    // A small directional nudge, not the character's full height — real shadow-casting
    // math produces an offset way too large for a stylized sprite this size.
    const shadowLength = shadowWidth * SHADOW_LENGTH_RATIO * 0.3;

    // Pulled up so the ellipse hugs the feet instead of hanging below them.
    const groundX = x + box.width / 2 + SHADOW_DIRECTION.x * shadowLength;
    const groundY = y + box.height - shadowHeight * 0.5 + SHADOW_DIRECTION.y * shadowLength;

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.ellipse(groundX, groundY, shadowWidth / 2, shadowHeight / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  update(dt: number) {
    if (this.frames.max <= 1) return;

    this.frames.elapsed += dt * 1000; // — dt is seconds, elapsed/hold are ms

    if (this.frames.elapsed >= this.frames.hold) {
      this.frames.elapsed -= this.frames.hold; // carries the remainder, avoids drift
      this.frames.val = ++this.frames.val % this.frames.max;
    }
  }
}

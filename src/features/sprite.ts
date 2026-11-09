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
   * frame's own pixel size. Each axis defaults independently to the current
   * frame's own rendered size when omitted — so overriding just `width` (or
   * just `height`) doesn't force you to also supply the other.
   */
  boxSize?: { width?: number; height?: number };
  /**
   * Smaller rect used only for wall-collision checks — independent of
   * `boxSize`, which keeps driving the camera and drawing. Always centered
   * horizontally inside `boxSize`; `anchor` picks where it sits vertically
   * (e.g. `"bottom"` for a feet-only hitbox under a taller sprite). Each axis
   * defaults independently to `boxSize`'s own size when omitted, same as
   * `boxSize` itself does against the render size.
   */
  collisionBox?: { width?: number; height?: number; anchor?: "top" | "center" | "bottom" };
  /** A flat ellipse drawn under the sprite, anchored to `boxSize`'s bottom edge. @default false */
  shadow?: boolean;
  /**
   * Nudges the shadow independently of `boxSize`'s own feet-anchor math.
   * Different sprite sheets don't all place the feet at the same relative
   * spot within their own frame, so the shadow (always anchored off
   * `boxSize`'s bottom edge) can land visibly off a particular sprite's
   * feet — tune this per-instance to correct just that one. Each axis
   * defaults independently to 0 when omitted. @default { x: 0, y: 0 }
   */
  shadowOffset?: { x?: number; y?: number };
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
  /** Px nudge applied only to the drawn image (e.g. by `playAttentionBounce`) — unlike `position`, never affects the shadow, collision, or camera. @default 0 */
  bounceOffset = 0;
  /**
   * Not `private`/`readonly` — `PlayerSprite`'s constructor needs to correct
   * this itself after construction, once its initial clip's image actually
   * finishes loading (see the comment where it's set there). Everyone else
   * should still treat this as read-only; `boxSize` (the getter below) is
   * the public way to read it.
   */
  protected _boxSize?: { width?: number; height?: number };
  private readonly _collisionBoxSize?: SpriteProps["collisionBox"];
  private readonly shadow: boolean;
  private readonly _shadowOffset: { x: number; y: number };

  constructor({
    src,
    position = { x: 0, y: 0 },
    frames = { max: 1 },
    boxSize,
    collisionBox,
    shadow = false,
    shadowOffset,
    scale = 1,
  }: SpriteProps) {
    this.image = loadImage(src);
    this.position = position;
    this.frames = { max: 1, hold: 90, val: 0, elapsed: 0, ...frames };
    this._boxSize = boxSize;
    this._collisionBoxSize = collisionBox;
    this.shadow = shadow;
    this._shadowOffset = { x: shadowOffset?.x ?? 0, y: shadowOffset?.y ?? 0 };
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

  /** Fixed box for camera/drawing — each axis defaults independently to the current frame's own rendered size. */
  get boxSize(): { width: number; height: number } {
    const render = this.renderSize;
    return {
      width: this._boxSize?.width ?? render.width,
      height: this._boxSize?.height ?? render.height,
    };
  }

  /** Rect used for wall-collision checks. Each axis defaults independently to `boxSize`'s own size (anchored at `position`) when `collisionBox` isn't set. */
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

    const width = size.width ?? box.width;
    const height = size.height ?? box.height;

    const y =
      size.anchor === "top"
        ? 0
        : size.anchor === "center"
          ? (box.height - height) / 2
          : box.height - height;

    return {
      position: {
        x: this.position.x + (box.width - width) / 2,
        y: this.position.y + y,
      },
      width,
      height,
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
      y + offset.y + this.bounceOffset,
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
    const groundX = x + box.width / 2 + SHADOW_DIRECTION.x * shadowLength + this._shadowOffset.x;
    const groundY = y + box.height - shadowHeight * 0.5 + SHADOW_DIRECTION.y * shadowLength + this._shadowOffset.y; // prettier-ignore

    // Manually snapshot/restore just the two properties touched here, rather than
    // ctx.save()/restore() — a full state push/pop for two values measured as
    // disproportionately expensive in this environment (a captured performance
    // trace showed it as the single biggest main-thread cost, called twice a
    // frame for the player + one NPC — far more than the shadow draw itself).
    const prevAlpha = ctx.globalAlpha;
    const prevFillStyle = ctx.fillStyle;
    // Shrinks as the sprite rises (bounceOffset is negative going up) —
    // clamped so it never shrinks past half size even on a tall hop.
    const shrink = 1 - Math.min(Math.abs(this.bounceOffset) / 80, 0.5);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.ellipse(
      groundX,
      groundY,
      (shadowWidth / 2) * shrink,
      (shadowHeight / 2) * shrink,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.globalAlpha = prevAlpha;
    ctx.fillStyle = prevFillStyle;
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

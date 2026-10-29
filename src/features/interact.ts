import { GAME_FONT_FAMILY } from "@/constants/game-settings";
import { isColliding, type Rect } from "@/features/collisions";
import type { Direction } from "@/features/controller";
import { GAME_STATE } from "@/features/game-state";
import type { Sprite } from "@/features/sprite";
import { PlayerSprite } from "@/features/sprite-player";
import { toScreen } from "@/lib/canvas/screen";

const DEFAULT_PROBE_DISTANCE = 64; // px — how far ahead of the player to reach, unless an interactable sets its own

// prettier-ignore
const OPPOSITE_DIRECTION: Record<Direction, Direction> = { w: "s", s: "w", a: "d", d: "a" };

export interface Interactable {
  sprite: Sprite;
  /** How far ahead of the player this one can be reached from, in px — e.g. wider for something sitting across a table. @default 64 */
  probeDistance?: number;
  /** Turn to face the player once interacted with. No-op for a plain `Sprite` (only a `PlayerSprite` — an NPC — can face anything). @default true */
  facePlayer?: boolean;
  /** Verb shown in the prompt popup above this one's head while it's the player's current target — "talk", "get", "open", ... @default "interact" */
  label?: string;
}

interface FacingProbeOptions {
  box: Rect;
  facing: Direction;
  distance: number;
}

/** The small probe rect immediately past `facing`'s edge of `box`, extending `distance` further outward. */
function getFacingProbe({ box, facing, distance }: FacingProbeOptions): Rect {
  const { position, width, height } = box;

  // prettier-ignore
  switch (facing) {
    case "w": return { position: { x: position.x, y: position.y - distance }, width, height: distance };
    case "s": return { position: { x: position.x, y: position.y + height }, width, height: distance };
    case "a": return { position: { x: position.x - distance, y: position.y }, width: distance, height };
    case "d": return { position: { x: position.x + width, y: position.y }, width: distance, height };
  }
}

/** Shared lookup — no side effects. Whichever `GAME_STATE.interactables` entry the player is directly facing, within its own `probeDistance`, or `undefined`. */
function resolveFacedInteractable(player: {
  collisionBox: Rect;
  facing: Direction;
}): Interactable | undefined {
  return GAME_STATE.interactables.find((interactable) => {
    const distance = interactable.probeDistance ?? DEFAULT_PROBE_DISTANCE;
    const probe = getFacingProbe({ box: player.collisionBox, facing: player.facing, distance });
    return isColliding(probe, interactable.sprite.collisionBox);
  });
}

/**
 * Finds whichever of `GAME_STATE.interactables` the player is directly
 * facing — a small probe just ahead of the player's own collision box, in
 * whichever direction *they're* facing, reaching out each interactable's
 * own `probeDistance` (so e.g. a parcel sitting across a table can still be
 * reached without widening everyone else's range). In a cluster (a queue, a
 * crowd), this naturally picks at most one — whoever's actually standing in
 * that reach — instead of needing a tie-breaker between several "nearby"
 * candidates.
 *
 * Pure — no side effects, so it's fine to call every frame (e.g. to drive a
 * "you can interact with this" highlight via `drawInteractHighlight`), not
 * just on an interact keypress. For the moment of an actual interaction,
 * use `interact()` instead — it does the same lookup but also applies the
 * `facePlayer` default, which should only happen once, on the real press.
 *
 * @example
 * const target = findFacedTarget(GAME_STATE.player);
 * if (target) drawInteractHighlight(ctx, target);
 */
export function findFacedTarget(player: {
  collisionBox: Rect;
  facing: Direction;
}): Sprite | undefined {
  return resolveFacedInteractable(player)?.sprite;
}

/**
 * Same lookup as `findFacedTarget`, but also turns the match to face the
 * player back (the `facePlayer` default — set `false` on its `Interactable`
 * entry to opt out; no-op for a plain `Sprite`, only an NPC can face
 * anything). Call this only at the actual moment of interacting (a
 * keypress) — calling it every frame would make an NPC snap to face the
 * player continuously just from being in proximity, not only when actually
 * interacted with.
 *
 * @example
 * if (GAME_STATE.keys.justPressed.z) {
 *   const target = interact(GAME_STATE.player);
 *   if (target === GAME_STATE.mama) DIALOGUE.show("...");
 * }
 */
export function interact(player: { collisionBox: Rect; facing: Direction }): Sprite | undefined {
  const match = resolveFacedInteractable(player);
  if (!match) return undefined;

  if ((match.facePlayer ?? true) && match.sprite instanceof PlayerSprite) {
    match.sprite.face(OPPOSITE_DIRECTION[player.facing]);
  }

  return match.sprite;
}

/**
 * Draws a small label popup ("interact", "talk", "get", ...) above
 * `sprite`'s head — a "here's what pressing Z does" cue. Call it in a
 * scene's `draw()`, before drawing `sprite` itself, whenever
 * `findFacedTarget()` currently returns it. Looks up the label from this
 * sprite's own `Interactable` entry (`label`, default `"interact"`) — pass
 * just the sprite, same as `findFacedTarget`'s own return value. Purely
 * visual; doesn't change any interaction logic. Also doubles as a live
 * debugging aid for `probeDistance`/collision-box tuning — you can
 * literally watch when the probe considers something targeted, instead of
 * guessing from screenshots.
 */
export function drawInteractPrompt(ctx: CanvasRenderingContext2D, sprite: Sprite) {
  const label = GAME_STATE.interactables.find((i) => i.sprite === sprite)?.label ?? "Interact";

  const { x, y } = toScreen(sprite.position);
  const centerX = x + sprite.boxSize.width / 2;
  const headY = y - 10; // gap above the sprite's head

  // Manually snapshot/restore just the properties touched here, rather than
  // ctx.save()/restore() — see the same fix + rationale in Sprite.drawShadow().
  const prevFont = ctx.font;
  const prevTextAlign = ctx.textAlign;
  const prevTextBaseline = ctx.textBaseline;
  const prevFillStyle = ctx.fillStyle;

  ctx.font = `700 16px ${GAME_FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  const paddingX = 10;
  const paddingY = 6;
  const textWidth = ctx.measureText(label).width;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = 16 + paddingY * 2;
  const boxLeft = centerX - boxWidth / 2;
  const boxTop = headY - boxHeight;

  ctx.beginPath();
  ctx.roundRect(boxLeft, boxTop, boxWidth, boxHeight, 6);
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.fillText(label, centerX, headY - paddingY);

  ctx.font = prevFont;
  ctx.textAlign = prevTextAlign;
  ctx.textBaseline = prevTextBaseline;
  ctx.fillStyle = prevFillStyle;
}

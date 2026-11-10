import { GAME_FONT_FAMILY } from "@/constants/game-settings";
import { isColliding, type Rect } from "@/features/collisions";
import type { Direction } from "@/features/controller";
import { GAME_STATE } from "@/features/game-state";
import { resolveBox, Sprite, type BoxShape } from "@/features/sprite";
import { PlayerSprite } from "@/features/sprite-player";
import { audioPlaySound } from "@/lib/audio";
import { DIALOGUE } from "@/lib/canvas/dialogue";
import { toScreen } from "@/lib/canvas/screen";

const DEFAULT_PROBE_DISTANCE = 64; // px — how far ahead of the player to reach, unless an interactable sets its own

// prettier-ignore
const OPPOSITE_DIRECTION: Record<Direction, Direction> = { w: "s", s: "w", a: "d", d: "a" };

export interface InteractableConfig {
  sprite: Sprite;
  /** How far ahead of the player this one can be reached from, in px — e.g. wider for something sitting across a table. @default 64 */
  probeDistance?: number;
  /** Turn to face the player once interacted with. No-op for a plain `Sprite` (only a `PlayerSprite` — an NPC — can face anything). @default true */
  facePlayer?: boolean;
  /** Verb shown in the prompt popup above this one's head while it's the player's current target — "talk", "get", "open", ... @default "Talk" */
  label?: string;
  /** Nudges the label popup's position, in screen px, relative to its default (horizontally centered on `boxSize`, just above the sprite's head) — not every sprite's artwork is drawn the same relative to its own `position`/`boxSize`, so this corrects per sprite rather than needing one offset that fits everyone. @default { x: 0, y: 0 } */
  labelOffset?: { x?: number; y?: number };
  /**
   * Overrides what the interact probe checks against — same shape as
   * `Sprite`'s own `collisionBox`, resolved the same way, just independent
   * of it. Needed when `collisionBox` has been narrowed for movement
   * precision to the point of being an unreliable target to land a probe
   * on (e.g. a signpost's collision trimmed to just its post, a few px
   * tall — fine for blocking movement, too thin to reliably catch with a
   * probe). A bare `{}` resolves to the sprite's full `boxSize`. Every
   * interactable that doesn't set this keeps checking `sprite.collisionBox`
   * exactly as before. @default sprite.collisionBox
   */
  probeBox?: BoxShape;
}

/**
 * One entry in a scene's interactables list — either the bare `Sprite`
 * itself (shorthand for `{ sprite }`, every option left at its default), or
 * the full config object once something needs customizing.
 *
 * @example
 * const INTERACTABLES: Interactable[] = [
 *   npcSimple, // shorthand — nothing to customize
 *   { sprite: chest, label: "Open", probeDistance: 48 },
 * ];
 */
export type Interactable = Sprite | InteractableConfig;

/**
 * Normalizes one `Interactable` entry to its full config shape — the one
 * place that knows about the bare-`Sprite` shorthand, so every lookup below
 * just reads `.sprite`/`.label`/etc. without re-checking which shape it got.
 */
function toConfig(entry: Interactable): InteractableConfig {
  return entry instanceof Sprite ? { sprite: entry } : entry;
}

/**
 * Drops whichever `Interactable` entry wraps `sprite` out of `list`, in
 * place — the `Interactable[]` counterpart to `remove()` (`lib/array.ts`).
 * Plain `remove()` can't do this itself: a scene's interactables list holds
 * wrapper objects (`{ sprite, label }`) for anything customized, not just
 * the sprites themselves, so `remove(list, sprite)` can never find those —
 * it'd need the *exact* wrapper object reference, which usually isn't kept
 * around anywhere (e.g. one built inline at
 * `addOnce(INTERACTABLES, { sprite, label: "..." })`). A no-op if no entry
 * wraps `sprite`.
 */
export function removeInteractable(list: Interactable[], sprite: Sprite) {
  const i = list.findIndex((entry) => toConfig(entry).sprite === sprite);
  if (i !== -1) list.splice(i, 1);
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

/**
 * Shared lookup — no side effects. Whichever of `interactables` the player
 * is directly facing, within its own `probeDistance`, or `undefined`.
 * Checks against `probeBox` when an entry sets one, else `sprite.collisionBox`
 * — see `InteractableConfig.probeBox` for why those two can differ.
 */
function resolveFacedInteractable(
  player: { collisionBox: Rect; facing: Direction },
  interactables: Interactable[],
): InteractableConfig | undefined {
  return interactables.map(toConfig).find((config) => {
    const distance = config.probeDistance ?? DEFAULT_PROBE_DISTANCE;
    const probe = getFacingProbe({ box: player.collisionBox, facing: player.facing, distance });
    const target = config.probeBox
      ? resolveBox(config.sprite.position, config.sprite.boxSize, config.probeBox)
      : config.sprite.collisionBox;
    return isColliding(probe, target);
  });
}

/**
 * Finds whichever of `interactables` the player is directly facing — a
 * small probe just ahead of the player's own collision box, in whichever
 * direction *they're* facing, reaching out each interactable's own
 * `probeDistance` (so e.g. a parcel sitting across a table can still be
 * reached without widening everyone else's range). In a cluster (a queue, a
 * crowd), this naturally picks at most one — whoever's actually standing in
 * that reach — instead of needing a tie-breaker between several "nearby"
 * candidates.
 *
 * `interactables` is whichever list the current scene owns (its own
 * module-level array — see e.g. `mansion.ts`), passed in explicitly rather
 * than read from shared state, same as `checkTriggerZones` takes `zones`.
 *
 * Pure — no side effects, so it's fine to call every frame (e.g. to drive a
 * "you can interact with this" highlight via `drawInteractHighlight`), not
 * just on an interact keypress. For the moment of an actual interaction,
 * use `interact()` instead — it does the same lookup but also applies the
 * `facePlayer` default, which should only happen once, on the real press.
 *
 * @example
 * const target = findFacedTarget(GAME_STATE.player, INTERACTABLES);
 * if (target) drawInteractHighlight(ctx, target);
 */
export function findFacedTarget(
  player: { collisionBox: Rect; facing: Direction },
  interactables: Interactable[],
): Sprite | undefined {
  return resolveFacedInteractable(player, interactables)?.sprite;
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
 *   const target = interact(GAME_STATE.player, INTERACTABLES);
 *   if (target === GAME_STATE.mama) DIALOGUE.show("...");
 * }
 */
export function interact(
  player: { collisionBox: Rect; facing: Direction },
  interactables: Interactable[],
): Sprite | undefined {
  const match = resolveFacedInteractable(player, interactables);
  if (!match) return undefined;

  if ((match.facePlayer ?? true) && match.sprite instanceof PlayerSprite) {
    match.sprite.face(OPPOSITE_DIRECTION[player.facing]);
  }

  audioPlaySound("click", { volume: 0.5 });
  return match.sprite;
}

/**
 * Drives the interact system for one frame — the shared gate + lookup +
 * keypress logic every scene was repeating in its own `update()`:
 * recomputes `GAME_STATE.facedTarget` (cleared while mid-dialogue or
 * movement-locked, so nothing can be interacted with then), and — only on
 * the frame Z is actually pressed, and only while able to act — calls
 * `onInteract` with whatever `interact()` resolves. Combine `onInteract`
 * with per-target conditions of your own (progress flags, item ownership,
 * ...), same as every scene's own `interactions()` already does.
 *
 * @example
 * update(dt) {
 *   // ...movement, trigger zones...
 *   updateInteraction(INTERACTABLES, interactions);
 * }
 */
export function updateInteraction(
  interactables: Interactable[],
  onInteract: (target: Sprite | undefined) => void,
) {
  const canAct = !DIALOGUE.isActive && !GAME_STATE.movementLocked && GAME_STATE.gameStarted;
  GAME_STATE.facedTarget = canAct ? findFacedTarget(GAME_STATE.player, interactables) : undefined;
  if (canAct && GAME_STATE.keys.justPressed.z) {
    onInteract(interact(GAME_STATE.player, interactables));
  }
}

/**
 * Draws a small label popup ("interact", "talk", "get", ...) above
 * `sprite`'s head — a "here's what pressing Z does" cue. Call it in a
 * scene's `draw()`, before drawing `sprite` itself, whenever
 * `findFacedTarget()` currently returns it. Looks up the label from this
 * sprite's own `Interactable` entry in `interactables` (`label`, default
 * `"interact"`) — same list you'd pass to `updateInteraction`. Purely
 * visual; doesn't change any interaction logic. Also doubles as a live
 * debugging aid for `probeDistance`/collision-box tuning — you can
 * literally watch when the probe considers something targeted, instead of
 * guessing from screenshots.
 */
export function drawInteractPrompt(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  interactables: Interactable[],
) {
  const entry = interactables.map(toConfig).find((config) => config.sprite === sprite);
  const label = entry?.label ?? "Talk";
  const offsetX = entry?.labelOffset?.x ?? 0;
  const offsetY = entry?.labelOffset?.y ?? 0;

  const { x, y } = toScreen(sprite.position);
  const centerX = x + sprite.boxSize.width / 2 + offsetX;
  const headY = y - 10 + offsetY; // gap above the sprite's head, plus any per-sprite correction

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

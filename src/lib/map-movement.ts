import { RUN_SPEED_BONUS } from "@/constants/game-settings";
import { isColliding, type Rect } from "@/features/collisions";
import type { Direction } from "@/features/controller";
import { GAME_STATE } from "@/features/game-state";
import type { Position } from "@/features/sprite";
import { bagHasItem } from "@/lib/bag";
import { getPosSpawnTile } from "@/lib/positioning";
import { isSingleLeg, legTarget, type WalkLeg } from "@/lib/walk";
import gsap from "gsap";

/** Edge-detects `GAME_STATE.movementLocked` turning on, so `movePlayer` only forces idle once per lock, not every frame — see the comment where it's read. */
let wasLocked = false;

/**
 * Shared movement/camera step for any walkable map scene: reads input,
 * switches walk/idle animation, advances the player, blocks movement
 * against `GAME_STATE.boundaries`, and re-centers the camera on the player.
 *
 * Always returns the player's box for this frame — the attempted move box
 * when a direction's held (even when blocked), otherwise the player's
 * current, unchanged box — so a scene can unconditionally run its own zone
 * checks on it every frame (battle encounters, door exits, ...), not just
 * frames with input. That matters for a zone the player spawns already
 * standing inside: with no movement yet to produce a box, a zone check
 * gated on "only when the player moved" would never fire `onEnter` until
 * the first keypress, well after the player's already visibly inside it.
 */
export function movePlayer(dt: number): Rect {
  const player = GAME_STATE.player;

  if (GAME_STATE.movementLocked || !GAME_STATE.gameStarted) {
    // Force idle only on the frame locking *begins*, not every frame it
    // stays locked — otherwise this fights anything else driving the
    // player's animation during the lock (e.g. a scripted `walk()` call),
    // stomping its "walk" state back to idle next frame, forever. The
    // original point of forcing idle at all still holds: without it, a
    // player who was mid-walk-frame right as locking engaged (e.g. still
    // holding a direction key into a trigger zone) would stay visibly
    // stuck on that frame, since nothing advances it further on its own.
    if (!wasLocked) updateAnimation();
    wasLocked = true;
    player.update(dt); // keeps whatever animation is current playing, just blocks movement
    followCamera(); // still track the player (e.g. its freshly-placed spawn tile, or a scripted walk() tweening its position) — only input-driven movement is blocked, not the camera
    return player.collisionBox;
  }
  wasLocked = false;

  const direction = GAME_STATE.keys.pressed.at(-1);
  // GAME_STATE.allowRunning takes priority over everything else — a cramped
  // interior disables running outright, regardless of X held or shoes owned.
  const running = GAME_STATE.allowRunning && GAME_STATE.keys.actions.x && bagHasItem("shoes");

  updateAnimation({ direction, running });
  player.update(dt);

  let playerBox: Rect = player.collisionBox;

  if (direction) {
    // [Frame rate] if NO delta time, this will be 200px/tick
    // which can be faster in other devices (e.g. 60Hz, 120Hz, 144Hz)
    //
    // Sync with [Time-based]
    // movement 200px/sec — multiply with delta time
    const speed = player.moveSpeed + (running ? RUN_SPEED_BONUS : 0);
    const distance = speed * dt;
    const { dx, dy } = getMoveDelta(direction, distance);
    playerBox = attemptMove(dx, dy);
  }

  followCamera();

  return playerBox;
}

interface UpdateAnimationOptions {
  /** @default undefined — no direction held, plays idle */
  direction?: Direction;
  /** @default false */
  running?: boolean;
}

function updateAnimation({ direction, running = false }: UpdateAnimationOptions = {}) {
  const player = GAME_STATE.player;

  if (direction) {
    player.face(direction);
    player.play(running ? "run" : "walk");
  } else {
    player.play("idle");
  }
}

/** How far to move on each axis for `distance` px in `direction` — exported for `walk`'s relative-steps legs, same direction semantics as the player's own per-frame movement. */
export function getMoveDelta(direction: Direction, distance: number): { dx: number; dy: number } {
  if (direction === "w") return { dx: 0, dy: -distance };
  if (direction === "a") return { dx: -distance, dy: 0 };
  if (direction === "s") return { dx: 0, dy: distance };
  return { dx: distance, dy: 0 }; // "d"
}

/**
 * Builds the player's attempted box at `(dx, dy)`, blocks it against
 * `GAME_STATE.boundaries` (static) and `GAME_STATE.obstacles` (live sprites
 * — checked by their current `collisionBox` every call, so a moving NPC
 * keeps blocking correctly wherever it actually is), and commits the move
 * if it's clear.
 *
 * Both are shared fields, rebuilt fresh by each scene's own `enter()`
 * (`GAME_STATE.boundaries` via `createBoundaries` in `zone.ts`) before
 * gameplay starts there.
 */
function attemptMove(dx: number, dy: number): Rect {
  const player = GAME_STATE.player;
  const collisionBox = player.collisionBox;
  const playerBox: Rect = {
    width: collisionBox.width,
    height: collisionBox.height,
    position: {
      // the player is visually fixed, so test with inversed delta
      x: collisionBox.position.x + dx,
      y: collisionBox.position.y + dy,
    },
  };

  const blocked =
    GAME_STATE.boundaries.some((b) => isColliding(playerBox, b)) ||
    GAME_STATE.obstacles.some((o) => isColliding(playerBox, o.collisionBox));
  if (!blocked) {
    player.position = {
      x: player.position.x + dx,
      y: player.position.y + dy,
    };
  }

  return playerBox;
}

/** Re-centers the camera on `GAME_STATE.cameraTarget` (or the player, if that's `null`) — a no-op while `GAME_STATE.cameraFollow` is `false`, e.g. after `setCameraToTile`, so the manual placement isn't immediately overwritten next frame. */
function followCamera() {
  if (!GAME_STATE.cameraFollow) return;
  const target = GAME_STATE.cameraTarget ?? GAME_STATE.player;
  const targetCenter = { x: target.boxSize.width / 2, y: target.boxSize.height / 2 };
  GAME_STATE.camera.x = target.position.x + targetCenter.x;
  GAME_STATE.camera.y = target.position.y + targetCenter.y;
}

/**
 * Moves the camera directly to a tile's center — same `[col, row]`
 * convention as `placeAtTile` (Tiled's own bottom-left readout), and the
 * same underlying math (`getPosSpawnTile`), just centered on a 0x0 point
 * instead of a sprite's own size. Only sticks while `GAME_STATE.cameraFollow`
 * is `false` — otherwise `followCamera()` overwrites it the very next frame.
 *
 * @example
 * GAME_STATE.cameraFollow = false;
 * setCameraToTile([42, 73.5]);
 */
export function setCameraToTile(tile: [number, number], origin: Position = { x: 0, y: 0 }) {
  const center = getPosSpawnTile({ tile, spriteSize: { width: 0, height: 0 }, origin });
  GAME_STATE.camera.x = center.x;
  GAME_STATE.camera.y = center.y;
}

const DEFAULT_PAN_SPEED = 250; // px/sec — same fallback drift() uses for its own default duration
const CAMERA_POINT_SIZE = { width: 0, height: 0 }; // a sizeless point — same convention setCameraToTile uses

export interface CameraPanOptions {
  /** World position the tile grid is measured from, same as `placeAtTile`'s `origin`. Only affects absolute-tile legs. @default {x:0,y:0} */
  origin?: Position;
  /** Tiled `[col, row]` tile to pan from — same coordinate language as `to`, not a raw world `Position`. @default wherever the camera currently is */
  from?: [number, number];
  /** Total seconds for the whole pan, across every leg if more than one. Takes priority over `speed` if both are given — an effective px/sec is derived from the *total* distance, then applied per leg below, so multi-leg motion stays at one constant visual speed instead of being split evenly by leg count (which would pace a short leg and a long leg identically). @default distance / speed */
  duration?: number;
  /** Px/sec, applied per leg — derives each leg's own duration from its own distance when `duration` isn't given directly. @default 250 */
  speed?: number;
  /** @default "sine.inOut" */
  ease?: string;
  /** Seconds to wait before starting. */
  delay?: number;
  /** Runs once the camera has landed exactly on the final target. */
  onComplete?: () => void;
}

export interface CameraPanHandle {
  /** Cancels the pan — kills it (whether still delayed or mid-flight) and snaps straight to the final target. */
  stop: () => void;
}

/**
 * Animates the camera from `options.from` (default: wherever it currently
 * is) through `to` — the animated counterpart to `setCameraToTile` (which
 * jumps instantly), same relationship `walk`/`drift` have to `placeAtTile`.
 * `to` is its own positional argument, not bundled into `options` — it's
 * the one genuinely required input, same reasoning `walk(npc, path,
 * options)` already splits `path` out for. Only sticks while
 * `GAME_STATE.cameraFollow` is `false` — otherwise `followCamera()` fights
 * it every frame.
 *
 * @example
 * GAME_STATE.cameraFollow = false;
 * panCameraToTile([42, 73.5]); // no other options needed
 * @example
 * panCameraToTile([42, 73.5], { duration: 2 });
 * @example
 * panCameraToTile([42, 73.5], { speed: 400 }); // duration derived from distance
 * @example
 * panCameraToTile([[37, 43], [42, 73.5]], { speed: 400 }); // chained, same WalkLeg[] shape as walk()
 * @example
 * panCameraToTile([94, 45], { from: [58.9, 42] }); // explicit start tile, not the camera's current position
 */
export function panCameraToTile(
  to: WalkLeg | WalkLeg[],
  options: CameraPanOptions = {},
): CameraPanHandle {
  const {
    origin = { x: 0, y: 0 },
    speed = DEFAULT_PAN_SPEED,
    ease = "sine.inOut",
    delay = 0,
    onComplete,
  } = options;

  // The one case `from` is actually a raw position rather than a tile —
  // "wherever the camera currently is" has no tile to convert from, it's
  // just read directly. An explicit `from` is always a tile, same
  // coordinate language `to` uses.
  const from: Position = options.from
    ? getPosSpawnTile({ tile: options.from, spriteSize: CAMERA_POINT_SIZE, origin })
    : { x: GAME_STATE.camera.x, y: GAME_STATE.camera.y };

  const legs: WalkLeg[] = isSingleLeg(to) ? [to] : to;

  // Resolves every leg's target + its own distance up front — each leg's
  // relative form chains from the previous leg's own resolved end position,
  // same as walk(). Reused below both for the total (duration -> speed
  // conversion) and each tween's own per-leg duration.
  const steps: { target: Position; distance: number }[] = [];
  let cursor = from;
  for (const leg of legs) {
    const target = legTarget({ leg, from: cursor, spriteSize: CAMERA_POINT_SIZE, origin });
    steps.push({ target, distance: Math.hypot(target.x - cursor.x, target.y - cursor.y) });
    cursor = target;
  }
  const finalTarget = steps[steps.length - 1]!.target;
  const totalDistance = steps.reduce((sum, s) => sum + s.distance, 0);

  const effectiveSpeed =
    options.duration !== undefined && totalDistance > 0 ? totalDistance / options.duration : speed;

  // Establishes the starting point immediately, even if `delay` postpones
  // the actual pan — otherwise the camera would keep showing wherever it
  // was *before* this call for the whole delay, then jump to `from` right
  // as the tween starts.
  GAME_STATE.camera.x = from.x;
  GAME_STATE.camera.y = from.y;

  let pending: gsap.core.Tween | null = null;
  let tl: gsap.core.Timeline | null = null;

  const run = () => {
    tl = gsap.timeline({
      onComplete: () => {
        // guards against float drift from the tween chain, same as drift()'s own landing snap
        GAME_STATE.camera.x = finalTarget.x;
        GAME_STATE.camera.y = finalTarget.y;
        onComplete?.();
      },
    });
    for (const { target, distance } of steps) {
      tl.to(GAME_STATE.camera, {
        x: target.x,
        y: target.y,
        duration: distance / effectiveSpeed,
        ease,
      });
    }
  };

  if (delay > 0) pending = gsap.delayedCall(delay, run);
  else run();

  return {
    stop: () => {
      pending?.kill();
      tl?.kill();
      GAME_STATE.camera.x = finalTarget.x;
      GAME_STATE.camera.y = finalTarget.y;
    },
  };
}

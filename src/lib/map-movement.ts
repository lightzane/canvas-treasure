import { RUN_SPEED_BONUS } from "@/constants/game-settings";
import { isColliding, type Rect } from "@/features/collisions";
import type { Direction } from "@/features/controller";
import { GAME_STATE } from "@/features/game-state";
import type { Position } from "@/features/sprite";
import { bagHasItem } from "@/lib/bag";
import { getPosSpawnTile } from "@/lib/positioning";

/** Edge-detects `GAME_STATE.movementLocked` turning on, so `movePlayer` only forces idle once per lock, not every frame — see the comment where it's read. */
let wasLocked = false;

/**
 * Shared movement/camera step for any walkable map scene: reads input,
 * switches walk/idle animation, advances the player, blocks movement
 * against `GAME_STATE.boundaries`, and re-centers the camera on the player.
 *
 * Returns the player's attempted box for this frame (even when blocked), so
 * a scene can run its own zone checks on it (battle encounters, door exits,
 * ...) — or `undefined` when no direction was pressed, so there was nothing
 * to check.
 */
export function movePlayer(dt: number): Rect | undefined {
  const player = GAME_STATE.player;

  if (GAME_STATE.movementLocked) {
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
    return undefined;
  }
  wasLocked = false;

  const direction = GAME_STATE.keys.pressed.at(-1);
  // GAME_STATE.allowRunning takes priority over everything else — a cramped
  // interior disables running outright, regardless of X held or shoes owned.
  const running = GAME_STATE.allowRunning && GAME_STATE.keys.actions.x && bagHasItem("shoes");

  updateAnimation({ direction, running });
  player.update(dt);

  let playerBox: Rect | undefined;

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

import { isColliding, type Rect } from "@/features/collisions";
import type { Direction } from "@/features/controller";
import { GAME_STATE } from "@/features/game-state";

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
    updateAnimation(undefined); // forces idle — otherwise the player can look stuck mid-walk-frame
    player.update(dt); // keeps the idle animation itself playing, just blocks movement
    followCamera(); // still track the player (e.g. its freshly-placed spawn tile) — only movement is blocked, not the camera
    return undefined;
  }

  const direction = GAME_STATE.keys.pressed.at(-1);

  updateAnimation(direction);
  player.update(dt);

  let playerBox: Rect | undefined;

  if (direction) {
    // [Frame rate] if NO delta time, this will be 200px/tick
    // which can be faster in other devices (e.g. 60Hz, 120Hz, 144Hz)
    //
    // Sync with [Time-based]
    // movement 200px/sec — multiply with delta time
    const distance = player.moveSpeed * dt;
    const { dx, dy } = getMoveDelta(direction, distance);
    playerBox = attemptMove(dx, dy);
  }

  followCamera();

  return playerBox;
}

function updateAnimation(direction: Direction | undefined) {
  const player = GAME_STATE.player;

  if (direction) {
    player.face(direction);
    player.play("walk");
  } else {
    player.play("idle");
  }
}

/** How far to move on each axis for one frame of holding `direction`. */
function getMoveDelta(direction: Direction, distance: number): { dx: number; dy: number } {
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

/** Re-centers the camera on the player's current position. */
function followCamera() {
  const player = GAME_STATE.player;
  const playerCenter = { x: player.boxSize.width / 2, y: player.boxSize.height / 2 };
  GAME_STATE.camera.x = player.position.x + playerCenter.x;
  GAME_STATE.camera.y = player.position.y + playerCenter.y;
}

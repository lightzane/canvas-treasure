import { TILE_SIZE } from "@/constants/game-settings";
import { isColliding, type Rect } from "@/features/collisions";
import type { Direction } from "@/features/controller";
import { GAME_STATE } from "@/features/game-state";
import type { Sprite } from "@/features/sprite";
import type { PlayerSprite } from "@/features/sprite-player";
import { audioPlaySound } from "@/lib/audio";
import { attemptMove } from "@/lib/map-movement";
import { getMoveDelta } from "@/lib/walk-math";

export interface FollowOptions {
  /** Tiles of distance to keep from `target`. @default 1.5 */
  followDistance?: number;
  /** Steps aside when blocking `target`'s own movement. @default true */
  givesWay?: boolean;
  /**
   * Tiles of distance beyond which `follower` teleports next to `target`
   * immediately, regardless of `checkStuckAndTeleport`'s own stuck-timer —
   * this fires purely on distance, every frame it's exceeded, even while
   * still actively (and successfully) approaching. For when `target` can
   * outrun `follower` outright (e.g. Running Shoes, which `follower` has no
   * matching speed/animation for) rather than merely being blocked.
   * @default 8
   */
  teleportDistance?: number;
}

const DEFAULT_FOLLOW_DISTANCE = 1.5; // tiles
// ~2s of target sprinting (Running Shoes) away in a straight line at the
// current RUN_SPEED_BONUS, before follower's plain walk speed falls behind
// by this much — see FollowOptions.teleportDistance.
const DEFAULT_TELEPORT_DISTANCE = 8; // tiles

// First-pass tuning values, not load-bearing math — adjust to taste.
const GIVE_WAY_DISTANCE = 0.75; // tiles — closer than this while caught up counts as "in the way"
const GIVE_WAY_HOLD = 0.4; // seconds target must be in the way before stepping aside
// A stepAside hop can overshoot followDistance, which would otherwise walk
// the follower right back into target next frame. This pauses approaching
// briefly after a give-way step so the two don't fight each other.
const GIVE_WAY_COOLDOWN = 0.6; // seconds

// A reversal (this frame's move exactly undoing the last one) means the
// follower is bouncing inside a gap narrower than one step. Pausing
// movement briefly breaks the ping-pong instead of repeating it every frame.
const BOUNCE_COOLDOWN = 0.5; // seconds

// If the direct axis toward target keeps failing (needing a fallback, or
// failing outright) for this long, the follower is genuinely stuck — most
// likely a sealed room only reachable through a doorway elsewhere that the
// simple axis-fallback routing below can't find. See checkStuckAndTeleport.
const STUCK_TIMEOUT = 2; // seconds

// Debounces the follower's own movement direction so a quick direction
// change from target doesn't flip the follower's in the same frame (reads
// as mirrored rather than reacting a beat late). Only affects approach
// movement, never idle facing (see followSprite's doc comment) and never
// the obstacle-avoidance fallback, which must stay instantly reactive.
const DIRECTION_REACTION_DELAY = 0.15; // seconds

// Below this, a dx/dy delta isn't a confident enough signal to flip which
// axis is dominant or which sign it has — see stableAxisDirections.
const AXIS_HYSTERESIS = TILE_SIZE / 4; // px

// The step that would land exactly on followPx can get rejected (blocked
// by target's own collision box), leaving distance pinned some tiny
// fraction above followPx forever. This slack lets "close enough" count
// instead of requiring an exact match.
const STUCK_DISTANCE_SLACK = TILE_SIZE / 4; // px

// prettier-ignore
const OPPOSITE_DIRECTION: Record<Direction, Direction> = { w: "s", s: "w", a: "d", d: "a" };

const TELEPORT_CANDIDATE_OFFSETS: [number, number][] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

const DIRECTION_OFFSET: Record<Direction, [number, number]> = {
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};

/** Same 4 neighbors, reordered when `target` is moving: behind it first, sides next, directly in front last (landing there would block target's very next step). */
function teleportCandidateOffsets(target: Sprite): [number, number][] {
  const direction = target === GAME_STATE.player ? GAME_STATE.keys.pressed.at(-1) : undefined;
  if (!direction) return TELEPORT_CANDIDATE_OFFSETS;

  const front = DIRECTION_OFFSET[direction];
  const behind: [number, number] = [-front[0], -front[1]];
  const sides = TELEPORT_CANDIDATE_OFFSETS.filter(
    ([ox, oy]) => (ox !== front[0] || oy !== front[1]) && (ox !== behind[0] || oy !== behind[1]),
  );
  return [behind, ...sides, front];
}

interface PendingDirection {
  committed: Direction;
  desired: Direction;
  held: number;
}

interface StableAxis {
  dxSign: 1 | -1;
  dySign: 1 | -1;
  dominant: "x" | "y";
}

/** Everything this file remembers about one follower, between frames — one record instead of several parallel WeakMaps. */
interface FollowerState {
  /** See DIRECTION_REACTION_DELAY. */
  direction: PendingDirection | null;
  /** See stableAxisDirections. */
  axis: StableAxis | null;
  /** How long target has been uncomfortably close while caught up — see GIVE_WAY_HOLD. */
  closeness: number;
  /** Seconds left before approaching can re-engage — see GIVE_WAY_COOLDOWN. */
  giveWayCooldown: number;
  /** Last direction actually moved while approaching — see BOUNCE_COOLDOWN. */
  lastApproachDirection: Direction | null;
  /** Seconds left before another movement attempt is allowed — see BOUNCE_COOLDOWN. */
  bounceCooldown: number;
  /** Seconds the direct route has been failing — see STUCK_TIMEOUT. */
  stuckFor: number;
}

function createFollowerState(): FollowerState {
  return {
    direction: null,
    axis: null,
    closeness: 0,
    giveWayCooldown: 0,
    lastApproachDirection: null,
    bounceCooldown: 0,
    stuckFor: 0,
  };
}

const followerStates = new WeakMap<Sprite, FollowerState>();

/** Lazily creates a fresh state record the first time a given follower is seen. */
function getFollowerState(follower: Sprite): FollowerState {
  let state = followerStates.get(follower);
  if (!state) {
    state = createFollowerState();
    followerStates.set(follower, state);
  }
  return state;
}

function center(sprite: Sprite) {
  return {
    x: sprite.position.x + sprite.boxSize.width / 2,
    y: sprite.position.y + sprite.boxSize.height / 2,
  };
}

function directionOf(dx: number, dy: number): Direction {
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "d" : "a") : dy > 0 ? "s" : "w";
}

function settleDirection(state: FollowerState, desired: Direction, dt: number): Direction {
  const pending = state.direction;
  if (!pending) {
    state.direction = { committed: desired, desired, held: 0 };
    return desired;
  }
  if (pending.desired !== desired) {
    pending.desired = desired;
    pending.held = 0;
    return pending.committed;
  }
  pending.held += dt;
  if (pending.held >= DIRECTION_REACTION_DELAY) pending.committed = desired;
  return pending.committed;
}

/**
 * `primary`: whichever axis has the bigger delta. `secondary`: the other
 * axis — always a real direction, needed most exactly when target is
 * dead-ahead on one axis. Both are hysteresis-protected (AXIS_HYSTERESIS)
 * so a near-zero delta or a near-tie between axes doesn't flip the answer
 * every frame — `secondary` especially, since it feeds the
 * obstacle-avoidance fallback directly with no debounce of its own.
 */
function stableAxisDirections(
  state: FollowerState,
  dx: number,
  dy: number,
): { primary: Direction; secondary: Direction } {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const last = state.axis;

  const dxSign: 1 | -1 =
    absDx > AXIS_HYSTERESIS ? (dx >= 0 ? 1 : -1) : (last?.dxSign ?? (dx >= 0 ? 1 : -1));
  const dySign: 1 | -1 =
    absDy > AXIS_HYSTERESIS ? (dy >= 0 ? 1 : -1) : (last?.dySign ?? (dy >= 0 ? 1 : -1));
  const gap = absDx - absDy;
  const dominant: "x" | "y" =
    Math.abs(gap) > AXIS_HYSTERESIS
      ? gap > 0
        ? "x"
        : "y"
      : (last?.dominant ?? (gap > 0 ? "x" : "y"));

  state.axis = { dxSign, dySign, dominant };

  const horizontal: Direction = dxSign > 0 ? "d" : "a";
  const vertical: Direction = dySign > 0 ? "s" : "w";
  return dominant === "x"
    ? { primary: horizontal, secondary: vertical }
    : { primary: vertical, secondary: horizontal };
}

/**
 * Steps `follower` one tile perpendicular to `target`, whichever side is
 * clear. Falls back to stepping straight back if neither side is open
 * (e.g. a tight corner walled on both sides).
 */
function stepAside(follower: Sprite, target: Sprite, dx: number, dy: number) {
  const sides: Direction[] = Math.abs(dx) > Math.abs(dy) ? ["w", "s"] : ["a", "d"];
  const retreat = OPPOSITE_DIRECTION[directionOf(dx, dy)];
  for (const direction of [...sides, retreat]) {
    const before = { ...follower.position };
    const { dx: stepX, dy: stepY } = getMoveDelta(direction, TILE_SIZE);
    attemptMove(follower, stepX, stepY, [target]);
    if (follower.position.x !== before.x || follower.position.y !== before.y)
      return audioPlaySound("teleport", { volume: 1 });
  }
}

/**
 * Last-resort reposition once STUCK_TIMEOUT gives up on routing there —
 * tries each tile next to `target` in turn, committing to whichever is
 * actually clear. Does nothing if every neighbor is blocked too.
 */
function teleportNearTarget(follower: Sprite, target: Sprite) {
  const targetCenter = center(target);
  for (const [ox, oy] of teleportCandidateOffsets(target)) {
    const candidate = { x: targetCenter.x + ox * TILE_SIZE, y: targetCenter.y + oy * TILE_SIZE };
    const followerCenter = center(follower);
    const before = { ...follower.position };
    attemptMove(follower, candidate.x - followerCenter.x, candidate.y - followerCenter.y, [target]);
    if (follower.position.x !== before.x || follower.position.y !== before.y) {
      return audioPlaySound("teleport", { volume: 1 });
    }
  }
}

/** Relative positioning between one follower and its target, computed once per frame. */
interface FollowGeometry {
  dx: number;
  dy: number;
  distance: number;
}

function computeGeometry(follower: Sprite, target: Sprite): FollowGeometry {
  const a = center(follower);
  const b = center(target);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return { dx, dy, distance: Math.hypot(dx, dy) };
}

/** Whether `follower` needs to close in on `target` this frame. Also ticks `state.giveWayCooldown` down — while active, forces this `false` so a give-way step isn't immediately undone. */
function shouldApproach(
  state: FollowerState,
  geometry: FollowGeometry,
  followPx: number,
  dt: number,
): boolean {
  const cooldown = state.giveWayCooldown;
  if (cooldown > 0) state.giveWayCooldown = cooldown - dt;

  return cooldown <= 0 && geometry.distance > followPx;
}

/**
 * Tracks whether `follower`'s direct route to `target` (`primary`) is
 * actually working. Resets whenever `primary` succeeds, or `distance` is
 * already within `followPx` (plus STUCK_DISTANCE_SLACK) — the latter
 * covers `primary` staying blocked right at that boundary, usually by
 * target's own collision box, which just means "already arrived", not
 * stuck. If genuinely stuck long enough, repositions `follower` next to
 * `target` and returns `true`.
 */
function checkStuckAndTeleport(
  state: FollowerState,
  follower: Sprite,
  target: Sprite,
  distance: number,
  followPx: number,
  primary: Direction,
  moved: Direction | null,
  dt: number,
): boolean {
  if (moved === primary || distance <= followPx + STUCK_DISTANCE_SLACK) {
    state.stuckFor = 0;
    return false;
  }

  state.stuckFor += dt;
  if (state.stuckFor < STUCK_TIMEOUT) return false;

  teleportNearTarget(follower, target);
  state.stuckFor = 0;
  state.bounceCooldown = 0;
  state.lastApproachDirection = null;
  return true;
}

/**
 * Tries `primary` first, then both perpendicular sides if blocked. Returns
 * the direction actually moved, or `null` if every option failed (or was
 * skipped — see below). Gated on `state.bounceCooldown` — while active,
 * skips attempting entirely so a just-detected bounce gets a beat to stop.
 */
function tryApproachStep(
  state: FollowerState,
  follower: PlayerSprite,
  target: Sprite,
  geometry: FollowGeometry,
  followPx: number,
  primary: Direction,
  secondary: Direction,
  dt: number,
): Direction | null {
  const bounce = state.bounceCooldown;
  if (bounce > 0) state.bounceCooldown = bounce - dt;

  if (bounce > 0) return null;

  const { distance } = geometry;
  const speedStep = follower.moveSpeed * dt;
  // shouldApproach only calls this when distance > followPx, so this cap
  // never overshoots past followDistance.
  const stepDistance = Math.min(speedStep, distance - followPx);

  const before = { ...follower.position };
  const { dx: stepX, dy: stepY } = getMoveDelta(primary, stepDistance);
  attemptMove(follower, stepX, stepY, [target]);
  let moved: Direction | null =
    follower.position.x !== before.x || follower.position.y !== before.y ? primary : null;

  if (!moved) {
    for (const fallback of [secondary, OPPOSITE_DIRECTION[secondary]]) {
      const { dx: altX, dy: altY } = getMoveDelta(fallback, stepDistance);
      attemptMove(follower, altX, altY, [target]);
      if (follower.position.x !== before.x || follower.position.y !== before.y) {
        moved = fallback;
        break;
      }
    }
  }

  if (moved) {
    // A move exactly undoing the last one is the bounce signature — pause
    // instead of repeating it next frame.
    const last = state.lastApproachDirection;
    if (last && moved === OPPOSITE_DIRECTION[last]) state.bounceCooldown = BOUNCE_COOLDOWN;
    state.lastApproachDirection = moved;
  } else {
    state.lastApproachDirection = null;
  }

  return moved;
}

// Deliberately tight, not a personal-space buffer — only counts as
// "blocking" once a further step in target's current direction would
// actually make contact, not just "nearby and moving for any reason".
const GIVE_WAY_PROBE_DISTANCE = TILE_SIZE / 4; // px

/** Whether `target`'s currently-held direction, extended a little further, would collide with `follower`. Only meaningful when `target` is the real player — that's the only one with input to read. */
function isBlockingTarget(follower: Sprite, target: Sprite): boolean {
  const direction = GAME_STATE.keys.pressed.at(-1);
  if (!direction) return false;
  const { dx, dy } = getMoveDelta(direction, GIVE_WAY_PROBE_DISTANCE);
  const box = target.collisionBox;
  const probe: Rect = {
    width: box.width,
    height: box.height,
    position: { x: box.position.x + dx, y: box.position.y + dy },
  };
  return isColliding(probe, follower.collisionBox);
}

/** Steps `follower` aside once it's genuinely about to block `target`'s next step. A non-player `target` has no input to read, so it falls back to plain proximity instead. */
function updateGiveWay(
  state: FollowerState,
  follower: Sprite,
  target: Sprite,
  geometry: FollowGeometry,
  dt: number,
): void {
  const { dx, dy, distance } = geometry;
  const isInTheWay =
    target === GAME_STATE.player
      ? isBlockingTarget(follower, target)
      : distance < GIVE_WAY_DISTANCE * TILE_SIZE;

  if (!isInTheWay) {
    state.closeness = 0;
    return;
  }

  state.closeness += dt;
  if (state.closeness < GIVE_WAY_HOLD) return;

  state.closeness = 0;
  stepAside(follower, target, dx, dy);
  state.giveWayCooldown = GIVE_WAY_COOLDOWN;
}

function approachTarget(
  state: FollowerState,
  follower: PlayerSprite,
  target: Sprite,
  geometry: FollowGeometry,
  followPx: number,
  dt: number,
): void {
  state.closeness = 0; // actively approaching — not "standing in the way"

  const { primary: targetPrimary, secondary } = stableAxisDirections(
    state,
    geometry.dx,
    geometry.dy,
  );
  const primary = settleDirection(state, targetPrimary, dt);

  const moved = tryApproachStep(
    state,
    follower,
    target,
    geometry,
    followPx,
    primary,
    secondary,
    dt,
  );

  if (
    checkStuckAndTeleport(state, follower, target, geometry.distance, followPx, primary, moved, dt)
  ) {
    follower.play("idle");
    return;
  }

  if (moved) {
    follower.face(moved);
    follower.play("walk");
  } else {
    follower.play("idle");
  }
}

function settleNearTarget(
  state: FollowerState,
  follower: PlayerSprite,
  target: Sprite,
  geometry: FollowGeometry,
  givesWay: boolean,
  dt: number,
): void {
  // Reset everything scoped to one approach episode, so a future approach
  // starts from live geometry instead of stale hysteresis/direction state.
  state.lastApproachDirection = null;
  state.stuckFor = 0;
  state.axis = null;
  state.direction = null;

  follower.play("idle");

  if (givesWay) updateGiveWay(state, follower, target, geometry, dt);
}

/**
 * Per-frame "follow `target`" behavior for `follower` — call once per
 * frame, per follower, from a scene's own `update()`. Keeps roughly
 * `followDistance` tiles behind, moving one cardinal direction at a time,
 * blocked by `GAME_STATE.boundaries`/`.obstacles` like the player —
 * `target` itself always counts as solid too.
 *
 * `follower.face(...)` only changes as a result of actually moving — never
 * while idle, stuck, or a movement attempt merely failed. A scene wanting
 * a specific starting pose can call `follower.face(...)` itself (e.g.
 * right after placing a companion at its spawn tile) and it will hold,
 * since nothing here touches it until the follower actually moves.
 *
 * Not real pathfinding — tries the preferred axis, then sideways if
 * blocked. Good enough for a single obstacle or a wall with a gap; a
 * sealed room reachable only through a doorway elsewhere has no path this
 * can find on its own, so `checkStuckAndTeleport` repositions `follower`
 * next to `target` as a last resort. Separately, `teleportDistance` snaps
 * `follower` next to `target` outright once they're simply too far apart,
 * whether or not anything's actually blocking the way.
 *
 * Calls `follower.update(dt)` itself, same as `movePlayer` does for the
 * player, so this is always a complete step.
 *
 * @example followSprite(GAME_STATE.player, GAME_STATE.mama, dt);
 * @example followSprite(GAME_STATE.player, GAME_STATE.papa, dt, { givesWay: false });
 */
export function followSprite(
  target: Sprite,
  follower: PlayerSprite,
  dt: number,
  options: FollowOptions = {},
): void {
  const {
    followDistance = DEFAULT_FOLLOW_DISTANCE,
    givesWay = true,
    teleportDistance = DEFAULT_TELEPORT_DISTANCE,
  } = options;
  const state = getFollowerState(follower);
  const followPx = followDistance * TILE_SIZE;
  const geometry = computeGeometry(follower, target);

  if (geometry.distance > teleportDistance * TILE_SIZE) {
    teleportNearTarget(follower, target);
    state.stuckFor = 0;
    state.bounceCooldown = 0;
    state.lastApproachDirection = null;
    state.axis = null;
    state.direction = null;
    follower.play("idle");
    follower.update(dt);
    return;
  }

  if (shouldApproach(state, geometry, followPx, dt)) {
    approachTarget(state, follower, target, geometry, followPx, dt);
  } else {
    settleNearTarget(state, follower, target, geometry, givesWay, dt);
  }

  follower.update(dt);
}

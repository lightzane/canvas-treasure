import { TILE_SIZE } from "@/constants/game-settings";
import type { Direction } from "@/features/controller";
import type { Position } from "@/features/sprite";
import { getPosSpawnTile } from "@/lib/positioning";

/**
 * One leg of a walk — either an absolute `[col, row]` tile (Tiled's own
 * coordinates), or `steps` tiles in `direction`, relative to wherever this
 * leg *starts* (the NPC's current position for the first leg in a path, or
 * the previous leg's end for a later one). Use the relative form for
 * anything you don't have a tile coordinate for — a random wander, "back
 * away a few steps," an NPC whose starting spot varies — the absolute form
 * for a specific, known destination (a doorway, a mark on the map).
 *
 * Lives here, not in walk.ts/map-movement.ts, specifically so both of those
 * can share this (and getMoveDelta/isSingleLeg/legTarget below) without
 * importing from each other — they used to import this stuff from one
 * another directly, which worked but was a real circular import.
 */
export type WalkLeg = [number, number] | { direction: Direction; steps: number };

/** A single leg is `[col, row]` (two numbers) or a `{direction, steps}` object — a *list* of legs is an array whose first element is itself one of those, never a bare number. */
export function isSingleLeg(path: WalkLeg | WalkLeg[]): path is WalkLeg {
  if (!Array.isArray(path)) return true; // {direction, steps} is always exactly one leg
  return typeof path[0] === "number"; // [col, row] — a list of legs would hold an array/object here instead
}

/** How far to move on each axis for `distance` px in `direction` — shared by `map-movement.ts`'s own per-frame player movement and `legTarget`'s relative-steps legs below. */
export function getMoveDelta(direction: Direction, distance: number): { dx: number; dy: number } {
  if (direction === "w") return { dx: 0, dy: -distance };
  if (direction === "a") return { dx: -distance, dy: 0 };
  if (direction === "s") return { dx: 0, dy: distance };
  return { dx: distance, dy: 0 }; // "d"
}

export interface LegTargetOptions {
  leg: WalkLeg;
  /** World position this leg starts at. */
  from: Position;
  spriteSize: { width: number; height: number };
  origin: Position;
}

/**
 * World position `options.leg` resolves to. Takes a plain `spriteSize`
 * rather than a whole `npc`, so it's reusable for anything walking a
 * `WalkLeg` path, not just a `PlayerSprite` — `panCameraToTile`
 * (`map-movement.ts`) reuses this for the camera, passing
 * `{width:0,height:0}` (a sizeless point), same convention
 * `setCameraToTile` already uses. An options object, not four positional
 * params — same reasoning as `WalkLeg` itself.
 */
export function legTarget({ leg, from, spriteSize, origin }: LegTargetOptions): Position {
  if (Array.isArray(leg)) return getPosSpawnTile({ tile: leg, spriteSize, origin });

  const { dx, dy } = getMoveDelta(leg.direction, leg.steps * TILE_SIZE);
  return { x: from.x + dx, y: from.y + dy };
}

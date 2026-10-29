import { getOverlapArea, type Rect } from "@/features/collisions";
import type { Position } from "@/features/sprite";
import { toScreen } from "@/lib/canvas/screen";
import type { TiledRect } from "@/lib/tiled";

/** px² of slack on the "fully contained" overlap check, to absorb floating-point rounding from fractional (moveSpeed * dt) movement — see `checkTriggerZones`. */
const OVERLAP_EPSILON = 0.1;

interface ZoneProps {
  position: Position;
  width: number;
  height: number;
}

/**
 * A generic rectangular area on the map. Reused for anything that needs
 * a marked region — wall boundaries, battle zones, sound triggers, etc.
 * Carries no behavior of its own; callers decide what happens on overlap.
 */
export class Zone {
  position: ZoneProps["position"];
  width: number;
  height: number;

  constructor({ position, width, height }: ZoneProps) {
    this.position = position;
    this.width = width;
    this.height = height;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { x, y } = toScreen(this.position);
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    ctx.fillRect(x, y, this.width, this.height);
  }
}

interface TriggerZoneProps extends ZoneProps {
  /** Identifies which trigger this is — looked up against a scene's handler map by `checkTriggerZones`. */
  name: string;
}

/** A `Zone` the player can walk into/out of to fire a named effect (exit, dialog, sound, ...). */
export class TriggerZone extends Zone {
  name: string;
  /** Whether the player was already overlapping this zone last frame — lets `checkTriggerZones` tell entering apart from leaving. */
  entered = false;

  constructor({ name, ...zoneProps }: TriggerZoneProps) {
    super(zoneProps);
    this.name = name;
  }
}

/** Builds `Zone[]` from a map's raw `COLLISION_<MAP>` data — the one place this `.map()`-to-`Zone` boilerplate lives, instead of duplicated in every scene's own `enter()`. */
export function createBoundaries(rects: TiledRect[]): Zone[] {
  return rects.map(
    (r) => new Zone({ position: { x: r.x, y: r.y }, width: r.width, height: r.height }),
  );
}

/** Same idea as `createBoundaries`, for a map's raw `TRIGGER_<MAP>` data. */
export function createTriggerZones(rects: (TiledRect & { name: string })[]): TriggerZone[] {
  return rects.map(
    (r) =>
      new TriggerZone({
        name: r.name,
        position: { x: r.x, y: r.y },
        width: r.width,
        height: r.height,
      }),
  );
}

interface TriggerHandler {
  /** Fires once, the frame the player's box starts overlapping the zone. */
  onEnter?: (zone: TriggerZone) => void;
  /** Fires once, the frame the player's box stops overlapping the zone. */
  onLeave?: (zone: TriggerZone) => void;
}

/**
 * Parameterize with the map's own trigger-zone name union for autocomplete
 * and typo-checking, e.g. `TriggerHandlers<(typeof TRIGGER_HOME)[number]["name"]>`
 * — a misspelled or stale key (one that doesn't match any zone Tiled
 * actually exports for that map) becomes a compile error instead of a
 * silently-never-firing handler. `Partial` — a scene only needs to handle
 * the zones it cares about, not every single one the map defines.
 */
export type TriggerHandlers<Name extends string = string> = Partial<Record<Name, TriggerHandler>>;

/**
 * Dispatches each zone's `onEnter`/`onLeave` by `zone.name` — the one place
 * overlap-tracking lives, shared by every scene. Requires the player's whole
 * box inside the zone (not just touching its edge) before firing `onEnter`.
 */
export function checkTriggerZones(
  playerBox: Rect,
  zones: TriggerZone[],
  handlers: TriggerHandlers,
) {
  const playerArea = playerBox.width * playerBox.height;

  for (const zone of zones) {
    const overlapArea = getOverlapArea(playerBox, zone);
    // Movement deltas (moveSpeed * dt) are fractional pixels, so the player's
    // box almost never lands on an exact integer boundary — without this
    // slack, a box that's visually/practically fully inside a zone can come
    // up a fraction of a px² short of `playerArea` and never register as
    // "entered" (worst case: stuck against a wall, re-sampling that same
    // near-miss every frame forever, until a direction change nudges it
    // across the line).
    const overlapping = overlapArea >= playerArea - OVERLAP_EPSILON;
    const handler = handlers[zone.name];

    if (overlapping && !zone.entered) handler?.onEnter?.(zone);
    else if (!overlapping && zone.entered) handler?.onLeave?.(zone);

    zone.entered = overlapping;
  }
}

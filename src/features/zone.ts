import { getOverlapArea, type Rect } from "@/features/collisions";
import type { Position } from "@/features/sprite";
import { toScreen } from "@/lib/canvas/screen";

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

export type TriggerHandlers = Record<
  string,
  {
    /** Fires once, the frame the player's box starts overlapping the zone. */
    onEnter?: (zone: TriggerZone) => void;
    /** Fires once, the frame the player's box stops overlapping the zone. */
    onLeave?: (zone: TriggerZone) => void;
  }
>;

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
    const overlapping = getOverlapArea(playerBox, zone) >= playerArea;
    const handler = handlers[zone.name];

    if (overlapping && !zone.entered) handler?.onEnter?.(zone);
    else if (!overlapping && zone.entered) handler?.onLeave?.(zone);

    zone.entered = overlapping;
  }
}

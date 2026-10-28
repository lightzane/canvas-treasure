import { ZOOM_LEVEL } from "@/constants/game-settings";

/** A rectangle object as exported by Tiled's object-layer JSON. */
export interface TiledRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Scales a Tiled object-layer export to the game's zoom level, matching the rendered map's pixel scale. */
export function scaleTiledObjects<T extends TiledRect>(objects: T[]): T[] {
  return objects.map((o) => ({
    ...o,
    height: o.height * ZOOM_LEVEL,
    width: o.width * ZOOM_LEVEL,
    x: (Math.round(o.x) + 1) * ZOOM_LEVEL,
    y: (Math.round(o.y) + 1) * ZOOM_LEVEL,
  }));
}

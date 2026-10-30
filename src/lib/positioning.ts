import { CANVAS_HEIGHT, CANVAS_WIDTH, TILE_SIZE } from "@/constants/game-settings";
import type { Position, Sprite } from "@/features/sprite";

interface MapPosCenterTileOpts {
  /** Size of canvas @default 1024x576 */
  canvas?: { width: number; height: number };
  /** @default 48 */
  tileSize?: number;
}

const DEFAULT_OPTIONS: Required<MapPosCenterTileOpts> = {
  tileSize: TILE_SIZE,
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  },
};

/**
 * Centers the given `tile` in canvas's center by positioning the map.
 *
 * Tip: The tile's `col,row` coordinates you see at the bottom-left
 * of **Tiled** (e.g. 25, 20).
 *
 * @param tile The coordinates of the tile to position in the center of canvas.
 */
export function getMapPosCenterTile(tile: [number, number], opts?: MapPosCenterTileOpts) {
  const [col, row] = tile;

  opts = {
    ...DEFAULT_OPTIONS,
    ...opts,
  };

  const { tileSize, canvas } = opts as Required<MapPosCenterTileOpts>;

  // Get the tile's starting pixel (1st tile at index 0 = 0px, 2nd tile at index 1 = 48px)
  const tileLeftX = col * tileSize;
  const tileTopY = row * tileSize;

  // Find the distance of a tile to its center
  const halfTile = tileSize / 2;

  // Add the distance from tile's starting pixels
  const tileCenterX = tileLeftX + halfTile;
  const tileCenterY = tileTopY + halfTile;

  // Find the distance of the canvas to its center
  const halfCanvasX = canvas.width / 2;
  const halfCanvasY = canvas.height / 2;

  // Position the tile's center to the center position of canvas
  return {
    x: halfCanvasX - tileCenterX,
    y: halfCanvasY - tileCenterY,
  };
}

interface PosSpawnTileParams {
  tile: [number, number];
  spriteSize: { width: number; height: number };
  origin: { x: number; y: number };
}

export function getPosSpawnTile({
  tile: [col, row],
  spriteSize: { width, height },
  origin: { x, y },
}: PosSpawnTileParams) {
  // Get the tile's starting pixel (1st tile at index 0 = 0px, 2nd tile at index 1 = 48px)
  const tileLeftX = col * TILE_SIZE;
  const tileTopY = row * TILE_SIZE;

  // Find the distance of a tile to its center
  const halfTile = TILE_SIZE / 2;

  // Add the distance from tile's starting pixels
  const tileCenterX = tileLeftX + halfTile;
  const tileCenterY = tileTopY + halfTile;

  // Find the center of sprite
  const spriteX = width / 2;
  const spriteY = height / 2;

  return {
    x: x + tileCenterX - spriteX,
    y: y + tileCenterY - spriteY,
  };
}

interface PlaceAtTileParams {
  sprite: Sprite;
  tile: [number, number];
  /** World position the tile grid is measured from. @default the map's own origin, {x:0,y:0}. */
  origin?: Position;
  /**
   * Overrides what `sprite.size` would otherwise give. `sprite.size` is
   * derived live from whichever clip's raw image is *currently* loaded —
   * fine for a single-clip `Sprite` (parcel, the fountains — only one image
   * ever loaded, `.size` can't change) or a `PlayerSprite` whose clips all
   * happen to share the same per-frame pixel size (mama/papa: idle only;
   * daomingsi/huazelei: idle and walk both 64x96). It only becomes a problem
   * for a `PlayerSprite` with a clip whose own sheet is a genuinely
   * different size from its others — currently just the player itself, whose
   * `run` sheet is 132x132/frame vs. 64x96 for its own walk/idle. For that
   * one case, centering lands in a different spot purely depending on
   * whichever animation happened to be active the instant this runs — not on
   * the tile you asked for. Pass `GAME_STATE.player.boxSize` here to pin it
   * to a stable value regardless of animation state (`PlayerSprite` itself
   * already pins `boxSize` to its `initialSprite` clip's size at
   * construction — see `PlayerSprite`'s constructor — so this only needs to
   * be threaded through explicitly at spots like `placeAtTile`, which reads
   * the live `.size` instead). @default sprite.size
   */
  spriteSize?: { width: number; height: number };
}

/**
 * Sets `sprite.position` to a Tiled `[col, row]`, centered on the tile — a
 * thin wrapper over `getPosSpawnTile` that infers `spriteSize` from the
 * sprite itself by default, so most call sites only ever need to supply the
 * tile.
 *
 * Only moves the sprite — it doesn't add it to a scene's `decor`/entity
 * list, so the sprite still needs to be in that list to actually draw/update.
 *
 * `sprite.size` is 0x0 until its image finishes loading, so only call this
 * once that's guaranteed — e.g. from a scene's `enter()`, which `GameEngine`
 * runs after the scene's `ready` promise resolves.
 */
export function placeAtTile({
  sprite,
  tile,
  origin = { x: 0, y: 0 },
  spriteSize,
}: PlaceAtTileParams) {
  sprite.position = getPosSpawnTile({ tile, spriteSize: spriteSize ?? sprite.size, origin });
}

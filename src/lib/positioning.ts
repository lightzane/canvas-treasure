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
 * tile. Two forms: `placeAtTile(sprite, tile)` when there's nothing to
 * customize, or `placeAtTile({ sprite, tile, origin, spriteSize })` once
 * `origin`/`spriteSize` actually need overriding.
 *
 * Only moves the sprite — it doesn't add it to a scene's `decor`/entity
 * list, so the sprite still needs to be in that list to actually draw/update.
 *
 * `sprite.size` (the default `spriteSize`) is `0x0` until `sprite.image`
 * finishes loading — and the overwhelming majority of call sites across
 * every scene run at MODULE SCOPE (a baseline NPC/decor item, placed once
 * when the scene file first imports, not inside `enter()`), which executes
 * synchronously, before any image's network fetch could possibly have
 * resolved (image loads are always asynchronous, even from cache — a
 * browser guarantee, not a timing coincidence). Without the self-correction
 * below, that would silently place every such sprite centered on the raw
 * tile's own center point instead of offset to center the sprite ON the
 * tile — permanently, since nothing else ever re-runs this. Worse in a
 * production build than in dev: dev serves each module as its own network
 * request, so the gaps between them occasionally let an already-cached
 * image's `load` fire before its own placement code runs by luck; a
 * bundled production build executes as one unbroken synchronous script
 * with no such gaps, so every module-scope call loses that race every
 * time. So: places immediately with whatever size is available right now
 * (correct outright for an already-loaded image, or an explicit
 * `spriteSize` override, which is exactly why the player's own placement
 * call passes `GAME_STATE.player.boxSize` instead of relying on this) —
 * and if the image wasn't loaded yet, re-places once it actually finishes,
 * self-correcting the one-frame-ish-or-less flash at the wrong spot.
 *
 * @example
 * placeAtTile(teaset1, [2, 7]);
 * placeAtTile({ sprite: GAME_STATE.player, tile: spawnLocation, spriteSize: GAME_STATE.player.boxSize });
 */
export function placeAtTile(sprite: Sprite, tile: [number, number]): void;
export function placeAtTile(params: PlaceAtTileParams): void;
export function placeAtTile(spriteOrParams: Sprite | PlaceAtTileParams, tile?: [number, number]) {
  const {
    sprite,
    tile: at,
    origin = { x: 0, y: 0 },
    spriteSize,
  }: PlaceAtTileParams = tile !== undefined
    ? { sprite: spriteOrParams as Sprite, tile }
    : (spriteOrParams as PlaceAtTileParams);

  const place = () => {
    sprite.position = getPosSpawnTile({ tile: at, spriteSize: spriteSize ?? sprite.size, origin });
  };

  if (!spriteSize && !sprite.image.complete)
    sprite.image.addEventListener("load", place, { once: true });
  place();
}

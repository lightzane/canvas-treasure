# Tiled Asset Specifications

## Tileset (.tsx)

~~Tileset available uses `16x16` pixels per tile.~~

Tileset available uses `32x32` pixels per tile.

## Tilemap (.tmp)

~~On Zoom level **400%**: `128x128` per tile.~~

On Zoom level **200%**: `64x64` pixels per tile.

> [!NOTE]
> Resizing the map, [go here](#resizing-the-map).

> [!NOTE]
> Calculating Camera Buffer, [go here](#calculating-camera-buffer).

## Sprite

Observations on the tileset used:

- ~~Door in the tileset has a width slightly greater than `16`~~
- ~~Grass on one (32x32) tile can fit up to 4. Thus, 16x16 is 1 grass.~~
- ~~The player should be at least taller than the grass, so adding `+8`~~

<br>

- Door in the tileset has a width slightly greater than `32`
- Grass on one (32x32) tile can fit up to 1. Thus, 32x32 is 1 grass.
- The player should be at least taller than the grass, so adding `+16`

So calculated sprite pixel size (width & height) for player is:

- ~~100% zoom: `16x24`~~
- ~~400% zoom: `64x96`~~
- ~~4 frames: `256x96`~~
- ~~8 frames: `512x96`~~

<br>

- 100% zoom: `32x48`
- 200% zoom: `64x96`
- 4 frames: `256x96`
- 8 frames: `512x96`

## Other Guides

### Resizing the Map

To add space equally to all edges of your map, use the Resize Map tool and apply a uniform offset.

**The Formula:**

If you want to add a specific number of tiles (let's call it $E$ for Edge) to the Top, Bottom, Left, and Right sides:

- **New Width:** Current Width + ($E \times 2$)
- **New Height:** Current Height + ($E \times 2$)
- **Offset X:** $E$
- **Offset Y:** $E$

#### How to Apply This in Tiled

1. How to Apply This in TiledGo to **Map > Resize Map**... in the top menu bar.
2. Enter your calculated **Width** and **Height**.
   - _Example: To add 10 tiles of space to all sides of your 100x80 map, enter `120` for Width and `100` for Height._

3. In the **Offset** section, enter the $E$ value for both X and Y.
   - _Example: Enter `10` for X and `10` for Y._

4. Click **OK**.

### Calculating Camera Buffer

To prevent the camera from ever revealing the empty void outside the map,
the unplayable border (the "buffer zone") must be at least **half the size
of your camera's viewport**.

#### Calculate the Buffer Thickness (B)

First, figure out how many tiles your canvas displays on screen,
then divide by 2 to cover the distance from the player (in the center)
to the edge of the screen.

- Visible Tiles X = (Canvas Width / Camera Zoom) / Tile Size
- Visible Tiles Y = (Canvas Height / Camera Zoom) / Tile Size

Take the larger of those two numbers, divide it by 2, and round up to the nearest whole number. This is your Buffer Thickness (B). You will apply this equally to all four sides of the map.

**Practical Example**

Tile Size = 32

**1. Calculate the Visible Tiles (accounting for 2x zoom)**

Because your camera is zoomed in at 2x, the engine only needs to render half as many pixels on screen.

- Effective Screen Width: 1280 / 2 = 640 pixels
- Effective Screen Height: 720 / 2 = 360 pixels
- Visible Tiles X: 640 / 32 = 20 tiles wide
- Visible Tiles Y: 360 / 32 = 11.25 tiles high

**2. Calculate the Buffer Thickness (B)**

Divide the visible tiles by 2 (distance from the center of the screen to the edge).

- X Buffer Needed: 20 / 2 = 10 tiles
- Y Buffer Needed: 11.25 / 2 = 5.625 (rounds up to 6 tiles)

Since you want to add space equally on all edges to keep the grid uniform,
take the larger number. Your Buffer Thickness (B) is 10 tiles.

Add `10` tile as spaces equally on all edges of the map. (See: [Resizing the map](#resizing-the-map))

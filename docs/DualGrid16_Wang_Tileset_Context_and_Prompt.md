# Dual16 / Wang Tileset Context

## Core Meaning

- **"4×4" always means a 4×4 TILE GRID.**
- Each tile is **32×32 pixels**.
- Therefore:
  - 4 tiles × 32 px = **128 px width**
  - 4 tiles × 32 px = **128 px height**
- The core PNG output is therefore **exactly 128×128 pixels**.
- The 4×4 grid contains **16 tiles total**.
- Never interpret "4×4" as 4×4 pixels.

## Dual16 / Wang Rules

- Preserve the exact **16-tile ordering** from the provided guide.
- Preserve the exact **tile shapes / terrain masks / transition layout**.
- Do not shuffle, redesign, or reinterpret the tile arrangement.
- Each tile remains exactly **32×32 px**.
- Core image width is always exactly **128 px**.
- Core image height is always exactly **128 px**.
- Output format is **PNG**.
- No grid lines unless explicitly requested.

## Terrain Meaning

- **Upper terrain** = the terrain occupying the green area in the guide.
- **Lower terrain** = the terrain occupying the beige/brown area in the guide.
- The upper and lower terrain textures may change based on the request or attached references.
- The Dual16 geometry itself must not change.

## Reference Handling

When reference images are attached:

- Use them for texture, palette, hue, saturation, material, and pixel-art style.
- If a source tileset is provided to modify, modify that source directly whenever possible.
- Preserve its correct Wang/Dual16 structure.
- Do not reconstruct the ordering from scratch unless absolutely necessary.
- Do not change dimensions merely because an image-generation tool produces a larger raw image.

## Optional Upper-Terrain Variation Rows

Extra variation rows are allowed only when requested.

- Width remains exactly **128 px**.
- Each extra variation row adds exactly **32 px** to the height.
- Examples:
  - 4×4 core only = **128×128**
  - core + 1 variation row = **128×160**
  - core + 2 variation rows = **128×192**
- Variation rows are for **upper-terrain-only variations** unless explicitly requested otherwise.
- These variations should reduce visible repetition in Tiled / Aseprite.
- The original 128×128 Dual16 core must remain intact and unchanged.

## Final Verification Before Sending

Before delivering a file, verify all of these:

- PNG format
- Width = **128 px**
- Height = **128 px**, unless extra 32 px variation rows were explicitly requested
- Each core tile = **32×32 px**
- Core grid = **4×4 tiles**
- Core total = **16 tiles**
- Tile ordering unchanged
- Tile masks/shapes unchanged
- Upper terrain applied correctly
- Lower terrain applied correctly
- No accidental upscale
- No grid lines unless requested

---

# Reusable Prompt

```text
Use my Dual16 / Wang tileset rules.

IMPORTANT:
- "4×4" means a 4×4 TILE GRID, not 4×4 pixels.
- Each tile is exactly 32×32 pixels.
- Therefore the 4×4 core output must be exactly 128×128 pixels.
- The core contains exactly 16 tiles.
- PNG output only.

Modify the attached Dual16 / Wang tileset reference directly.

Preserve exactly:
- the 4×4 tile grid
- all 16 tile positions
- the tile ordering
- the terrain mask / transition shapes
- 32×32 px per tile
- 128×128 px total core size

Do NOT:
- shuffle tiles
- redesign the Wang layout
- alter the mask geometry
- upscale the final PNG
- send a large raw generated image
- add grid lines unless I request them

Terrain:
- Upper terrain: [describe it or use my attached reference]
- Lower terrain: [describe it or use my attached reference]

If I attach terrain references:
- use them for texture, hue, saturation, palette, and pixel-art style
- keep the Dual16 geometry and tile ordering unchanged

Optional variation rows:
- only add them if I request them
- each extra row is exactly 32 px high
- width must remain exactly 128 px
- these extra rows are for upper-terrain variations unless I say otherwise
- valid examples are 128×160, 128×192, etc.

Before sending the result, verify the ACTUAL PNG file dimensions.
Do not send it unless the core is exactly 128×128 px, or 128×(128 + N×32) when I explicitly request extra variation rows.
```

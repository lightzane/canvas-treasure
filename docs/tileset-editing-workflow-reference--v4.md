# Tileset Workflow Reference: Buildings, Nature, and Autotiles

Updated: 2026-10-12 · Version 4

## Purpose and use

This is the self-contained working context for creating and editing anime JRPG buildings, structures, nature assets, and autotiles for an HTML Canvas game, using Aseprite and Tiled.

The rules describe the intended geometry, materials, scale, and editing behavior in words. They do not rely on historical image filenames, attachment numbers, screenshots, old coordinates, or access to earlier conversations. The user's current task determines which rules apply; explicit new instructions override an earlier design decision.

For an actual artwork edit, use the exact accepted base supplied for that task. Preserve its current layout and manual cleanup. Do not reconstruct unavailable approved artwork from memory or assume an earlier layout still applies. If the exact base is unavailable, request it before modifying pixels. Reading, discussing, or updating this document does not require earlier artwork.

Map drafts communicate placement and layout only, unless the user explicitly approves their art style. Do not import an old draft's architecture, palette, or perspective into new assets merely because its placement is useful.

## Canonical scale and allocations

- Character: **32 px wide × 48 px tall**.
- Tile: **32 × 32 px**.
- This is the **normal accepted building scale**, not “half scale.”
- Do not resize existing assets unless explicitly requested.
- Match visual scale as well as tile allocation: doors, windows, columns, counters, and buildings must feel consistent beside the character and neighboring structures.

All dimensions below use **width × height**.

| Asset                                     | Established tile allocation                 | Pixel allocation       |
| ----------------------------------------- | ------------------------------------------- | ---------------------- |
| Mansion                                   | 12 × 7                                      | 384 × 224              |
| Player home, blue roof, one floor         | 8 × 5                                       | 256 × 160              |
| Hua Ze Lei's house, blue roof, two floors | 6 × 6                                       | 192 × 192              |
| Mei Zuo's house, purple roof, two floors  | 8 × 6                                       | 256 × 192              |
| Xi Men's house, orange roof, two floors   | 7 × 6                                       | 224 × 192              |
| Other existing houses                     | 5 × 5 or 4 × 4, as allocated for each asset | 160 × 160 or 128 × 128 |
| Market stalls and usable balloon stalls   | 4 × 3                                       | 128 × 96               |
| Current square gazebos                    | 5 × 5                                       | 160 × 160              |
| Beach huts, front and rear variants       | 4 × 4                                       | 128 × 128              |

An allocation is the grid block reserved for an asset, including transparent margins. It is not a requirement to stretch the visible artwork to fill that block. A 4×4 hut should look close in scale to a generic house, not oversized merely because it technically fits.

These are established allocation rules, not a claim that every asset has already been measured. Verify the actual artwork before reporting dimensions. If an inherited asset conflicts with an allocation, report the discrepancy; do not silently crop or rescale approved artwork to make a check pass. The mansion convention is **12 tiles wide × 7 tiles high**.

## Perspective: low top-down, not side view

Use an elevated, orthogonal, Pokémon Gen 3-like map presentation with anime JRPG artwork. The viewer sees substantial roof tops and a restrained amount of front wall. When editing, retain the asset’s established viewing angle; do not impose a new camera angle or roof-to-wall ratio that changes its style.

### Orientation and ground geometry

- Structures face the cardinal map directions. No diagonal placement, isometric rotation, or diamond-shaped ground footprint.
- Square and rectangular foundations, floors, decks, and fountain bases must read as square or rectangular patches on the map grid.
- Their front and back edges have equal width and run horizontally; their side edges are parallel and run vertically. Do not narrow the back or widen the front into a trapezoid.
- Do not introduce perspective convergence or a vanishing point. These assets must sit naturally on top of tiled terrain.
- For the accepted front-facing gazebos, rear columns sit behind the front columns and remain hidden or subtly occluded. Do not spread rear feet outward to imply a trapezoid.
- Front feet share a baseline. Columns must connect cleanly to the roof supports and floor, with complete capitals and bases.

### Roofs and building height

- Show enough of the roof's upper surfaces to read as viewed from above.
- Avoid a side-view/front-elevation impression caused by a shallow strip of roof, a dominant vertical gable face, excessively tall exposed posts, or too much front wall.
- Keep roof exposure and front-wall height consistent with this low top-down view; changing the viewing angle does not authorize enlarging the building.
- Sloping roof edges, hip ridges, and gable details already present in the accepted art are legitimate roof geometry. The orthogonal-footprint rule does **not** mean removing every slanted pixel line from roofs or flattening their architecture.
- Preserve the user's corrected rectangular floors. Do not recreate a trapezoid while trying to make the perspective more “realistic.”

## Crispness, outlines, and palette

Use restrained, low-saturation anime JRPG colors and coherent pixel clusters. Define forms with crisp, moderate, material-colored outlines and shadows. Preserve existing manual outline cleanup when editing.

### What “blurred” meant in this project

The earlier complaint concerned **weak, missing, or broken shape definition**, including internal roof junctions—not simply literal image blur. Some structures were clear at the same zoom while others felt indistinct. The user compared Tiled's 200% export with Aseprite's 200% Nearest Neighbor resize and observed the same result.

For that reported workflow, Tiled exports the enlarged PNG before Canvas draws it as-is. The tileset remains at native size in the source file; the character uses a separate 64×96 asset for the 200% presentation. Do not default to Canvas smoothing advice or blame zoom again without new evidence. Disabling smoothing cannot repair unclear artwork or pixels already baked into an imported PNG.

### Art rules

- Make silhouettes and important internal boundaries readable: roof planes, ridges, dormers, eaves, wall corners, windows, doors, columns, floor edges, stall frames, stonework, and foliage clusters.
- Use moderate, material-colored shadows/outlines. Keep major structural divisions stronger than minor surface seams.
- Avoid both missing/broken boundaries and excessive doubled or chunky black outlines. Preserve intentional subtle highlights and the user's outline cleanup.
- Keep bushes and flowers readable as coherent clusters; avoid noisy isolated pixels and soft smears.
- Do not use global sharpening, blanket darkening, or outlines around every roof tile and leaf as a universal fix.
- Avoid oversaturated teal/cyan or any asset whose saturation or contrast makes it look unrelated to the sheet.
- Environment detail should remain clear without competing with the player/NPC outline emphasis.
- Design details for the intended native pixel size. Do not create excessive large-image detail and rely on shrinking it to become good pixel art.
- Inspect at native size and at 200% with Nearest Neighbor. A large attractive preview does not establish that the native asset works.

These principles apply to **every structure and material**, not only roofs. Review broadly when requested, but change only the authorized assets.

## Transparency, grid alignment, and spacing

- Output a transparent PNG. No solid backdrop, baked checkerboard, labels, or grid lines unless requested.
- Each complete asset stays inside its own block aligned to the 32px grid.
- Keep at least **one fully transparent 32px tile column between neighboring asset blocks** and **one fully transparent 32px tile row between asset rows**. Use 1–2 empty rows when requested.
- The gap must be empty across the relevant extent, including roofs, bushes, flowers, and any asset shadows. Nearly transparent stray pixels still contaminate selection.
- No cropping, cut-off roofs, truncated posts, overlapping assets, or slivers from a neighbor inside another block.
- Preserve the latest PNG's layout and manually cleaned spacing. Expand the transparent canvas only when additions or inserted rows require it; never rescale the sheet to make room.
- For autotiles, spacing separates complete source blocks. The nine tiles inside a 3×3 block and four tiles inside a 2×2 block are contiguous; do not insert gaps between their component tiles.

## Editing workflow: preserve the accepted base

1. Inspect the latest exact PNG and identify the authorized edit regions and current asset blocks.
2. Keep an untouched copy for comparison. Do not regenerate the entire accepted sheet with image generation.
3. Create new or redesigned artwork separately. Finish and review it at its intended native size before inserting it.
4. Composite only the approved new/replacement assets into the exact base. Preserve every pixel outside the authorized regions, including transparency.
5. For additions, preserve all existing artwork. If inserting a row requires moving assets, move intact blocks by whole-tile offsets without resampling and compare their pixels at the new positions.
6. Do not redesign, recolor, resize, rearrange, add flowers/bushes, or add decorations unless the task authorizes it. Scope permissions to the requested assets.
7. If proposals are requested, show them separately and wait for selection before editing the final sheet.
8. Verify the result before returning the PNG. Describe only checks actually performed.

“Keep existing pixels untouched” means all pixels **outside the expressly requested edit** remain unchanged. A requested roof replacement permits changing that roof; it does not permit redrawing the rest of the sheet.

## Variant and structure-specific lessons

### Houses

Story houses can be more distinctive and premium than generic residences, while remaining less lavish than the mansion. Player home has one floor; the other three story houses have two. Dao Ming Si lives in the mansion. Generic residences remain simpler and reusable.

For a requested no-door variant, duplicate the exact approved house and remove only the requested door/stairs. Reconstruct the exposed wall, foundation, or plants cleanly. Do not leave copied roof fragments, seams, ghost outlines, or a dirty patch. Preserve size and all unrelated details. Place a duplicate row below the originals only when requested, with full tile spacing.

### Gazebos

The paired orange-roof and blue-green-roof gazebo variants are square pavilions with low hipped roofs and small raised roof caps. Each has a complete rectangular stone floor and intact columns. Their geometry, floors, and supports match; only the roof color differs.

When making a recolored variant, finish one complete model first, duplicate it exactly, and recolor only the requested material. Do not assemble the variant from incompatible floor/column fragments or regenerate each copy independently. Verify identical silhouettes and unchanged pixels outside the recolor mask.

### Beach huts and stalls

Beach huts use the accepted elevated top-down roof view and stay within **4×4 tiles**, visually close to generic houses. Preserve the front hut's door and the rear variant's no-door identity. Do not enlarge them as a side effect of correcting perspective.

Market stalls and usable balloon stalls fit **4×3 tiles**. Balloon stalls should feel stocked and usable. When requested, match a stall roof to the house roof in its corresponding column.

## Autotiles: 3×3 outer sets and 2×2 inward corners

### Meaning of the grids

All grid counts mean **tiles**, never pixels. Every tile is exactly **32×32 px**.

| Set                         | Contents                                                           | Native PNG block size                                           |
| --------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- |
| Basic tile asset            | Complete fixed decoration, placed as-is                            | Its requested allocation; e.g. 1×1 = 32×32 px or 2×1 = 64×32 px |
| 3×3 autotile block          | Four convex outer corners, four directional edge tiles, one center | 96×96 px; nine tiles                                            |
| 2×2 inward-corner companion | Four distinct concave L-shaped turns, one per tile                 | 64×64 px; four tiles                                            |

The 3×3 source order is:

| Top-left outer corner    | Top edge    | Top-right outer corner    |
| ------------------------ | ----------- | ------------------------- |
| Left edge                | Center      | Right edge                |
| Bottom-left outer corner | Bottom edge | Bottom-right outer corner |

The 3×3 tiles can assemble rectangles of different sizes. A 2×2 **map rectangle** can use its four outer corners. This is different from a 2×2 **source block of inward corners**, used for recesses and turns in non-rectangular layouts. Never substitute four outer corners or a resized planter for the inward-corner companion.

The established planter materials are wood, gray stone, and warm stone, each with flowers and with soil only. Every material/fill combination needs its own matching inward-corner companion. For example, six 3×3 sets require six 2×2 companions: **24 individual inward-corner tiles**. Each 3×3 + 2×2 pair provides 13 source tiles. This is the requested outer/edge/center plus single inward-corner set, not a promise of a complete atlas for every one-tile corridor, end cap, or multiple-notch configuration. Do not confuse it with the separate Dual16/Wang 4×4 terrain workflow.

### Companion placement and orientation

- Keep the original 3×3 block completely untouched when asked to add missing corners. Do not repair joins by changing its accepted edge tiles.
- Place each matching 2×2 companion beside its 3×3 source, separated by a fully transparent 32px column, following the latest user's layout. Preserve existing positions. If there is insufficient space, expand the canvas and resolve placement without silently moving approved assets.
- Each of its four tiles represents a separate 90° inward turn. In the accepted companion arrangement, the recessed corners face the center of the 2×2 block, rather than its four outside corners. Do not arrange them as a cross-shaped cluster.
- Name a tile by the **empty diagonal/recess direction** to avoid confusing its function with its atlas position:

| Position in companion | Inward recess / empty diagonal | Boundary segments that meet |
| --------------------- | ------------------------------ | --------------------------- |
| Top-left tile         | Southeast                      | Bottom edge and right edge  |
| Top-right tile        | Southwest                      | Bottom edge and left edge   |
| Bottom-left tile      | Northeast                      | Top edge and right edge     |
| Bottom-right tile     | Northwest                      | Top edge and left edge      |

The center opening visible when these four source tiles sit together is a consequence of this packing; it is not a new decorative object to design. Select each 32×32 tile individually for the corresponding map turn. Do not rotate or mirror a finished shaded tile indiscriminately: screen-facing wall depth, highlights, and shadows must remain consistent with the material and viewing angle.

### Choose edge behavior from the material and intended assembly

**An inward L describes a turn in the map, not a universal pixel-edge treatment. Not every autotile should be ragged.** First identify what the visible edge represents and how the tiles will be assembled.

| Edge or layer                                                                       | Intended behavior                                                                                                    | What to avoid                                                                                           |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Bush, hedge, garden leaves, or a planted foliage boundary                           | Natural leaf clusters with restrained irregularity, including at inward L corners                                    | Ruler-straight foliage cuts, smooth mechanical notches, uniform saw teeth, or isolated oversized tufts  |
| Wall, wooden rail, built planter frame, platform rim, or intentionally cut boundary | Coherent structural edges and orthogonal turns; straight lines where the construction calls for them                 | Applying bush-like raggedness to every surface, tapered joints, flared caps, or broken wall depth       |
| Flowers or leaves overlapping a built container                                     | Treat the layers separately: a sound structural rim underneath and subtly irregular living foliage above it          | Making the frame wavy to imitate leaves, or cutting foliage into a perfect rectangle to match the frame |
| Rough stone, earth, or another material                                             | Follow its intended construction or natural surface behavior; use only the irregularity appropriate to that material | Assuming either perfectly straight or ragged edges solely because the asset is an autotile              |

The map connection remains cardinal and the turn remains recognizably L-shaped. Small rounded leaf clusters and organic contour changes do not authorize diagonal paths, isometric placement, or trapezoid ground footprints. If the intended material or assembled behavior is genuinely unclear, clarify it before redesigning the edge.

### Constructed inward L corners: coherent structure

A constructed corner must read as a continuous orthogonal 90° junction. Horizontal and vertical rails meet without a pinched taper, diagonal stepped wedge, funnel, stretched stripe, or flared cap. The visible rim and wall maintain coherent thickness and depth; fill stays inside the structure and ground stays outside.

- Trace the horizontal rim, vertical rim, inner outline, and exposed wall face separately through the turn. Continue each from its neighboring edge tile.
- Match the material's rim width, shadow weight, texture scale, and directional wall depth. Horizontal and vertical profiles may differ because the view shows a front face; do not force identical pixel thickness or replace the junction with a diagonal splice.
- Build the junction from the actual structure. Copying two whole edge tiles across a diagonal can match the perimeter while producing an incorrect interior shape.
- Preserve intentional straight cuts on constructed materials. Small joints, chips, or weathering are material details, not permission to deform the entire rail or wall.
- For planted structures, leaves may gently overlap the inner rim, but must not hide a broken junction or be sliced at tile joins.

### Natural inward L corners: continuous living foliage

An inward corner in a bush or leafy border needs the same natural edge language as its outward edges. The empty ground must meet recognizable leaf tips and coherent clumps all the way through the turn. A straight rectangular cut with a few flowers pasted beside it still looks mechanically cut.

- Shape the complete inward-facing contour, including both arms of the L and the bend. Avoid a smooth notch where only the outer silhouette is leafy.
- Vary the length and spacing of small leaf tips and the shallow recesses between clumps. Keep the raggedness subtle and continuous, not a uniform zigzag, noisy pixel fringe, or repeated saw-tooth pattern.
- Continue leaf texture, canopy highlights, lower-face shadows, and moderate green outlines around the irregular contour. Changing transparency alone can expose an unfinished cut through the foliage; finish the newly exposed leaf edge as well.
- Keep the corner's usable footprint, connections, and apparent hedge thickness coherent. Do not hide a seam by piling on oversized tufts or introduce an unintended hole, disconnected leaf fragment, or neighboring-tile bleed.
- Preserve whole flower heads and readable leaf clusters. Relocate an affected bloom when authorized instead of cutting it in half at a boundary.
- Inspect all four inward orientations in assembled map turns, including transitions between straight runs and corners. A source tile can look acceptable alone and still expose a mechanical line when repeated.

The geometric lesson and the material lesson must be applied together: constructed edges need sound structural turns; natural foliage needs sound turns with naturally irregular contours. Neither rule replaces the other.

### Filled bush centers and visible scale

- **The current big and small bush autotiles have filled foliage center tiles.** The empty-center / hollow-square-bush experiment was withdrawn. Do not clear their center tiles or reintroduce hollow inner borders unless a new task explicitly requests that behavior.
- For other autotiles, choose the center contents from their intended function; a center may represent foliage, soil, paving, water, or explicitly requested empty space. Do not generalize a bush decision to every material.
- The opening visible between four packed inward-corner tiles is a consequence of the 2×2 companion arrangement. It does not mean the 3×3 center tile should be empty.
- Tile allocation and visible artwork size are different. Judge a bush at native size beside a 32×48 character and also assemble its four outer corners into a 2×2 map block. A 96×96 source block alone does not tell you how large the smallest assembled bush will look.
- For requested smaller new bushes, design the visible foliage and transparent margins within the same 32px tile grid. Do not resize the whole sheet or silently alter an approved bush's scale.

### Variations that reduce repetition

When the request is “the same exact bush with different flower/leaf placement,” retain its scale, silhouette, palette, lighting direction, tile roles, and natural inward-corner geometry. Vary the surface arrangement instead of redesigning the bush.

- Give each requested variation a complete 3×3 source block and matching 2×2 inward-corner companion unless the task specifies a different deliverable.
- Preserve the original sets. Add new blocks in the requested direction, with fully transparent 32px spacing between blocks and no gaps within a block.
- For freely interchangeable variants, preserve matching alpha silhouettes and exact connecting edge pixels for each corresponding tile. Confine leaf and flower rearrangements to areas that do not break those connections.
- Stagger flower positions across the tile interior. Vary bloom size, color distribution, spacing, and local density; include some foliage-only patches. Avoid mirrored corner bouquets, evenly aligned rows, and identical flower offsets in every tile.
- Rearrange coherent native-size leaf clusters while maintaining canopy shading and structural readability. Do not substitute random pixel noise, global recoloring, whole-asset mirroring, or nearly identical duplicates for real placement variation.
- Keep blooms clearly visible at native size without crowding the foliage. Add only the requested number of variants.
- Test mixed originals and variants in long horizontal and vertical runs, rectangles, and all four inward L turns. Each tile will still repeat when reused; variation supplies compatible alternatives to break the regularity when mixed.

Accepted manual corrections remain protected. Apply these lessons to future authorized work; do not automatically repaint existing assets when updating this document.

### Flowerbed style and fill variants

- Use complete, readable flower heads and coherent leaf clusters, with muted colors, moderate colored outlines, and visible upper surfaces in the low top-down view. Avoid front-facing bouquets or tall basket sides.
- Foliage must have a continuous, subtly irregular perimeter. Small leaf tips and petals can bloom slightly over the container's **inner rim**, while staying inside the allocated asset block.
- Avoid a straight rectangular foliage cutoff with occasional large clumps pasted over it. Also avoid excessive raggedness, long overhangs, clipped flowers, and noisy isolated pixels. Structural rims may be straight; the living foliage perimeter should not look cut with a ruler.
- Soil-only versions retain their corresponding platform design and palette, with soil inside and no flowers or leaves. The exterior stays transparent; do not remove the soil when clearing plants.

### Autotile verification before delivery

1. Confirm each 3×3 is exactly 96×96 px and each companion exactly 64×64 px, on 32px-aligned coordinates. Confirm four distinct 32×32 inward-corner tiles per companion.
2. Compare the output against the exact supplied base. For an additions-only task, verify every original RGBA pixel outside the new blocks is unchanged, including every accepted 3×3 and companion set. Never infer preservation from visual similarity alone.
3. Verify transparent 32px spacing between blocks, with no internal padding between component tiles.
4. Check edge compatibility with the actual source tiles, including center connections, soil/foliage continuity, and intact flower clusters. Do not alter approved neighbors to make the checks pass.
5. Assemble test rectangles (2×2, 3×3, and a larger rectangle), then **L-shaped turns in all four orientations** using the new inward corners. Include a recessed/U-shaped example when useful to check neighboring turns. These are temporary previews, not extra assets to append without permission.
6. Inspect assembled results at native size and 200% Nearest Neighbor, preferably over a terrain-colored preview. Judge the edge according to its material: coherent rim/wall geometry for constructed turns, and continuous irregular leaf contours for natural turns. Check for unintended blank squares, wedges, doubled outlines, depth jumps, clipped vegetation, and straight-cut foliage. A numerical seam pass cannot replace this visual test.
7. For variants, compare corresponding silhouettes and connecting edge pixels, then visually inspect mixed-variant runs and turns. Confirm the bush center remains filled unless the current task explicitly changes it.
8. Export the actual tileset as transparent PNG without preview terrain, labels, or grid lines. Report only checks actually completed. If the task is documentation or observation only, leave the PNG untouched.

## Before-output checklist

- Correct latest reference used; no accidental reversion to an earlier layout or rejected design.
- Requested change complete; all other pixels unchanged, or unchanged within explicitly moved blocks.
- Native scale and tile allocations checked; no unauthorized resampling or resizing.
- Required spacing fully transparent, with no neighboring pixels inside a selection block.
- Complete roofs, walls, floors, columns, feet, and asset edges; no overlaps or cuts.
- Top-down view matches the accepted art; rectangular ground geometry does not converge into a trapezoid.
- Crisp silhouettes and internal forms at 100% and 200%; normal colored outline weight and restrained saturation.
- Duplicated color variants identical except for the intended recolored pixels.
- For autotiles, verify the 3×3 + 2×2 dimensions, companion orientation, compatible seams, and material-appropriate inward turns: natural foliage has leafy irregularity; constructed edges retain their intended geometry. A border-pixel comparison alone is insufficient.
- Transparent PNG exported with no baked preview background or grid.

## Reusable reminder prompt

Copy this prompt with this document. For artwork edits, also supply the exact base to edit; no historical images are needed to understand the rules:

```text
Read the attached self-contained tileset workflow guide. For artwork edits, inspect the exact accepted base supplied for this task and preserve its manual spacing and outline cleanup. Do not assume access to earlier images or conversations; request the base if an edit requires it and it is unavailable. Use map drafts for placement only unless I explicitly approve their art style.

Scale and layout:
- Character = 32×48 px; tile = 32×32 px. This is the normal accepted scale.
- Transparent PNG only. Each complete asset stays inside its own 32px-aligned block.
- Keep at least one completely empty 32px tile column between neighboring blocks and one completely empty 32px tile row between asset rows.
- No cropping, overlap, stray neighboring pixels, or cut-off roofs/columns/floors.
- Do not redesign, recolor, resize, or rearrange anything beyond the requested task.
- Never regenerate or rescale the full sheet. Create requested assets separately, then composite only the authorized edits into the exact base.
- Preserve every pixel outside the requested edit regions. Expand the transparent canvas only when additions/inserted rows require it; move existing blocks intact only when necessary for the requested insertion.

Perspective:
- Match the accepted low top-down anime JRPG / Pokémon Gen 3-like map angle, not side view or front elevation.
- Keep structures aligned to cardinal map directions; no diagonal/isometric placement.
- Square/rectangular ground footprints, floors, decks, foundations, and fountain bases must not become trapezoids: equal front/back widths, horizontal front/back edges, and parallel vertical sides.
- Show roof upper surfaces clearly from above. Avoid dominant vertical gables or overly tall exposed walls/posts.
- Gazebo rear posts stay hidden behind the front posts; front feet share a baseline. All supports connect cleanly to roof and floor.
- Preserve legitimate sloped roof details already used in the accepted art; do not confuse roof slopes with rotated or trapezoidal ground geometry.

Art clarity:
- Use the latest sheet's low-saturation palette and moderate material-colored outlines.
- Keep silhouettes AND internal structural boundaries crisp across roofs, walls, windows, doors, stonework, floors, columns, stalls, and foliage.
- No broken/missing shape boundaries, excessive black outlines, duplicated edge lines, oversaturated colors, or noisy microdetail.
- The earlier “blur” complaint meant weak edge/shape definition. Do not default to Canvas smoothing advice: the 200% Tiled and Aseprite Nearest Neighbor outputs were already compared.
- Judge at native size and 200% Nearest Neighbor, not only an enlarged concept preview.

Established allocations, width × height in tiles:
- Mansion: 12×7.
- Story houses: player home 8×5; Hua Ze Lei 6×6; Mei Zuo 8×6; Xi Men 7×6.
- Other houses: preserve their existing 5×5 or 4×4 allocations.
- Market and balloon stalls: 4×3.
- Square gazebos: 5×5. The orange-roof and blue-green-roof pair share a complete stone-floor model; only roof color differs.
- Both beach huts: 4×4, visually comparable to generic houses; preserve the rear variant without a door.
- These are allocation rules, not a reason to stretch artwork. If the supplied PNG conflicts, report it instead of silently changing approved art.

Autotiles, when requested:
- A 3×3 = nine 32×32 tiles (96×96 px): four OUTER corners, four edges, one center. Its missing INNER corners require a separate 2×2 = four 32×32 tiles (64×64 px), one L-shaped inward turn per tile.
- Add one matching 2×2 beside each requested 3×3 with a fully empty 32px column between the blocks. Tiles within each block touch without padding. Do not modify, move, resize, or regenerate the accepted 3×3 sets to add their companions.
- Arrange the companion tiles with their inward recesses facing the center: top-left has a southeast recess; top-right southwest; bottom-left northeast; bottom-right northwest. Do not produce a cross-shaped arrangement or substitute outer corners.
- Choose edge behavior from the material and intended assembly. Not all autotiles are ragged. Constructed walls, rails, platforms, and cut rims need coherent structural edges and 90° turns without pinched tapers, flared caps, diagonal wedges, or depth jumps. Do not apply bush-like raggedness to those structures.
- Bushes, hedges, and garden foliage need continuous natural leaf contours on BOTH arms and the bend of every inward L. Use restrained irregular leaf clumps and matching shading/outlines, not straight cuts, smooth mechanical notches, uniform saw teeth, or a few tufts pasted onto a straight line.
- For planted containers, keep the structural frame sound and treat overlapping foliage separately. Organic leaf contours do not authorize diagonal paths or trapezoid footprints.
- Keep the big and small bush centers filled with foliage. The earlier hollow-center idea was withdrawn. The packed inward-corner companion's opening does not imply an empty center tile.
- When requesting placement variations, preserve the original assets and the same scale, silhouette, palette, lighting, and exact connecting edges. Vary whole flower/leaf clusters with asymmetric positions, bloom sizes, colors, and density. Supply a matching 3×3 + 2×2 pair per requested variation and test mixed-variant runs and turns.
- Preserve accepted corrections unless I authorize a change. Do not blindly rotate shaded tiles or diagonally splice whole edges to fake a corner.
- For flowers, keep a subtly irregular continuous leafy edge extending slightly over the inner rim, with complete readable blooms. No straight clipped foliage rectangle, excessive overhangs, or oversized pasted tufts.
- Check actual assembled L-turns in ALL four orientations as well as 2×2/3×3/larger rectangles at native size and 200% Nearest Neighbor. Exact edge matches do not prove the corner's interior shape, shading, or wall depth is correct.
- A 3×3 plus four inward corners provides 13 tiles for the requested shapes; do not confuse it with Dual16/Wang 4×4 terrain tiles or claim every possible narrow/multiple-notch layout is covered.

Before output, verify unchanged pixels outside the task, asset scale, tile blocks, transparent spacing, intact geometry, top-down perspective, crispness, material-appropriate inward edges, and variant compatibility where applicable. For recolored duplicates, copy one finished model and change only the requested colors. If I ask for proposals, show previews for selection before changing the final sheet.

Task:
[Describe the exact requested changes here.]
```

## Short reminder prompt

```text
Read the attached self-contained workflow guide. For edits, use the exact accepted base supplied for this task; ask for it if unavailable rather than assuming access to old images. Character 32×48; tiles 32×32; transparent PNG; complete grid-aligned blocks with a fully empty 32px row/column between neighbors. Preserve all pixels outside the requested edit, manual cleanup, native scale, muted colors, moderate colored outlines, and low top-down perspective. Rectangular ground footprints remain orthogonal, with no trapezoid convergence. No full-sheet regeneration or unauthorized redesign/resizing.

Autotiles use a 3×3 block (96×96 px) plus a matching 2×2 inward-corner block (64×64 px), with 32px spacing between blocks. Pack inward recesses SE, SW / NE, NW. Choose the edge by material: constructed walls/frames keep coherent straight structural turns; natural bushes/leaves need subtly ragged leaf contours through both arms and the bend of each inward L. Mixed assets keep a sound frame under irregular foliage. Never impose raggedness on every autotile. Bush centers remain filled; discard the withdrawn hollow-center idea.

For variations, preserve silhouettes and exact connecting edges while changing flower/leaf placement asymmetrically. Keep original sets untouched. Verify native size and 200% Nearest Neighbor, including all four L turns and mixed-variant assemblies; matching seam pixels alone is insufficient.

Task: [Describe the exact requested changes.]
```

## Canonical one-line rule

**Preserve the exact accepted artwork, native 32px tile / 32×48 character scale, transparent spacing, and orthogonal top-down geometry; change only the authorized regions. For autotiles, keep the 3×3 + 2×2 structure and match edge behavior to the material: leafy inward turns for nature, coherent constructed turns for walls and frames, with filled bush centers and compatible placement variations. Judge the assembled result, not seam pixels alone.**

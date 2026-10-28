# Tileset Workflow Reference: Buildings, Nature, and Autotiles

Updated: 2026-10-12 · Version 3

## Purpose and authoritative reference

This is the canonical context for creating and editing my anime JRPG building, structure, nature, and planter autotiles for an HTML Canvas game, using Aseprite and Tiled.

Choose the latest user-accepted PNG for the asset category being edited:

- **Nature and planter autotiles:** `tileset-trees--v2.png`, supplied on 2026-10-12, is the current accepted reference for this update. It is **736 × 672 px RGBA**, with the user's corrected inward corners. Preserve its layout, six original 3×3 planter sets, and manual corrections. **No PNG changes were requested in this documentation update.**
- **Buildings:** the previous guide recorded `tileset-buildings.png` at **1088 × 1632 px RGBA** as its 2026-10-06 reference, including manually cleaned spacing and outlines. This is historical reference information, not a claim about the dimensions of a later building sheet. Inspect the newly supplied building PNG for any future building task.

The latest accepted PNG supersedes earlier generated versions for that category. An older filename, coordinate list, or saved assistant output must never override a newer user attachment.

Read this document and inspect the latest accepted PNG before editing. If I attach a newer accepted PNG, that file becomes the base. Do not assume old coordinates still apply after I rearrange a sheet. Use map drafts for placement only, unless I explicitly approve them as art references.

For use in a new conversation, attach this document and the latest accepted PNG together, then use the reminder prompt below. The written context should not depend on an assistant remembering an earlier conversation.

## Canonical scale and allocations

- Character: **32 px wide × 48 px tall**.
- Tile: **32 × 32 px**.
- This is the **normal accepted building scale**, not “half scale.”
- Do not resize existing assets unless explicitly requested.
- Match visual scale as well as tile allocation: doors, windows, columns, counters, and buildings must feel consistent beside the character and neighboring structures.

All dimensions below use **width × height**.

| Asset                                     | Established tile allocation                | Pixel allocation       |
| ----------------------------------------- | ------------------------------------------ | ---------------------- |
| Mansion                                   | 12 × 7                                     | 384 × 224              |
| Player home, blue roof, one floor         | 8 × 5                                      | 256 × 160              |
| Hua Ze Lei's house, blue roof, two floors | 6 × 6                                      | 192 × 192              |
| Mei Zuo's house, purple roof, two floors  | 8 × 6                                      | 256 × 192              |
| Xi Men's house, orange roof, two floors   | 7 × 6                                      | 224 × 192              |
| Other existing houses                     | 5 × 5 or 4 × 4, according to the reference | 160 × 160 or 128 × 128 |
| Market stalls and usable balloon stalls   | 4 × 3                                      | 128 × 96               |
| Current square gazebos                    | 5 × 5                                      | 160 × 160              |
| Beach huts, front and rear variants       | 4 × 4                                      | 128 × 128              |

An allocation is the grid block reserved for an asset, including transparent margins. It is not a requirement to stretch the visible artwork to fill that block. A 4×4 hut should look close in scale to a generic house, not oversized merely because it technically fits.

These are established scale rules, not a claim that every occupied-pixel bound in every supplied PNG has been measured. Verify the actual reference before reporting dimensions. If an inherited asset conflicts with an allocation, report the discrepancy; do not silently crop or rescale approved artwork to make a check pass. The mansion convention is **12 wide × 7 high**, correcting the older document's reversed “7×12” wording.

## Perspective: low top-down, not side view

Use the latest accepted buildings as the viewing-angle reference: an elevated, orthogonal, Pokémon Gen 3-like map presentation with anime JRPG artwork. Match the reference visually rather than imposing a camera angle or roof-to-wall ratio that changes the style.

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
- Match the accepted houses and gazebos; changing the viewing angle does not authorize enlarging the building.
- Sloping roof edges, hip ridges, and gable details already present in the accepted art are legitimate roof geometry. The orthogonal-footprint rule does **not** mean removing every slanted pixel line from roofs or flattening their architecture.
- Preserve the user's corrected rectangular floors. Do not recreate a trapezoid while trying to make the perspective more “realistic.”

## Crispness, outlines, and palette

Use restrained, low-saturation anime JRPG colors and coherent pixel clusters. The accepted mansion, fountains, and blue/green gazebos establish the desired moderate outline weight; the latest cleaned sheet is the final reference.

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

The accepted third and fourth gazebos use design C: a square pavilion with a low hipped roof and a small raised roof cap. They have complete stone floors and intact columns. Their geometry, floor, and supports are the same; the third roof is orange and the fourth is blue-green.

When making a recolored variant, finish one complete model first, duplicate it exactly, and recolor only the requested material. Do not assemble the variant from incompatible floor/column fragments or regenerate each copy independently. Verify identical silhouettes and unchanged pixels outside the recolor mask.

### Beach huts and stalls

Beach huts use the accepted elevated top-down roof view and stay within **4×4 tiles**, visually close to generic houses. Preserve the front hut's door and the rear variant's no-door identity. Do not enlarge them as a side effect of correcting perspective.

Market stalls and usable balloon stalls fit **4×3 tiles**. Balloon stalls should feel stocked and usable. When requested, match a stall roof to the house roof in its corresponding column.

## Autotiles: 3×3 outer sets and 2×2 inward corners

### Meaning of the grids

All grid counts mean **tiles**, never pixels. Every tile is exactly **32×32 px**.

| Set                         | Contents                                                   | Native PNG block size                                           |
| --------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| Basic tile asset            | Complete fixed decoration, placed as-is                    | Its requested allocation; e.g. 1×1 = 32×32 px or 2×1 = 64×32 px |
| 3×3 autotile block          | Four convex outer corners, four straight edges, one center | 96×96 px; nine tiles                                            |
| 2×2 inward-corner companion | Four distinct concave L-shaped turns, one per tile         | 64×64 px; four tiles                                            |

The 3×3 source order is:

| Top-left outer corner    | Top edge    | Top-right outer corner    |
| ------------------------ | ----------- | ------------------------- |
| Left edge                | Center      | Right edge                |
| Bottom-left outer corner | Bottom edge | Bottom-right outer corner |

The 3×3 tiles can assemble rectangles of different sizes. A 2×2 **map rectangle** can use its four outer corners. This is different from a 2×2 **source block of inward corners**, used for recesses and turns in non-rectangular layouts. Never substitute four outer corners or a resized planter for the inward-corner companion.

There are six current planter styles: wood, gray stone, and warm stone, each with flowers and with soil only. Each 3×3 set has its own matching 2×2 companion: six companions, **24 individual inward-corner tiles**. Together, each pair provides 13 source tiles. This is the requested outer/edge/center plus single inward-corner set, not a promise of a complete atlas for every one-tile corridor, end cap, or multiple-notch configuration. Do not confuse it with the separate Dual16/Wang 4×4 terrain workflow.

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

The center opening visible when these four source tiles sit together is a consequence of this packing; it is not a new decorative object to design. Select each 32×32 tile individually for the corresponding map turn. Do not rotate or mirror a finished shaded tile indiscriminately: screen-facing wall depth, highlights, and shadows must remain consistent with the original planter.

### What the October 12 correction teaches

The rejected upper pair of inward-corner tiles joined the horizontal rim to the vertical rim with a **diagonal taper and stepped wedge**. The rail flared and narrowed around the bend; its top surface, outline, and exposed wall bands did not read as a clean continuation. In the assembled L-shaped planter this looked pinched or awkward, even though the source tiles connected without a blank square.

The user's correction makes that junction read as a **clean rectangular 90° turn**: the horizontal rail ends cleanly at the upright rail, the upright remains straight, and the visible rim and wall have coherent thickness and depth. The soil stays inside the planter and the ground remains outside. It does not need a funnel, diagonal stair-step wedge, stretched wall stripe, or flared cap to connect the two directions.

For future work:

- Trace the horizontal rim, vertical rim, inner outline, and exposed wall face separately through the turn. Each must continue logically from its neighboring straight-edge tile.
- Match each material's accepted rim width, shadow weight, texture scale, and directional wall depth. Horizontal and vertical profiles may differ because the view shows a front face; do not force identical thickness everywhere or collapse this distinction into a diagonal wedge.
- Build the junction from the actual structure. A diagonal cut-and-paste between two whole edge tiles can match the perimeter pixels while producing incorrect geometry inside the tile. Pixel-edge equality is only one check, not proof of a correct corner.
- Keep the footprint orthogonal and the corner visibly L-shaped. A small material joint is acceptable where it belongs; a diagonal transition must not replace the required square turn or distort its wall face.
- For flower variants, keep the same sound frame underneath. Leaves can overlap the inner rim gently, but must not hide a broken junction or be sliced at the tile joins.

The supplied corrections communicate the intended **visual geometry**, not a requirement to reproduce every beginner brush mark in newly created assets. Use professional cleanup for future authorized additions. However, the current corrected PNG is accepted: **do not polish, repaint, or adjust it without a new request.**

Reference trail for this lesson, if these images are supplied again:

| File                         | Role                                                                   |
| ---------------------------- | ---------------------------------------------------------------------- |
| `image(20261012-011839).png` | Rejected companion close-up: tapering upper rim and stepped inner face |
| `image(20261012-011916).png` | Rejected assembled L-shaped turn                                       |
| `image(20261012-011933).png` | User-corrected companion: clean rectangular junction                   |
| `image(20261012-011955).png` | User-corrected assembled turn; intended visual result                  |
| `tileset-trees--v2.png`      | Accepted sheet with the corrected inward corners                       |

These filenames are reference breadcrumbs; the rules above must remain understandable when only this document and a newer accepted PNG are shared.

### Flowerbed style and fill variants

- Use the accepted first 1×1 flower basket as the reference for readable leaf and flower clusters. Match muted colors, moderate colored outlines, and the low top-down view; avoid front-facing bouquets or tall basket sides.
- Foliage must have a continuous, subtly irregular perimeter. Small leaf tips and petals can bloom slightly over the container's **inner rim**, while staying inside the allocated asset block.
- Avoid a straight rectangular foliage cutoff with occasional large clumps pasted over it. Also avoid excessive raggedness, long overhangs, clipped flowers, and noisy isolated pixels. Structural rims may be straight; the living foliage perimeter should not look cut with a ruler.
- Soil-only versions retain their corresponding platform design and palette, with soil inside and no flowers or leaves. The exterior stays transparent; do not remove the soil when clearing plants.

### Autotile verification before delivery

1. Confirm each 3×3 is exactly 96×96 px and each companion exactly 64×64 px, on 32px-aligned coordinates. Confirm four distinct 32×32 inward-corner tiles per companion.
2. Compare the output against the exact supplied base. For an additions-only task, verify every original RGBA pixel outside the new blocks is unchanged, including all six 3×3 sets. Never infer preservation from visual similarity alone.
3. Verify transparent 32px spacing between blocks, with no internal padding between component tiles.
4. Check edge compatibility with the actual source tiles, including center connections, soil/foliage continuity, and intact flower clusters. Do not alter approved neighbors to make the checks pass.
5. Assemble test rectangles (2×2, 3×3, and a larger rectangle), then **L-shaped turns in all four orientations** using the new inward corners. Include a recessed/U-shaped example when useful to check neighboring turns. These are temporary previews, not extra assets to append without permission.
6. Inspect assembled results at native size and 200% Nearest Neighbor, preferably over a terrain-colored preview. Trace the rim and wall through each bend: no blank square, tapered notch, wedge, doubled outline, sudden depth change, or clipped vegetation. A numerical seam pass cannot replace this visual test.
7. Export the actual tileset as transparent PNG without preview terrain, labels, or grid lines. Report only checks actually completed. If the task is documentation or observation only, leave the PNG untouched.

## Before-output checklist

- Correct latest reference used; no accidental reversion to an earlier layout or rejected design.
- Requested change complete; all other pixels unchanged, or unchanged within explicitly moved blocks.
- Native scale and tile allocations checked; no unauthorized resampling or resizing.
- Required spacing fully transparent, with no neighboring pixels inside a selection block.
- Complete roofs, walls, floors, columns, feet, and asset edges; no overlaps or cuts.
- Top-down view matches the accepted art; rectangular ground geometry does not converge into a trapezoid.
- Crisp silhouettes and internal forms at 100% and 200%; normal colored outline weight and restrained saturation.
- Duplicated color variants identical except for the intended recolored pixels.
- For autotiles, verify the 3×3 + 2×2 dimensions, companion orientation, compatible seams, and clean assembled inward turns; a border-pixel comparison alone is insufficient.
- Transparent PNG exported with no baked preview background or grid.

## Reusable reminder prompt

Copy this prompt and attach this document together with the latest accepted PNG:

```text
Read the attached tileset workflow reference and inspect the latest accepted PNG before editing. Use that exact PNG as the base; preserve my manual spacing and outline cleanup. Older drafts and rejected proposals are not style references.

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
- Four story houses, left to right: 8×5, 6×6, 8×6, 7×6.
- Other houses: preserve their existing 5×5 or 4×4 allocations.
- Market and balloon stalls: 4×3.
- Square gazebos: 5×5. Third/fourth share the same complete stone-floor model; only roof color differs (orange / blue-green).
- Both beach huts: 4×4, visually comparable to generic houses; preserve the rear variant without a door.
- These are allocation rules, not a reason to stretch artwork. If the supplied PNG conflicts, report it instead of silently changing approved art.

Autotiles, when requested:
- A 3×3 = nine 32×32 tiles (96×96 px): four OUTER corners, four edges, one center. Its missing INNER corners require a separate 2×2 = four 32×32 tiles (64×64 px), one L-shaped inward turn per tile.
- Add one matching 2×2 beside each requested 3×3 with a fully empty 32px column between the blocks. Tiles within each block touch without padding. Do not modify, move, resize, or regenerate the accepted 3×3 sets to add their companions.
- Arrange the companion tiles with their inward recesses facing the center: top-left has a southeast recess; top-right southwest; bottom-left northeast; bottom-right northwest. Do not produce a cross-shaped arrangement or substitute outer corners.
- Match the actual frame geometry, rim thickness, screen-facing wall depth, outlines, soil/foliage, and palette. Horizontal and vertical rails must meet as a clean orthogonal 90° turn. No pinched taper, flared cap, diagonal stepped wedge, stretched wall stripes, or doubled outlines. Do not blindly rotate shaded tiles or splice whole edge tiles diagonally.
- Treat my October 12 corrected corners as the visual geometry lesson: learn the intended clean turn rather than reproducing incidental brush marks in new work. Leave accepted corrections untouched unless I authorize an edit.
- For flowers, keep a subtly irregular continuous leafy edge extending slightly over the inner rim, with complete readable blooms. No straight clipped foliage rectangle, excessive overhangs, or oversized pasted tufts.
- Check actual assembled L-turns in ALL four orientations as well as 2×2/3×3/larger rectangles at native size and 200% Nearest Neighbor. Exact edge matches do not prove the corner's interior shape, shading, or wall depth is correct.
- A 3×3 plus four inward corners provides 13 tiles for the requested shapes; do not confuse it with Dual16/Wang 4×4 terrain tiles or claim every possible narrow/multiple-notch layout is covered.

Before output, verify unchanged pixels outside the task, asset scale, tile blocks, transparent spacing, intact geometry, top-down perspective, and crispness. For recolored duplicates, copy one finished model and change only the requested colors. If I ask for proposals, show previews for selection before changing the final sheet.

Task:
[Describe the exact requested changes here.]
```

## Short reminder prompt

```text
Read the attached workflow reference and use the latest accepted PNG exactly. Character 32×48; tiles 32×32; transparent background; complete assets in grid-aligned blocks with a fully empty 32px row/column between neighbors. Match the accepted low top-down angle: visible roof tops, rectangular ground footprints with no trapezoid convergence, and correctly aligned columns. Keep crisp structural edges, moderate colored outlines, and muted colors throughout—not just roofs. Preserve my outline cleanup and every pixel outside the requested edit. No full-sheet regeneration or unauthorized redesign/resizing. Verify at native size and 200%.

For autotiles: preserve each accepted 3×3 (96×96 px); add its four L-shaped inward corners as a separate 2×2 (64×64 px) beside it, with 32px spacing between blocks and no gaps inside them. Pack inward recesses toward the companion center (SE, SW / NE, NW). Continue rims and wall faces through clean 90° turns without diagonal wedges, tapering, flared ends, or depth jumps. Match foliage and soil, and test assembled turns in all four directions; seam-pixel checks alone are not enough. Keep approved user corrections untouched.

Task: [Describe the requested changes.]
```

## Canonical one-line rule

**Use the latest accepted PNG at its native 32px tile / 32×48 character scale; preserve untouched pixels, transparent tile spacing, complete structures, orthogonal top-down footprints, and crisp moderate outlines, changing only what the task explicitly authorizes. For autotiles, preserve the accepted 3×3, add matching 2×2 inward corners, and judge clean 90° turns in the assembled map—not by seam pixels alone.**

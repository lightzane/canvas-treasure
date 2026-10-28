# House Sheet Editing Workflow Reference

## Purpose

Use this document as the canonical reminder for future **building / house sheet generation and editing**.

This is specifically for my pixel-art game workflow in **Aseprite** and **Tiled**.

---

## Canonical Scale

### Character

- Width: **32 px**
- Height: **48 px**

### Tile

- Tile size: **32 × 32 px**

### Important

This is the **normal accepted scale** for my game.

Do **not** call it half scale.

Do **not** scale buildings up or down unless I explicitly ask.

---

## Canonical Building Rules

### 1. Buildings must match the character scale

All houses/buildings must feel correct beside a:

```text
32 px wide × 48 px tall character
```

That means:

- houses must not feel too giant
- doors must not be too wide
- doors must not be too tall
- windows must not be too large

---

### 2. Tile alignment

All assets must be designed for:

```text
32 × 32 px tiles
```

Each asset should sit cleanly in a **32px-aligned block**.

---

### 3. Transparent background

Sheets should use:

- **transparent background**
- no solid backdrop
- no decorative sheet background
- no grid lines baked into the PNG unless explicitly requested

---

### 4. Spacing rule

There must be:

> **at least 1 completely empty 32×32 tile between neighboring assets**

This is required so I can select whole assets cleanly in:

- Tiled
- Aseprite

without accidentally including part of another house.

Example:

```text
[ HOUSE A ][ EMPTY 32px TILE ][ HOUSE B ]
```

Do not let buildings touch.

Do not let buildings overlap.

Do not place them too close.

---

### 5. Do not crop or cut buildings

When adding spacing or rearranging a sheet:

- do not cut roofs
- do not cut walls
- do not cut stalls
- do not cut house edges
- do not let pixels from a neighboring house remain in another asset block

Each asset must stay fully intact.

---

## Editing Rule

If I ask you to modify an existing accepted sheet:

> **Modify the exact reference PNG only.**

That means:

- do not redesign unless I explicitly ask
- do not resize unless I explicitly ask
- do not scale up
- do not scale down
- do not replace the whole sheet with a new design
- do not invent a different arrangement unless I ask

Only perform the requested edit.

---

## Building Categories

### Story Buildings

These can be more unique and richer:

- Player Home
- Flower Shop
- Hua Ze Lei's House
- Mei Zuo's House
- Xi Men's House
- Dao Ming Si's Mansion

### Generic Residences

These should:

- be simpler
- be more alike
- be reusable
- sometimes have **no door** variants

### Market Stalls

These should:

- stay smaller than houses
- remain aligned to the same 32px tile system
- keep transparent background
- keep spacing from neighboring assets

---

## Accepted Reference Behavior

For the current accepted workflow:

- Use the accepted **normal scale**
- Keep the reference sheet unchanged unless a requested edit is made
- Duplicate generic houses only when asked
- If requested, create a **new set of generic houses without doors**
- Put those duplicates below the original generic houses
- Preserve transparency
- Preserve spacing
- Preserve original scale

---

## Exact Rule for "No-Door Generic Houses"

If I ask for:

> duplicate the generic houses and remove their doors

It means:

- use the exact accepted reference PNG
- duplicate the existing generic houses
- place the duplicate row below the original row
- keep the same house size
- keep the same scale
- keep the same style
- keep the same spacing
- keep the background transparent
- remove the door from the duplicated generic houses only
- do not redesign the entire sheet
- rule guide mansion has 7x12 area tile

---

## Common Mistakes to Avoid

Do not:

- scale the sheet up
- scale the sheet down
- redesign the entire house sheet
- regenerate a different style when I asked for an edit
- add a non-transparent background
- remove the 1 empty tile spacing
- crop or cut off buildings
- keep tiny slivers of neighboring houses
- ignore the 32×48 character reference
- make doors oversized
- make houses look built for giant characters

---

## Reusable Reminder Prompt

You can use this exact reminder:

```md
Use the exact accepted reference PNG as the base.

Rules:

- character = 32×48 px
- tile = 32×32 px
- this is the normal accepted building scale
- transparent background only
- every asset must stay inside its own 32px-aligned block
- leave at least 1 completely empty 32×32 tile between neighboring assets
- do not crop, cut off, overlap, or let neighboring assets bleed into each other
- do not redesign unless explicitly requested
- do not resize, scale up, or scale down unless explicitly requested
- if editing, modify the exact reference PNG only
- keep every existing pixel in the 1st PNG completely untouched.
- only expand the transparent canvas when adding or inserting new rows
- rule guide mansion has 12x7 area tile
- observe appropriate angle perspective on top-down (No trapezoid pov)

## Verification that there were no rescale/resize happened

⚠️ Important verifications Before Output:

- Verify that the mansion is still 12x7 grid/area tile (1 tile is 32x32)
- Verify that the 4 houses in 2nd row have the following dimensions respectively: 8x5, 6x6, 8x6, 7x6
- Verify that the existing houses are in 5x5 and 4x4 area grid tile
- Verify that the market stalls are in 4x3 area grid tile

Task:
[put request here]
```

---

## Short Reminder Prompt

```md
Use the accepted building scale and edit the exact reference PNG only.

- character = 32×48
- tile = 32×32
- transparent PNG
- 1 empty 32×32 tile spacing between assets
- no cropping
- no redesign
- no rescaling

Task:
[put request here]
```

---

## Canonical One-Line Rule

**Building sheets must use a 32×32 tile grid, be scaled for a 32×48 character, keep a transparent background, preserve at least one completely empty 32×32 tile between assets, avoid any cropping/bleeding, and when editing, modify the exact accepted reference PNG without redesigning or rescaling unless explicitly requested.**

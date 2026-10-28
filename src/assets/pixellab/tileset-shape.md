# Prompts

- **upper terrain (prompt):**

```text
dense short blade-by-blade grass meadow with small tufts and organic painterly texture mixing mid green and soft pale olive green patches with a few muted yellow-green highlights, drawn in flat solid greens with no gradients or shadows
```

- **lower terrain (prompt - primary dirt path):**

```text
compacted sunlit pale brown soil with intricate pebble textures, deep compressed stone crevices, and layered earthy tones featuring soft highlights and moderate shadows
```

- **lower terrain backup (prompt - stone path):**

```text
warm muted sandy tan cobblestone path, soft rounded flat stones, faint and low contrast, grout nearly the same color as the stones, soft even shading
```

- **transition description (prompt):**

```text
short soft grass blades slightly overlapping the dirt edge, same ground level, no outline, no shadow
```

# Sliders & Dropdowns

- **transition size:** `0%`
  Terrains meet directly, so there's no band for PixelLab to fill with the dark rim.
- **edge shape:** `Square`
- **roundness:** `60%`
- **raggedness:** `60%`
- **side wall thickness:** `0%`
  No wall.
- **side wall placement:** `50%`
  Default; inactive when side wall thickness is 0%.
- **detailing:** `High detail`
- **shading:** `Medium shading`

> Note: The final output is manually modified to reduce shade and add details (see: [tileset-shape--v2.png](../aseprite/tileset-shape--v2.png))

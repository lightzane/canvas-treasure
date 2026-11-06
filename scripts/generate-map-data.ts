// Regenerates src/constants/collisions/<map>.ts and src/constants/triggers/<map>.ts
// from a Tiled JSON export's "collisions" and "trigger_zones" object layers.
// Collisions keep only x/y/width/height; trigger zones also keep `name`.
// Usage: `pnpm map-data` (all maps) or `pnpm map-data home` (one map).

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TILED_DIR = path.join(ROOT, "src/assets/tiled");
const COLLISIONS_OUTPUT_DIR = path.join(ROOT, "src/constants/collisions");
const TRIGGERS_OUTPUT_DIR = path.join(ROOT, "src/constants/triggers");

/** A rectangle object as exported by Tiled's object-layer JSON — same shape `scaleTiledObjects` (src/lib/tiled.ts) expects. */
interface TiledRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TiledObject extends TiledRect {
  name: string;
}

interface TiledObjectLayer {
  type: "objectgroup";
  name: string;
  objects: TiledObject[];
}

interface TiledGroupLayer {
  type: "group";
  name: string;
  layers: TiledLayer[];
}

/** Every other Tiled layer kind we don't care about — kept as a literal union so TS can still discriminate on `type`. */
type TiledOtherLayer = { type: "tilelayer" | "imagelayer" };

type TiledLayer = TiledObjectLayer | TiledGroupLayer | TiledOtherLayer;

interface TiledMap {
  layers: TiledLayer[];
}

/** An object layer `findObjectLayers` matched, plus how it was matched. */
interface MatchedObjectLayer {
  layer: TiledObjectLayer;
  /**
   * Set only when this layer was matched via a containing group (not by its
   * own exact name) — the layer's own name, meant to prefix each of its
   * objects' names with (`${keyPrefix}_${objectName}`), since a bare object
   * name alone can collide across sub-layers in the same folder ("home" and
   * "mansion" under both an "enter" layer and a "sound" layer, say).
   * `undefined` for a layer matched directly by name — its objects' own
   * names are already the full key, unprefixed, same as before this folder
   * form existed.
   */
  keyPrefix?: string;
}

/**
 * Tiled nests layers inside `group`-type layers, so object layers aren't
 * always top-level. Collects every object layer matching `name`, not just
 * the first — Tiled only lets you set a color per *layer*, not per object,
 * so splitting one logical set of objects across several same-named layers
 * (e.g. by color, for organization in the editor) is a reasonable way to
 * work there. All of them get merged back into one here.
 *
 * Also matches by *folder*: once recursion enters a `group` layer whose own
 * name is `name` (e.g. a "trigger_zones" group), every object layer inside
 * it counts regardless of its own name — so you can organize that folder's
 * contents into meaningfully-named sub-layers ("enter", "sound", ...)
 * instead of naming every single one "trigger_zones" literally. The two
 * matching rules combine: a plain object layer named `name` still matches
 * anywhere, folder-matching or not — see `MatchedObjectLayer.keyPrefix` for
 * how each matched layer tells its caller which rule matched it.
 */
function findObjectLayers(
  layers: TiledLayer[],
  name: string,
  insideMatchingGroup = false,
): MatchedObjectLayer[] {
  const found: MatchedObjectLayer[] = [];
  for (const layer of layers) {
    if (layer.type === "objectgroup") {
      if (insideMatchingGroup) found.push({ layer, keyPrefix: layer.name });
      else if (layer.name === name) found.push({ layer });
    }
    if (layer.type === "group") {
      found.push(
        ...findObjectLayers(layer.layers, name, insideMatchingGroup || layer.name === name),
      );
    }
  }
  return found;
}

/** Renders one object's fields as a single-line object literal, in the given key order. */
function toLiteral(obj: Record<string, string | number>, keys: string[]): string {
  return `{ ${keys.map((k) => `${k}: ${JSON.stringify(obj[k])}`).join(", ")} }`;
}

/**
 * Collision *variants* — conditionally-applied collision sets layered on top
 * of a map's always-on base `collisions` layer, e.g. overworld's `event`
 * group (decorations/stalls only up for the main event) vs. its `non_event`
 * counterpart (ordinary-day props, removed entirely once the event starts).
 * Any root-level `group` layer — any name, nothing hardcoded — that contains
 * an object layer named `collisions` anywhere inside it becomes its own
 * variant, keyed by that group's own name.
 *
 * This is `trigger_zones`'s own group-folder convention with the inner/outer
 * roles swapped: `trigger_zones` groups by the *inner* layer's name, under
 * one outer folder literally named `trigger_zones`. A collision variant
 * groups by the *outer* folder's own name instead — "event"/"non_event" is
 * what toggles together as a unit — and `collisions` is just the marker
 * layer name saying "this folder has its own collision set", not something
 * meant to vary itself.
 *
 * Root-level groups only, not recursing into further nesting — matches
 * every map's structure today; revisit if a map ever needs a variant nested
 * inside another group.
 */
function findVariantCollisionGroups(layers: TiledLayer[]): Record<string, TiledObject[]> {
  const variants: Record<string, TiledObject[]> = {};
  for (const layer of layers) {
    if (layer.type !== "group") continue;
    const objects = collectNamedObjectLayers(layer.layers, "collisions");
    if (objects.length > 0) variants[layer.name] = objects;
  }
  return variants;
}

/** Every object from any object layer named `name`, at any depth within `layers`. */
function collectNamedObjectLayers(layers: TiledLayer[], name: string): TiledObject[] {
  const found: TiledObject[] = [];
  for (const layer of layers) {
    if (layer.type === "objectgroup" && layer.name === name) found.push(...layer.objects);
    else if (layer.type === "group") found.push(...collectNamedObjectLayers(layer.layers, name));
  }
  return found;
}

/**
 * Writes one collisions file holding one or more `export const ... =
 * scaleTiledObjects([...])` sections — the base set plus, if present, one
 * per collision variant — then formats it with oxfmt.
 */
function emitCollisionsFile(
  outputPath: string,
  sections: { exportName: string; rects: Record<string, string | number>[] }[],
) {
  const body = sections
    .map(
      ({ exportName, rects }) => `// prettier-ignore
export const ${exportName} = scaleTiledObjects([
${rects.map((r) => `  ${toLiteral(r, ["x", "y", "width", "height"])},`).join("\n")}
]);`,
    )
    .join("\n\n");

  const content = `// Auto-generated by \`pnpm map-data\`. Do not edit directly.
import { scaleTiledObjects } from "@/lib/tiled";

${body}
`;

  writeFileSync(outputPath, content);
  execFileSync("pnpm", ["exec", "oxfmt", outputPath], { stdio: "inherit" });
}

/**
 * The emitted trigger name for one object: `${keyPrefix}_${objectName}`,
 * except where that would be redundant —
 * - no `keyPrefix` at all (direct layer-name match, not folder-matched):
 *   the object's own name is already the full key, unchanged.
 * - the object's name is empty (many identical rectangles under one
 *   "sand" layer, say, where naming each one individually is pointless):
 *   just `keyPrefix` alone, not `"sand_"` with a trailing underscore.
 * - the object's name exactly matches `keyPrefix` (same idea, but each
 *   rectangle *is* named "sand" too): just `keyPrefix`, not `"sand_sand"`.
 */
function triggerName(keyPrefix: string | undefined, objectName: string): string {
  if (!keyPrefix) return objectName;
  if (!objectName || objectName === keyPrefix) return keyPrefix;
  return `${keyPrefix}_${objectName}`;
}

/**
 * Writes `export const <exportName> = scaleTiledObjects([...])`, then
 * formats it with oxfmt. If `nameTypeExport` is given, also emits
 * `export type <nameTypeExport> = "a" | "b" | ...` — the exact literal
 * union of every item's own `name` field. Written out directly as plain
 * text, from the actual names right here, rather than trying to get
 * TypeScript to infer it back out through `scaleTiledObjects` — much
 * simpler, and the result is identical either way.
 */
function emitConstFile(
  outputPath: string,
  exportName: string,
  items: Record<string, string | number>[],
  keys: string[],
  nameTypeExport?: string,
) {
  const body = items.map((item) => `  ${toLiteral(item, keys)},`).join("\n");

  const nameTypeDecl = nameTypeExport
    ? `export type ${nameTypeExport} = ${
        items.length > 0
          ? [...new Set(items.map((i) => JSON.stringify(i.name)))].join(" | ")
          : "never"
      };\n\n`
    : "";

  const content = `// Auto-generated by \`pnpm map-data\`. Do not edit directly.
import { scaleTiledObjects } from "@/lib/tiled";

${nameTypeDecl}// prettier-ignore
export const ${exportName} = scaleTiledObjects([
${body}
]);
`;

  writeFileSync(outputPath, content);
  execFileSync("pnpm", ["exec", "oxfmt", outputPath], { stdio: "inherit" });
}

function generateMapData(mapName: string) {
  const inputPath = path.join(TILED_DIR, `${mapName}.json`);

  if (!existsSync(inputPath)) {
    console.warn(`⚠ ${path.relative(ROOT, inputPath)} not found — skipping.`);
    return;
  }

  const map: TiledMap = JSON.parse(readFileSync(inputPath, "utf8"));

  // Root-level only — not `findObjectLayers` (which recurses into every
  // group hunting for a "collisions"-named layer at any depth), since a
  // collision variant group (see findVariantCollisionGroups) nests its own
  // layer also named "collisions" on purpose; recursing here would double-
  // count those into the base set too.
  const baseCollisionLayers = map.layers.filter(
    (l): l is TiledObjectLayer => l.type === "objectgroup" && l.name === "collisions",
  );
  const variantCollisions = findVariantCollisionGroups(map.layers);
  const variantNames = Object.keys(variantCollisions);

  if (baseCollisionLayers.length > 0 || variantNames.length > 0) {
    const outputPath = path.join(COLLISIONS_OUTPUT_DIR, `${mapName}.ts`);
    const baseRects = baseCollisionLayers
      .flatMap((layer) => layer.objects)
      .map(({ x, y, width, height }) => ({ x, y, width, height }));

    const sections = [
      { exportName: `COLLISION_${mapName.toUpperCase()}`, rects: baseRects },
      ...variantNames.map((variantName) => ({
        exportName: `COLLISION_${mapName.toUpperCase()}_${variantName.toUpperCase()}`,
        rects: variantCollisions[variantName]!.map(({ x, y, width, height }) => ({
          x,
          y,
          width,
          height,
        })),
      })),
    ];

    emitCollisionsFile(outputPath, sections);
    console.log(
      `✓ ${mapName}.json → ${path.relative(ROOT, outputPath)} (${baseRects.length} base rect(s)${
        variantNames.length > 0
          ? `, variants: ${variantNames.map((v) => `${v} (${variantCollisions[v]!.length})`).join(", ")}`
          : ""
      })`,
    );
  } else {
    console.warn(`⚠ No "collisions" object layer in ${mapName}.json — skipping.`);
  }

  const triggerLayers = findObjectLayers(map.layers, "trigger_zones");
  if (triggerLayers.length > 0) {
    const outputPath = path.join(TRIGGERS_OUTPUT_DIR, `${mapName}.ts`);
    const zones = triggerLayers.flatMap(({ layer, keyPrefix }) =>
      layer.objects.map(({ name, x, y, width, height }) => ({
        name: triggerName(keyPrefix, name),
        x,
        y,
        width,
        height,
      })),
    );
    emitConstFile(
      outputPath,
      `TRIGGER_${mapName.toUpperCase()}`,
      zones,
      ["name", "x", "y", "width", "height"],
      "TriggerName",
    );
    console.log(
      `✓ ${mapName}.json → ${path.relative(ROOT, outputPath)} (${zones.length} zones from ${triggerLayers.length} layer(s))`,
    );
  }
}

const requested = process.argv.slice(2);
const mapNames =
  requested.length > 0
    ? requested
    : readdirSync(TILED_DIR)
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.replace(/\.json$/, ""));

mapNames.forEach(generateMapData);

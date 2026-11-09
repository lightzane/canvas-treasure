import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

import tailwindcss from "@tailwindcss/vite";

import {
  excludeFromBuild,
  inlineEntryScript,
  stripCrossorigin,
  stripHtmlComments,
} from "./vite.plugins.ts";

/**
 * A SEPARATE build, not a variant of the normal one (`vite.config.ts`,
 * `pnpm build`) — this one is opened directly via `file:///.../index.html`,
 * no server, no GitHub Pages (`pnpm build:file`). Two things the normal
 * build never has to deal with make that possible:
 *
 * - `base: "./"` — an absolute `/` base resolves against the filesystem
 *   root under `file://`, not wherever `index.html` actually sits.
 * - `stripCrossorigin`/`inlineEntryScript` (vite.plugins.ts) — `file:///`
 *   pages have a `null` origin, which breaks anything requiring a
 *   CORS-mode fetch. See each plugin's own doc comment for specifics.
 *
 * `outDir: "dist-file"` — deliberately not `dist/`, so this can never
 * collide with, or get swept into, the normal build's output (e.g. a
 * GitHub Pages deploy step that uploads `dist/`).
 */
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist-file",
  },
  plugins: [
    react(),
    tailwindcss(),
    excludeFromBuild(["react.svg"]),
    stripHtmlComments(),
    stripCrossorigin(),
    inlineEntryScript(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

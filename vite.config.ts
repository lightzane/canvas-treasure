import react from "@vitejs/plugin-react";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), excludeFromBuild(["react.svg"]), stripHtmlComments()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Use this if saved changes stop showing up and even a hard browser
  // refresh doesn't help — only restarting `pnpm dev` does. That means the
  // dev server itself never noticed the file changed (macOS's native file
  // watcher occasionally misses/coalesces rapid saves), not that the
  // browser is caching anything. usePolling makes Vite check file
  // timestamps on an interval instead of relying on OS notifications, so
  // it can't silently miss a save (costs a bit more CPU).
  // server: {
  //   watch: {
  //     usePolling: true,
  //   },
  // },
});

/** Strips HTML comments from `index.html` at build time.
 *  Comments are for developers only and must never ship to production. */
function stripHtmlComments(): Plugin {
  return {
    name: "strip-html-comments",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(/<!--[\s\S]*?-->/g, "");
    },
  };
}

/** Deletes the given files from the build output after all assets (including public/) are copied. */
function excludeFromBuild(files: string[]): Plugin {
  let outDir = "dist";
  return {
    name: "exclude-from-build",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      for (const file of files) {
        const target = fileURLToPath(new URL(`${outDir}/${file}`, import.meta.url));
        if (fs.existsSync(target)) fs.unlinkSync(target);
      }
    },
  };
}

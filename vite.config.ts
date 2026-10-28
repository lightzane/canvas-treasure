import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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

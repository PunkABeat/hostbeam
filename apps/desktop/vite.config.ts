import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";

// Tauri expects a fixed port and ignores its own source from the watcher.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  build: {
    // The app runs in the system WebKit, and macOS 13 (minimumSystemVersion in
    // tauri.conf.json) shipped Safari 16. Vite 8's default, Safari 16.4, is
    // newer, and the CSS minifier drops the -webkit- prefixes a target does
    // not need. Move this with minimumSystemVersion.
    target: "safari16",
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        preferences: resolve(import.meta.dirname, "preferences.html"),
        hud: resolve(import.meta.dirname, "hud.html"),
      },
    },
  },
});

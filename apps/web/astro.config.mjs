// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// Static marketing site; only the hero demo hydrates (client:visible island).
export default defineConfig({
  integrations: [react()],
  site: "https://hostbeam.app",
  // Astro 7's default, 'jsx', drops the space between text and an inline
  // element on its own line ("handled by\n<a>Paddle</a>" read "byPaddle"
  // across the site). `true` is Astro 5's behaviour.
  compressHTML: true,
  vite: {
    build: {
      // Astro builds for "esnext", and Astro 7's CSS minifier (Lightning CSS)
      // reads that as "no prefixes needed": `-webkit-backdrop-filter` went,
      // and Safari before 18 lost the nav's and the hero menu bar's blur.
      // Vite's own baseline-widely-available list, stated so it is kept.
      cssTarget: ["chrome111", "edge111", "firefox114", "safari16.4", "ios16.4"],
    },
  },
});

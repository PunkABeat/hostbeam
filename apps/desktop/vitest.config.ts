import { defineConfig } from "vitest/config";

// Vitest config kept separate from vite.config.ts so the production multi-entry
// build (index.html / preferences.html / hud.html) doesn't shape the test run.
// The environment is node; a test that needs a DOM says so at the top with
// `// @vitest-environment jsdom`.
export default defineConfig({
  test: {
    // The design system has no runner of its own, and this app is its main
    // consumer, so its tests run here.
    include: ["src/**/*.test.{ts,tsx}", "../../packages/ui/src/**/*.test.{ts,tsx}"],
    environment: "node",
    // The screen tests mount a whole window in jsdom; under a full parallel
    // run the first of them can pass five seconds on module compilation alone.
    testTimeout: 15_000,
  },
});

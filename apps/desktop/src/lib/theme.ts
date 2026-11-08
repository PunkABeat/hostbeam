// Applies the effective UI appearance by toggling the design system's
// `.theme-dark` token scope on <html>.
//
// The dark token values (label/surface/fill/accent colors in
// design → ui/tokens/colors.css and the shadows in elevation.css) are *designed*
// and live under `.theme-dark`; this module is the only thing that applies them.
//
// Source of truth is the user's `appearance` setting (config.settings.appearance):
//   "system" → follow the OS `prefers-color-scheme` (default; live-tracked)
//   "light"  → force light (never add `.theme-dark`)
//   "dark"   → force dark  (always add `.theme-dark`)
// A missing/unknown value falls back to "system". The macOS WebView derives
// prefers-color-scheme from the OS appearance, and it also works in the dev
// browser for verification.

import type { Appearance } from "../types/config";
import { HB } from "./config";

const DARK = "theme-dark";

function currentAppearance(): Appearance {
  try {
    const a = HB.load().settings?.appearance;
    if (a === "light" || a === "dark" || a === "system") return a;
  } catch {
    /* fall through to system */
  }
  return "system";
}

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/** Toggle `.theme-dark` to match the current appearance setting + OS preference. */
export function applyTheme(): void {
  if (typeof document === "undefined") return;
  const appearance = currentAppearance();
  const dark = appearance === "dark" || (appearance === "system" && prefersDark());
  document.documentElement.classList.toggle(DARK, dark);
}

/** Apply the appearance now and keep it in sync with the OS and config changes. */
export function setupTheme(): void {
  if (typeof window === "undefined") return;
  applyTheme();
  // OS appearance flips (only affects "system" mode, but re-applying is harmless).
  if (typeof window.matchMedia === "function") {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
  }
  // The appearance setting changed — same window (Preferences save) via the
  // 'hb:config' event, or another window via the 'storage' event.
  window.addEventListener("hb:config", applyTheme);
  window.addEventListener("storage", (e) => {
    if (e.key === HB.KEY) applyTheme();
  });
}

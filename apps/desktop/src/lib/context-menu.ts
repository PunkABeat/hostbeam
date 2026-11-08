// Suppress the WebView's default right-click menu (Reload / Back / Forward / …) so
// the app feels native rather than like a web page — and so end users can't reload
// the view into a half-loaded or onboarding state.
//
// Kept in dev builds (`tauri dev` / the Vite browser) so Inspect Element and Reload
// stay available for debugging. Editable elements are exempted so right-click
// copy/paste/cut still works in the folder / sentence / hotkey / search fields.

/** True when the default context menu should be blocked for this event target. */
export function shouldSuppressContextMenu(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  // Keep the native menu on editable fields (copy/paste/cut).
  return !el?.closest?.("input, textarea, [contenteditable='true']");
}

export function suppressContextMenu(): void {
  if (import.meta.env.DEV || typeof window === "undefined") return;
  window.addEventListener("contextmenu", (e) => {
    if (shouldSuppressContextMenu(e.target)) e.preventDefault();
  });
}

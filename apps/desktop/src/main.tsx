// Popover window entry. The popover (PopoverApp) and onboarding (FlowA) are
// first-party app-owned screens under src/views/, mounted here with React.
import "@hostbeam/ui/styles.css";
import "./popover-page.css";
import "./app.css";
import "./utilities.css";
import { createElement } from "react";
import { createRoot } from "react-dom/client";

import { refreshConfig, setupConfigBridge } from "./config-bridge";
import { setLocaleFromSetting } from "./i18n";
import { HB } from "./lib/config";
import { OB_MOCK } from "./lib/hosts";
import { hidePopover, isTauri, openPreferences } from "./lib/ipc";
import { suppressContextMenu } from "./lib/context-menu";
import { applyTheme, setupTheme } from "./lib/theme";
import { FlowA } from "./views/onboarding/FlowA";
import { PopoverApp } from "./views/popover/PopoverApp";

// Match the OS appearance before first paint (no flash of light).
setupTheme();
// Native feel: no default WebView right-click menu in production (keeps text fields).
suppressContextMenu();

// The few remaining window globals (app-wiring callbacks) are typed by
// src/types/window.d.ts.
const w = window;

// Focus the current surface's primary action (or filter/first field) so the
// popover is usable from the keyboard the moment it appears. Tries selectors in
// priority order, skipping anything that can't actually take focus (disabled,
// non-focusable). If nothing qualifies, clears stray OS auto-focus (so the gear
// doesn't flash a ring).
function focusPrimary() {
  const selectors = [
    "[data-autofocus]",
    "[data-primary]:not([disabled])",
    ".obA-host",
    ".hb-step input:not([type='hidden']), .hb-step textarea",
    ".hb-step button:not([disabled]):not([data-back]), .hb-step a[href]",
  ];
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) {
      el.focus();
      if (document.activeElement === el) return;
    }
  }
  const active = document.activeElement as HTMLElement | null;
  if (
    active &&
    active !== document.body &&
    active.tagName !== "INPUT" &&
    active.tagName !== "TEXTAREA"
  ) {
    active.blur();
  }
}

async function boot() {
  w.focusPrimary = focusPrimary;
  // The popover gear / links open the preferences window.
  w.openPreferences = (tab?: string) => openPreferences(tab);

  // Each time the panel is shown, land focus on the primary action (or a filter
  // field) so it's operable from the keyboard immediately — Enter beams / advances.
  // If a surface has no primary, clear the OS auto-focus so the gear doesn't flash
  // a ring. (:focus-visible keeps rings to keyboard nav.)
  window.addEventListener("focus", () => {
    // Re-hydrate from the Rust store first: the popover is hidden while Preferences
    // is edited, so on show it pulls the latest settings (appearance, default host,
    // hotkey, …) and re-themes via the broadcast. No-op in the dev browser.
    void refreshConfig();
    requestAnimationFrame(focusPrimary);
  });

  window.addEventListener("keydown", (e) => {
    // Cmd+, opens Preferences (macOS-standard) while the popover is focused.
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key === ",") {
      e.preventDefault();
      w.openPreferences?.();
      return;
    }
    // Esc dismisses the popover (and the onboarding it hosts) — unless a modal
    // (the tap-to-enlarge lightbox) is open, in which case it closes that first.
    if (e.key === "Escape") {
      if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return;
      hidePopover();
    }
  });

  // Same rule as the preferences window: a bridge failure must not cost the
  // user their UI. Falls back to whatever is cached locally.
  let hadConfig: boolean;
  try {
    hadConfig = await setupConfigBridge();
  } catch (e) {
    console.error("config bridge failed; rendering anyway", e);
    hadConfig = !!HB.load().addedIds?.length;
  }
  applyTheme(); // re-sync now that the persisted appearance is hydrated
  // Apply the user's language override now that the config is loaded.
  // Apply the language, and wait for its dictionary, before the first render.
  try {
    await setLocaleFromSetting(HB.load().settings?.locale);
  } catch {
    /* keep system locale */
  }

  const rootEl = document.getElementById("root");
  if (!rootEl) return;
  const root = createRoot(rootEl);

  const renderPopover = () =>
    root.render(
      createElement(
        "div",
        { className: "hb-wrap" },
        createElement(PopoverApp, { simResult: "auto" }),
      ),
    );

  if (isTauri() && !hadConfig) {
    // First run: popover-native onboarding (design Flow A). On completion it has
    // written the chosen host; we mark setup done and hand off to the popover.
    const onDone = () => {
      HB.save({ ...HB.load(), setupComplete: true });
      renderPopover();
    };
    root.render(
      createElement(
        "div",
        { className: "hb-wrap" },
        createElement(FlowA, {
          onDone,
          beak: { style: "notch", size: 8, offset: 31 },
          emptyConfig: !(OB_MOCK.sshConfig && OB_MOCK.sshConfig.length),
        }),
      ),
    );
  } else {
    renderPopover();
  }
}

void boot();

// Preferences window entry. Renders the app-owned PreferencesApp (views/preferences/).
import "@hostbeam/ui/styles.css";
import "./prefs.css";
import "./utilities.css";
import { createElement } from "react";
import { createRoot } from "react-dom/client";

import { setupConfigBridge } from "./config-bridge";
import { setLocaleFromSetting } from "./i18n";
import { HB } from "./lib/config";
import { refreshHosts } from "./lib/config-sync";
import { preferencesReady } from "./lib/ipc";
import { suppressContextMenu } from "./lib/context-menu";
import { applyTheme, setupTheme } from "./lib/theme";
import { PrefsApp } from "./views/preferences/PreferencesApp";

// Match the OS appearance before first paint (no flash of light).
setupTheme();
// Native feel: no default WebView right-click menu in production (keeps text fields).
suppressContextMenu();

async function boot() {
  // The bridge hydrates from the Rust store; if it cannot, the UI still has to
  // come up. A window that renders nothing is unrecoverable — you cannot even
  // reach the controls that would clear whatever broke it.
  try {
    await setupConfigBridge();
  } catch (e) {
    console.error("config bridge failed; rendering anyway", e);
  }
  applyTheme(); // re-sync now that the persisted appearance is hydrated
  try {
    await setLocaleFromSetting(HB.load().settings?.locale);
  } catch {
    /* keep system locale */
  }
  const root = document.getElementById("root");
  if (!root) return;
  createRoot(root).render(createElement(PrefsApp));
  // Hosts come and go from ~/.ssh/config while this window is open or
  // hidden; a host that is back must stop reading as missing.
  window.addEventListener("focus", () => void refreshHosts());
  // The window is born hidden (the bare webview would flash white before the
  // theme paints); reveal it once the first frame has actually committed.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      preferencesReady();
    });
  });
}

void boot();

// Shared by every window: refreshes the host pool from ~/.ssh/config, hydrates
// the persisted config (settings + recent history) into localStorage so the
// synchronous HB.load() sees it, and mirrors every HB.save back to the durable
// Rust store. Returns whether a persisted config existed — the popover uses that
// to decide whether to show first-run onboarding.

import { listen } from "@tauri-apps/api/event";

import { HB } from "./lib/config";
import { cache, refreshConfig } from "./lib/config-sync";
import { DEV_SEED_RECENT, OB_MOCK } from "./lib/hosts";
import {
  getConfig,
  isTauri,
  listHosts,
  refreshTrayMenu,
  setAutoHotkey,
  setConfig,
  setHotkey,
  setToggleHotkey,
} from "./lib/ipc";
import type { Config, Host } from "./types/config";

const w = window; // publishes window.applyHotkey & co. for the recorders

// Convert the design's token array (e.g. ["cmd","shift","7"]) to a Tauri
// accelerator string (e.g. "Cmd+Shift+7").
const MOD_ORDER = ["cmd", "ctrl", "opt", "shift"];
const MOD_NAME: Record<string, string> = { cmd: "Cmd", ctrl: "Ctrl", opt: "Alt", shift: "Shift" };
const SPECIAL: Record<string, string> = {
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
  enter: "Enter",
  space: "Space",
  tab: "Tab",
};

// Exported for unit testing; consumed internally by applyHotkey.
export function toAccelerator(keys: string[]): string {
  const parts: string[] = [];
  for (const m of MOD_ORDER) if (keys.includes(m)) parts.push(MOD_NAME[m]);
  const key = keys.find((k) => !MOD_ORDER.includes(k));
  if (key) parts.push(SPECIAL[key.toLowerCase()] || key.toUpperCase());
  return parts.join("+");
}

// Re-register the global shortcut from a token array. Exposed for the prefs +
// onboarding recorders.
function applyHotkey(keys: string[]): void {
  if (!isTauri() || !Array.isArray(keys) || !keys.length) return;
  const accelerator = toAccelerator(keys);
  if (accelerator) setHotkey(accelerator).catch(() => {});
}

/** The show/hide shortcut's accelerator, or null when none is set — null is
 * a real value here (it clears the shortcut in Rust), unlike the beam one. */
export function toToggleAccelerator(keys: string[] | null | undefined): string | null {
  if (!Array.isArray(keys) || !keys.length) return null;
  return toAccelerator(keys) || null;
}

function applyToggleHotkey(keys: string[] | null | undefined): void {
  if (!isTauri()) return;
  setToggleHotkey(toToggleAccelerator(keys)).catch(() => {});
}

/** Same contract as the show/hide one: null clears it in Rust. */
function applyAutoHotkey(keys: string[] | null | undefined): void {
  if (!isTauri()) return;
  setAutoHotkey(toToggleAccelerator(keys)).catch(() => {});
}

/** What the tray's submenus are built from: the hosts, which one is current,
 *  and the head of the recent list. Compared as a string so that config writes
 *  — and there is one per keystroke in Preferences — cost a menu rebuild only
 *  when the menu would actually differ.
 *
 *  More rows than the menu shows, deliberately: the last entry is a whole
 *  drop, and how many files it counts depends on rows below the cut. */
function trayMenuKey(cfg: Config): string {
  return JSON.stringify([
    cfg.defaultId,
    cfg.addedIds,
    (cfg.manualHosts || []).map((h) => [h.id, h.name]),
    (cfg.recent || []).slice(0, 24).map((r) => [r.id, r.path, r.group]),
  ]);
}

export async function setupConfigBridge(): Promise<boolean> {
  const tauri = isTauri();
  w.applyHotkey = applyHotkey;
  w.applyToggleHotkey = applyToggleHotkey;
  w.applyAutoHotkey = applyAutoHotkey;

  if (tauri) {
    const origSave = HB.save;
    let trayMenu = trayMenuKey(HB.load());
    HB.save = (cfg: Config) => {
      origSave(cfg);
      const key = trayMenuKey(cfg);
      const stale = key !== trayMenu;
      trayMenu = key;
      setConfig(cfg)
        .then(() => {
          // Only once the write has landed: Rust builds the submenus from the
          // durable config, so an earlier rebuild would read the file this
          // save is replacing.
          if (stale) refreshTrayMenu().catch(() => {});
        })
        .catch(() => {});
    };
    // The other window's writes. Rust emits this after every `set_config`
    // (config.rs). Without it the popover — a panel that never receives
    // `focus` — kept the copy it hydrated at launch and overwrote Preferences'
    // edits on its next save.
    listen("config:changed", () => void refreshConfig()).catch(() => {});
  }

  let hosts: Host[] = [];
  if (tauri) {
    try {
      hosts = await listHosts();
    } catch {
      /* keep mock hosts */
    }
  }
  if (Array.isArray(hosts) && hosts.length) {
    OB_MOCK.sshConfig = hosts;
    OB_MOCK.detected = hosts; // onboarding (FlowA) lists OB.detected
  }

  let persisted: Config | null = null;
  if (tauri) {
    try {
      persisted = await getConfig();
    } catch {
      /* none yet */
    }
  }

  if (persisted) {
    // Added hosts that are not in ~/.ssh/config right now stay added, marked
    // missing (`addedHosts`): dropping them here once moved beams to another
    // host without a word.
    cache(persisted);
    applyHotkey(HB.load().hotkey || []);
    applyToggleHotkey(HB.load().toggleHotkey);
    applyAutoHotkey(HB.load().autoHotkey);
    return true;
  }

  // No persisted config.
  if (tauri) {
    // First run: start clean so onboarding (FlowA) drives host selection.
    const clean = { ...HB.load(), addedIds: [], defaultId: null, recent: [] };
    cache(clean);
  } else {
    // Plain browser: dress the mock hosts up as a Mac that has used the app.
    const cfg = HB.load();
    cfg.addedIds = OB_MOCK.sshConfig.map((h) => h.id);
    cfg.defaultId = cfg.addedIds[0] ?? null;
    if (!cfg.recent?.length) cfg.recent = DEV_SEED_RECENT();
    HB.save(cfg);
  }
  applyHotkey(HB.load().hotkey || []);
  applyToggleHotkey(HB.load().toggleHotkey);
  applyAutoHotkey(HB.load().autoHotkey);
  return false;
}

// Re-exported for the entry points, which are the only files outside lib/
// that should ever need it; views reach it through lib/config-sync.
export { refreshConfig };

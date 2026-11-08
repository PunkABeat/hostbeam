// The config store — the single source of truth for app state (default host,
// hotkey, remote folders, toggles, recent history), persisted in localStorage and
// mirrored to the Rust store by config-bridge.

import { useCallback, useEffect, useState } from "react";

import type { Config, Host } from "../types/config";
import { OB_MOCK } from "./hosts";
import { DEFAULT_SENTENCE } from "./sentence";

const KEY = "hostbeam.config.v1";

/** What a Mac has before anyone touches it: no hosts, nothing beamed. The
 *  browser render seeds hosts and a few Recent rows on top (config-bridge.ts);
 *  those are not defaults and must never reach a real config. */
const DEFAULTS: Config = {
  addedIds: [],
  defaultId: null,
  manualHosts: [], // hosts the user typed in (not from ~/.ssh/config)
  folders: {}, // per-host remote-folder overrides, keyed by host id
  recent: [],
  settings: {
    launch: true,
    menubar: true,
    dock: false, // menu-bar only by default; Dock icon + ⌘⇥ on request
    immediate: true,
    allowUrlBeam: true, // hostbeam:// links work out of the box (ADR 0025); one switch turns them off
    // Just the path, which every agent tested attaches as the picture itself;
    // the sentence is for whoever switches it on (next.md § 10a).
    copySentence: false,
    pathDefault: true, // this config was saved since that became the default — see load()
    showOnBeam: false, // shortcut beams silently by default; show the popover when on
    locale: "system",
    appearance: "system", // follow the OS light/dark; override in Preferences → General

    folder: "/tmp/hostbeam",
    sentence: DEFAULT_SENTENCE,
    sound: false,
    flash: true,
    // 2000 is comfortably above the ~1568px a vision model keeps, so nothing it
    // would have seen is thrown away, and it is the most Claude accepts once a
    // conversation holds more than 20 images. Kept in step with
    // DEFAULT_IMAGE_MAX_EDGE in src-tauri/config.rs.
    imageMaxEdge: 2000,
    // An hour covers a debugging session with an agent, which is the shape this
    // is for. It expires rather than running forever because leaving it on is
    // the worse failure. Kept in step with DEFAULT_AUTO_BEAM_MINUTES in Rust.
    autoBeamMinutes: 60,
    // Off until asked for. Hostbeam is a screenshot bridge; whether it also
    // brings things back is a product decision that has not been made.
    pullIncoming: false,
    // Checking on, installing off (ADR 0022): an app that replaces itself
    // unasked is a surprise, however quietly it does it. Kept in step with
    // the Rust defaults in config.rs.
    checkUpdates: true,
    installUpdates: false,
  },
  hotkey: ["cmd", "shift", "7"],
  toggleHotkey: null, // show/hide shortcut: off until recorded
  autoHotkey: null, // automatic-beaming shortcut: off until recorded
};

function load(): Config {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULTS));
    const p = JSON.parse(raw);
    const settings = { ...DEFAULTS.settings, ...(p.settings || {}) };
    // 2048 was the default and a preset until 2026-09-14. Once saved it cannot be
    // told from a choice, and the preset is gone, so it reads as today's 2000,
    // as config.rs does for the backend.
    if (settings.imageMaxEdge === 2048) settings.imageMaxEdge = DEFAULTS.settings.imageMaxEdge;
    // Until 2026-09-28 a beam copied "Use this screenshot: {path}" by default.
    // A config saved before then with that switch on and the sentence untouched
    // is someone who never chose it, so it reads as just the path — once: the
    // next save writes `pathDefault`, and a sentence switched on after that
    // stays on. A sentence someone wrote stays on. config.rs does the same.
    if (!p.settings?.pathDefault) {
      if (settings.copySentence && settings.sentence === DEFAULT_SENTENCE) {
        settings.copySentence = false;
      }
      settings.pathDefault = true;
    }
    return { ...DEFAULTS, ...p, settings };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}

function save(cfg: Config): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    /* localStorage unavailable — best-effort */
  }
  try {
    window.dispatchEvent(new CustomEvent("hb:config", { detail: cfg }));
  } catch {
    /* no window/CustomEvent — best-effort */
  }
}

function allHosts(): Host[] {
  const cfg = load();
  // config-bridge overwrites OB_MOCK.sshConfig with the real ~/.ssh/config hosts under Tauri.
  const config = OB_MOCK.sshConfig || [];
  return [...config, ...(cfg.manualHosts || [])];
}

function hostById(id: string): Host | null {
  return allHosts().find((h) => h.id === id) || null;
}

/** Effective remote folder for a host: its override, else the global default. */
function folderFor(id: string): string {
  const cfg = load();
  return (cfg.folders && cfg.folders[id]) || cfg.settings.folder;
}

/** A fresh copy of the defaults — what "Reset to defaults" writes. */
function defaults(): Config {
  return JSON.parse(JSON.stringify(DEFAULTS));
}

/** The folder a beam to this host lands in, as the commands want it: the
 *  effective folder, without a trailing slash. */
function beamFolder(id: string): string {
  return (folderFor(id) || "/tmp/hostbeam").replace(/\/+$/, "");
}

export const HB = {
  KEY,
  DEFAULTS,
  defaults,
  load,
  save,
  allHosts,
  hostById,
  folderFor,
  beamFolder,
};

export type ConfigPatch = Partial<Config> | ((prev: Config) => Config);

/** React hook: live-subscribed config + an updater that persists & broadcasts.
 *  Same-tab updates arrive via the 'hb:config' event; cross-tab via 'storage'.
 *  It also re-renders on 'hb:locale', a language's dictionary arriving after
 *  the switch to it (i18n.ts), so the screen does not stay in English. */
export function useHBConfig(): [Config, (patch: ConfigPatch) => void] {
  const [cfg, setCfg] = useState<Config>(HB.load);
  useEffect(() => {
    const onLocal = (e: Event) => setCfg((e as CustomEvent<Config>).detail);
    const onStorage = (e: StorageEvent) => {
      if (e.key === HB.KEY) setCfg(HB.load());
    };
    const onLocale = () => setCfg(HB.load());
    window.addEventListener("hb:config", onLocal);
    window.addEventListener("storage", onStorage);
    window.addEventListener("hb:locale", onLocale);
    return () => {
      window.removeEventListener("hb:config", onLocal);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("hb:locale", onLocale);
    };
  }, []);
  const update = useCallback((patch: ConfigPatch) => {
    // Patch what is persisted, not this component's copy. The two windows each
    // hold their own copy and save the whole object, so a copy that missed the
    // other window's write would put that write back the way it was — which is
    // what the popover did to Preferences' edits until this read went through
    // the store. `save` broadcasts `hb:config`, which is what sets `cfg`.
    const base = HB.load();
    const next = typeof patch === "function" ? patch(base) : { ...base, ...patch };
    HB.save(next);
    setCfg(next);
  }, []);
  return [cfg, update];
}

// Keeping localStorage in step with the durable Rust store: the cache write
// that survives the quota, and the re-pull a window does when another window
// wrote. Split from config-bridge so a view can trigger a refresh without
// importing the bridge (the layering rule eslint enforces).
import type { Config, Host } from "../types/config";
import { HB } from "./config";
import { OB_MOCK } from "./hosts";
import { getConfig, isTauri, listHosts } from "./ipc";

/** Mirror the durable Rust store into localStorage, which is only a cache.
 *
 *  Unguarded, this was the single most expensive line in the app: localStorage
 *  has a ~5MB quota, a config that outgrew it threw `QuotaExceededError` out of
 *  `setupConfigBridge`, and every `boot()` awaits that — so the window rendered
 *  nothing at all. Recent thumbnails are what got it there. A cache that cannot
 *  be written is a slow startup, never a blank window: Rust holds the truth and
 *  hands it over again next time. */
export function cache(cfg: Config): void {
  try {
    localStorage.setItem(HB.KEY, JSON.stringify(cfg));
    return;
  } catch {
    /* over quota — try again without the one thing that gets big */
  }
  try {
    // Recent thumbnails are all of the weight and none of the meaning. Without
    // them a row still names its file, its host and its time; without the whole
    // config the window falls back to whatever stale copy was cached last, which
    // is worse and much harder to notice.
    const light = { ...cfg, recent: (cfg.recent || []).map((r) => ({ ...r, thumb: null })) };
    localStorage.setItem(HB.KEY, JSON.stringify(light));
  } catch {
    /* still no — the Rust store remains the source of truth */
  }
}

// Re-pull the persisted config from the durable Rust store into localStorage and
// broadcast it, so a window that was open while *another* window changed settings
// reflects the change the next time it's shown. This is the popover's case: it
// hides on blur while you edit Preferences, so it re-hydrates on show rather than
// relying on cross-window `storage` events (which WKWebView doesn't reliably
// deliver across separate Tauri webviews). No-op without Tauri (the dev browser
// already syncs via same-origin `storage`/`hb:config` events).
export async function refreshConfig(): Promise<void> {
  if (!isTauri()) return;
  let persisted: Config | null;
  try {
    persisted = await getConfig();
  } catch {
    return; // keep the current config on any read error
  }
  if (!persisted) return;
  const raw = JSON.stringify(persisted);
  if (raw === localStorage.getItem(HB.KEY)) return; // unchanged — nothing to do
  cache(persisted);
  // Broadcast so useHBConfig subscribers + the theme listener re-apply. (Uses the
  // same 'hb:config' event HB.save emits; we do NOT call HB.save here — that would
  // mirror back to Rust and loop.)
  try {
    window.dispatchEvent(new CustomEvent("hb:config", { detail: persisted }));
  } catch {
    /* no CustomEvent — best-effort */
  }
}

/** Re-read `~/.ssh/config` into the host pool, and re-render what reads it.
 *
 *  The pool used to be read once, when a window loaded, so a host whose alias
 *  came back — the test host started again — stayed missing to the popover
 *  until Hostbeam itself restarted. The popover calls this when it is shown,
 *  Preferences when it is focused. As at launch, only a non-empty answer
 *  replaces the pool. */
export async function refreshHosts(): Promise<void> {
  if (!isTauri()) return;
  let hosts: Host[];
  try {
    hosts = await listHosts();
  } catch {
    return;
  }
  if (!Array.isArray(hosts) || !hosts.length) return;
  const unchanged = JSON.stringify(hosts) === JSON.stringify(OB_MOCK.sshConfig);
  OB_MOCK.sshConfig = hosts;
  OB_MOCK.detected = hosts;
  if (unchanged) return;
  try {
    window.dispatchEvent(new CustomEvent("hb:config", { detail: HB.load() }));
  } catch {
    /* no CustomEvent — best-effort */
  }
}

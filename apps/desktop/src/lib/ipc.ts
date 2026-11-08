// The one place the WebView talks to Rust.
//
// Every command the app can call is here, once, with its argument shape and
// its result type — the IPC contract as TypeScript, mirroring the
// `#[tauri::command]` signatures in src-tauri. Views import these functions;
// they never spell a command name or cast a result. The browser-dev fallbacks
// (no Tauri) live beside the real call so a screen can be worked on in a plain
// browser, and they are private, so no view can ship a mock by accident —
// Preferences did, for its Diagnostics sheet and Add-host test.
//
// Transport: `@tauri-apps/api/core`, which reaches Rust through
// `window.__TAURI_INTERNALS__` and works with `withGlobalTauri` off. Tests
// mock this module's transport with `vi.mock("@tauri-apps/api/core", …)`.
import { invoke as tauriInvoke, isTauri as tauriIsTauri } from "@tauri-apps/api/core";

import type { Config, Host } from "../types/config";
import type { LicenseStatus } from "./license";
import type { UpdateStatus } from "./updates";

/* ---- Transport ------------------------------------------------------------ */

/** Whether this page runs inside the app. False in a plain browser, where the
 *  UI renders against the mocks below. */
export function isTauri(): boolean {
  try {
    return tauriIsTauri();
  } catch {
    return false;
  }
}

/** Call a Rust command. Rejects with the command's stable error code (the
 *  string `CommandError` serializes to) or, outside Tauri, with an Error. */
export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) throw new Error(`${cmd}: not running inside Tauri`);
  return tauriInvoke<T>(cmd, args);
}

/** Fire-and-forget: a command whose failure the caller cannot act on. Logged
 *  nowhere on purpose — Rust logs its own side — but never an unhandled
 *  rejection, and a no-op outside Tauri. */
function fire(cmd: string, args?: Record<string, unknown>): void {
  if (!isTauri()) return;
  tauriInvoke(cmd, args).catch(() => {});
}

/* ---- Hosts and beaming (beam.rs) ------------------------------------------ */

/** What `test_host` answers (beam.rs `TestResult`). */
export interface TestResult {
  ok: boolean;
  detail: string;
  /** Indices into the `keys` asked about that the host's authorized_keys holds. */
  keysPresent: number[];
}

/** One row of `diagnose` (beam.rs `DiagRow`). */
export interface DiagRow {
  label: string;
  /** ok | fail | warn | skip */
  status: string;
  detail: string;
}

/** A `~/.ssh/config` host as Rust lists it (beam.rs `HostDto`). */
export interface SshHost extends Host {
  id: string;
  name: string;
  user: string;
  address: string;
  online: boolean;
}

/** What a beam delivers (beam.rs `BeamResult`). */
export interface BeamResult {
  /** Every remote path this gesture delivered, in the order sent. */
  paths: string[];
  sentence: string;
  /** One preview per path, aligned by index: a path into the thumbnail cache
   *  (render it with lib/thumbs `thumbUrl`), null where the bytes did not decode. */
  previews: (string | null)[];
  /** Local paths this gesture did not deliver — empty unless it stopped part-way. */
  failed: string[];
  /** Claims the unsent half without counting a second beam. */
  retryToken?: string | null;
  /** The file on this Mac each path came from, aligned with `paths`; null for
   *  a clipboard picture. What Show in Finder reveals. */
  sources?: (string | null)[];
  /** Set when nothing was sent because a file looks like a secret: the
   *  popover asks, and "Send anyway" beams exactly `paths` with
   *  `allowSecrets`. Not a failure, and no beam was counted (beam.rs `Held`). */
  held?: Held | null;
  /** The beam landed whole and carries the reminder to buy a license
   *  (ADR 0028). Said after the beam, never instead of it. */
  remind?: boolean;
}

/** A beam stopped before anything left the Mac (beam.rs `Held`). */
export interface Held {
  /** Every local path of the gesture — clipboard-named files included. */
  paths: string[];
  /** The names that looked like secrets. */
  flagged: string[];
}

/** One file a copy in Finder left on the clipboard (beam.rs `ClipFile`). */
export interface ClipFile {
  path: string;
  name: string;
  bytes: number;
}

/** What is on the clipboard (beam.rs `ClipboardImage`). */
export interface ClipboardImage {
  /** A picture — never Finder's icon for a copied file. */
  present: boolean;
  width?: number;
  height?: number;
  /** A small PNG preview as a data URL, or null. */
  thumb?: string | null;
  /** Files a copy in Finder named: what a beam sends instead of a picture.
   *  Empty (or absent, from an older core) otherwise. */
  files?: ClipFile[];
}

export interface StorageInfo {
  count: number;
  kb: number;
}

/** The ssh target for a host, in the shape every Rust command expects: a
 *  `~/.ssh/config` host by its alias, a typed-in host by `user@address`. The
 *  popover used to pass a typed-in host's id — a slug like `my-box` — which
 *  `ssh` cannot resolve. */
export function sshTarget(
  host: Pick<Host, "id" | "user" | "address"> & { manual?: boolean },
): string {
  return host.manual ? manualTarget(host.user, host.address) : host.id;
}

/** The target for a host that is being typed in and is not saved yet. */
export function manualTarget(user: string | undefined, address: string | undefined): string {
  const a = (address ?? "").trim();
  const u = (user ?? "").trim();
  return u ? `${u}@${a}` : a;
}

/** The hosts in `~/.ssh/config`. Empty outside Tauri: the caller keeps its mocks. */
export function listHosts(): Promise<SshHost[]> {
  if (!isTauri()) return Promise.resolve([]);
  return invoke<SshHost[]>("list_hosts");
}

/** Beam what is on the clipboard — a picture, or the files a copy in Finder
 *  named. `hud` asks Rust to drive the floating HUD itself (a silent shortcut
 *  beam: the popover's webview is suspended while hidden). */
export function beam(args: { alias: string; folder: string; hud: boolean }): Promise<BeamResult> {
  return invoke<BeamResult>("beam", args);
}

/** Beam files already on disk (a drop). `retryToken` claims the unsent half
 *  of a partial beam without spending a second one; `allowSecrets` is the
 *  user's "Send anyway" to a held beam, and skips only that check. */
export function beamFiles(args: {
  alias: string;
  folder: string;
  paths: string[];
  hud: boolean;
  retryToken: string | null;
  allowSecrets?: boolean;
}): Promise<BeamResult> {
  return invoke<BeamResult>("beam_files", args);
}

/** Reachability (and, with `keys`, which paired devices the host accepts). */
export function testHost(target: string, keys: string[] = []): Promise<TestResult> {
  if (!isTauri()) return mockTestHost(target);
  return invoke<TestResult>("test_host", { target, keys });
}

/** The four-row connection diagnostics for a host. */
export function diagnose(target: string, folder: string): Promise<DiagRow[]> {
  if (!isTauri()) return mockDiagnose(target);
  return invoke<DiagRow[]>("diagnose", { alias: target, folder });
}

/** Append a device's public key to the host's authorized_keys (ADR 0018). */
export function installPubkey(target: string, key: string): Promise<void> {
  return invoke<void>("install_pubkey", { target, key });
}

/** Effective ssh ports, keyed by target, for the pairing payload. */
export function resolvePorts(targets: string[]): Promise<Record<string, number>> {
  if (!isTauri()) return Promise.resolve({});
  return invoke<Record<string, number>>("resolve_ports", { targets });
}

/** Count and size of Hostbeam's own files in the host's beam folder. */
export function hostStorage(target: string, folder: string): Promise<StorageInfo> {
  return invoke<StorageInfo>("host_storage", { target, folder });
}

/** Delete Hostbeam's own files from the beam folder; how many went. */
export function hostCleanup(target: string, folder: string): Promise<number> {
  return invoke<number>("host_cleanup", { target, folder });
}

/** Show the source files of these Recent rows in Finder (reveal.rs). How many
 *  were still there: 0 means moved or deleted since. */
export function revealRecent(ids: string[]): Promise<number> {
  if (!isTauri()) return Promise.resolve(0);
  return invoke<number>("reveal_recent", { ids });
}

export function clipboardImage(): Promise<ClipboardImage> {
  if (!isTauri()) return Promise.resolve({ present: false });
  return invoke<ClipboardImage>("clipboard_image");
}

/** A larger preview of the clipboard image (the lightbox), or null. */
export function clipboardPreview(): Promise<string | null> {
  if (!isTauri()) return Promise.resolve(null);
  return invoke<string | null>("clipboard_preview").then((p) => p || null);
}

/** Put text on the clipboard. Rust writes it, so it waits its turn with a
 *  beam's reads rather than landing in the middle of one (clipboard.rs) —
 *  which is why views copy through this, never `navigator.clipboard`. A plain
 *  browser has only the browser's clipboard, so that is what it gets. */
export function copyText(text: string): Promise<void> {
  if (!isTauri()) {
    return navigator.clipboard?.writeText
      ? navigator.clipboard.writeText(text)
      : Promise.reject(new Error("no clipboard"));
  }
  return invoke<void>("copy_text", { text });
}

/* ---- Automatic beaming (auto_beam.rs) ------------------------------------- */

export function autoBeamSet(enabled: boolean): Promise<void> {
  return invoke<void>("auto_beam_set", { enabled });
}

export function autoBeamState(): Promise<boolean> {
  if (!isTauri()) return Promise.resolve(false);
  return invoke<boolean>("auto_beam_state");
}

/* ---- Pull (pull.rs) ------------------------------------------------------- */

export interface Incoming {
  name: string;
  bytes: number;
  /** Where it landed on this Mac. */
  local: string;
  preview: string | null;
}

export function pullIncoming(target: string, folder: string): Promise<Incoming[]> {
  return invoke<Incoming[]>("pull_incoming", { target, folder });
}

/** Open a pulled image locally; Rust refuses anything outside the pull folder. */
export function openPulled(path: string): void {
  fire("open_pulled", { path });
}

/* ---- Dev servers (dev_forward.rs, ADR 0029) -------------------------------- */

/** The ports the SSH user is listening on (dev_forward.rs `DevServers`). */
export interface DevServers {
  ports: number[];
  /** False when the answer was cut short: "could not check", not "none". */
  checked: boolean;
}

/** An open forward (dev_forward.rs `OpenForward`). */
export interface OpenForward {
  /** The ssh target it was opened with — what `sshTarget` gives. */
  target: string;
  /** The port on the host. */
  port: number;
  /** Where it is on this Mac: http://127.0.0.1:<port>/. */
  url: string;
}

/** Ask the host, read-only, what the user is listening on. Nothing outside
 *  Tauri, so the popover's tests and the browser render never show a section. */
export function devServers(target: string): Promise<DevServers> {
  if (!isTauri()) return Promise.resolve({ ports: [], checked: false });
  return invoke<DevServers>("dev_servers", { target });
}

/** Forward a port to this Mac and open it in the browser; an open one is just
 *  shown again. Rejects with `dev_gone`, `dev_blocked` or an ssh code. */
export function devForwardOpen(target: string, port: number): Promise<OpenForward> {
  return invoke<OpenForward>("dev_forward_open", { target, port });
}

export function devForwardStop(target: string, port: number): Promise<void> {
  if (!isTauri()) return Promise.resolve();
  return invoke<void>("dev_forward_stop", { target, port });
}

export function devForwards(): Promise<OpenForward[]> {
  if (!isTauri()) return Promise.resolve([]);
  return invoke<OpenForward[]>("dev_forwards");
}

/* ---- Config (config.rs) --------------------------------------------------- */

export function getConfig(): Promise<Config | null> {
  return invoke<Config | null>("get_config");
}

export function setConfig(value: Config): Promise<void> {
  return invoke<void>("set_config", { value });
}

/* ---- Licensing (licensing/mod.rs) — see lib/license.ts for the wrappers --- */

export function licenseStatus(): Promise<LicenseStatus> {
  return invoke<LicenseStatus>("license_status");
}

export function licenseActivate(key: string): Promise<LicenseStatus> {
  return invoke<LicenseStatus>("license_activate", { key });
}

export function licenseDeactivate(): Promise<LicenseStatus> {
  return invoke<LicenseStatus>("license_deactivate");
}

/** Seats the licence occupies. */
export function licenseSeats(): Promise<number> {
  return invoke<number>("license_seats");
}

/* ---- Opening things (lib.rs, share.rs) ------------------------------------ */

/** Open an https URL in the default browser. Rust refuses any other scheme;
 *  outside Tauri the page opens in a new tab so the dev render still navigates. */
export function openUrl(url: string): void {
  if (!isTauri()) {
    window.open(url, "_blank", "noreferrer");
    return;
  }
  fire("open_url", { url });
}

/** Mail to support, subject by kind, app version appended by Rust. */
export function sendFeedback(kind: "feedback" | "feature"): void {
  if (!isTauri()) {
    const subject = kind === "feature" ? "Hostbeam feature request" : "Hostbeam feedback";
    window.open(`mailto:support@hostbeam.app?subject=${subject}`);
    return;
  }
  fire("send_feedback", { kind });
}

/** The system share menu under a button (About → Share → More…). */
export function shareHostbeam(
  text: string,
  anchor: { x: number; y: number; width: number; height: number },
): Promise<void> {
  return invoke<void>("share_hostbeam", { text, anchor });
}

/** hostbeam.app on the clipboard. */
export function copyShareLink(): Promise<void> {
  return invoke<void>("copy_share_link");
}

/** Terminal with `ssh <target>`. No-op outside Tauri. */
export function openTerminal(target: string): void {
  fire("open_terminal", { target });
}

/* ---- Windows (lib.rs) ----------------------------------------------------- */

export function openPreferences(tab?: string): void {
  fire("open_preferences", { tab });
}

/** Preferences has painted its first frame: Rust reveals the born-hidden window. */
export function preferencesReady(): void {
  fire("preferences_ready");
}

export function quitApp(): void {
  fire("quit_app");
}

export function showPopover(): void {
  fire("show_popover");
}

export function hidePopover(): void {
  fire("hide_popover");
}

/** The popover measured its content; Rust sizes the panel to it. */
export function resizePopover(height: number): void {
  fire("resize_popover", { height });
}

/** The user clicked the HUD: dismiss it and open the popover — on the license
 *  card when it was the reminder that was clicked. */
export function hudOpen(license = false): void {
  fire("hud_open", { license });
}

/** Rebuild the tray menu, in the given locale or the persisted one. */
export function refreshTrayMenu(locale?: string): Promise<void> {
  return invoke<void>("refresh_tray_menu", locale ? { locale } : {});
}

export function appVersion(): Promise<string | null> {
  if (!isTauri()) return Promise.resolve(null);
  return invoke<string>("app_version").then((v) => v || null);
}

/* ---- Parked asks (lib.rs): a cold start collects what arrived before the
   webview existed; a running webview drains what it just served. ---------- */

export function takeUrlBeam(): Promise<boolean> {
  if (!isTauri()) return Promise.resolve(false);
  return invoke<boolean>("take_url_beam");
}

export function takeUrlHost(): Promise<string | null> {
  if (!isTauri()) return Promise.resolve(null);
  return invoke<string | null>("take_url_host");
}

export function takePendingOpen(): Promise<string[]> {
  if (!isTauri()) return Promise.resolve([]);
  return invoke<string[] | null>("take_pending_open").then((files) => files || []);
}

export function takeUpdateCheck(): Promise<boolean> {
  if (!isTauri()) return Promise.resolve(false);
  return invoke<boolean>("take_update_check");
}

/* ---- Updates (updates.rs) ------------------------------------------------- */

/** Ask download.hostbeam.app now (About → Check for updates). */
export function updateCheck(): Promise<UpdateStatus> {
  return invoke<UpdateStatus>("update_check");
}

/** The cached answer of the last check — no network. Null outside Tauri. */
export function updateAvailable(): Promise<UpdateStatus | null> {
  if (!isTauri()) return Promise.resolve(null);
  return invoke<UpdateStatus | null>("update_available");
}

/** Download, verify, install and relaunch. Only failures come back. */
export function updateInstall(): Promise<void> {
  return invoke<void>("update_install");
}

/* ---- Shortcuts (hotkeys.rs) ----------------------------------------------- */

export function setHotkey(accelerator: string): Promise<void> {
  return invoke<void>("set_hotkey", { accelerator });
}

/** `null` clears it. */
export function setToggleHotkey(accelerator: string | null): Promise<void> {
  return invoke<void>("set_toggle_hotkey", { accelerator });
}

/** `null` clears it. */
export function setAutoHotkey(accelerator: string | null): Promise<void> {
  return invoke<void>("set_auto_hotkey", { accelerator });
}

/* ---- Diagnostic logs (log.rs) --------------------------------------------- */

export function readLogs(): Promise<string> {
  return invoke<string>("read_logs");
}

export function clearLogs(): Promise<void> {
  return invoke<void>("clear_logs");
}

export function openLogDir(): void {
  fire("open_log_dir");
}

/* ---- Browser-dev mocks. Private on purpose: see the header. ---------------- */

function mockTestHost(target: string): Promise<TestResult> {
  const a = target.trim().toLowerCase();
  const bad = !a || /\s/.test(a) || /(invalid|unknown|nope|timeout|\.example$|192\.0\.2\.)/.test(a);
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve(
          bad
            ? { ok: false, detail: "Operation timed out after 10s", keysPresent: [] }
            : { ok: true, detail: "Reachable", keysPresent: [] },
        ),
      1200,
    );
  });
}

function mockDiagnose(target: string): Promise<DiagRow[]> {
  const reachable = !/edge|old-vps/.test(target);
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!reachable) {
        resolve([
          { label: "SSH reachable", status: "fail", detail: "Operation timed out after 10s" },
          { label: "Authentication", status: "skip", detail: "Skipped" },
          { label: "Remote folder writable", status: "skip", detail: "Skipped" },
          { label: "Round-trip latency", status: "skip", detail: "Skipped" },
        ]);
        return;
      }
      const ms = 28 + Math.floor(Math.random() * 70);
      resolve([
        { label: "SSH reachable", status: "ok", detail: target },
        { label: "Authentication", status: "ok", detail: "key accepted" },
        { label: "Remote folder writable", status: "ok", detail: "/tmp/hostbeam" },
        { label: "Round-trip latency", status: ms > 75 ? "warn" : "ok", detail: `${ms} ms` },
      ]);
    }, 1400);
  });
}

// Shared frontend domain types — the one home for the config shape and host model
// that the glue (config-bridge, the entry points) and the screens reference.
// Mirrors HB.DEFAULTS in src/lib/config.ts (and the Rust serde mirror in
// src-tauri/src/config.rs).

export type Locale = "system" | "en" | "fr" | "ja" | "es" | "de" | "zh" | "pt" | "ko";

/** UI appearance: follow the OS, or force light/dark. */
export type Appearance = "system" | "light" | "dark";

export interface Settings {
  /** Preferences → General → Startup. All three are applied by Rust
   * (startup.rs) at launch and whenever the config is written. */
  launch: boolean;
  menubar: boolean;
  /** Regular app: Dock icon and ⌘⇥ entry; the Dock click opens the popover.
   * Never off together with `menubar` — the pane disables the last one. */
  dock: boolean;
  immediate: boolean;
  copySentence: boolean;
  /** Saved since "just the path" became the default (lib/config.ts load). */
  pathDefault?: boolean;
  /** Shortcut beams silently by default; show the popover while beaming when on. */
  showOnBeam: boolean;
  /** Let anything that can open a URL start a beam or switch the host
   * (`hostbeam://beam`, ADR 0025). On by default since 0.1.26; a saved `false`
   * is an explicit off. Mirrored in Rust as `allow_url_beam`. */
  allowUrlBeam: boolean;
  /** "system" | a supported locale code. */
  locale: Locale | string;
  /** UI appearance: follow the OS ("system") or force "light" / "dark". */
  appearance: Appearance;
  folder: string;
  sentence: string;
  sound: boolean;
  flash: boolean;
  /** Longest side, in px, a beamed clipboard screenshot is scaled down to.
   * `0` sends it at full size. Only the clipboard path honours this — a dropped
   * file is still sent as it is. Mirrored in Rust as `image_max_edge`. */
  imageMaxEdge: number;
  /** How long "beam screenshots automatically" stays on once switched on, in
   * minutes; `0` is until you switch it off. Only the duration is persisted —
   * the armed state deliberately is not, so a launch never resumes sending.
   * Mirrored in Rust as `auto_beam_minutes`. */
  autoBeamMinutes: number;
  /** Offer to fetch images the agent left in the host's beam folder. Off by
   * default — see the Rust mirror (`pull_incoming`) for why. */
  pullIncoming: boolean;
  /** Ask download.hostbeam.app for a newer version about once a day. On by
   * default (ADR 0022). Mirrored in Rust as `check_updates`. */
  checkUpdates: boolean;
  /** Install a found update without asking, relaunching while Hostbeam is not
   * in use. Off by default, and does nothing while `checkUpdates` is off
   * (ADR 0022). Mirrored in Rust as `install_updates`. */
  installUpdates: boolean;
}

export interface Host {
  id: string;
  name?: string;
  address?: string;
  user?: string;
  folder?: string;
  online?: boolean;
  /** Added, but no longer in `~/.ssh/config`. Kept rather than dropped, so a
   *  beam to it refuses instead of going to some other host (2026-10-06). */
  missing?: boolean;
}

export interface RecentBeam {
  id: string;
  hostId: string;
  hostName?: string;
  path: string;
  at: number;
  /** The preview, ~480px on its long edge: a path into Rust's thumbnail cache
   *  (render it through lib/thumbs `thumbUrl`), or a data URL on rows written
   *  before 0.1.27. Null when there is none. */
  thumb?: string | null;
  /** The gesture this file arrived with. Rows sharing one are a single drop and
   *  collapse to a single row in the popover, which shows three: ten files from
   *  one drop used to push the previous nine beams out of sight. Absent on rows
   *  written before 0.1.19, which is why grouping treats it as "on its own". */
  group?: string;
  /** The file on this Mac it was beamed from, for Show in Finder — a drop, a
   *  file opened with Hostbeam, a copy in Finder. Absent for a clipboard
   *  picture, which never was a file, and on rows written before it existed. */
  local?: string;
}

/** A device whose public key the Mac has installed on at least one host
 * (ADR 0018). Public material only — never a private key or credential. */
export interface PairedDevice {
  /** The SHA256 fingerprint, which is also the identity: one per device key. */
  id: string;
  /** From the key's comment ("hostbeam-iphone"), shown in the UI. */
  name: string;
  /** The full `ssh-ed25519 AAAA… comment` line, as installed. */
  key: string;
  addedAt: number;
  lastUsedAt?: number;
}

export interface Config {
  addedIds: string[];
  defaultId: string | null;
  /** Hosts the user typed in (not from ~/.ssh/config). */
  manualHosts: Host[];
  /** Per-host remote-folder overrides, keyed by host id. */
  folders: Record<string, string>;
  recent: RecentBeam[];
  settings: Settings;
  hotkey: string[];
  /** Global shortcut that shows or hides the popover from any app. Off
   * (null or empty) until the user records one in Preferences → Hotkey. */
  toggleHotkey?: string[] | null;
  /** The automatic-beaming shortcut; null (or absent) means none is set. Off by
   * default like the show/hide one — three global combos claimed without asking
   * would be greedy on a machine that also runs CleanShot and Raycast. */
  autoHotkey?: string[] | null;
  /** Version the user skipped ("Skip for now"). Per version on purpose:
   * skipping 0.1.8 hides it everywhere, dots included, and 0.1.9 is announced
   * as usual. Rust reads it too, so a skipped version never installs itself. */
  updateDismissed?: string | null;
  /** The version the popover last ran as, so it can say "Updated to …" once
   * after an update. Unset on a first run, which announces nothing. */
  lastVersion?: string | null;
  /** Devices authorized from this Mac, so host 2..n needs no phone in hand
   * (ADR 0018). Offered, never installed automatically. */
  pairedDevices?: PairedDevice[];
  // The prototype surfaces attach a few ad-hoc fields (e.g. setupComplete, reach);
  // allow them without weakening the named fields above.
  [key: string]: unknown;
}

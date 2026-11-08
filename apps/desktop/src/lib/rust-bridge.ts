// Messages Rust sends to a webview — the other half of lib/ipc.ts.
//
// One channel, typed at both ends. Rust serialises a `UiMessage`
// (src-tauri/src/ui_bridge.rs) and evals `window.__hbReceive(msg)`; this
// module hands it to whatever subscribed to that kind. It replaces eleven
// `window.hbX` globals that views installed and tore down on every render,
// each spelled once in Rust and once here with nothing checking the two agreed.
//
// Why an eval and not Tauri's event system: the popover is a non-activating
// panel whose webview is suspended while hidden. An eval reaches it the moment
// it is shown; whether a queued event would is undocumented. The transport is
// one line in Rust, so it can change without touching a subscriber.
//
// A message with no subscriber is dropped, on purpose: a `beam` delivered
// later to a popover that has since mounted would be the surprise upload this
// app refuses to do. What a cold start needs survives in Rust's parked
// mailboxes (takeUrlBeam, takePendingOpen, …), which the popover drains on
// mount.
import { useEffect, useRef } from "react";

export type HudPhase = "uploading" | "done" | "partial" | "failed";

/** Mirrors `UiMessage` in src-tauri/src/ui_bridge.rs, field for field. */
export type RustMessage =
  /** Beam the clipboard now: the shortcut, the tray, ⌥-click, a URL, auto-beam. */
  | { kind: "beam" }
  /** Make this host the current one (the tray's Switch host ▸). An id the
   *  config no longer has is ignored. */
  | { kind: "setHost"; id: string }
  /** Copy a Recent gesture's paste-ready text (the tray's Recent ▸), by the
   *  gesture's key — its first row's id. */
  | { kind: "copyRecent"; key: string }
  /** The Dock menu's Hide from Dock: the same as the Preferences switch. */
  | { kind: "setDock"; on: boolean }
  /** One file of a batch landed. Never sent for a single file. */
  | { kind: "progress"; sent: number; total: number }
  /** The auto-beam watcher's armed state: on arming, disarming and expiry. */
  | { kind: "autoBeam"; armed: boolean }
  /** macOS handed the app a file (a Dock drop, Open With, `open -a`); it is
   *  parked in Rust, collect it with takePendingOpen(). */
  | { kind: "openedFile" }
  /** The popover panel was just shown. The panel never receives `focus`, so
   *  this is its only cue to refresh. */
  | { kind: "shown" }
  /** The tray's Check for updates…: run the About pane's check, where the
   *  answer can be read. */
  | { kind: "checkUpdates" }
  /** The HUD's reminder was clicked: open on the license card (ADR 0028). */
  | { kind: "showLicense" }
  /** A dev-server forward opened or ended (ADR 0029): ask devForwards() again. */
  | { kind: "devForwards" }
  /** The floating HUD's state for the beam in flight. */
  | {
      kind: "hud";
      phase: HudPhase;
      host: string;
      error: string | null;
      /** Files landed and files carried; both 0 for a single file. */
      sent: number;
      total: number;
      /** The one file a single-file beam carries, by name; null for a
       *  clipboard picture and for a batch. Sent with "uploading" only — the
       *  HUD keeps it for the beam's later states. */
      file: string | null;
      /** A landed beam that asks for a license under it (ADR 0028). */
      remind: boolean;
    };

export type RustMessageKind = RustMessage["kind"];
export type RustMessageOf<K extends RustMessageKind> = Extract<RustMessage, { kind: K }>;

type Listener = (msg: RustMessage) => void;
const listeners = new Map<RustMessageKind, Set<Listener>>();

/** Subscribe to one kind of message. Returns the unsubscribe. */
export function onRustMessage<K extends RustMessageKind>(
  kind: K,
  fn: (msg: RustMessageOf<K>) => void,
): () => void {
  const set = listeners.get(kind) ?? new Set();
  listeners.set(kind, set);
  const listener = fn as Listener;
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}

/** What Rust calls. Anything that is not a message it knows is ignored — a
 *  newer Rust talking to an older bundle mid-update must not throw here. */
export function receive(msg: unknown): void {
  if (!msg || typeof msg !== "object" || typeof (msg as { kind?: unknown }).kind !== "string") {
    return;
  }
  const message = msg as RustMessage;
  const set = listeners.get(message.kind);
  if (!set) return;
  for (const fn of [...set]) {
    try {
      fn(message);
    } catch (e) {
      console.error(`rust message ${message.kind}: handler threw`, e);
    }
  }
}

/** Subscribe a component to one kind of message for as long as it is mounted.
 *  The latest `handler` always runs — it is read through a ref — so the
 *  subscription itself is made once, not on every render. */
export function useRustMessage<K extends RustMessageKind>(
  kind: K,
  handler: (msg: RustMessageOf<K>) => void,
): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => onRustMessage(kind, (msg) => ref.current(msg)), [kind]);
}

/** Only tests need this. */
export function resetRustBridgeForTests(): void {
  listeners.clear();
}

// Installed at load, before any view mounts: Rust may speak first.
if (typeof window !== "undefined") window.__hbReceive = receive;

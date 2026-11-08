// The beam's state machine, with no React and no IPC in it: what the popover
// shows for a beam is a fold over these events. The hook (views/popover/
// hooks/useBeam.ts) owns the timers, the commands and the refs, and reduces
// their outcomes through here, so every transition is a unit test.
import type { DiagRow, Held } from "./ipc";

/** `held` is its own phase, not a failure: nothing went wrong and nothing was
 *  spent — a file looks like a secret, and only the user can say send it. */
export type BeamPhase = "idle" | "uploading" | "landing" | "done" | "failed" | "held";

export interface BeamState {
  phase: BeamPhase;
  /** Which failure card, once `phase` is "failed"; meaningless before. */
  err: string;
  /** The remote path of the first file the last gesture delivered. */
  path: string;
  /** The preview of the image being/just beamed — the clipboard is replaced
   *  with the paste-ready text on success, so the card can't read it there. */
  beamThumb: string | null;
  /** How far a multi-file beam has got. Null for a single file, which is every
   *  clipboard beam — "1 of 1" is not progress. */
  progress: { sent: number; total: number } | null;
  /** A partial: files the gesture did not deliver, exactly what "beam the
   *  rest" sends. The ones that did land are in Recent, which is why this is
   *  not a failure. */
  unsent: string[];
  /** How many files the last gesture delivered — the "3" in "3 of 5". */
  landedCount: number;
  /** A file hovering over the popover. */
  dropping: boolean;
  /** A brief line for a drop it will not send. Not a failed beam: nothing was
   *  attempted, and the failure card's recoveries make no sense for it. */
  refused: boolean;
  diag: DiagRow[] | "running" | null;
  /** What the held card asks about, while `phase` is "held". */
  held: Held | null;
  /** The local files the beam in hand carries — dropped, opened, or named by
   *  a copy in Finder. Empty for a clipboard picture. The clipboard card shows
   *  these while they travel, rather than claiming a screenshot. */
  carrying: string[];
  /** The last gesture landed whole and asks for a license under it (ADR 0028). */
  remind: boolean;
}

export const initialBeamState: BeamState = {
  phase: "idle",
  err: "timeout",
  path: "",
  beamThumb: null,
  progress: null,
  unsent: [],
  landedCount: 0,
  dropping: false,
  refused: false,
  diag: null,
  held: null,
  carrying: [],
  remind: false,
};

export type BeamEvent =
  /** The active host changed: nothing on the card carries over. */
  | { type: "hostChanged" }
  /** Back to the ready card, from a card that is sticking around. */
  | { type: "reset" }
  /** The confirmation has been glanced at. */
  | { type: "confirmationFaded" }
  /** A beam is off: `files` when dropped, opened or named on the clipboard,
   *  else the clipboard's picture, whose thumbnail the card shows until the
   *  result brings the real one. */
  | { type: "started"; files?: string[]; clipThumb: string | null }
  /** Nothing was sent: a file looks like a secret. The card asks. */
  | { type: "held"; held: Held }
  /** Rust's per-file relay for a batch. */
  | { type: "progress"; sent: number; total: number }
  /** The gesture landed: `paths` are what it delivered, `failed` what a
   *  partial left behind. */
  | {
      type: "landed";
      paths: string[];
      previews?: (string | null)[];
      failed?: string[];
      remind?: boolean;
    }
  /** The landing animation has played. */
  | { type: "settled" }
  | { type: "failed"; error: string }
  /** The file itself was refused before anything reached the host. */
  | { type: "refused" }
  | { type: "refusalFaded" }
  | { type: "dragging"; over: boolean }
  | { type: "dropped" }
  | { type: "diagnostics"; diag: DiagRow[] | "running" | null };

/** A beam already in flight, which nothing may start over or reset. */
export function beamInFlight(phase: BeamPhase): boolean {
  return phase === "uploading" || phase === "landing";
}

/** A card the user is looking at, which the next beam replaces. A held card
 *  too: a new gesture is a new question, and the old one is answered "no". */
export function cardShowing(phase: BeamPhase): boolean {
  return phase === "done" || phase === "failed" || phase === "held";
}

/** Whether the "done" card should fade on its own. A confirmation is something
 *  you glance at; a partial asks you to decide about the rest, and a card that
 *  takes its button away after two seconds is worse than no button. */
export function confirmationFades(state: BeamState): boolean {
  return state.phase === "done" && state.unsent.length === 0;
}

export function reduceBeam(state: BeamState, event: BeamEvent): BeamState {
  switch (event.type) {
    case "hostChanged":
      // Those files were never sent *to this host*, so the offer does not carry
      // — and "send it to {host} anyway?" was asked about a different host.
      return {
        ...state,
        phase: "idle",
        unsent: [],
        path: "",
        diag: null,
        beamThumb: null,
        held: null,
        carrying: [],
        remind: false,
      };
    case "reset":
      return {
        ...state,
        phase: "idle",
        path: "",
        beamThumb: null,
        held: null,
        carrying: [],
        remind: false,
      };
    case "confirmationFaded":
      return confirmationFades(state) ? reduceBeam(state, { type: "reset" }) : state;
    case "started": {
      const files = event.files ?? [];
      return {
        ...state,
        phase: "uploading",
        unsent: [],
        progress: files.length > 1 ? { sent: 0, total: files.length } : null,
        // A file has no clipboard thumbnail — least of all one copied in
        // Finder, whose clipboard holds only its icon. Its preview, if it is a
        // picture, arrives with the result, from the file itself.
        beamThumb: files.length ? null : event.clipThumb,
        diag: null,
        held: null,
        carrying: files,
        remind: false,
      };
    }
    case "held":
      return {
        ...state,
        phase: "held",
        held: event.held,
        progress: null,
        beamThumb: null,
        diag: null,
        carrying: event.held.paths,
      };
    case "progress":
      return { ...state, progress: { sent: event.sent, total: event.total } };
    case "landed": {
      const first = event.previews?.[0] ?? null;
      return {
        ...state,
        phase: "landing",
        progress: null,
        // Files are on the host and their paths are on the clipboard, so this
        // lands as a success that says what is missing — not as a failure that
        // hides it.
        unsent: event.failed ?? [],
        landedCount: event.paths.length,
        path: event.paths[0] ?? "",
        // A result without a preview keeps the clipboard's.
        beamThumb: first ?? state.beamThumb,
        // Rust says so only for a whole landing; a partial has its own news.
        remind: !!event.remind && !(event.failed ?? []).length,
      };
    }
    case "settled":
      // Only a landing settles; a reset that got there first stands.
      return state.phase === "landing" ? { ...state, phase: "done" } : state;
    case "failed":
      return { ...state, phase: "failed", err: event.error, progress: null };
    case "refused":
      return { ...state, phase: "idle", progress: null, beamThumb: null, refused: true };
    case "refusalFaded":
      return { ...state, refused: false };
    case "dragging":
      return { ...state, dropping: event.over };
    case "dropped":
      return { ...state, dropping: false, refused: false };
    case "diagnostics":
      return { ...state, diag: event.diag };
  }
}

/** Browser-dev only: what a simulated beam does. `simResult` is the dev
 *  picker ("auto" beams by the host's mocked reachability; a named outcome
 *  forces that card). */
export function simulatedOutcome(simResult: string, hostOnline: boolean | undefined): string {
  if (simResult && simResult !== "auto") return simResult === "permission" ? "perm" : simResult;
  return hostOnline === false ? "timeout" : "success";
}

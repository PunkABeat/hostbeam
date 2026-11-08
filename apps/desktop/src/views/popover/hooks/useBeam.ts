// The beam itself: its phases, what it carries and what it left behind, and
// every way one starts — the button, the shortcut, a URL, a drop, a file macOS
// handed over. The state machine is lib/beam-state.ts (pure, tested); this
// hook owns the timers, the commands, the refs, and the effects that drain
// what Rust parked.
import { useEffect, useReducer, useRef } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";

import { t } from "../../../i18n";
import { classifyBeamFailure, rowsForGesture } from "../../../lib/beam-failure";
import {
  beamInFlight,
  cardShowing,
  confirmationFades,
  initialBeamState,
  reduceBeam,
  simulatedOutcome,
} from "../../../lib/beam-state";
import { HB, type ConfigPatch } from "../../../lib/config";
import {
  beam as beamClipboard,
  beamFiles,
  clipboardImage,
  diagnose,
  isTauri,
  showPopover,
  sshTarget,
  takePendingOpen,
  takeUrlBeam,
  takeUrlHost,
} from "../../../lib/ipc";
import { trimThumbs } from "../../../lib/recent";
import { useRustMessage } from "../../../lib/rust-bridge";
import { HBSound } from "../../../lib/sound";
import type { Host, Settings } from "../../../types/config";
import type { ClipState } from "../shared";

/** How long a landed beam's confirmation stays: a glance, or — carrying the
 *  reminder — long enough to read it and click it (the HUD's is 4.5s). */
const DONE_FADE_MS = 2500;
const REMIND_FADE_MS = 6000;

export interface UseBeamArgs {
  host: Host | null;
  settings: Settings;
  canBeam: boolean;
  clip: ClipState | null;
  setClip: (c: ClipState) => void;
  /** Browser-dev only: "auto" beams by the host's mocked reachability; a
   *  named outcome forces that card. */
  simResult: string;
  update: (patch: ConfigPatch) => void;
  recordReach: (id: string, ok: boolean) => void;
  /** The tray's Switch host ▸, which a parked `hostbeam://host` also uses. */
  setHostFromRust: (id: string) => void;
}

export function useBeam({
  host,
  settings: s,
  canBeam,
  clip,
  setClip,
  simResult,
  update,
  recordReach,
  setHostFromRust,
}: UseBeamArgs) {
  const [state, dispatch] = useReducer(reduceBeam, initialBeamState);
  const { phase, unsent, refused, held } = state;
  // Claims the unsent half without spending a second beam: a batch that stopped
  // part-way already spent the one it had. Rust checks it names these files and
  // takes it once; a stale one just means the retry pays like any other beam.
  const retryTokenRef = useRef<string | null>(null);
  // The global shortcut owns beaming (Rust → the "beam" message). Enter on the
  // focused primary button still beams when the popover is open.
  const silentRef = useRef(false);
  // What the last beam carried. "Try again" used to call upload() with nothing,
  // which quietly retried the *clipboard* after a failed file drop — a different
  // beam wearing the same button.
  const lastFilesRef = useRef<string[] | null>(null);
  // Whether that beam was a "Send anyway". Try again after one that failed on
  // the way must not stop at the same question.
  const lastAllowRef = useRef(false);

  // Reset transient state if the active host changes.
  useEffect(() => {
    dispatch({ type: "hostChanged" });
  }, [host?.id]);

  // After a successful beam, show the confirmation briefly, then return to
  // ready — unless files are still unsent (see `confirmationFades`). One that
  // carries the reminder stays long enough to read it, and to click it.
  const fades = confirmationFades(state);
  const remind = state.remind;
  useEffect(() => {
    if (!fades) return;
    const id = setTimeout(
      () => dispatch({ type: "confirmationFaded" }),
      remind ? REMIND_FADE_MS : DONE_FADE_MS,
    );
    return () => clearTimeout(id);
  }, [fades, unsent, remind]);

  // Keyboard path: focus the primary action whenever the beam state changes.
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = contentRef.current?.querySelector<HTMLElement>("[data-primary]");
    if (!el) return;
    const id = setTimeout(() => {
      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }
    }, 60);
    return () => clearTimeout(id);
  }, [phase]);

  // Esc on a held card is "Don't send". main.tsx hides the popover on Esc; this
  // makes sure the question goes with it rather than waiting there for later.
  useEffect(() => {
    if (phase !== "held") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "reset" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  // The refusal note is transient; it must not outlive the glance it needs.
  useEffect(() => {
    if (!refused) return;
    const t = setTimeout(() => dispatch({ type: "refusalFaded" }), 4000);
    return () => clearTimeout(t);
  }, [refused]);

  const resetCard = () => dispatch({ type: "reset" });

  /** One gesture landed. `all` is every path it delivered — usually one, but a
   *  drop of several is still a single beam. Each path gets its own Recent row
   *  with its own thumbnail; the card shows the first. */
  const landed = (
    all: string[],
    previews?: (string | null)[],
    failed?: string[],
    retryToken?: string | null,
    sources?: (string | null)[],
    remind?: boolean,
  ) => {
    retryTokenRef.current = retryToken ?? null;
    dispatch({ type: "landed", paths: all, previews, failed, remind });
    try {
      window.dispatchEvent(new CustomEvent("hb:beamed"));
    } catch {
      /* ignore */
    }
    if (s.sound) HBSound.beamLanded();
    // One id for the gesture: it keys the rows *and* marks them as one drop.
    const gesture = `${Date.now()}`;
    update((prev) => ({
      ...prev,
      // Bounded at the only place the list grows, so a config that grew too
      // big for the localStorage cache heals itself on the next beam.
      recent: trimThumbs(
        [
          ...rowsForGesture(gesture, host, all, previews, Date.now(), sources),
          ...(prev.recent || []),
        ].slice(0, 24),
      ),
      reach: { ...((prev.reach as object) || {}), [host?.id ?? ""]: { ok: true, at: Date.now() } },
    }));
    setTimeout(() => {
      if (silentRef.current) {
        silentRef.current = false;
        resetCard();
      } else dispatch({ type: "settled" });
    }, 760);
  };

  /** Beam the clipboard — a picture, or the files a copy in Finder named — or
   *  `files` when they were dropped on the popover / handed over by macOS.
   *  Everything after the command is the same either way, and however many
   *  files there are it is one beam. `allowSecrets` is the held card's "Send
   *  anyway". `probe` is a clipboard reading taken this tick, which the
   *  render's `clip` is not yet — reading that one showed the *previous*
   *  screenshot on the card. */
  const upload = (
    force?: boolean,
    files?: string[],
    retryToken?: string | null,
    allowSecrets?: boolean,
    probe?: ClipState,
  ) => {
    // A missing host refuses: the popover says why (MissingHostCard).
    if (!host || host.missing) return;
    if (beamInFlight(phase)) return;
    if (!force && !canBeam) return;
    lastFilesRef.current = files?.length ? files : null;
    lastAllowRef.current = !!allowSecrets;
    const clipNow = probe ?? clip;
    // A clipboard beam of files carries what the clipboard named; Rust reads
    // it again when it sends, so this is only what the card shows meanwhile.
    const carrying = files?.length ? files : (clipNow?.files ?? []).map((f) => f.path);
    dispatch({ type: "started", files: carrying, clipThumb: (clipNow && clipNow.thumb) || null });
    HBSound.unlock();
    const folder = HB.beamFolder(host.id);

    if (isTauri()) {
      // `hud: true` (silent shortcut beam) tells the Rust core to drive the
      // floating HUD itself — the popover webview is suspended while hidden.
      const sending = files?.length
        ? beamFiles({
            alias: sshTarget(host),
            folder,
            paths: files,
            hud: silentRef.current,
            retryToken: retryToken ?? null,
            allowSecrets: !!allowSecrets,
          })
        : beamClipboard({ alias: sshTarget(host), folder, hud: silentRef.current });
      sending
        .then((r) => {
          // Held, not landed: nothing was sent, spent or copied, so none of
          // what a landing does applies — no sound, no Recent row, no "reach",
          // and a live partial's token is left alone. Rust has already shown
          // the popover (a question needs somewhere to be answered).
          if (r.held) {
            silentRef.current = false;
            dispatch({ type: "held", held: r.held });
            return;
          }
          landed(r.paths, r.previews, r.failed, r.retryToken, r.sources, r.remind);
        })
        .catch((e) => {
          const failure = classifyBeamFailure(e);
          // The file itself was refused: nothing reached the host, so this must
          // not become a failure card that blames the connection — or mark a
          // perfectly healthy host unreachable.
          if (failure.kind === "refused") {
            dispatch({ type: "refused" });
            silentRef.current = false;
            return;
          }
          dispatch({ type: "failed", error: failure.error });
          if (failure.error === "timeout") recordReach(host.id, false);
          // On a silent beam the Rust flow shows the failure in the HUD; no
          // popover pop.
          silentRef.current = false;
        });
      return;
    }

    const outcome = simulatedOutcome(simResult, host.online);
    setTimeout(() => {
      if (outcome === "success") {
        const mm = String(10 + Math.floor(Math.random() * 49)).padStart(2, "0");
        const ss = String(Math.floor(Math.random() * 60)).padStart(2, "0");
        landed([`${folder}/2025-06-14-15.${mm}.${ss}.png`]);
      } else {
        dispatch({ type: "failed", error: outcome });
        if (outcome === "timeout") recordReach(host.id, false);
        silentRef.current = false;
      }
    }, 1300);
  };

  /** A beam that arrived from outside the button — the shortcut, the tray, a
   *  URL, an opened file: silent unless the setting shows the popover, and the
   *  card of the last beam makes way. */
  const beamSilently = (files?: string[], probe?: ClipState) => {
    const showUI = !!HB.load().settings?.showOnBeam;
    silentRef.current = !showUI;
    if (showUI) showPopover();
    if (cardShowing(phase)) resetCard();
    upload(true, files, undefined, undefined, probe);
  };

  /** A beam something other than the button asked for: the shortcut, the
   *  tray, ⌥-click, a URL, auto-beam. Reads the clipboard, beams, and only
   *  surfaces the popover on failure / nothing-to-beam. */
  const beamFromRust = () => {
    if (!host) return;
    // Whichever path got here, a beam parked by `hostbeam://beam` has been
    // served: drain it so the mount below cannot serve it a second time.
    void takeUrlBeam().catch(() => {});
    // The host beams go to has left ~/.ssh/config. Refused, and said where it
    // can be read — never handed to another host.
    if (host.missing) {
      silentRef.current = false;
      showPopover();
      return;
    }
    if (beamInFlight(phase)) {
      silentRef.current = false;
      showPopover();
      return;
    }
    if (!isTauri()) {
      beamSilently();
      return;
    }
    clipboardImage()
      .then((c) => {
        const now: ClipState = c || { present: false };
        setClip(now);
        // A picture, or files copied in Finder: either is something to beam.
        if (now.present || now.files?.length) beamSilently(undefined, now);
        else showPopover();
      })
      .catch(() => {});
  };
  useRustMessage("beam", beamFromRust);
  // Rust sends one of these per file that lands. A batch is the only sender:
  // Rust stays silent below two files rather than making the popover decide
  // what is worth showing.
  useRustMessage("progress", (m) => dispatch({ type: "progress", sent: m.sent, total: m.total }));
  // The mount-time drains below call these; through refs, so they run the
  // handlers of the render that is current when the parked ask is collected.
  const beamRef = useRef(beamFromRust);
  beamRef.current = beamFromRust;
  const setHostRef = useRef(setHostFromRust);
  setHostRef.current = setHostFromRust;

  // A `hostbeam://` link that arrived before this webview existed — the URL
  // is what launched the app, so the message Rust sent landed on nothing. Rust
  // parks it for a few seconds and this collects it, the way an opened file
  // is collected on mount. Mount only: a later render must not beam again.
  useEffect(() => {
    if (!isTauri()) return;
    void (async () => {
      try {
        const parked = await takeUrlHost();
        if (parked) {
          setHostRef.current(parked);
          // A beam that follows a switch has to see the switched host, and
          // the switch is a config write and a render away. One breath, so
          // `hostbeam://host` then `hostbeam://beam` at launch cannot send
          // to the host being left.
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        if (await takeUrlBeam()) beamRef.current();
      } catch {
        /* nothing parked, or no backend */
      }
    })();
  }, []);

  // A file macOS handed us: dropped on the Dock icon, opened with Hostbeam from
  // Finder, or `open -a`. Rust parks it and nudges; on a cold start the nudge
  // arrives before this webview exists, so the mount below collects it instead.
  // Draining is what makes the two safe together — whoever is second finds
  // nothing.
  const openedRef = useRef<() => void>(() => {});
  openedRef.current = () => {
    if (!isTauri()) return;
    takePendingOpen()
      .then((files) => {
        if (!files.length) return;
        // Nothing to beam to, or one already running: show the popover rather
        // than acting invisibly on a file the user opened somewhere else.
        if (!host || host.missing || beamInFlight(phase)) {
          silentRef.current = false;
          showPopover();
          return;
        }
        beamSilently(files);
      })
      .catch(() => {});
  };
  useRustMessage("openedFile", () => openedRef.current());
  useEffect(() => {
    openedRef.current();
  }, []);

  // Drop screenshots onto the popover to beam them, for the times they are
  // files on the Desktop rather than something on the clipboard. Tauri delivers
  // these to the webview, not the window, so the popover being a panel makes no
  // difference. All of them: this used to take paths[0] and silently discard
  // the rest, because several at once would each have spent a free-tier beam.
  // One gesture is one beam now, so there is nothing left to protect against
  // and no reason to throw four of five files away (next.md § 6).
  const uploadRef = useRef(upload);
  uploadRef.current = upload;
  useEffect(() => {
    if (!isTauri()) return; // browser dev: no drag-drop events to hear
    let stop: (() => void) | null = null;
    let live = true;
    getCurrentWebview()
      .onDragDropEvent((e) => {
        const p = e.payload;
        if (p.type === "over" || p.type === "enter") dispatch({ type: "dragging", over: true });
        else if (p.type === "leave") dispatch({ type: "dragging", over: false });
        else if (p.type === "drop") {
          dispatch({ type: "dropped" });
          const paths = p.paths ?? [];
          // A drop happens with the popover open and watching, so it is never
          // one of the silent beams the floating overlay is for.
          if (paths.length) {
            silentRef.current = false;
            uploadRef.current(true, paths);
          }
        }
      })
      .then((un) => {
        if (live) stop = un;
        else un();
      })
      .catch(() => {});
    return () => {
      live = false;
      stop?.();
    };
  }, []);

  /** The failure card's diagnostics, run on request. */
  const runDiagnostics = () => {
    if (!host) return;
    dispatch({ type: "diagnostics", diag: "running" });
    diagnose(sshTarget(host), HB.beamFolder(host.id))
      .then((diag) => dispatch({ type: "diagnostics", diag }))
      .catch(() =>
        dispatch({
          type: "diagnostics",
          diag: [{ label: t("diag.failed"), status: "fail", detail: "" }],
        }),
      );
  };

  return {
    ...state,
    contentRef,
    /** Back to the ready card, from a card that is sticking around. */
    reset: resetCard,
    /** The button. */
    beamNow: () => upload(),
    /** "Try again": the same beam — the files it carried, or the clipboard. */
    retryLast: () =>
      upload(true, lastFilesRef.current ?? undefined, undefined, lastAllowRef.current),
    /** "Beam the rest": exactly the unsent half, on the partial's token. */
    beamRest: () => upload(true, unsent, retryTokenRef.current),
    /** The held card's "Send anyway": exactly the files it named, once. */
    sendHeld: () => {
      if (!held) return;
      silentRef.current = false;
      upload(true, held.paths, null, true);
    },
    /** The held card's "Don't send". */
    declineHeld: resetCard,
    runDiagnostics,
  };
}

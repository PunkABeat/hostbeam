// Beam HUD window entry. A small, transparent, non-activating panel (positioned
// top-center by the Rust core) that shows a silent shortcut beam in flight and its
// result. Rust sends beam state as "hud" messages (lib/rust-bridge.ts); the
// window auto-hides itself after a terminal state.
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import "@hostbeam/ui/styles.css";
import "./views/hud/hud.css";
import { localeReady, t } from "./i18n";
import { BEAM_ERRORS } from "./lib/beam-errors";
import { extOf, isImagePath } from "./lib/files";
import { clipboardPreview, hudOpen } from "./lib/ipc";
import { useRustMessage, type RustMessageOf } from "./lib/rust-bridge";
import { setupTheme } from "./lib/theme";
import { BeamHud } from "./views/hud/BeamHud";

// Follow the OS / user appearance so the HUD themes like the rest of the app.
setupTheme();

type HudPayload = RustMessageOf<"hud">;

function HudApp() {
  const [data, setData] = useState<HudPayload | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  // The file a single-file beam carries. Rust names it on "uploading" and not
  // again, so it is kept here for "done" and "failed" — and forgotten when a
  // beam starts without one (a clipboard picture).
  const [file, setFile] = useState<string | null>(null);

  useRustMessage("hud", (p: HudPayload) => {
    if (p.phase === "uploading" && !(p.total > 1)) setFile(p.file ?? null);
    setData(p);
  });

  // Fetch the screenshot preview straight from the clipboard when a beam starts
  // (over normal IPC — a data URL doesn't belong in the eval relay); clear on hide.
  useEffect(() => {
    if (!data) {
      setThumb(null);
      return;
    }
    if (data.phase === "uploading") {
      // A batch, or a single file, beams from disk, so there is no clipboard
      // image standing for it; fetching one would show the wrong picture —
      // and for a file copied in Finder, its icon.
      if ((data.total ?? 0) > 1 || data.file) {
        setThumb(null);
        return;
      }
      setThumb(null); // drop any stale preview from a previous beam while we fetch
      clipboardPreview()
        .then((p) => setThumb(p))
        .catch(() => {});
    }
  }, [data]);

  // Note: auto-dismiss is driven by the Rust core (schedule_hud_hide), not a JS
  // timer — a non-activating panel's webview throttles setTimeout when it isn't the
  // active window, so an in-page timer wouldn't fire until the app was clicked.

  if (!data) return null;
  const host = data.host ?? "";
  const total = data.total ?? 0;
  const sent = data.sent ?? 0;
  const batch = total > 1;
  // On failure, map the stable error code to the localized taxonomy (title + detail).
  const errDef =
    data.phase === "failed" ? (BEAM_ERRORS[data.error ?? ""] ?? BEAM_ERRORS.timeout) : null;
  const title =
    data.phase === "done"
      ? t("pop.beamedTo", { host })
      : data.phase === "partial"
        ? t("pop.partialTitle", { host })
        : errDef
          ? errDef.title({ name: host })
          : t("pop.beamingTo", { host });
  // In flight: the count for a batch, the name of a single file handed over
  // (it is what the user is watching go), and nothing for a clipboard picture,
  // whose thumbnail already says what it is.
  // A landed beam that carries the reminder says that instead of "Copied to
  // clipboard" — the tick already says it landed (ADR 0028).
  const remind = data.phase === "done" && !!data.remind;
  const sub =
    data.phase === "uploading"
      ? batch
        ? t("pop.nOfTotal", { n: sent, total })
        : (file ?? undefined)
      : data.phase === "done"
        ? remind
          ? t("pop.remind")
          : t("pop.copiedToClipboard")
        : data.phase === "partial"
          ? t("pop.partialDetail", { n: sent, total })
          : errDef
            ? errDef.detail({ name: host })
            : undefined;

  // Clicking the HUD in any state dismisses it and opens the popover — progress /
  // recent, or the failure card + recovery, or the license card when the HUD
  // was asking for one. Showing the popover wakes its webview, which renders
  // the current beam state.
  const onClick = () => hudOpen(remind);

  return (
    <div className="hud-stage">
      <BeamHud
        phase={data.phase}
        title={title}
        sub={sub}
        thumb={thumb}
        fileLabel={file && !isImagePath(file) ? extOf(file) : null}
        onClick={onClick}
        progress={batch ? { sent, total } : null}
        remind={remind}
      />
    </div>
  );
}

// The HUD's first frame is often the moment it is needed, so it waits for its
// dictionary rather than flashing English first.
const el = document.getElementById("root");
if (el) void localeReady().then(() => createRoot(el).render(<HudApp />));

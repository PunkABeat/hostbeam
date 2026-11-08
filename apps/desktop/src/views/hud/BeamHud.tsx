// Floating beam HUD — the small overlay shown while a silent (shortcut) beam is in
// flight, so you can see in your sightline that a screenshot is on its way to a host
// and that it landed. Presentational: the HUD window (src/hud.tsx) maps beam state +
// i18n into these strings.
import type React from "react";

import { FileThumb, Ic } from "@hostbeam/ui";
import { ShotThumb } from "@hostbeam/ui";

/** `partial` is its own state, not a shade of done or failed: some files are on
 *  the host and some are not, and both halves are true at once. */
export type BeamHudPhase = "uploading" | "landing" | "done" | "failed" | "partial";

export interface BeamHudProps {
  phase: BeamHudPhase;
  /** Primary line (e.g. "Beaming to prod-box…"). */
  title: string;
  /** Secondary line (filename in flight / "Copied to clipboard" / error detail). */
  sub?: string;
  /** Optional real screenshot preview; falls back to the faux-window placeholder. */
  thumb?: string | null;
  /** A file that is not a picture: its type label ("" for none) in a file
   *  glyph instead of the screenshot placeholder. Null for a picture. */
  fileLabel?: string | null;
  /** When set, the pill is clickable (used on failure → open the popover to recover). */
  onClick?: () => void;
  /** How far a multi-file beam has got. Absent for a single file — the lane
   *  keeps its indeterminate sweep, because "1 of 1" is not progress. */
  progress?: { sent: number; total: number } | null;
  /** The secondary line is the reminder (ADR 0028), drawn as the link it is. */
  remind?: boolean;
}

/** Which glyph, if any, closes the pill. A partial gets the warning mark rather
 *  than a tick or a cross — it is neither, and both would misreport it. */
const MARK: Partial<Record<BeamHudPhase, { name: string; cls: string }>> = {
  done: { name: "check", cls: "hud__ok" },
  failed: { name: "x", cls: "hud__err" },
  partial: { name: "alert-triangle", cls: "hud__warn" },
};

export function BeamHud({
  phase,
  title,
  sub,
  thumb,
  fileLabel,
  onClick,
  progress,
  remind = false,
}: BeamHudProps) {
  const inFlight = phase === "uploading" || phase === "landing";
  // Setting the variable is what switches the lane from a sweep to a real bar
  // (see hud.css) — so it is set only when there is something real to show.
  const lane =
    progress && progress.total > 1
      ? ({
          "--hud-progress": `${Math.round((progress.sent / progress.total) * 100)}%`,
        } as React.CSSProperties)
      : undefined;
  return (
    <div
      className="hud"
      data-phase={phase}
      data-clickable={onClick ? "" : undefined}
      role="status"
      aria-live="polite"
      onClick={onClick}
      style={lane}
    >
      {thumb ? (
        <img className="hud__thumb" src={thumb} alt="" />
      ) : fileLabel != null ? (
        <FileThumb label={fileLabel} />
      ) : (
        <ShotThumb />
      )}
      <div className="hud__body">
        <div className="hud__top">
          <span className="hud__title">{title}</span>
          {MARK[phase] && (
            <Ic name={MARK[phase]!.name} size={14} stroke={2.6} className={MARK[phase]!.cls} />
          )}
        </div>
        {sub && (
          <div
            className={
              "hud__sub" + (inFlight ? " hud__sub--mono" : "") + (remind ? " hud__sub--remind" : "")
            }
          >
            {remind ? (
              <>
                <span className="hud__sub-text">{sub}</span>
                <Ic name="arrow-right" size={10} stroke={2.4} style={{ flex: "none" }} />
              </>
            ) : (
              sub
            )}
          </div>
        )}
        <div className="hud__lane" aria-hidden="true">
          <span className="hud__beam" />
        </div>
      </div>
    </div>
  );
}

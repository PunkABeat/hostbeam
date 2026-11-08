import type React from "react";

import { BeamMark } from "@hostbeam/ui";

import { t } from "../../../i18n";

export interface BeamProgressProps {
  phase: "uploading" | "landing";
  hostName: string;
  /** A batch says how far it has got. One file has nothing to count. */
  progress: { sent: number; total: number } | null;
}

/** The beam in flight, and the moment it lands. */
export function BeamProgress({ phase, hostName, progress }: BeamProgressProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: "4px 0 2px",
      }}
    >
      <BeamMark size={58} state={phase} />
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--label)", whiteSpace: "nowrap" }}>
        {phase === "uploading"
          ? t("pop.beamingTo", { host: hostName })
          : t("pop.beamedTo", { host: hostName })}
      </div>
      {progress ? (
        <div
          style={{
            fontSize: 11,
            fontVariantNumeric: "tabular-nums",
            color: "var(--label-tertiary)",
          }}
          aria-live="polite"
        >
          {t("pop.nOfTotal", { n: progress.sent, total: progress.total })}
        </div>
      ) : null}
      <div
        style={{
          width: "100%",
          height: 4,
          borderRadius: 3,
          background: "var(--fill-tertiary)",
          overflow: "hidden",
        }}
      >
        <div
          className={"bm-bar" + (phase === "landing" ? " done" : "") + (progress ? " counted" : "")}
          style={
            progress
              ? ({
                  "--bm-progress": `${Math.round((progress.sent / progress.total) * 100)}%`,
                } as React.CSSProperties)
              : undefined
          }
        />
      </div>
    </div>
  );
}

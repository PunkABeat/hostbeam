import { Button, Ic, Spinner } from "@hostbeam/ui";

import { t } from "../../../i18n";
import { BEAM_ERRORS } from "../../../lib/beam-errors";
import type { Host } from "../../../types/config";
import type { DiagRow } from "../shared";
import { diagIcon } from "./diagIcon";

export interface FailedCardProps {
  /** The stable code Rust rejected with; the card and its recoveries follow it. */
  err: string;
  host: Host;
  folder: string;
  diag: DiagRow[] | "running" | null;
  onRetry: () => void;
  onRunDiagnostics: () => void;
}

/** Why the beam did not land, and what to do about it. */
export function FailedCard({
  err,
  host,
  folder,
  diag,
  onRetry,
  onRunDiagnostics,
}: FailedCardProps) {
  const e = BEAM_ERRORS[err] || BEAM_ERRORS.timeout;
  // A calm card (too many files at once) is not alarming — nothing failed.
  const accent = e.tone === "accent";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          background: accent ? "var(--accent-tint)" : "var(--danger-tint)",
          boxShadow: "inset 0 0 0 1px var(--separator)",
          borderRadius: "var(--radius-md)",
          padding: "10px 11px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
          <Ic
            name={e.icon}
            size={14}
            stroke={2.4}
            style={{ color: accent ? "var(--accent)" : "var(--danger)", flex: "none" }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--label)" }}>
            {e.title(host)}
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--label-secondary)",
            wordBreak: "break-word",
          }}
        >
          {e.detail(host, folder)}
        </div>
        {e.hint ? (
          <div
            style={{
              fontSize: 11.5,
              color: "var(--label-tertiary)",
              marginTop: 6,
              lineHeight: 1.45,
            }}
          >
            {e.hint()}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: 9 }}>
        {e.recover.includes("retry") ? (
          <Button
            variant="primary"
            size="md"
            block
            data-primary
            icon={<Ic name="rotate-cw" size={14} />}
            onClick={onRetry}
          >
            {t("pop.tryAgain")}
          </Button>
        ) : null}
        {e.recover.includes("folder") ? (
          <Button
            variant="secondary"
            size="md"
            block
            icon={<Ic name="folder" size={14} />}
            onClick={() => window.openPreferences?.("hosts")}
          >
            {t("pop.changeFolder")}
          </Button>
        ) : null}
      </div>
      {e.recover.includes("diag") ? (
        diag === null ? (
          <button
            onClick={onRunDiagnostics}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: "100%",
              height: 30,
              border: 0,
              cursor: "pointer",
              borderRadius: "var(--radius-md)",
              background: "transparent",
              color: "var(--label-secondary)",
              fontSize: 12,
              fontWeight: 500,
              fontFamily: "var(--font-system)",
              boxShadow: "inset 0 0 0 0.5px var(--separator)",
            }}
          >
            <Ic name="activity" size={14} /> {t("pop.runDiagnostics")}
          </button>
        ) : (
          <div
            style={{
              background: "var(--surface-content)",
              boxShadow: "inset 0 0 0 0.5px var(--separator)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}
          >
            {diag === "running" ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "11px 12px",
                }}
              >
                <Spinner size={14} />
                <span style={{ fontSize: 12, color: "var(--label-secondary)" }}>
                  {t("pop.runningChecks")}
                </span>
              </div>
            ) : (
              diag.map((r, i) => (
                <div
                  key={r.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "9px 12px",
                    borderTop: i ? "1px solid var(--separator)" : 0,
                  }}
                >
                  <span style={{ flex: "none", display: "inline-flex", width: 14 }}>
                    {diagIcon(r.status)}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: r.status === "skip" ? "var(--label-tertiary)" : "var(--label)",
                    }}
                  >
                    {r.label}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      color: "var(--label-tertiary)",
                      textAlign: "right",
                      maxWidth: 150,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.detail}
                  </span>
                </div>
              ))
            )}
          </div>
        )
      ) : null}
      {e.recover.includes("switch") ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            whiteSpace: "nowrap",
            color: "var(--label-tertiary)",
            fontSize: 11,
          }}
        >
          <Ic name="arrow-down" size={12} stroke={2.2} /> {t("pop.switchHostBelow")}
        </div>
      ) : null}
    </div>
  );
}

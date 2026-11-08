import React from "react";
import type { ReactNode } from "react";

import { Ic } from "@hostbeam/ui";
import { Button, Spinner } from "@hostbeam/ui";
import { HB } from "../../../lib/config";
import { diagnose, sshTarget } from "../../../lib/ipc";
import { t } from "../../../i18n";
import { type DiagCheck, type PrefHost } from "../shared";
import { Sheet } from "../components/Sheet";

/* --- Host diagnostics ------------------------------------------------ */
function DiagRow({
  label,
  status,
  detail,
  first,
}: {
  label?: ReactNode;
  status?: string;
  detail?: ReactNode;
  first?: boolean;
}) {
  const icon =
    status === "ok" ? (
      <Ic name="check" size={15} stroke={2.5} className="hb-fg-success" />
    ) : status === "fail" ? (
      <Ic name="x" size={15} stroke={2.5} className="hb-fg-danger" />
    ) : status === "warn" ? (
      <Ic name="alert-triangle" size={15} stroke={2.1} className="hb-fg-warning" />
    ) : (
      <Ic name="minus" size={15} stroke={2.2} className="hb-fg-quaternary" />
    );
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 13px",
        borderTop: first ? 0 : "1px solid var(--separator)",
      }}
    >
      <span style={{ flex: "none", display: "inline-flex", width: 16 }}>{icon}</span>
      <span
        style={{
          fontSize: 12.5,
          color: status === "skip" ? "var(--label-tertiary)" : "var(--label)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          marginLeft: "auto",
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
          color: "var(--label-tertiary)",
          textAlign: "right",
        }}
      >
        {detail}
      </span>
    </div>
  );
}
export function DiagnosticsSheet({
  host,
  onClose,
}: {
  host: PrefHost | null;
  onClose: () => void;
}) {
  const [rows, setRows] = React.useState<DiagCheck[] | null>(null);
  const run = React.useCallback(() => {
    setRows(null);
    if (!host) return;
    const folder = (HB.folderFor(host.id) || "/tmp/hostbeam").replace(/\/+$/, "");
    diagnose(sshTarget(host), folder)
      .then(setRows)
      .catch(() => setRows([{ label: t("diag.failed"), status: "fail", detail: "" }]));
    // Re-run only when the host id changes, not on host object-identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host && host.id]);
  React.useEffect(() => {
    run();
  }, [run]);
  const overall = rows
    ? rows.some((r) => r.status === "fail")
      ? "fail"
      : rows.some((r) => r.status === "warn")
        ? "warn"
        : "ok"
    : "run";
  const summary = {
    run: { c: "var(--label-secondary)", t: t("pop.runningChecks") },
    ok: { c: "var(--success)", t: t("prefs.diagAllPassed") },
    warn: { c: "var(--warning)", t: t("prefs.diagWarnings") },
    fail: { c: "var(--danger)", t: t("prefs.diagUnreachable") },
  }[overall];
  return (
    <Sheet
      title={t("prefs.diagTitle", { host: host ? (host.name ?? "") : "" })}
      onClose={onClose}
      width={400}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            {t("prefs.close")}
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={<Ic name="rotate-cw" size={13} />}
            disabled={!rows}
            onClick={run}
          >
            {t("prefs.runAgain")}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}>
        {overall === "run" ? (
          <Spinner size={16} />
        ) : (
          <Ic
            name={overall === "ok" ? "check-circle" : overall === "warn" ? "alert-triangle" : "x"}
            size={18}
            stroke={2.2}
            style={{ color: summary.c }}
          />
        )}
        <span style={{ fontSize: 13.5, fontWeight: 600, color: summary.c }}>{summary.t}</span>
        {host ? (
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              color: "var(--label-tertiary)",
            }}
          >
            {host.user}@{host.address}
          </span>
        ) : null}
      </div>
      <div
        style={{
          background: "var(--surface-content)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "inset 0 0 0 0.5px var(--separator)",
          overflow: "hidden",
        }}
      >
        {(
          rows || [
            { label: "SSH reachable" },
            { label: "Authentication" },
            { label: "Remote folder writable" },
            { label: "Round-trip latency" },
          ]
        ).map((r, i) => (
          <DiagRow
            key={r.label}
            first={i === 0}
            label={r.label}
            status={rows ? r.status : "run"}
            detail={rows ? r.detail : <Spinner size={12} />}
          />
        ))}
      </div>
    </Sheet>
  );
}

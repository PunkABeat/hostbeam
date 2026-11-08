import { Button } from "@hostbeam/ui";

import { t } from "../../../i18n";
import type { OpenForward } from "../../../lib/ipc";
import type { DevOpenError } from "../hooks/useDevServers";
import { SectionTitle } from "./SectionTitle";

export interface DevServerListProps {
  hostName: string;
  /** Ports worth a row, ascending. */
  rows: number[];
  /** The ones open on this Mac now. */
  forwards: OpenForward[];
  /** The port being opened, if one is. */
  opening: number | null;
  error: DevOpenError | null;
  onOpen: (port: number) => void;
  onStop: (port: number) => void;
}

/** What went wrong opening a port, in words. `dev_gone` and `dev_blocked` are
 *  dev_forward.rs's own codes; anything else is the connection. */
function errorText(code: string): string {
  if (code === "dev_gone") return t("pop.devGone");
  if (code === "dev_blocked") return t("pop.devBlocked");
  return t("pop.devFailed");
}

/** The agent's dev servers on the current host, each one click from this
 *  Mac's browser (ADR 0029). A row that is open says where, and can stop. */
export function DevServerList({
  hostName,
  rows,
  forwards,
  opening,
  error,
  onOpen,
  onStop,
}: DevServerListProps) {
  return (
    <div style={{ padding: "4px 10px 8px", borderTop: "1px solid var(--separator)" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "6px 4px 4px" }}>
        <SectionTitle>{t("pop.devTitle", { host: hostName })}</SectionTitle>
      </div>
      {rows.map((port) => {
        const open = forwards.find((f) => f.port === port);
        const busy = opening === port;
        return (
          <div key={port}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px" }}>
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  flex: "none",
                  background: open ? "var(--accent)" : "var(--label-quaternary)",
                }}
              />
              <span
                style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--label)" }}
              >
                :{port}
              </span>
              {open ? (
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--label-tertiary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {t("pop.devHere", {
                    addr: open.url.replace(/^http:\/\//, "").replace(/\/$/, ""),
                  })}
                </span>
              ) : null}
              <span style={{ marginLeft: "auto", display: "inline-flex", gap: 2 }}>
                {open ? (
                  <Button variant="ghost" size="sm" onClick={() => onStop(port)}>
                    {t("pop.devStop")}
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy || (opening !== null && !busy)}
                  onClick={() => onOpen(port)}
                  aria-label={t("pop.devOpenAria", { port: String(port), host: hostName })}
                >
                  {busy ? t("pop.devOpening") : t("pop.devOpen")}
                </Button>
              </span>
            </div>
            {error?.port === port ? (
              <div
                role="status"
                style={{ fontSize: 11, color: "var(--warning)", padding: "0 6px 4px 20px" }}
              >
                {errorText(error.code)}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

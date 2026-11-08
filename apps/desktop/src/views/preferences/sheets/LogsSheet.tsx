import React from "react";

import { Ic } from "@hostbeam/ui";
import { Button } from "@hostbeam/ui";
import { useCopied } from "../../../hooks/useCopied";
import { clearLogs, copyText, isTauri, openLogDir, readLogs } from "../../../lib/ipc";
import { t } from "../../../i18n";
import { Sheet } from "../components/Sheet";

/* Diagnostic logs viewer — read/copy/clear the last 7 days for support. */
export function LogsSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = React.useState(t("prefs.logsLoading"));
  const [copiedId, markCopied] = useCopied();
  const copied = copiedId === "logs";
  const load = React.useCallback(() => {
    if (!isTauri()) {
      setText(t("prefs.logsOnlyApp"));
      return;
    }
    readLogs()
      .then((s) => setText(s && s.trim() ? s : t("prefs.logsNone")))
      .catch((e) => setText(t("prefs.logsReadErr", { err: String(e) })));
  }, []);
  React.useEffect(() => {
    load();
  }, [load]);
  const copy = () => {
    copyText(text)
      .then(() => markCopied("logs"))
      .catch(() => {
        /* clipboard unavailable — best-effort */
      });
  };
  return (
    <Sheet
      title={t("prefs.logsTitle")}
      onClose={onClose}
      width={480}
      footer={
        <>
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              if (isTauri()) clearLogs().then(load, () => {});
            }}
          >
            {t("prefs.logsClear")}
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={<Ic name="folder" size={14} />}
            onClick={() => openLogDir()}
          >
            {t("prefs.logsOpenFolder")}
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<Ic name={copied ? "check" : "clipboard"} size={14} />}
            onClick={copy}
          >
            {copied ? t("prefs.logsCopied") : t("prefs.logsCopyAll")}
          </Button>
        </>
      }
    >
      <div
        style={{
          textAlign: "left",
          fontSize: 11.5,
          color: "var(--label-tertiary)",
          marginBottom: 9,
          lineHeight: 1.45,
        }}
      >
        {t("prefs.logsDesc")}
      </div>
      <pre
        style={{
          textAlign: "left",
          margin: 0,
          maxHeight: 340,
          overflow: "auto",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          lineHeight: 1.5,
          color: "var(--label)",
          background: "var(--surface-sunken)",
          borderRadius: "var(--radius-md)",
          padding: "10px 12px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          boxShadow: "inset 0 0 0 1px var(--separator)",
        }}
      >
        {text}
      </pre>
    </Sheet>
  );
}

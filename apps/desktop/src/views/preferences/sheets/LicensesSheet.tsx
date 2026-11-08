import React from "react";

import { openUrl } from "../../../lib/ipc";
import { t } from "../../../i18n";
import { Sheet } from "../components/Sheet";

/* Open source licenses — the notices the MIT and Apache-2.0 packages inside
   the binary require to ship with it. The list is src/generated/
   third-party-notices.json, written by scripts/third-party-notices.mjs from
   `cargo metadata` and the npm production tree, never by hand; the release
   script refuses a stale one. Loaded on open: 280-odd packages and nine
   licence texts are ~100 KB nobody needs until they ask. */
type Notices = {
  packages: {
    name: string;
    version: string;
    licenses: string[];
    url: string;
    copyright: string[];
    notice?: string;
  }[];
  licenses: Record<string, string>;
};

export function LicensesSheet({ onClose }: { onClose: () => void }) {
  const [notices, setNotices] = React.useState<Notices | null>(null);
  React.useEffect(() => {
    let live = true;
    import("../../../generated/third-party-notices.json").then((m) => {
      if (live) setNotices(m.default as Notices);
    });
    return () => {
      live = false;
    };
  }, []);
  // Through Rust's https-only open_url in the app; a new tab in browser dev.
  const open = (url: string) => openUrl(url);
  return (
    <Sheet title={t("prefs.openSource")} onClose={onClose} width={480}>
      <div
        style={{
          textAlign: "left",
          fontSize: 11.5,
          color: "var(--label-tertiary)",
          marginBottom: 9,
          lineHeight: 1.45,
        }}
      >
        {t("prefs.openSourceDesc")}
      </div>
      <div
        style={{
          textAlign: "left",
          maxHeight: 360,
          overflow: "auto",
          fontSize: 11.5,
          lineHeight: 1.5,
          color: "var(--label)",
          background: "var(--surface-sunken)",
          borderRadius: "var(--radius-md)",
          padding: "10px 12px",
          boxShadow: "inset 0 0 0 1px var(--separator)",
        }}
      >
        {notices ? (
          <>
            {notices.packages.map((p) => (
              <div key={`${p.name}@${p.version}`} style={{ marginBottom: 8 }}>
                <div>
                  <a
                    href={p.url}
                    onClick={(e) => {
                      e.preventDefault();
                      open(p.url);
                    }}
                    style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
                  >
                    {p.name}
                  </a>{" "}
                  <span style={{ color: "var(--label-secondary)" }}>
                    {p.version} · {p.licenses.join(" and ")}
                  </span>
                </div>
                {p.copyright.map((c) => (
                  <div key={c} style={{ color: "var(--label-secondary)" }}>
                    {c}
                  </div>
                ))}
                {p.notice ? (
                  <pre
                    style={{
                      margin: "4px 0 0",
                      whiteSpace: "pre-wrap",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      color: "var(--label-secondary)",
                    }}
                  >
                    {p.notice}
                  </pre>
                ) : null}
              </div>
            ))}
            <div
              style={{
                fontWeight: 600,
                margin: "14px 0 6px",
                paddingTop: 10,
                borderTop: "1px solid var(--separator)",
              }}
            >
              {t("prefs.openSourceTexts")}
            </div>
            {Object.entries(notices.licenses).map(([id, text]) => (
              <details key={id} style={{ marginBottom: 6 }}>
                <summary style={{ cursor: "pointer", fontWeight: 500 }}>{id}</summary>
                <pre
                  style={{
                    margin: "6px 0 0",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    color: "var(--label-secondary)",
                  }}
                >
                  {text}
                </pre>
              </details>
            ))}
          </>
        ) : (
          <span style={{ color: "var(--label-tertiary)" }}>{t("prefs.logsLoading")}</span>
        )}
      </div>
    </Sheet>
  );
}

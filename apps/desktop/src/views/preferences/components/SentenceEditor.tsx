import React from "react";

import { Ic } from "@hostbeam/ui";
import { Button, Switch } from "@hostbeam/ui";
import type { RecentBeam, Settings } from "../../../types/config";
import { t } from "../../../i18n";
import { DEFAULT_SENTENCE } from "../../../lib/sentence";
import { type SetSetting } from "../shared";
import { Group, Label, Row } from "./SettingsGroup";

/* --- Paste-ready sentence editor (live preview) ---------------------- */
export function SentenceEditor({
  s,
  set,
  recent,
}: {
  s: Settings;
  set: SetSetting;
  recent?: RecentBeam[];
}) {
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const tpl = s.sentence || "";
  const folder = (s.folder || "/tmp/hostbeam").replace(/\/+$/, "");
  // Prefer the path from the most recent real beam so the preview is concrete;
  // fall back to a representative example when nothing has been beamed yet.
  const last = (recent && recent[0]) || null;
  const example = last ? last.path : `${folder}/2025-06-14-15.30.22.png`;
  const hasPath = tpl.includes("{path}");
  const disabled = !s.copySentence;

  const insertPath = () => {
    const el = taRef.current;
    if (!el) {
      set("sentence", tpl + (tpl && !/\s$/.test(tpl) ? " " : "") + "{path}");
      return;
    }
    const a = el.selectionStart,
      b = el.selectionEnd;
    const next = tpl.slice(0, a) + "{path}" + tpl.slice(b);
    set("sentence", next);
    requestAnimationFrame(() => {
      el.focus();
      const p = a + 6;
      el.setSelectionRange(p, p);
    });
  };

  // preview: substitute {path} with the example path, highlighted
  const parts = tpl.split("{path}");
  const preview = parts.flatMap((p, i) =>
    i < parts.length - 1
      ? [
          p,
          <span key={"p" + i} className="hb-accent-strong">
            {example}
          </span>,
        ]
      : [p],
  );

  return (
    <Group
      title={t("prefs.sentenceTitle")}
      footnote={(() => {
        const p = t("prefs.sentenceFoot").split("{code}");
        return (
          <>
            {p[0]}
            <span className="hb-mono">{"{path}"}</span>
            {p[1] || ""}
          </>
        );
      })()}
    >
      <Row first>
        <Label title={t("prefs.copySentence")} sub={t("prefs.copySentenceSub")} />
        <span className="hb-push">
          <Switch checked={s.copySentence} onChange={(v) => set("copySentence", v)} />
        </span>
      </Row>
      <div
        style={{
          borderTop: "1px solid var(--separator)",
          padding: "12px 14px",
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? "none" : "auto",
          transition: "opacity var(--dur-fast) var(--ease-standard)",
        }}
      >
        <textarea
          ref={taRef}
          value={tpl}
          onChange={(e) => set("sentence", e.target.value)}
          rows={2}
          spellCheck={false}
          placeholder={DEFAULT_SENTENCE}
          style={{
            width: "100%",
            boxSizing: "border-box",
            resize: "none",
            border: 0,
            outline: "none",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-sunken)",
            boxShadow: "inset 0 0 0 1px var(--border-field)",
            padding: "8px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
            lineHeight: 1.55,
            color: "var(--label)",
          }}
          onFocus={(e) => {
            e.target.style.boxShadow = "inset 0 0 0 1px var(--accent), var(--ring-focus)";
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = "inset 0 0 0 1px var(--border-field)";
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 9 }}>
          <button
            onClick={insertPath}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              height: 24,
              padding: "0 9px 0 7px",
              border: 0,
              cursor: "pointer",
              borderRadius: "var(--radius-sm)",
              background: "var(--fill-secondary)",
              color: "var(--label-secondary)",
              fontSize: 11.5,
              fontWeight: 500,
            }}
          >
            <Ic name="plus" size={12} stroke={2.4} />
            <span className="hb-mono">{"{path}"}</span>
          </button>
          {!hasPath ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                color: "var(--warning)",
              }}
            >
              <Ic name="info" size={12} stroke={2.2} />{" "}
              {t("prefs.addPathHint").replace("{code}", "{path}")}
            </span>
          ) : null}
          <span className="hb-push">
            <Button variant="ghost" size="sm" onClick={() => set("sentence", DEFAULT_SENTENCE)}>
              {t("prefs.reset")}
            </Button>
          </span>
        </div>

        <div style={{ marginTop: 13 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: ".05em",
              color: "var(--label-tertiary)",
              marginBottom: 5,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{t("prefs.preview")}</span>
            {last ? (
              <span
                style={{
                  textTransform: "none",
                  letterSpacing: 0,
                  fontWeight: 500,
                  color: "var(--label-quaternary)",
                }}
              >
                {t("prefs.previewFromLast", { host: last.hostName ?? "" })}
              </span>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 9,
              background: "var(--accent-tint)",
              boxShadow: "inset 0 0 0 1px var(--separator)",
              borderRadius: "var(--radius-md)",
              padding: "10px 11px",
            }}
          >
            <Ic
              name="clipboard"
              size={14}
              stroke={2}
              style={{ color: "var(--accent)", flex: "none", marginTop: 1 }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.55,
                color: "var(--label)",
                wordBreak: "break-word",
              }}
            >
              {tpl.trim() ? (
                preview
              ) : (
                <span className="hb-fg-tertiary">{t("prefs.nothingCopied")}</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </Group>
  );
}

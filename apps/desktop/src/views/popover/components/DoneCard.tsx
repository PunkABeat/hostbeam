import { Button, Ic } from "@hostbeam/ui";

import { t } from "../../../i18n";
import { sentenceParts, templateFor } from "../../../lib/sentence";
import { WarningNote } from "./WarningNote";

export interface DoneCardProps {
  /** The paste-ready template; the path is highlighted where it sits in it. */
  sentence: string;
  copySentence: boolean;
  path: string;
  hostName: string;
  /** A partial's unsent files, and how many did land. */
  unsent: string[];
  landedCount: number;
  onBeamRest: () => void;
  /** This beam carries the reminder (ADR 0028): one line under the card that
   *  opens the license card. */
  remind?: boolean;
  onLicense?: () => void;
}

/** What went onto the clipboard, and — for a partial — what did not go. */
export function DoneCard({
  sentence,
  copySentence,
  path,
  hostName,
  unsent,
  landedCount,
  onBeamRest,
  remind = false,
  onLicense,
}: DoneCardProps) {
  // The template the clipboard really got for this path — "Use this file"
  // for a PDF under the default — so the card never shows a different line.
  const parts = sentenceParts(templateFor(sentence, path));
  const sentenceNodes = parts.flatMap((p, i) =>
    i < parts.length - 1
      ? [
          p,
          <span key={"x" + i} className="hb-accent-strong">
            {path}
          </span>,
        ]
      : [p],
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          background: "var(--accent-tint)",
          boxShadow: "inset 0 0 0 1px var(--separator)",
          borderRadius: "var(--radius-md)",
          padding: "10px 11px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <Ic name="clipboard" size={13} stroke={2.1} className="hb-fg-accent" />
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--label-secondary)" }}>
            {t("pop.copiedToClipboard")}
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            lineHeight: 1.55,
            color: "var(--label)",
            wordBreak: "break-word",
          }}
        >
          {copySentence ? sentenceNodes : <span className="hb-accent-strong">{path}</span>}
        </div>
      </div>

      {/* A partial. Not a failure card: what landed really landed, and its
          paths are above and on the clipboard. This says what is missing
          and offers to send exactly that — never the whole batch again,
          which would duplicate everything that already arrived. */}
      {unsent.length ? (
        <WarningNote
          title={t("pop.partialTitle", { host: hostName })}
          detail={t("pop.partialDetail", {
            n: landedCount,
            total: landedCount + unsent.length,
          })}
        >
          <Button
            variant="secondary"
            size="sm"
            block
            icon={<Ic name="rotate-cw" size={13} />}
            onClick={onBeamRest}
          >
            {t("pop.beamTheRest", { n: unsent.length })}
          </Button>
        </WarningNote>
      ) : null}

      {/* The reminder (ADR 0028): after the beam, never instead of it — one
          quiet line, and only now and then (src-tauri/src/licensing). */}
      {remind && onLicense ? (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onLicense();
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            fontSize: 11.5,
            fontWeight: 500,
            color: "var(--accent)",
            textDecoration: "none",
          }}
        >
          {t("pop.remind")}
          <Ic name="arrow-right" size={11} stroke={2.2} />
        </a>
      ) : null}
    </div>
  );
}

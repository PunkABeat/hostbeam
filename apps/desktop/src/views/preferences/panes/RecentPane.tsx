import { Ic } from "@hostbeam/ui";
import { FileThumb, ShotThumb } from "@hostbeam/ui";
import { useCopied } from "../../../hooks/useCopied";
import { extOf, isImagePath } from "../../../lib/files";
import { baseName, beamName, relTime } from "../../../lib/format";
import { copyText, revealRecent } from "../../../lib/ipc";
import { clipboardText } from "../../../lib/sentence";
import { thumbUrl } from "../../../lib/thumbs";
import type { RecentBeam } from "../../../types/config";
import { t } from "../../../i18n";
import { type Lightbox } from "../shared";

/* --- Recent beams: full history (the popover shows only the last few) --- */
export function RecentPane({
  recent,
  sentence,
  copySentence = false,
  onRemove,
  onClear,
  onEnlarge,
}: {
  recent?: RecentBeam[];
  sentence?: string;
  /** Whether a beam puts the sentence around the path; a copy gives the same. */
  copySentence?: boolean;
  onRemove: (id: string) => void;
  onClear: () => void;
  onEnlarge: (opts: Lightbox) => void;
}) {
  const [copiedId, markCopied] = useCopied();
  const [goneId, markGone] = useCopied(2200);
  const list = recent || [];
  const reveal = (e: RecentBeam) => {
    revealRecent([e.id])
      .then((shown) => {
        if (shown === 0) markGone(e.id);
      })
      .catch(() => {});
  };
  const copy = (e: RecentBeam) => {
    const text = clipboardText(sentence || "", copySentence, [e.path]);
    copyText(text).catch(() => {
      /* clipboard unavailable — best-effort */
    });
    markCopied(e.id);
  };

  if (!list.length) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "64px 20px",
          gap: 9,
        }}
      >
        <span
          style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            background: "var(--fill-secondary)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ic name="clock" size={22} className="hb-fg-tertiary" />
        </span>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--label)" }}>
          {t("prefs.nothingBeamed")}
        </div>
        <div
          style={{ fontSize: 12, color: "var(--label-secondary)", maxWidth: 260, lineHeight: 1.5 }}
        >
          {t("prefs.nothingBeamedSub")}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", margin: "0 2px 7px" }}>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: ".05em",
            color: "var(--label-tertiary)",
            whiteSpace: "nowrap",
          }}
        >
          {list.length === 1
            ? t("prefs.beamCountOne", { n: list.length })
            : t("prefs.beamCountMany", { n: list.length })}
        </span>
        <button
          onClick={onClear}
          style={{
            marginLeft: "auto",
            border: 0,
            background: "transparent",
            cursor: "pointer",
            color: "var(--accent)",
            fontSize: 12,
            fontWeight: 500,
            padding: 2,
          }}
        >
          {t("prefs.clearAll")}
        </button>
      </div>
      <div
        style={{
          background: "var(--surface-content)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "inset 0 0 0 0.5px var(--separator)",
          overflow: "hidden",
        }}
      >
        {list.map((e, i) => {
          const copied = copiedId === e.id;
          const file = baseName(e.path);
          const { head, tail } = beamName(file);
          return (
            <div
              key={e.id}
              className="pf-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 10px 10px 14px",
                borderTop: i ? "1px solid var(--separator)" : 0,
              }}
            >
              {e.thumb ? (
                <button
                  type="button"
                  className="pf-thumb"
                  onClick={() => onEnlarge({ src: thumbUrl(e.thumb), caption: baseName(e.path) })}
                  title={t("common.clickEnlarge")}
                  aria-label={`${t("common.clickEnlarge")} ${baseName(e.path)}`}
                  style={{
                    position: "relative",
                    width: 42,
                    height: 28,
                    flex: "none",
                    padding: 0,
                    border: 0,
                    borderRadius: 5,
                    cursor: "zoom-in",
                    background: "transparent",
                    display: "block",
                  }}
                >
                  <img
                    src={thumbUrl(e.thumb) ?? undefined}
                    width={42}
                    height={28}
                    alt=""
                    style={{
                      width: 42,
                      height: 28,
                      borderRadius: 5,
                      objectFit: "cover",
                      display: "block",
                      boxShadow: "inset 0 0 0 0.5px var(--separator)",
                    }}
                  />
                  <span
                    className="pf-thumb-zoom"
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(0,0,0,0.30)",
                    }}
                  >
                    <Ic name="search" size={12} stroke={2.4} className="hb-fg-white" />
                  </span>
                </button>
              ) : isImagePath(e.path) ? (
                // A picture with no preview (HEIC): the picture placeholder.
                <ShotThumb w={42} h={28} />
              ) : (
                <FileThumb w={42} h={28} label={extOf(e.path)} />
              )}
              <div
                style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}
              >
                {/* Wide enough to show the whole remote name, so it does — but
                    the `hostbeam-<stamp>-` half is dimmed and gives up its space
                    first (the lopsided shrink factors), so what survives a narrow
                    window is the name the file arrived with. */}
                <span
                  title={file}
                  style={{
                    display: "flex",
                    minWidth: 0,
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                  }}
                >
                  {head ? (
                    <span
                      style={{
                        flex: "0 999 auto",
                        minWidth: 0,
                        color: "var(--label-tertiary)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {head}
                    </span>
                  ) : null}
                  <span
                    style={{
                      flex: "0 1 auto",
                      minWidth: 0,
                      color: "var(--label)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {tail}
                  </span>
                </span>
                {goneId === e.id ? (
                  <span style={{ fontSize: 11, color: "var(--warning)" }}>{t("pop.fileGone")}</span>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--label-tertiary)" }}>
                    {e.hostName} · {relTime(e.at)}
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  marginLeft: "auto",
                  flex: "none",
                }}
              >
                {e.local ? (
                  <button
                    onClick={() => reveal(e)}
                    title={t("pop.showInFinder")}
                    aria-label={`${t("pop.showInFinder")} — ${baseName(e.path)}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      border: 0,
                      cursor: "pointer",
                      borderRadius: "var(--radius-md)",
                      background: "transparent",
                      color: "var(--label-tertiary)",
                    }}
                  >
                    <Ic name="folder" size={15} stroke={2} />
                  </button>
                ) : null}
                <button
                  onClick={() => copy(e)}
                  title={t("prefs.copySentenceAria")}
                  aria-label={`${t("prefs.copySentenceAria")} — ${baseName(e.path)}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    border: 0,
                    cursor: "pointer",
                    borderRadius: "var(--radius-md)",
                    background: "transparent",
                    color: copied ? "var(--success)" : "var(--label-tertiary)",
                  }}
                >
                  <Ic name={copied ? "check" : "clipboard"} size={15} stroke={copied ? 2.6 : 2} />
                </button>
                <button
                  onClick={() => onRemove(e.id)}
                  title={t("prefs.removeHistory")}
                  aria-label={`${t("prefs.removeHistory")} — ${baseName(e.path)}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    border: 0,
                    cursor: "pointer",
                    borderRadius: "var(--radius-md)",
                    background: "transparent",
                    color: "var(--label-tertiary)",
                  }}
                >
                  <Ic name="x" size={14} stroke={2.2} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--label-tertiary)",
          margin: "7px 2px 0",
          lineHeight: 1.45,
        }}
      >
        {list.length === 1
          ? t("prefs.recentFootOne")
          : t("prefs.recentFootMany", { n: list.length })}
      </div>
    </div>
  );
}

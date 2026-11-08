import { FileThumb, Ic, ShotThumb } from "@hostbeam/ui";

import { t } from "../../../i18n";
import { fileLabel, isImagePath } from "../../../lib/files";
import { baseName, beamName, relTime } from "../../../lib/format";
import { countFiles, type RecentGroup } from "../../../lib/recent";
import { thumbUrl } from "../../../lib/thumbs";
import type { RecentBeam } from "../../../types/config";
import type { LightboxOpts } from "../hooks/useLightbox";
import { SectionTitle } from "./SectionTitle";

export interface RecentListProps {
  groups: RecentGroup[];
  copiedId: string | null;
  onCopy: (entry: RecentBeam, paths: string[]) => void;
  /** Show a gesture's source files in Finder; only rows that came from a file
   *  have the button. */
  onReveal: (rows: RecentBeam[]) => void;
  /** The row whose files were moved or deleted since, for a moment. */
  goneId: string | null;
  onClear: () => void;
  onEnlarge: (opts: LightboxOpts) => void;
  onShowAll: () => void;
}

/** The last few beams, one row per gesture; a drop reads as one thing. */
export function RecentList({
  groups,
  copiedId,
  onCopy,
  onReveal,
  goneId,
  onClear,
  onEnlarge,
  onShowAll,
}: RecentListProps) {
  return (
    <div style={{ padding: "4px 10px 8px", borderTop: "1px solid var(--separator)" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "6px 4px 4px" }}>
        <SectionTitle>{t("pop.recent")}</SectionTitle>
        <button
          onClick={onClear}
          style={{
            marginLeft: "auto",
            border: 0,
            background: "transparent",
            cursor: "pointer",
            fontSize: 11,
            color: "var(--label-tertiary)",
            padding: "2px 4px",
            borderRadius: "var(--radius-xs)",
          }}
        >
          {t("pop.clear")}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {groups.slice(0, 3).map((g) => {
          const e = g.rows[0];
          const n = g.rows.length;
          const paths = g.rows.map((r) => r.path);
          const copied = copiedId === e.id;
          // One drop reads as one thing: the first thumbnail with a count on
          // it, and the count instead of a file name — three names cannot
          // fit here, and picking one of them to show would be arbitrary.
          // "3 screenshots" only when they are; a drop with a PDF in it is "3 files".
          const label =
            n > 1
              ? paths.every(isImagePath)
                ? t("pop.nFiles", { n })
                : t("pop.nFilesAny", { n })
              : beamName(baseName(e.path)).tail;
          return (
            <div
              key={e.id}
              className="pv-recent"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 6px",
                borderRadius: "var(--radius-md)",
              }}
            >
              {e.thumb ? (
                <button
                  type="button"
                  className="pv-thumb"
                  onClick={() =>
                    onEnlarge(
                      n > 1
                        ? {
                            // Only the rows that actually kept a picture; a
                            // thumbnail-less row would open a blank frame.
                            gallery: g.rows
                              .filter((r) => r.thumb)
                              .map((r) => ({
                                src: thumbUrl(r.thumb) as string,
                                caption: baseName(r.path),
                              })),
                          }
                        : { src: thumbUrl(e.thumb) as string, caption: baseName(e.path) },
                    )
                  }
                  title={t("common.clickEnlarge")}
                  aria-label={n > 1 ? `Enlarge ${n} screenshots` : `Enlarge ${baseName(e.path)}`}
                  style={{
                    position: "relative",
                    width: 38,
                    height: 26,
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
                    width={38}
                    height={26}
                    alt=""
                    style={{
                      width: 38,
                      height: 26,
                      borderRadius: 5,
                      objectFit: "cover",
                      display: "block",
                      boxShadow: "inset 0 0 0 0.5px var(--separator)",
                    }}
                  />
                  <span
                    className="pv-thumb-zoom"
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
                    <Ic name="search" size={11} stroke={2.4} className="hb-fg-white" />
                  </span>
                  {n > 1 ? (
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        right: -3,
                        bottom: -3,
                        minWidth: 13,
                        height: 13,
                        padding: "0 3px",
                        borderRadius: 7,
                        background: "var(--accent)",
                        color: "#fff",
                        fontSize: 9,
                        fontWeight: 700,
                        lineHeight: "13px",
                        textAlign: "center",
                        boxShadow: "0 0 0 1.5px var(--surface-content)",
                      }}
                    >
                      {n}
                    </span>
                  ) : null}
                </button>
              ) : isImagePath(e.path) ? (
                // A picture with no preview (HEIC): the picture placeholder.
                <ShotThumb w={38} h={26} />
              ) : (
                <FileThumb w={38} h={26} label={fileLabel(paths)} />
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <span
                  title={n > 1 ? paths.map(baseName).join("\n") : baseName(e.path)}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--label)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {/* The name a dropped file arrived with, not the stamp in
                      front of it — the row already says how long ago, so the
                      stamp would spend the width twice. Clipboard beams have
                      no original name and show the whole thing. */}
                  {label}
                </span>
                {goneId === e.id ? (
                  <span style={{ fontSize: 10.5, color: "var(--warning)" }}>
                    {t("pop.fileGone")}
                  </span>
                ) : (
                  <span style={{ fontSize: 10.5, color: "var(--label-tertiary)" }}>
                    {e.hostName} · {relTime(e.at)}
                  </span>
                )}
              </div>
              {/* Only a beam that came from a file on this Mac has one to show:
                  a clipboard picture never was a file. */}
              {g.rows.some((r) => r.local) ? (
                <button
                  onClick={() => onReveal(g.rows)}
                  title={t("pop.showInFinder")}
                  aria-label={`${t("pop.showInFinder")} — ${baseName(e.path)}`}
                  style={{
                    flex: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 26,
                    height: 26,
                    border: 0,
                    cursor: "pointer",
                    borderRadius: "var(--radius-sm)",
                    background: "transparent",
                    color: "var(--label-tertiary)",
                  }}
                >
                  <Ic name="folder" size={14} stroke={2} />
                </button>
              ) : null}
              <button
                onClick={() => onCopy(e, paths)}
                title={t("prefs.copySentenceAria")}
                aria-label={
                  n > 1
                    ? `Copy paste-ready sentences for ${n} files`
                    : `Copy paste-ready sentence for ${baseName(e.path)}`
                }
                style={{
                  flex: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  border: 0,
                  cursor: "pointer",
                  borderRadius: "var(--radius-sm)",
                  background: "transparent",
                  color: copied ? "var(--success)" : "var(--label-tertiary)",
                }}
              >
                <Ic name={copied ? "check" : "clipboard"} size={14} stroke={copied ? 2.6 : 2} />
              </button>
            </div>
          );
        })}
      </div>
      {groups.length > 3 ? (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onShowAll();
          }}
          className="pv-morelink"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            textDecoration: "none",
            padding: "7px 4px 3px",
            fontSize: 11,
            color: "var(--label-tertiary)",
          }}
        >
          {t("pop.moreInPrefs", { n: countFiles(groups.slice(3)) })}
        </a>
      ) : null}
    </div>
  );
}

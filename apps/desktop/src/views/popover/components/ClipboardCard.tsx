import { Badge, FileThumb, Ic, ShotThumb, Spinner } from "@hostbeam/ui";

import { t } from "../../../i18n";
import { fileLabel, isImagePath } from "../../../lib/files";
import { baseName } from "../../../lib/format";

export interface ClipboardCardProps {
  /** Still reading the clipboard. */
  checking: boolean;
  /** Read, and nothing beamable on it. */
  empty: boolean;
  /** A beam is in flight or just done — the card names the file, not the clipboard. */
  beamed: boolean;
  hasImage: boolean;
  /** "PNG · w × h" while an image is on the clipboard. */
  dims: string | null;
  /** The picture to show, when there is one. */
  thumb: string | null;
  /** The remote path once beamed. */
  path: string;
  /** Files the card is about instead of a picture — local paths, either named
   *  on the clipboard by a copy in Finder or carried by the beam in hand. */
  files: string[];
  /** Whether `files` are on the clipboard, rather than dropped or opened. */
  filesOnClipboard: boolean;
  /** No status badge: a card below is saying what state this is in. */
  quiet?: boolean;
  onEnlarge: () => void;
}

/** What is on the clipboard, or what just left it. */
export function ClipboardCard({
  checking,
  empty,
  beamed,
  hasImage,
  dims,
  thumb,
  path,
  files,
  filesOnClipboard,
  quiet,
  onEnlarge,
}: ClipboardCardProps) {
  const names = files.map((f) => baseName(f));
  // A file that is not a picture shows as one: a picture's placeholder would
  // say "screenshot" about a PDF.
  const fileThumb = files.length > 0 && !files.every((f) => isImagePath(f));
  const title = checking
    ? t("pop.checking")
    : empty
      ? t("pop.noClipboard")
      : files.length
        ? filesOnClipboard
          ? files.length === 1
            ? t("pop.fileOnClipboard")
            : t("pop.filesOnClipboard", { n: files.length })
          : files.length === 1
            ? t("pop.oneFile")
            : t("pop.nFilesAny", { n: files.length })
        : t("pop.onClipboard");
  const detail = checking
    ? t("pop.readingClipboard")
    : empty
      ? t("pop.copyThenBeam")
      : beamed
        ? baseName(path)
        : files.length
          ? names.join(", ")
          : dims || t("pop.pngImage");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "12px 13px",
        background: "var(--surface-content)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "inset 0 0 0 0.5px var(--separator)",
      }}
    >
      {!hasImage && !files.length ? (
        <span
          style={{
            width: 44,
            height: 30,
            borderRadius: 6,
            flex: "none",
            background: "var(--fill-secondary)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ic name="clipboard" size={16} stroke={2} className="hb-fg-tertiary" />
        </span>
      ) : thumb ? (
        <button
          type="button"
          className="pv-thumb"
          onClick={onEnlarge}
          title={t("common.clickEnlarge")}
          aria-label={t("pop.enlargeClipboard")}
          style={{
            position: "relative",
            width: 44,
            height: 30,
            flex: "none",
            padding: 0,
            border: 0,
            borderRadius: 6,
            cursor: "zoom-in",
            background: "transparent",
            display: "block",
          }}
        >
          <img
            src={thumb}
            width={44}
            height={30}
            alt=""
            style={{
              width: 44,
              height: 30,
              borderRadius: 6,
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
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.30)",
            }}
          >
            <Ic name="search" size={13} stroke={2.4} className="hb-fg-white" />
          </span>
        </button>
      ) : fileThumb ? (
        <FileThumb label={fileLabel(files)} />
      ) : (
        <ShotThumb />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: "var(--label)",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--label-tertiary)",
            fontFamily: empty || checking ? "var(--font-system)" : "var(--font-mono)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {detail}
        </span>
      </div>
      <span className="hb-push">
        {checking ? (
          <Spinner size={14} />
        ) : empty || quiet ? null : (
          <Badge tone={beamed ? "accent" : "success"} dot>
            {beamed ? t("common.beamed") : t("common.ready")}
          </Badge>
        )}
      </span>
    </div>
  );
}

// A file that is not a picture, where a screenshot would have its thumbnail:
// a document glyph and the file's type (PDF, CSV…) — the same footprint as
// ShotThumb, so a row or card does not change shape with what it carries.
import { Ic } from "./Icon";

export interface FileThumbProps {
  /** A short type label — an extension, upper-cased and cut to fit. "FILE"
   *  when there is none. */
  label?: string | null;
  w?: number;
  h?: number;
}

export function FileThumb({ label, w = 44, h = 30 }: FileThumbProps) {
  const text = (label || "FILE").toUpperCase().slice(0, 4);
  return (
    <span
      aria-hidden="true"
      style={{
        width: w,
        height: h,
        borderRadius: "var(--radius-sm)",
        flex: "none",
        background: "var(--fill-secondary)",
        boxShadow: "inset 0 0 0 0.5px var(--separator)",
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        color: "var(--label-secondary)",
        overflow: "hidden",
      }}
    >
      <Ic name="file" size={Math.round(h * 0.42)} stroke={2} />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: Math.max(7, Math.round(h * 0.26)),
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: 0.2,
        }}
      >
        {text}
      </span>
    </span>
  );
}

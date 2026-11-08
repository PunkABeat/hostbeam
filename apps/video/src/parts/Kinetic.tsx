// Kinetic type: each word rises out of its own mask, a few frames after the
// last, and the word that carries the line is set in the beam's blue.
import type { CSSProperties } from "react";
import { useCurrentFrame } from "remotion";
import { C, LAYOUT, SANS, progress } from "../lib";

const ACCENT: CSSProperties = {
  backgroundImage: `linear-gradient(100deg, ${C.beamLight}, ${C.beam})`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

export function Words({
  text,
  start = 0,
  stagger = 3,
  dur = 26,
  accent = [],
  shown = false,
  style,
}: {
  text: string;
  start?: number;
  stagger?: number;
  dur?: number;
  /** Words (without punctuation) to set in the accent gradient. */
  accent?: string[];
  /** Already on screen: no reveal, just there from the first frame. */
  shown?: boolean;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  return (
    <span style={{ display: "inline", ...style }}>
      {words.map((w, i) => {
        const p = shown ? 1 : progress(frame, start + i * stagger, dur);
        const hot = accent.includes(w.replace(/[^\p{L}\p{N}]/gu, ""));
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              overflow: "hidden",
              verticalAlign: "top",
              padding: "0 0.02em 0.14em",
              marginRight: i < words.length - 1 ? "0.24em" : 0,
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - p) * 110}%)`,
                ...(hot ? ACCENT : null),
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** A scene's headline, top left, with an optional line under it that arrives later. */
export function Caption({
  text,
  accent,
  sub,
  start = 0,
  subStart,
  shown,
  style,
}: {
  text: string;
  accent?: string[];
  sub?: string;
  start?: number;
  subStart?: number;
  shown?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div style={{ position: "absolute", left: LAYOUT.captionLeft, top: LAYOUT.captionTop, fontFamily: SANS, ...style }}>
      <div style={{ fontSize: 80, fontWeight: 680, letterSpacing: "-0.035em", lineHeight: 1.04, color: C.ink }}>
        <Words text={text} start={start} accent={accent} shown={shown} />
      </div>
      {sub ? (
        <div style={{ marginTop: 14, fontSize: 32, fontWeight: 450, color: C.inkSoft, letterSpacing: "-0.01em" }}>
          <Words text={sub} start={subStart ?? start + 30} stagger={2} dur={22} />
        </div>
      ) : null}
    </div>
  );
}

/** "YOUR SERVER", "YOUR MAC": a small label over a device. */
export function DeviceLabel({ text, start, style }: { text: string; start: number; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const p = progress(frame, start, 20);
  return (
    <div
      style={{
        position: "absolute",
        fontFamily: SANS,
        fontSize: 17,
        fontWeight: 600,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: C.inkFaint,
        display: "flex",
        alignItems: "center",
        gap: 10,
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
        ...style,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 4, background: C.beam, boxShadow: `0 0 12px ${C.beam}` }} />
      {text}
    </div>
  );
}

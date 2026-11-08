// The film's building blocks that are not Hostbeam's own UI: a terminal on the
// server, the captions, the macOS menu bar, keys being pressed, the pointer,
// and the small web app the agent is fixing.
import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { C, MONO, SANS, caretOn, progress } from "../lib";

export function Terminal({
  title,
  children,
  style,
  fontSize = 22,
}: {
  title: string;
  children: ReactNode;
  style?: CSSProperties;
  fontSize?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        background: C.termBg,
        border: `1px solid ${C.termBorder}`,
        borderRadius: 16,
        boxShadow: "0 30px 80px rgba(0,0,0,.45)",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          height: 44,
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "0 16px",
          borderBottom: `1px solid ${C.termBorder}`,
          background: "#101c30",
        }}
      >
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
        ))}
        <span
          style={{
            flex: 1,
            textAlign: "center",
            fontFamily: SANS,
            fontSize: 16,
            color: C.inkFaint,
            marginRight: 60,
          }}
        >
          {title}
        </span>
      </div>
      <div
        style={{
          padding: "22px 28px",
          fontFamily: MONO,
          fontSize,
          lineHeight: 1.75,
          color: "#dfe8f6",
          whiteSpace: "pre-wrap",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function Caret() {
  const frame = useCurrentFrame();
  return (
    <span
      style={{
        display: "inline-block",
        width: "0.55em",
        height: "1.05em",
        verticalAlign: "-0.18em",
        background: caretOn(frame) ? C.beamLight : "transparent",
        marginLeft: 2,
      }}
    />
  );
}

/** The macOS menu bar, with Hostbeam's glyph pulsing while a beam is in flight. */
export function MenuBar({ beaming = false, enter = 1 }: { beaming?: boolean; enter?: number }) {
  const frame = useCurrentFrame();
  const pulse = beaming ? 0.55 + 0.45 * Math.abs(Math.sin(frame / 4)) : 1;
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 46,
        display: "flex",
        alignItems: "center",
        gap: 26,
        padding: "0 28px",
        background: "rgba(16, 28, 48, .82)",
        borderBottom: "1px solid rgba(255,255,255,.06)",
        transform: `translateY(${(1 - enter) * -50}px)`,
        opacity: enter,
        fontFamily: SANS,
        fontSize: 17,
        color: C.ink,
      }}
    >
      <span style={{ fontWeight: 650 }}>Terminal</span>
      <span style={{ opacity: 0.7 }}>Shell</span>
      <span style={{ opacity: 0.7 }}>View</span>
      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 22 }}>
        <span
          style={{
            display: "inline-flex",
            padding: 5,
            borderRadius: 6,
            background: beaming ? "rgba(255,255,255,.14)" : "transparent",
            opacity: pulse,
          }}
        >
          <Img src={staticFile("hostbeam-menubar.svg")} style={{ width: 22, height: 22, filter: "invert(1)" }} />
        </span>
        <span style={{ opacity: 0.85 }}>Mon 15:30</span>
      </span>
    </div>
  );
}

/** Keys pressed in the middle of the frame, each one dipping as it is hit. */
export function Keys({ keys, start, hold = 60 }: { keys: string[]; start: number; hold?: number }) {
  const frame = useCurrentFrame();
  const shown = progress(frame, start, 12) * (1 - progress(frame, start + hold, 12));
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 450,
        display: "flex",
        justifyContent: "center",
        gap: 18,
        opacity: shown,
      }}
    >
      {keys.map((k, i) => {
        const hit = progress(frame, start + 16 + i * 5, 5) - progress(frame, start + 34 + i * 3, 8);
        return (
          <span
            key={k}
            style={{
              minWidth: 104,
              height: 104,
              padding: "0 24px",
              borderRadius: 22,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: SANS,
              fontSize: 50,
              fontWeight: 600,
              color: C.ink,
              background: "linear-gradient(#25344f, #1a2740)",
              boxShadow: `0 ${8 - hit * 6}px 0 #0b1322, 0 18px 40px rgba(0,0,0,.4)`,
              transform: `translateY(${hit * 6}px)`,
              border: "1px solid rgba(255,255,255,.1)",
            }}
          >
            {k}
          </span>
        );
      })}
    </div>
  );
}

/** The macOS pointer, gliding between points [frame, x, y]. */
export function Pointer({ path, clickAt }: { path: [number, number, number][]; clickAt?: number }) {
  const frame = useCurrentFrame();
  const ring = clickAt === undefined ? 0 : progress(frame, clickAt, 16);
  const pressed = clickAt !== undefined && frame >= clickAt && frame < clickAt + 5;
  let x = path[0][1];
  let y = path[0][2];
  for (let i = 1; i < path.length; i++) {
    const [f0, x0, y0] = path[i - 1];
    const [f1, x1, y1] = path[i];
    if (frame >= f0) {
      const p = progress(frame, f0, Math.max(1, f1 - f0));
      x = x0 + (x1 - x0) * p;
      y = y0 + (y1 - y0) * p;
    }
  }
  return (
    <>
      {ring > 0 && ring < 1 ? (
        <div
          style={{
            position: "absolute",
            left: x - 28 * ring + 6,
            top: y - 28 * ring + 4,
            width: 56 * ring,
            height: 56 * ring,
            borderRadius: "50%",
            border: `3px solid rgba(127,176,255,${1 - ring})`,
          }}
        />
      ) : null}
      <svg
        width="34"
        height="34"
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          left: x,
          top: y,
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,.5))",
          transform: pressed ? "scale(0.85)" : "none",
          transformOrigin: "top left",
        }}
      >
        <path d="M4 2 L4 19 L8.5 15 L11.5 21.5 L14.5 20.2 L11.6 13.8 L17.5 13.8 Z" fill="#fff" stroke="#000" strokeWidth="1.1" />
      </svg>
    </>
  );
}

/** A phone-sized login page: the bug the agent is shown, or the page it fixed. */
export function LoginMock({ broken, scale = 1 }: { broken: boolean; scale?: number }) {
  const field: CSSProperties = {
    height: 44,
    borderRadius: 10,
    border: "1px solid #d7deea",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    padding: "0 14px",
    fontSize: 15,
    color: "#8a96aa",
  };
  return (
    <div
      style={{
        width: 330,
        height: 560,
        background: "#f4f7fb",
        fontFamily: SANS,
        padding: "64px 26px",
        boxSizing: "border-box",
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color: "#17213a" }}>Sign in</div>
      <div style={{ fontSize: 15, color: "#66738c", marginTop: 6 }}>Welcome back to Acme.</div>
      <div style={{ ...field, marginTop: 30 }}>you@example.com</div>
      <div style={{ ...field, marginTop: 12 }}>••••••••</div>
      <div
        style={{
          marginTop: broken ? -34 : 18,
          marginLeft: broken ? 40 : 0,
          height: 46,
          borderRadius: 10,
          background: "#3a6df0",
          color: "#fff",
          fontSize: 16,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: broken ? "0 0 0 3px rgba(240,80,80,.0)" : "none",
        }}
      >
        Sign in
      </div>
    </div>
  );
}

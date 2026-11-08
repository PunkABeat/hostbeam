// The iPhone (a screenshot in Photos, the share sheet, Hostbeam's confirmation)
// and the Mac browser window that shows the agent's dev server.
import type { ReactNode } from "react";
import { Img, staticFile } from "remotion";
import { C, MONO, SANS } from "../lib";
import { LoginMock } from "./Basics";
import { BeamMarkFrame } from "./Popover";

const SHEET_APPS: { name: string; bg: string; mark?: boolean }[] = [
  { name: "Messages", bg: "linear-gradient(#5df07a,#20c53f)" },
  { name: "Mail", bg: "linear-gradient(#5bb4ff,#1f7cf2)" },
  { name: "Hostbeam", bg: "linear-gradient(#5A95FF,#2A66EC)", mark: true },
  { name: "Notes", bg: "linear-gradient(#ffe36b,#f5c400)" },
];

/**
 * sheet: 0 hidden → 1 fully up. tapped: the Hostbeam icon is pressed.
 * landed: frames since the beam landed, or null before it does.
 */
export function Phone({
  sheet,
  tapped,
  landed,
  style,
}: {
  sheet: number;
  tapped: boolean;
  landed: number | null;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        width: 380,
        height: 780,
        borderRadius: 58,
        background: "#0b0d12",
        padding: 14,
        boxShadow: "0 40px 90px rgba(0,0,0,.55), inset 0 0 0 2px #2a2f3a",
        ...style,
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 46, overflow: "hidden", background: "#f4f7fb" }}>
        <div style={{ position: "absolute", top: 12, left: "50%", marginLeft: -60, width: 120, height: 34, borderRadius: 17, background: "#000", zIndex: 5 }} />
        <div style={{ position: "absolute", top: 40, left: 10 }}>
          <LoginMock broken scale={1.0} />
        </div>

        {/* the share sheet */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 300,
            transform: `translateY(${(1 - sheet) * 320}px)`,
            background: "rgba(242,242,247,.97)",
            borderRadius: "24px 24px 0 0",
            boxShadow: "0 -10px 30px rgba(0,0,0,.18)",
            fontFamily: SANS,
            padding: "22px 18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
            <div style={{ width: 46, height: 46, borderRadius: 10, overflow: "hidden", border: "1px solid #d6dbe4" }}>
              <div style={{ transform: "scale(0.14)", transformOrigin: "top left" }}>
                <LoginMock broken />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>Screenshot</div>
              <div style={{ fontSize: 13, color: "#777" }}>PNG · 1.2 MB</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {SHEET_APPS.map((a) => (
              <div key={a.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 72 }}>
                <div
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 15,
                    background: a.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: a.mark && tapped ? "scale(0.9)" : "none",
                    boxShadow: a.mark && tapped ? "0 0 0 4px rgba(58,123,255,.35)" : "none",
                  }}
                >
                  {a.mark ? <Img src={staticFile("hostbeam-mark.svg")} style={{ width: 62, height: 62, borderRadius: 15 }} /> : null}
                </div>
                <span style={{ fontSize: 12, color: "#333" }}>{a.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hostbeam's confirmation */}
        {landed !== null ? (
          <div
            style={{
              position: "absolute",
              left: 30,
              right: 30,
              top: 280,
              padding: "26px 20px",
              borderRadius: 26,
              background: "rgba(255,255,255,.97)",
              boxShadow: "0 20px 50px rgba(0,0,0,.25)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              fontFamily: SANS,
              opacity: Math.min(1, landed / 6),
            }}
          >
            <BeamMarkFrame size={64} mode="landing" t={landed} />
            {/* ShareStatusView's .done state, word for word. */}
            <div style={{ alignSelf: "stretch", background: "rgba(58,123,255,.1)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.beam }}>✓ Copied — paste it to your agent.</div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#222", fontFamily: MONO, wordBreak: "break-all" }}>
                /tmp/hostbeam/hostbeam-1790993042117.png
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Browser({ url, children, style }: { url: string; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        width: 760,
        height: 640,
        borderRadius: 16,
        overflow: "hidden",
        background: "#f4f7fb",
        boxShadow: "0 40px 90px rgba(0,0,0,.55)",
        border: "1px solid rgba(255,255,255,.12)",
        ...style,
      }}
    >
      <div style={{ height: 52, background: "#e9edf3", display: "flex", alignItems: "center", gap: 9, padding: "0 16px", borderBottom: "1px solid #d4dae4" }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
        ))}
        <div
          style={{
            marginLeft: 70,
            flex: 1,
            maxWidth: 440,
            height: 32,
            borderRadius: 9,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: SANS,
            fontSize: 15,
            color: C.ground,
          }}
        >
          {url}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

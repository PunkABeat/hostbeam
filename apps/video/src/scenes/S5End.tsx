// The end card: the mark builds itself (the beam's bars, then the node), the
// name, the three lines of the message one by one, the promise, the address.
import { AbsoluteFill, spring, useCurrentFrame } from "remotion";
import { C, FPS, SANS, progress, rise, usePace } from "../lib";
import { Words } from "../parts/Kinetic";
import { BeamMarkFrame } from "../parts/Popover";

export const S5_LENGTH = 260;

export function S5End() {
  const frame = useCurrentFrame();
  const p = usePace();
  const mark = spring({ frame: frame - 4, fps: FPS, config: { damping: 12, stiffness: 120 } });
  const glow = progress(frame, p(30), 40);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: SANS, opacity: progress(frame, 0, 14) }}>
      <div
        style={{
          transform: `scale(${0.6 + 0.4 * mark})`,
          opacity: Math.min(1, mark * 1.6),
          filter: `drop-shadow(0 0 ${60 * glow}px rgba(58,123,255,.45))`,
        }}
      >
        <BeamMarkFrame size={150} mode={frame < p(30) ? "uploading" : "landing"} t={frame < p(30) ? frame : frame - p(30)} />
      </div>
      <div style={{ marginTop: 28, fontSize: 96, fontWeight: 700, letterSpacing: "-0.04em", color: C.ink, ...rise(frame, p(22), 26, 24) }}>
        Hostbeam
      </div>
      <div style={{ marginTop: 16, fontSize: 42, fontWeight: 560, letterSpacing: "-0.02em", color: C.ink }}>
        <Words text="Agent on a server?" start={p(48)} accent={["server"]} />
        <span style={{ display: "inline-block", width: 20 }} />
        <Words text="Show it anything." start={p(70)} accent={["anything"]} />
        <span style={{ display: "inline-block", width: 20 }} />
        <Words text="See what it built." start={p(92)} accent={["built"]} />
      </div>
      <div style={{ marginTop: 46, fontSize: 28, color: C.inkSoft, ...rise(frame, p(124), 22, 10) }}>
        Free for Mac and iPhone · Your own SSH · No account
      </div>
      <div style={{ marginTop: 18, fontSize: 42, fontWeight: 650, color: C.beamLight, ...rise(frame, p(138), 22, 10) }}>hostbeam.app</div>
    </AbsoluteFill>
  );
}

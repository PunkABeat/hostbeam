// "Agent on a server?" — on screen from the first frame (it is also the
// thumbnail), then it makes room: the server on the left, your Mac on the
// right, and between them a broken line — the gap the rest of the film closes.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, LAYOUT, SANS, inOut, progress, rise, typed, usePace, useTimings } from "../lib";
import { Caret, LoginMock, Terminal } from "../parts/Basics";
import { BeamPath } from "../parts/Beam";
import { DeviceLabel, Words } from "../parts/Kinetic";
import { ASK_1, L, TermLines } from "../script";

export const S1_LENGTH = 270;

export const S1_TIMES = { settle: 30, term: 44, mac: 58, type: 66, gap: 78, line: 92 };

/** The Mac card, where it sits in this scene (scene 2 starts from here). */
export const MAC_CARD = { left: LAYOUT.right.left, top: LAYOUT.right.top + 40, scale: 0.86 };

export function S1Problem() {
  const frame = useCurrentFrame();
  const p = usePace();
  const T = useTimings(S1_TIMES);
  const length = p(S1_LENGTH);
  // No fade in: the first frame is also the thumbnail, so the title is already there.
  const fade = Math.min(1, 1 - progress(frame, length - 14, 14, inOut));

  // The title starts centred and large, then glides to the top left.
  const m = progress(frame, T.settle, 36, inOut);
  const title = {
    x: interpolate(m, [0, 1], [308, 0]),
    y: interpolate(m, [0, 1], [300, 0]),
    s: interpolate(m, [0, 1], [1.45, 1]) * (1 + 0.015 * (1 - m) * Math.min(1, frame / 46)),
  };

  return (
    <AbsoluteFill>
      {/* The terminal does not fade at the end: scene 2 picks it up where it is. */}
      <Terminal title="dev@prod-box: ~/app — claude" fontSize={21} style={{ ...LAYOUT.term, ...rise(frame, T.term, 26, 40) }}>
        <TermLines
          lines={[
            L.shell,
            L.header,
            L.ask1(
              <>
                {typed(ASK_1, frame, T.type, 40)}
                <Caret />
              </>,
            ),
          ]}
        />
      </Terminal>

      <AbsoluteFill style={{ opacity: fade }}>
        <div
          style={{
            position: "absolute",
            left: LAYOUT.captionLeft,
            top: LAYOUT.captionTop,
            fontFamily: SANS,
            fontSize: 80,
            fontWeight: 680,
            letterSpacing: "-0.035em",
            color: C.ink,
            transform: `translate(${title.x}px, ${title.y}px) scale(${title.s})`,
            transformOrigin: "top left",
          }}
        >
          <Words text="Agent on a server?" accent={["server"]} shown />
        </div>

        <DeviceLabel text="Your server" start={T.term + 6} style={{ left: LAYOUT.term.left, top: LAYOUT.term.top - 40 }} />
        <DeviceLabel text="Your Mac" start={T.mac + 6} style={{ left: MAC_CARD.left, top: MAC_CARD.top - 40 }} />

        <BeamPath from={{ x: MAC_CARD.left - 16, y: 560 }} to={{ x: LAYOUT.term.left + LAYOUT.term.width + 16, y: 500 }} gapStart={T.gap} bend={-40} />

        <div
          style={{
            position: "absolute",
            bottom: 96,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: SANS,
            fontSize: 40,
            fontWeight: 560,
            letterSpacing: "-0.015em",
            color: C.ink,
          }}
        >
          <Words text="Your screenshot is on your Mac." start={T.line} accent={["Mac"]} stagger={3} />
          <span style={{ display: "inline-block", width: 18 }} />
          <Words text="Your agent is on the server." start={T.line + 20} accent={["server"]} stagger={3} />
        </div>
      </AbsoluteFill>

      {/* The Mac card stays opaque at the end too: scene 2 moves it. */}
      <div
        style={{
          position: "absolute",
          left: MAC_CARD.left,
          top: MAC_CARD.top,
          width: 330 * MAC_CARD.scale,
          height: 560 * MAC_CARD.scale,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 30px 70px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.08)",
          ...rise(frame, T.mac, 26, 40),
        }}
      >
        <LoginMock broken scale={MAC_CARD.scale} />
      </div>
    </AbsoluteFill>
  );
}

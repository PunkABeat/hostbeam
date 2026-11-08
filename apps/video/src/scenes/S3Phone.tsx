// "From your iPhone too." — the phone takes the Mac's place on the right, the
// share sheet, a tap, a beam across the gap, and the agent has the device's view.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, LAYOUT, progress, rise, sceneFade, typed, usePace, useTimings } from "../lib";
import { Terminal } from "../parts/Basics";
import { BeamPath } from "../parts/Beam";
import { Phone } from "../parts/Devices";
import { Caption, DeviceLabel } from "../parts/Kinetic";
import { L, TermLines } from "../script";

export const S3_LENGTH = 350;

export const S3_TIMES = { phone: 8, sheet: 44, tap: 86, beam: 94, land: 130, unland: 230, ask: 136, image: 162, reply: 184, sub: 170 };

const PHONE = { left: 1300, top: 168, scale: 0.88 };

export function S3Phone() {
  const frame = useCurrentFrame();
  const p = usePace();
  const T = useTimings(S3_TIMES);
  const fade = sceneFade(frame, p(S3_LENGTH));
  const sheet = progress(frame, T.sheet, 22) * (1 - progress(frame, T.land - 6, 14));
  const landed = frame >= T.land && frame < T.unland ? frame - T.land : null;
  const enter = progress(frame, T.phone, 34);

  const lines = [L.shell, L.header, L.ask1Image, L.seeIt, L.fixing];
  if (frame >= T.ask) {
    lines.push(
      frame < T.image ? (
        <>
          <span style={{ color: C.termDim }}>&gt; </span>
          {typed("Same on the real phone:", frame, T.ask, 34)}
        </>
      ) : (
        L.ask2(true)
      ),
    );
  }
  if (frame >= T.reply) lines.push(<span style={rise(frame, T.reply, 14, 8)}>{L.device}</span>);

  return (
    <AbsoluteFill>
      <Terminal title="dev@prod-box: ~/app — claude" fontSize={21} style={LAYOUT.term}>
        <TermLines lines={lines} />
      </Terminal>

      <AbsoluteFill style={{ opacity: fade }}>
        <Caption
          text="From your iPhone too."
          accent={["iPhone"]}
          sub="The share sheet, a widget, or a double-tap on the back of the phone."
          start={6}
          subStart={T.sub}
        />
        <DeviceLabel text="Your server" start={-30} style={{ left: LAYOUT.term.left, top: LAYOUT.term.top - 40 }} />
        <DeviceLabel text="Your iPhone" start={T.phone + 10} style={{ left: PHONE.left, top: PHONE.top - 40 }} />

        <BeamPath
          from={{ x: PHONE.left - 10, y: 560 }}
          to={{ x: LAYOUT.term.left + LAYOUT.term.width + 16, y: 520 }}
          bend={-150}
          travelStart={T.beam}
          travelDur={p(38)}
          fadeOutAt={T.land + p(40)}
        />

        <Phone
          sheet={sheet}
          tapped={frame >= T.tap && frame < T.beam + 4}
          landed={landed}
          style={{
            left: PHONE.left,
            top: PHONE.top,
            opacity: enter,
            transform: `translateY(${(1 - enter) * 140}px) scale(${PHONE.scale})`,
            transformOrigin: "top left",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

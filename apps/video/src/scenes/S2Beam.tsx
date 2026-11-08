// "Show it anything." — the screenshot shrinks to the corner like macOS's own
// preview, ⌘⇧7, the camera leans in on the popover while a beam crosses the
// gap, the path is copied, pasted, and the agent sees the picture.
import { AbsoluteFill, interpolate, spring, useCurrentFrame } from "remotion";
import { C, FPS, LAYOUT, SANS, camera, inOut, progress, rise, sceneFade, typed, usePace, useTimings } from "../lib";
import { Caret, Keys, LoginMock, MenuBar, Terminal } from "../parts/Basics";
import { BeamPath } from "../parts/Beam";
import { Caption, DeviceLabel } from "../parts/Kinetic";
import { BeamPopover, type BeamPhase } from "../parts/Popover";
import { ASK_1, L, PATH_1, TermLines } from "../script";
import { MAC_CARD } from "./S1Problem";

export const S2_LENGTH = 500;

// When each thing happens, in frames from the start of the scene.
export const S2_TIMES = {
  menubar: 10,
  shrink: 20,
  keys: 44,
  pop: 92,
  upload: 106,
  beam: 120,
  land: 164,
  done: 184,
  pull: 250,
  hide: 266,
  cmdv: 276,
  paste: 288,
  attach: 306,
  reply1: 330,
  reply2: 370,
  sub: 330,
};

const THUMB = { left: 1612, top: 790, scale: 0.36 };

function phaseAt(frame: number, T: typeof S2_TIMES): { phase: BeamPhase; t: number } {
  if (frame < T.upload) return { phase: "ready", t: 0 };
  if (frame < T.land) return { phase: "uploading", t: frame - T.upload };
  if (frame < T.done) return { phase: "landing", t: frame - T.land };
  return { phase: "done", t: frame - T.done };
}

export function S2Beam() {
  const frame = useCurrentFrame();
  const p = usePace();
  const T = useTimings(S2_TIMES);
  const fade = sceneFade(frame, p(S2_LENGTH));
  const { phase, t } = phaseAt(frame, T);

  // The screenshot: from the card to the corner preview, then back as what the agent sees.
  const toThumb = progress(frame, T.shrink, 30, inOut);
  const back = progress(frame, T.attach, 34, inOut);
  const k = toThumb * (1 - back);
  const shot = {
    left: interpolate(k, [0, 1], [MAC_CARD.left, THUMB.left]),
    top: interpolate(k, [0, 1], [MAC_CARD.top, THUMB.top]),
    scale: interpolate(k, [0, 1], [MAC_CARD.scale, THUMB.scale]),
  };

  const drop = spring({ frame: frame - T.pop, fps: FPS, config: { damping: 14, stiffness: 140, mass: 0.9 } });
  const popOpacity = Math.min(1, drop * 1.5) * (1 - progress(frame, T.hide, 16));
  const dim = progress(frame, T.keys - 4, 14) * (1 - progress(frame, T.pop - 6, 16));

  let askLine;
  if (frame < T.paste) {
    askLine = L.ask1(
      <>
        {ASK_1}
        <Caret />
      </>,
    );
  } else if (frame < T.attach) {
    askLine = L.ask1(
      <>
        {ASK_1} <span style={{ color: C.beamLight }}>{typed(PATH_1, frame, T.paste, 120)}</span>
      </>,
    );
  } else {
    askLine = L.ask1Image;
  }
  const replies = [];
  if (frame >= T.reply1) {
    replies.push(<span style={rise(frame, T.reply1, 14, 8)}>{L.seeIt}</span>);
  }
  if (frame >= T.reply2) {
    replies.push(<span style={rise(frame, T.reply2, 14, 8)}>{L.fixing}</span>);
  }

  // Lean in a little while the beam happens, then settle back for the reply.
  const cam = camera(frame, [
    [0, 1, 1300, 420],
    [T.pop, 1, 1300, 420],
    [T.pop + p(50), 1.05, 1300, 420],
    [T.pull, 1.05, 1300, 420],
    [T.pull + p(40), 1, 1300, 420],
  ]);

  return (
    <AbsoluteFill style={{ transform: cam }}>
      <Terminal title="dev@prod-box: ~/app — claude" fontSize={21} style={LAYOUT.term}>
        <TermLines lines={[L.shell, L.header, askLine, ...replies]} />
      </Terminal>

      <AbsoluteFill style={{ opacity: fade }}>
        <MenuBar enter={progress(frame, T.menubar, 24)} beaming={phase === "uploading" || phase === "landing"} />
        <Caption text="Show it anything." accent={["anything"]} sub="Any file. Any terminal. Any agent." start={6} subStart={T.sub} />
        <DeviceLabel text="Your server" start={-30} style={{ left: LAYOUT.term.left, top: LAYOUT.term.top - 40 }} />
        {frame >= T.attach + 16 ? (
          <DeviceLabel text="What the agent sees" start={T.attach + 16} style={{ left: MAC_CARD.left, top: MAC_CARD.top - 40 }} />
        ) : null}

        <BeamPath
          from={{ x: THUMB.left + 60, y: THUMB.top + 100 }}
          to={{ x: LAYOUT.term.left + LAYOUT.term.width + 16, y: 520 }}
          bend={140}
          travelStart={T.beam}
          travelDur={p(42)}
          fadeOutAt={T.done + p(30)}
        />

        {frame >= T.cmdv && frame < T.attach + 26 ? (
          <div
            style={{
              position: "absolute",
              left: LAYOUT.term.left + LAYOUT.term.width - 150,
              top: LAYOUT.term.top + LAYOUT.term.height + 26,
              fontFamily: SANS,
              fontSize: 34,
              fontWeight: 600,
              color: C.inkSoft,
              transform: rise(frame, T.cmdv, 12, 10).transform,
              opacity: rise(frame, T.cmdv, 12, 10).opacity * (1 - progress(frame, T.attach + 8, 16)),
            }}
          >
            ⌘V
          </div>
        ) : null}

        {/* the screenshot */}
        <div
          style={{
            position: "absolute",
            left: shot.left,
            top: shot.top,
            width: 330 * shot.scale,
            height: 560 * shot.scale,
            borderRadius: 16 * (shot.scale / MAC_CARD.scale),
            overflow: "hidden",
            boxShadow: `0 30px 70px rgba(0,0,0,.5), 0 0 0 ${k > 0.5 ? 3 : 1}px rgba(255,255,255,${k > 0.5 ? 0.9 : 0.08})`,
          }}
        >
          <LoginMock broken scale={shot.scale} />
        </div>

        {/* a moment of focus while the keys are pressed */}
        <AbsoluteFill style={{ background: "rgba(3,7,15,.6)", opacity: dim }} />
        <Keys keys={["⌘", "⇧", "7"]} start={T.keys} hold={p(52)} />

        <div
          className="theme-dark"
          style={{
            position: "absolute",
            right: 160,
            top: 64,
            transform: `scale(1.55) translateY(${(1 - drop) * -18}px)`,
            transformOrigin: "top right",
            opacity: popOpacity,
            filter: `drop-shadow(0 0 ${40 * drop}px rgba(58,123,255,.25))`,
          }}
        >
          <BeamPopover phase={phase} t={t} path={PATH_1} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

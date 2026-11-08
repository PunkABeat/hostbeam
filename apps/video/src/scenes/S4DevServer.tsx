// "See what it built." — the agent starts a dev server; one click on Open and
// the beam runs the other way, server to Mac, and the page opens in a browser.
import { AbsoluteFill, spring, useCurrentFrame } from "remotion";
import { FPS, LAYOUT, progress, rise, sceneFade, usePace, useTimings } from "../lib";
import { LoginMock, MenuBar, Pointer, Terminal } from "../parts/Basics";
import { BeamPath } from "../parts/Beam";
import { Browser } from "../parts/Devices";
import { Caption, DeviceLabel } from "../parts/Kinetic";
import { DevPopover, type DevState } from "../parts/Popover";
import { L, TermLines } from "../script";

export const S4_LENGTH = 320;

const BROWSER = { left: 1100, top: 330 };
/** Where the beam lands: the middle of where the browser opens. */
const LANDING = { x: 1440, y: 650 };

export const S4_TIMES = { fixed: 12, server: 32, menubar: 42, pop: 58, ptr: 74, click: 110, open: 130, beam: 134, browser: 168, sub: 170 };

export function S4DevServer() {
  const frame = useCurrentFrame();
  const p = usePace();
  const T = useTimings(S4_TIMES);
  const length = p(S4_LENGTH);
  const fade = sceneFade(frame, length);
  const drop = spring({ frame: frame - T.pop, fps: FPS, config: { damping: 14, stiffness: 140, mass: 0.9 } });
  const state: DevState = frame < T.click ? "listed" : frame < T.open ? "opening" : "open";
  const win = spring({ frame: frame - T.browser, fps: FPS, config: { damping: 18, stiffness: 110 } });

  const lines = [L.shell, L.header, L.ask1Image, L.seeIt, L.fixing, L.ask2(true), L.device];
  if (frame >= T.fixed) lines.push(<span style={rise(frame, T.fixed, 14, 8)}>{L.fixed}</span>);
  if (frame >= T.server) lines.push(<span style={rise(frame, T.server, 14, 8)}>{L.devServer}</span>);

  return (
    <AbsoluteFill>
      {/* The film's last scene with the terminal: it leaves with the rest. */}
      <Terminal title="dev@prod-box: ~/app — claude" fontSize={21} style={{ ...LAYOUT.term, opacity: 1 - progress(frame, length - 16, 16) }}>
        <TermLines lines={lines} />
      </Terminal>

      <AbsoluteFill style={{ opacity: fade }}>
        <MenuBar enter={progress(frame, T.menubar, 24)} />
        <Caption text="See what it built." accent={["built"]} sub="Even where SSH port forwarding is off." start={6} subStart={T.sub} />
        <DeviceLabel text="Your server" start={-30} style={{ left: LAYOUT.term.left, top: LAYOUT.term.top - 40 }} />
        {frame >= T.browser ? <DeviceLabel text="Your Mac" start={T.browser + 10} style={{ left: 1100, top: 290 }} /> : null}

        {/* Server to Mac: the beam crosses to where the browser will be, lands, and
            the browser grows out of the landing point. */}
        <BeamPath
          from={{ x: LAYOUT.term.left + LAYOUT.term.width + 16, y: 500 }}
          to={LANDING}
          bend={-80}
          travelStart={T.beam}
          travelDur={p(32)}
          fadeOutAt={T.browser + p(40)}
        />

        <div
          className="theme-dark"
          style={{
            position: "absolute",
            right: 160,
            top: 64,
            transform: `scale(1.55) translateY(${(1 - drop) * -18}px)`,
            transformOrigin: "top right",
            opacity: Math.min(1, drop * 1.5) * (1 - progress(frame, T.browser, 16)),
          }}
        >
          <DevPopover state={state} />
        </div>

        <Browser
          url="127.0.0.1:5173"
          style={{
            left: BROWSER.left,
            top: BROWSER.top,
            width: 680,
            height: 660,
            opacity: Math.min(1, win * 2),
            transform: `perspective(1600px) rotateX(${(1 - win) * 6}deg) scale(${0.45 + win * 0.55})`,
            transformOrigin: `${LANDING.x - BROWSER.left}px ${LANDING.y - BROWSER.top}px`,
          }}
        >
          <div style={{ marginTop: 20 }}>
            <LoginMock broken={false} />
          </div>
        </Browser>

        {frame < T.browser + 4 ? (
          <Pointer
            clickAt={T.click}
            path={[
              [0, 1480, 780],
              [T.ptr, 1480, 780],
              [T.click - 8, 1686, 262],
              [T.browser, 1686, 262],
            ]}
          />
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

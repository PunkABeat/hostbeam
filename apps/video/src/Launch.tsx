// The launch film: five scenes over one moving ground, each handing over to
// the next (the terminal never cuts), with a vignette over all of it. The main
// film and the X cut are this same component at two paces.
import { useEffect, useState } from "react";
import { AbsoluteFill, Sequence, continueRender, delayRender } from "remotion";
import "@hostbeam/ui-styles";
import { componentCss } from "@hostbeam/ui";
import { C, PaceContext, SANS } from "./lib";
import { Backdrop, Grain, Vignette } from "./parts/Atmosphere";
import { Soundtrack } from "./Soundtrack";
import { S1Problem, S1_LENGTH } from "./scenes/S1Problem";
import { S2Beam, S2_LENGTH } from "./scenes/S2Beam";
import { S3Phone, S3_LENGTH } from "./scenes/S3Phone";
import { S4DevServer, S4_LENGTH } from "./scenes/S4DevServer";
import { S5End, S5_LENGTH } from "./scenes/S5End";

const OVERLAP = 16;
const SCENES = [
  { Scene: S1Problem, length: S1_LENGTH },
  { Scene: S2Beam, length: S2_LENGTH },
  { Scene: S3Phone, length: S3_LENGTH },
  { Scene: S4DevServer, length: S4_LENGTH },
  { Scene: S5End, length: S5_LENGTH },
];

/** Where each scene starts and how long it lasts, at a given pace. */
export function sceneSpans(pace: number): { from: number; length: number }[] {
  let from = 0;
  return SCENES.map(({ length }) => {
    const span = { from, length: Math.round(length * pace) };
    from += span.length - OVERLAP;
    return span;
  });
}

export function launchLength(pace: number): number {
  const spans = sceneSpans(pace);
  const last = spans[spans.length - 1];
  return last.from + last.length;
}

export type LaunchProps = {
  /** 1 is the film as written; the main cut plays at 0.82, the X cut at 0.68. */
  pace: number;
  /**
   * Animated film grain. Off by default: near invisible once X or YouTube
   * recompress the video, and it makes a render take eight minutes instead of
   * one and the file twenty times larger. On for a master copy.
   */
  grain?: boolean;
  /** The soundtrack. On by default; off for a silent preview. */
  sound?: boolean;
};

export function Launch({ pace, grain = false, sound = true }: LaunchProps) {
  // Geist is self-hosted by @hostbeam/ui; no frame is drawn before it loads.
  const [handle] = useState(() => delayRender("Loading Geist"));
  useEffect(() => {
    Promise.all(["400", "500", "600", "700"].map((w) => document.fonts.load(`${w} 40px Geist`)))
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle));
  }, [handle]);

  const spans = sceneSpans(pace);
  return (
    <PaceContext.Provider value={pace}>
      <AbsoluteFill style={{ fontFamily: SANS, color: C.ink }}>
        <style>{componentCss}</style>
        <Backdrop />
        {SCENES.map(({ Scene }, i) => (
          <Sequence key={i} from={spans[i].from} durationInFrames={spans[i].length}>
            <Scene />
          </Sequence>
        ))}
        {grain ? <Grain /> : null}
        <Vignette />
        {sound ? <Soundtrack spans={spans} total={launchLength(pace)} /> : null}
      </AbsoluteFill>
    </PaceContext.Provider>
  );
}

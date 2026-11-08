// The film's air: a deep ground with two slow drifting lights under every
// scene, and film grain and a vignette over them. Subtle on purpose; it is
// what keeps flat UI from looking like a slide.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../lib";

export function Backdrop() {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const x1 = 72 + 8 * Math.sin(t / 6);
  const y1 = 8 + 6 * Math.cos(t / 7);
  const x2 = 18 + 7 * Math.cos(t / 8);
  const y2 = 92 + 5 * Math.sin(t / 5);
  return (
    <AbsoluteFill style={{ background: C.ground }}>
      <AbsoluteFill
        style={{
          background: [
            `radial-gradient(1100px 760px at ${x1}% ${y1}%, rgba(58,123,255,.20), transparent 70%)`,
            `radial-gradient(1200px 820px at ${x2}% ${y2}%, rgba(35,72,150,.22), transparent 70%)`,
            `radial-gradient(1600px 1000px at 50% 50%, ${C.groundHigh}, transparent 75%)`,
          ].join(", "),
        }}
      />
    </AbsoluteFill>
  );
}

export function Grain() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: 0.07, mixBlendMode: "screen" }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 9} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
}

export function Vignette() {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: "radial-gradient(ellipse 90% 85% at 50% 48%, transparent 64%, rgba(0,0,0,.34) 100%)",
      }}
    />
  );
}

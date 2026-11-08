// The film's one visual idea: a line between you and the server. In the first
// scene it is broken (the gap); every beam after that is a light travelling
// along it, ending in a pulse where it lands.
import { useCurrentFrame } from "remotion";
import { C, inOut, progress } from "../lib";

type Pt = { x: number; y: number };

function point(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

/** A dash pattern for pathLength=100 with a hole in the middle: the gap. */
function brokenDashes(hole = 18): string {
  const out: number[] = [];
  let at = 0;
  const half = (100 - hole) / 2;
  while (at < half) {
    out.push(1.4, 1.6);
    at += 3;
  }
  out.push(0, hole);
  at += hole;
  while (at < 100) {
    out.push(1.4, 1.6);
    at += 3;
  }
  return out.join(" ");
}

export function BeamPath({
  from,
  to,
  bend = -90,
  gapStart,
  travelStart,
  travelDur = 34,
  fadeOutAt,
}: {
  from: Pt;
  to: Pt;
  /** How far the curve bows, perpendicular to the line. */
  bend?: number;
  /** When the dashed, broken line appears (the gap). Omit to skip it. */
  gapStart?: number;
  /** When a beam sets off along the line. Omit for no beam. */
  travelStart?: number;
  travelDur?: number;
  /** When everything fades away. */
  fadeOutAt?: number;
}) {
  const frame = useCurrentFrame();
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const ctrl = { x: mx + (-(to.y - from.y) / len) * bend, y: my + ((to.x - from.x) / len) * bend };
  const d = `M ${from.x} ${from.y} Q ${ctrl.x} ${ctrl.y} ${to.x} ${to.y}`;

  const out = fadeOutAt === undefined ? 1 : 1 - progress(frame, fadeOutAt, 18);
  const gap = gapStart === undefined ? 0 : progress(frame, gapStart, 24);
  // Once a beam has landed, the hole is closed: the line is whole.
  const p = travelStart === undefined ? 0 : progress(frame, travelStart, travelDur, inOut);
  const arrived = travelStart !== undefined && frame >= travelStart + travelDur;
  const pulse = arrived ? progress(frame, travelStart + travelDur, 22) : 0;
  const head = point(from, ctrl, to, p);

  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: out }}>
      <defs>
        <linearGradient id="beam-grad" gradientUnits="userSpaceOnUse" x1={from.x} y1={from.y} x2={to.x} y2={to.y}>
          <stop offset="0" stopColor={C.beamLight} stopOpacity="0.15" />
          <stop offset="1" stopColor={C.beamLight} stopOpacity="1" />
        </linearGradient>
        <filter id="beam-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {gap > 0 && p === 0 ? (
        <path d={d} pathLength={100} fill="none" stroke={C.beamLight} strokeOpacity={0.35 * gap} strokeWidth={2.5} strokeDasharray={brokenDashes()} strokeLinecap="round" />
      ) : null}

      {p > 0 ? (
        <>
          <path d={d} pathLength={1} fill="none" stroke={C.beam} strokeWidth={14} strokeDasharray={`${p} 2`} filter="url(#beam-glow)" opacity={0.7} />
          <path d={d} pathLength={1} fill="none" stroke="url(#beam-grad)" strokeWidth={3.5} strokeDasharray={`${p} 2`} strokeLinecap="round" />
          {!arrived ? (
            <>
              <circle cx={head.x} cy={head.y} r={22} fill={C.beam} opacity={0.55} filter="url(#beam-glow)" />
              <circle cx={head.x} cy={head.y} r={7} fill="#fff" />
            </>
          ) : null}
        </>
      ) : null}

      {arrived && pulse < 1 ? (
        <circle cx={to.x} cy={to.y} r={10 + pulse * 70} fill="none" stroke={C.beamLight} strokeWidth={4 * (1 - pulse)} opacity={1 - pulse} />
      ) : null}
    </svg>
  );
}

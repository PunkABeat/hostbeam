// Shared timing helpers and the film's palette. Everything moves by frame
// number, never by CSS timers: Remotion renders frames out of order and in
// parallel, so an animation driven by the clock would come out different on
// every render.
import { createContext, useContext } from "react";
import { Easing, interpolate } from "remotion";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const C = {
  ground: "#081120",
  groundHigh: "#132544",
  ink: "#edf2fb",
  inkSoft: "#a9b8d0",
  inkFaint: "#6f84a6",
  beam: "#3a7bff",
  beamLight: "#7fb0ff",
  land: "#4fd393",
  warn: "#f5b860",
  termBg: "#0b1525",
  termBorder: "#22324f",
  termDim: "#64769a",
};

export const SANS = '"Geist", -apple-system, "Helvetica Neue", sans-serif';
export const MONO = '"SF Mono", Menlo, Monaco, monospace';

/** The house curve: fast out of the gate, a long soft landing. */
export const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
/** For things that travel from one place to another and should settle, not snap. */
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);

/** 0 → 1 over [start, start + dur], eased, clamped. */
export function progress(frame: number, start: number, dur: number, easing = expoOut): number {
  return interpolate(frame, [start, start + Math.max(1, dur)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
}

/** Opacity and a short upward drift, for anything that appears. */
export function rise(frame: number, start: number, dur = 22, dist = 26) {
  const p = progress(frame, start, dur);
  return { opacity: p, transform: `translateY(${(1 - p) * dist}px)` };
}

/** The scene's own fade in and out, so cuts between scenes cross-dissolve. */
export function sceneFade(frame: number, length: number, edge = 14): number {
  return Math.min(progress(frame, 0, edge), 1 - progress(frame, length - edge, edge, inOut));
}

/** The first `n` characters of `text`, typed at `cps` characters a second. */
export function typed(text: string, frame: number, start: number, cps = 32): string {
  const n = Math.max(0, Math.floor(((frame - start) / FPS) * cps));
  return text.slice(0, n);
}

/** A blinking block cursor, on for half of each second. */
export function caretOn(frame: number): boolean {
  return Math.floor(frame / (FPS / 2)) % 2 === 0;
}

/**
 * A camera move through keyframes [frame, scale, x, y]: the scene is scaled
 * about the point (x, y), so a key can say "lean in on the popover".
 */
export function camera(frame: number, keys: [number, number, number, number][]): string {
  const at = (i: 1 | 2 | 3) =>
    interpolate(
      frame,
      keys.map((k) => k[0]),
      keys.map((k) => k[i]),
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: inOut },
    );
  const s = at(1);
  const x = at(2);
  const y = at(3);
  return `translate(${x}px, ${y}px) scale(${s}) translate(${-x}px, ${-y}px)`;
}

/** Where the film puts things, so every scene agrees: the server on the left, you on the right. */
export const LAYOUT = {
  term: { left: 140, top: 340, width: 900, height: 300 },
  right: { left: 1250, top: 300 },
  captionLeft: 140,
  captionTop: 112,
};

// Tempo. Every scene's timings are written at pace 1; a cut plays them at its
// own pace by scaling the waits between moments, while each animation keeps its
// own speed — faster without rushing any one motion. The main film and the X
// cut differ only in this number.
export const PaceContext = createContext(1);

/** Scale a frame count by the current cut's pace. */
export function usePace(): (n: number) => number {
  const pace = useContext(PaceContext);
  return (n: number) => Math.round(n * pace);
}

/** A scene's timing table, scaled by the current cut's pace. */
export function useTimings<T extends Record<string, number>>(table: T): T {
  const p = usePace();
  return Object.fromEntries(Object.entries(table).map(([k, v]) => [k, p(v)])) as T;
}

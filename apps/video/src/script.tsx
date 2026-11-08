// The terminal's script, in one place. Each scene starts from the lines the
// last one ended on and appends its own, and the terminal shows the newest
// five — so between scenes it scrolls like a real session instead of jumping.
import type { ReactNode } from "react";
import { C } from "./lib";

export const PATH_1 = "/tmp/hostbeam/hostbeam-1790992624318.png";
export const PATH_2 = "/tmp/hostbeam/hostbeam-1790993042117.png";

const Dim = ({ children }: { children: ReactNode }) => <span style={{ color: C.termDim }}>{children}</span>;
const Blue = ({ children, bold }: { children: ReactNode; bold?: boolean }) => (
  <span style={{ color: C.beamLight, fontWeight: bold ? 600 : 400 }}>{children}</span>
);
const Dot = () => <span style={{ color: C.land }}>● </span>;

export const ASK_1 = "The login button overlaps the email field. Look:";

export const L = {
  shell: <Dim>dev@prod-box ~/app $ claude</Dim>,
  header: <Blue>✻ Claude Code</Blue>,
  ask1: (rest: ReactNode) => (
    <>
      <Dim>&gt; </Dim>
      {rest}
    </>
  ),
  ask1Image: (
    <>
      <Dim>&gt; </Dim>
      {ASK_1} <Blue bold>[Image #1]</Blue>
    </>
  ),
  seeIt: (
    <>
      <Dot />I see it: under 390px the button rides up over the email field.
    </>
  ),
  fixing: (
    <>
      <Dot />Fixing the wrap in <Blue>LoginForm.tsx</Blue>.
    </>
  ),
  ask2: (image: boolean) => (
    <>
      <Dim>&gt; </Dim>Same on the real phone: {image ? <Blue bold>[Image #2]</Blue> : null}
    </>
  ),
  device: (
    <>
      <Dot />Got it. Same bug on the real device.
    </>
  ),
  fixed: (
    <>
      <Dot />Fixed. Both screenshots look right now.
    </>
  ),
  devServer: (
    <>
      <Dot />Dev server running at <Blue>http://localhost:5173</Blue>
    </>
  ),
};

/** The newest `max` lines, each one its own row. */
export function TermLines({ lines, max = 5 }: { lines: ReactNode[]; max?: number }) {
  return (
    <>
      {lines.slice(-max).map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </>
  );
}

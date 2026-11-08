// The film's sound: a music bed under everything, and an effect on each
// moment. Times come from the scenes' own timing tables, so sound and picture
// stay in step at any pace. The sounds are synthesized by
// scripts/make-sounds.py; public/sound/bed.mp3 can be swapped for a licensed track.
import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { usePace } from "./lib";
import { S1_TIMES } from "./scenes/S1Problem";
import { S2_TIMES } from "./scenes/S2Beam";
import { S3_TIMES } from "./scenes/S3Phone";
import { S4_TIMES } from "./scenes/S4DevServer";

type Cue = { at: number; sound: string; volume: number };

export function Soundtrack({ spans, total }: { spans: { from: number; length: number }[]; total: number }) {
  const p = usePace();
  const [s1, s2, s3, s4, s5] = spans.map((s) => s.from);
  const cue = (scene: number, base: number, sound: string, volume = 0.6, offset = 0): Cue => ({
    at: scene + p(base) + offset,
    sound,
    volume,
  });

  // Only sounds that mean something: the gap, the keys, the beams and where
  // they land, a click where something is clicked. The music carries the rest.
  const cues: Cue[] = [
    // 1 — the gap
    cue(s1, S1_TIMES.type, "typing", 0.45),
    cue(s1, S1_TIMES.gap, "disconnect", 0.45),
    // 2 — the Mac beam
    cue(s2, S2_TIMES.keys, "thock", 0.8, 16),
    cue(s2, S2_TIMES.keys, "thock", 0.8, 21),
    cue(s2, S2_TIMES.keys, "thock", 0.9, 26),
    cue(s2, S2_TIMES.pop, "pop", 0.4),
    cue(s2, S2_TIMES.beam, "beam", 0.6),
    cue(s2, S2_TIMES.land, "chime", 0.5),
    cue(s2, S2_TIMES.cmdv, "thock", 0.6, 8),
    cue(s2, S2_TIMES.cmdv, "thock", 0.6, 13),
    // 3 — the iPhone
    cue(s3, S3_TIMES.tap, "tick", 0.55),
    cue(s3, S3_TIMES.beam, "beam", 0.55),
    cue(s3, S3_TIMES.land, "chime", 0.45),
    // 4 — the way back
    cue(s4, S4_TIMES.click, "tick", 0.6),
    cue(s4, S4_TIMES.beam, "beam-back", 0.55),
    // 5 — the mark
    { at: s5 - 46, sound: "riser", volume: 0.35 },
    { at: s5 + 2, sound: "sting", volume: 0.75 },
  ];

  return (
    <>
      <Audio
        src={staticFile("sound/bed.mp3")}
        volume={(f) =>
          0.6 *
          interpolate(f, [0, 20, total - 60, total - 4], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
      {cues.map((c, i) => (
        <Sequence key={i} from={Math.max(0, c.at)} durationInFrames={120} layout="none">
          <Audio src={staticFile(`sound/${c.sound}.mp3`)} volume={c.volume} />
        </Sequence>
      ))}
    </>
  );
}

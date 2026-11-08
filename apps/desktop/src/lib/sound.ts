// Optional "beam landed" chime (Web Audio). Lazily creates an AudioContext inside
// a user gesture (unlock) so autoplay policies don't block it; the context is
// reused. Consumed by the popover when the sound setting is on.

interface PluckOptions {
  type?: OscillatorType;
  freq: number;
  t: number;
  gain: number;
  dur: number;
}

let ctx: AudioContext | undefined;

function ac(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext!)();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") {
    try {
      ctx.resume();
    } catch {
      /* resume can reject if not in a gesture — ignore */
    }
  }
  return ctx;
}

function reverb(c: AudioContext, seconds: number, decay: number): ConvolverNode {
  const len = Math.floor(c.sampleRate * seconds),
    buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  const cv = c.createConvolver();
  cv.buffer = buf;
  return cv;
}

function pluck(c: AudioContext, dest: AudioNode, o: PluckOptions): void {
  const osc = c.createOscillator();
  osc.type = o.type || "sine";
  osc.frequency.value = o.freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, o.t);
  g.gain.exponentialRampToValueAtTime(o.gain, o.t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, o.t + o.dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(o.t);
  osc.stop(o.t + o.dur + 0.05);
}

export const HBSound = {
  unlock() {
    ac();
  },
  beamLanded() {
    const c = ac();
    if (!c) return;
    const t = c.currentTime + 0.02;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 4400;
    lp.connect(c.destination);
    const rv = reverb(c, 0.7, 3),
      wg = c.createGain();
    wg.gain.value = 0.24;
    lp.connect(rv);
    rv.connect(wg);
    wg.connect(c.destination);
    pluck(c, lp, { freq: 587.33, t, dur: 0.18, gain: 0.16 }); // D5 — rise
    pluck(c, lp, { freq: 880.0, t: t + 0.08, dur: 0.2, gain: 0.18 }); // A5 — rise
    pluck(c, lp, { freq: 1174.66, t: t + 0.17, dur: 0.55, gain: 0.26 }); // D6 — land
    pluck(c, lp, { freq: 587.33, t: t + 0.17, dur: 0.6, gain: 0.09 }); // sub warmth
  },
};

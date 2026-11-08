#!/usr/bin/env python3
"""The film's sound, synthesized: every effect and the music bed are made here
from oscillators and noise, so there is no licence to clear and any of it can
be remade or retuned. Writes MP3s into public/sound/.

    python3 scripts/make-sounds.py

Needs numpy and ffmpeg. Swapping the music bed for a licensed track is one
file: drop it in as public/sound/bed.mp3.
"""
import os
import subprocess
import tempfile
import wave

import numpy as np

SR = 48_000
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sound")
rng = np.random.default_rng(7)


def t(seconds):
    return np.arange(int(seconds * SR)) / SR


def env(n, attack, release, curve=3.0):
    """An attack/release envelope over n samples (seconds for each)."""
    a = max(1, int(attack * SR))
    r = max(1, int(release * SR))
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a) ** 2
    e[-r:] *= np.linspace(1, 0, r) ** curve
    return e


def svf_bandpass(x, f_start, f_end, q=2.0):
    """A state-variable band-pass whose centre sweeps from f_start to f_end
    (exponentially), sample by sample: the sound of something passing."""
    n = len(x)
    freqs = f_start * (f_end / f_start) ** np.linspace(0, 1, n)
    low = band = 0.0
    out = np.empty(n)
    damp = 1.0 / q
    for i in range(n):
        f = 2.0 * np.sin(np.pi * freqs[i] / SR)
        low += f * band
        high = x[i] - low - damp * band
        band += f * high
        out[i] = band
    return out


def pink(n):
    """Pink-ish noise: white noise with its highs rolled off."""
    w = rng.standard_normal(n)
    spec = np.fft.rfft(w)
    f = np.fft.rfftfreq(n, 1 / SR)
    f[0] = 1
    spec /= np.sqrt(f)
    p = np.fft.irfft(spec, n)
    return p / np.max(np.abs(p))


def bell(freq, seconds, decay=2.2):
    """An inharmonic bell: the partials of a struck bar, each dying away."""
    tt = t(seconds)
    partials = [(1.0, 1.0), (2.756, 0.45), (5.404, 0.22), (8.933, 0.08)]
    s = sum(a * np.sin(2 * np.pi * freq * m * tt) * np.exp(-tt * decay * m ** 0.6) for m, a in partials)
    return s * env(len(tt), 0.002, 0.2)


def stereo(mono, pan_from=0.0, pan_to=0.0):
    """Mono to stereo, panning from one side to the other (-1 left, 1 right)."""
    pan = np.linspace(pan_from, pan_to, len(mono))
    left = mono * np.cos((pan + 1) * np.pi / 4)
    right = mono * np.sin((pan + 1) * np.pi / 4)
    return np.stack([left, right], axis=1)


def write(name, audio, peak=0.8, filters=None):
    """Normalise, write a WAV, then let ffmpeg filter it and make the MP3."""
    if audio.ndim == 1:
        audio = stereo(audio)
    audio = audio / (np.max(np.abs(audio)) or 1) * peak
    os.makedirs(OUT, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        path = tmp.name
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((audio * 32767).astype("<i2").tobytes())
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", path]
    if filters:
        cmd += ["-af", filters]
    cmd += ["-b:a", "192k", os.path.join(OUT, f"{name}.mp3")]
    subprocess.run(cmd, check=True)
    os.remove(path)
    print(f"  {name}.mp3")


# --- effects ---------------------------------------------------------------

def whoosh(seconds, f0, f1, pan_from=0.0, pan_to=0.0, q=1.6):
    n = int(seconds * SR)
    swept = svf_bandpass(pink(n), f0, f1, q)
    shape = np.sin(np.linspace(0, np.pi, n)) ** 1.6
    return stereo(swept * shape, pan_from, pan_to)


def pop():
    tt = t(0.14)
    f = 950 * np.exp(-tt * 18) + 330
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 34)
    click = rng.standard_normal(len(tt)) * np.exp(-tt * 400) * 0.25
    return s + click


def tick():
    tt = t(0.05)
    s = np.sin(2 * np.pi * 2600 * tt) * np.exp(-tt * 140)
    return s + rng.standard_normal(len(tt)) * np.exp(-tt * 600) * 0.2


def thock():
    """A key on a good keyboard: a low body and a short clack."""
    tt = t(0.11)
    body = np.sin(2 * np.pi * 170 * tt) * np.exp(-tt * 45)
    clack = svf_bandpass(rng.standard_normal(len(tt)), 1400, 1100, 3) * np.exp(-tt * 90)
    return body * 0.9 + clack * 0.6


def typing(seconds):
    n = int(seconds * SR)
    out = np.zeros(n)
    at = 0.04
    while at < seconds - 0.05:
        k = thock() * rng.uniform(0.25, 0.45)
        i = int(at * SR)
        out[i : i + len(k)] += k[: n - i]
        at += rng.uniform(0.06, 0.12)
    return out


def chime():
    """A beam landing: a fifth, struck, with a little air after it."""
    return bell(1318.5, 1.6) * 0.8 + bell(1975.5, 1.6) * 0.45


def disconnect():
    """The gap: two soft notes falling away."""
    tt = t(0.9)
    note1 = np.sin(2 * np.pi * 587.3 * tt) * np.exp(-tt * 7) * env(len(tt), 0.01, 0.3)
    shift = int(0.18 * SR)
    note2 = np.zeros_like(tt)
    tt2 = tt[: len(tt) - shift]
    note2[shift:] = np.sin(2 * np.pi * 440.0 * tt2) * np.exp(-tt2 * 5)
    return note1 * 0.7 + note2 * 0.6


def riser(seconds):
    n = int(seconds * SR)
    swept = svf_bandpass(pink(n), 200, 6000, 1.2)
    return stereo(swept * np.linspace(0, 1, n) ** 2.2)


def sting():
    """The logo: a soft low boom under a bright chord."""
    tt = t(3.0)
    boom = np.sin(2 * np.pi * 48 * tt) * np.exp(-tt * 2.6) * env(len(tt), 0.005, 0.5)
    chord = sum(bell(f, 3.0, decay=1.1) * a for f, a in [(587.3, 0.7), (880.0, 0.5), (1108.7, 0.35), (1318.5, 0.3)])
    return boom * 1.1 + chord * 0.55


# --- the music bed ------------------------------------------------------------

def note_freq(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def pad_voice(freq, seconds):
    """A soft, slightly detuned pad voice from a handful of harmonics."""
    tt = t(seconds)
    out = np.zeros(len(tt))
    for detune in (-0.06, 0.0, 0.07):
        f = freq * 2 ** (detune / 12)
        for h in range(1, 7):
            out += np.sin(2 * np.pi * f * h * tt + rng.uniform(0, 2 * np.pi)) / h ** 1.6
    return out


def place(buf, sound, at_seconds, gain=1.0, pan=0.0):
    """Mix a mono sound into a stereo buffer at a time, with a pan."""
    s = int(at_seconds * SR)
    if s >= len(buf):
        return
    e = min(len(buf), s + len(sound))
    seg = sound[: e - s] * gain
    buf[s:e, 0] += seg * np.cos((pan + 1) * np.pi / 4)
    buf[s:e, 1] += seg * np.sin((pan + 1) * np.pi / 4)


def kick():
    tt = t(0.42)
    f = 46 + 110 * np.exp(-tt * 32)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7.5)
    click = rng.standard_normal(len(tt)) * np.exp(-tt * 900) * 0.35
    return np.tanh((body + click) * 1.6)


def clap():
    n = int(0.3 * SR)
    out = np.zeros(n)
    for k, delay in enumerate((0.0, 0.011, 0.022)):
        burst = svf_bandpass(rng.standard_normal(int(0.03 * SR)), 1500, 1200, 1.4) * np.exp(-t(0.03) * 120)
        i = int(delay * SR)
        out[i : i + len(burst)] += burst * (0.7 + 0.15 * k)
    tail = svf_bandpass(rng.standard_normal(n), 1300, 1000, 1.2) * np.exp(-t(0.3) * 16) * 0.5
    return out + tail


def hat(open_=False):
    length = 0.16 if open_ else 0.045
    w = rng.standard_normal(int(length * SR))
    hp = np.diff(np.diff(w, prepend=0), prepend=0)
    return hp * np.exp(-t(length) * (22 if open_ else 110))


def bass_note(freq, seconds):
    tt = t(seconds)
    s = sum(np.sin(2 * np.pi * freq * h * tt) / h ** 1.25 for h in range(1, 9))
    return np.tanh(s * 1.4) * np.exp(-tt * 5.5) * env(len(tt), 0.004, 0.03)


def pluck(freq, seconds=0.22):
    tt = t(seconds)
    s = sum(np.sin(2 * np.pi * freq * h * tt) * (0.9 ** h) / h for h in range(1, 6))
    return s * np.exp(-tt * 16) * env(len(tt), 0.002, 0.02)


def bed(seconds, bpm=122):
    """An uplifting promo groove at 122 BPM: Bm, G, D, A, one bar each.
    Two filtered bars of intro, then four-on-the-floor, a pumping bass,
    16th-note arpeggio, claps on 2 and 4, hats on the off-beats, and a pad
    that ducks under every kick."""
    n = int(seconds * SR)
    beat = 60 / bpm
    bar = beat * 4
    intro = bar * 2
    roots = [47, 43, 50, 45]  # B2, G2, D3, A2 — up an octave, so phone speakers carry it
    arps = [[71, 74, 78, 83], [67, 71, 74, 79], [74, 78, 81, 86], [69, 73, 76, 81]]
    pads = [[59, 62, 66, 69], [55, 59, 62, 66], [62, 64, 66, 69], [57, 61, 64, 69]]

    drums = np.zeros((n, 2))
    bass = np.zeros((n, 2))
    arp = np.zeros((n, 2))
    pad = np.zeros((n, 2))
    K, CL, H, HO = kick(), clap(), hat(), hat(True)

    bar_i = 0
    at = 0.0
    while at < seconds:
        c = bar_i % 4
        # pad: the whole bar, a little longer, so chords overlap
        for j, m in enumerate(pads[c]):
            v = pad_voice(note_freq(m), bar + 0.3) * env(int((bar + 0.3) * SR), 0.05, 0.3, 2) * 0.16
            place(pad, v, at, pan=(j / 3) * 1.0 - 0.5)
        for b in range(4):
            bt = at + b * beat
            if bt >= intro:
                place(drums, K, bt, 0.95)
                if b in (1, 3):
                    place(drums, CL, bt, 0.42, pan=0.05)
                place(drums, H, bt + beat / 2, 0.22, pan=0.35)
                if b == 3 and bar_i % 2 == 1:
                    place(drums, HO, bt + beat / 2, 0.18, pan=-0.3)
            # bass on every eighth after the intro, root note
            if bt >= intro:
                for e in (0, 1):
                    place(bass, bass_note(note_freq(roots[c]), beat / 2), bt + e * beat / 2, 0.5)
            # arpeggio: sixteenths through the chord, ping-ponging
            for s16 in range(4):
                k = b * 4 + s16
                order = [0, 1, 2, 3, 2, 1, 0, 2][k % 8]
                place(arp, pluck(note_freq(arps[c][order])), bt + s16 * beat / 4, 0.17, pan=0.45 if k % 2 else -0.45)
        at += bar
        bar_i += 1

    # sidechain: the pad and the bass breathe under each kick
    tt = np.arange(n) / SR
    phase = np.mod(tt, beat)
    duck = 1 - 0.65 * np.exp(-phase / 0.11)
    duck[tt < intro] = 1.0
    pad *= duck[:, None]
    bass *= (1 - 0.35 * np.exp(-phase / 0.06))[:, None]

    # the intro: the arp and pad open up from a muffled start (a one-pole low-pass sweep)
    mix = drums + bass + arp + pad
    cut = np.clip(tt / intro, 0, 1) ** 2
    out = np.empty_like(mix)
    y = np.zeros(2)
    for i in range(n):
        if cut[i] >= 1.0:
            out[i:] = mix[i:]
            break
        fc = 300 + cut[i] * 12000
        a = 1 - np.exp(-2 * np.pi * fc / SR)
        y += a * (mix[i] - y)
        out[i] = y
    fade = env(n, 0.05, 2.5, 2)
    return out * fade[:, None]


if __name__ == "__main__":
    print("making sounds →", os.path.normpath(OUT))
    # beams travel right to left (you → server), and back the other way at the end
    write("beam", whoosh(1.4, 250, 4200, 0.8, -0.8, q=2.2), peak=0.75, filters="aecho=0.8:0.6:60:0.25")
    write("beam-back", whoosh(1.1, 300, 4200, -0.8, 0.8, q=2.2), peak=0.7, filters="aecho=0.8:0.6:60:0.25")
    write("pop", pop(), peak=0.55)
    write("tick", tick(), peak=0.35)
    write("thock", thock(), peak=0.7)
    write("typing", typing(1.7), peak=0.4)
    write("chime", chime(), peak=0.55, filters="aecho=0.8:0.7:90|180:0.3|0.2")
    write("disconnect", disconnect(), peak=0.4, filters="aecho=0.8:0.6:120:0.25")
    write("riser", riser(1.6), peak=0.45)
    write("sting", sting(), peak=0.8, filters="aecho=0.8:0.7:120|240:0.3|0.2")
    write("bed", bed(52), peak=0.8, filters="aecho=0.8:0.6:180|370:0.12|0.08,acompressor=threshold=-14dB:ratio=3:attack=5:release=80,loudnorm=I=-16:TP=-1.5")

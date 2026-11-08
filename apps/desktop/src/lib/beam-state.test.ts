import { describe, expect, it } from "vitest";

import {
  type BeamEvent,
  type BeamState,
  beamInFlight,
  cardShowing,
  confirmationFades,
  initialBeamState,
  reduceBeam,
  simulatedOutcome,
} from "./beam-state";

const run = (events: BeamEvent[], from: BeamState = initialBeamState) =>
  events.reduce(reduceBeam, from);

describe("reduceBeam", () => {
  it("walks a clipboard beam from ready to done and back", () => {
    const uploading = reduceBeam(initialBeamState, { type: "started", clipThumb: "clip.png" });
    expect(uploading.phase).toBe("uploading");
    expect(uploading.beamThumb).toBe("clip.png");
    expect(uploading.progress).toBeNull();
    expect(beamInFlight(uploading.phase)).toBe(true);

    const landing = reduceBeam(uploading, {
      type: "landed",
      paths: ["/srv/shots/a.png"],
      previews: ["real.png"],
    });
    expect(landing.phase).toBe("landing");
    expect(landing.path).toBe("/srv/shots/a.png");
    expect(landing.beamThumb).toBe("real.png");
    expect(landing.landedCount).toBe(1);

    const done = reduceBeam(landing, { type: "settled" });
    expect(done.phase).toBe("done");
    expect(cardShowing(done.phase)).toBe(true);
    expect(confirmationFades(done)).toBe(true);

    const idle = reduceBeam(done, { type: "confirmationFaded" });
    expect(idle).toMatchObject({ phase: "idle", path: "", beamThumb: null });
  });

  it("keeps the clipboard thumbnail when the result brings none", () => {
    const s = run([
      { type: "started", clipThumb: "clip.png" },
      { type: "landed", paths: ["/a.png"] },
    ]);
    expect(s.beamThumb).toBe("clip.png");
  });

  it("shows no clipboard thumbnail for a dropped file, and progress only for a batch", () => {
    const one = reduceBeam(initialBeamState, {
      type: "started",
      files: ["/a.png"],
      clipThumb: "clip.png",
    });
    expect(one.beamThumb).toBeNull();
    expect(one.progress).toBeNull();

    const many = reduceBeam(initialBeamState, {
      type: "started",
      files: ["/a.png", "/b.png", "/c.png"],
      clipThumb: null,
    });
    expect(many.progress).toEqual({ sent: 0, total: 3 });
    const two = reduceBeam(many, { type: "progress", sent: 2, total: 3 });
    expect(two.progress).toEqual({ sent: 2, total: 3 });
    expect(
      reduceBeam(two, { type: "landed", paths: ["/a.png", "/b.png", "/c.png"] }).progress,
    ).toBeNull();
  });

  it("lands a partial as a success that says what is missing, and it does not fade", () => {
    const s = run([
      { type: "started", files: ["/a.png", "/b.png", "/c.png"], clipThumb: null },
      { type: "landed", paths: ["/a.png"], failed: ["/b.png", "/c.png"] },
      { type: "settled" },
    ]);
    expect(s.phase).toBe("done");
    expect(s.landedCount).toBe(1);
    expect(s.unsent).toEqual(["/b.png", "/c.png"]);
    expect(confirmationFades(s)).toBe(false);
    expect(reduceBeam(s, { type: "confirmationFaded" })).toBe(s);
    // The next beam clears the offer; it is that beam's outcome now.
    expect(
      reduceBeam(s, { type: "started", files: ["/b.png", "/c.png"], clipThumb: null }).unsent,
    ).toEqual([]);
  });

  it("carries the reminder on a whole landing only, and drops it with the card", () => {
    const whole = run([
      { type: "started", clipThumb: null },
      { type: "landed", paths: ["/a.png"], remind: true },
      { type: "settled" },
    ]);
    expect(whole.remind).toBe(true);
    // It still fades — the reminder never holds the card up for good.
    expect(confirmationFades(whole)).toBe(true);
    expect(reduceBeam(whole, { type: "confirmationFaded" }).remind).toBe(false);
    expect(reduceBeam(whole, { type: "started", clipThumb: null }).remind).toBe(false);
    expect(reduceBeam(whole, { type: "hostChanged" }).remind).toBe(false);
    // A partial has its own news; the reminder does not ride on it.
    const partial = run([
      { type: "started", files: ["/a.png", "/b.png"], clipThumb: null },
      { type: "landed", paths: ["/a.png"], failed: ["/b.png"], remind: true },
    ]);
    expect(partial.remind).toBe(false);
    // And a landing Rust did not flag has none.
    expect(run([{ type: "landed", paths: ["/a.png"] }]).remind).toBe(false);
  });

  it("does not settle a landing that was reset first", () => {
    const landing = run([
      { type: "started", clipThumb: null },
      { type: "landed", paths: ["/a.png"] },
    ]);
    const reset = reduceBeam(landing, { type: "reset" });
    expect(reset.phase).toBe("idle");
    expect(reduceBeam(reset, { type: "settled" })).toBe(reset);
  });

  it("puts a failure on its card and forgets the batch progress", () => {
    const s = run([
      { type: "started", files: ["/a.png", "/b.png"], clipThumb: null },
      { type: "progress", sent: 1, total: 2 },
      { type: "failed", error: "auth" },
    ]);
    expect(s).toMatchObject({ phase: "failed", err: "auth", progress: null });
    expect(cardShowing(s.phase)).toBe(true);
    expect(confirmationFades(s)).toBe(false);
  });

  it("treats a refused file as a passing note, not a failed beam", () => {
    const s = run([
      { type: "started", files: ["/notes.txt"], clipThumb: null },
      { type: "refused" },
    ]);
    expect(s).toMatchObject({ phase: "idle", refused: true, beamThumb: null, progress: null });
    expect(reduceBeam(s, { type: "refusalFaded" }).refused).toBe(false);
  });

  it("clears the card and the offer when the host changes, but not the count", () => {
    const s = run([
      { type: "started", files: ["/a.png", "/b.png"], clipThumb: null },
      { type: "landed", paths: ["/a.png"], previews: ["p.png"], failed: ["/b.png"] },
      { type: "settled" },
      { type: "diagnostics", diag: "running" },
      { type: "hostChanged" },
    ]);
    expect(s).toMatchObject({ phase: "idle", unsent: [], path: "", diag: null, beamThumb: null });
    expect(s.landedCount).toBe(1);
  });

  it("tracks a drag over the popover and clears the note on a drop", () => {
    const over = reduceBeam(
      { ...initialBeamState, refused: true },
      { type: "dragging", over: true },
    );
    expect(over.dropping).toBe(true);
    expect(reduceBeam(over, { type: "dragging", over: false }).dropping).toBe(false);
    expect(reduceBeam(over, { type: "dropped" })).toMatchObject({
      dropping: false,
      refused: false,
    });
  });

  it("starts a beam with the diagnostics of the last one gone", () => {
    const s = run([
      { type: "failed", error: "timeout" },
      { type: "diagnostics", diag: [{ label: "ssh", status: "fail", detail: "" }] },
      { type: "started", clipThumb: null },
    ]);
    expect(s.diag).toBeNull();
  });
});

describe("a held beam", () => {
  const held = { paths: ["/Users/me/.env", "/Users/me/r.pdf"], flagged: [".env"] };

  it("holds rather than fails, and carries the gesture's files for the card", () => {
    const s = run([
      { type: "started", files: held.paths, clipThumb: null },
      { type: "held", held },
    ]);
    expect(s.phase).toBe("held");
    expect(s.held).toEqual(held);
    expect(s.carrying).toEqual(held.paths);
    expect(s.progress).toBeNull();
    expect(beamInFlight(s.phase)).toBe(false);
    // A card the next gesture replaces — the old question is answered "no".
    expect(cardShowing(s.phase)).toBe(true);
    expect(confirmationFades(s)).toBe(false);
  });

  it("is dropped by Don't send, by a host change and by the next beam", () => {
    const h = run([{ type: "held", held }]);
    expect(reduceBeam(h, { type: "reset" })).toMatchObject({
      phase: "idle",
      held: null,
      carrying: [],
    });
    expect(reduceBeam(h, { type: "hostChanged" })).toMatchObject({ phase: "idle", held: null });
    const next = reduceBeam(h, { type: "started", files: held.paths, clipThumb: null });
    expect(next).toMatchObject({ phase: "uploading", held: null });
  });

  it("gives a file beam no clipboard thumbnail, however stale the clipboard", () => {
    // A copy in Finder leaves only its icon; a drop has none at all.
    const s = reduceBeam(initialBeamState, {
      type: "started",
      files: ["/Users/me/r.pdf"],
      clipThumb: "some-old-screenshot.png",
    });
    expect(s.beamThumb).toBeNull();
    expect(s.carrying).toEqual(["/Users/me/r.pdf"]);
    const landed = reduceBeam(s, { type: "landed", paths: ["/t/r.pdf"], previews: [null] });
    expect(landed.beamThumb).toBeNull();
  });
});

describe("simulatedOutcome", () => {
  it("follows the dev picker, and the host's mocked reachability on auto", () => {
    expect(simulatedOutcome("auto", true)).toBe("success");
    expect(simulatedOutcome("auto", undefined)).toBe("success");
    expect(simulatedOutcome("auto", false)).toBe("timeout");
    expect(simulatedOutcome("", false)).toBe("timeout");
    expect(simulatedOutcome("permission", true)).toBe("perm");
    expect(simulatedOutcome("many", true)).toBe("many");
  });
});

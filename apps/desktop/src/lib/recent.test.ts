import { describe, expect, it } from "vitest";

import type { RecentBeam } from "../types/config";
import { countFiles, groupRecent, THUMB_BUDGET, trimThumbs } from "./recent";

const row = (id: string, group?: string): RecentBeam => ({
  id,
  hostId: "h",
  path: `/tmp/hostbeam/${id}.png`,
  at: 0,
  group,
});

describe("groupRecent", () => {
  it("folds one gesture's rows into one group", () => {
    const groups = groupRecent([row("a-0", "a"), row("a-1", "a"), row("a-2", "a")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].rows.map((r) => r.id)).toEqual(["a-0", "a-1", "a-2"]);
    expect(groups[0].key).toBe("a-0");
  });

  it("keeps separate gestures separate", () => {
    const groups = groupRecent([row("b-0", "b"), row("a-0", "a"), row("a-1", "a")]);
    expect(groups.map((g) => g.rows.length)).toEqual([1, 2]);
  });

  it("leaves pre-0.1.19 rows, which have no group, standing alone", () => {
    // An existing Recent list must keep rendering exactly as it did.
    const groups = groupRecent([row("x"), row("y"), row("z")]);
    expect(groups).toHaveLength(3);
  });

  it("never merges two drops that are not adjacent", () => {
    // Recent is chronological and one gesture writes its rows together, so a
    // repeated group id across a gap is two drops, not one — merging them would
    // put files under a beam they did not belong to.
    const groups = groupRecent([row("a-0", "a"), row("b-0", "b"), row("a-1", "a")]);
    expect(groups).toHaveLength(3);
  });

  it("is empty for an empty list", () => {
    expect(groupRecent([])).toEqual([]);
  });
});

describe("countFiles", () => {
  it("counts files rather than gestures, which is what 'and N more' means", () => {
    const groups = groupRecent([row("a-0", "a"), row("a-1", "a"), row("b-0", "b")]);
    expect(countFiles(groups)).toBe(3);
    expect(countFiles(groups.slice(1))).toBe(1);
  });
});

describe("trimThumbs", () => {
  const withThumb = (id: string, bytes: number): RecentBeam => ({
    ...row(id),
    thumb: "x".repeat(bytes),
  });

  it("keeps the newest thumbnails and drops the rest", () => {
    const out = trimThumbs([withThumb("a", 60), withThumb("b", 60), withThumb("c", 60)], 100);
    expect(out.map((r) => !!r.thumb)).toEqual([true, false, false]);
  });

  it("never drops a row, only its picture", () => {
    // A row without a thumbnail still names its file, still copies its path and
    // still says which host it went to. Losing the row would lose the beam.
    const out = trimThumbs([withThumb("a", 200), withThumb("b", 200)], 100);
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("leaves a list that already fits completely alone", () => {
    const rows = [withThumb("a", 10), withThumb("b", 10)];
    expect(trimThumbs(rows, 1000)).toEqual(rows);
  });

  it("ignores rows that never had a thumbnail", () => {
    const out = trimThumbs([row("a"), withThumb("b", 50)], 100);
    expect(out[0].thumb).toBeUndefined();
    expect(out[1].thumb).toBeTruthy();
  });

  it("bounds the real shape: 24 rows of oversized thumbnails", () => {
    // 24 x 840KB is what a config looked like when it hit 9MB, blew the ~5MB
    // localStorage quota, and left Preferences rendering nothing.
    const rows = Array.from({ length: 24 }, (_, i) => withThumb(`r${i}`, 840_000));
    const total = trimThumbs(rows).reduce((n, r) => n + (r.thumb?.length ?? 0), 0);
    expect(total).toBeLessThanOrEqual(THUMB_BUDGET);
    expect(rows).toHaveLength(24);
  });
});

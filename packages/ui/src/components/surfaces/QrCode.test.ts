// The icon in the middle of a QR code is only safe because of the arithmetic
// in qrIconLayout: cover too much and a scanner gives up, drift off centre or
// into a finder pattern and it never locks on at all. These are the properties
// that keep it scannable, checked against every QR size that exists rather
// than the one the app happens to produce today.
import { describe, expect, it } from "vitest";

import { qrIconLayout } from "./QrCode";

/** Every QR version: 21 modules at version 1, +4 per version, to 177 at 40. */
const SIZES = Array.from({ length: 40 }, (_, i) => 21 + i * 4);

describe("qrIconLayout", () => {
  it("centres the icon exactly, at every QR size that has one", () => {
    for (const count of SIZES.filter((c) => qrIconLayout(c).hole > 0)) {
      const { hole, start } = qrIconLayout(count);
      expect(start * 2 + hole, `count ${count}`).toBe(count);
      expect(Number.isInteger(start), `count ${count}`).toBe(true);
    }
  });

  it("drops the icon on the smallest code rather than crowding it", () => {
    // Version 1 is 21 modules: the finder patterns leave three in the middle,
    // which is not a mark, it is a speck. Every other size keeps its icon.
    expect(qrIconLayout(21).hole).toBe(0);
    expect(SIZES.filter((c) => qrIconLayout(c).hole === 0)).toEqual([21]);
  });

  it("leaves the icon a module of clear space inside the hole", () => {
    for (const count of SIZES.filter((c) => qrIconLayout(c).hole > 0)) {
      const { hole, icon } = qrIconLayout(count);
      expect(icon, `count ${count}`).toBe(hole - 2);
    }
  });

  it("covers far less than error correction can recover", () => {
    // Level Q recovers about a quarter of the data. Staying under a tenth of
    // the area keeps a wide margin for the glare and angle of a real camera.
    for (const count of SIZES) {
      const { hole } = qrIconLayout(count);
      expect((hole * hole) / (count * count), `count ${count}`).toBeLessThan(0.1);
    }
  });

  it("never touches a finder pattern", () => {
    // The three corner patterns are 7 modules plus a separator, so anything
    // from module 8 inwards is free. Overlap there is fatal: a scanner finds
    // the code by those squares before it reads a single bit.
    for (const count of SIZES.filter((c) => qrIconLayout(c).hole > 0)) {
      const { hole, start } = qrIconLayout(count);
      expect(start, `count ${count}`).toBeGreaterThan(8);
      expect(start + hole, `count ${count}`).toBeLessThan(count - 8);
    }
  });
});

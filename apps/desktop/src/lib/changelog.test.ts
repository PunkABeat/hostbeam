import { describe, expect, it } from "vitest";

import { MAC_CHANGELOG_URL, macChangelogUrl } from "./changelog";

describe("macChangelogUrl", () => {
  it("opens the Mac releases, at a version's own entry when it has one", () => {
    // The exact anchor the site gives a Mac release (releaseAnchor in
    // scripts/changelog-parse.mjs); a different shape lands at the top.
    expect(macChangelogUrl("0.1.20")).toBe("https://hostbeam.app/changelog/mac/#mac-0.1.20");
    expect(macChangelogUrl()).toBe("https://hostbeam.app/changelog/mac/");
    expect(macChangelogUrl(null)).toBe(MAC_CHANGELOG_URL);
  });
});

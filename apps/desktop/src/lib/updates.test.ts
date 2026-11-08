import { describe, expect, it } from "vitest";

import { updatedSinceLastRun, updateToAnnounce, type UpdateStatus } from "./updates";

const found = (version: string, extra: Partial<UpdateStatus> = {}): UpdateStatus => ({
  available: true,
  version,
  ...extra,
});

describe("updateToAnnounce", () => {
  it("announces a found version", () => {
    expect(updateToAnnounce(found("0.1.20"), null)).toBe("0.1.20");
  });

  it("stays quiet about a skipped version, and speaks up for the next one", () => {
    expect(updateToAnnounce(found("0.1.20"), "0.1.20")).toBeNull();
    expect(updateToAnnounce(found("0.1.21"), "0.1.20")).toBe("0.1.21");
  });

  it("stays quiet about a version already installed in the background", () => {
    expect(updateToAnnounce(found("0.1.20", { ready: true }), null)).toBeNull();
  });

  it("stays quiet when nothing is available or the check never ran", () => {
    expect(updateToAnnounce(null, null)).toBeNull();
    expect(updateToAnnounce({ available: false }, null)).toBeNull();
  });
});

describe("updatedSinceLastRun", () => {
  it("names the new version once the app has changed", () => {
    expect(updatedSinceLastRun("0.1.19", "0.1.20")).toBe("0.1.20");
  });

  it("says nothing on a first run or when nothing changed", () => {
    expect(updatedSinceLastRun(null, "0.1.20")).toBeNull();
    expect(updatedSinceLastRun(undefined, "0.1.20")).toBeNull();
    expect(updatedSinceLastRun("0.1.20", "0.1.20")).toBeNull();
    expect(updatedSinceLastRun("0.1.19", null)).toBeNull();
  });
});

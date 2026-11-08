// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { setLocaleFromSetting, t } from "../i18n";
import { baseName, beamName, relTime } from "./format";

describe("baseName", () => {
  it("returns the final path segment", () => {
    expect(baseName("/tmp/hostbeam/2025-06-14.png")).toBe("2025-06-14.png");
    expect(baseName("plain.png")).toBe("plain.png");
  });

  it("falls back to the input for empty/nullish values", () => {
    expect(baseName("")).toBe("");
    expect(baseName(null)).toBe(null);
  });
});

describe("relTime", () => {
  beforeEach(() => setLocaleFromSetting("en"));

  it("buckets durations into the localized strings", () => {
    const now = Date.now();
    expect(relTime(now)).toBe(t("time.justNow"));
    expect(relTime(now - 5 * 60_000)).toBe(t("time.minutesAgo", { m: 5 }));
    expect(relTime(now - 3 * 3_600_000)).toBe(t("time.hoursAgo", { h: 3 }));
    expect(relTime(now - 2 * 86_400_000)).toBe(t("time.daysAgo", { d: 2 }));
    expect(relTime(now - 5 * 60_000)).not.toContain("{");
  });

  it("follows the live locale", async () => {
    await setLocaleFromSetting("fr");
    expect(relTime(Date.now())).toBe(t("time.justNow"));
    expect(relTime(Date.now())).not.toBe("just now");
  });
});

describe("beamName", () => {
  it("splits the machine prefix off the name the file arrived with", () => {
    expect(beamName("hostbeam-1788875278869-shot-2.png")).toEqual({
      head: "hostbeam-1788875278869-",
      tail: "shot-2.png",
    });
  });

  it("leaves a clipboard beam whole — it has no original name to keep", () => {
    expect(beamName("hostbeam-1788875278869.png")).toEqual({
      head: "",
      tail: "hostbeam-1788875278869.png",
    });
  });

  it("does not split an iPhone-beamed name at its year", () => {
    // `hostbeam-2026-09-08-114207.png`: a naive \\d+ would take "2026" for a
    // stamp and show "09-08-114207.png" as the name, which says nothing.
    expect(beamName("hostbeam-2026-09-08-114207.png").head).toBe("");
  });

  it("passes anything else through untouched", () => {
    for (const n of ["", "notes.txt", "hostbeam-.png", "screenshot.png"]) {
      expect(beamName(n)).toEqual({ head: "", tail: n });
    }
  });
});

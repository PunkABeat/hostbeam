import assert from "node:assert/strict";
import { test } from "node:test";

import { passedDeadlines, retiredClaims, wrongVersions } from "./check-docs-drift.mjs";

test("a deadline is reported once its day has passed, not on the day", () => {
  const text = "out of minutes until 2026-10-01 (red in five seconds)\nneeds activity by ~2026-10-27";
  assert.deepEqual(passedDeadlines(text, "2026-10-02"), [{ line: 1, text: "until 2026-10-01" }]);
  assert.deepEqual(passedDeadlines(text, "2026-10-01"), []);
  assert.equal(passedDeadlines(text, "2026-10-28").length, 2);
});

test("dates that are history are not deadlines", () => {
  assert.deepEqual(passedDeadlines("shipped 2026-09-28, resubmitted on 2026-09-30, since 2026-09-05", "2026-10-02"), []);
});

test("a stated version must be the repo's", () => {
  const actual = { desktop: "0.1.33", ios: "1.0" };
  assert.deepEqual(wrongVersions("**The Mac is at 0.1.30, shipped 2026-09-27**", actual), [
    { line: 1, text: "Mac is at 0.1.30", actual: "0.1.33" },
  ]);
  assert.deepEqual(wrongVersions("The Mac is at 0.1.33; the iPhone app is at 1.0.", actual), []);
  assert.equal(wrongVersions("the iOS app is on 1.1", actual).length, 1);
});

test("history that names an old version is not a claim", () => {
  assert.deepEqual(wrongVersions("shipped in Mac 0.1.30, crashed in 0.1.27", { desktop: "0.1.33", ios: "1.0" }), []);
});

test("the old pricing is caught in its different wordings", () => {
  for (const line of [
    "Free for 5 beams a day, on macOS 13 and later.",
    "5 beams per day, per device",
    "same 5 free beams a day on each",
    "removes the daily beam limit",
    "a year of updates included",
    "includes 12 months of updates",
  ]) {
    assert.equal(retiredClaims(line).length, 1, line);
  }
});

test("the current pricing and deliberate mentions pass", () => {
  for (const line of [
    "Free to use, with no daily cap.",
    "There is no daily limit.",
    "A license covers every Hostbeam 1 update.",
    "Is there still a limit of 5 beams a day? No. <!-- retired-claim-ok -->",
  ]) {
    assert.deepEqual(retiredClaims(line), [], line);
  }
});

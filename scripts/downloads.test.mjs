import { test } from "node:test";
import assert from "node:assert/strict";

import { bucket, readDownloads, running, summarize, wranglerError } from "./downloads.mjs";

const row = (day, agent, platform, extra = {}) => ({
  day,
  kind: "dmg",
  version: "latest",
  agent,
  platform,
  country: "FR",
  count: 1,
  ...extra,
});

test("only a Mac browser or Homebrew counts as a person downloading it", () => {
  assert.equal(bucket(row("2026-10-06", "browser", "mac")), "mac-site");
  assert.equal(bucket(row("2026-10-06", "homebrew", "mac")), "mac-brew");
  assert.equal(bucket(row("2026-10-06", "browser", "ios")), "not-mac");
  assert.equal(bucket(row("2026-10-06", "browser", "windows")), "not-mac");
  assert.equal(bucket(row("2026-10-06", "updater", "mac")), "update");
  assert.equal(bucket(row("2026-10-06", "script", "other")), "script");
  assert.equal(bucket(row("2026-10-06", "bot", "other")), "bot");
});

test("the 30-day column starts 29 days before today, inclusive", () => {
  const s = summarize(
    [
      row("2026-09-06", "browser", "mac"), // 30 days before: outside
      row("2026-09-07", "browser", "mac", { count: 2 }), // 29 days before: inside
      row("2026-10-06", "homebrew", "mac", { country: "US" }),
      row("2026-10-06", "updater", "mac", { kind: "update", version: "0.1.35", count: 4 }),
      row("2026-10-06", "bot", "other", { count: 9 }),
    ],
    "2026-10-06",
  );
  assert.equal(s.first, "2026-09-06");
  assert.deepEqual(s.total["mac-site"], { all: 3, recent: 2 });
  assert.deepEqual(s.total["mac-brew"], { all: 1, recent: 1 });
  assert.deepEqual(s.total.bot, { all: 9, recent: 9 });
  assert.deepEqual(s.months, { "2026-09": 3, "2026-10": 1 });
  assert.deepEqual(s.countries, { FR: 3, US: 1 });
  assert.deepEqual(s.versions, { "0.1.35": 4 });
});

test("an empty table says so rather than printing zeros", () => {
  assert.equal(summarize([], "2026-10-06").first, null);
});

const check = (day, count, agent = "updater") => ({
  day,
  kind: "check",
  version: "latest",
  agent,
  platform: "mac",
  country: "US",
  count,
});

test("copies running averages whole days only, skipping the day counting began", () => {
  // 10-06 began part way through; 10-10 is today, so also partial. A day with
  // no row had no checks and counts as zero.
  const r = running({ "2026-10-06": 1, "2026-10-07": 3, "2026-10-09": 6, "2026-10-10": 2 }, "2026-10-10");
  assert.equal(r.since, "2026-10-06");
  assert.equal(r.yesterday, 6);
  assert.deepEqual(r.week, { perDay: 3, days: 3 });
  assert.deepEqual(r.month, { perDay: 3, days: 3 });
});

test("the 7-day average stops at seven days once there are more", () => {
  const byDay = {};
  for (let d = 1; d <= 20; d++) byDay[`2026-10-${String(d).padStart(2, "0")}`] = d <= 12 ? 1 : 8;
  const r = running(byDay, "2026-10-21");
  assert.deepEqual(r.week, { perDay: 8, days: 7 }); // 10-14 … 10-20
  assert.equal(r.month.days, 19); // 10-02 … 10-20
});

test("until a whole day has passed there is no figure, not a zero", () => {
  const r = running({ "2026-10-06": 1 }, "2026-10-06");
  assert.equal(r.yesterday, null);
  assert.equal(r.week, null);
  assert.equal(running({}, "2026-10-06"), null);
});

test("update checks are kept out of the download lines, and only the app's count", () => {
  const s = summarize(
    [
      check("2026-10-06", 1), // the first, partial day
      check("2026-10-07", 4),
      check("2026-10-07", 9, "homebrew"),
      check("2026-10-07", 2, "script"),
    ],
    "2026-10-08",
  );
  assert.equal(s.first, null);
  assert.equal(s.running.yesterday, 4);
  assert.deepEqual(s.checkCountries, { US: 5 });
});

test("a refused read is asked again, which is what a just-minted wrangler token needs", async () => {
  const waits = [];
  let calls = 0;
  const rows = await readDownloads(
    () => {
      calls += 1;
      if (calls === 1) throw new Error("7403");
      return [{ day: "2026-10-29" }];
    },
    async (ms) => waits.push(ms),
  );
  assert.deepEqual(rows, [{ day: "2026-10-29" }]);
  assert.equal(calls, 2);
  assert.deepEqual(waits, [3000]);
});

test("three refusals in a row are reported, not retried forever", async () => {
  let calls = 0;
  await assert.rejects(
    readDownloads(
      () => {
        calls += 1;
        throw new Error(`refusal ${calls}`);
      },
      async () => {},
    ),
    /refusal 3/,
  );
  assert.equal(calls, 3);
});

test("wrangler's own error is shown: --json puts it on stdout, not stderr", () => {
  const e = Object.assign(new Error("Command failed: wrangler d1 execute"), {
    stderr: "",
    stdout: JSON.stringify({
      error: {
        text: "A request to the Cloudflare API (/accounts/x/d1/database/y/query) failed.",
        notes: [{ text: "The given account is not valid or is not authorized to access this service [code: 7403]" }],
      },
    }),
  });
  assert.equal(
    wranglerError(e),
    "A request to the Cloudflare API (/accounts/x/d1/database/y/query) failed.\n" +
      "The given account is not valid or is not authorized to access this service [code: 7403]",
  );
  assert.equal(wranglerError(Object.assign(new Error("spawn wrangler ENOENT"), { stdout: "" })), "spawn wrangler ENOENT");
});

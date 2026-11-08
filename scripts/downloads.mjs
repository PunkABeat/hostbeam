#!/usr/bin/env node
// How many times the Mac app has been downloaded, and how many copies are
// running, from the counter on download.hostbeam.app (ADR 0030,
// apps/download-counter).
//
//   npm run downloads
//
// Reads the D1 table with the wrangler login on this Mac and prints the totals
// in plain words. The number that answers "how many people downloaded it" is
// the first line: a browser on a Mac, or Homebrew. Everything else is listed
// so the total can be checked, not because it counts: phones and Windows
// cannot run Hostbeam, the scripts are mostly the release's own checks, and
// bots fetch whatever a page links to.
//
// Copies running come from the app's update checks: each copy asks 15 seconds
// after launch and then once a day, so a day's checks are about the number of
// copies that ran that day. Slightly high, since a relaunch asks again; low by
// the copies with "Check for updates automatically" turned off.
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const BUCKETS = [
  ["mac-site", "Mac, from the site"],
  ["mac-brew", "Mac, through Homebrew"],
  ["update", "Updates the app installed"],
  ["not-mac", "Browsers that can't run it (phone, Windows, Linux)"],
  ["script", "Scripts (curl and the like, the release's own checks)"],
  ["bot", "Bots and link previews"],
];

/** Which line of the report a row of the downloads table belongs on. */
export function bucket({ agent, platform }) {
  if (agent === "homebrew") return "mac-brew";
  if (agent === "updater") return "update";
  if (agent === "browser") return platform === "mac" ? "mac-site" : "not-mac";
  if (agent === "script") return "script";
  return "bot";
}

/** YYYY-MM-DD, `n` days after `day` (negative for before). */
export function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Copies running, from the update checks the app made (`checksByDay`, day →
 * count). Only whole days count: not today, and not the day counting began,
 * which started part way through. */
export function running(checksByDay, today) {
  const days = Object.keys(checksByDay).sort();
  if (!days.length) return null;
  const firstWhole = addDays(days[0], 1);
  const yesterday = addDays(today, -1);
  const average = (n) => {
    const from = [addDays(today, -n), firstWhole].sort()[1];
    if (from > yesterday) return null;
    let sum = 0;
    let count = 0;
    for (let d = from; d <= yesterday; d = addDays(d, 1)) {
      sum += checksByDay[d] ?? 0;
      count += 1;
    }
    return { perDay: sum / count, days: count };
  };
  return {
    since: days[0],
    yesterday: firstWhole <= yesterday ? (checksByDay[yesterday] ?? 0) : null,
    week: average(7),
    month: average(30),
  };
}

/** Totals for the report, from the table's rows. `today` is YYYY-MM-DD (UTC). */
export function summarize(rows, today) {
  const recent = addDays(today, -29);
  const checksByDay = {};
  const checkCountries = {};
  const total = Object.fromEntries(BUCKETS.map(([k]) => [k, { all: 0, recent: 0 }]));
  const months = {};
  const countries = {};
  const versions = {};
  let first = null;
  for (const row of rows) {
    if (row.kind === "check") {
      // Homebrew's livecheck and the release scripts read latest.json too;
      // only the app's own checks say a copy is running.
      if (row.agent !== "updater") continue;
      checksByDay[row.day] = (checksByDay[row.day] ?? 0) + row.count;
      if (row.day >= recent && row.day < today) {
        checkCountries[row.country] = (checkCountries[row.country] ?? 0) + row.count;
      }
      continue;
    }
    const b = bucket(row);
    total[b].all += row.count;
    if (row.day >= recent) total[b].recent += row.count;
    if (!first || row.day < first) first = row.day;
    if (b === "mac-site" || b === "mac-brew") {
      const month = row.day.slice(0, 7);
      months[month] = (months[month] ?? 0) + row.count;
      countries[row.country] = (countries[row.country] ?? 0) + row.count;
    }
    if (b === "update") versions[row.version] = (versions[row.version] ?? 0) + row.count;
  }
  return {
    first,
    recent,
    total,
    months,
    countries,
    versions,
    running: running(checksByDay, today),
    checkCountries,
  };
}

export function top(counts, n) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
}

function share(counts, n) {
  const sum = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([k, v]) => `${k} ${Math.round((100 * v) / sum)}%`)
    .join(", ");
}

function printDownloads(s) {
  if (!s.first) {
    console.log("No downloads counted yet. The counter started on 2026-10-06.");
    return;
  }
  const label = Math.max(...BUCKETS.map(([, l]) => l.length));
  console.log(`Hostbeam for Mac downloads, counted since ${s.first}\n`);
  console.log(`${"".padEnd(label)}  ${"all time".padStart(8)}  ${"30 days".padStart(8)}`);
  for (const [k, l] of BUCKETS) {
    console.log(`${l.padEnd(label)}  ${String(s.total[k].all).padStart(8)}  ${String(s.total[k].recent).padStart(8)}`);
    if (k === "mac-brew") {
      const all = s.total["mac-site"].all + s.total["mac-brew"].all;
      const recent = s.total["mac-site"].recent + s.total["mac-brew"].recent;
      console.log(`${"= People who downloaded it".padEnd(label)}  ${String(all).padStart(8)}  ${String(recent).padStart(8)}\n`);
    }
  }
  if (Object.keys(s.months).length) {
    console.log(`\nMac downloads by month: ${Object.entries(s.months).sort().map(([m, v]) => `${m} ${v}`).join(", ")}`);
    console.log(`Countries: ${top(s.countries, 10)}`);
  }
  if (Object.keys(s.versions).length) {
    console.log(`Updates by version, newest first: ${Object.entries(s.versions)
      .sort((a, b) => b[0].localeCompare(a[0], undefined, { numeric: true }))
      .slice(0, 8)
      .map(([v, n]) => `${v} ${n}`)
      .join(", ")}`);
  }
}

function printRunning(r, countries) {
  console.log("\nCopies running (from the app's daily update check)\n");
  if (!r) {
    console.log("No update checks counted yet. Counting started on 2026-10-06.");
    return;
  }
  if (r.yesterday === null) {
    console.log(`Counting started ${r.since}; the first whole day is still in progress.`);
    return;
  }
  const avg = (a) => (a ? `${a.perDay.toFixed(1)} a day (${a.days} day${a.days === 1 ? "" : "s"})` : "—");
  console.log(`Yesterday                ${r.yesterday}`);
  console.log(`Last 7 days, average     ${avg(r.week)}`);
  console.log(`Last 30 days, average    ${avg(r.month)}`);
  if (Object.keys(countries).length) console.log(`Where, last 30 days      ${share(countries, 8)}`);
  console.log("\nSlightly high (a relaunch checks again), and blind to copies with");
  console.log("\"Check for updates automatically\" turned off.");
}

export function print(s) {
  printDownloads(s);
  printRunning(s.running, s.checkCountries);
}

function query() {
  const out = execFileSync(
    join(root, "node_modules/.bin/wrangler"),
    ["d1", "execute", "hostbeam-downloads", "--remote", "--json", "--command",
      "SELECT day, kind, version, agent, platform, country, count FROM downloads"],
    { cwd: join(root, "apps/download-counter"), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return JSON.parse(out)[0].results;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The downloads table's rows, asking again after a failure. Wrangler's login
 * lasts an hour; on the first run after it lapses, wrangler mints a new token
 * and uses it at once, and on 2026-10-29 Cloudflare refused that brand-new
 * token ("The given account is not valid or is not authorized", 7403), then
 * took the same token seconds later. */
export async function readDownloads(run = query, wait = sleep) {
  for (const pause of [3000, 6000]) {
    try {
      return run();
    } catch {
      await wait(pause);
    }
  }
  return run();
}

/** What wrangler said went wrong. With --json it writes its error to stdout,
 * as {"error": {"text", "notes": [{"text"}]}}, and leaves stderr empty. */
export function wranglerError(e) {
  try {
    const { error } = JSON.parse(e.stdout);
    return [error.text, ...(error.notes ?? []).map((n) => n.text)].join("\n");
  } catch {
    return String(e.stderr || e.message).trim();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let rows;
  try {
    rows = await readDownloads();
  } catch (e) {
    console.error("Could not read the downloads table:");
    console.error(wranglerError(e));
    console.error("\nIf that says wrangler is not logged in: `npx wrangler login`.");
    process.exit(1);
  }
  print(summarize(rows, new Date().toISOString().slice(0, 10)));
}

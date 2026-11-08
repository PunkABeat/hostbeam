#!/usr/bin/env node
// The iPhone app on the App Store. Part of `npm run stats`.
//
//   node scripts/appstore.mjs
//
// Downloads, re-downloads and updates come from Apple's Sales and Trends
// reports; the app is free with no in-app purchase (ADR 0028), so they carry
// units, not money. Star ratings come from Apple's public lookup and need no
// key.
//
// The reports need an App Store Connect API key with the Sales role. The
// release key (App Manager, scripts/release-ios.sh) was tried first and Apple
// refused it, 2026-10-29: "The API key in use does not allow this request".
// The Sales key can read reports and nothing else, so it cannot ship or pull
// the app. It lives in the 1Password item "App Store Connect API (Sales)":
// `Key ID`, `Issuer ID`, the .p8 attached, and `Vendor Number` — the numbers
// in App Store Connect → Trends → Reports, under the "All Vendors" menu,
// separated by commas. The account has two, the individual developer account's and
// PunkABeat's, since the move to PunkABeat; a sale is in one
// vendor's report only, so both are read and added up. Or export ASC_KEY_ID,
// ASC_ISSUER_ID, ASC_KEY_PATH and ASC_VENDOR_NUMBER. The .p8 is held in
// memory, never written out.
import { execFileSync } from "node:child_process";
import { sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";

import { addDays, top } from "./downloads.mjs";

const APP_ID = "6804413107";
// Released 2026-10-09; Apple counts nothing before.
const LAUNCH = "2026-10-09";
// Where ratings are looked up besides the countries that downloaded it. The
// lookup is per storefront and rate-limited, so the list stays short.
const STOREFRONTS = ["US", "KR", "GB", "DE", "JP", "CA", "AU", "SG"];

/** A signed App Store Connect API token, good for ten minutes. */
export function token({ keyId, issuerId, privateKey }, now = Date.now()) {
  const part = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const iat = Math.floor(now / 1000);
  const input = `${part({ alg: "ES256", kid: keyId, typ: "JWT" })}.${part({
    iss: issuerId,
    iat,
    exp: iat + 600,
    aud: "appstoreconnect-v1",
  })}`;
  const signature = sign("sha256", Buffer.from(input), { key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${input}.${signature.toString("base64url")}`;
}

function lastLine(e) {
  if (e.code === "ENOENT") return "the 1Password CLI, op, is not on the PATH";
  return String(e.stderr || e.message).trim().split("\n").pop();
}

/** The key, from the environment or 1Password, found the way release-ios.sh finds its own. */
function credentials() {
  const env = process.env;
  if (env.ASC_KEY_ID && env.ASC_ISSUER_ID && env.ASC_KEY_PATH) {
    return {
      keyId: env.ASC_KEY_ID,
      issuerId: env.ASC_ISSUER_ID,
      privateKey: readFileSync(env.ASC_KEY_PATH, "utf8"),
      vendor: env.ASC_VENDOR_NUMBER,
    };
  }
  const title = (env.HOSTBEAM_ASC_STATS_OP_ITEM ?? "App Store Connect API (Sales)").trim();
  const op = (...args) => execFileSync("op", args, { encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] });
  let item;
  let privateKey;
  try {
    // Matched on the trimmed title: a leading space in a 1Password title is
    // invisible and once failed release-ios.sh's exact lookup.
    const found = JSON.parse(op("item", "list", "--format", "json")).find((i) => (i.title ?? "").trim() === title);
    if (!found) throw new Error(`no item named "${title}"`);
    item = JSON.parse(op("item", "get", found.id, "--format", "json"));
    const file = item.files?.find((f) => f.name?.endsWith(".p8"));
    if (!file) throw new Error(`no .p8 attached to "${title}"`);
    privateKey = op("read", `op://${item.vault.id}/${item.id}/${file.name}`);
  } catch (e) {
    throw new Error(`could not read the App Store Connect key from 1Password (${lastLine(e)})`);
  }
  const field = (label) => item.fields?.find((f) => (f.label ?? "").trim() === label)?.value?.trim();
  return {
    keyId: field("Key ID"),
    issuerId: field("Issuer ID"),
    privateKey,
    vendor: env.ASC_VENDOR_NUMBER ?? field("Vendor Number"),
  };
}

/** A tab-separated report → one object per line, keyed by the header. */
export function parseReport(tsv) {
  const [head, ...lines] = tsv.split("\n").map((l) => l.replace(/\r$/, "")).filter(Boolean);
  const keys = head.split("\t");
  return lines.map((l) => Object.fromEntries(l.split("\t").map((v, i) => [keys[i], v])));
}

/** Fetches one SALES/SUMMARY report: null when Apple has none for that date,
 * which means no units or not published yet (a day's report appears the next
 * morning, Pacific time). Asks for format 1_1, the one Apple moved daily
 * reports to in January 2024, and switches to whatever version a refusal
 * names. */
export function reporter({ auth, vendor, get = fetch }) {
  let version = "1_1";
  return async function report(frequency, date) {
    for (;;) {
      const q = new URLSearchParams({
        "filter[frequency]": frequency,
        "filter[reportDate]": date,
        "filter[reportSubType]": "SUMMARY",
        "filter[reportType]": "SALES",
        "filter[vendorNumber]": vendor,
        "filter[version]": version,
      });
      const res = await get(`https://api.appstoreconnect.apple.com/v1/salesReports?${q}`, {
        headers: { Authorization: `Bearer ${auth()}`, Accept: "application/a-gzip" },
      });
      if (res.status === 404) return null;
      if (res.ok) {
        const body = Buffer.from(await res.arrayBuffer());
        const gzipped = body[0] === 0x1f && body[1] === 0x8b;
        return parseReport((gzipped ? gunzipSync(body) : body).toString("utf8"));
      }
      const text = await res.text();
      const latest = /latest version for this report is (\d+_\d+)/i.exec(text)?.[1];
      if (res.status === 400 && latest && latest !== version) {
        version = latest;
        continue;
      }
      let detail = text;
      try {
        detail = JSON.parse(text).errors.map((e) => e.detail ?? e.title).join("; ");
      } catch {}
      const hint =
        res.status === 401 || res.status === 403
          ? " Sales reports need a key with the Sales role (or Finance or Admin); the App Manager release key is refused."
          : "";
      throw new Error(
        `Apple answered ${res.status} for vendor ${vendor}'s ${frequency.toLowerCase()} report of ${date}: ${detail}.${hint}`,
      );
    }
  };
}

/** One report from several vendors' reports: their lines together, or null
 * when none of them has any. */
export function combine(reports) {
  return async (frequency, date) => {
    const found = (await Promise.all(reports.map((r) => r(frequency, date)))).filter(Boolean);
    return found.length ? found.flat() : null;
  };
}

// Apple's product type identifiers: iPhone (1), universal (F), iPad (T), Mac (F-first).
const KIND = {
  1: "first", "1F": "first", "1T": "first", F1: "first",
  3: "again", "3F": "again", "3T": "again", F3: "again",
  7: "update", "7F": "update", "7T": "update", F7: "update",
};

const none = () => ({ first: 0, again: 0, update: 0, countries: {} });

/** Adds a report's lines for this app to `into`. */
export function tally(rows, into = none()) {
  for (const r of rows ?? []) {
    if (r["Apple Identifier"] !== APP_ID) continue;
    const kind = KIND[r["Product Type Identifier"]];
    if (!kind) continue;
    const units = Number(r.Units);
    into[kind] += units;
    if (kind === "first") into.countries[r["Country Code"]] = (into.countries[r["Country Code"]] ?? 0) + units;
  }
  return into;
}

async function pool(items, n, work) {
  const queue = [...items];
  await Promise.all(Array.from({ length: n }, async () => {
    while (queue.length) await work(queue.shift());
  }));
}

/** Units since launch and for the 30 days to yesterday. Whole months before
 * this one come from their monthly report; a month Apple has not published
 * yet (it does early the next month) is read day by day, and so are the last
 * 30 days, which may straddle a monthly one — counted once in each column. */
export async function units(report, today, launch = LAUNCH) {
  const yesterday = addDays(today, -1);
  const from = [addDays(today, -30), launch].sort()[1];
  const thisMonth = today.slice(0, 7);
  const monthly = new Map();
  for (let m = launch.slice(0, 7); m < thisMonth; m = addDays(`${m}-28`, 7).slice(0, 7)) {
    monthly.set(m, await report("MONTHLY", m));
  }
  const days = [];
  for (let d = launch; d <= yesterday; d = addDays(d, 1)) {
    if (d >= from || !monthly.get(d.slice(0, 7))) days.push(d);
  }
  const daily = new Map();
  await pool(days, 5, async (d) => daily.set(d, await report("DAILY", d)));

  const all = none();
  const recent = none();
  const months = {};
  for (const [m, rows] of monthly) {
    if (!rows) continue;
    tally(rows, all);
    months[m] = tally(rows).first;
  }
  for (const [d, rows] of daily) {
    if (d >= from) tally(rows, recent);
    if (monthly.get(d.slice(0, 7))) continue;
    tally(rows, all);
    months[d.slice(0, 7)] = (months[d.slice(0, 7)] ?? 0) + tally(rows).first;
  }
  return { all, recent, months, through: yesterday };
}

/** Star ratings, per storefront, from Apple's public lookup. A storefront
 * that fails or has none is left out. */
export async function ratings(countries, get = fetch) {
  const list = [...new Set([...countries, ...STOREFRONTS])].slice(0, 15);
  const found = await Promise.all(
    list.map(async (country) => {
      try {
        const res = await get(`https://itunes.apple.com/lookup?id=${APP_ID}&country=${country.toLowerCase()}`);
        const app = (await res.json()).results?.[0];
        return app?.userRatingCount ? { country, count: app.userRatingCount, average: app.averageUserRating } : null;
      } catch {
        return null;
      }
    }),
  );
  return { looked: list.length, found: found.filter(Boolean) };
}

export function printUnits(u) {
  const rows = [
    ["First downloads", u.all.first, u.recent.first],
    ["Re-downloads", u.all.again, u.recent.again],
    ["Updates installed", u.all.update, u.recent.update],
  ];
  const label = Math.max(...rows.map((r) => r[0].length));
  console.log(`${"".padEnd(label)}  ${"all time".padStart(8)}  ${"30 days".padStart(8)}`);
  for (const [l, a, r] of rows) console.log(`${l.padEnd(label)}  ${String(a).padStart(8)}  ${String(r).padStart(8)}`);
  const months = Object.entries(u.months).filter(([, v]) => v);
  if (months.length) console.log(`\nFirst downloads by month: ${months.sort().map(([m, v]) => `${m} ${v}`).join(", ")}`);
  if (Object.keys(u.all.countries).length) console.log(`Countries: ${top(u.all.countries, 10)}`);
  console.log(`Apple's reports run to ${u.through}, and a day's report appears the next morning (Pacific time).`);
}

export function printRatings(r) {
  if (!r.found.length) {
    console.log(`Ratings: none yet (looked in ${r.looked} storefronts)`);
    return;
  }
  const count = r.found.reduce((n, f) => n + f.count, 0);
  const average = r.found.reduce((n, f) => n + f.count * f.average, 0) / count;
  const where = r.found.sort((a, b) => b.count - a.count).map((f) => `${f.country} ${f.count}`).join(", ");
  console.log(`Ratings: ${average.toFixed(1)}★ from ${count} (${where}; looked in ${r.looked} storefronts)`);
}

/** Reads Apple and prints the App Store part. The ratings print even when the
 * reports cannot be read; the reports' failure is then thrown, with a sentence. */
export async function appStore(today) {
  console.log(`Hostbeam for iPhone on the App Store, since ${LAUNCH}\n`);
  let failure = null;
  let countries = [];
  try {
    const key = credentials();
    if (!key.keyId || !key.issuerId) throw new Error("the 1Password item needs `Key ID` and `Issuer ID` fields");
    const vendors = (key.vendor ?? "").split(/[\s,]+/).filter(Boolean);
    if (!vendors.length) {
      throw new Error(
        "no vendor number. Add a `Vendor Number` field to the 1Password item \"App Store Connect API (Sales)\" with the numbers in App Store Connect → Trends → Reports, under \"All Vendors\" or export ASC_VENDOR_NUMBER",
      );
    }
    let cached = null;
    const auth = () => {
      // Renewed well before its ten minutes run out.
      if (!cached || Date.now() - cached.at > 5 * 60_000) cached = { at: Date.now(), jwt: token(key) };
      return cached.jwt;
    };
    const u = await units(combine(vendors.map((vendor) => reporter({ auth, vendor }))), today);
    printUnits(u);
    countries = Object.keys(u.all.countries);
  } catch (e) {
    failure = e;
    console.log(`Downloads: unavailable, see below.`);
  }
  printRatings(await ratings(countries));
  if (failure) throw failure;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await appStore(new Date().toISOString().slice(0, 10));
  } catch (e) {
    console.error(`\nCould not read the App Store reports: ${e.message}`);
    process.exit(1);
  }
}

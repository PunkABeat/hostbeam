import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import { gzipSync } from "node:zlib";

import { combine, parseReport, ratings, reporter, tally, token, units } from "./appstore.mjs";

test("the token is an ES256 JWT that Apple's key check would accept", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" });
  const jwt = token({ keyId: "KEY123", issuerId: "issuer-uuid", privateKey: pem }, 1_800_000_000_000);
  const [h, p, s] = jwt.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(h, "base64url")), { alg: "ES256", kid: "KEY123", typ: "JWT" });
  assert.deepEqual(JSON.parse(Buffer.from(p, "base64url")), {
    iss: "issuer-uuid",
    iat: 1_800_000_000,
    exp: 1_800_000_600,
    aud: "appstoreconnect-v1",
  });
  // JWTs carry the raw r||s signature (64 bytes), not DER.
  const sig = Buffer.from(s, "base64url");
  assert.equal(sig.length, 64);
  assert.ok(verify("sha256", Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, sig));
});

const HEAD = [
  "Provider", "Provider Country", "SKU", "Developer", "Title", "Version", "Product Type Identifier", "Units",
  "Developer Proceeds", "Begin Date", "End Date", "Customer Currency", "Country Code", "Currency of Proceeds",
  "Apple Identifier", "Customer Price",
].join("\t");

const line = (type, units, country, app = "6804413107") =>
  ["APPLE", "US", "hostbeam", "PunkABeat", "Hostbeam", "1.0", type, String(units), "0", "10/20/2026", "10/20/2026",
    "USD", country, "USD", app, "0"].join("\t");

const report = (...lines) => `${HEAD}\n${lines.join("\n")}\n`;

test("a report's lines are keyed by its header", () => {
  const [row] = parseReport(report(line("1F", 3, "US")).replace(/\n/g, "\r\n"));
  assert.equal(row["Product Type Identifier"], "1F");
  assert.equal(row.Units, "3");
  assert.equal(row["Country Code"], "US");
  assert.equal(row["Customer Price"], "0");
});

test("downloads, re-downloads and updates are told apart, for this app only", () => {
  const t = tally(
    parseReport(
      report(line("1F", 3, "US"), line("1", 1, "DE"), line("3F", 2, "US"), line("7F", 5, "US"), line("1F", 9, "US", "999")),
    ),
  );
  assert.deepEqual(t, { first: 4, again: 2, update: 5, countries: { US: 3, DE: 1 } });
});

const ok = (text, gzip = true) => ({
  ok: true,
  status: 200,
  arrayBuffer: async () => (gzip ? gzipSync(text) : Buffer.from(text)),
});
const refused = (status, detail) => ({
  ok: false,
  status,
  text: async () => JSON.stringify({ errors: [{ status: String(status), detail }] }),
});

test("a report is unzipped, and a date with none reads as null", async () => {
  const urls = [];
  const get = async (url) => {
    urls.push(decodeURIComponent(url));
    return url.includes("2026-10-21") ? { ok: false, status: 404, text: async () => "" } : ok(report(line("1F", 2, "US")));
  };
  const r = reporter({ auth: () => "jwt", vendor: "85000000", get });
  assert.equal(tally(await r("DAILY", "2026-10-20")).first, 2);
  assert.equal(await r("DAILY", "2026-10-21"), null);
  assert.match(urls[0], /filter\[vendorNumber\]=85000000/);
  assert.match(urls[0], /filter\[version\]=1_1/);
});

test("a refused format version is swapped for the one Apple names, and kept", async () => {
  const versions = [];
  const get = async (url) => {
    const v = new URL(url).searchParams.get("filter[version]");
    versions.push(v);
    return v === "1_1"
      ? refused(400, "The version parameter you have specified is invalid. The latest version for this report is 1_0.")
      : ok(report(line("1F", 1, "US")));
  };
  const r = reporter({ auth: () => "jwt", vendor: "1", get });
  await r("DAILY", "2026-10-20");
  await r("DAILY", "2026-10-21");
  assert.deepEqual(versions, ["1_1", "1_0", "1_0"]);
});

test("a key Apple refuses says so, and names the likely fix", async () => {
  const r = reporter({ auth: () => "jwt", vendor: "1", get: async () => refused(403, "You do not have access to this resource.") });
  await assert.rejects(r("DAILY", "2026-10-20"), /Apple answered 403 for vendor 1's daily report .*You do not have access.*the Sales role/);
});

test("both vendors' reports are read and added up; none from either is none", async () => {
  const older = async (f, d) => (d === "2026-10-20" ? parseReport(report(line("1F", 2, "US"))) : null);
  const punkabeat = async (f, d) => (d <= "2026-10-20" ? parseReport(report(line("1F", 3, "DE"))) : null);
  const both = combine([older, punkabeat]);
  assert.deepEqual(tally(await both("DAILY", "2026-10-20")).countries, { US: 2, DE: 3 });
  assert.equal(tally(await both("DAILY", "2026-10-19")).first, 3);
  assert.equal(await both("DAILY", "2026-10-21"), null);
});

test("published months are read whole; the rest, and the last 30 days, day by day", async () => {
  const asked = [];
  const fake = async (frequency, date) => {
    asked.push(`${frequency} ${date}`);
    if (frequency === "MONTHLY") return date === "2026-10" ? parseReport(report(line("1F", 10, "US"), line("7F", 4, "US"))) : null;
    // One download a day, and an update on the last day of November.
    return parseReport(report(line("1F", 1, "DE"), ...(date === "2026-11-30" ? [line("7F", 1, "DE")] : [])));
  };
  const u = await units(fake, "2026-12-03", "2026-10-09");
  // October is published; November is not yet, so it is read by day.
  assert.deepEqual(asked.filter((a) => a.startsWith("MONTHLY")), ["MONTHLY 2026-10", "MONTHLY 2026-11"]);
  const days = asked.filter((a) => a.startsWith("DAILY")).map((a) => a.slice(6));
  assert.equal(days[0], "2026-11-01"); // nothing from October, which the monthly covers
  assert.equal(days.at(-1), "2026-12-02"); // yesterday
  assert.equal(days.length, 32);
  // All time: October's 10, then 32 days at one each. The 30 days: 11-03 … 12-02.
  assert.deepEqual(u.all, { first: 42, again: 0, update: 5, countries: { US: 10, DE: 32 } });
  assert.deepEqual(u.recent, { first: 30, again: 0, update: 1, countries: { DE: 30 } });
  assert.deepEqual(u.months, { "2026-10": 10, "2026-11": 30, "2026-12": 2 });
  assert.equal(u.through, "2026-12-02");
});

test("in the launch month everything is read by day, from launch to yesterday", async () => {
  const asked = [];
  const u = await units(async (f, d) => (asked.push(`${f} ${d}`), null), "2026-10-29", "2026-10-09");
  assert.equal(asked.length, 20); // 10-09 … 10-28, and no monthly report yet
  assert.ok(asked.every((a) => a.startsWith("DAILY")));
  assert.deepEqual(u.all, { first: 0, again: 0, update: 0, countries: {} });
});

test("ratings add up across storefronts; a failed or empty one is left out", async () => {
  const get = async (url) => {
    const country = new URL(url).searchParams.get("country");
    if (country === "de") throw new Error("rate limited");
    const results = country === "us" ? [{ userRatingCount: 3, averageUserRating: 5 }] : country === "fr" ? [] : [{ userRatingCount: 0 }];
    return { json: async () => ({ results }) };
  };
  const r = await ratings(["FR"], get);
  assert.deepEqual(r.found, [{ country: "US", count: 3, average: 5 }]);
  assert.equal(r.looked, 9); // FR, then the eight default storefronts
});

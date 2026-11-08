#!/usr/bin/env node
// What Hostbeam has sold, from Paddle (live). Part of `npm run stats`.
//
//   node scripts/sales.mjs
//
// Reads every completed transaction with find-license.mjs's read key (the
// "Paddle" item's "PADDLE_API_KEY (live)" field, or PADDLE_API_KEY in the
// environment). Live only: the sandbox never takes money. The live account
// sells nothing but Hostbeam, so nothing is filtered by product.
//
// Money is summed in the payout currency, Paddle's conversion of each sale
// into what lands in the balance, so sales in different currencies add up and
// the lines check: customers paid, less tax, Paddle's fee and refunds, is
// yours. A licence handed out with grant-license.mjs is a $0 transaction:
// counted apart, never as a sale.
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { addDays, top } from "./downloads.mjs";

const API = "https://api.paddle.com";
const PADDLE_ITEM = "Paddle"; // the 1Password item title (live)
const PADDLE_FIELD = "PADDLE_API_KEY (live)";

function apiKey() {
  if (process.env.PADDLE_API_KEY) return process.env.PADDLE_API_KEY.trim();
  try {
    return execFileSync("op", ["item", "get", PADDLE_ITEM, "--fields", `label=${PADDLE_FIELD}`, "--reveal"], {
      encoding: "utf8",
      stdio: ["inherit", "pipe", "pipe"],
    }).trim();
  } catch (e) {
    const why =
      e.code === "ENOENT" ? "the 1Password CLI, op, is not on the PATH" : String(e.stderr || e.message).trim().split("\n").pop();
    throw new Error(
      `could not read the Paddle key from 1Password (${why}). Run it from a terminal so 1Password can ask, or export PADDLE_API_KEY.`,
    );
  }
}

/** Every completed transaction, following Paddle's pages. Asks for each
 * buyer's address too, for the countries; a key without the address
 * permission gets a 403 for that, and the sales are read again without. */
export async function transactions(key, get = fetch) {
  const list = async (withAddress) => {
    const out = [];
    let url = `${API}/transactions?status=completed${withAddress ? "&include=address" : ""}`;
    while (url) {
      const res = await get(url, { headers: { Authorization: `Bearer ${key}` } });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = new Error(`Paddle answered ${res.status}: ${body.error?.detail ?? res.statusText}`);
        err.status = res.status;
        throw err;
      }
      const body = await res.json();
      out.push(...body.data);
      url = body.meta?.pagination?.has_more ? body.meta.pagination.next : null;
    }
    return out;
  };
  try {
    return { rows: await list(true), countries: true };
  } catch (e) {
    if (e.status !== 403) throw e;
    return { rows: await list(false), countries: false };
  }
}

const MONEY = ["paid", "tax", "fee", "refunds", "yours"];

const blank = () => ({ sales: 0, refunded: 0, ...Object.fromEntries(MONEY.map((k) => [k, {}])) });

function add(sums, currency, amount) {
  sums[currency] = (sums[currency] ?? 0) + amount;
}

/** Totals for the report, from Paddle's transactions. Amounts stay in the
 * currency's smallest unit (cents), keyed by currency. `today` is YYYY-MM-DD
 * (UTC); the 30-day column starts 29 days before it, as the downloads' does. */
export function summarizeSales(txns, today) {
  const recent = addDays(today, -29);
  const all = blank();
  const last30 = blank();
  const months = {};
  const countries = {};
  let given = 0;
  let first = null;
  for (const t of txns) {
    const day = (t.billed_at ?? t.created_at).slice(0, 10);
    if (Number(t.details.totals.total) === 0) {
      given += 1;
      continue;
    }
    const payout = Boolean(t.details.payout_totals);
    const p = payout ? t.details.payout_totals : t.details.totals;
    const a = (payout ? t.details.adjusted_payout_totals : t.details.adjusted_totals) ?? p;
    const refunded = Number(a.total) < Number(p.total);
    for (const s of day >= recent ? [all, last30] : [all]) {
      s.sales += 1;
      if (refunded) s.refunded += 1;
      add(s.paid, p.currency_code, Number(p.total));
      add(s.tax, p.currency_code, Number(p.tax));
      add(s.fee, p.currency_code, Number(p.fee));
      add(s.refunds, p.currency_code, Number(p.earnings) - Number(a.earnings));
      add(s.yours, p.currency_code, Number(a.earnings));
    }
    if (!first || day < first) first = day;
    months[day.slice(0, 7)] = (months[day.slice(0, 7)] ?? 0) + 1;
    const country = t.address?.country_code;
    if (country) countries[country] = (countries[country] ?? 0) + 1;
  }
  return { first, all, last30, months, countries, given };
}

/** Smallest units → "$87.00"; several currencies are joined with " + ". */
export function money(sums, sign = 1) {
  const parts = Object.entries(sums).map(([currency, amount]) => {
    const f = new Intl.NumberFormat("en-US", { style: "currency", currency });
    return f.format((sign * amount || 0) / 10 ** f.resolvedOptions().maximumFractionDigits);
  });
  return parts.length ? parts.join(" + ") : "0";
}

export function printSales(s, countriesRead = true) {
  // A column with no sales shows the all-time currencies at zero, not a bare 0.
  const zero = Object.fromEntries(Object.keys(s.all.paid).map((c) => [c, 0]));
  const m = (sums, sign) => money(Object.keys(sums).length ? sums : zero, sign);
  if (!s.first) {
    console.log("No sales yet.");
  } else {
    const rows = [
      ["Licences sold", String(s.all.sales), String(s.last30.sales)],
      ["  of them refunded", String(s.all.refunded), String(s.last30.refunded)],
      null,
      ["Customers paid", m(s.all.paid), m(s.last30.paid)],
      ["  sales tax (Paddle pays it)", m(s.all.tax, -1), m(s.last30.tax, -1)],
      ["  Paddle's fee", m(s.all.fee, -1), m(s.last30.fee, -1)],
      ["  refunds", m(s.all.refunds, -1), m(s.last30.refunds, -1)],
      ["= Yours", m(s.all.yours), m(s.last30.yours)],
    ];
    const label = Math.max(...rows.filter(Boolean).map((r) => r[0].length));
    const width = Math.max(10, ...rows.filter(Boolean).flatMap((r) => [r[1].length, r[2].length]));
    console.log(`Hostbeam sales through Paddle, since ${s.first}\n`);
    console.log(`${"".padEnd(label)}  ${"all time".padStart(width)}  ${"30 days".padStart(width)}`);
    for (const r of rows) {
      console.log(r ? `${r[0].padEnd(label)}  ${r[1].padStart(width)}  ${r[2].padStart(width)}` : "");
    }
    console.log(`\nSales by month: ${Object.entries(s.months).sort().map(([m, v]) => `${m} ${v}`).join(", ")}`);
    if (Object.keys(s.countries).length) console.log(`Countries: ${top(s.countries, 10)}`);
    else if (!countriesRead) console.log("Countries: the Paddle key cannot read addresses (needs address read).");
  }
  if (s.given) console.log(`Licences given away (grant-license.mjs): ${s.given}`);
}

/** Reads Paddle and prints the sales. Throws, with a sentence, on failure. */
export async function sales(today) {
  const { rows, countries } = await transactions(apiKey());
  printSales(summarizeSales(rows, today), countries);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await sales(new Date().toISOString().slice(0, 10));
  } catch (e) {
    console.error(`Could not read the sales: ${e.message}`);
    process.exit(1);
  }
}

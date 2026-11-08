import { test } from "node:test";
import assert from "node:assert/strict";

import { money, summarizeSales, transactions } from "./sales.mjs";

// A completed Paddle transaction, cut down to the fields the report reads.
// Amounts are strings in the smallest unit, as Paddle sends them.
const txn = (day, { total = "2900", tax = "263", fee = "195", refundedEarnings, country = "US" } = {}) => {
  const earnings = String(Number(total) - Number(tax) - Number(fee));
  const payout = { total, tax, fee, earnings, currency_code: "USD" };
  return {
    billed_at: `${day}T10:00:00.000000Z`,
    created_at: `${day}T09:59:00.000000Z`,
    address: country ? { country_code: country } : undefined,
    details: {
      totals: { ...payout, currency_code: "EUR" },
      payout_totals: payout,
      adjusted_payout_totals:
        refundedEarnings === undefined ? payout : { ...payout, total: "0", earnings: refundedEarnings },
    },
  };
};

test("sales add up in the payout currency, and the lines check", () => {
  const s = summarizeSales(
    [
      txn("2026-08-30", { country: "DE" }), // outside the 30 days
      txn("2026-10-20"),
      txn("2026-10-21", { refundedEarnings: "0" }),
    ],
    "2026-10-29",
  );
  assert.equal(s.first, "2026-08-30");
  assert.equal(s.all.sales, 3);
  assert.equal(s.last30.sales, 2);
  assert.equal(s.all.refunded, 1);
  assert.deepEqual(s.all.paid, { USD: 8700 });
  assert.deepEqual(s.last30.paid, { USD: 5800 });
  // Paid, less tax, fee and refunds, is what is yours.
  const yours = 8700 - 3 * 263 - 3 * 195 - (2900 - 263 - 195);
  assert.deepEqual(s.all.yours, { USD: yours });
  assert.deepEqual(s.all.refunds, { USD: 2900 - 263 - 195 });
  assert.deepEqual(s.months, { "2026-08": 1, "2026-10": 2 });
  assert.deepEqual(s.countries, { DE: 1, US: 2 });
});

test("a licence given away is a $0 transaction, counted apart from sales", () => {
  const s = summarizeSales([txn("2026-10-20", { total: "0", tax: "0", fee: "0" }), txn("2026-10-21")], "2026-10-29");
  assert.equal(s.given, 1);
  assert.equal(s.all.sales, 1);
});

test("no sales leaves no first day, so the report says so", () => {
  assert.equal(summarizeSales([], "2026-10-29").first, null);
});

test("money is shown in the currency's own units", () => {
  assert.equal(money({ USD: 8700 }), "$87.00");
  assert.equal(money({ USD: 263 }, -1), "-$2.63");
  assert.equal(money({ JPY: 3900 }), "¥3,900");
  assert.equal(money({ USD: 100, EUR: 250 }), "$1.00 + €2.50");
  assert.equal(money({}), "0");
  assert.equal(money({ USD: 0 }, -1), "$0.00"); // not "-$0.00"
});

const page = (data, next) => ({
  ok: true,
  status: 200,
  json: async () => ({ data, meta: { pagination: { has_more: Boolean(next), next } } }),
});

test("every page is read, with the buyers' addresses", async () => {
  const urls = [];
  const get = async (url) => {
    urls.push(url);
    return url.includes("after=") ? page([{ id: "b" }]) : page([{ id: "a" }], "https://api.paddle.com/transactions?after=a");
  };
  const { rows, countries } = await transactions("key", get);
  assert.deepEqual(rows.map((r) => r.id), ["a", "b"]);
  assert.equal(countries, true);
  assert.match(urls[0], /status=completed&include=address$/);
});

test("a key that cannot read addresses still gets the sales, without countries", async () => {
  const get = async (url) =>
    url.includes("include=address")
      ? { ok: false, status: 403, json: async () => ({ error: { detail: "You aren't permitted to perform this request." } }) }
      : page([{ id: "a" }]);
  const { rows, countries } = await transactions("key", get);
  assert.deepEqual(rows.map((r) => r.id), ["a"]);
  assert.equal(countries, false);
});

test("a key that cannot read sales says what Paddle answered", async () => {
  const get = async () => ({ ok: false, status: 403, json: async () => ({ error: { detail: "You aren't permitted to perform this request." } }) });
  await assert.rejects(transactions("key", get), /Paddle answered 403: You aren't permitted/);
});

#!/usr/bin/env node
// Support lookup: "I lost my licence key."
//
//   node scripts/find-license.mjs someone@example.com
//   node scripts/find-license.mjs txn_01xxxxxxxxxxxxxxxxxxxxxxxx
//
// Why it pivots through Paddle rather than searching Keygen directly:
// Keygen's `metadata[email]` filter is EXACT and CASE-SENSITIVE (verified
// 2026-08-30 — "Some.Buyer@…" finds nothing when the stored value is
// lowercase), and support requests are exactly where casing varies. Paddle's
// customer search IS case-insensitive, so we resolve the address there, take the
// machine-generated transaction id, and look Keygen up by that. Neither system
// does partial matches, so the full address is required either way.
//
// Secrets come from 1Password at call time; nothing is stored in the repo.
// Requires `op` to be signed in (biometric prompt is fine).
import { execFileSync } from "node:child_process";

const PADDLE_ITEM = "Paddle"; // the 1Password item title (live)
const KEYGEN_ACCOUNT = "4889da55-f7f4-45dd-9d74-a2c0fec98cd3";

const arg = process.argv[2];
if (!arg) {
  console.error("usage: node scripts/find-license.mjs <email|txn_id>");
  process.exit(1);
}

// Prefer an env var when one is set (CI, or a shell that already exported it),
// otherwise ask 1Password. `op` needs an interactive terminal for its biometric
// prompt — it times out when run from a non-tty, which is a confusing failure if
// you only see the stack trace.
const secret = (envVar, item, label) => {
  if (process.env[envVar]) return process.env[envVar].trim();
  try {
    return execFileSync("op", ["item", "get", item, "--fields", `label=${label}`, "--reveal"], {
      encoding: "utf8",
      stdio: ["inherit", "pipe", "pipe"],
    }).trim();
  } catch (e) {
    console.error(`\nCould not read ${envVar} from 1Password (item "${item}", field "${label}").`);
    console.error(`  ${String(e.stderr || e.message).trim().split("\n").pop()}`);
    console.error(`\nRun this from an interactive terminal so 1Password can prompt, or set it:`);
    console.error(`  export ${envVar}="$(op item get '${item}' --fields 'label=${label}' --reveal)"\n`);
    process.exit(1);
  }
};

const paddleKey = secret("PADDLE_API_KEY", PADDLE_ITEM, "PADDLE_API_KEY (live)");
// The product token, not the admin one: this script only ever reads Hostbeam
// licences, and the account also hosts other software.
const keygenToken = secret("KEYGEN_TOKEN", "Keygen", "PRODUCT TOKEN (Hostbeam)");

const paddle = async (path) => {
  const res = await fetch(`https://api.paddle.com${path}`, {
    headers: { Authorization: `Bearer ${paddleKey}` },
  });
  if (!res.ok) throw new Error(`paddle ${path} -> ${res.status}`);
  return res.json();
};

const keygen = async (query) => {
  const res = await fetch(
    `https://api.keygen.sh/v1/accounts/${KEYGEN_ACCOUNT}/licenses?limit=10&${query}`,
    { headers: { Authorization: `Bearer ${keygenToken}`, Accept: "application/vnd.api+json" } },
  );
  if (!res.ok) throw new Error(`keygen -> ${res.status}`);
  return res.json();
};

// Resolve the argument to a set of Paddle transaction ids.
let transactionIds = [];
let who = arg;

if (arg.startsWith("txn_")) {
  transactionIds = [arg];
} else {
  const { data: customers } = await paddle(`/customers?search=${encodeURIComponent(arg)}`);
  if (!customers.length) {
    console.log(`No Paddle customer matches "${arg}".`);
    console.log("Paddle search is case-insensitive but NOT partial — use the full address.");
    console.log("If they bought through the App Store, the purchase is Apple's, not Paddle's.");
    process.exit(0);
  }
  for (const c of customers) {
    who = `${c.email} (${c.id})`;
    const { data: txns } = await paddle(`/transactions?customer_id=${c.id}&per_page=50`);
    transactionIds.push(...txns.filter((t) => t.status === "completed").map((t) => t.id));
  }
}

console.log(`\nCustomer : ${who}`);
console.log(`Completed transactions: ${transactionIds.length || "none"}\n`);

for (const txn of transactionIds) {
  const { data } = await keygen(`metadata%5BpaddleTransactionId%5D=${encodeURIComponent(txn)}`);
  if (!data.length) {
    console.log(`  ${txn}`);
    console.log(`     no licence — the webhook may have failed; check wrangler tail / Paddle deliveries\n`);
    continue;
  }
  for (const l of data) {
    const a = l.attributes;
    console.log(`  ${txn}`);
    console.log(`     key      ${a.key}`);
    console.log(`     status   ${a.status}${a.suspended ? "  (SUSPENDED — refunded)" : ""}`);
    console.log(`     expires  ${a.expiry}`);
    console.log(`     seats    ${a.machinesCount ?? 0} / ${a.maxMachines}`);
    console.log(`     email    ${(a.metadata || {}).email || "(empty)"}\n`);
  }
}

console.log("Self-service alternative: their Paddle receipt carries the transaction id,");
console.log("and https://hostbeam.app/thanks?transaction_id=<id> shows the key again.\n");

#!/usr/bin/env node
// Mint a free Hostbeam licence for someone — open-source maintainers, a
// reviewer, a bug reporter, whoever earns one.
//
//   node scripts/grant-license.mjs "github.com/sindresorhus/ava"
//   node scripts/grant-license.mjs "conf talk giveaway" --sandbox
//
// Prints a one-time checkout link. The recipient opens it, enters an email,
// clicks "Complete checkout" — Paddle shows "There is nothing to pay!" and no
// card step — and the ordinary purchase pipeline does the rest: webhook →
// Keygen licence → key email. Nothing about grants is special-cased in the
// worker, which is why this is worth doing this way rather than minting Keygen
// licences directly: the recipient's experience, and ours, is the tested one.
//
// There is deliberately NO discount code. A `mode: custom` discount never
// appears in the catalog and carries `code: null`, so there is nothing to leak,
// guess, or post on a deals site — the grant exists only as the link you send.
// It is single-use and expires, so a forwarded link is worth little.
//
// Verified end to end in sandbox on 2026-08-30, including that a $0 transaction
// really does fire `transaction.completed` (licence 4059f5ad).
import { execFileSync } from "node:child_process";

// Granting needs discount:write and transaction:write. The worker's live key
// deliberately has neither — it only reads customers — and widening it to make
// this script work would hand write access to the credential that sits in a
// public-facing Worker. So this uses its OWN key.
//
// Create it once: Paddle → Authentication → New API key, named e.g.
// "hostbeam-ops", with discount (read+write) and transaction (read+write).
// Store it in 1Password on the "Paddle" item as "PADDLE_API_KEY (live ops)".
const LIVE = {
  price: "pri_01m15nt3w2ppdapcr5yak5vtag",
  api: "https://api.paddle.com",
  item: "Paddle",
  field: "PADDLE_API_KEY (live ops)",
};
const SANDBOX = {
  price: "pri_01kwpqz63xx8ynp1a3h2k4560a",
  api: "https://sandbox-api.paddle.com",
  item: "Paddle sandbox",
  field: "PADDLE_API_KEY (sandbox)",
};

const args = process.argv.slice(2);
const sandbox = args.includes("--sandbox");
const reason = args.find((a) => !a.startsWith("--"));
const days = Number(args.find((a) => a.startsWith("--days="))?.split("=")[1] ?? 30);

if (!reason) {
  console.error('usage: node scripts/grant-license.mjs "who and why" [--sandbox] [--days=30]');
  console.error('  the reason is stored on the discount for your own records, not shown to them');
  process.exit(1);
}

const env = sandbox ? SANDBOX : LIVE;

const key =
  process.env.PADDLE_API_KEY ||
  (() => {
    try {
      return execFileSync("op", ["item", "get", env.item, "--fields", `label=${env.field}`, "--reveal"], {
        encoding: "utf8",
        stdio: ["inherit", "pipe", "pipe"],
      }).trim();
    } catch (e) {
      console.error(`\nCould not read the Paddle API key from 1Password ("${env.field}").`);
      console.error(`  ${String(e.stderr || e.message).trim().split("\n").pop()}`);
      console.error(`\nRun from an interactive terminal so 1Password can prompt, or:`);
      console.error(`  export PADDLE_API_KEY="$(op item get '${env.item}' --fields 'label=${env.field}' --reveal)"\n`);
      process.exit(1);
    }
  })();

const paddle = async (path, body) => {
  const res = await fetch(`${env.api}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    const err = json?.error ?? {};
    console.error(`\nPaddle ${path} -> ${res.status}: ${err.code ?? ""} ${err.detail ?? ""}`);
    if (res.status === 403) {
      console.error("\nThis needs an OPS key, not the worker's. The worker's live key only");
      console.error("reads customers, and widening it would give write access to a credential");
      console.error("living in a public-facing Worker.");
      console.error("\nPaddle → Authentication → New API key, e.g. \"hostbeam-ops\", with");
      console.error("discount (read+write) and transaction (read+write). Store it in 1Password");
      console.error("on the \"Paddle\" item as \"PADDLE_API_KEY (live ops)\".\n");
    }
    process.exit(1);
  }
  return json.data;
};

const discount = await paddle("/discounts", {
  description: `Grant: ${reason}`,
  type: "percentage",
  amount: "100",
  mode: "custom", // never listed in the catalog; code is null
  usage_limit: 1,
  restrict_to: [env.price],
  expires_at: new Date(Date.now() + days * 86400_000).toISOString(),
});

const txn = await paddle("/transactions", {
  items: [{ price_id: env.price, quantity: 1 }],
  discount_id: discount.id,
});

const expires = new Date(discount.expires_at).toLocaleDateString("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

console.log(`\n  ${sandbox ? "SANDBOX " : ""}grant for: ${reason}`);
console.log(`  expires  : ${expires} (single use)`);
console.log(`  discount : ${discount.id}`);
console.log(`\n  Send them this link:\n`);
console.log(`  ${txn.checkout.url}\n`);
console.log(`  They enter an email and click "Complete checkout" — no card.`);
console.log(`  The licence key is emailed to them, as with any purchase.\n`);

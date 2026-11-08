import { beforeEach, describe, expect, it } from "vitest";

import {
  IP_ALLOWLIST_TTL_S,
  MAX_SIGNATURE_AGE_S,
  completedTransaction,
  ipInCidrs,
  isIpv4,
  paddleWebhookCidrs,
  parseIpAllowlist,
  resetIpAllowlistCache,
  parseSignatureHeader,
  refundedTransaction,
  signedPayloadHmac,
  timingSafeEqualHex,
  verifyWebhook,
} from "./paddle";

const SECRET = "pdl_ntfset_test_secret";
const BODY = '{"event_type":"transaction.completed","data":{"id":"txn_abc"}}';

async function header(ts: number, body = BODY, secret = SECRET): Promise<string> {
  return `ts=${ts};h1=${await signedPayloadHmac(secret, ts, body)}`;
}

describe("signature verification", () => {
  const now = 1_800_000_000;

  it("accepts a fresh, correctly signed body", async () => {
    expect(await verifyWebhook(SECRET, await header(now - 30), BODY, now)).toBe(true);
  });

  it("rejects a tampered body", async () => {
    const h = await header(now);
    expect(await verifyWebhook(SECRET, h, BODY.replace("txn_abc", "txn_evil"), now)).toBe(false);
  });

  it("rejects the wrong secret", async () => {
    const h = await header(now, BODY, "other_secret");
    expect(await verifyWebhook(SECRET, h, BODY, now)).toBe(false);
  });

  it("rejects replays outside the tolerance window", async () => {
    const stale = now - MAX_SIGNATURE_AGE_S - 1;
    expect(await verifyWebhook(SECRET, await header(stale), BODY, now)).toBe(false);
  });

  it("rejects missing or malformed headers", async () => {
    expect(await verifyWebhook(SECRET, null, BODY, now)).toBe(false);
    expect(await verifyWebhook(SECRET, "ts=;h1=zzz", BODY, now)).toBe(false);
    expect(parseSignatureHeader("h1=deadbeef")).toBeNull();
    expect(parseSignatureHeader(`ts=${now};h1=short`)).toBeNull();
  });

  it("compares hex in constant time semantics", () => {
    expect(timingSafeEqualHex("abcd", "abcd")).toBe(true);
    expect(timingSafeEqualHex("abcd", "abce")).toBe(false);
    expect(timingSafeEqualHex("abcd", "abcde")).toBe(false);
  });
});

describe("event picking", () => {
  it("picks a completed transaction with its customer", () => {
    const ev = {
      event_type: "transaction.completed",
      data: { id: "txn_1", customer_id: "ctm_1" },
    };
    expect(completedTransaction(ev)).toEqual({ transactionId: "txn_1", customerId: "ctm_1" });
    expect(refundedTransaction(ev)).toBeNull();
  });

  it("ignores completed events missing ids", () => {
    expect(completedTransaction({ event_type: "transaction.completed", data: {} })).toBeNull();
    expect(completedTransaction({ event_type: "transaction.updated", data: { id: "t", customer_id: "c" } })).toBeNull();
  });

  it("picks refunds and chargebacks, not rejected ones", () => {
    const refund = {
      event_type: "adjustment.created",
      data: { action: "refund", status: "approved", transaction_id: "txn_9" },
    };
    expect(refundedTransaction(refund)).toEqual({ transactionId: "txn_9" });
    const chargeback = {
      event_type: "adjustment.updated",
      data: { action: "chargeback", status: "pending_approval", transaction_id: "txn_9" },
    };
    expect(refundedTransaction(chargeback)).toEqual({ transactionId: "txn_9" });
    const rejected = {
      event_type: "adjustment.created",
      data: { action: "refund", status: "rejected", transaction_id: "txn_9" },
    };
    expect(refundedTransaction(rejected)).toBeNull();
    const credit = {
      event_type: "adjustment.created",
      data: { action: "credit", status: "approved", transaction_id: "txn_9" },
    };
    expect(refundedTransaction(credit)).toBeNull();
  });
});

describe("webhook ip allowlist", () => {
  const NOW = 1_800_000_000;
  const LIVE = { data: { ipv4_cidrs: ["34.237.3.244/32", "34.195.105.136/32"] } };
  const SANDBOX = { data: { ipv4_cidrs: ["3.208.120.145/32"] } };
  const IPS = "https://api.paddle.com/ips";
  const SANDBOX_IPS = "https://sandbox-api.paddle.com/ips";

  function stubFetch(payload: unknown, ok = true) {
    return (async () => ({ ok, json: async () => payload })) as unknown as typeof fetch;
  }

  beforeEach(() => resetIpAllowlistCache());

  it("matches an address inside a /32", () => {
    expect(ipInCidrs("34.237.3.244", ["34.237.3.244/32"])).toBe(true);
    expect(ipInCidrs("34.237.3.245", ["34.237.3.244/32"])).toBe(false);
  });

  it("honours a widened prefix rather than assuming /32", () => {
    expect(ipInCidrs("34.237.3.99", ["34.237.3.0/24"])).toBe(true);
    expect(ipInCidrs("34.237.4.99", ["34.237.3.0/24"])).toBe(false);
  });

  it("tells an IPv6 address apart from an unauthorized IPv4 one", () => {
    // Paddle publishes ipv4_cidrs only, so an IPv6 delivery is unmatchable
    // rather than unauthorized. handlePaddleWebhook skips the IP gate for it
    // and lets the signature decide; 403-ing it would lose a real purchase
    // after Paddle exhausts its retries.
    expect(isIpv4("2606:4700:3030::6815:4c03")).toBe(false);
    expect(isIpv4("::1")).toBe(false);
    expect(isIpv4("34.237.3.244")).toBe(true);
    expect(ipInCidrs("2606:4700:3030::6815:4c03", ["34.237.3.244/32"])).toBe(false);
  });

  it("rejects malformed addresses and octets over 255", () => {
    expect(ipInCidrs("34.237.3", ["34.237.3.244/32"])).toBe(false);
    expect(ipInCidrs("34.237.3.256", ["34.237.3.256/32"])).toBe(false);
    expect(ipInCidrs("not-an-ip", ["34.237.3.244/32"])).toBe(false);
  });

  it("parses the live /ips shape", () => {
    expect(parseIpAllowlist(LIVE)).toEqual(["34.237.3.244/32", "34.195.105.136/32"]);
  });

  it("returns null for shapes it cannot use", () => {
    expect(parseIpAllowlist({})).toBeNull();
    expect(parseIpAllowlist({ data: { ipv4_cidrs: [] } })).toBeNull();
    expect(parseIpAllowlist({ data: { ipv4_cidrs: ["nonsense"] } })).toBeNull();
  });

  it("caches within the ttl and refetches after it", async () => {
    let calls = 0;
    const counting = (async () => {
      calls++;
      return { ok: true, json: async () => LIVE };
    }) as unknown as typeof fetch;

    await paddleWebhookCidrs(IPS, NOW, counting);
    await paddleWebhookCidrs(IPS, NOW + IP_ALLOWLIST_TTL_S - 1, counting);
    expect(calls).toBe(1);
    await paddleWebhookCidrs(IPS, NOW + IP_ALLOWLIST_TTL_S, counting);
    expect(calls).toBe(2);
  });

  it("serves the stale list when the fetch fails", async () => {
    await paddleWebhookCidrs(IPS, NOW, stubFetch(LIVE));
    const throwing = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const cidrs = await paddleWebhookCidrs(IPS, NOW + IP_ALLOWLIST_TTL_S + 1, throwing);
    expect(cidrs).toEqual(["34.237.3.244/32", "34.195.105.136/32"]);
  });

  it("returns null when it has never had a list", async () => {
    expect(await paddleWebhookCidrs(IPS, NOW, stubFetch({}, false))).toBeNull();
  });

  it("keeps live and sandbox lists apart", async () => {
    const live = await paddleWebhookCidrs(IPS, NOW, stubFetch(LIVE));
    const sandbox = await paddleWebhookCidrs(SANDBOX_IPS, NOW, stubFetch(SANDBOX));
    expect(live).toEqual(["34.237.3.244/32", "34.195.105.136/32"]);
    expect(sandbox).toEqual(["3.208.120.145/32"]);
    // A sandbox address must never satisfy the live allowlist.
    expect(ipInCidrs("3.208.120.145", live ?? [])).toBe(false);
  });
});

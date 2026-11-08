// Paddle webhook signature verification + payload picking. The crypto is
// WebCrypto (available in Workers and in vitest's node environment); the
// parsing/comparison pieces are pure and unit-tested.

/** Parsed `Paddle-Signature` header: `ts=<unix>;h1=<hex hmac>`. */
export interface PaddleSignature {
  ts: number;
  h1: string;
}

export function parseSignatureHeader(header: string | null): PaddleSignature | null {
  if (!header) return null;
  const parts = new Map(
    header.split(";").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()] as const;
    }),
  );
  const ts = Number(parts.get("ts"));
  const h1 = parts.get("h1") ?? "";
  if (!Number.isFinite(ts) || ts <= 0 || !/^[0-9a-f]{64}$/.test(h1)) return null;
  return { ts, h1 };
}

/** Paddle signs `${ts}:${rawBody}` with HMAC-SHA256 of the endpoint secret. */
export async function signedPayloadHmac(secret: string, ts: number, rawBody: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${ts}:${rawBody}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time hex comparison — don't leak prefix length via timing. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Reject replays older than this (Paddle retries well within it). */
export const MAX_SIGNATURE_AGE_S = 5 * 60;

export async function verifyWebhook(
  secret: string,
  header: string | null,
  rawBody: string,
  nowS: number,
): Promise<boolean> {
  const sig = parseSignatureHeader(header);
  if (!sig) return false;
  if (Math.abs(nowS - sig.ts) > MAX_SIGNATURE_AGE_S) return false;
  const expected = await signedPayloadHmac(secret, sig.ts, rawBody);
  return timingSafeEqualHex(expected, sig.h1);
}

/* ---- Event payload picking (pure) ------------------------------------ */

export interface PaddleEvent {
  event_type?: string;
  data?: {
    id?: string;
    status?: string;
    action?: string;
    customer_id?: string;
    transaction_id?: string;
  };
}

/** A paid checkout we should mint a license for. */
export function completedTransaction(ev: PaddleEvent): { transactionId: string; customerId: string } | null {
  if (ev.event_type !== "transaction.completed") return null;
  const { id, customer_id } = ev.data ?? {};
  return id && customer_id ? { transactionId: id, customerId: customer_id } : null;
}

/** A refund/chargeback we should suspend the license for. Paddle emits
 * adjustment.created (and .updated as it settles); act on either, only for
 * refund-like actions that aren't rejected. */
export function refundedTransaction(ev: PaddleEvent): { transactionId: string } | null {
  if (ev.event_type !== "adjustment.created" && ev.event_type !== "adjustment.updated") return null;
  const { action, status, transaction_id } = ev.data ?? {};
  const refundLike = action === "refund" || action === "chargeback" || action === "chargeback_warning";
  if (!refundLike || status === "rejected" || !transaction_id) return null;
  return { transactionId: transaction_id };
}

/** Paddle publishes the addresses its webhooks originate from, and live and
 * sandbox use different ones. The endpoint is the source of truth and the list
 * changes, so we fetch it per environment instead of pinning a copy here
 * (`PADDLE_IPS_URL`, set per wrangler environment). */

/** Re-fetch the allowlist at most this often (per isolate, per environment). */
export const IP_ALLOWLIST_TTL_S = 60 * 60;

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const byte = Number(part);
    if (byte > 255) return null;
    n = ((n << 8) | byte) >>> 0;
  }
  return n;
}

/** Whether an address is a dotted-quad IPv4 literal we can match against the
 * allowlist at all. Paddle publishes `ipv4_cidrs` only, so an IPv6 delivery is
 * unmatchable rather than unauthorized — a distinction the caller has to make,
 * because treating it as unauthorized loses real purchases. */
export function isIpv4(ip: string): boolean {
  return ipv4ToInt(ip) !== null;
}

/** Paddle currently publishes /32s, but match any prefix length — a widened
 * CIDR must not silently start rejecting real deliveries. */
export function ipInCidrs(ip: string, cidrs: readonly string[]): boolean {
  const addr = ipv4ToInt(ip);
  if (addr === null) return false;
  return cidrs.some((cidr) => {
    const [base, bitsRaw] = cidr.split("/");
    const bits = bitsRaw === undefined ? 32 : Number(bitsRaw);
    if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
    const baseInt = ipv4ToInt(base);
    if (baseInt === null) return false;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return ((addr & mask) >>> 0) === ((baseInt & mask) >>> 0);
  });
}

/** `data.ipv4_cidrs` from GET /ips, or null if the shape isn't usable. */
export function parseIpAllowlist(body: unknown): string[] | null {
  const cidrs = (body as { data?: { ipv4_cidrs?: unknown } })?.data?.ipv4_cidrs;
  if (!Array.isArray(cidrs)) return null;
  const usable = cidrs.filter(
    (c): c is string => typeof c === "string" && ipInCidrs(c.split("/")[0], [c]),
  );
  return usable.length > 0 ? usable : null;
}

/** Keyed by ips URL so the live and sandbox workers can never share a list. */
const allowlistCache = new Map<string, { cidrs: string[]; fetchedAtS: number }>();

/** Test seam — module state would otherwise leak between cases. */
export function resetIpAllowlistCache(): void {
  allowlistCache.clear();
}

/** Cached allowlist for one Paddle environment. On a fetch error we serve the
 * last known good list rather than dropping real webhooks during an
 * api.paddle.com blip; null means we have never had one, and the caller should
 * ask Paddle to retry. */
export async function paddleWebhookCidrs(
  ipsUrl: string,
  nowS: number,
  fetchImpl: typeof fetch = fetch,
): Promise<string[] | null> {
  const cached = allowlistCache.get(ipsUrl);
  if (cached && nowS - cached.fetchedAtS < IP_ALLOWLIST_TTL_S) return cached.cidrs;
  try {
    const res = await fetchImpl(ipsUrl);
    if (res.ok) {
      const cidrs = parseIpAllowlist(await res.json());
      if (cidrs) {
        allowlistCache.set(ipsUrl, { cidrs, fetchedAtS: nowS });
        return cidrs;
      }
    }
  } catch {
    // fall through to the stale list
  }
  return cached?.cidrs ?? null;
}

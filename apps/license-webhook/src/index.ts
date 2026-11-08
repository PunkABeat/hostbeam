// The Hostbeam licensing glue (ADR 0014) — the one piece of hosted code the
// product runs. Two jobs:
//
//   POST /webhooks/paddle   Paddle notification → verify signature →
//                           transaction.completed: mint a Keygen license
//                           (idempotent) + email the key;
//                           refund/chargeback: suspend the license.
//   GET  /key?transaction_id=txn_…
//                           The checkout success page fetches the key to show
//                           it immediately (Paddle txn ids are unguessable
//                           128-bit ids; only paid transactions have keys).
//   POST /appstore/key      The iOS app exchanges a StoreKit 2 transaction id
//                           for a key — verified against the App Store Server
//                           API, minted idempotently (slice 6 step 3).
//   POST /webhooks/appstore App Store Server Notifications: refunds suspend
//                           the license. Claims are confirmed via the API
//                           before acting, so the unsigned decode is safe.
//
// The desktop app never talks to this worker — it talks only to Keygen.

import { alertOwner, type AlertEnv } from "./alerts";
import { verifySignedTransaction } from "./appstore-jws";
import { reconcile } from "./reconcile";
import {
  completedTransaction,
  ipInCidrs,
  isIpv4,
  paddleWebhookCidrs,
  refundedTransaction,
  verifyWebhook,
  type PaddleEvent,
} from "./paddle";
import {
  createLicense,
  createLicenseForAppleTransaction,
  emailKey,
  findLicenseByTransaction,
  paddleCustomerEmail,
  suspendLicenseByAppleTransaction,
  suspendLicenseByTransaction,
  type Env,
} from "./keygen";
import {
  checkTransaction,
  decodeJWSPayload,
  fetchTransaction,
  parseNotification,
  type AppStoreEnv,
} from "./appstore";

// Only the marketing site's thank-you page reads /key from a browser
// (localhost entries cover `npm run dev:web` during sandbox testing).
const ALLOWED_ORIGINS = new Set([
  "https://hostbeam.app",
  "http://localhost:4321",
  "http://127.0.0.1:4321",
]);

function json(status: number, body: unknown, origin?: string | null): Response {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(JSON.stringify(body), { status, headers });
}

async function handlePaddleWebhook(request: Request, env: Env): Promise<Response> {
  const nowS = Math.floor(Date.now() / 1000);

  // Defence in depth ahead of the signature check: shed anything that did not
  // come from Paddle's published egress addresses. A 503 (never a 403) when we
  // have no list at all — that is our failure, and Paddle should retry.
  //
  // The allowlist is IPv4-only because Paddle publishes `ipv4_cidrs` only. An
  // IPv6 delivery is therefore unmatchable, not unauthorized, and 403-ing it
  // would burn Paddle's ~3 days of retries and lose the purchase in silence —
  // no licence, no email, no signal. So the gate is skipped for a non-IPv4
  // address and the signature check, which is the real security boundary,
  // decides. A forged IPv6 request still cannot produce a valid signature.
  const cidrs = await paddleWebhookCidrs(env.PADDLE_IPS_URL, nowS);
  if (!cidrs) return json(503, { error: "allowlist unavailable" });
  const clientIp = request.headers.get("CF-Connecting-IP");
  if (!clientIp) return json(403, { error: "forbidden" });
  if (isIpv4(clientIp) && !ipInCidrs(clientIp, cidrs)) return json(403, { error: "forbidden" });

  const rawBody = await request.text();
  const ok = await verifyWebhook(
    env.PADDLE_WEBHOOK_SECRET,
    request.headers.get("Paddle-Signature"),
    rawBody,
    nowS,
  );
  if (!ok) return json(401, { error: "bad signature" });

  let event: PaddleEvent;
  try {
    event = JSON.parse(rawBody) as PaddleEvent;
  } catch {
    return json(400, { error: "bad json" });
  }

  const paid = completedTransaction(event);
  if (paid) {
    // Never fatal — the key still reaches the buyer via /thanks and Keygen, so a
    // lookup failure must not cost them the licence they just paid for. But it
    // must not be SILENT either: an empty email means no key email was sent, and
    // that is invisible from the outside. It cost exactly that on the first live
    // sale (2026-08-29), where PADDLE_API_KEY was unset on the production worker
    // and every customer lookup 403'd without a trace.
    const email = await paddleCustomerEmail(env, paid.customerId).catch((e) => {
      console.warn(`paddle customer lookup failed (${paid.customerId}): ${e}`);
      return "";
    });
    const license = await createLicense(env, paid.transactionId, email);
    if (!email) {
      // The buyer paid, has a licence, and is getting no email about it. They
      // can still copy the key from /thanks, so this is not fatal — but if they
      // closed that tab their only route is a support mail, and we should know
      // before they write it.
      console.warn(`no buyer email for ${paid.transactionId} — key email skipped`);
      await alertOwner(env, "Hostbeam: a buyer received no licence email", [
        `Transaction ${paid.transactionId} minted licence ${license.id} but we could`,
        "not resolve the buyer's email, so no key email was sent.",
        "",
        "The buyer can still copy the key from /thanks if that tab is open.",
        "Check PADDLE_API_KEY on the worker — an unset or wrong key 403s here.",
        "",
        `Recover with: node scripts/find-license.mjs ${paid.transactionId}`,
      ]);
    }
    await emailKey(env, email, license.key, { transactionId: paid.transactionId });
    return json(200, { ok: true, licensed: true });
  }

  const refunded = refundedTransaction(event);
  if (refunded) {
    const suspended = await suspendLicenseByTransaction(env, refunded.transactionId);
    return json(200, { ok: true, suspended });
  }

  // Unhandled event types are acknowledged so Paddle doesn't retry them.
  return json(200, { ok: true, ignored: event.event_type ?? "unknown" });
}

/** iOS purchase/restore: transaction id in, license key out. The id is the
 * only client input; entitlement comes from Apple's API. Like Paddle's /key,
 * possession of a paid transaction id is the bearer credential. */
async function handleAppStoreExchange(request: Request, env: Env & AppStoreEnv): Promise<Response> {
  let transactionId = "";
  let signedTransaction = "";
  try {
    const body = (await request.json()) as { transactionId?: string; signedTransaction?: string };
    transactionId = body.transactionId ?? "";
    signedTransaction = body.signedTransaction ?? "";
  } catch {
    return json(400, { error: "bad json" });
  }
  if (!/^[0-9]{1,32}$/.test(transactionId)) return json(400, { error: "bad transaction id" });

  // The app sends the transaction as StoreKit signed it on the buyer's device:
  // proof the request comes from that Apple Account, which an id alone is not
  // (anyone who has seen a receipt has the id). It is required. No build that
  // omits it ever reached the App Store — the iPhone app had not shipped when
  // this was added (2026-09-25), only TestFlight builds — so requiring it from
  // the start strands no buyer (docs/research/questions.md).
  if (!signedTransaction) return json(403, { error: "signed transaction required" });
  const signed = await verifySignedTransaction(signedTransaction);
  if (!signed) return json(403, { error: "unverified transaction" });
  if (signed.originalTransactionId !== transactionId) {
    return json(403, { error: "transaction mismatch" });
  }

  const found = await fetchTransaction(env, transactionId);
  if (!found) return json(404, { error: "unknown transaction" });
  const check = checkTransaction(found.payload);
  if (!check.ok || !check.originalTransactionId) return json(403, { error: check.reason });
  if (check.revoked) return json(410, { error: "refunded" });

  const license = await createLicenseForAppleTransaction(
    env,
    check.originalTransactionId,
    found.environment,
  );
  return json(200, { key: license.key });
}

/** App Store Server Notifications V2. The signed payload is decoded without
 * local verification, but every action is gated on re-fetching the
 * transaction from Apple's API — a forged notification can only make us do
 * what Apple's records already justify. 5xx makes Apple retry. */
async function handleAppStoreWebhook(request: Request, env: Env & AppStoreEnv): Promise<Response> {
  let signedPayload = "";
  try {
    signedPayload = ((await request.json()) as { signedPayload?: string }).signedPayload ?? "";
  } catch {
    return json(400, { error: "bad json" });
  }
  const note = parseNotification(decodeJWSPayload(signedPayload));

  if ((note.type === "REFUND" || note.type === "REVOKE") && note.transactionId) {
    const found = await fetchTransaction(env, note.transactionId);
    const check = found ? checkTransaction(found.payload) : null;
    if (check?.ok && check.originalTransactionId && check.revoked) {
      const suspended = await suspendLicenseByAppleTransaction(env, check.originalTransactionId);
      return json(200, { ok: true, suspended });
    }
    return json(200, { ok: true, suspended: false });
  }

  // A purchase notification mints proactively (idempotent — the app's own
  // exchange usually wins the race and this finds the existing license).
  if (note.type === "ONE_TIME_CHARGE" && note.transactionId) {
    const found = await fetchTransaction(env, note.transactionId);
    const check = found ? checkTransaction(found.payload) : null;
    if (check?.ok && check.originalTransactionId && !check.revoked && found) {
      await createLicenseForAppleTransaction(env, check.originalTransactionId, found.environment);
      return json(200, { ok: true, licensed: true });
    }
  }

  return json(200, { ok: true, ignored: note.type });
}

async function handleKeyLookup(url: URL, env: Env, origin: string | null): Promise<Response> {
  const transactionId = url.searchParams.get("transaction_id") ?? "";
  if (!/^txn_[a-z0-9]+$/.test(transactionId))
    return json(400, { error: "bad transaction id" }, origin);
  const license = await findLicenseByTransaction(env, transactionId);
  // The webhook may land a beat after the success-page redirect — the page
  // polls briefly on 404 before falling back to "check your email".
  if (!license) return json(404, { error: "not ready" }, origin);
  return json(200, { key: license.key }, origin);
}

export default {
  /** Daily guardrail — see reconcile.ts. Cron is declared for production only;
   * named wrangler environments do not inherit [triggers], so the sandbox
   * deployment stays quiet instead of alerting about refunded test purchases. */
  async scheduled(
    _event: ScheduledController,
    // The App Store credentials are part of the daily check now: the cron is
    // the only thing that notices they have stopped working before a buyer does.
    env: Env & AlertEnv & Partial<AppStoreEnv>,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(
      reconcile(env)
        .then(({ checked, problems, appstore }) =>
          console.log(
            `reconcile: ${checked} checked, ${problems.length} problem(s), app store ${appstore}`,
          ),
        )
        .catch((e) => console.error(`reconcile failed: ${e}`)),
    );
  },

  async fetch(request: Request, env: Env & AppStoreEnv): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    try {
      if (request.method === "POST" && url.pathname === "/webhooks/paddle") {
        return await handlePaddleWebhook(request, env);
      }
      if (request.method === "POST" && url.pathname === "/appstore/key") {
        return await handleAppStoreExchange(request, env);
      }
      if (request.method === "POST" && url.pathname === "/webhooks/appstore") {
        return await handleAppStoreWebhook(request, env);
      }
      if (request.method === "GET" && url.pathname === "/key") {
        return await handleKeyLookup(url, env, origin);
      }
      if (request.method === "GET" && url.pathname === "/") {
        return json(200, { ok: true, service: "hostbeam-license-webhook" });
      }
      return json(404, { error: "not found" });
    } catch (e) {
      // A 5xx makes Paddle retry the webhook — the right behavior for a
      // transient Keygen/Paddle API failure (license creation is idempotent).
      console.error(e);
      return json(500, { error: "internal" });
    }
  },
};

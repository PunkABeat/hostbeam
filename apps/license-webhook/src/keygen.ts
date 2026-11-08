// Keygen side of the glue: mint a license for a paid Paddle transaction
// (idempotently — Paddle retries webhooks), look one up for the success page,
// and suspend on refund. Licenses carry the Paddle transaction id + buyer
// email as metadata; that's the whole join between the two systems.

/** The Email Sending binding's structural surface (kept narrow on purpose —
 * the runtime types live in worker-configuration.d.ts if generated). */
export interface EmailBinding {
  send(message: {
    to: string;
    from: { email: string; name?: string };
    replyTo?: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<unknown>;
}

export interface Env {
  PADDLE_WEBHOOK_SECRET: string;
  PADDLE_API_KEY: string;
  PADDLE_API_URL: string;
  PADDLE_IPS_URL: string;
  /** Where operator alerts go — support@hostbeam.app, forwarded by Cloudflare
   * Email Routing, so no personal address is committed. */
  ALERT_TO?: string;
  KEYGEN_ACCOUNT_ID: string;
  KEYGEN_TOKEN: string;
  KEYGEN_POLICY_ID: string;
  EMAIL_FROM?: string;
  /** Resend API key — the current send path (free tier). */
  RESEND_API_KEY?: string;
  /** Cloudflare Email Service binding — preferred automatically if it ever
   * exists (requires Workers Paid; not currently enabled). */
  EMAIL?: EmailBinding;
}

const KEYGEN = "https://api.keygen.sh/v1/accounts";

interface KeygenLicense {
  id: string;
  key: string;
}

function headers(env: Env): HeadersInit {
  return {
    Authorization: `Bearer ${env.KEYGEN_TOKEN}`,
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
  };
}

/** Pure: pick id+key out of a Keygen license document (create or list item). */
export function pickLicense(doc: unknown): KeygenLicense | null {
  const d = doc as { id?: string; attributes?: { key?: string } } | null;
  return d?.id && d.attributes?.key
    ? { id: d.id, key: d.attributes.key }
    : null;
}

async function findLicenseByMeta(env: Env, field: string, value: string): Promise<KeygenLicense | null> {
  const url = `${KEYGEN}/${env.KEYGEN_ACCOUNT_ID}/licenses?limit=1&metadata[${field}]=${encodeURIComponent(value)}`;
  const res = await fetch(url, { headers: headers(env) });
  if (!res.ok) throw new Error(`keygen list failed: ${res.status}`);
  const body = (await res.json()) as { data?: unknown[] };
  return pickLicense(body.data?.[0] ?? null);
}

export async function findLicenseByTransaction(env: Env, transactionId: string): Promise<KeygenLicense | null> {
  return findLicenseByMeta(env, "paddleTransactionId", transactionId);
}

/** Create the license for a transaction, or return the existing one (retry-safe). */
export async function createLicense(
  env: Env,
  transactionId: string,
  email: string,
): Promise<KeygenLicense> {
  const existing = await findLicenseByTransaction(env, transactionId);
  if (existing) return existing;
  const res = await fetch(`${KEYGEN}/${env.KEYGEN_ACCOUNT_ID}/licenses`, {
    method: "POST",
    headers: headers(env),
    body: JSON.stringify({
      data: {
        type: "licenses",
        attributes: { metadata: { paddleTransactionId: transactionId, email } },
        relationships: {
          policy: { data: { type: "policies", id: env.KEYGEN_POLICY_ID } },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`keygen create failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { data?: unknown };
  const license = pickLicense(body.data ?? null);
  if (!license) throw new Error("keygen create returned no key");
  return license;
}

/** The IAP twin of `createLicense`: mint for an Apple original transaction
 * id, or return the existing license (retry-safe — notifications and the
 * app's exchange can race). No email: Apple exposes no buyer address, the
 * key is delivered in-app (milestone 008). Sandbox purchases (TestFlight,
 * App Review) mint real keys, tagged so they're identifiable later. */
export async function createLicenseForAppleTransaction(
  env: Env,
  originalTransactionId: string,
  environment: string,
): Promise<KeygenLicense> {
  const existing = await findLicenseByMeta(env, "appleTransactionId", originalTransactionId);
  if (existing) return existing;
  const res = await fetch(`${KEYGEN}/${env.KEYGEN_ACCOUNT_ID}/licenses`, {
    method: "POST",
    headers: headers(env),
    body: JSON.stringify({
      data: {
        type: "licenses",
        attributes: {
          metadata: { appleTransactionId: originalTransactionId, appleEnvironment: environment },
        },
        relationships: {
          policy: { data: { type: "policies", id: env.KEYGEN_POLICY_ID } },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`keygen create failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { data?: unknown };
  const license = pickLicense(body.data ?? null);
  if (!license) throw new Error("keygen create returned no key");
  return license;
}

async function suspendLicense(env: Env, license: KeygenLicense): Promise<void> {
  const res = await fetch(`${KEYGEN}/${env.KEYGEN_ACCOUNT_ID}/licenses/${license.id}/actions/suspend`, {
    method: "POST",
    headers: headers(env),
  });
  // 422 means already suspended — that's the state we want.
  if (!res.ok && res.status !== 422) throw new Error(`keygen suspend failed: ${res.status}`);
}

/** Refund/chargeback: suspend (revocable, unlike delete) — the app is
 * unlicensed again (the reminder returns) on its next revalidation. Unknown
 * transaction is a no-op. */
export async function suspendLicenseByTransaction(env: Env, transactionId: string): Promise<boolean> {
  const license = await findLicenseByTransaction(env, transactionId);
  if (!license) return false;
  await suspendLicense(env, license);
  return true;
}

/** Same, keyed by the Apple original transaction id (App Store refunds). */
export async function suspendLicenseByAppleTransaction(env: Env, originalTransactionId: string): Promise<boolean> {
  const license = await findLicenseByMeta(env, "appleTransactionId", originalTransactionId);
  if (!license) return false;
  await suspendLicense(env, license);
  return true;
}

/** Buyer email for a Paddle customer id (transaction payloads carry only the id). */
export async function paddleCustomerEmail(env: Env, customerId: string): Promise<string> {
  const res = await fetch(`${env.PADDLE_API_URL}/customers/${customerId}`, {
    headers: { Authorization: `Bearer ${env.PADDLE_API_KEY}` },
  });
  if (!res.ok) throw new Error(`paddle customer lookup failed: ${res.status}`);
  const body = (await res.json()) as { data?: { email?: string } };
  return body.data?.email ?? "";
}

/** The license-key email. Sent via the Cloudflare Email binding when it
 * exists (Workers Paid), otherwise via Resend (free tier), otherwise skipped.
 * Best-effort either way: failures are logged, never fatal — the key is still
 * on the success page and in the Keygen dashboard. */
export async function emailKey(
  env: Env,
  to: string,
  key: string,
  opts: { transactionId?: string } = {},
): Promise<void> {
  if (!to) return;
  const subject = "Your Hostbeam license key";
  // Plain text on purpose: it scores 10/10 on mail-tester, renders identically
  // everywhere, and a licence key is the one thing that must survive any client.
  const text = [
    "Thanks for buying Hostbeam!",
    "",
    `Your license key: ${key}`,
    "",
    // Separators, not space alignment: many clients render text/plain through
    // HTML and collapse runs of whitespace, which turned "Mac      Hostbeam"
    // into "Mac Hostbeam" in a real inbox. A dash reads correctly either way.
    "Activate it:",
    "- On Mac: Hostbeam → Preferences → License → paste the key → Activate",
    "- On iPhone: nothing to do — the iPhone app is free",
    "",
    // Buying does not require having installed anything first, so a buyer who
    // paid from the pricing page has nowhere to go without this.
    "Don't have the app yet? Download for Mac:",
    "https://download.hostbeam.app/Hostbeam.dmg",
    "",
    "One license covers up to 3 Macs. Keep this email: the key is your receipt",
    "of access.",
    "",
    // The policy may still carry Keygen's one-year expiry; it means nothing to
    // the app (ADR 0028), so the email does not mention a date at all.
    "Every Hostbeam 1 update is included — there is nothing to renew.",
    ...(opts.transactionId ? ["", `Order reference: ${opts.transactionId}`] : []),
    "",
    "Questions, or need the key again? Just reply — support@hostbeam.app.",
    "Refunds: https://hostbeam.app/refunds",
  ].join("\n");
  try {
    if (env.EMAIL) {
      await env.EMAIL.send({
        to,
        from: { email: "license@hostbeam.app", name: "Hostbeam" },
        replyTo: "support@hostbeam.app",
        subject,
        text,
      });
      return;
    }
    if (env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM ?? "Hostbeam <license@hostbeam.app>",
          to,
          reply_to: "support@hostbeam.app",
          subject,
          text,
        }),
      });
      if (!res.ok) console.warn(`resend failed: ${res.status}`);
    }
  } catch (e) {
    console.warn(`license email failed: ${e}`); // key still reachable via success page
  }
}

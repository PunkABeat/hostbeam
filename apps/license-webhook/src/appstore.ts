// App Store side of the glue (slice 6 step 3, milestone 008): exchange a
// StoreKit 2 transaction for a Keygen license key, and suspend on refund.
//
// Verification model: the worker fetches the transaction from the App Store
// Server API over TLS and acts on *that* — whether it exists, is ours, and is
// unrefunded is never taken from a client. (Apple documents this
// fetch-to-verify pattern as an alternative to local JWS verification.)
//
// What the fetch cannot say is *who is asking*. So the app also sends the
// transaction as StoreKit signed it on the buyer's device, and the exchange
// requires it (appstore-jws.ts): the key goes to someone signed in to the
// buyer's Apple Account, never to anyone holding the id.

export interface AppStoreEnv {
  /** ASC → Users and Access → Integrations → In-App Purchase keys. */
  APPSTORE_ISSUER_ID: string;
  APPSTORE_KEY_ID: string;
  /** The .p8 file's PEM content. */
  APPSTORE_PRIVATE_KEY: string;
}

export const BUNDLE_ID = "app.hostbeam.ios.Hostbeam";
export const PRODUCT_ID = "app.hostbeam.ios.license";

const PRODUCTION = "https://api.storekit.itunes.apple.com";
const SANDBOX = "https://api.storekit-sandbox.itunes.apple.com";

// MARK: pure helpers (unit-tested)

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlJSON(value: unknown): string {
  return b64url(new TextEncoder().encode(JSON.stringify(value)));
}

/** Decode a JWS payload without verifying the signature — only ever used on
 * data whose claims are re-checked against the App Store Server API, or that
 * came from that API over TLS in the first place. */
export function decodeJWSPayload(jws: string): unknown {
  const part = jws.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export interface TransactionCheck {
  ok: boolean;
  reason?: string;
  originalTransactionId?: string;
  revoked?: boolean;
}

/** Is this transaction payload (from the API) our paid, unrevoked license? */
export function checkTransaction(payload: unknown): TransactionCheck {
  const p = payload as {
    bundleId?: string;
    productId?: string;
    type?: string;
    originalTransactionId?: string;
    revocationDate?: number;
  } | null;
  if (!p?.originalTransactionId) return { ok: false, reason: "no transaction" };
  if (p.bundleId !== BUNDLE_ID) return { ok: false, reason: "wrong bundle" };
  if (p.productId !== PRODUCT_ID) return { ok: false, reason: "wrong product" };
  if (p.type !== "Non-Consumable") return { ok: false, reason: "wrong type" };
  return {
    ok: true,
    originalTransactionId: p.originalTransactionId,
    revoked: p.revocationDate != null,
  };
}

/** Pull the acted-on fields out of a decoded notification payload. */
export function parseNotification(
  payload: unknown,
): { type: string; transactionId: string | null } {
  const p = payload as {
    notificationType?: string;
    data?: { signedTransactionInfo?: string };
  } | null;
  const txn = p?.data?.signedTransactionInfo
    ? (decodeJWSPayload(p.data.signedTransactionInfo) as {
        transactionId?: string;
      } | null)
    : null;
  return {
    type: p?.notificationType ?? "unknown",
    transactionId: txn?.transactionId ?? null,
  };
}

// MARK: App Store Server API edges

async function importP8(pem: string): Promise<CryptoKey> {
  const body = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

/** Short-lived ES256 bearer token for the App Store Server API. */
export async function apiToken(env: AppStoreEnv, nowMs = Date.now()): Promise<string> {
  const now = Math.floor(nowMs / 1000);
  const unsigned =
    b64urlJSON({ alg: "ES256", kid: env.APPSTORE_KEY_ID, typ: "JWT" }) +
    "." +
    b64urlJSON({
      iss: env.APPSTORE_ISSUER_ID,
      iat: now,
      exp: now + 600,
      aud: "appstoreconnect-v1",
      bid: BUNDLE_ID,
    });
  const key = await importP8(env.APPSTORE_PRIVATE_KEY);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${b64url(new Uint8Array(sig))}`;
}

/** A transaction id shaped like Apple's but far outside anything it has issued
 * for this app. Nothing is read from the answer except its status. */
const CANARY_TRANSACTION_ID = "1000000000000001";

/** Do these credentials still speak for this app? Null when they do.
 *
 * There is no reconciling App Store sales the way Paddle's are reconciled:
 * Apple has no "everything you sold" endpoint, and the iOS mint is
 * client-driven — the app posts a transaction id and the worker verifies it.
 * The only record of a sale we ever see is the one the buyer's own app brings
 * us. So the outcome this guards is not a missing licence in a report; it is
 * every purchase failing at the moment of sale while nothing says so.
 *
 * That is not hypothetical. `APPSTORE_ISSUER_ID` belongs to the App Store
 * Connect *account*, so moving the account to PunkABeat invalidates it —
 * milestone 008 opens with the warning. The buyer pays Apple, the exchange
 * 500s, the app shows an error, and the only trace on our side is a
 * `console.error` nobody reads.
 *
 * The check is the cheapest question Apple can be asked: tell us about a
 * transaction that cannot exist. **404 is the healthy answer** — only a request
 * Apple has authenticated is told "no such transaction". 401 or 403 means the
 * key no longer works, which is the whole point of asking daily rather than
 * finding out from a buyer.
 */
export async function credentialProblem(
  env: AppStoreEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  let token: string;
  try {
    token = await apiToken(env);
  } catch (e) {
    // A malformed or missing .p8 never reaches the network at all.
    return `the private key could not be loaded (${e}) — check APPSTORE_PRIVATE_KEY`;
  }
  let res: Response;
  try {
    res = await fetchImpl(`${PRODUCTION}/inApps/v1/transactions/${CANARY_TRANSACTION_ID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    return `could not reach Apple to check the credentials (${e})`;
  }
  if (res.ok || res.status === 404) return null;
  if (res.status === 401 || res.status === 403) {
    return (
      `Apple rejected the credentials (${res.status}). APPSTORE_ISSUER_ID, ` +
      `APPSTORE_KEY_ID and APPSTORE_PRIVATE_KEY no longer speak for ${BUNDLE_ID}.`
    );
  }
  // Not proof of a broken key, but not proof of a working one either — and an
  // unchecked day is exactly what this exists to prevent.
  return `Apple returned ${res.status}; could not confirm the credentials still work`;
}

export interface FetchedTransaction {
  payload: unknown;
  environment: "Production" | "Sandbox";
}

/** Look the transaction up at Apple — production first, then the sandbox
 * (TestFlight and App Review purchases live there). null = Apple has never
 * heard of it. Other API failures throw (callers 5xx so senders retry). */
export async function fetchTransaction(
  env: AppStoreEnv,
  transactionId: string,
): Promise<FetchedTransaction | null> {
  const token = await apiToken(env);
  for (const [base, environment] of [
    [PRODUCTION, "Production"],
    [SANDBOX, "Sandbox"],
  ] as const) {
    const res = await fetch(`${base}/inApps/v1/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`app store api failed: ${res.status}`);
    const body = (await res.json()) as { signedTransactionInfo?: string };
    if (!body.signedTransactionInfo) throw new Error("app store api: no transaction info");
    // This JWS arrived from Apple's API over TLS — decoding without local
    // signature verification is the point of this design.
    return { payload: decodeJWSPayload(body.signedTransactionInfo), environment };
  }
  return null;
}

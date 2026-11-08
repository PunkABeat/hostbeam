import { describe, expect, it } from "vitest";

import {
  apiToken,
  checkTransaction,
  credentialProblem,
  decodeJWSPayload,
  parseNotification,
} from "./appstore";

const toB64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

function fakeJWS(payload: unknown): string {
  return `eyJhbGciOiJFUzI1NiJ9.${toB64url(JSON.stringify(payload))}.c2ln`;
}

const paidTransaction = {
  transactionId: "2000000123456789",
  originalTransactionId: "2000000123456789",
  bundleId: "app.hostbeam.ios.Hostbeam",
  productId: "app.hostbeam.ios.license",
  type: "Non-Consumable",
};

describe("decodeJWSPayload", () => {
  it("decodes the middle segment as JSON", () => {
    expect(decodeJWSPayload(fakeJWS({ a: 1 }))).toEqual({ a: 1 });
  });

  it("returns null for garbage", () => {
    expect(decodeJWSPayload("")).toBeNull();
    expect(decodeJWSPayload("one-segment")).toBeNull();
    expect(decodeJWSPayload("a.!!notbase64!!.c")).toBeNull();
  });
});

describe("checkTransaction", () => {
  it("accepts our paid non-consumable", () => {
    expect(checkTransaction(paidTransaction)).toEqual({
      ok: true,
      originalTransactionId: "2000000123456789",
      revoked: false,
    });
  });

  it("flags a refunded transaction as revoked, not invalid", () => {
    const check = checkTransaction({ ...paidTransaction, revocationDate: 1735689600000 });
    expect(check.ok).toBe(true);
    expect(check.revoked).toBe(true);
  });

  it("rejects other bundles, products, types, and empty payloads", () => {
    expect(checkTransaction(null).ok).toBe(false);
    expect(checkTransaction({}).ok).toBe(false);
    expect(checkTransaction({ ...paidTransaction, bundleId: "com.evil.app" }).ok).toBe(false);
    expect(checkTransaction({ ...paidTransaction, productId: "other.product" }).ok).toBe(false);
    expect(checkTransaction({ ...paidTransaction, type: "Consumable" }).ok).toBe(false);
  });
});

describe("parseNotification", () => {
  it("extracts the type and inner transaction id", () => {
    const payload = {
      notificationType: "REFUND",
      data: { signedTransactionInfo: fakeJWS(paidTransaction) },
    };
    expect(parseNotification(payload)).toEqual({
      type: "REFUND",
      transactionId: "2000000123456789",
    });
  });

  it("degrades to unknown/null on malformed payloads", () => {
    expect(parseNotification(null)).toEqual({ type: "unknown", transactionId: null });
    expect(parseNotification({ notificationType: "TEST" })).toEqual({
      type: "TEST",
      transactionId: null,
    });
  });
});

describe("apiToken", () => {
  it("signs a well-formed ES256 JWT with the expected claims", async () => {
    // Workers types name the generateKey params differently than lib.dom —
    // narrow structurally for this test-only key mint.
    const subtle = crypto.subtle as unknown as {
      generateKey(a: unknown, extractable: boolean, usages: string[]): Promise<CryptoKeyPair>;
    };
    const pair = await subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    const der = new Uint8Array(
      (await crypto.subtle.exportKey("pkcs8", pair.privateKey)) as ArrayBuffer,
    );
    const derB64 = btoa(String.fromCharCode(...der));
    const pem = `-----BEGIN PRIVATE KEY-----\n${derB64}\n-----END PRIVATE KEY-----`;

    const token = await apiToken(
      { APPSTORE_ISSUER_ID: "issuer-1", APPSTORE_KEY_ID: "KEY123", APPSTORE_PRIVATE_KEY: pem },
      1_700_000_000_000,
    );
    const [header, payload, signature] = token.split(".");
    expect(decodeJWSPayload(token)).toMatchObject({
      iss: "issuer-1",
      aud: "appstoreconnect-v1",
      bid: "app.hostbeam.ios.Hostbeam",
      iat: 1_700_000_000,
      exp: 1_700_000_600,
    });
    expect(JSON.parse(fromB64url(header))).toEqual({ alg: "ES256", kid: "KEY123", typ: "JWT" });
    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      pair.publicKey,
      Uint8Array.from(fromB64url(signature), (c) => c.charCodeAt(0)),
      new TextEncoder().encode(`${header}.${payload}`),
    );
    expect(ok).toBe(true);
  });
});

describe("credentialProblem", () => {
  /** A real, freshly generated P-256 key in the PEM shape Apple hands out. */
  async function p8(): Promise<string> {
    const subtle = crypto.subtle as unknown as {
      generateKey(a: unknown, extractable: boolean, usages: string[]): Promise<CryptoKeyPair>;
    };
    const pair = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
      "sign",
      "verify",
    ]);
    const der = new Uint8Array(
      (await crypto.subtle.exportKey("pkcs8", pair.privateKey)) as ArrayBuffer,
    );
    return `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----`;
  }

  const envWith = async () => ({
    APPSTORE_ISSUER_ID: "issuer-1",
    APPSTORE_KEY_ID: "KEY123",
    APPSTORE_PRIVATE_KEY: await p8(),
  });

  const status = (code: number) =>
    (async () => ({ ok: code >= 200 && code < 300, status: code })) as unknown as typeof fetch;

  it("treats 404 as healthy — only an authenticated caller is told 'no such transaction'", async () => {
    expect(await credentialProblem(await envWith(), status(404))).toBeNull();
  });

  it("names the credentials when Apple rejects them", async () => {
    // The failure this whole check exists for: the issuer belongs to the App
    // Store Connect account, so moving the account invalidates it.
    for (const code of [401, 403]) {
      const problem = await credentialProblem(await envWith(), status(code));
      expect(problem).toContain("APPSTORE_ISSUER_ID");
      expect(problem).toContain(String(code));
    }
  });

  it("does not claim the credentials are fine when it could not tell", async () => {
    // An unchecked day is what this exists to prevent, so a 500 is a problem
    // too — worded as uncertainty rather than as a broken key.
    const problem = await credentialProblem(await envWith(), status(500));
    expect(problem).toContain("could not confirm");
    expect(problem).not.toContain("rejected");
  });

  it("reports an unusable private key without going near the network", async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return { ok: true, status: 200 };
    }) as unknown as typeof fetch;
    const problem = await credentialProblem(
      { APPSTORE_ISSUER_ID: "i", APPSTORE_KEY_ID: "k", APPSTORE_PRIVATE_KEY: "not a key" },
      fetchImpl,
    );
    expect(problem).toContain("APPSTORE_PRIVATE_KEY");
    expect(called).toBe(false);
  });

  it("reports a network failure as a failure to check", async () => {
    const fetchImpl = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await credentialProblem(await envWith(), fetchImpl)).toContain("could not reach Apple");
  });
});

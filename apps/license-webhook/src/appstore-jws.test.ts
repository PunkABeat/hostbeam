import { describe, expect, it } from "vitest";

import {
  APPLE_ROOT_CA_G3_SHA256,
  parseCertificate,
  rawSignature,
  signedBy,
  verifySignedTransaction,
} from "./appstore-jws";

// MARK: a DER writer, just enough to mint a throwaway chain in the test —
// independent of the reader under test, and no private key in the repo.

const cat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) (out.set(p, at), (at += p.length));
  return out;
};
function tlv(tag: number, body: Uint8Array): Uint8Array {
  const n = body.length;
  const len = n < 0x80 ? [n] : n < 0x100 ? [0x81, n] : [0x82, n >> 8, n & 0xff];
  return cat(new Uint8Array([tag, ...len]), body);
}
const seq = (...items: Uint8Array[]) => tlv(0x30, cat(...items));
const set = (...items: Uint8Array[]) => tlv(0x31, cat(...items));
function int(bytes: Uint8Array): Uint8Array {
  let b = bytes;
  while (b.length > 1 && b[0] === 0 && !(b[1] & 0x80)) b = b.subarray(1);
  return tlv(0x02, b[0] & 0x80 ? cat(new Uint8Array([0]), b) : b);
}
function oid(dotted: string): Uint8Array {
  const [a, b, ...rest] = dotted.split(".").map(Number);
  const out = [a * 40 + b];
  for (const n of rest) {
    const chunk = [n & 0x7f];
    for (let v = Math.floor(n / 128); v > 0; v = Math.floor(v / 128)) chunk.unshift((v & 0x7f) | 0x80);
    out.push(...chunk);
  }
  return tlv(0x06, new Uint8Array(out));
}
const utc = (d: Date) =>
  tlv(0x17, new TextEncoder().encode(d.toISOString().replace(/[-:T]/g, "").slice(2, 14) + "Z"));
const name = (cn: string) => seq(set(seq(oid("2.5.4.3"), tlv(0x0c, new TextEncoder().encode(cn)))));
const ext = (id: string, value: Uint8Array) => seq(oid(id), tlv(0x04, value));
const caConstraint = (ca: boolean) => ext("2.5.29.19", ca ? seq(tlv(0x01, new Uint8Array([0xff]))) : seq());

type Curve = "P-256" | "P-384";
const SIG_ALG = { "P-256": "1.2.840.10045.4.3.2", "P-384": "1.2.840.10045.4.3.3" } as const;
const HASH = { "P-256": "SHA-256", "P-384": "SHA-384" } as const;

async function keys(curve: Curve) {
  return (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: curve }, true, ["sign", "verify"])) as CryptoKeyPair;
}

interface Issued {
  der: Uint8Array;
  keys: CryptoKeyPair;
  curve: Curve;
  cn: string;
}

async function issue(opts: {
  cn: string;
  curve: Curve;
  issuer?: Issued;
  extensions?: Uint8Array[];
  notBefore?: Date;
  notAfter?: Date;
  signWith?: CryptoKeyPair;
}): Promise<Issued> {
  const own = await keys(opts.curve);
  const signer = opts.signWith ?? opts.issuer?.keys ?? own;
  const signerCurve = opts.issuer?.curve ?? opts.curve;
  const spki = new Uint8Array((await crypto.subtle.exportKey("spki", own.publicKey)) as ArrayBuffer);
  const tbs = seq(
    tlv(0xa0, int(new Uint8Array([2]))),
    int(crypto.getRandomValues(new Uint8Array(8))),
    seq(oid(SIG_ALG[signerCurve])),
    name(opts.issuer?.cn ?? opts.cn),
    seq(utc(opts.notBefore ?? new Date("2020-01-01")), utc(opts.notAfter ?? new Date("2040-01-01"))),
    name(opts.cn),
    spki,
    tlv(0xa3, seq(...(opts.extensions ?? []))),
  );
  const raw = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: HASH[signerCurve] }, signer.privateKey, tbs),
  );
  const half = raw.length / 2;
  const sig = seq(int(raw.subarray(0, half)), int(raw.subarray(half)));
  const der = seq(tbs, seq(oid(SIG_ALG[signerCurve])), tlv(0x03, cat(new Uint8Array([0]), sig)));
  return { der, keys: own, curve: opts.curve, cn: opts.cn };
}

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const b64url = (bytes: Uint8Array) => b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const hex = async (bytes: Uint8Array) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");

const INTERMEDIATE = "1.2.840.113635.100.6.2.1";
const LEAF = "1.2.840.113635.100.6.11.1";
const marker = (id: string) => ext(id, new Uint8Array([0x05, 0x00]));

async function chain(overrides: { leaf?: Partial<Parameters<typeof issue>[0]>; intermediate?: Partial<Parameters<typeof issue>[0]> } = {}) {
  const root = await issue({ cn: "Test Root", curve: "P-384", extensions: [caConstraint(true)] });
  const intermediate = await issue({
    cn: "Test WWDR", curve: "P-384", issuer: root,
    extensions: [caConstraint(true), marker(INTERMEDIATE)], ...overrides.intermediate,
  });
  const leaf = await issue({
    cn: "Test Receipt Signing", curve: "P-256", issuer: intermediate,
    extensions: [marker(LEAF)], ...overrides.leaf,
  });
  return { root, intermediate, leaf, rootSha256: await hex(root.der) };
}

async function signJWS(leaf: Issued, x5c: Uint8Array[], payload: unknown, alg = "ES256"): Promise<string> {
  const enc = (v: unknown) => b64url(new TextEncoder().encode(JSON.stringify(v)));
  const signingInput = `${enc({ alg, x5c: x5c.map(b64) })}.${enc(payload)}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, leaf.keys.privateKey, new TextEncoder().encode(signingInput)),
  );
  return `${signingInput}.${b64url(sig)}`;
}

const transaction = {
  transactionId: "2000000123456789",
  originalTransactionId: "2000000123456789",
  bundleId: "app.hostbeam.ios.Hostbeam",
  productId: "app.hostbeam.ios.license",
  signedDate: Date.parse("2026-09-20T10:00:00Z"),
};

describe("verifySignedTransaction", () => {
  it("returns the payload of a transaction signed through a pinned chain", async () => {
    const c = await chain();
    const jws = await signJWS(c.leaf, [c.leaf.der, c.intermediate.der, c.root.der], transaction);
    expect(await verifySignedTransaction(jws, { rootSha256: c.rootSha256 })).toEqual(transaction);
  });

  it("refuses a chain that ends anywhere but the pinned root", async () => {
    const c = await chain();
    const jws = await signJWS(c.leaf, [c.leaf.der, c.intermediate.der, c.root.der], transaction);
    // The default pin is Apple's, and this root is not Apple's.
    expect(await verifySignedTransaction(jws)).toBeNull();
  });

  it("refuses a payload changed after signing", async () => {
    const c = await chain();
    const jws = await signJWS(c.leaf, [c.leaf.der, c.intermediate.der, c.root.der], transaction);
    const [h, , s] = jws.split(".");
    const forged = b64url(new TextEncoder().encode(JSON.stringify({ ...transaction, originalTransactionId: "1" })));
    expect(await verifySignedTransaction(`${h}.${forged}.${s}`, { rootSha256: c.rootSha256 })).toBeNull();
  });

  it("refuses a leaf the intermediate did not sign", async () => {
    const stranger = await keys("P-384");
    const c = await chain({ leaf: { signWith: stranger } });
    const jws = await signJWS(c.leaf, [c.leaf.der, c.intermediate.der, c.root.der], transaction);
    expect(await verifySignedTransaction(jws, { rootSha256: c.rootSha256 })).toBeNull();
  });

  it("refuses an intermediate that is not a CA, or not Apple's kind", async () => {
    for (const extensions of [[marker(INTERMEDIATE)], [caConstraint(false), marker(INTERMEDIATE)], [caConstraint(true)]]) {
      const c = await chain({ intermediate: { extensions } });
      const jws = await signJWS(c.leaf, [c.leaf.der, c.intermediate.der, c.root.der], transaction);
      expect(await verifySignedTransaction(jws, { rootSha256: c.rootSha256 })).toBeNull();
    }
  });

  it("refuses a leaf without the App Store signing marker", async () => {
    const c = await chain({ leaf: { extensions: [] } });
    const jws = await signJWS(c.leaf, [c.leaf.der, c.intermediate.der, c.root.der], transaction);
    expect(await verifySignedTransaction(jws, { rootSha256: c.rootSha256 })).toBeNull();
  });

  it("checks validity at the moment the transaction was signed", async () => {
    const c = await chain({ leaf: { notAfter: new Date("2026-01-01") } });
    const jws = await signJWS(c.leaf, [c.leaf.der, c.intermediate.der, c.root.der], transaction);
    expect(await verifySignedTransaction(jws, { rootSha256: c.rootSha256 })).toBeNull();
    // An old transaction signed while the leaf was valid still verifies.
    const old = await signJWS(c.leaf, [c.leaf.der, c.intermediate.der, c.root.der],
      { ...transaction, signedDate: Date.parse("2025-06-01T00:00:00Z") });
    expect(await verifySignedTransaction(old, { rootSha256: c.rootSha256 })).not.toBeNull();
  });

  it("refuses the wrong algorithm, a short chain, and garbage", async () => {
    const c = await chain();
    const x5c = [c.leaf.der, c.intermediate.der, c.root.der];
    expect(await verifySignedTransaction(await signJWS(c.leaf, x5c, transaction, "HS256"), { rootSha256: c.rootSha256 })).toBeNull();
    expect(await verifySignedTransaction(await signJWS(c.leaf, x5c.slice(0, 2), transaction), { rootSha256: c.rootSha256 })).toBeNull();
    for (const bad of ["", "a.b", "a.b.c.d", "!!.!!.!!"]) {
      expect(await verifySignedTransaction(bad, { rootSha256: c.rootSha256 })).toBeNull();
    }
  });
});

describe("the reader against Apple's own certificates", () => {
  // Public certificates from apple.com/certificateauthority, fetched 2026-09-24.
  const root = Uint8Array.from(atob("MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA=="), (c) => c.charCodeAt(0));
  const wwdrG6 = Uint8Array.from(atob("MIIDFjCCApygAwIBAgIUIsGhRwp0c2nvU4YSycafPTjzbNcwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMjEwMzE3MjAzNzEwWhcNMzYwMzE5MDAwMDAwWjB1MUQwQgYDVQQDDDtBcHBsZSBXb3JsZHdpZGUgRGV2ZWxvcGVyIFJlbGF0aW9ucyBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTELMAkGA1UECwwCRzYxEzARBgNVBAoMCkFwcGxlIEluYy4xCzAJBgNVBAYTAlVTMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEbsQKC94PrlWmZXnXgtxzdVJL8T0SGYngDRGpngn3N6PT8JMEb7FDi4bBmPhCnZ3/sq6PF/cGcKXWsL5vOteRhyJ45x3ASP7cOB+aao90fcpxSv/EZFbniAbNgZGhIhpIo4H6MIH3MBIGA1UdEwEB/wQIMAYBAf8CAQAwHwYDVR0jBBgwFoAUu7DeoVgziJqkipnevr3rr9rLJKswRgYIKwYBBQUHAQEEOjA4MDYGCCsGAQUFBzABhipodHRwOi8vb2NzcC5hcHBsZS5jb20vb2NzcDAzLWFwcGxlcm9vdGNhZzMwNwYDVR0fBDAwLjAsoCqgKIYmaHR0cDovL2NybC5hcHBsZS5jb20vYXBwbGVyb290Y2FnMy5jcmwwHQYDVR0OBBYEFD8vlCNR01DJmig97bB85c+lkGKZMA4GA1UdDwEB/wQEAwIBBjAQBgoqhkiG92NkBgIBBAIFADAKBggqhkjOPQQDAwNoADBlAjBAXhSq5IyKogMCPtw490BaB677CaEGJXufQB/EqZGd6CSjiCtOnuMTbXVXmxxcxfkCMQDTSPxarZXvNrkxU3TkUMI33yzvFVVRT4wxWJC994OsdcZ4+RGNsYDyR5gmdr0nDGg="), (c) => c.charCodeAt(0));

  it("pins Apple Root CA - G3 by the fingerprint Apple publishes", async () => {
    expect(await hex(root)).toBe(APPLE_ROOT_CA_G3_SHA256);
  });

  it("parses WWDR G6 and verifies Apple's signature on it with the root's key", async () => {
    const r = parseCertificate(root);
    const g6 = parseCertificate(wwdrG6);
    expect(r.curve.name).toBe("P-384");
    expect(g6.signatureHash).toBe("SHA-384");
    expect(g6.extensions.has(INTERMEDIATE)).toBe(true);
    expect([...g6.issuer]).toEqual([...r.subject]);
    expect(await signedBy(g6, r)).toBe(true);
    expect(await signedBy(r, g6)).toBe(false);
  });
});

describe("rawSignature", () => {
  it("left-pads short integers and drops DER's sign byte", () => {
    const der = seq(int(new Uint8Array([0x01])), int(new Uint8Array([0xff, 0x02])));
    const raw = rawSignature(der, 4);
    expect([...raw]).toEqual([0, 0, 0, 1, 0, 0, 0xff, 2]);
  });
});

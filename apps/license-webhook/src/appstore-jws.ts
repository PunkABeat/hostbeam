// Verifies a StoreKit 2 signed transaction (a JWS whose x5c header carries
// Apple's certificate chain) — proof that the request comes from a device
// signed in to the buyer's Apple Account, which a transaction id alone is not
// (docs/process/ios-code-review-2026-09.md § D2).
//
// Checked, in order, the way Apple's own server library checks it:
//   1. the JWS is ES256 with a three-certificate x5c chain;
//   2. the chain's root is, byte for byte, Apple Root CA - G3 (pinned by its
//      SHA-256 fingerprint, taken from apple.com/certificateauthority);
//   3. each certificate is signed by the next, and names it as its issuer;
//   4. the intermediate is a CA and carries Apple's WWDR marker OID, the leaf
//      carries Apple's App Store receipt-signing OID;
//   5. both were valid when the transaction was signed;
//   6. the JWS signature verifies with the leaf's key.
// Any failure returns null. No revocation (OCSP) check: the worker still
// fetches the transaction from Apple's API before acting, which is where a
// refund or revocation shows.
//
// WebCrypto only, and a DER reader just large enough for X.509 — no
// dependency to vet or keep current.

/** SHA-256 of Apple Root CA - G3's DER, as apple.com publishes it. */
export const APPLE_ROOT_CA_G3_SHA256 =
  "63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179";

const OID_INTERMEDIATE_MARKER = "1.2.840.113635.100.6.2.1";
const OID_LEAF_MARKER = "1.2.840.113635.100.6.11.1";
const OID_BASIC_CONSTRAINTS = "2.5.29.19";
const SIG_HASH: Record<string, "SHA-256" | "SHA-384"> = {
  "1.2.840.10045.4.3.2": "SHA-256", // ecdsa-with-SHA256
  "1.2.840.10045.4.3.3": "SHA-384", // ecdsa-with-SHA384
};
const CURVE: Record<string, { name: "P-256" | "P-384"; size: number }> = {
  "1.2.840.10045.3.1.7": { name: "P-256", size: 32 },
  "1.3.132.0.34": { name: "P-384", size: 48 },
};

// MARK: DER

interface Tlv {
  tag: number;
  /** Where the whole element starts, header included. */
  start: number;
  /** Where its contents start. */
  body: number;
  end: number;
}

function readTlv(der: Uint8Array, at: number): Tlv {
  if (at + 2 > der.length) throw new Error("der: truncated");
  const tag = der[at];
  if ((tag & 0x1f) === 0x1f) throw new Error("der: multi-byte tag");
  let len = der[at + 1];
  let body = at + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n === 0 || n > 4) throw new Error("der: bad length");
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + der[body + i];
    body += n;
  }
  const end = body + len;
  if (end > der.length) throw new Error("der: overruns");
  return { tag, start: at, body, end };
}

function children(der: Uint8Array, parent: Tlv): Tlv[] {
  const out: Tlv[] = [];
  for (let at = parent.body; at < parent.end; ) {
    const t = readTlv(der, at);
    out.push(t);
    at = t.end;
  }
  return out;
}

function oidString(der: Uint8Array, t: Tlv): string {
  if (t.tag !== 0x06) throw new Error("der: expected OID");
  const bytes = der.subarray(t.body, t.end);
  const parts = [Math.floor(bytes[0] / 40), bytes[0] % 40];
  let value = 0;
  for (const b of bytes.subarray(1)) {
    value = value * 128 + (b & 0x7f);
    if (!(b & 0x80)) {
      parts.push(value);
      value = 0;
    }
  }
  return parts.join(".");
}

function time(der: Uint8Array, t: Tlv): number {
  const s = new TextDecoder().decode(der.subarray(t.body, t.end));
  // UTCTime YYMMDDHHMMSSZ, GeneralizedTime YYYYMMDDHHMMSSZ.
  const m = t.tag === 0x17 ? /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(s) : t.tag === 0x18
    ? /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(s) : null;
  if (!m) throw new Error("der: bad time");
  let year = Number(m[1]);
  if (t.tag === 0x17) year += year < 50 ? 2000 : 1900;
  return Date.UTC(year, Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]));
}

// MARK: X.509

export interface Certificate {
  der: Uint8Array;
  tbs: Uint8Array;
  signatureHash: "SHA-256" | "SHA-384";
  signature: Uint8Array;
  issuer: Uint8Array;
  subject: Uint8Array;
  notBefore: number;
  notAfter: number;
  spki: Uint8Array;
  curve: { name: "P-256" | "P-384"; size: number };
  /** Extension OID → its value (the OCTET STRING's contents). */
  extensions: Map<string, Uint8Array>;
}

export function parseCertificate(der: Uint8Array): Certificate {
  const cert = readTlv(der, 0);
  if (cert.tag !== 0x30 || cert.end !== der.length) throw new Error("x509: not a certificate");
  const [tbs, sigAlg, sigValue] = children(der, cert);
  if (!tbs || !sigAlg || !sigValue || sigValue.tag !== 0x03) throw new Error("x509: shape");
  const signatureHash = SIG_HASH[oidString(der, children(der, sigAlg)[0])];
  if (!signatureHash) throw new Error("x509: unsupported signature algorithm");

  const fields = children(der, tbs);
  let i = fields[0]?.tag === 0xa0 ? 1 : 0; // [0] version
  i += 2; // serial, signature algorithm
  const [issuer, validity, subject, spki] = fields.slice(i, i + 4);
  if (!issuer || !validity || !subject || !spki) throw new Error("x509: tbs shape");
  const [notBefore, notAfter] = children(der, validity);

  const [algId] = children(der, spki);
  const [, curveOid] = children(der, algId);
  const curve = curveOid ? CURVE[oidString(der, curveOid)] : undefined;
  if (!curve) throw new Error("x509: unsupported key");

  const extensions = new Map<string, Uint8Array>();
  const extsWrapper = fields.slice(i + 4).find((t) => t.tag === 0xa3);
  if (extsWrapper) {
    const [extSeq] = children(der, extsWrapper);
    for (const ext of children(der, extSeq)) {
      const parts = children(der, ext);
      const value = parts[parts.length - 1];
      extensions.set(oidString(der, parts[0]), der.subarray(value.body, value.end));
    }
  }

  return {
    der,
    tbs: der.subarray(tbs.start, tbs.end),
    signatureHash,
    // BIT STRING: the first content byte is the unused-bit count (0 here).
    signature: der.subarray(sigValue.body + 1, sigValue.end),
    issuer: der.subarray(issuer.start, issuer.end),
    subject: der.subarray(subject.start, subject.end),
    notBefore: time(der, notBefore),
    notAfter: time(der, notAfter),
    spki: der.subarray(spki.start, spki.end),
    curve,
    extensions,
  };
}

function isCA(cert: Certificate): boolean {
  const value = cert.extensions.get(OID_BASIC_CONSTRAINTS);
  if (!value) return false;
  const seq = readTlv(value, 0);
  const [first] = children(value, seq);
  return first?.tag === 0x01 && value[first.body] !== 0;
}

/** DER ECDSA-Sig-Value → the fixed-width r‖s WebCrypto verifies. */
export function rawSignature(der: Uint8Array, size: number): Uint8Array {
  const seq = readTlv(der, 0);
  const out = new Uint8Array(size * 2);
  children(der, seq).forEach((int, k) => {
    let bytes = der.subarray(int.body, int.end);
    while (bytes.length > size && bytes[0] === 0) bytes = bytes.subarray(1);
    if (bytes.length > size) throw new Error("ecdsa: integer too long");
    out.set(bytes, k * size + (size - bytes.length));
  });
  return out;
}

export async function signedBy(child: Certificate, parent: Certificate): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "spki", parent.spki, { name: "ECDSA", namedCurve: parent.curve.name }, false, ["verify"]);
  return crypto.subtle.verify(
    { name: "ECDSA", hash: child.signatureHash }, key,
    rawSignature(child.signature, parent.curve.size), child.tbs);
}

// MARK: JWS

function bytesFromB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

export interface VerifyOptions {
  /** The trusted root's SHA-256; Apple's in production, a test root in tests. */
  rootSha256?: string;
  /** When certificates must have been valid, if the payload has no signedDate. */
  now?: number;
}

/** The payload of a signed transaction whose signature and chain check out,
 * else null. Never throws. */
export async function verifySignedTransaction(
  jws: string,
  { rootSha256 = APPLE_ROOT_CA_G3_SHA256, now = Date.now() }: VerifyOptions = {},
): Promise<Record<string, unknown> | null> {
  try {
    const [h, p, s, extra] = jws.split(".");
    if (!h || !p || !s || extra !== undefined) return null;
    const header = JSON.parse(new TextDecoder().decode(bytesFromB64(h))) as {
      alg?: string;
      x5c?: string[];
    };
    if (header.alg !== "ES256" || header.x5c?.length !== 3) return null;
    const payload = JSON.parse(new TextDecoder().decode(bytesFromB64(p))) as Record<string, unknown>;

    // Standard base64, not base64url, in x5c.
    const ders = header.x5c.map((c) => Uint8Array.from(atob(c), (ch) => ch.charCodeAt(0)));
    if ((await sha256Hex(ders[2])) !== rootSha256) return null;
    const [leaf, intermediate, root] = ders.map(parseCertificate);

    if (!same(leaf.issuer, intermediate.subject) || !same(intermediate.issuer, root.subject)) return null;
    if (!isCA(intermediate) || !intermediate.extensions.has(OID_INTERMEDIATE_MARKER)) return null;
    if (!leaf.extensions.has(OID_LEAF_MARKER)) return null;

    const at = typeof payload.signedDate === "number" ? payload.signedDate : now;
    for (const c of [leaf, intermediate]) if (at < c.notBefore || at > c.notAfter) return null;

    if (!(await signedBy(intermediate, root)) || !(await signedBy(leaf, intermediate))) return null;

    if (leaf.curve.name !== "P-256") return null; // ES256
    const key = await crypto.subtle.importKey(
      "spki", leaf.spki, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" }, key, bytesFromB64(s), new TextEncoder().encode(`${h}.${p}`));
    return ok ? payload : null;
  } catch {
    return null;
  }
}

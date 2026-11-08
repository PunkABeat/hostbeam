import { afterEach, describe, expect, it, vi } from "vitest";

import { reconcile } from "./reconcile";
import type { AlertEnv } from "./alerts";
import type { AppStoreEnv } from "./appstore";

/** Records what the worker would have emailed, so a test can assert on the
 * alert rather than on the internals that produced it. */
function envWithMailbox(sent: { subject: string; text: string }[]) {
  return {
    ALERT_TO: "alerts@example.test",
    EMAIL: { send: async (m: { subject: string; text: string }) => void sent.push(m) },
    PADDLE_API_URL: "https://paddle.test",
    PADDLE_API_KEY: "pk",
    KEYGEN_ACCOUNT_ID: "acct",
    KEYGEN_TOKEN: "tok",
    APPSTORE_ISSUER_ID: "issuer",
    APPSTORE_KEY_ID: "key",
    APPSTORE_PRIVATE_KEY: "not a usable key",
  } as unknown as AlertEnv & AppStoreEnv;
}

afterEach(() => vi.unstubAllGlobals());

describe("reconcile", () => {
  it("checks the App Store even when Paddle is unreachable", async () => {
    // The ordering is the point. The Paddle leg throws when Paddle is down, so
    // running the App Store check after it would mean an outage at one payment
    // provider stops us noticing that the other one has stopped minting.
    const sent: { subject: string; text: string }[] = [];
    vi.stubGlobal("fetch", async (url: string) =>
      String(url).includes("paddle.test")
        ? { ok: false, status: 500, json: async () => ({}) }
        : { ok: false, status: 401, json: async () => ({}) },
    );

    await expect(reconcile(envWithMailbox(sent))).rejects.toThrow(/paddle/i);

    const appstore = sent.find((m) => m.subject.includes("iOS purchases"));
    expect(appstore, "the App Store alert should have gone out first").toBeTruthy();
    expect(appstore?.text).toContain("APPSTORE_PRIVATE_KEY");
    // And it says what to do, because the moment it fires is a bad moment to
    // be reconstructing the reissue steps from memory.
    expect(appstore?.text).toContain("worker environments");
  });

  it("reports a healthy App Store alongside the Paddle result", async () => {
    const sent: { subject: string; text: string }[] = [];
    const env = envWithMailbox(sent);
    // A usable key, so the canary reaches the network and Apple answers 404 —
    // the healthy case.
    const subtle = crypto.subtle as unknown as {
      generateKey(a: unknown, e: boolean, u: string[]): Promise<CryptoKeyPair>;
    };
    const pair = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
      "sign",
      "verify",
    ]);
    const der = new Uint8Array(
      (await crypto.subtle.exportKey("pkcs8", pair.privateKey)) as ArrayBuffer,
    );
    (env as unknown as AppStoreEnv).APPSTORE_PRIVATE_KEY =
      `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----`;

    vi.stubGlobal("fetch", async (url: string) =>
      String(url).includes("paddle.test")
        ? { ok: true, status: 200, json: async () => ({ data: [] }) }
        : { ok: false, status: 404, json: async () => ({}) },
    );

    const out = await reconcile(env);
    expect(out.appstore).toBe("ok");
    expect(out.checked).toBe(0);
    expect(sent, "nothing is wrong, so nobody is emailed").toHaveLength(0);
  });
});

describe("reconcile before iOS has shipped", () => {
  it("says nothing when the App Store secrets are not set", async () => {
    // They are unset today, because iOS sells nothing yet. A daily "it is
    // broken" would be a false alarm, and a false alarm every morning is how
    // you learn to ignore the one that matters.
    const sent: { subject: string; text: string }[] = [];
    const env = envWithMailbox(sent) as unknown as Record<string, unknown>;
    delete env.APPSTORE_ISSUER_ID;
    delete env.APPSTORE_KEY_ID;
    delete env.APPSTORE_PRIVATE_KEY;
    vi.stubGlobal("fetch", async () => ({ ok: true, status: 200, json: async () => ({ data: [] }) }));

    const out = await reconcile(env as unknown as AlertEnv & AppStoreEnv);
    expect(out.appstore).toBe("unconfigured");
    expect(sent).toHaveLength(0);
  });

  it("treats a half-set of secrets as a misconfiguration, not as absence", async () => {
    // Arming itself when the secrets appear is what removes the flag someone
    // would forget to flip — but two out of three is nobody's intention.
    const sent: { subject: string; text: string }[] = [];
    const env = envWithMailbox(sent) as unknown as Record<string, unknown>;
    delete env.APPSTORE_PRIVATE_KEY;
    vi.stubGlobal("fetch", async () => ({ ok: true, status: 200, json: async () => ({ data: [] }) }));

    const out = await reconcile(env as unknown as AlertEnv & AppStoreEnv);
    expect(out.appstore).toContain("problem");
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain("2 of the 3");
  });
});

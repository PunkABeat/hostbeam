// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { PUBKEY_RE, deviceName, fingerprint, rememberDevice } from "./deviceKeys";
import type { PairedDevice } from "../types/config";

// A real ed25519 public key (public material — safe in a fixture).
const KEY =
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMgJPafhJ7MriF1V9yN9jkQJ8tTLXyBfTrIq2H21KqGo hostbeam-iphone";

describe("fingerprint", () => {
  it("matches what ssh-keygen -lf reports", async () => {
    // Verified against `ssh-keygen -lf` for this exact key.
    expect(await fingerprint(KEY)).toBe("SHA256:jfMk8P47s/IqAhayn05Hh+NP1sg8XbPNNe4FAaK57Uc");
  });

  it("returns null rather than a wrong answer for junk", async () => {
    expect(await fingerprint("")).toBeNull();
    expect(await fingerprint("ssh-ed25519")).toBeNull();
    expect(await fingerprint("ssh-ed25519 not-base64!!")).toBeNull();
  });
});

describe("deviceName", () => {
  it("uses the key comment, which is what the phone sets", () => {
    expect(deviceName(KEY)).toBe("hostbeam-iphone");
  });

  it("falls back when a key carries no comment", () => {
    expect(deviceName("ssh-ed25519 AAAAC3Nza")).toBe("iPhone");
  });
});

describe("rememberDevice", () => {
  const base: PairedDevice = { id: "SHA256:a", name: "iPhone", key: KEY, addedAt: 100 };

  it("keys on the fingerprint so re-authorizing does not duplicate", () => {
    const once = rememberDevice([], base);
    const twice = rememberDevice(once, { ...base, lastUsedAt: 200 });
    expect(twice).toHaveLength(1);
    expect(twice[0].lastUsedAt).toBe(200);
  });

  it("keeps the original addedAt — the device is not newly known", () => {
    const later = rememberDevice([base], { ...base, addedAt: 999 });
    expect(later[0].addedAt).toBe(100);
  });

  it("keeps other devices, since a Mac can pair more than one phone", () => {
    const two = rememberDevice([base], { ...base, id: "SHA256:b", name: "iPad" });
    expect(two.map((d) => d.id).sort()).toEqual(["SHA256:a", "SHA256:b"]);
  });
});

describe("PUBKEY_RE", () => {
  it("agrees with the Rust valid_pubkey guard", () => {
    expect(PUBKEY_RE.test(KEY)).toBe(true);
    expect(PUBKEY_RE.test("ssh-rsa AAAA")).toBe(false);
    expect(PUBKEY_RE.test("ssh-ed25519 short")).toBe(false);
  });
});

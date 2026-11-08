// @vitest-environment jsdom
// The licensing frontend helper (ADR 0014, ADR 0028): command wiring + the
// no-Tauri mock.
import { afterEach, describe, expect, it, vi } from "vitest";

// The transport, mocked: `inside` decides what isTauri() answers, `calls`
// records what reached Rust and `answer` is what Rust says back.
const transport = vi.hoisted(() => ({
  inside: false,
  calls: [] as Array<[string, unknown]>,
  answer: (() => undefined) as (cmd: string, args?: unknown) => unknown,
}));
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => transport.inside,
  invoke: (cmd: string, args?: unknown) => {
    transport.calls.push([cmd, args]);
    return Promise.resolve(transport.answer(cmd, args));
  },
}));

import { BEAM_ERRORS } from "./beam-errors";
import {
  activateLicense,
  deactivateLicense,
  fetchLicenseStatus,
  openPurchasePage,
  PURCHASE_URL,
} from "./license";

describe("license helper", () => {
  afterEach(() => {
    transport.inside = false;
    transport.calls = [];
    transport.answer = () => undefined;
  });

  it("mocks a license without Tauri so the reminder stays hidden in browser dev", async () => {
    const status = await fetchLicenseStatus();
    expect(status.tier).toBe("licensed");
    expect(transport.calls).toEqual([]);
  });

  it("routes status/activate/deactivate through the Rust commands", async () => {
    transport.inside = true;
    transport.answer = () => ({ tier: "free" });
    await fetchLicenseStatus();
    await activateLicense("HB-KEY");
    await deactivateLicense();
    expect(transport.calls.map((c) => c[0])).toEqual([
      "license_status",
      "license_activate",
      "license_deactivate",
    ]);
    expect(transport.calls[1]).toEqual(["license_activate", { key: "HB-KEY" }]);
  });

  it("opens the purchase page through the guarded open_url command", () => {
    transport.inside = true;
    openPurchasePage();
    expect(transport.calls).toEqual([["open_url", { url: PURCHASE_URL }]]);
    expect(PURCHASE_URL.startsWith("https://")).toBe(true);
  });
});

describe("no beam is ever refused for want of a license (ADR 0028)", () => {
  it("has no limit card", () => {
    expect(BEAM_ERRORS.limit).toBeUndefined();
  });
});

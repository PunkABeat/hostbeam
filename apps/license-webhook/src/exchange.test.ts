import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "./index";

// The exchange, through the worker's own entry point. Only the refusals that
// happen before any network call are testable here; the rest talks to Apple
// and Keygen.
const env = {} as Parameters<typeof worker.fetch>[1];

function exchange(body: unknown): Promise<Response> {
  return worker.fetch(
    new Request("https://license.hostbeam.app/appstore/key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    env,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("POST /appstore/key", () => {
  it("refuses a signed transaction that does not verify, before asking Apple anything", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await exchange({ transactionId: "2000000123456789", signedTransaction: "a.b.c" });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "unverified transaction" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses a request that carries only the id, before asking Apple anything", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await exchange({ transactionId: "2000000123456789" });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "signed transaction required" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("still refuses a malformed id first", async () => {
    const res = await exchange({ transactionId: "../etc", signedTransaction: "a.b.c" });
    expect(res.status).toBe(400);
  });
});

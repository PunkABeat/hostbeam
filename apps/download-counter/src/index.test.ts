import { afterEach, describe, expect, it, vi } from "vitest";

import worker, { type Env } from "./index";

/** A D1 stand-in that records what the Worker bound, or fails like an outage. */
function fakeDb(fail = false) {
  const writes: unknown[][] = [];
  const db = {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        run: async () => {
          if (fail) throw new Error("D1 unavailable");
          writes.push([sql.trim().split(/\s+/)[0], ...args]);
          return { success: true };
        },
      }),
    }),
  };
  return { env: { DB: db } as unknown as Env, writes };
}

/** Collects the work the Worker hands to waitUntil, so a test can await it. */
function fakeCtx() {
  const pending: Promise<unknown>[] = [];
  const ctx = {
    waitUntil: (p: Promise<unknown>) => void pending.push(p),
    passThroughOnException: () => {},
  } as unknown as ExecutionContext;
  return { ctx, settled: () => Promise.all(pending) };
}

function get(path: string, headers: Record<string, string> = {}, method = "GET", country = "FR") {
  const request = new Request(`https://download.hostbeam.app${path}`, { method, headers });
  Object.defineProperty(request, "cf", { value: { country } });
  return request as Request<unknown, IncomingRequestCfProperties>;
}

const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";

afterEach(() => vi.unstubAllGlobals());

describe("the download counter", () => {
  it("returns R2's response untouched and counts the download by day", async () => {
    const r2 = new Response("dmg bytes", { status: 200, headers: { ETag: '"abc"' } });
    const seen: Request[] = [];
    vi.stubGlobal("fetch", async (req: Request) => (seen.push(req), r2));
    const { env, writes } = fakeDb();
    const { ctx, settled } = fakeCtx();

    const response = await worker.fetch(get("/Hostbeam.dmg", { "User-Agent": MAC_SAFARI }), env, ctx);
    await settled();

    expect(response).toBe(r2);
    expect(seen).toHaveLength(1);
    expect(writes).toHaveLength(1);
    const [verb, day, ...rest] = writes[0];
    expect(verb).toBe("INSERT");
    expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(rest).toEqual(["dmg", "latest", "browser", "mac", "FR"]);
  });

  it("never stores the user agent or anything finer than the day", async () => {
    vi.stubGlobal("fetch", async () => new Response("x"));
    const { env, writes } = fakeDb();
    const { ctx, settled } = fakeCtx();

    await worker.fetch(get("/v0.1.34/Hostbeam_0.1.34.dmg", { "User-Agent": MAC_SAFARI }), env, ctx);
    await settled();

    const stored = JSON.stringify(writes);
    expect(stored).not.toContain("Safari");
    expect(stored).not.toMatch(/T\d{2}:/);
  });

  it("does not count a HEAD, a miss or a later range", async () => {
    const { env, writes } = fakeDb();
    const { ctx, settled } = fakeCtx();

    vi.stubGlobal("fetch", async () => new Response(null, { status: 200 }));
    await worker.fetch(get("/Hostbeam.dmg", {}, "HEAD"), env, ctx);
    await worker.fetch(get("/latest.json", {}, "HEAD"), env, ctx);
    vi.stubGlobal("fetch", async () => new Response("nope", { status: 404 }));
    await worker.fetch(get("/v2/.env"), env, ctx);
    await worker.fetch(get("/v9.9.9/Hostbeam.app.tar.gz"), env, ctx);
    vi.stubGlobal("fetch", async () => new Response("part", { status: 206 }));
    await worker.fetch(get("/Hostbeam.dmg", { Range: "bytes=500-" }), env, ctx);
    await settled();

    expect(writes).toEqual([]);
  });

  it("counts the app's update check as a check, not a download", async () => {
    const r2 = new Response('{"version":"0.1.34"}', { status: 200 });
    vi.stubGlobal("fetch", async () => r2);
    const { env, writes } = fakeDb();
    const { ctx, settled } = fakeCtx();

    const response = await worker.fetch(
      get("/latest.json", { "User-Agent": "tauri-plugin-updater/2.10.1" }, "GET", "DE"),
      env,
      ctx,
    );
    await settled();

    expect(response).toBe(r2);
    expect(writes.map(([, , ...rest]) => rest)).toEqual([["check", "latest", "updater", "mac", "DE"]]);
  });

  it("still serves the file when D1 is down", async () => {
    const r2 = new Response("dmg bytes");
    vi.stubGlobal("fetch", async () => r2);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { env } = fakeDb(true);
    const { ctx, settled } = fakeCtx();

    const response = await worker.fetch(get("/Hostbeam.dmg"), env, ctx);
    await settled();

    expect(response).toBe(r2);
    expect(errors).toHaveBeenCalledWith("download not counted:", "D1 unavailable");
  });
});

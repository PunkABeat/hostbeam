// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The host check, counted. `holds` is whether the host still has the key.
const host = vi.hoisted(() => ({ calls: [] as string[], holds: true }));
vi.mock("../../../lib/ipc", async (original) => ({
  ...(await original<typeof import("../../../lib/ipc")>()),
  testHost: (target: string) => {
    host.calls.push(target);
    return Promise.resolve({ ok: true, detail: "Reachable", keysPresent: host.holds ? [0] : [] });
  },
}));

import type { PrefHost } from "../shared";
import { RECHECK_AFTER_MS, useReachability } from "./useReachability";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const pool: PrefHost[] = [
  { id: "a", name: "a", user: "dev", address: "10.0.0.1" },
  { id: "b", name: "b", user: "dev", address: "10.0.0.2" },
];
const phone = { id: "iphone", name: "iPhone", key: "ssh-ed25519 AAAA phone", addedAt: 1 };

let reach: ReturnType<typeof useReachability>;
function Probe() {
  reach = useReachability(
    pool,
    ["a", "b"],
    [phone],
    () => {},
    () => {},
  );
  return null;
}

async function mount() {
  const el = document.createElement("div");
  const root = createRoot(el);
  await act(async () => root.render(<Probe />));
  return () => act(async () => root.unmount());
}
const flush = () => act(async () => {});
const later = (ms: number) => act(async () => void vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  host.calls = [];
  host.holds = true;
});
afterEach(() => vi.useRealTimers());

describe("useReachability re-checks", () => {
  it("asks every host again when the window comes back, but not twice in a moment", async () => {
    const unmount = await mount();
    expect(host.calls).toHaveLength(2); // on open
    await act(async () => void window.dispatchEvent(new Event("focus")));
    expect(host.calls).toHaveLength(2); // opening the window is a focus too

    await later(RECHECK_AFTER_MS + 1);
    await act(async () => void window.dispatchEvent(new Event("focus")));
    await flush();
    expect(host.calls).toHaveLength(4);
    await act(async () => void window.dispatchEvent(new Event("focus")));
    expect(host.calls).toHaveLength(4);
    await unmount();
  });

  it("asks one host again when its row opens, unless it just answered", async () => {
    const unmount = await mount();
    await flush();
    await act(async () => reach.recheck("a"));
    expect(host.calls).toHaveLength(2);
    await later(RECHECK_AFTER_MS + 1);
    await act(async () => reach.recheck("a"));
    expect(host.calls).toEqual(["a", "b", "a"]);
    await unmount();
  });

  it("stops saying authorized once the host no longer holds the key", async () => {
    const unmount = await mount();
    await flush();
    expect(reach.deviceHosts.a).toEqual(["iphone"]);
    host.holds = false; // removed from a terminal, behind the Mac's back
    await later(RECHECK_AFTER_MS + 1);
    await act(async () => reach.recheck("a"));
    await flush();
    expect(reach.deviceHosts.a).toEqual([]);
    await unmount();
  });
});

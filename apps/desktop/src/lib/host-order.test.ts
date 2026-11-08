import { describe, expect, it } from "vitest";

import { addedHosts, currentHost, dotFor, orderForSwitcher } from "./host-order";
import type { Host, RecentBeam } from "../types/config";

const hosts: Host[] = [{ id: "a" }, { id: "b" }, { id: "c", online: false }, { id: "d" }];
const beamed = (hostId: string): RecentBeam => ({ id: hostId, hostId, path: "/x", at: 0 });

describe("orderForSwitcher", () => {
  it("puts the default first, then recent hosts newest first, then the rest", () => {
    const order = orderForSwitcher(hosts, "c", [beamed("d"), beamed("b"), beamed("d")]);
    expect(order.map((h) => h.id)).toEqual(["c", "d", "b", "a"]);
  });

  it("copes with no default, a default that is gone, and recent rows for unknown hosts", () => {
    expect(orderForSwitcher(hosts, null, []).map((h) => h.id)).toEqual(["a", "b", "c", "d"]);
    expect(orderForSwitcher(hosts, "gone", [beamed("zzz")]).map((h) => h.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });
});

describe("addedHosts", () => {
  it("keeps an added host that left ~/.ssh/config, marked missing, in its place", () => {
    const added = addedHosts(["a", "gone", "b"], hosts);
    expect(added.map((h) => h.id)).toEqual(["a", "gone", "b"]);
    expect(added[1]).toEqual({ id: "gone", name: "gone", missing: true });
    expect(added[0].missing).toBeUndefined();
  });

  it("is empty with nothing added", () => {
    expect(addedHosts(undefined, hosts)).toEqual([]);
  });
});

describe("currentHost", () => {
  // The 2026-10-06 case: the default left ~/.ssh/config while the test host
  // was down, and beams went to the first host in the list — a real one.
  it("stays on a missing default rather than moving to another host", () => {
    const added = addedHosts(["client", "testhost"], [{ id: "client" }]);
    expect(currentHost(added, "testhost")).toMatchObject({ id: "testhost", missing: true });
  });

  it("takes the first added host only when no default is set or it was removed", () => {
    const added = addedHosts(["a", "b"], hosts);
    expect(currentHost(added, null)?.id).toBe("a");
    expect(currentHost(added, "removed")?.id).toBe("a");
    expect(currentHost(added, "b")?.id).toBe("b");
    expect(currentHost([], "a")).toBeNull();
  });
});

describe("dotFor", () => {
  it("prefers the probe's answer, then the record's claim, then unknown", () => {
    expect(dotFor({ a: { ok: true } }, { id: "a", online: false })).toBe("online");
    expect(dotFor({ a: { ok: false } }, { id: "a" })).toBe("offline");
    expect(dotFor({}, { id: "c", online: false })).toBe("offline");
    expect(dotFor(undefined, { id: "d" })).toBe("unknown");
  });
});

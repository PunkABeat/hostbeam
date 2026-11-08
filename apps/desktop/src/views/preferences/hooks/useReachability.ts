import React from "react";

import type { ConfigPatch } from "../../../lib/config";
import { installPubkey, isTauri, sshTarget, testHost, type TestResult } from "../../../lib/ipc";
import type { PairedDevice } from "../../../types/config";
import type { PrefHost } from "../shared";

/** How recent a probe must be for a re-check to skip it. */
export const RECHECK_AFTER_MS = 5000;

/** Each host's reachability (probed on open, on window focus, when its row is
 *  opened, and on demand) and, from the same probe, which paired devices it
 *  already accepts (ADR 0018 amendment). */
export function useReachability(
  pool: PrefHost[],
  addedIds: string[],
  pairedDevices: PairedDevice[],
  rememberPairedDevice: (device: PairedDevice) => void,
  update: (patch: ConfigPatch) => void,
) {
  const [tests, setTests] = React.useState<Record<string, string>>({});
  // id → ms timestamp of the last completed probe
  const [testedAt, setTestedAt] = React.useState<Record<string, number>>({});
  /* Which paired devices each host already accepts, by host id, learned from
     the reachability probe rather than remembered. A host missing from this
     map is UNKNOWN, not "no devices": a probe that failed tells us nothing
     about what the host would accept, and a stale "authorized" is worse than
     no answer. */
  const [deviceHosts, setDeviceHosts] = React.useState<Record<string, string[]>>({});
  const targetFor = (id: string): string => {
    const host = pool.find((h) => h.id === id);
    return host ? sshTarget(host) : id;
  };

  // Probe a host's reachability — real SSH (Rust test_host) in the app, a mock
  // in browser-dev, both behind lib/ipc. The paired devices ride along: the
  // connection is being made anyway, so the host answers "can I reach you" and
  // "whose keys do you hold" in one trip.
  const probe = (id: string): Promise<TestResult> =>
    testHost(
      targetFor(id),
      pairedDevices.map((d) => d.key),
    );
  const runTest = (id: string): Promise<void> => {
    setTests((p) => ({ ...p, [id]: "testing" }));
    // The devices the probe asked about, captured now: pairedDevices could
    // change while the ssh call is in flight, and the indices coming back are
    // indices into the list we sent.
    const asked = pairedDevices;
    const done = (status: string, present?: number[]) => {
      setTests((p) => ({ ...p, [id]: status }));
      setTestedAt((p) => ({ ...p, [id]: Date.now() }));
      setDeviceHosts((p) => {
        const next = { ...p };
        if (status === "ok")
          next[id] = (present || []).map((i) => asked[i]?.id).filter((x): x is string => !!x);
        else delete next[id]; // back to unknown, not to "none"
        return next;
      });
      // share the result so the popover's dots reflect it too
      update((p) => ({
        ...p,
        reach: { ...((p.reach as object) || {}), [id]: { ok: status === "ok", at: Date.now() } },
      }));
    };
    return probe(id)
      .then((r) => done(r.ok ? "ok" : "fail", r.keysPresent))
      .catch(() => done("fail"));
  };
  /* What a successful install means, wherever it happened: the device is
     remembered, and this host is now known to hold its key. Both surfaces that
     can authorize — the host's own row and the pairing sheet — go through here,
     because two of them updating different halves of the state is exactly how
     one ends up offering to do work the other has already done. */
  const recordAuthorized = (hostId: string, device: PairedDevice) => {
    rememberPairedDevice({ ...device, lastUsedAt: Date.now() });
    setDeviceHosts((p) => ({
      ...p,
      [hostId]: [...(p[hostId] || []).filter((x) => x !== device.id), device.id],
    }));
  };
  /* Install a remembered device's key on one host, from the host's own row.
     The same install_pubkey the pairing sheet calls — deliberately still a
     click, never a side effect of adding a host (ADR 0018 §2). */
  const authorizeDevice = (hostId: string, device: PairedDevice): Promise<void> => {
    if (!isTauri()) return Promise.resolve();
    return installPubkey(targetFor(hostId), device.key).then(() =>
      recordAuthorized(hostId, device),
    );
  };
  // Refresh every added host's dot, in parallel but bounded so a long host list
  // doesn't spawn dozens of ssh processes at once. Non-blocking: dots update as
  // each result lands.
  const checkAll = () => {
    const ids = addedIds.filter((id) => tests[id] !== "testing");
    let i = 0;
    const next = () => {
      if (i < ids.length) runTest(ids[i++]).finally(next);
    };
    for (let k = 0; k < Math.min(6, ids.length); k++) next();
  };
  // Probe on open so the dots are fresh without the user clicking Test.
  React.useEffect(() => {
    checkAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* The Mac cannot see a key added to or removed from a host behind its back —
     from the phone, from a terminal — so "authorized" was whatever the last
     probe said, however long ago. It asks again at the two moments someone is
     looking: when this window comes back to the front, and when a host's row
     is opened (`recheck`). A few seconds' grace keeps one gesture from asking
     twice, and a host already being probed is left to finish. */
  const latest = React.useRef({ tests, testedAt, runTest, checkAll });
  latest.current = { tests, testedAt, runTest, checkAll };
  const recheck = React.useCallback((id: string) => {
    const { tests, testedAt, runTest } = latest.current;
    if (tests[id] === "testing") return;
    const at = testedAt[id];
    if (at && Date.now() - at < RECHECK_AFTER_MS) return;
    void runTest(id);
  }, []);
  React.useEffect(() => {
    // Opening the window is a focus too, and `checkAll` above just ran.
    let last = Date.now();
    const onFocus = () => {
      if (Date.now() - last < RECHECK_AFTER_MS) return;
      last = Date.now();
      latest.current.checkAll();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return {
    tests,
    testedAt,
    deviceHosts,
    runTest,
    checkAll,
    recheck,
    recordAuthorized,
    authorizeDevice,
  };
}

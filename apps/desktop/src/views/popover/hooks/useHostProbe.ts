import { useEffect, useRef } from "react";

import { isTauri, sshTarget, testHost } from "../../../lib/ipc";
import type { Host } from "../../../types/config";

/** Probe just the beam-target host on open / focus (one SSH), so the host
 *  you're about to beam to has a fresh dot; rapid focus events are de-duped. */
export function useHostProbe(host: Host | null, recordReach: (id: string, ok: boolean) => void) {
  const lastProbe = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!host) return;
    if (!isTauri()) return;
    let cancelled = false;
    const probe = () => {
      const now = Date.now();
      if (lastProbe.current[host.id] && now - lastProbe.current[host.id] < 6000) return;
      lastProbe.current[host.id] = now;
      testHost(sshTarget(host))
        .then((r) => {
          if (!cancelled) recordReach(host.id, r.ok);
        })
        .catch(() => {});
    };
    probe();
    const onFocus = () => probe();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
    // Re-probe is keyed on the stable host?.id — the host object identity
    // changes on every config read even when the id hasn't; host is captured
    // for the probe body.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host?.id, recordReach]);
}

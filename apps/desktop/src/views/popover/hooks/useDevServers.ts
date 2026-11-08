import { useCallback, useEffect, useRef, useState } from "react";

import {
  devForwardOpen,
  devForwards,
  devForwardStop,
  devServers,
  isTauri,
  sshTarget,
  type OpenForward,
} from "../../../lib/ipc";
import { useRustMessage } from "../../../lib/rust-bridge";
import type { Host } from "../../../types/config";

/** Opening the popover twice in a row asks once. */
const RECHECK_AFTER_MS = 4000;

/** Why a port did not open, by its row. */
export interface DevOpenError {
  port: number;
  code: string;
}

/** The agent's dev servers on the current host (ADR 0029). Asked when the
 *  popover opens — the owner's choice over checking in the background — and
 *  never otherwise; a forward holds a connection only between Open and Stop. */
export function useDevServers(host: Host | null) {
  const target = host ? sshTarget(host) : null;
  const [ports, setPorts] = useState<number[]>([]);
  const [forwards, setForwards] = useState<OpenForward[]>([]);
  const [opening, setOpening] = useState<number | null>(null);
  const [error, setError] = useState<DevOpenError | null>(null);
  const lastCheck = useRef(0);

  const refreshForwards = useCallback(() => {
    devForwards()
      .then((open) => setForwards(open ?? []))
      .catch(() => {});
  }, []);

  const check = useCallback(
    (force = false) => {
      if (!target || !isTauri()) return;
      if (!force && Date.now() - lastCheck.current < RECHECK_AFTER_MS) return;
      lastCheck.current = Date.now();
      devServers(target)
        .then((found) => {
          if (!found?.checked) return;
          setPorts(found.ports);
          // A forward whose dev server has gone ends with it (ADR 0029 §5).
          devForwards()
            .then((answer) => {
              const open = answer ?? [];
              for (const f of open) {
                if (f.target === target && !found.ports.includes(f.port)) {
                  devForwardStop(target, f.port).catch(() => {});
                }
              }
              setForwards(open);
            })
            .catch(() => {});
        })
        .catch(() => setPorts([]));
    },
    [target],
  );

  useEffect(() => {
    setPorts([]);
    setError(null);
    check(true);
  }, [check]);
  useRustMessage("shown", () => check());
  useRustMessage("devForwards", refreshForwards);

  const open = (port: number) => {
    if (!target || opening !== null) return;
    setOpening(port);
    setError(null);
    devForwardOpen(target, port)
      .then(refreshForwards)
      .catch((code) => setError({ port, code: String(code) }))
      .finally(() => setOpening(null));
  };

  const stop = (port: number) => {
    if (!target) return;
    devForwardStop(target, port)
      .then(refreshForwards)
      .catch(() => {});
  };

  const here = forwards.filter((f) => f.target === target);
  // Every port worth a row: what the host said, and anything still open that
  // the last answer has not caught up with.
  const rows = [...new Set([...ports, ...here.map((f) => f.port)])].sort((a, b) => a - b);
  return { rows, forwards: here, opening, error, open, stop };
}

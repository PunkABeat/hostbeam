import { useEffect, useState } from "react";

import { autoBeamSet, autoBeamState } from "../../../lib/ipc";
import { useRustMessage } from "../../../lib/rust-bridge";

/** Auto-beam's armed state lives in Rust (it survives this webview being
 *  suspended, and expires on a timer there). This mirrors it for the switch:
 *  Rust reports arming, disarming and expiry; reading it on mount matters
 *  because the popover is rebuilt each time it opens, while the watcher has
 *  been running all along. */
export function useAutoBeam(): [boolean, (on: boolean) => void] {
  const [autoBeam, setAutoBeam] = useState(false);
  useRustMessage("autoBeam", (m) => setAutoBeam(m.armed));
  useEffect(() => {
    autoBeamState()
      .then((v) => setAutoBeam(!!v))
      .catch(() => {});
  }, []);
  const set = (v: boolean) => {
    setAutoBeam(v);
    autoBeamSet(v).catch(() => setAutoBeam(!v));
  };
  return [autoBeam, set];
}

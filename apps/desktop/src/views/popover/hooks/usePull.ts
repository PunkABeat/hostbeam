import { useState } from "react";

import { HB } from "../../../lib/config";
import { isTauri, pullIncoming, sshTarget, type Incoming } from "../../../lib/ipc";
import type { Host } from "../../../types/config";

/** Images the agent left on the host. Pull only — nothing is fetched until
 *  the button is pressed, so the app still never talks to a host on its own. */
export function usePull(host: Host | null) {
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [pulling, setPulling] = useState(false);
  const [pulled, setPulled] = useState(false);
  const pull = () => {
    if (!host || !isTauri() || pulling) return;
    setPulling(true);
    pullIncoming(sshTarget(host), HB.beamFolder(host.id))
      .then((r) => setIncoming(r || []))
      .catch(() => setIncoming([]))
      .finally(() => {
        setPulling(false);
        setPulled(true);
      });
  };
  return { incoming, pulling, pulled, pull };
}

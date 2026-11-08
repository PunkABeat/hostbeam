import React from "react";

import { isTauri, resolvePorts, sshTarget } from "../../../../lib/ipc";
import type { PrefHost } from "../../shared";

/** Effective SSH ports for the hosts the pane lists. The desktop models no
 *  port of its own (it beams `ssh <alias>` and lets OpenSSH resolve one), so
 *  `ssh -G` is the only truthful source. Resolved for the *added* hosts only,
 *  never the whole of ~/.ssh/config: a handful of ~10ms calls off the main
 *  thread, re-run only when the list of targets actually changes. */
export function usePorts(added: PrefHost[]): Record<string, number> {
  const [ports, setPorts] = React.useState<Record<string, number>>({});
  const targetKey = added.map(sshTarget).join("\n");
  React.useEffect(() => {
    const targets = targetKey ? targetKey.split("\n") : [];
    if (!isTauri() || targets.length === 0) return;
    let live = true;
    resolvePorts(targets).then(
      (r) => {
        if (live) setPorts(r ?? {});
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [targetKey]);
  return ports;
}

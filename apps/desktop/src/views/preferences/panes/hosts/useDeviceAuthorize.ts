import React from "react";

import type { PairedDevice } from "../../../../types/config";

/** Authorizing a remembered device from the host's own row, rather than by
 *  opening the pairing sheet first. One piece of state, reset when a different
 *  row opens, because only one host detail is open at a time.
 *
 *  Still a click, never a consequence of adding a host: ADR 0018 §2 turns on
 *  that distinction, and moving the button closer must not quietly erase it. */
export function useDeviceAuthorize(
  selectedId: string | null,
  authorizeDevice: (hostId: string, device: PairedDevice) => Promise<void>,
) {
  const [auth, setAuth] = React.useState<"idle" | "busy" | "err">("idle");
  React.useEffect(() => {
    setAuth("idle");
  }, [selectedId]);
  const authorize = (hostId: string, device: PairedDevice) => {
    if (auth === "busy") return;
    setAuth("busy");
    authorizeDevice(hostId, device)
      .then(() => setAuth("idle"))
      .catch(() => setAuth("err"));
  };
  return { auth, authorize };
}

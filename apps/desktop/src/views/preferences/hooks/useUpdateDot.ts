import React from "react";

import { updateAvailable } from "../../../lib/ipc";
import { updateToAnnounce, type UpdateStatus } from "../../../lib/updates";
import type { Config } from "../../../types/config";

/** The update-available dot on the About nav item (cached Rust-side, no
 *  network). Same rule as the popover's: nothing for a skipped version, or for
 *  one already installed in the background. */
export function useUpdateDot(cfg: Config): boolean {
  const [updStatus, setUpdStatus] = React.useState<UpdateStatus | null>(null);
  React.useEffect(() => {
    const check = () =>
      updateAvailable()
        .then(setUpdStatus)
        .catch(() => {});
    check();
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  return !!updateToAnnounce(updStatus, cfg.updateDismissed);
}

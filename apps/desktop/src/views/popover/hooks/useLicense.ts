import { useCallback, useEffect, useState } from "react";

import { isTauri } from "../../../lib/ipc";
import { fetchLicenseStatus, type LicenseStatus } from "../../../lib/license";
import { useRustMessage } from "../../../lib/rust-bridge";

/** Whether a license covers this version, for the header's "Unlicensed" and
 *  the license card (Rust owns the store and decides when the reminder is due;
 *  this is display-only). Refreshed each time the popover is shown — a key
 *  entered in Preferences should take the word away on the next look — and by
 *  the composition whenever the beam returns to idle. */
export function useLicense(): [LicenseStatus | null, () => void] {
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const checkLicense = useCallback(() => {
    if (!isTauri()) return;
    fetchLicenseStatus()
      .then(setLicense)
      .catch(() => {});
  }, []);
  useEffect(() => {
    const onFocus = () => checkLicense();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkLicense]);
  // The panel never receives `focus` (rust-bridge.ts), so this is the cue.
  useRustMessage("shown", checkLicense);
  return [license, checkLicense];
}

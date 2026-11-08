import { useCallback, useEffect, useState } from "react";

import { refreshConfig } from "../../../lib/config-sync";
import type { ConfigPatch } from "../../../lib/config";
import { appVersion as fetchAppVersion, updateAvailable } from "../../../lib/ipc";
import { useRustMessage } from "../../../lib/rust-bridge";
import { updatedSinceLastRun, updateToAnnounce, type UpdateStatus } from "../../../lib/updates";
import type { Config } from "../../../types/config";

/** The update notice and the gear dot, from the Rust-side cache (refreshed by
 *  the background check — no network from here); and "Updated to …", said once
 *  after an update. Also the popover's cue that it was just shown. */
export function useUpdateNotice(cfg: Config, update: (patch: ConfigPatch) => void) {
  const [updStatus, setUpdStatus] = useState<UpdateStatus | null>(null);
  const checkUpdateDot = useCallback(() => {
    updateAvailable()
      .then((r) => setUpdStatus(r))
      .catch(() => {});
  }, []);
  useEffect(() => {
    checkUpdateDot();
    // `focus` never fires on this non-activating panel; it stays as a harmless
    // belt-and-braces. The "shown" message below is the real cue.
    const onFocus = () => checkUpdateDot();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkUpdateDot]);
  // Rust says the panel was just shown: pick up whatever Preferences wrote
  // while it was hidden, then the update dot. Without it the dot could never
  // appear — the cache is empty at launch (the first check runs 15s later).
  useRustMessage("shown", () => {
    void refreshConfig();
    checkUpdateDot();
  });

  // The version this popover last ran as lives in the config; a first run has
  // nothing to compare against and only records it.
  const [appVersion, setAppVersion] = useState<string | null>(null);
  useEffect(() => {
    fetchAppVersion()
      .then((v) => setAppVersion(v))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (appVersion && !cfg.lastVersion) update((p) => ({ ...p, lastVersion: appVersion }));
  }, [appVersion, cfg.lastVersion, update]);

  // Skipped per version: skipping 0.1.8 hides it everywhere, and 0.1.9 is
  // announced as usual (lib/updates.ts).
  const updVersion = updateToAnnounce(updStatus, cfg.updateDismissed);
  const skipUpdate = () => update((p) => ({ ...p, updateDismissed: updVersion }));
  const updatedTo = updatedSinceLastRun(cfg.lastVersion, appVersion);
  const dismissUpdated = () => update((p) => ({ ...p, lastVersion: appVersion }));
  return { updVersion, skipUpdate, updatedTo, dismissUpdated };
}

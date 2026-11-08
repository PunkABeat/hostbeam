// What the update notices say, from Rust's update status and the config. Kept
// apart from the views so the rules have tests (ADR 0022): a skipped version is
// announced nowhere, and neither is one already installed in the background,
// because Hostbeam relaunches into that on its own.

/** Mirrors `UpdateStatus` in src-tauri/src/updates.rs. */
export interface UpdateStatus {
  available: boolean;
  version?: string | null;
  notes?: string | null;
  /** Installed in the background, waiting for a quiet moment to relaunch. */
  ready?: boolean;
}

/** The version to tell the user about — the popover line and both dots — or null. */
export function updateToAnnounce(
  status: UpdateStatus | null | undefined,
  skipped: string | null | undefined,
): string | null {
  if (!status?.available || status.ready || !status.version) return null;
  return status.version === skipped ? null : status.version;
}

/** The version Hostbeam was updated to since it last ran, or null. A first run
 *  has nothing to compare against, so it announces nothing. */
export function updatedSinceLastRun(
  lastVersion: string | null | undefined,
  current: string | null | undefined,
): string | null {
  if (!lastVersion || !current || lastVersion === current) return null;
  return current;
}

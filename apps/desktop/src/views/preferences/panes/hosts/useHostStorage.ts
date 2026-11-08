import React from "react";

import { hostCleanup, hostStorage, isTauri, sshTarget } from "../../../../lib/ipc";
import type { PrefHost } from "../../shared";

/** The remote-storage readout for the expanded host. */
export type StorageState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; count: number; kb: number; confirm: boolean }
  | { phase: "cleaning" }
  | { phase: "done"; deleted: number }
  | { phase: "error" };

export const storageSize = (kb: number) =>
  kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;

/** Remote-storage readout for the expanded host: on-demand only (no ambient
 *  SSH traffic), and the danger path is gated — cleanup needs a fresh count,
 *  then an explicit armed confirmation, and the Rust side only ever deletes
 *  hostbeam-* images at the folder's top level. One piece of state, reset
 *  when a different row opens, because only one host detail is open at a time. */
export function useHostStorage(
  selectedId: string | null,
  folders: Record<string, string>,
  defaultFolder: string | undefined,
) {
  const [stor, setStor] = React.useState<StorageState>({ phase: "idle" });
  React.useEffect(() => {
    setStor({ phase: "idle" });
  }, [selectedId]);
  const storTarget = (h: PrefHost) => ({
    target: sshTarget(h),
    // An empty folder is refused by Rust (`invalid`), which lands in the same
    // error state an absent one always did.
    folder: (folders && folders[h.id]) || defaultFolder || "",
  });
  const check = (h: PrefHost) => {
    setStor({ phase: "loading" });
    if (!isTauri()) return; // browser dev: no host to ask
    const { target, folder } = storTarget(h);
    hostStorage(target, folder)
      .then((v) => setStor({ phase: "ready", count: v.count, kb: v.kb, confirm: false }))
      .catch(() => setStor({ phase: "error" }));
  };
  const clean = (h: PrefHost) => {
    if (stor.phase !== "ready" || stor.count === 0) return;
    if (!stor.confirm) {
      // First click arms; it disarms on its own so a stray click can't linger.
      setStor({ ...stor, confirm: true });
      setTimeout(() => setStor((p) => (p.phase === "ready" ? { ...p, confirm: false } : p)), 4000);
      return;
    }
    setStor({ phase: "cleaning" });
    if (!isTauri()) return; // browser dev: no host to ask
    const { target, folder } = storTarget(h);
    hostCleanup(target, folder)
      .then((n) => setStor({ phase: "done", deleted: n ?? 0 }))
      .catch(() => setStor({ phase: "error" }));
  };
  return { stor, check, clean };
}

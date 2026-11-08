import { useCallback, useEffect, useState } from "react";

import { clipboardImage, isTauri } from "../../../lib/ipc";
import type { ClipState } from "../shared";

/** What is on the clipboard — null while checking. Re-checked on focus; the
 *  composition re-checks it whenever the beam returns to idle too (after a
 *  beam the clipboard holds the paste-ready text, not an image). In
 *  browser-dev the prototype's "ready" mock stands in, so the design demo
 *  still shows a screenshot. */
export function useClipboard() {
  const hasTauri = isTauri();
  const [clip, setClip] = useState<ClipState | null>(() =>
    hasTauri ? null : { present: true, width: 2560, height: 1440 },
  );
  const checkClip = useCallback(() => {
    if (!isTauri()) return;
    clipboardImage()
      .then((r) => setClip(r || { present: false }))
      .catch(() => setClip({ present: false }));
  }, []);
  useEffect(() => {
    const onFocus = () => checkClip();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkClip]);
  const clipPresent = clip ? clip.present : null; // null = still checking
  return { clip, setClip, clipPresent, hasTauri, checkClip };
}

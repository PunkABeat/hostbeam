// Keep the popover window sized to its rendered content height: measure the
// `.hb-wrap` card and ask Rust to resize, but only when the height actually
// changes (so re-renders don't spam IPC). No-op outside Tauri / the popover page.

import { isTauri, resizePopover } from "./ipc";

let last = 0;

export function fitPopover(): void {
  if (!isTauri()) return;
  const wrap = document.querySelector(".hb-wrap");
  if (!wrap) return;
  const h = Math.ceil(wrap.getBoundingClientRect().height);
  if (h > 0 && h !== last) {
    last = h;
    resizePopover(h);
  }
}

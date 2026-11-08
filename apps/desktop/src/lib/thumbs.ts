// Recent previews as an <img> can load them.
//
// A row's `thumb` is a path into Rust's thumbnail cache (src-tauri/src/thumbs.rs),
// served to the webview through Tauri's asset protocol — or, on rows written
// before previews moved out of the config, a data URL, which needs nothing.
import { convertFileSrc } from "@tauri-apps/api/core";

import { isTauri } from "./ipc";

/** The `src` for a stored preview, or null when the row has none. */
export function thumbUrl(thumb: string | null | undefined): string | null {
  if (!thumb) return null;
  if (thumb.startsWith("data:")) return thumb;
  return isTauri() ? convertFileSrc(thumb) : thumb;
}

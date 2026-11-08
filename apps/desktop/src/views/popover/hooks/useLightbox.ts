import { useState } from "react";

import { clipboardPreview, isTauri } from "../../../lib/ipc";
import type { ClipState } from "../shared";

export interface GalleryItem {
  src: string;
  caption?: string;
}
export interface LightboxOpts {
  src?: string;
  caption?: string;
  /** Every picture of one drop, when a grouped Recent row opened this. The row
   *  shows one thumbnail for five files; this is where the other four live. */
  gallery?: GalleryItem[];
}

/** The "tap to enlarge" lightbox. The live clipboard fetches a larger preview
 *  on demand; a Recent row passes its stored preview directly. */
export function useLightbox(clip: ClipState | null) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null); // null | "loading" | a url
  const [caption, setCaption] = useState("");
  const [gallery, setGallery] = useState<GalleryItem[] | undefined>();
  const openLightbox = (opts: LightboxOpts = {}) => {
    setOpen(true);
    setCaption(opts.caption || "");
    setGallery(opts.gallery);
    if (opts.src) {
      setPreview(opts.src);
      return;
    } // Recent entry — already have it
    if (!isTauri()) {
      setPreview((clip && clip.thumb) || null);
      return;
    }
    setPreview("loading");
    clipboardPreview()
      .then((url) => setPreview(url || (clip && clip.thumb) || null))
      .catch(() => setPreview((clip && clip.thumb) || null));
  };
  const closeLightbox = () => {
    setOpen(false);
    setPreview(null);
    setGallery(undefined);
  };
  return { open, preview, caption, gallery, openLightbox, closeLightbox };
}

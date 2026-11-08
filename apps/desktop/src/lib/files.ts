// What kind of file a path names, by its extension. No imports on purpose:
// the sentence and the config defaults depend on it, and they sit below i18n.

/** Extensions that are pictures — mirrors `IMAGE_EXTENSIONS` in
 *  src-tauri/src/beam.rs, which decides the same things on the Rust side: a
 *  thumbnail, the HUD's picture, the pasted sentence's "screenshot". Anything
 *  else is a file Hostbeam carries as it is (ADR 0006's 2026-09-26 amendment). */
export const IMAGE_EXTENSIONS: readonly string[] = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "heic",
  "heif",
  "avif",
  "tif",
  "tiff",
  "bmp",
];

/** A path's extension, lower-cased, or "" when its name has none. A leading
 *  dot is a hidden file's name, not an extension: `.env` has none. */
export function extOf(p: string | null | undefined): string {
  const parts = String(p || "").split("/");
  const name = parts[parts.length - 1] || "";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** Whether a path names a picture, by its extension, whatever its case. */
export function isImagePath(p: string | null | undefined): boolean {
  return IMAGE_EXTENSIONS.includes(extOf(p));
}

/** The type label a FileThumb shows for these files: their shared extension,
 *  or "" (the thumb's own "FILE") when they have none or differ. */
export function fileLabel(paths: string[]): string {
  const exts = new Set(paths.map(extOf));
  return exts.size === 1 ? [...exts][0] : "";
}

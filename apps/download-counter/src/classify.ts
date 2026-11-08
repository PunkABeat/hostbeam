// What a request to download.hostbeam.app was: which file, fetched by what, on
// which platform. Each answer is a word from a short fixed list, so the count
// can be read back but the request cannot be (ADR 0030). The user-agent string
// is read here and never leaves this file.

export type Kind = "dmg" | "dmg-versioned" | "update" | "check";
export type Agent = "browser" | "homebrew" | "updater" | "script" | "bot";
export type Platform = "mac" | "ios" | "android" | "windows" | "linux" | "other";

export interface File {
  kind: Kind;
  /** x.y.z, or "latest" for the site's link and the update check, which
   * always serve the newest. */
  version: string;
}

// scripts/release-macos.sh writes these names. `/Hostbeam.dmg` is the site's
// button, `vX/Hostbeam_X.dmg` is the Homebrew cask's URL,
// `vX/Hostbeam.app.tar.gz` is what the app's updater installs from, and
// `/latest.json` is what every running copy asks, 15 seconds after launch and
// then once a day (apps/desktop/src-tauri/src/updates.rs).
const VERSIONED_DMG = /^\/v(\d+\.\d+\.\d+)\/Hostbeam_\1\.dmg$/;
const UPDATE = /^\/v(\d+\.\d+\.\d+)\/Hostbeam\.app\.tar\.gz$/;

export function fileOf(path: string): File | null {
  if (path === "/Hostbeam.dmg") return { kind: "dmg", version: "latest" };
  if (path === "/latest.json") return { kind: "check", version: "latest" };
  let m = VERSIONED_DMG.exec(path);
  if (m) return { kind: "dmg-versioned", version: m[1] };
  m = UPDATE.exec(path);
  if (m) return { kind: "update", version: m[1] };
  return null;
}

/** Whether this request is one to count. For a file, only a completed
 * download: HEAD is a probe (the release script and Homebrew both send one
 * first), and a browser resuming, or a download manager splitting the file,
 * sends several ranged requests for one download, of which only the one from
 * the first byte counts. For the update check, any answered GET. */
export function counts(file: File, method: string, status: number, range: string | null): boolean {
  if (method !== "GET") return false;
  if (file.kind === "check") return status === 200 || status === 304;
  if (status === 200) return true;
  return status === 206 && range !== null && /^bytes=0-/.test(range.trim());
}

// Crawlers name themselves with "bot" or a "+https://…" contact URL; link
// previews (WhatsApp, Facebook) do neither, so they are listed.
const BOT =
  /bot|crawl|spider|slurp|discovery|scanner|headless|lighthouse|preview|facebookexternalhit|whatsapp|embedly|iframely|\+https?:\/\//i;
const SCRIPT = /^(curl|wget|node|undici|python|aria2|go-http-client|okhttp|java)\b/i;

export function agentOf(userAgent: string | null): Agent {
  const ua = userAgent?.trim() ?? "";
  if (ua === "") return "bot";
  if (ua.startsWith("tauri-plugin-updater/")) return "updater";
  if (ua.startsWith("Homebrew/")) return "homebrew";
  if (BOT.test(ua)) return "bot";
  if (SCRIPT.test(ua)) return "script";
  if (ua.startsWith("Mozilla/")) return "browser";
  return "bot";
}

export function platformOf(userAgent: string | null, agent: Agent): Platform {
  // The updater runs inside Hostbeam, which only runs on a Mac.
  if (agent === "updater") return "mac";
  const ua = userAgent ?? "";
  // iPhone before Mac: an iPhone's agent also says "like Mac OS X".
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Windows/.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/.test(ua)) return "mac";
  if (/Linux|X11|CrOS/.test(ua)) return "linux";
  return "other";
}

/** Cloudflare's two-letter country, or XX when it has none. */
export function countryOf(cf: { country?: unknown } | undefined): string {
  const c = cf?.country;
  return typeof c === "string" && /^[A-Z0-9]{2}$/.test(c) ? c : "XX";
}

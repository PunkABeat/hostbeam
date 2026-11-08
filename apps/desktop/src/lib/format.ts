// Pure formatting helpers used across the UI. Plain ES module: imported directly by
// the screens and tested directly.

import { t } from "../i18n";

/** Localized relative time ("just now", "6m ago", …). Reads the live locale
 *  on each call. */
export function relTime(at: number): string {
  const s = Math.max(0, Math.round((Date.now() - (at || Date.now())) / 1000));
  if (s < 45) return t("time.justNow");
  const m = Math.round(s / 60);
  if (m < 60) return t("time.minutesAgo", { m });
  const h = Math.round(m / 60);
  if (h < 24) return t("time.hoursAgo", { h });
  return t("time.daysAgo", { d: Math.round(h / 24) });
}

/** Final path segment (file name), with the original string as a fallback. */
export function baseName(p: string | null | undefined): string {
  const x = String(p || "").split("/");
  return x[x.length - 1] || (p as string);
}

/** Splits a beamed file's name into the machine prefix and the part that says
 *  what it is. Names carry the original file name since 0.1.19
 *  (`hostbeam-<stamp>-shot-2.png`), which is longer than a row is wide — and
 *  the front is the half you can afford to lose, since the stamp says the same
 *  thing the row's relative time already does. `head` is empty for a clipboard
 *  beam, which has no original name and so has nothing to trim towards.
 *
 *  The stamp is matched as ten-plus digits so an iPhone-beamed
 *  `hostbeam-2026-09-08-114207.png` is left whole rather than split at its year. */
export function beamName(base: string): { head: string; tail: string } {
  const m = /^(hostbeam-\d{10,}-)(.+)$/.exec(base);
  return m ? { head: m[1], tail: m[2] } : { head: "", tail: base };
}

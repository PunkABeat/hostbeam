// Pure parsing for CHANGELOG.md — no side effects, so both the release CLI
// (scripts/changelog.mjs) and the site's /changelog page can import it.
//
// It parses the shape this project actually writes rather than Markdown in
// general: `## X.Y.Z — YYYY-MM-DD`, then `### Added|Fixed|Changed` sections of
// `- ` bullets. A constrained parser over a format we control beats either a
// hand-rolled Markdown renderer (subtly wrong) or a dependency for one page.

/** The `## Unreleased` body, or null. Notes are written here while the work is
 * fresh, and `cut-release.mjs` renames the heading to a version at release time.
 *
 * Deliberately NOT returned by `parseChangelog`: the site renders that, and
 * publishing notes for a build nobody can download would describe the product
 * as something it is not yet. Only the release makes them public. */
export function parseUnreleased(source) {
  const m = source.match(/^## Unreleased\s*$/m);
  if (!m) return null;
  const after = source.slice(m.index + m[0].length);
  const next = after.search(/^## /m);
  const body = (next === -1 ? after : after.slice(0, next)).trim();
  return body || null;
}

/** Release lanes. The two apps ship on their own cadences and their own version
 * numbers — the Mac continuously through its updater, the iPhone in batches
 * through App Review — so an entry belongs to one of them. Mac headings stay
 * bare (`## 0.1.15 — 2026-09-07`) because the updater and the release scripts
 * have always read them that way; every other lane names itself
 * (`## iPhone 1.0 — 2026-09-20`). An unknown word is not a heading at all, so a
 * typo goes unpublished rather than shipping as a release nobody meant. */
const LANES = { iPhone: "iphone" };
export const DEFAULT_PLATFORM = "mac";
export const PLATFORM_LABEL = { mac: "Mac", iphone: "iPhone" };

/** Where each lane's releases live on the site. Each app links to its own page,
 * at the anchor of the version it runs: `apps/desktop/src/lib/changelog.ts` and
 * BeamEngine's `Changelog.swift` build the same URLs, and their tests pin the
 * exact form this module produces. */
export const CHANGELOG_PATH = { mac: "/changelog/mac/", iphone: "/changelog/iphone/" };

/** A release's anchor on the site: `mac-0.1.20`, `iphone-1.0`. The lane is part
 * of it because the two apps number their versions independently, and a Mac
 * 1.0 and an iPhone 1.0 must not share an address. */
export function releaseAnchor(release) {
  return `${release.platform}-${release.version}`;
}

/** Every *released* section, newest first, with its raw body and lane. */
export function parseChangelog(source) {
  const releases = [];
  const lanes = Object.keys(LANES).join("|");
  const re = new RegExp(
    // Two or three numbers: the Mac cuts x.y.z, the App Store shows 1.0.
    String.raw`^## (?:(${lanes}) )?(\d+\.\d+(?:\.\d+)?)\s+—\s+(\d{4}-\d{2}-\d{2})\s*$`,
    "gm",
  );
  const heads = [...source.matchAll(re)];
  for (let i = 0; i < heads.length; i++) {
    const start = heads[i].index + heads[i][0].length;
    const end = i + 1 < heads.length ? heads[i + 1].index : source.length;
    releases.push({
      platform: heads[i][1] ? LANES[heads[i][1]] : DEFAULT_PLATFORM,
      version: heads[i][2],
      date: heads[i][3],
      body: source.slice(start, end).trim(),
    });
  }
  return releases;
}

/** One lane's releases, newest first. Everything that drives a Mac release —
 * the updater's notes, the version guard, the cut — reads this rather than the
 * whole file, so an iPhone entry can never be mistaken for the newest Mac one. */
export function forPlatform(releases, platform = DEFAULT_PLATFORM) {
  return releases.filter((r) => r.platform === platform);
}

/** Strip the inline Markdown we actually use: **bold** and [text](url). */
function inline(s) {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[(.+?)\]\((.+?)\)/g, "$1");
}

/** A release body → `{ intro, sections: [{ title, items }] }` for rendering.
 * `intro` holds any prose before the first `###` (0.1.0 has a lead line). */
export function parseSections(body) {
  const sections = [];
  const introLines = [];
  let current = null;

  for (const raw of body.split("\n")) {
    const line = raw.trimEnd();
    const head = line.match(/^### (.+)$/);
    if (head) {
      current = { title: head[1].trim(), items: [] };
      sections.push(current);
      continue;
    }
    if (line.startsWith("- ")) {
      const text = inline(line.slice(2).trim());
      if (current) current.items.push(text);
      else {
        // Bullets before any ### (as in 0.1.0) get an untitled section.
        current = { title: "", items: [text] };
        sections.push(current);
      }
      continue;
    }
    if (line.startsWith("  ") && line.trim()) {
      // Continuation of the previous wrapped bullet.
      const target = current?.items;
      if (target?.length)
        target[target.length - 1] += " " + inline(line.trim());
      continue;
    }
    if (line.trim() && !current) introLines.push(inline(line.trim()));
  }

  return { intro: introLines.join(" "), sections };
}

/** The newest `n` released entries as `{ version, date, notes }`, notes in
 * plain text, newest first: the `history` list in latest.json. The Mac app
 * uses it to show what changed in every version since the one it is running,
 * not only the newest (someone going 0.1.9 → 0.1.12 wants 0.1.10 and 0.1.11
 * too). Ten is plenty: anyone further behind gets the About pane's link to
 * the site's full changelog. */
export function history(source, n = 10, platform = DEFAULT_PLATFORM) {
  return forPlatform(parseChangelog(source), platform)
    .slice(0, n)
    .map((r) => ({
      version: r.version,
      date: r.date,
      notes: toPlainText(r.body),
    }));
}

/** Markdown body → plain text, for the updater dialog and App Store notes. */
export function toPlainText(body) {
  const { intro, sections } = parseSections(body);
  const out = [];
  if (intro) out.push(intro, "");
  for (const s of sections) {
    if (s.title) out.push(s.title, "");
    for (const i of s.items) out.push(`- ${i}`);
    out.push("");
  }
  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

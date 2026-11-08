// Where the Mac app's release notes live on the site, and the link to one
// version's entry. The site builds the same page and anchors from CHANGELOG.md
// (scripts/changelog-parse.mjs: CHANGELOG_PATH and releaseAnchor), so a version
// here lands on its own notes; a version the site does not list yet simply
// opens at the top of the page.

export const MAC_CHANGELOG_URL = "https://hostbeam.app/changelog/mac/";

/** The Mac releases, at `version`'s entry when there is one. */
export function macChangelogUrl(version?: string | null): string {
  return version ? `${MAC_CHANGELOG_URL}#mac-${version}` : MAC_CHANGELOG_URL;
}

// Types for changelog-parse.mjs.
//
// The parser is plain JS because the release CLI runs it under bare node with
// no build step. Its TypeScript consumers — the site's /changelog page, its
// sitemap and its footer — were left inferring `any` for a release's platform,
// which made `PLATFORM_LABEL[rel.platform]` an implicit-any error under
// `astro check`. Declaring the shape here fixes it for every consumer at once
// and, more usefully, makes the lane a closed union instead of a loose string:
// a typo like "ipad" now fails the build rather than rendering `undefined`.
//
// Keep this in step with the .mjs. It is small, and the two files sit together.

/** A release lane. The two apps ship on their own cadences and their own
 * version numbers, so every entry belongs to exactly one of them. */
export type Platform = "mac" | "iphone";

/** A released entry: its lane, its version, its date, and its raw Markdown. */
export interface Release {
  platform: Platform;
  version: string;
  /** ISO date, `YYYY-MM-DD`, exactly as written in the heading. */
  date: string;
  /** The Markdown between this heading and the next, trimmed. */
  body: string;
}

/** One `### Added` / `### Fixed` block. `title` is empty for bullets that
 * appear before any `###` (0.1.0 has some). */
export interface Section {
  title: string;
  items: string[];
}

/** A release body split for rendering. `intro` is any prose before the first
 * `###`. */
export interface ParsedSections {
  intro: string;
  sections: Section[];
}

/** The newest entries flattened for the updater dialog and App Store notes. */
export interface HistoryEntry {
  version: string;
  date: string;
  notes: string;
}

/** The `## Unreleased` body, or null when there is none. Never part of
 * `parseChangelog` — unreleased notes describe a build nobody can download. */
export function parseUnreleased(source: string): string | null;

export const DEFAULT_PLATFORM: Platform;

/** Display names, keyed by lane. */
export const PLATFORM_LABEL: Record<Platform, string>;

/** Where each lane's releases live on the site: `/changelog/mac/`,
 * `/changelog/iphone/`. The apps open these pages. */
export const CHANGELOG_PATH: Record<Platform, string>;

/** A release's anchor on the site: `mac-0.1.20`, `iphone-1.0`. */
export function releaseAnchor(release: Pick<Release, "platform" | "version">): string;

/** Every *released* section, newest first, with its raw body and lane. */
export function parseChangelog(source: string): Release[];

/** One lane's releases, newest first. */
export function forPlatform(releases: Release[], platform?: Platform): Release[];

/** A release body → `{ intro, sections }` for rendering. */
export function parseSections(body: string): ParsedSections;

/** The newest `n` released entries for one lane, notes as plain text. */
export function history(source: string, n?: number, platform?: Platform): HistoryEntry[];

/** Markdown body → plain text, for the updater dialog and App Store notes. */
export function toPlainText(body: string): string;

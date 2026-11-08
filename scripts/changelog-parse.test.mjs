// The CHANGELOG feeds four surfaces (site, updater dialog, About, App Store),
// so a parsing mistake is a mistake users read. These cover the cases that
// would be wrong quietly rather than loudly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHANGELOG_PATH,
  forPlatform,
  history,
  parseChangelog,
  parseSections,
  parseUnreleased,
  releaseAnchor,
  toPlainText,
} from "./changelog-parse.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const real = readFileSync(join(root, "CHANGELOG.md"), "utf8");

const SAMPLE = `# Changelog

preamble prose

## Unreleased

### Fixed

- something not shipped yet

## 0.2.0 — 2026-09-01

### Added

- a shipped thing

## 0.1.0 — 2026-08-01

- first release
`;

test("unreleased notes are never published", () => {
  // The site renders parseChangelog. If Unreleased leaked into it, hostbeam.app
  // would describe a build nobody can download.
  const versions = parseChangelog(SAMPLE).map((r) => r.version);
  assert.deepEqual(versions, ["0.2.0", "0.1.0"]);
  assert.ok(!versions.includes("Unreleased"));
});

test("the updater is offered the newest RELEASED entry, not the pending one", () => {
  assert.equal(parseChangelog(SAMPLE)[0].version, "0.2.0");
});

test("unreleased body is found, and an empty section counts as nothing to cut", () => {
  assert.match(parseUnreleased(SAMPLE), /something not shipped yet/);
  assert.equal(
    parseUnreleased("# C\n\n## Unreleased\n\n## 0.1.0 — 2026-01-01\n\n- x\n"),
    null,
  );
  assert.equal(parseUnreleased("# C\n\n## 0.1.0 — 2026-01-01\n\n- x\n"), null);
});

test("the real CHANGELOG parses, and its newest entry has notes", () => {
  const releases = parseChangelog(real);
  assert.ok(releases.length > 0, "no releases parsed from the real file");
  assert.ok(
    toPlainText(releases[0].body).length > 0,
    "newest release has empty notes",
  );
});

test("plain text keeps bullets and drops markdown the updater cannot render", () => {
  const { body } = parseChangelog(SAMPLE)[0];
  const text = toPlainText(body);
  assert.match(text, /^- a shipped thing$/m);
  assert.ok(!text.includes("###"));
});

test("inline markdown is stripped, since the updater renders plain text", () => {
  const { sections } = parseSections(
    "### Fixed\n\n- **Mac:** see [the docs](https://x.dev)\n",
  );
  assert.equal(sections[0].items[0], "Mac: see the docs");
});

test("history: newest n entries, plain text, newest first — what latest.json carries", () => {
  const h = history(SAMPLE);
  assert.deepEqual(
    h.map((e) => e.version),
    ["0.2.0", "0.1.0"],
  );
  assert.equal(h[0].date, "2026-09-01");
  assert.equal(h[0].notes, "Added\n\n- a shipped thing");
  assert.equal(history(SAMPLE, 1).length, 1);
  // Unreleased never leaks into it: nothing installable is described.
  assert.ok(h.every((e) => !e.notes.includes("not shipped yet")));
});

test("history: the real changelog's newest Mac entry is exactly what --json emits", () => {
  const [newest] = history(real, 1);
  // The Mac lane's, not the file's first: that is the iPhone's when it shipped last.
  const [rel] = forPlatform(parseChangelog(real));
  assert.equal(newest.version, rel.version);
  assert.equal(newest.notes, toPlainText(rel.body));
});

// The two apps ship on their own version numbers, so the file carries both
// lanes. Everything that drives a Mac release must read the Mac lane only —
// an iPhone entry landing in latest.json would offer iPhone notes, or an
// iPhone version, to someone updating their Mac.
const TWO_LANES = `# Changelog

## Unreleased

### Fixed

- not shipped yet

## iPhone 1.1 — 2026-10-02

### Added

- an iPhone thing

## 0.2.0 — 2026-09-30

### Added

- a Mac thing

## iPhone 1.0 — 2026-09-20

### Added

- the first iPhone release

## 0.1.0 — 2026-08-01

### Fixed

- an older Mac thing
`;

test("parseChangelog tags each entry with its app; a bare heading is the Mac", () => {
  assert.deepEqual(
    parseChangelog(TWO_LANES).map((r) => `${r.platform} ${r.version}`),
    ["iphone 1.1", "mac 0.2.0", "iphone 1.0", "mac 0.1.0"],
  );
});

test("forPlatform keeps one lane, newest first", () => {
  const all = parseChangelog(TWO_LANES);
  assert.deepEqual(
    forPlatform(all).map((r) => r.version),
    ["0.2.0", "0.1.0"],
  );
  assert.deepEqual(
    forPlatform(all, "iphone").map((r) => r.version),
    ["1.1", "1.0"],
  );
});

test("an iPhone entry never reaches the Mac updater's notes or history", () => {
  // What release-macos.sh writes into latest.json.
  const [newest] = history(TWO_LANES, 10);
  assert.equal(newest.version, "0.2.0");
  assert.ok(!JSON.stringify(history(TWO_LANES, 10)).includes("iPhone"));
  // And the App Store lane is reachable on request.
  assert.equal(history(TWO_LANES, 10, "iphone")[0].version, "1.1");
});

test("entry bodies stop at the next heading, whichever app it belongs to", () => {
  const byVersion = Object.fromEntries(
    parseChangelog(TWO_LANES).map((r) => [r.version, r.body]),
  );
  assert.equal(byVersion["0.2.0"], "### Added\n\n- a Mac thing");
  assert.equal(byVersion["1.0"], "### Added\n\n- the first iPhone release");
  assert.ok(!byVersion["1.1"].includes("Mac thing"));
});

test("an unrecognised app name is not a release at all", () => {
  // Better unpublished than shipped as a release nobody meant.
  const typo =
    "# Changelog\n\n## iphone 1.0 — 2026-09-20\n\n- oops\n\n## 0.1.0 — 2026-08-01\n\n- real\n";
  assert.deepEqual(
    parseChangelog(typo).map((r) => r.version),
    ["0.1.0"],
  );
});

test("the real changelog carries both apps, so the site shows its app filter", () => {
  // Mac-only until iPhone 1.0 went for review (2026-09-28), which is exactly
  // when /changelog was meant to grow its All · Mac · iPhone tabs.
  assert.deepEqual(
    [...new Set(parseChangelog(real).map((r) => r.platform))].sort(),
    ["iphone", "mac"],
  );
});

test("each app's page and each release's anchor have the shape the apps link to", () => {
  // apps/desktop/src/lib/changelog.ts and BeamEngine's Changelog.swift build
  // these URLs by hand, and their own tests pin the same strings. Changing the
  // shape here without them sends every in-app link to the top of the page.
  assert.deepEqual(CHANGELOG_PATH, { mac: "/changelog/mac/", iphone: "/changelog/iphone/" });
  assert.equal(releaseAnchor({ platform: "mac", version: "0.1.20" }), "mac-0.1.20");
  assert.equal(releaseAnchor({ platform: "iphone", version: "1.0" }), "iphone-1.0");
});

test("every release in the real changelog has its own anchor", () => {
  // Two entries sharing an anchor would make a link land on the wrong one.
  const anchors = parseChangelog(real).map(releaseAnchor);
  assert.equal(new Set(anchors).size, anchors.length);
});

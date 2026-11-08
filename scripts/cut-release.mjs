#!/usr/bin/env node
// Turn the accumulated `## Unreleased` notes into a numbered release.
//
//   node scripts/cut-release.mjs            # next patch (0.1.10 -> 0.1.11)
//   node scripts/cut-release.mjs 0.2.0      # an explicit version
//
// Then `scripts/release.sh` does the rest. Splitting it this way is the point:
// notes get written while the work is fresh and the reason is still in someone's
// head, and cutting is mechanical. Reconstructing a changelog from `git log`
// months later is how release notes become subtly wrong — it happened for
// 0.1.10, which had to be rebuilt from commits because there was nowhere to put
// a note at the time.
//
// Refuses to cut nothing. A release with no user-visible change is a version
// number for its own sake, and every user is asked to install it.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  forPlatform,
  parseChangelog,
  parseUnreleased,
  toPlainText,
} from "./changelog-parse.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const at = (p) => join(root, p);
const read = (p) => readFileSync(at(p), "utf8");
const die = (...lines) => {
  for (const l of lines) console.error(l);
  process.exit(1);
};

const CHANGELOG = "CHANGELOG.md";
const md = read(CHANGELOG);

const unreleased = parseUnreleased(md);
if (!unreleased) {
  die(
    `${CHANGELOG} has no \`## Unreleased\` notes to cut.`,
    "",
    "Add them first — a heading `## Unreleased` above the newest version, then",
    "`### Added` / `### Fixed` bullets written for the people who use Hostbeam.",
    "If nothing user-visible changed, there is nothing to release.",
  );
}

// The Mac lane only: this script cuts Mac releases, and an iPhone entry sitting
// above them must not become "the last release" it compares and bumps from.
const released = forPlatform(parseChangelog(md));
const latest = released[0]?.version ?? "0.0.0";

// A shipped entry IS the release notes users already received — the Mac updater
// serves them from latest.json before they agree to install. Editing one
// rewrites history someone has already read.
//
// This has now happened twice: once appending to 0.1.7 after it shipped, and
// again appending an iPhone note to 0.1.11 an hour after release. Both were
// caught by hand. The rule was written down after the first and did not survive
// the second, so it is checked here instead — at the last moment before the
// next release, which is when it is still cheap to fix.
if (released[0]) {
  try {
    const res = await fetch("https://download.hostbeam.app/latest.json");
    const live = await res.json();
    if (live.version === released[0].version) {
      const ours = toPlainText(released[0].body).trim();
      if (ours !== String(live.notes).trim()) {
        die(
          `${CHANGELOG}'s ${live.version} entry no longer matches what was shipped.`,
          "",
          "Those notes are already in front of users, in the updater dialog and on",
          "the site. Restore that entry to what latest.json serves and put the new",
          "text under `## Unreleased`, where it will reach the release it belongs to.",
        );
      }
    }
  } catch {
    console.warn(
      "!  could not reach latest.json to verify the last entry — continuing",
    );
  }
}
const bump = (v) => {
  const [a, b, c] = v.split(".").map(Number);
  return `${a}.${b}.${c + 1}`;
};
const version = process.argv[2] ?? bump(latest);
if (!/^\d+\.\d+\.\d+$/.test(version))
  die(`"${version}" is not a version. Use x.y.z.`);

const cmp = (x, y) => {
  // A missing component counts as 0, so a two-number version (which the
  // changelog now allows, for the App Store's 1.0) never compares as NaN.
  const [a, b] = [x, y].map((v) => v.split(".").map(Number));
  for (let i = 0; i < 3; i++)
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0);
  return 0;
};
if (cmp(version, latest) <= 0) {
  die(
    `${version} is not newer than the last release (${latest}).`,
    "The updater serves whatever latest.json names; going backwards strands everyone.",
  );
}

// Local date, not UTC: an evening release east of UTC would otherwise be dated
// yesterday, and the date is what users read next to the version.
const date = new Date().toLocaleDateString("en-CA");

// Rename the heading in place and leave a fresh empty one behind, so the next
// change has somewhere obvious to land. An empty section parses as "nothing to
// cut", so it cannot be released by accident.
const next = md.replace(
  /^## Unreleased\s*$/m,
  `## Unreleased\n\n## ${version} — ${date}`,
);
if (next === md)
  die(
    "Could not rewrite the `## Unreleased` heading — has its format changed?",
  );
writeFileSync(at(CHANGELOG), next);

const files = [
  ["apps/desktop/src-tauri/tauri.conf.json", /("version":\s*")[^"]+(")/],
  ["apps/desktop/package.json", /("version":\s*")[^"]+(")/],
  ["apps/desktop/src-tauri/Cargo.toml", /^(version = ")[^"]+(")/m],
  // Tracked, and it carries the crate version. Cargo would rewrite it on the
  // next build anyway — but that build is the release, which would then finish
  // with a dirty tree and a lock file disagreeing with the tag.
  [
    "apps/desktop/src-tauri/Cargo.lock",
    /(name = "hostbeam"\nversion = ")[^"]+(")/,
  ],
];
for (const [file, re] of files) {
  const before = read(file);
  const after = before.replace(re, `$1${version}$2`);
  if (before === after) die(`Could not bump the version in ${file}.`);
  writeFileSync(at(file), after);
}

// progress.md carries both a machine-checked marker and a human table row; the
// check only guards the marker, so the row is the one that silently drifts.
const PROGRESS = "docs/process/progress.md";
let progress = read(PROGRESS);
progress = progress.replace(
  /(<!--\s*progress-state:\s*desktop=)[^\s]+/,
  `$1${version}`,
);
const row = /^(\|\s*Mac\s*\|\s*)\d+\.\d+\.\d+(\s*\|)/m;
if (row.test(progress)) progress = progress.replace(row, `$1${version}$2`);
else
  console.warn(
    `!  ${PROGRESS} has no "| Mac | x.y.z |" row to update — check it by hand.`,
  );
writeFileSync(at(PROGRESS), progress);

console.log(`\n  cut ${latest} → ${version}  (${date})\n`);
console.log(unreleased.replace(/^/gm, "  "));
console.log(`
  Bumped: tauri.conf.json, package.json, Cargo.toml, progress.md

  Next:
    git commit -am "chore(release): ${version}"
    git push origin main && gh workflow run desktop.yml --ref main
    gh run watch <id> --exit-status        # id: gh run list --workflow desktop.yml --limit 1
    scripts/release.sh                     # refuses unless desktop.yml passed on this commit
    git tag v${version} && git push origin main v${version}
`);

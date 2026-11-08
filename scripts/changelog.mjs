#!/usr/bin/env node
// Reads CHANGELOG.md and emits one release's notes.
//
//   node scripts/changelog.mjs                 # newest version's notes, plain text
//   node scripts/changelog.mjs 0.1.5           # a specific version
//   node scripts/changelog.mjs --json          # { version, date, notes }
//   node scripts/changelog.mjs --history       # newest 10 as [{ version, date, notes }]
//   node scripts/changelog.mjs --history=25    # newest 25
//   node scripts/changelog.mjs --platform=iphone   # the iPhone lane (App Store)
//
// Everything defaults to the Mac lane, which is what latest.json and the
// release script want; --platform picks another (see changelog-parse.mjs).
//
// Two consumers depend on this, which is the whole point of having one file:
//   * scripts/release-macos.sh  → `notes` in latest.json, so the Mac updater can
//     show what changed BEFORE the user agrees to install.
//   * App Store Connect         → paste the output into "What's New".
//
// Plain text on purpose: the updater dialog and App Store both render text, not
// Markdown, so headings become plain lines and bullets stay as "-".
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  DEFAULT_PLATFORM,
  forPlatform,
  history,
  parseChangelog,
  PLATFORM_LABEL,
  toPlainText,
} from "./changelog-parse.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const md = readFileSync(join(root, "CHANGELOG.md"), "utf8");

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const wanted = args.find((a) => !a.startsWith("--"));

const platform =
  args.find((a) => a.startsWith("--platform="))?.split("=")[1] ??
  DEFAULT_PLATFORM;
if (!PLATFORM_LABEL[platform]) {
  console.error(
    `Unknown platform "${platform}". Known: ${Object.keys(PLATFORM_LABEL).join(", ")}`,
  );
  process.exit(1);
}

const releases = forPlatform(parseChangelog(md), platform);
if (!releases.length) {
  console.error(
    `No ${PLATFORM_LABEL[platform]} releases in CHANGELOG.md — expected a heading like ` +
      (platform === DEFAULT_PLATFORM
        ? "'## 1.2.3 — YYYY-MM-DD'."
        : `'## ${PLATFORM_LABEL[platform]} 1.2.3 — YYYY-MM-DD'.`),
  );
  process.exit(1);
}
const hist = args.find((a) => a === "--history" || a.startsWith("--history="));
if (hist) {
  const n = Number(hist.split("=")[1]) || 10;
  console.log(JSON.stringify(history(md, n, platform)));
  process.exit(0);
}
const rel = wanted ? releases.find((r) => r.version === wanted) : releases[0];
if (!rel) {
  console.error(
    `No entry for ${wanted}. Known: ${releases.map((r) => r.version).join(", ")}`,
  );
  process.exit(1);
}

const notes = toPlainText(rel.body);
console.log(
  asJson
    ? JSON.stringify({ version: rel.version, date: rel.date, notes })
    : notes,
);

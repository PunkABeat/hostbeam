#!/usr/bin/env node
// Staleness guard for docs/process/progress.md.
//
// The contribution protocol has always said to update this file when work
// state changes. It went stale anyway — an instruction nobody can fail is not
// a control. So the file declares the versions it describes, and this fails
// when they drift from the source of truth.
//
// It cannot prove the prose is current; it proves the file has been looked at
// since the version last moved, which is the strongest available proxy and
// catches the moment that matters most — shipping a release described by an
// older one. Run by scripts/release-macos.sh alongside check-version-sync.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const PROGRESS = "docs/process/progress.md";
const progress = read(PROGRESS);

const marker = progress.match(/<!--\s*progress-state:\s*([^>]*?)\s*-->/);
if (!marker) {
  console.error(`${PROGRESS} is missing its state marker. Add this as the first line:`);
  console.error("  <!-- progress-state: desktop=<version> ios=<version> -->");
  process.exit(1);
}
const declared = Object.fromEntries(
  marker[1]
    .split(/\s+/)
    .filter(Boolean)
    .map((pair) => pair.split("=")),
);

const actual = {
  desktop: JSON.parse(read("apps/desktop/src-tauri/tauri.conf.json")).version,
  ios: read("apps/mobile/project.yml").match(/^\s*MARKETING_VERSION:\s*"?([^"\n]+)"?/m)?.[1]?.trim(),
};

const drift = Object.entries(actual).filter(([k, v]) => declared[k] !== v);
if (drift.length) {
  console.error(`${PROGRESS} describes a version the repo has moved past:`);
  for (const [k, v] of drift) console.error(`  ${k}: says ${declared[k] ?? "—"}, repo is ${v}`);
  console.error("");
  console.error("Update the file — genuinely, not just the marker — then set:");
  console.error(`  <!-- progress-state: desktop=${actual.desktop} ios=${actual.ios} -->`);
  process.exit(1);
}

console.log(`progress.md is current: desktop ${actual.desktop} · iOS ${actual.ios}`);

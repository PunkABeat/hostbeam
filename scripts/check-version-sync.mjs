#!/usr/bin/env node
// Release guard (packaging checklist §6): tauri.conf.json is the version
// source of truth; Cargo.toml and the desktop package.json must match it.
// Exits non-zero with a precise message on drift.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const conf = JSON.parse(read("apps/desktop/src-tauri/tauri.conf.json")).version;
const pkg = JSON.parse(read("apps/desktop/package.json")).version;
const cargo = read("apps/desktop/src-tauri/Cargo.toml").match(
  /^version\s*=\s*"([^"]+)"/m,
)?.[1];

const versions = {
  "tauri.conf.json": conf,
  "package.json (desktop)": pkg,
  "Cargo.toml": cargo,
};
const distinct = new Set(Object.values(versions));
if (distinct.size !== 1 || distinct.has(undefined)) {
  console.error("Version drift — releases must ship one version everywhere:");
  for (const [file, v] of Object.entries(versions)) console.error(`  ${file}: ${v ?? "NOT FOUND"}`);
  process.exit(1);
}
// iOS is a SEPARATE lane, deliberately (2026-08-30). Its version cannot be
// cross-checked against the desktop trio because the two ship on different
// cadences — the Mac continuously via its updater, the iPhone in batches through
// App Review. What can be enforced is that iOS declares a well-formed version
// and build number at all: an App Store version can never be reused, and a
// malformed or missing one fails at upload time, after the build.
const ios = read("apps/mobile/project.yml");
const iosVersion = ios.match(/^\s*MARKETING_VERSION:\s*"?([^"\n]+)"?/m)?.[1]?.trim();
const iosBuild = ios.match(/^\s*CURRENT_PROJECT_VERSION:\s*"?([^"\n]+)"?/m)?.[1]?.trim();

const iosProblems = [];
if (!iosVersion) iosProblems.push("MARKETING_VERSION not found in apps/mobile/project.yml");
else if (!/^\d+\.\d+(\.\d+)?$/.test(iosVersion))
  iosProblems.push(`MARKETING_VERSION "${iosVersion}" is not a valid App Store version (x.y or x.y.z)`);
if (!iosBuild) iosProblems.push("CURRENT_PROJECT_VERSION not found in apps/mobile/project.yml");
else if (!/^\d+$/.test(iosBuild))
  iosProblems.push(`CURRENT_PROJECT_VERSION "${iosBuild}" must be a positive integer`);
// The generated Info.plists must reference the build settings; a literal
// version there silently wins, and every build until 2026-09-04 carried
// 1.0 (1) whatever project.yml said.
for (const t of ["App", "Share", "ActionExt", "Widgets"]) {
  let plist;
  try { plist = read(`apps/mobile/${t}/Info.plist`); } catch {
    // Generated, git-ignored: absent on a fresh checkout until xcodegen runs.
    iosProblems.push(`apps/mobile/${t}/Info.plist missing — run xcodegen generate in apps/mobile first`);
    continue;
  }
  const short = plist.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]*)<\/string>/)?.[1];
  const bundle = plist.match(/<key>CFBundleVersion<\/key>\s*<string>([^<]*)<\/string>/)?.[1];
  if (short !== "$(MARKETING_VERSION)")
    iosProblems.push(`apps/mobile/${t}/Info.plist CFBundleShortVersionString is "${short}", not $(MARKETING_VERSION) — regenerate with xcodegen`);
  if (bundle !== "$(CURRENT_PROJECT_VERSION)")
    iosProblems.push(`apps/mobile/${t}/Info.plist CFBundleVersion is "${bundle}", not $(CURRENT_PROJECT_VERSION) — regenerate with xcodegen`);
}
// App Store Connect refuses a build number it has already seen — after the
// archive and the signing, not before. Build 1 went to TestFlight on
// 2026-08-24 with the number still at 1 in this file; this is the check
// that would have caught the next upload.
try {
  const uploads = JSON.parse(read("apps/mobile/uploads.json")).uploads || [];
  const last = Math.max(0, ...uploads.map((u) => Number(u.build) || 0));
  if (iosBuild && Number(iosBuild) <= last)
    iosProblems.push(`CURRENT_PROJECT_VERSION ${iosBuild} is not above the last uploaded build (${last}, see apps/mobile/uploads.json)`);
} catch (e) {
  iosProblems.push(`apps/mobile/uploads.json unreadable: ${e.message}`);
}

if (iosProblems.length) {
  console.error("iOS version problems:");
  for (const p of iosProblems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`version sync ok: desktop ${conf} · iOS ${iosVersion} (build ${iosBuild}, independent)`);

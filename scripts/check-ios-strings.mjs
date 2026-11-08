#!/usr/bin/env node
// Fails when the iPhone app shows a string that is not translated into every
// language it ships in.
//
// The compiler, not a regex, says which strings the code uses: with
// SWIFT_EMIT_LOC_STRINGS on (project.yml), every build writes a .stringsdata
// file per source file listing each localizable literal, with its placeholders
// already in catalog form (%@, %lld). This reads those from a build's derived
// data and checks each key against Shared/Localizable.xcstrings.
//
// Why it exists: the catalog only learns about a new string when someone
// builds in the Xcode app, and this project is built from the command line. On
// 2026-09-23 forty strings — error cards, the Shortcuts dialog, the widget —
// were English in all seven other languages, and nothing had said so.
// docs/process/ios-code-review-2026-09.md § A5.
//
// Usage: node scripts/check-ios-strings.mjs <derived-data dir>
//   e.g. node scripts/check-ios-strings.mjs apps/mobile/dd-ci

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const LANGUAGES = ["de", "es", "fr", "ja", "ko", "pt-BR", "zh-Hans"];

/** Every localizable key the build extracted, keyed to the file it came from. */
export function extractedKeys(stringsdataFiles) {
  const keys = new Map();
  for (const { name, json } of stringsdataFiles) {
    const table = json?.tables?.Localizable ?? [];
    for (const entry of table) if (!keys.has(entry.key)) keys.set(entry.key, name);
  }
  return keys;
}

/** The keys that would show untranslated in at least one language. */
export function untranslated(keys, catalog) {
  const strings = catalog.strings ?? {};
  const out = [];
  for (const [key, source] of keys) {
    const entry = strings[key];
    if (entry?.shouldTranslate === false) continue;
    const missing = LANGUAGES.filter((l) => !entry?.localizations?.[l]?.stringUnit?.value);
    if (missing.length) out.push({ key, source, missing });
  }
  return out;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (name.endsWith(".stringsdata")) yield path;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const derived = process.argv[2];
  if (!derived) {
    console.error("usage: check-ios-strings.mjs <derived-data dir>");
    process.exit(2);
  }
  // Only the app's own targets: the packages it links bring their own
  // (App Intents metadata) files that are not ours to translate.
  const root = join(derived, "Build/Intermediates.noindex/Hostbeam.build");
  const files = [...walk(root)].map((path) => ({
    name: path.split("/").pop().replace(".stringsdata", ""),
    json: JSON.parse(readFileSync(path, "utf8")),
  }));
  const keys = extractedKeys(files);
  if (keys.size === 0) {
    console.error(
      `✗ no localizable strings found under ${root} — was the build run with SWIFT_EMIT_LOC_STRINGS=YES?`,
    );
    process.exit(1);
  }
  const catalog = JSON.parse(
    readFileSync(new URL("../apps/mobile/Shared/Localizable.xcstrings", import.meta.url), "utf8"),
  );
  const bad = untranslated(keys, catalog);
  if (bad.length) {
    console.error(`✗ ${bad.length} iPhone string(s) not translated into every language:`);
    for (const { key, source, missing } of bad) {
      console.error(`  ${JSON.stringify(key)}  (${source}; missing ${missing.join(", ")})`);
    }
    console.error("Add them to apps/mobile/Shared/Localizable.xcstrings, or mark shouldTranslate false.");
    process.exit(1);
  }
  console.log(`✓ ${keys.size} iPhone strings, all translated into ${LANGUAGES.length} languages`);
}

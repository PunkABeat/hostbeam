#!/usr/bin/env node
// Three kinds of drift, each found by hand on 2026-10-02 after it had sat for
// days. The handoff said "CI is out of Actions minutes until 2026-10-01" the day
// after, and "The Mac is at 0.1.30" three releases later; progress.md, which has
// a check of its own (check-progress-current.mjs), was right all along. The
// fix that matters is one home per fact — state lives in progress.md, and other
// documents point at it (contribution-protocol.md). This catches what slips
// through anyway:
//
// 1. A deadline that has passed: "until 2026-10-01" or "by 2026-10-27" in a
//    live-state document, once that day is behind us. The sentence is either
//    no longer true or has become history; both mean edit it.
// 2. A stated version that is not the repo's: "the Mac is at 0.1.30".
// 3. A retired claim on anything a customer reads: the old pricing, say. When
//    a promise changes, add its old wording to RETIRED so it cannot come back.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Documents that describe the present, where a passed deadline is a bug. */
export const LIVE = ["docs/agents/current-handoff.md", "docs/process/progress.md"];

/** Documents that may say which version an app is at. */
export const VERSION_CLAIMS = [...LIVE, "AGENTS.md", "README.md"];

/** What ships to customers as text: the site, the apps' strings, the store
 *  and npm pages. Code comments are left out on purpose — they may describe
 *  the old behaviour they replaced. Changelogs are history and also left out. */
export const CUSTOMER_FACING = [
  "apps/web/src/",
  "apps/raycast/README.md",
  "apps/raycast/package.json",
  "apps/agent/README.md",
  "apps/agent/publish/README.md",
  "apps/agent/publish/package.json",
  "apps/agent/publish/server.json",
  "apps/desktop/src/i18n.ts",
  "apps/desktop/src/locales/",
  "apps/desktop/src-tauri/src/i18n.rs",
  "apps/mobile/Shared/Localizable.xcstrings",
  "apps/mobile/App/InfoPlist.xcstrings",
  "apps/mobile/Share/InfoPlist.xcstrings",
  "apps/mobile/ActionExt/InfoPlist.xcstrings",
];

/** Promises Hostbeam no longer makes. Add the old wording whenever one changes.
 *  A line that mentions one on purpose (a FAQ saying the limit is gone) carries
 *  `retired-claim-ok` somewhere on it. */
export const RETIRED = [
  {
    pattern: /\b(\d+|five) (free )?beams? (a|per|each) day\b/i,
    why: "no daily cap since 0.1.31 (ADR 0028)",
  },
  { pattern: /\bfree for \d+ beams\b/i, why: "no daily cap since 0.1.31 (ADR 0028)" },
  {
    pattern: /(?<!\bno )\bdaily (beam )?(limit|cap)\b/i,
    why: "no daily cap since 0.1.31 (ADR 0028)",
  },
  {
    pattern: /\b(a year|one year|12 months) of updates\b|\bupdates for (a|one) year\b/i,
    why: "a license covers all of Hostbeam 1, with no year to run out (ADR 0028)",
  },
];

/** "until 2026-10-01", "by ~2026-10-27": deadlines in `text` before `today`. */
export function passedDeadlines(text, today) {
  const found = [];
  text.split("\n").forEach((line, i) => {
    for (const m of line.matchAll(/\b(until|by)\s+~?(\d{4}-\d{2}-\d{2})\b/gi)) {
      if (m[2] < today) found.push({ line: i + 1, text: m[0] });
    }
  });
  return found;
}

/** "the Mac is at 0.1.30", "iOS is on 1.0": claims that disagree with `actual`. */
export function wrongVersions(text, actual) {
  const found = [];
  const claims = [
    [/\b(?:Mac|desktop)(?: app)? is (?:at|on) v?(\d+\.\d+\.\d+)\b/gi, "desktop"],
    [/\b(?:iPhone|iOS)(?: app)? is (?:at|on) v?(\d+\.\d+(?:\.\d+)?)\b/gi, "ios"],
  ];
  text.split("\n").forEach((line, i) => {
    for (const [re, app] of claims) {
      for (const m of line.matchAll(re)) {
        if (m[1] !== actual[app]) found.push({ line: i + 1, text: m[0], actual: actual[app] });
      }
    }
  });
  return found;
}

/** Lines in `text` that repeat a retired claim. */
export function retiredClaims(text) {
  const found = [];
  text.split("\n").forEach((line, i) => {
    if (line.includes("retired-claim-ok")) return;
    // One report per line: the old pricing usually trips several wordings.
    for (const { pattern, why } of RETIRED) {
      const m = line.match(pattern);
      if (m) {
        found.push({ line: i + 1, text: m[0], why });
        break;
      }
    }
  });
  return found;
}

/** Tracked files under the customer-facing paths, skipping tests. */
function customerFiles() {
  return execFileSync("git", ["ls-files", "--", ...CUSTOMER_FACING], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter((f) => f && !/\.(test|spec)\.[a-z]+$/.test(f));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const read = (p) => readFileSync(join(root, p), "utf8");
  // The local date: a deadline is past once its day is over where you are.
  const today = new Date().toLocaleDateString("sv");
  const actual = {
    desktop: JSON.parse(read("apps/desktop/src-tauri/tauri.conf.json")).version,
    ios: read("apps/mobile/project.yml").match(/^\s*MARKETING_VERSION:\s*"?([^"\n]+)"?/m)?.[1]?.trim(),
  };
  const problems = [];
  for (const f of LIVE) {
    for (const d of passedDeadlines(read(f), today)) {
      problems.push(`${f}:${d.line}: "${d.text}" has passed — update the sentence, or move it to handoff-log.md if it is history`);
    }
  }
  for (const f of VERSION_CLAIMS) {
    for (const v of wrongVersions(read(f), actual)) {
      problems.push(`${f}:${v.line}: "${v.text}", but the repo is at ${v.actual} — better, point at progress.md instead of restating it`);
    }
  }
  for (const f of customerFiles()) {
    for (const c of retiredClaims(read(f))) {
      problems.push(`${f}:${c.line}: "${c.text}" is a retired claim — ${c.why}`);
    }
  }
  if (problems.length) {
    console.error("Documents have drifted from what is true:");
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log("No drift: no passed deadlines, stated versions match, no retired claims.");
}

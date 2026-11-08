// Refuses to deploy a build that still carries a checkout.
//
// Until ADR 0031 this script checked the opposite: that `deploy:web` had been
// built against live Paddle, because a missing `.env.production` would have
// quietly shipped a sandbox checkout. Licensing is retired, the checkout
// configuration is gone from the source, and the risk is now a stale build or
// a stray import bringing Paddle.js or a Paddle token back to hostbeam.app.
// Same shape of check, cheap, run between build and deploy.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;
let pages;
try {
  pages = htmlFiles(dist);
} catch {
  fail("dist/ not found — did the build run?");
}
if (pages.length === 0) fail("dist/ holds no HTML — did the build run?");

const offenders = [];
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  if (/cdn\.paddle\.com/.test(html)) offenders.push(`${rel(page)}: loads Paddle.js`);
  if (/"(live|test)_[a-z0-9]{20,}"/.test(html)) offenders.push(`${rel(page)}: carries a Paddle client token`);
  if (/\bpri_01[a-z0-9]{20,}\b/.test(html)) offenders.push(`${rel(page)}: carries a Paddle price id`);
}
if (offenders.length) fail(`a checkout is still in the build:\n  ${offenders.join("\n  ")}`);

console.log(`✓ build verified: no checkout in ${pages.length} pages (licensing retired, ADR 0031)`);

function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

function rel(p) {
  return p.slice(dist.length);
}

function fail(why) {
  console.error(`\n✗ refusing to deploy: ${why}`);
  console.error("  Licensing is retired (docs/adr/0031-licensing-retired.md); the site sells nothing.\n");
  process.exit(1);
}

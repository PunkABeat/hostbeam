#!/usr/bin/env node
// Tell IndexNow's search engines (Bing and the others that share its feed) that
// pages changed, so they crawl them now instead of whenever they next pass by.
// Google does not take IndexNow; it reads the sitemap through Search Console.
//
//   node scripts/indexnow.mjs                      every URL in the live sitemap
//   node scripts/indexnow.mjs /guides/ /pricing/   just these paths
//
// Run it by hand after a deploy that adds or rewrites pages, not after every
// deploy: the protocol asks for changed URLs only. The key is public by design
// (it is the file public/<key>.txt, which proves the site sent the request).
import { readdirSync } from "node:fs";

const SITE = "https://hostbeam.app";
const key = readdirSync(new URL("../public/", import.meta.url))
  .map((name) => name.match(/^([0-9a-f]{32})\.txt$/)?.[1])
  .find(Boolean);
if (!key) fail("no IndexNow key file (public/<32 hex>.txt) found");

let urls = process.argv.slice(2).map((path) => new URL(path, SITE).toString());
if (!urls.length) {
  const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
  urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

// The key file has to be live before the engines will believe the request.
const live = await fetch(`${SITE}/${key}.txt`);
if (!live.ok || (await live.text()).trim() !== key) fail(`${SITE}/${key}.txt is not live yet — deploy first`);

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: `${SITE}/${key}.txt`, urlList: urls }),
});
// 200 and 202 both mean accepted; 202 means the key is still being checked.
if (res.status !== 200 && res.status !== 202) fail(`IndexNow answered ${res.status}: ${await res.text()}`);
console.log(`✓ IndexNow accepted ${urls.length} URL(s) (${res.status})`);
for (const url of urls) console.log(`  ${url}`);

function fail(why) {
  console.error(`✗ ${why}`);
  process.exit(1);
}

#!/usr/bin/env node
// Everything Hostbeam counts, in one go: Mac downloads and copies running
// (downloads.mjs), sales through Paddle (sales.mjs), and the iPhone app on the
// App Store (appstore.mjs).
//
//   npm run stats
//
// Each part fails on its own, with a line saying why, so a locked 1Password or
// a missing vendor number never hides the others; the exit status is 1 if any
// part failed. Run it from a terminal: the Paddle and Apple keys come from
// 1Password, which asks for Touch ID (`! npm run stats` inside Claude Code).
import { appStore } from "./appstore.mjs";
import { print, readDownloads, summarize, wranglerError } from "./downloads.mjs";
import { sales } from "./sales.mjs";

const today = new Date().toISOString().slice(0, 10);

const parts = [
  ["Mac", async () => {
    let rows;
    try {
      rows = await readDownloads();
    } catch (e) {
      throw new Error(`${wranglerError(e)}\nIf that says wrangler is not logged in: \`npx wrangler login\`.`);
    }
    print(summarize(rows, today));
  }],
  ["Sales", () => sales(today)],
  ["iPhone", () => appStore(today)],
];

let failed = false;
for (const [name, run] of parts) {
  console.log(`\n━━ ${name} ${"━".repeat(60 - name.length)}\n`);
  try {
    await run();
  } catch (e) {
    failed = true;
    console.log(`\n✗ Could not read this part: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);

// Refuses to deploy a build in which anything runs off a phone's right edge.
//
// It opens every built page at phone widths in the installed Google Chrome and
// fails if the page scrolls sideways or a copyable command is cut off. Both
// have shipped: in 2026-09 the hero's brew command widened the column past an
// iPhone's edge (buttons and demo with it), and /licenses was 677px wide on
// every phone. Nobody noticed until the site was looked at on a phone, because
// nothing does that on a desktop.
//
// Runs against dist/, so after `astro build`: `npm run check:layout -w @hostbeam/web`.

import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { preview } from "astro";
import { chromium } from "playwright-core";

// iPhone SE (the narrowest still sold) through Pro Max.
const WIDTHS = [320, 375, 393, 430];
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = new URL("../dist/", import.meta.url);

// Nothing here may outlive the check: a hung page or server gets killed.
setTimeout(() => fail("timed out after 3 minutes"), 180_000).unref();

let routes;
try {
  routes = pages(DIST);
} catch {
  fail("dist/ not found — did the build run?");
}

let server, browser;
const problems = [];
try {
  server = await preview({ root: ROOT, logLevel: "error", server: { host: "127.0.0.1", port: 4399 } });
  try {
    browser = await chromium.launch({ channel: "chrome" });
  } catch (err) {
    fail(`could not start Google Chrome: ${err.message.split("\n")[0]}\n  The check drives the installed Chrome; install it, or run the other deploy steps by hand.`);
  }
  // one tab per width, side by side: sequentially it was 20 of 30 seconds
  const perWidth = await Promise.all(
    WIDTHS.map(async (width) => {
      const context = await browser.newContext({
        viewport: { width, height: 800 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      // Local files only. /buy used to open the live Paddle checkout (ADR 0031 retired it) —
      // with its analytics and error reporting — once per width, per deploy.
      await context.route(/^(?!http:\/\/127\.0\.0\.1:4399\/)/, (route) => route.abort());
      const page = await context.newPage();
      const found = [];
      for (const route of routes) {
        await page.goto(`http://127.0.0.1:4399${route}`, { waitUntil: "load" });
        for (const what of await page.evaluate(inspect)) found.push(`${width}px ${route}: ${what}`);
      }
      await context.close();
      return found;
    }),
  );
  problems.push(...perWidth.flat());
} finally {
  await browser?.close();
  await server?.stop();
}

if (problems.length) fail(`a page does not fit a phone:\n  ${problems.join("\n  ")}`);
console.log(`✓ layout verified: ${routes.length} pages fit ${WIDTHS.join(", ")}px with nothing cut off`);
process.exit(0);

// Every built page, as the path it is served at.
function pages(dir, base = "/") {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return entry.name.startsWith("_") ? [] : pages(new URL(`${entry.name}/`, dir), `${base}${entry.name}/`);
    if (entry.name === "index.html") return [base];
    return entry.name.endsWith(".html") ? [`${base}${entry.name}`] : [];
  });
}

// Runs in the page. Names the innermost elements that stick out, since the
// outer ones (the page wrapper, the section) only stick out because of them.
async function inspect() {
  await document.fonts.ready;
  const vw = document.documentElement.clientWidth;
  const found = [];
  const outside = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || (r.right <= vw + 0.5 && r.left >= -0.5)) return false;
    // content a scroll box clips on purpose (the terminal strip, a JSON block) is fine
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (getComputedStyle(p).overflowX === "visible") continue;
      const pr = p.getBoundingClientRect();
      if (pr.right <= vw + 0.5 && pr.left >= -0.5) return false;
    }
    return true;
  };
  const describe = (el) => {
    const cls = typeof el.className === "string" && el.className.trim() ? `.${el.className.trim().split(/\s+/).join(".")}` : "";
    const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50);
    return `<${el.tagName.toLowerCase()}${cls}>${text ? ` "${text}"` : ""}`;
  };
  const sticking = [...document.querySelectorAll("body *")].filter(outside);
  for (const el of sticking) {
    if (sticking.some((other) => other !== el && el.contains(other))) continue;
    found.push(`${describe(el)} reaches ${Math.round(el.getBoundingClientRect().right)}px`);
  }
  const scrollW = document.documentElement.scrollWidth;
  if (scrollW > vw && !found.length) found.push(`the page scrolls sideways (${scrollW}px wide)`);
  for (const code of document.querySelectorAll(".copycmd code")) {
    if (code.scrollWidth > code.clientWidth + 1) found.push(`command cut off: "${code.textContent}"`);
  }
  return found;
}

function fail(why) {
  console.error(`\n✗ refusing to deploy: ${why}\n`);
  process.exit(1);
}

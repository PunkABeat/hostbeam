import type { APIRoute } from "astro";
import changelogText from "../../../../CHANGELOG.md?raw";
import { parseChangelog } from "../../../../scripts/changelog-parse.mjs";
import { GUIDES, guidePath } from "../lib/guides";

// A hand-rolled sitemap rather than @astrojs/sitemap: ten static pages do not
// justify a dependency, and this way the changelog's lastmod is the date of the
// newest release rather than the build clock, which is what a crawler wants to
// know. /thanks is left out to match robots.txt.
//
// `priority` is deliberately absent. Search engines ignore it, and inventing a
// ranking for your own pages is noise. Paths carry the trailing slash Astro
// actually builds, so these URLs match the pages' own <link rel="canonical">.
const PAGES: { path: string; changefreq: string }[] = [
  { path: "/", changefreq: "weekly" },
  { path: "/pricing/", changefreq: "monthly" },
  { path: "/agents/", changefreq: "monthly" },
  { path: "/changelog/", changefreq: "weekly" },
  { path: "/privacy/", changefreq: "yearly" },
  { path: "/terms/", changefreq: "yearly" },
  { path: "/refunds/", changefreq: "yearly" },
  { path: "/licenses/", changefreq: "monthly" },
];

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL("https://hostbeam.app");
  const releases = parseChangelog(changelogText);
  const newest = releases.map((r) => r.date).sort().at(-1);

  // Each app's changelog page, dated by its own newest release, once it has
  // one. The iPhone page exists before then for the app's own link, but a page
  // saying there are no releases is not one to list.
  const lanePages = (["mac", "iphone"] as const).flatMap((platform) => {
    const lastmod = releases
      .filter((r) => r.platform === platform)
      .map((r) => r.date)
      .sort()
      .at(-1);
    return lastmod ? [{ path: `/changelog/${platform}/`, changefreq: "weekly", lastmod }] : [];
  });

  // A guide's lastmod is the day its claims were last checked, from lib/guides.ts.
  const guidePages = [
    { path: "/guides/", changefreq: "monthly", lastmod: GUIDES.map((g) => g.updated).sort().at(-1) },
    ...GUIDES.map((g) => ({ path: guidePath(g.slug), changefreq: "monthly", lastmod: g.updated })),
  ];

  const entries = [...PAGES, ...lanePages, ...guidePages].map((page) => {
    const { path, changefreq } = page;
    // The home page and the changelog both change when a release ships; the
    // legal pages carry their own dates in their copy, so they are left undated
    // rather than told a lie by the build.
    const lastmod =
      "lastmod" in page ? page.lastmod : path === "/" || path === "/changelog/" ? newest : undefined;
    return [
      "  <url>",
      `    <loc>${new URL(path, base).toString()}</loc>`,
      lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
      `    <changefreq>${changefreq}</changefreq>`,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n");
  }).join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};

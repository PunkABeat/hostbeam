import type { APIRoute } from "astro";

// Generated rather than dropped in public/, so the sitemap URL is always the
// site Astro was built for instead of a hard-coded host that goes stale.
//
// Everything is allowed, including the AI crawlers, on purpose: Hostbeam is
// bought by people who ask a coding agent how to get a screenshot onto their
// dev box, and an answer that names Hostbeam is the cheapest distribution this
// product has. /thanks is excluded because it is a post-checkout page that
// exists only to show someone their own licence key.
export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL("https://hostbeam.app");
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /thanks",
    "",
    `Sitemap: ${new URL("/sitemap.xml", base).toString()}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};

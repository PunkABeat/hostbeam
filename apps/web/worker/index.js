/**
 * The site is static assets; this Worker is the redirects in front of them
 * (www to the apex, http to https) and the one file the asset server mislabels.
 *
 * Paddle's checkout-domain approval rejects `www.` hostnames outright — its own
 * instructions say "Don't include https://, www, or specific web pages", and
 * submitting `www.hostbeam.app` fails with "Invalid domain name". So the apex is
 * the only hostname that can ever launch a Paddle checkout.
 *
 * `www.hostbeam.app` is a custom domain on this same Worker, so without this
 * redirect a visitor who reached /buy on www would open a checkout blocked on an
 * unapproved domain: a broken purchase for someone actively trying to pay, found
 * out via a support email rather than a test.
 *
 * 301 rather than 302 so browsers and search engines settle on the apex, which
 * is also what Astro's `site` already uses for canonical URLs.
 *
 * Plain JS on purpose: apps/web's tsconfig only includes `src`, so a .ts file
 * here would look typechecked by `astro check` while never actually being
 * checked. Better honestly unchecked than falsely reassuring.
 */
const CANONICAL_HOST = "hostbeam.app";

/**
 * The file that lets the iPhone app open `hostbeam.app/add` links (the Mac's
 * pairing QR). It has no extension, as Apple requires, so the assets binding
 * cannot tell it is JSON; Apple asks for `application/json`. Served on the apex
 * only, never redirected: `applinks:hostbeam.app` names the apex, and Apple
 * does not follow redirects for this file.
 */
const AASA_PATH = "/.well-known/apple-app-site-association";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ours = url.hostname === CANONICAL_HOST || url.hostname === `www.${CANONICAL_HOST}`;

    // Plain http is served as-is otherwise (the zone's "Always Use HTTPS" is
    // off, and wrangler's token cannot change zone settings), /buy included.
    // One hop to the https apex, www or not. Only our hostnames, so
    // `wrangler dev` on localhost still serves over http.
    if (ours && url.protocol === "http:") {
      url.protocol = "https:";
      url.hostname = CANONICAL_HOST;
      return Response.redirect(url.toString(), 301);
    }

    if (url.hostname === CANONICAL_HOST && url.pathname === AASA_PATH) {
      const file = await env.ASSETS.fetch(request);
      const headers = new Headers(file.headers);
      headers.set("Content-Type", "application/json");
      return new Response(file.body, { status: file.status, headers });
    }

    if (url.hostname === `www.${CANONICAL_HOST}`) {
      url.hostname = CANONICAL_HOST;
      // Path and query are preserved — Paddle payment links carry ?_ptxn=, and
      // dropping it here would open an empty checkout instead of the buyer's.
      return Response.redirect(url.toString(), 301);
    }

    return env.ASSETS.fetch(request);
  },
};

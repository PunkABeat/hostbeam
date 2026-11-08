# Hostbeam marketing site

Astro + React islands (ADR 0013), consuming the shared design system in
`packages/ui/` (`@hostbeam/ui`). Commands run from the repo root:

> **The site owns its own visual system.** It is no longer matched against
> `docs/design/hostbeam-handoff/reference/landing/`, and the differences are
> deliberate — see [ADR 0019](../../docs/adr/0019-marketing-site-dressed-like-the-app.md)
> for what changed and why. The product's voice doc
> ([01_product_and_voice.md](../../docs/design/hostbeam-handoff/01_product_and_voice.md))
> does still bind here: **mono is only for values a reader could type** (paths,
> hostnames, hotkeys), and one warmth line per surface.

```sh
npm run dev:web        # local dev server (http://localhost:4321)
npm run build:web
npm run typecheck:web
```

## What the crawlers and the link previews get

Four generated surfaces, none of them hand-maintained copies of anything:

| Surface | Built by | Notes |
|---|---|---|
| `/robots.txt` | `src/pages/robots.txt.ts` | Allows everything including AI crawlers, on purpose. Excludes `/thanks`. |
| `/sitemap.xml` | `src/pages/sitemap.xml.ts` | The main pages listed by hand, plus the guides from `lib/guides.ts`; `lastmod` for `/` and `/changelog` comes from the newest `CHANGELOG.md` entry, not the build clock, and a guide's from its `updated` date. URLs carry the trailing slash so they match each page's `<link rel="canonical">`. |
| `/llms.txt` | `src/pages/llms.txt.ts` | The plain-Markdown summary an assistant reads instead of the marketing page. Generated from `lib/links.ts`, `lib/faq.ts` and `lib/guides.ts`. |
| JSON-LD on `/` | `src/lib/seo.ts` | `WebSite` + `Organization` + `SoftwareApplication` (both offers) + `FAQPage`. |
| JSON-LD on a guide | `src/layouts/Guide.astro` | `TechArticle`: headline, description, dates, PunkABeat as author. |

Two rules keep these honest:

- **The FAQ has one copy**, `src/lib/faq.ts`. The page section and the `FAQPage`
  structured data both import it. Google withdraws FAQ rich results when the
  markup and the visible page disagree, so do not inline a question anywhere else.
- **Never add a claim the page does not make.** No `aggregateRating`, no review
  count, no invented `priority`. A site that says "no telemetry" cannot afford
  fabricated schema.

The link preview card is `public/assets/og.png`, generated from
`docs/marketing/og-card.svg` — that file's header comment carries the exact
regeneration command. It must stay a **raster** image: X, Slack, iMessage and
LinkedIn all decline to render an SVG `og:image`, which is what the site shipped
until ADR 0019.

**Telling search engines.** Bing and the engines that share IndexNow's feed
are told about changed pages by `node scripts/indexnow.mjs` (every sitemap URL,
or the paths you name), run by hand after a deploy that adds or rewrites pages.
Its key is `public/<32 hex>.txt`, public by design. Google does not take
IndexNow; it reads `/sitemap.xml` through Search Console.

**admin@punkabeat.com** owns the `https://hostbeam.app/` property in both
Google Search Console and Bing Webmaster Tools (since 2026-10-03, sitemap
submitted to each). Each is verified by a meta tag in `layouts/Base.astro`
(`google-site-verification`, `msvalidate.01`): removing one unverifies that
property. Tags, not the engines' files, because the asset server redirects
`.html` paths (`/licenses/index.html` → `/licenses/`). New pages can be pushed
to the front of Google's queue from URL inspection → Request indexing. Bing's
"AI Performance" report (beta) shows when its AI answers cite the site — a
second measure beside [the AI-answers record](../../docs/research/ai-answers/README.md).

**Link to the URL the sitemap names**, trailing slash included (`/pricing/`,
not `/pricing`). The asset server 307s the bare form, and Search Console
listed five such links as "Page with redirect" until they were fixed
(2026-10-07). Its "Not found (404)" that day was a package link on
`/licenses/` written as `owner/repo`; `scripts/third-party-notices.mjs` now
expands that form and refuses any link that is not absolute.

## Cloudflare: the hostbeam.app zone

One zone holds the site, `download.hostbeam.app` (R2 behind the download
counter, ADR 0030) and mail: Email Routing receives it (the MX records), and
the licence worker sends key emails and alerts as `license@hostbeam.app`
through Resend (DKIM at `resend._domainkey`, return path `send.hostbeam.app`).
It is on a Cloudflare account that predates PunkABeat.
**Wrangler's token reads zone settings but cannot change them**, so a redirect
that could be a zone setting lives in `worker/index.js` instead: www to the
apex, and since 2026-10-07 http to https (before that, plain http served every
page, `/buy` included). Zone settings are the owner's clicks in the dashboard.
Since 2026-10-07 the zone also forces https itself (Always Use HTTPS) and sends
HSTS, so the Worker's redirect is a second layer; it costs nothing to keep.

**`/.well-known/security.txt`** (since 2026-10-07) names support@hostbeam.app
for security reports. Its `Expires` line is 2027-10-01: move it a year on
before then, or the file says nobody is reading it.

**Security Insights** (Application security → Security insights) listed six
findings for the zone on 2026-10-07. Decided and done that day:

| Insight | Decision |
|---|---|
| "Always Use HTTPS" missing on `download.hostbeam.app` | **On, zone-wide** (SSL/TLS → Edge Certificates). `download.` is R2 plus the counter Worker, and neither redirects http on its own. Done. |
| HSTS missing on `download.hostbeam.app` | **On**, same page: max-age 6 months, *Include subdomains* **on**, *Preload* off (preload is slow to undo), No-Sniff on. Done. Include subdomains means **every future `*.hostbeam.app` hostname must serve https** — automatic for a proxied record, not for a DNS-only one pointing elsewhere. |
| DMARC record error | The record is `v=DMARC1; p=none;`, with no address for reports. Cloudflare's report address was added through DMARC Management (Email → DMARC Management), still `p=none`; reports start within a day. Do not go stricter (`quarantine`, `reject`) until they show Resend's mail passing: a customer's licence key arrives by that email. **The insight stays** after the rescan: Cloudflare flags any `p=none` (punkabeat.com's valid record is flagged too). After a week of reports, from 2026-10-14, if Resend's mail passes, change the record to `p=quarantine`, which clears it. |
| security.txt not configured | Done, above. **The insight stays** after the rescan: it checks Cloudflare's own security.txt setting, not the file (it fired in the same second for every domain on the account, punkabeat.com with no website among them). Marked a false positive (owner, 2026-10-08); do not turn on Cloudflare's version too, which would serve a second copy at the same URL. |
| Bot Fight Mode not enabled | **Leave it off** (insight archived). It challenges whatever looks automated across the whole zone, and the free plan cannot exempt a path: the Mac app's update check (`download.hostbeam.app/latest.json`) and Homebrew's download of `Hostbeam.dmg` would be challenged, and updates and installs would quietly fail. |
| AI Labyrinth not enabled | **Leave it off** (insight archived). The guides exist so AI assistants read and cite the site. |

## Guides

`/guides/` answers questions people type into a search box or ask an assistant
("paste a screenshot into Claude Code over SSH"), for search and for LLM answers
(docs/research/questions.md § Being found). Each guide is a page in
`src/pages/guides/` wrapped in `layouts/Guide.astro`, and listed once in
`src/lib/guides.ts`, which the index, the sitemap and `/llms.txt` read.

- **Every way to do the job, Hostbeam last.** A guide that only sells is not
  one anybody links to or an assistant quotes.
- **Claims about other tools come from their own docs and are dated.** Bump
  `updated` in `lib/guides.ts` when they are checked again; the page shows it.
- **Every command is run first**, against `npm run testhost:up`, which also
  has `AllowTcpForwarding no` for the dev-server guide's error.

## Deploying

**`npm run deploy:web` is the only deploy path.** It type-checks, builds, then
`wrangler deploy` ships `wrangler.jsonc` — an assets-only Worker named
`hostbeam-web` that owns `hostbeam.app` and the `www` redirect.

`astro check` runs first and a type error stops the deploy. It was not in this
chain until 2026-09-08, which is how two implicit-`any` errors sat in
`changelog.astro` unnoticed: `npm run typecheck:web` existed but nothing ran it.
A check nothing enforces goes stale. If it ever blocks a release you need out
now, run the three steps by hand — but fix the types in the same sitting.

Do **not** use `wrangler pages deploy`. A Cloudflare **Pages** project of the
same name existed until 2026-08-29, deployed by hand from an agent session over
about a month and recorded nowhere in this repo. The consequences are worth
remembering, because they are the argument for keeping one committed path:

- It served a stale public copy of the site at `hostbeam-web.pages.dev`,
  indexable and competing with the real site, drifting further with every deploy.
- It answered **200 with the homepage for every unmatched path**, so probing it
  gave false positives — `/pricing` "existed" on a build that had never heard of
  it.
- Because it lived only in a session transcript, this repo and the milestone doc
  both recorded "no deploy path for apps/web" while a deployed site was public.
  `hostbeam.app` still did not resolve, because the Pages project never had the
  custom domain attached.

The project was deleted 2026-08-29. If a `pages.dev` copy of this site ever
reappears, something has gone around `deploy:web` — delete it rather than
maintaining two.

`deploy:web` runs `assert-live-build.mjs` between build and deploy. Until
licensing was retired ([ADR 0031](../../docs/adr/0031-licensing-retired.md)) it
refused to publish a build not configured for live Paddle, because a missing
`.env.production` would have quietly shipped a sandbox checkout. It now checks
the opposite: that no Paddle script, client token or price id is in any built
page, so a stale build or a stray import cannot bring the checkout back.

After that, `assert-no-overflow.mjs` opens every built page at 320, 375, 393
and 430px and refuses to deploy if one scrolls sideways or cuts off a copyable
command, naming the page, the width and the element that sticks out. That went
live unnoticed in 2026-09 — the hero ran off an iPhone's edge and `/licenses`
was 677px wide on every phone — because nothing looks at the site on a phone
before it ships. It drives the installed **Google Chrome** (`playwright-core`,
no browser download) and blocks every request that is not to the local
preview, so `/buy` never opens the live Paddle checkout. About 30 seconds; run
it alone after a build with `npm run check:layout -w @hostbeam/web`.

## Two environments (live and sandbox side by side)

> **Retired 2026-11-08 ([ADR 0031](../../docs/adr/0031-licensing-retired.md)).**
> The site no longer opens a checkout: `src/lib/checkout.ts`, `.env.example` and
> the `PUBLIC_PADDLE_*` variables are gone, `/buy`, `/thanks` and `/refunds` say
> that nothing is sold, and `assert-live-build.mjs` now checks the opposite of
> what it did — that no Paddle script or token is in the build. The rest of this
> section describes how the two environments worked while licences were sold.

The site is the only part of the product that talks to Paddle from the browser,
so it carries the same live/sandbox split as the worker (see
`apps/license-webhook/README.md`, "Two environments"). The split is
**configuration, not a commit**: `src/lib/checkout.ts` reads
`import.meta.env.PUBLIC_PADDLE_*` rather than hard-coded ids, so a staging
deploy and the live site build from the same source.

| `PUBLIC_*` var | production | sandbox |
| --- | --- | --- |
| `PADDLE_ENV` | `production` | `sandbox` |
| `PADDLE_CLIENT_TOKEN` | `live_…` | `test_…` |
| `PADDLE_PRICE_ID` | live `pri_…` | sandbox `pri_…` |
| `LICENSE_API` | `https://license.hostbeam.app` | the sandbox worker's `*.workers.dev` |
| `PADDLE_SANDBOX_HOSTS` | unset | extra hostnames allowed to open sandbox checkout |

### Which env file is used when

Two files, both gitignored, neither interchangeable:

| File | Holds | Used by |
| --- | --- | --- |
| `.env.production` | the **production** block from `.env.example` | `astro build` → `deploy:web` (the live site) |
| `.env` | the **sandbox** block | `npm run dev:web` (local sandbox testing) |

**`.env.production` wins over `.env` on a production build** — Astro/Vite load
the mode-specific file first. Verified empirically, not assumed. That is what
lets both files coexist: sandbox testing leaves a `.env` behind, and it does not
contaminate the next live deploy.

**A live deploy requires `.env.production` to exist on the deploying machine.**
It is gitignored, so a fresh clone has neither file, and `deploy:web` would then
build from `.env` — or from nothing — and ship a fail-closed sandbox site.
`assert-live-build.mjs` refuses that (see "Deploying"), but the file still has to
be recreated by hand from `.env.example`'s production block.

To run the sandbox loop locally: `cp .env.example .env && npm run dev:web`, then
buy at `localhost:4321/buy` with Paddle's test card `4242 4242 4242 4242`. No
tunnel is needed — the sandbox worker is publicly deployed. `localhost` is
always permitted by the host gate below, which is why this never requires
touching `PUBLIC_PADDLE_SANDBOX_HOSTS`.

`.env.example` carries both blocks
with the real ids, because **every value here is a public identifier** — a
client-side token and a price id only let a page open a checkout. Astro inlines
`PUBLIC_*` into the browser bundle, which is exactly why the Paddle **API key**
and **webhook secret** must never appear in this file; they are worker secrets
(`wrangler secret put`) and nothing else.

Three guards, all in `src/pages/buy.astro` and `src/lib/checkout.ts`:

- **Fails closed.** `PADDLE_ENV` defaults to `sandbox` and the token to `""`, so
  a build with missing or misspelled env vars shows the pre-launch notice
  instead of silently opening a live checkout. The dangerous direction is
  accidentally-live, so the default leans the other way.
- **Sandbox checkout is host-gated.** Paddle sandbox accepts universal test
  cards, so a public sandbox build would let anyone mint themselves a license.
  `buy.astro` only opens sandbox checkout on `localhost` / `127.0.0.1` plus any
  hostname listed in `PUBLIC_PADDLE_SANDBOX_HOSTS`; anywhere else falls back to
  the pre-launch notice.
- **`Paddle.Environment.set("sandbox")` only ever runs on a sandbox build** —
  live is Paddle.js's default, so there is no path where a production build is
  pointed at sandbox by a stale call.

`/thanks` polls `${LICENSE_API}/key?transaction_id=…` to show the key right
after checkout, so `PUBLIC_LICENSE_API` must point at the worker deployment that
matches the Paddle environment — live checkout with the sandbox worker (or the
reverse) returns nothing, because the transaction does not exist on that side.

Full rationale and the current ids:
`docs/process/milestones/006-licensing-and-free-tier.md`, "Sandbox alongside
live".

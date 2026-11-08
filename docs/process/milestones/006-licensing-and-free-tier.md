# Milestone 006: Licensing and the Free Tier

Status: In progress. Opened alongside Milestone 005 by ADR 0014.

**Superseded in part, 2026-09-27 — [ADR 0028](../../adr/0028-free-to-use-with-a-reminder.md).**
The daily cap described below is gone: every feature is free and unlimited,
and the Mac asks now and then after a landed beam (a week after the first
beam, every 10th) instead. The license hides the reminder on 3 Macs for every
Hostbeam 1 update — the 12-month window and half-price renewal below are gone.
The iPhone app is free, with its in-app purchase and counter unwired. What
follows is the history of the cap; Paddle, Keygen, the worker, activation,
grace and refunds are unchanged.

## Goal

Give Hostbeam its revenue model: a fully local free tier (5 beams a day) and a
one-time license (12 months of updates, 3 Macs) that removes the cap — with the
smallest possible infrastructure footprint (Paddle checkout + Keygen licensing +
one glue webhook; the app talks only to Keygen).

## Included Scope

- In-app free-tier metering: a local daily counter of successful beams, enforced
  in the Rust core (the silent-hotkey path bypasses the popover, so the webview
  cannot be the gate). Zero network calls for free users.
- The license state machine (free / licensed / grace) with a 30-day offline
  grace window; silent, at-most-daily revalidation; refund/deactivation reverts
  to free on the next check.
- Keygen API client (validate / activate seat / deactivate seat) with pure,
  unit-tested response parsing.
- Preferences → License pane: plan status, buy link, key entry + activation,
  seat deactivation, localized error states.
- Popover + HUD limit experience: a calm accent-toned "daily beams used" card
  (Buy license / Enter key), and a subtle remaining count at ≤2 beams left.
- i18n for all new strings across the 8 locales.

## Explicit Non-Scope (later slices of this milestone or separate work)

- The Paddle account, Keygen account, and the glue webhook function (checkout →
  license creation → key delivery email). The in-app Keygen client ships with an
  empty account id and reports "licensing isn't live yet in this build".
- The marketing-site pricing page and real purchase URL (the app links to a
  provisional `https://hostbeam.app/#pricing`).
- Update-window enforcement (needs the updater/packaging pipeline, ADR 0008).
- Moving the stored key from `license.json` into the macOS Keychain (deliberate
  slice-1 simplification; revisit before release).
- Any server-side metering, accounts, or telemetry.

## Acceptance Criteria

- A free install blocks the 6th beam of a day before any upload work, leaves the
  clipboard untouched, and shows the calm limit card (popover) / HUD failure
  state (silent path); the counter rolls over at local midnight.
- Free-tier operation performs no network requests.
- A licensed store (fresh or within grace) beams without limits; a revoked or
  30-day-stale license reverts to free without hard-locking anything.
- Activation/deactivation flows work end-to-end against a Keygen sandbox once
  the account id is configured (pure parsers unit-tested until then).
- All quality gates pass (frontend typecheck/lint/test/build; cargo
  fmt/clippy/test; web typecheck/build since the shared UI package changed).

## Remaining Slices

1. ~~Keygen account + real account id, live activation test~~ — done
   (2026-07-04). Keygen **Cloud** (free Dev tier; self-host CE stays a later
   option). Account `4889da55-f7f4-45dd-9d74-a2c0fec98cd3`, product
   `4f3096cc-4db2-43d3-85ef-a4861127efc4`, policy
   `28f0ecd7-d6ab-458f-badf-1e2c7f0640ef` (1y, MAINTAIN_ACCESS, floating,
   3 machines, LICENSE auth, NO_OVERAGE). Verified live from the app on a
   real Mac: activate → Licensed with correct 1-year expiry; key in the
   Keychain and absent from license.json; deactivate frees the seat and
   reverts to the free tier (with the day's spent counter honored);
   same-Mac reactivate works.
2. ~~Paddle + glue webhook + sandbox end-to-end~~ — **done (2026-07-04).**
   The worker is deployed at
   `https://license.hostbeam.app` (secrets:
   Paddle webhook secret + API key, Keygen product token; vars point at the
   Paddle **sandbox**). The site has `/buy` (Paddle.js overlay; also the
   Paddle default-payment-link target) and `/thanks` (polls the worker's
   `/key`). **The whole loop is verified in the sandbox on a real Mac**:
   checkout (test card) → webhook minted the Keygen license idempotently →
   `/thanks` showed the key → activation in the app → full refund in Paddle →
   webhook suspended the license → (simulated 24h) silent revalidation
   reverted the app to the free tier with the day's spent counter honored.

3. ~~Marketing-site pricing section~~ — done (Pricing section + nav link +
   pricing FAQs + trued-up "free" claims; the Buy button anchors to #download
   until the Paddle checkout exists). Real purchase URL still pending a domain.
4. ~~Keychain storage for the key~~ — done (`licensing/keychain.rs` via
   `security -i` so the key never hits argv or disk; legacy `license.json`
   keys migrate out on load; a Keychain read hiccup skips revalidation instead
   of risking a false revoke). The counter's Keychain mirror is still an open
   question (docs/research/questions.md).
5. ~~Price point + renewal discount~~ — decided 2026-07-04: **$29 one-time,
   renewal at half price** (recorded in ADR 0014).

## Sandbox alongside live (decided 2026-08-29)

Going live does **not** retire the sandbox loop. One source, two deployments,
because losing the ability to test a purchase end-to-end the day real money
starts moving is the worst possible time to lose it.

| | production | sandbox |
| --- | --- | --- |
| Worker | `hostbeam-license-webhook` | `hostbeam-license-webhook-sandbox` |
| Deploy | `npx wrangler deploy` | `npx wrangler deploy --env sandbox` |
| Site config | `PUBLIC_PADDLE_*` = live | `PUBLIC_PADDLE_*` = sandbox |

Less needed a twin than expected: the **desktop app** never talks to Paddle
(Keygen only, ADR 0014) and the **iOS app** uses Apple IAP, with
`appstore.ts` already trying Apple production then sandbox. Only the web
checkout and the worker's Paddle side are environment-specific.

`apps/web/src/lib/checkout.ts` now reads `import.meta.env.PUBLIC_PADDLE_*`
(template: `apps/web/.env.example`) instead of hard-coded constants, so a
staging deploy and the live site differ by configuration, not by a commit. It
defaults to **sandbox with an empty token**, so a misconfigured build shows the
pre-launch notice rather than silently opening a live checkout. Client tokens
and price ids stay public identifiers by design; only the API key and webhook
secret are secrets, and those live solely in wrangler.

A **separate Keygen policy for sandbox** keeps test purchases from consuming the
Dev-tier active-license allowance under the real policy, and makes them
bulk-deletable by filtering on it: `bbbfe7a2-575a-4049-91d8-bb670453e5cd`
("Hostbeam License (sandbox)", created 2026-08-29), settings mirroring
production so a test behaves like the real thing.

**Sandbox loop re-verified end-to-end 2026-08-29**, against the new sandbox
worker and the new sandbox Keygen policy, with the site running locally
(`cp apps/web/.env.example apps/web/.env && npm run dev:web`) so the live site
was never touched. No tunnel is needed — the sandbox worker is publicly
deployed, unlike the Hookdeck setup Paddle's own guidance assumes. Checkout
(`4242 4242 4242 4242`) → webhook → licence minted under policy `bbbfe7a2…` →
key on `/thanks` → email delivered → activation on a real Mac → refund
(`adj_…`, approved in ~47s) → licence `SUSPENDED` in
Keygen.

> **Expected, not a bug: the app still shows "Active" immediately after a
> refund.** `REVALIDATE_HOURS = 24` (`licensing/mod.rs:23`) means a stored
> licence is only re-checked once it is a day old, with a one-hour floor between
> attempts. That is the honest-user model the file documents — no DRM, no
> clock-tamper checks — and the cost is that a refunded user keeps working for up
> to a day. Checking on every launch would instead break paying customers
> whenever Keygen is unreachable. To force it during a test, deactivate and
> re-activate: activation hits Keygen directly and a suspended key is refused.

**Sandbox worker deployed 2026-08-29** at
`https://<your-sandbox-worker>.workers.dev`, with
sandbox vars and the separate sandbox Keygen policy. Two manual steps remain,
neither doable from here:

1. **Its four secrets** (`PADDLE_WEBHOOK_SECRET`, `PADDLE_API_KEY`,
   `KEYGEN_TOKEN`, `RESEND_API_KEY`) with `--env sandbox`. Until then the worker
   is deployed but non-functional.
2. **Repoint the sandbox notification destination**
   (`ntfset_…`) at the new URL — it still points at the
   *production* worker's workers.dev hostname, so sandbox test purchases fail
   closed today. Attempting this via the sandbox MCP returned "You aren't
   permitted to perform this request": the sandbox API key was scoped for
   catalog work only. Either widen that key to notification-setting write, or
   change the URL in the sandbox dashboard.

## First live sale (2026-08-29) — and the bug it exposed

The first transaction: VAT collected by Paddle as merchant of record, the
fee taken, the earnings as expected. Webhook delivered on
the first attempt, the licence minted one second later, activated on both
a Mac and an iPhone. Apple Pay confirmed rendering in Safari.

**The licence was minted with an empty `email`, so no key email was sent.**
`PADDLE_API_KEY` was never set on the production worker — the go-live swap set
`PADDLE_WEBHOOK_SECRET` but not this — so `GET /customers/{id}` went out as
`Bearer undefined`, 403'd, and `index.ts`'s `.catch(() => "")` swallowed it.
Everything else succeeded, which is why nothing looked wrong: the buyer still
got the key on `/thanks` and in Keygen.

Two fixes, both applied:

1. The live key is now set on the production worker, and the affected licence's
   metadata was patched with the buyer's address.
2. **The swallow now logs.** `keygen.ts` already warned on a failed Resend call,
   but the customer lookup failed silently — the one step whose failure is
   invisible from outside, because the purchase still appears to work. A
   best-effort path may never be fatal; it must never be silent.

Worth remembering that sandbox could not have caught this: it exercises the same
code with *different credentials*, and the broken thing was a credential that
only production uses. A green sandbox run says the logic is right, never that
the deployment is.

## Launch switch-over (when going live)

- **Paddle live account — migrated 2026-08-29.** Live catalog created (product
  `pro_01m15nt3rbyzycs9tkptfcgn5y`, one-time $29 USD price
  `pri_01m15nt3w2ppdapcr5yak5vtag`, mirroring sandbox
  `pro_01kwpqte1eydst6k5er7dhy312` / `pri_01kwpqz63xx8ynp1a3h2k4560a`); no
  discounts exist in either account. Live client-side token
  `live_69d8971bbf12b93772a6d6df900` (`ctkn_01m15nv7h4159g3veadvmw4mzt`).
  Live notification destination `ntfset_…` →
  `https://license.hostbeam.app/webhooks/paddle`, subscribed to
  `transaction.completed` / `adjustment.created` / `adjustment.updated`,
  `traffic_source: platform` (simulations excluded on purpose — a simulated
  event would otherwise mint a real Keygen license). Its `endpoint_secret_key`
  is set as the production `PADDLE_WEBHOOK_SECRET` and **cannot be re-read from
  the API**; never delete or recreate that destination, as recreating rotates
  the secret and silently breaks verification of every later delivery.
- **Site prepared for domain review 2026-08-29.** Paddle expects Terms, Privacy
  and a Refund Policy each reachable from site navigation, plus the sole
  proprietor's brand in the T&Cs. A refund section inside `/terms` was not
  clearly its own policy, so `/refunds` is now the canonical refund and
  cancellation policy (linked from the footer and from `/terms`), and
  `terms.astro` / `privacy.astro` / `refunds.astro` all name **PunkABeat**. The
  pricing Buy button now goes to `/buy` instead of anchoring to `#download`;
  a sandbox build still shows the "not open yet" notice, so it is safe to ship
  before go-live.
- ~~**`hostbeam.app` does not resolve**~~ — **deployed 2026-08-29.**
  `apps/web/wrangler.jsonc` is an assets-only Worker (`hostbeam-web`; no `main`,
  since there is no server code) with `custom_domain: true` on the apex and
  `www`, so wrangler creates and manages the DNS rather than hand-added records.
  `npm run deploy:web` builds then deploys. Verified live: all six pages 200
  (via a 307 to the trailing-slash URL), `www` 200, and — the one that would
  have bitten after approval — Paddle's `?_ptxn=` survives that redirect
  (`/buy?_ptxn=x` → `/buy/?_ptxn=x`), so payment links will open the right
  checkout. Shipped with **no** env file, so `checkout.ts` falls back to sandbox
  with an empty token and `/buy` shows the pre-launch notice; no token appears
  in the served HTML. `/buy` had no policy links at all (bare layout, no site
  footer) and now links Terms/Privacy/Refunds inline — it is the page a reviewer
  studies hardest.
- **Checkout domain APPROVED 2026-08-29**, 42 minutes after submission — not
  the 5-7 business days Paddle quotes as the worst case. Apple Pay came back
  `verified` at the same time, with no separate association-file step needed.
  Originally submitted as: (Checkout → Website approval →
  Domain approval; creation is dashboard-only, the API exposes only
  get/list/delete/verify). `chedom_…`, `hostbeam.app`,
  `pending_review`, Apple Pay `unverified`. Poll with
  `client.checkoutDomains.list()`: `pending_review` → `in_review` → `approved`,
  or `action_required`/`rejected`. This gates the default payment link and
  therefore live checkout.
- **Paddle cannot approve a `www.` domain** — submitting `www.hostbeam.app`
  fails with "Invalid domain name", matching its own instruction not to include
  `www`. **The apex is the only hostname that can launch a checkout.** www was a
  custom domain serving the same build, so a visitor reaching /buy there would
  have opened a checkout blocked on an unapproved domain — a broken purchase for
  someone actively trying to pay, surfacing as a support email rather than a
  failing test. Fixed the same day: `apps/web/worker/index.js` 301s www to the
  apex, preserving path and query (`?_ptxn=` must survive, or a payment link
  opens an empty checkout). That is the only reason `apps/web` has a `main` at
  all; `run_worker_first` is required, or the asset would be served before the
  redirect ran. Verified live: www/buy?_ptxn=x → apex/buy/?_ptxn=x → 200.
- **Live checkout settings (Checkout → Checkout settings), set 2026-08-29:**
  - *Payment methods* — all enabled. Paddle only shows a buyer the methods valid
    for their country and currency, so enabling the long tail adds options in
    markets where cards are the unusual choice and clutters nothing elsewhere.
    Most cannot be exercised in sandbox; treat them as enabled-and-trusted
    rather than verified.
  - *Statement description* — **`HOSTBEAM`**, not `PUNKABEAT`. The field exists
    to be recognised on a card statement weeks later, and buyers know the
    product name, not the sole proprietorship. `PunkABeat` remains the business
    name for identity verification and payouts; the two are unrelated.
  - *Checkout discounts* — **off**. There are no discounts in the live account,
    and an empty promo field costs conversions by suggesting a code exists.
    Re-enable when the renewal half-price discount is actually created.
  - *Marketing consent* — **off**. Collecting opt-ins would contradict
    `privacy.astro` ("no accounts and no data collection, we hold no personal
    data about anyone"). Not needed for renewal reminders either: a
    "your update window expires soon" mail is a service message about something
    the customer bought, not marketing, so it rests on a different lawful basis.
    If it is ever enabled, rewrite the privacy page in the same change.
  - *Saving payment methods* — **off**. One-time purchase, no accounts, nobody
    returns to a saved card; retaining it buys nothing.

- **Come back to these once the domain is approved:**
  1. **Default payment link** → `https://hostbeam.app/buy`. Not cosmetic —
     Paddle states "a default payment link is required to create a
     transaction", so live checkout cannot work without it. The field rejects
     unapproved domains, which is why it is blocked rather than merely pending.
  2. **Apple Pay / Google Pay** — both carry an ⓘ in the dashboard and need the
     domain registered before the buttons appear. Enabled already; confirm they
     actually render on `/buy` after approval rather than assuming.

- Still outstanding before live payments: site deploy, domain approval,
  business verification, and payout details.
- **Payouts — configured 2026-08-29, reworked 2026-09-16 and 2026-10-02.**
  The routing, the bank and the tax reasoning are the operator's own and are
  not in this repository. What transfers: the payout account must be held in
  exactly the name Paddle verified, a sole proprietor's business name may not
  be that name, and the inbound conversion cost measured on one real sale (see
  the local-currency note below) was larger than the outbound spread the routing had been
  chosen to minimise.
- ~~Put the worker behind a custom domain~~ — done (`license.hostbeam.app`,
  2026-07-04; the Paddle *sandbox* destination still points at workers.dev —
  update it, or simply create the live destination on the custom domain).
  Set the production default payment link to the deployed site's `/buy`.
- ~~Key email~~ — **done and verified end-to-end (2026-07-04)**: Resend free
  tier (CF Email Sending needs Workers Paid; the worker auto-prefers the CF
  `EMAIL` binding if that ever changes). hostbeam.app verified in Resend
  (Domain-Connect auto-added SPF/DKIM; no tracking subdomain),
  sending-only API key as `RESEND_API_KEY`. A sandbox purchase delivered the
  key to a real **inbox** (not spam) seconds after checkout, matching
  the /thanks page. **Email Routing is live (2026-07-04)**: catch-all + support@
  forward to the owner's verified inbox (so replies to the key email work),
  and the `_dmarc` TXT (`v=DMARC1; p=none;`) resolves. Sandbox test
  transactions were refunded and test licenses cleaned from Keygen. The
  production license email scores **10/10 on mail-tester** (SpamAssassin
  clean, SPF/DKIM/DMARC all pass, no blocklists; plain-text by design), and
  the reply loop is verified (Cloudflare forwarded a reply to license@ —
  the mailbox's self-send dedup was the only "loss", confirmed by Cloudflare's own
  notice).
- Rotation reminder for the Paddle API key (sandbox one expires ~Oct 2026).
- Skim Paddle's currency settings (leave auto-conversion on) — checkout
  localization itself is automatic (English-only launch decided 2026-07-05,
  see docs/research/questions.md §Localization).
- Optional, documented but not applied: reply *as* support@hostbeam.app from
  the owner's mailbox via Resend SMTP — steps in apps/license-webhook/README.md
  ("Replying as support@"). Its successor is also documented and deliberately
  deferred until the first sales/support mail: real mailboxes on **Zoho Mail
  Lite** (~$12/year, support@ + aliases, IMAP) — same README, "Mailbox
  hosting", and docs/research/questions.md § Email / mailbox hosting.
- Delete the sandbox test licenses in Keygen; keep the Dev-tier ALU count in
  mind (~100 active licenses before a paid Keygen plan).

## Regional pricing (applied 2026-08-30)

Three tiers on the live price `pri_01m15nt3w2ppdapcr5yak5vtag`, via
`unit_price_overrides`. **Not a discount** — no code, no verification, no
support load, and the promo-code field stays off (that decision still holds).
Countries not listed fall back to the $29 base automatically.

| Tier | Target | Who |
| --- | --- | --- |
| Base | **$29** | everywhere not listed below |
| Tier 2 | **~$19** | upper-middle income + Central/Eastern Europe |
| Tier 3 | **~$14** | lower-middle income |

**Deliberately shallower than standard PPP tables.** The buyer is a developer
who runs their own server, and developer salaries in India, Brazil or Poland sit
far above those countries' median income — national PPP data over-discounts
badly for this audience. $14 is the floor: below it Paddle's fixed fee takes a
visible share (6.7% at $29, ~9% at $14) and the gap starts to be worth
arbitraging.

**Local currency where Paddle supports it, USD otherwise.** This is not a
preference, it is a constraint: Paddle's currency list has no IDR, PHP, NGN,
EGP, PKR or BDT, so most of tier 3 — Indonesia included — is priced in USD. Only
IN, VN and UA can be local there. It matters because local currency is what
unlocks local payment rails: **INR enables UPI and BRL enables Pix**, both
already switched on.

**Verified in sandbox before touching the live price, and it caught a 100×
error.** `unit_price_overrides` amounts are in each currency's *minor* unit, and
the decimal count is not guessable: **CLP is zero-decimal but COP is not**, so
`59900` meant 59,900 CLP in Chile and **599 COP (about $0.19) in Colombia**.
`pricingPreview` per country is the check — its totals are tax-inclusive, so
Indonesia showing $15.54 for a $14 price is the 11% VAT, not a fault.

Note EUR appears on both sides: Germany and France pay the auto-converted base
(€25.04) while Portugal, Greece, Slovakia and the Baltics get the €16.99
override. Overrides win over auto-conversion for the countries they name, which
is the intended behaviour and worth re-checking if the tiers change.

**Silent by choice** — nothing on the pricing page announces it. Revisit once
there is buyer-country data; these tiers are informed guesses, not measurements.

## Discounts: what we do and deliberately do not (decided 2026-08-30)

**Regional pricing: yes** — see above. Automatic, no code, no verification.

**Student discounts: no.** At $29 the discount is worth ~$15, and every
verification path costs more than that: SheerID-style services charge per check,
`.edu` email excludes most of the world, and an honour-system code leaks.
Decisively, Paddle's `usage_limit` is an **overall** cap rather than
per-customer, so a public code cannot be contained once it escapes. The students
who most need a lower price are largely covered by regional pricing anyway.

**Open source: yes, as manual grants — never a code.**
`node scripts/grant-license.mjs "github.com/x/y"` mints a one-time link (see
apps/license-webhook/README.md, "Granting a free licence"). No code exists to
leak; single-use; expires. The recipient goes through the ordinary purchase
pipeline, so nothing about grants is special-cased in the worker.

It needs its own Paddle API key with `discount:write` + `transaction:write` —
**deliberately not** the worker's live key, which only reads customers. Widening
that would put write access on a credential living in a public-facing Worker.

## Open follow-ups (as of 2026-08-30)

Ordered by what it costs to leave undone.

- [x] ~~**Verify the key email actually sends.**~~ **Done 2026-08-30** —
  a test transaction, its licence, `metadata.email`
  populated, worker logged no warnings, email received in the new format with
  the correct expiry date and order reference. **The purchase path is now
  verified end to end on live.** The same run also collapsed the space-aligned
  columns in a real inbox, so the email switched to `- On Mac:` / `- On iPhone:`
  separators: many clients render `text/plain` through HTML and eat runs of
  whitespace, and alignment that depends on them is not portable.
- [x] ~~**Re-run mail-tester on the key email.**~~ **10/10 again (2026-08-30)**,
  SpamAssassin clean — the two links added in the rewrite
  (`download.hostbeam.app`, `hostbeam.app/refunds`) cost nothing. Tested the
  way it should be: a real sandbox purchase using the mail-tester address as the
  buyer, so the whole path ran (worker → Resend → inbox) rather than a synthetic
  send of the same text. That one test also confirmed the sandbox key-email path
  and the newly swapped **product token** both work in the real minting path.
  Repeat this after any change to the email body or the sending domain.
- [ ] **Add the App Store link to the key email when iOS ships.**
  `apps/web/src/lib/links.ts` still has a placeholder Apple ID that 404s, so the
  email deliberately lists only the Mac download while telling iPhone buyers how
  to activate. Fill in the real id in `links.ts` and add the line to
  `emailKey()` in the same change.
- [x] ~~**Replace the Keygen admin token with a product token.**~~ **Done
  2026-08-30.** Both workers and `scripts/find-license.mjs` now use a token
  scoped to the Hostbeam product. The account also hosts other software,
  so the admin token was giving the licensing worker reach over a
  different product's licences and customers — a real blast radius, not a
  theoretical one. Verified by exercising create / find / suspend / delete
  before the swap, confirming the other product 404s, and `GET /key` on both
  deployments after.
- [x] ~~**Identify or revoke the unnamed Keygen admin token**~~ — `582c8bd3`
  **revoked 2026-08-30**. Unnamed, non-expiring, created 2026-07-04, and its
  value was held nowhere. Safe to remove because nothing operational uses an
  admin token any more; verified afterwards that the 1Password one still
  authenticates.
- [x] ~~**Consider revoking the orphaned product token**~~ — `4e73c2a5` revoked
  2026-08-30. Two tokens remain, both accounted for: the product token both
  workers use, and the named admin token in 1Password.
- [x] ~~**Create the `hostbeam-ops` Paddle API key**~~ **Done 2026-08-30.**
  Stored as `PADDLE_API_KEY (live ops)` on the Paddle 1Password item, separate
  from the worker's read-only key on purpose — that one lives in a public-facing
  Worker and must not be able to mint free licences. `grant-license.mjs`
  verified end to end on live: discount + transaction created, the checkout link
  resolved 200, and the probe discount was archived so nothing redeemable
  remains.
- [ ] **⚠ Reissue the `APPSTORE_*` secrets when the Apple account moves to
  PunkABeat.** They are tied to the App Store Connect account that issued them,
  so the swap silently stops iOS licences from being minted — the buyer pays
  Apple and gets nothing, and `reconcile()` cannot see it because an App Store
  purchase has no Paddle transaction. Steps in
  `apps/license-webhook/README.md`; also flagged in milestone 008.
- [ ] **The daily reconciliation does not cover App Store purchases.** They mint
  via `appleTransactionId` and have no Paddle transaction, so `reconcile()`
  cannot see them. Worth extending once iOS ships and there is real App Store
  revenue to lose.
- [x] ~~**Decide on checkout currency conversions.**~~ **A second currency
  enabled 2026-08-30**, and it worked first try: the same test purchase was
  priced in that currency and paid with a local payment method (captured),
  confirming the diagnosis that local payment methods require an item priced
  in the local currency for a customer in that country. Two things still open
  underneath it:
  - [ ] The local price is an auto-converted number. If that country becomes a
    real market, an explicit price override for a round figure is a pricing
    decision.
  - [x] ~~The balance is USD, so a local-currency sale converts on settlement.~~
    **Measured 2026-08-30.** The local-currency sale settled for roughly **3% less** than the identical product
    sold in USD the day before — that much **lost** converting into the USD balance. That is the
    inbound FX cost, and it is *larger* than the outbound payout spread that the payout routing was chosen to minimise.
    **Not an argument against local currencies.** Local pricing plus a local payment method plausibly wins
    more sales than 3% costs, and this test only converted because it
    was a local-currency checkout. But it is now a measured trade rather than a guess, and
    the same 3% should be assumed for every non-USD currency enabled.
    One caveat before generalising: `retained_fee` was **0** on this refund,
    where yesterday's USD refund retained $1.95. A single observation — do not
    build a refund policy on it.
- [ ] **A refunded licence could not be removed from the app (fixed 2026-08-30,
  ships with the next build).** Deactivating a suspended licence on iPhone said
  *"Couldn't reach the license server"* about a server that had answered
  `403 LICENSE_SUSPENDED` instantly. Two faults: `deactivate()` treated every
  non-2xx/404 as a transport error, and it threw before clearing local state, so
  the dead key stayed stored with no way to remove it. Both platforms now treat
  any definitive 4xx as "this key cannot free a seat here" and clear locally;
  only 5xx and real transport failures keep the key. iOS also stops reporting
  every deactivation failure as an unreachable server.
  *Only reaches users when the apps are rebuilt and released.*
- [x] ~~**Desktop `3 devices` strings ship with the next app build.**~~ Shipped
  in 0.1.7 (2026-08-30).
- [x] ~~**A refunded licence could not be removed from the app.**~~ Shipped in
  0.1.7 and verified on a real iPhone (2026-08-30): deactivating the suspended
  licence and activating the new one both work. The i18n fix
  (2026-08-30, 24 strings across 8 locales) is committed but only reaches users
  when the app is rebuilt and released.

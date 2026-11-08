# ADR 0031: Licensing Retired — Hostbeam Is Free

Status: **Accepted** (2026-11-08, owner decision). Retires the license of
ADR 0014 and the reminder of ADR 0028; ADR 0028 § 1 and § 4 (every feature free,
the iPhone free with nothing to buy) stand. Relates to the decision to publish
the source (the root README, "Why this is public").

## Context

Hostbeam went on sale 2026-08-29 and launched 2026-10-09. On 2026-11-08
`npm run stats` read: two licences ever sold, both the owner's own test
purchases and both refunded; one licence granted free; nine Mac downloads since
counting began on 2026-10-07, about one copy a day checking for updates; seven
iPhone first downloads and no rating. Net revenue: zero.

The owner decided the project is finished as a business — the upload it does is
a commodity on every platform (handoff-log, 2026-09-26) — and is publishing the
source so people and agents can learn from how it was built. With the source
public the licence check protects nothing: anyone can build the app without
the reminder. Paddle and Keygen cost money and attention for no sale, and every
month they stay open is a month of fees and of tax paperwork for a company
that sells nothing.

## Decision

1. **Hostbeam is free, for good, with no reminder.** `licensing::LICENSING_RETIRED`
   in the Mac app is the one switch. While it is `true`: no beam carries the
   reminder, the popover never says "Unlicensed", the License pane says that
   licences are no longer sold, and no revalidation call is made. The iPhone
   app already had nothing to buy (ADR 0028 § 4) and does not change.

2. **Nothing is sold.** The site's `/buy`, `/thanks` and `/refunds` keep their
   routes — receipts, old posts and older builds link to them — and say that
   there is nothing to buy. The pricing section says "free" and that licences
   are no longer sold, in those words: a page that pretended the licence never
   existed would read as a cover-up to anyone who met the $29 elsewhere. The
   checkout configuration (`src/lib/checkout.ts`, `.env.example`, the
   `PUBLIC_PADDLE_*` variables) is removed from the site; `assert-live-build.mjs`
   now refuses a build that still carries a Paddle script or token.

3. **The code stays.** The Keygen client, the store, the commands, the License
   pane, the licence worker (both environments) and the support scripts remain
   in the tree, unwired, as the record of how a one-person company sold a Mac
   app: the webhook, the key email, the refund path, the seat count, the App
   Store receipt exchange. The site's checkout pages and configuration as they
   ran are kept under `docs/archive/site-checkout/`, since the public
   repository's history is a single commit.

4. **The accounts stay open.** Paddle, Keygen and Resend are PunkABeat's, not
   Hostbeam's, and the owner's next projects will use them (decided
   2026-11-08, revising the first draft's plan to close them). Nothing is
   cancelled: the licence worker stays deployed and idle on both environments,
   `license.hostbeam.app` keeps resolving, and `npm run stats` keeps reading
   the Paddle account. The Hostbeam product and price in Paddle can be
   archived at leisure; nothing links to them.

5. **A key already activated changes nothing.** The License pane's licensed
   branch still shows it, and with revalidation off it never lapses. There is
   nobody to refund and nobody to write to.

## Consequences

- The next Mac release ships the switch, and the site deploys with it.
- The reminder's count (`Store::beams`, `first_beam`) keeps being written, so
  the file format does not change and nothing is migrated.
- Seat counting, the one-year expiry and the refund handling are no longer
  exercised by anyone; their tests still run, and `reminder_due` stays pure so
  its cadence tests keep meaning something.
- If a paid layer ever comes back (ADR 0028 § 5), it is a new decision, and
  everything it needs is still here, accounts included.
- The documentation keeps its history: ADR 0014 and ADR 0028 are marked
  retired, not rewritten, and milestone 006 stays as it was written.

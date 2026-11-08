# ADR 0019: The Marketing Site Is Dressed Like the App, Not Like the Prototype

Status: Accepted.

Date: 2026-09-08.

Amends: ADR 0013 (Astro Marketing Site and the Shared UI Package) — keeps its
architecture entirely and retires one line of it: that
`docs/design/hostbeam-handoff/reference/landing/` is the *source of truth* for
`apps/web`. It is now reference, in the same way ADR 0011 made the app's
prototypes reference rather than shipped code.

## Context

The landing page was snapshotted byte-for-byte from the design project and
ported verbatim, visual system included: a drafting-paper grid across the whole
page, mono "fig." eyebrows over every section, `t+0.4s · in flight` timing
annotations on the how-it-works steps, an iPhone parked over the Mac popover in
the hero, two glowing pricing tier cards, and a saturated blue gradient banner
as the closing call to action.

(The grid was taken out, put back on request, and taken out again once it was
seen next to the rest of the restyle. All of it stayed gone.)

An outside review of the site said it read as machine-generated — specifically
that the costume was the current default for AI-adjacent developer tools, and
that the page therefore disagreed with its own claim to be "built like a tool,
not a service." That is a taste judgement and unprovable. But checking it
against this repository turned up something that is not a matter of taste: the
page was breaking the product's own voice rules, written down in
`docs/design/hostbeam-handoff/01_product_and_voice.md`.

- "**Mono for the literal.** Paths, hostnames, addresses, and hotkeys" — values
  the user could type. `t+0.4s · in flight: your SSH, no relay` is not one, nor
  is `specifications`, nor `free · 5 beams/day`.
- "**One warmth line per surface, max.**" The hero carried two.

The site had inherited a visual language the product had already rejected for
itself. That is the real defect, and it is decidable without appealing to
fashion.

Two further things surfaced while acting on it, neither of them cosmetic:

- `og:image` was the app icon as an **SVG**. X, Slack, iMessage and LinkedIn
  all decline to render an SVG preview, so every link anyone shared arrived as
  a bare card — on a product whose distribution is one developer sending
  another a link.
- `packages/ui/src/tokens/typography.css` `@import`-ed JetBrains Mono from
  `fonts.googleapis.com`. Both consumers paid for it: the marketing site on
  every visit, and **the Mac app on launch**. A product that says "no account,
  no relay, no telemetry" should not open a connection to Google to draw a
  path.

## Decision

- **`apps/web` owns its own visual system.** The landing prototype under
  `docs/design/hostbeam-handoff/reference/landing/` stays as design reference
  and history; it is no longer the thing `apps/web` must match. Fidelity to it
  is not a bug report.
- **The site follows the product's voice doc**, which continues to be
  authoritative. Mono is for values a reader could type; captions, section
  labels and meta lines are set in the body face.
- **The page is quieter than the thing it sells.** No page-wide grid, no
  annotation layer over the content, no gradient banner, no highlighted
  pricing tier. The hero is the Mac popover on a Mac desktop and nothing else.
- **Type stays Geist**, because Geist *is* the app's UI face (self-hosted in
  `@hostbeam/ui`, shipped in the Mac app). Matching the app is the point; the
  face is not the costume. Geist Mono, which the app never used, is gone in
  favour of the app's own `ui-monospace` stack.
- **No third-party requests.** Neither app fetches a web font. `ui-monospace`
  resolves to SF Mono on the platform both apps target.
- **`og:image` is a real 1200×630 PNG**, generated from `docs/marketing/og-card.svg`.
- **The site says who makes it, in the footer.** A one-person tool asking for
  $29 and a place on someone's SSH path has to answer "will this still be
  maintained next year," and the honest answer is the release cadence — counted
  at build time from the same `CHANGELOG.md` the Mac updater reads, so it cannot
  go stale. It is a footer line rather than a section, because a page that
  visibly asks to be trusted is doing the opposite of what this product's voice
  does.
- **A server-rendered page ships the design system's CSS in `<head>`.** Every
  self-styling component in `packages/ui` injected its `<style>` on first
  render, which on a static page happens only when the island hydrates — so the
  hero's Beam button and the Ready badge painted as bare browser controls until
  then. Each component now also exports its CSS, `componentCss` aggregates them,
  and `Base.astro` emits it. `ensureStyle()` stays for the Mac app, and stands
  down when the sheet is already present. Removing the render-blocking Google
  Fonts link is what made the gap visible; the defect predates it.

## Consequences

- A future agent comparing `apps/web` to the landing prototype will find they
  differ. That is intended; this ADR is the record. ADR 0013's other decisions
  (Astro + React islands, `packages/ui` as the shared design system, the
  `.theme-dark` contract) are untouched.
- `packages/ui` changed, so the desktop gates are part of any further change to
  the shared mono stack or the component stylesheets. They pass as of this ADR.
- A new self-styling component in `packages/ui` must be added to `componentCss`
  in `src/components/index.ts`, or it will flash unstyled on the site. The
  comment there says so.
- The site now publishes `/robots.txt`, `/sitemap.xml`, `/llms.txt` and JSON-LD,
  all generated from the same constants and copy the page renders. The rules
  that keep them honest — one copy of the FAQ, and never a claim the page does
  not make — are in `apps/web/README.md`.
- No button promises the App Store and then scrolls to an anchor. Until the
  App Store record is live the site says so plainly: the iPhone section carries
  an unclickable "Coming soon to the App Store" badge, and the QR that scanned
  to a 404 is gone. `installUrl` is out of the JSON-LD and `/llms.txt` says
  there is nothing to install on iOS, so neither a search result nor an
  assistant offers a download that does not exist. Everything to restore on
  launch day is listed in `docs/process/ios-submission-checklist.md` § 3b.
  Elsewhere on the page, "The iPhone companion" scrolls to that section, which
  is what it says it does.
- Regenerating the OG card needs `rsvg-convert` and `woff2_decompress`, both
  Homebrew formulae. The exact command is in the SVG's own header comment, and
  the PNG is committed, so nobody needs those tools to build or deploy.

# ADR 0013: Astro Marketing Site and the Shared UI Package

Status: Accepted.

Date: 2026-07-04.

Advances: ADR 0012 (One Monorepo) — realizes its planned `apps/web` and triggers its
"extract shared code once a second consumer exists" rule.

## Context

The marketing site's design exists as a complete one-pager in the Hostbeam design project
(snapshotted byte-for-byte in `docs/design/hostbeam-handoff/reference/landing/`). It is
built entirely on the Hostbeam design system and contains exactly one interactive element:
the hero's live popover demo (idle → uploading → landing → done). Everything else is
static content that benefits from real HTML for SEO.

The desktop app's design-system code (`src/ui`: token CSS, Geist fonts, components; plus
`Ic`, `BeamMark`, `ShotThumb`) is pure React with no Tauri dependencies — portable as-is.

## Decision

- **`apps/web` is an Astro site with React islands.** Sections render to static HTML at
  build time (near-zero client JS); only the hero demo hydrates (`client:visible`). The
  design's React sections port with minimal rewriting because Astro renders React
  components server-side. Blog/changelog pages can be added later without new tooling.
- **The design system lives in `packages/ui` (`@hostbeam/ui`)**, consumed by both apps.
  It ships raw TS source (`exports` map to `src/`); each app's bundler (Vite / Astro)
  compiles it directly — no build step, no publishing.
- The site follows the system color scheme by toggling the token scope class
  `.theme-dark` on `<html>` — the same contract as the desktop app's `theme.ts`.
- Marketing copy comes verbatim from the design (the voice doc is authoritative); the
  design's Tweaks panel and walkthrough link are design-tool-only and were dropped.

## Consequences

- A design-system change now affects both apps; desktop gates must pass before landing
  `packages/ui` changes (the web build type-checks it too via `astro check`).
- The site has no real download link yet — CTAs anchor to `#download` until packaging
  (ADR 0008 scope) produces a distributable artifact.
- Deployment (host, domain, CI) is intentionally not decided here.

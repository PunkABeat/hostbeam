# ADR 0012: One Monorepo for the Desktop App, Website, and Future Mobile App

Status: Accepted.

Date: 2026-07-04.

## Context

Hostbeam is growing beyond the macOS desktop app: a marketing/sales website is planned, and
possibly a companion mobile app later. All of these live in the TypeScript/JS ecosystem
(the desktop app is Tauri + React + TS), the project has a single maintainer, and the
cross-cutting docs (`docs/`) apply to the product as a whole rather than to one app.

Separate repositories would pay off mainly with separate owners, separate visibility, or
strictly isolated release cadences — none of which apply. They would cost real friction for
shared types/branding/copy (private packages or copy-paste) and split the documentation set.

## Decision

Keep everything in this repository as an npm-workspaces monorepo:

- `apps/desktop/` — the macOS menu-bar app (Rust core in `src-tauri/`, Vite + React + TS frontend in `src/`).
- `apps/web/` — the marketing website (when started).
- `packages/` — code shared between apps, extracted only when a second consumer actually exists (no speculative shared packages).
- `docs/` — product/design/engineering documentation, at the root, covering the whole project.

The root `package.json` declares the workspaces and proxies the common scripts (`dev`,
`build`, `typecheck`, `lint`, `test`, `format`, `tauri`) to the desktop workspace, so the
pre-restructure commands keep working from the repo root.

Release tags must be app-scoped (for example `desktop-v0.2.0`, `web-v1.0.0`), not bare
`vX.Y.Z`, once tagged releases begin.

## Consequences

- One toolchain, one docs set, and cross-cutting changes land as one commit.
- Older docs written before the restructure reference `src/` and `src-tauri/` from the repo
  root; those paths are now relative to `apps/desktop/`.
- CI (when added) should path-filter so website changes do not trigger macOS builds.
- Splitting an app out later remains cheap (`git filter-repo` preserves history); merging
  separate repos back together would not have been.

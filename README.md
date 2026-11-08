# Hostbeam

Built by [David Lonjon](https://github.com/davidlonjon) and published under the
[PunkABeat](https://github.com/PunkABeat) account. The product lives at
[hostbeam.app](https://hostbeam.app).

Hostbeam is a macOS menu-bar utility with an iPhone companion. It moves the
screenshot on your clipboard (or any file you hand it) to an SSH host you
choose, then puts a coding-agent-friendly sentence with the remote path back
on your clipboard, so an agent running on that host can look at what you see.
No account, no relay, no agent on the server: it uses your existing OpenSSH
setup and `ssh-agent`.

It shipped. The Mac app is signed, notarized and self-updating, the iPhone app
is on the App Store, and for ten weeks the website sold a $29 licence through
Paddle. This repository is the whole thing, released under the MIT licence so
that people, and the coding agents they work with, can learn from it.

## Why this is public

Hostbeam was my first project built from nothing to a shipped, paid product,
and most of it was built in collaboration with coding agents. It works. It is
also very niche, there are several other
ways to solve the same problem, and I do not believe it can become a business.
Rather than let it sit, I am sharing everything: the code, the decisions, the
plans, the process, the launch material and the parts that went wrong.

If you are building a native app on your own, or working out how to build one
with agents, the interesting parts are probably not the Rust or the Swift. They
are the records of how it was done:

- **[docs/adr/](docs/adr/README.md)** — 31 architecture decision records, from
  "why SSH and nothing else" to "why the iPhone app is free". Each one says what
  was decided, what was rejected and what it cost.
- **[docs/process/milestones/](docs/process/milestones/)** — one document per
  milestone, including the post-mortems. Milestone 008 (the iPhone app) and
  006 (licensing) are the longest, because the most went wrong there.
- **[docs/process/progress.md](docs/process/progress.md)** and
  **[docs/process/next.md](docs/process/next.md)** — the live work state and
  the backlog as they stood when work stopped.
- **[docs/agents/](docs/agents/required-reading.md)** — how the repository was
  set up for coding agents: required reading, the handoff file, the
  [pitfalls](docs/agents/pitfalls.md) that kept biting, and the
  [handoff log](docs/agents/handoff-log.md) of every session's state.
- **[docs/research/](docs/research/questions.md)** — the open questions, the
  brainstorms where alternatives were weighed, and a record of what AI
  assistants told users to do before Hostbeam existed.
- **[docs/marketing/](docs/marketing/launch-posts.md)** — the launch posts, the
  App Store listing, the review notes and the screenshot plan.
- **[docs/process/ios-submission-checklist.md](docs/process/ios-submission-checklist.md)**
  — what it actually takes to get a one-person company through App Review.

The section below puts numbers on the effort.

## Effort

One person, with a coding agent in the loop for nearly every commit, mostly in
the evenings and at weekends. Everything here is measured from the original
git history (855 commits) and the tracked tree; the figures are what the
record supports, not a timesheet.

**Calendar**

| Measure | Value |
|---|---|
| Span | 14 June to 29 October 2026, 138 calendar days |
| Days with at least one commit | 63 |
| Commits per month | Jun 146 · Jul 93 · Aug 191 · Sep 345 · Oct 80 |
| Busiest days of the week | Sunday (196 commits), Saturday (164) |
| Busiest hours | 21:00–23:59 holds 349 commits, 41% of all |

**Hours, two estimates from commit timestamps**

| Method | Result |
|---|---|
| Work sessions: commits clustered with gaps under 2 h, plus 30 min per session | 115 sessions, about 210 h |
| First to last commit on each active day | about 540 h, 8.5 h per active day |

The first misses the thinking and testing that ends without a commit; the
second counts a whole day as work when there was one commit at breakfast and
one at midnight. The author's own recollection is that a typical evening was
about two hours, with longer stretches at weekends, which puts the real figure
near the lower estimate: roughly 200 to 250 hours over four and a half months.

**Output**

- Code, blanks and comments excluded (`cloc`): about 11k lines of Rust and 15k
  of TypeScript in the desktop app, 6.5k of Swift in the iPhone app, 2k of
  Astro on the website, plus two Cloudflare Workers, a Raycast extension, an
  MCP server and the release scripts. About 70k lines of code in 570 files.
- Docs: 107 Markdown files, 17k lines, roughly 190k words, including 31 ADRs
  and 9 milestone documents.
- Tests: 279 Rust tests, 121 Swift tests, 38 vitest files.
- Releases: 35 Mac versions from 0.1.0 to 0.1.34, one iPhone release.
- Churn: 267k lines added and 127k removed over the history, so almost half of
  everything written was later rewritten or deleted.

**Agent share**

806 of the 855 commits carry a Claude co-author trailer and 14 mention Codex.
Shell history shows a few hundred commands typed by hand in the repo over the
whole period; most of the typing was the agent's. Agent transcripts were not
kept, so there is no separate count of agent hours.

## What this repository leaves out

Everything that is the owner's own rather than the project's: the payout and
tax configuration, the bank and business-registration paperwork behind App
Store Connect, the identity details in the submission log, customer
transaction ids, and the release environment file that names the developer.
Where a section was removed, a short note says what it held and what lesson
transfers. The git history is new: the original 855 commits carried the same
details and are not published.

The product is still live, and it is free: licensing was retired on
2026-11-08 ([ADR 0031](docs/adr/0031-licensing-retired.md)), after two sales
that were both the developer's own tests. The licence check, the Paddle → Keygen
worker and the support scripts stay in the tree, unwired, because they are part
of how it was built, and the site's checkout as it ran is kept under
[docs/archive/site-checkout/](docs/archive/site-checkout/README.md).

## Product Bias

- Native-feeling desktop utility, not a dashboard.
- Tauri (Rust core + system WebView) desktop app; see ADR 0010.
- macOS first.
- Menu-bar utility first, with no normal main window unless needed.
- Global hotkey upload from the first usable product, configured during setup.
- Uses existing OpenSSH configuration and `ssh-agent`.
- Shells out to system `ssh` first.
- Does not store private keys or SSH credentials.
- No cloud account, relay service, or hosted infrastructure by default.
- Moves only what you hand it. Not a file manager, not a sync tool.

## Repository Layout

This is an npm-workspaces monorepo:

- `apps/desktop/` — the macOS menu-bar app (Tauri: Rust core in `src-tauri/`, Vite + React + TS frontend in `src/`).
- `apps/web/` — the marketing website (Astro + React islands; `npm run dev:web` / `build:web`). Checkout is configured per build environment — see `apps/web/README.md`.
- `apps/license-webhook/` — the Paddle → Keygen licensing glue (Cloudflare Worker, ADR 0014). Deploys twice, live and sandbox — see `apps/license-webhook/README.md`.
- `packages/ui/` — the shared design system (`@hostbeam/ui`: tokens, fonts, components), consumed by both apps.
- `docs/` — product, design, and engineering documentation for the whole project.
- `scripts/` — release and operations tooling (see below).

## Scripts

| Script | What it does |
| --- | --- |
| `release.sh` | One-command macOS release. Wraps `release-macos.sh` with secrets injected from 1Password. Builds, signs, notarizes, publishes to R2, then deploys the site so `/changelog` matches. |
| `cut-release.mjs` (`npm run release:cut`) | Turns the accumulated `## Unreleased` notes into a numbered release: renames the heading, bumps all four version files and `progress.md`. Refuses to cut nothing, or to go backwards. |
| `changelog.mjs` | Prints one release's notes from `CHANGELOG.md`, plain text or `--json`. Feeds the updater manifest and App Store Connect's "What's New". |
| `check-version-sync.mjs` | Release guard: the three desktop version files must agree, and iOS must declare a well-formed version and build number on its own independent lane. |
| `check-progress-current.mjs` / `check-handoff-short.mjs` | Doc guards, both run by `npm run check:docs` (and so by the release): `progress.md` must not describe a version the repo has moved past, and `current-handoff.md` must stay under 90 lines so it keeps being read. |
| `reviewhost.sh` | The App Store review demo host: an SSH server that accepts any ed25519 key, because the reviewer's device key cannot be known in advance. Sftp-only, chrooted, no forwarding. `check` proves it. Torn down at approval. |
| `reviewhost-deploy.sh` | Puts that same host on a Hetzner Cloud box and destroys it again. Token from 1Password; cloud-init carries the container files inline, so the box never needs repo credentials. |
| `testhost.sh` | A disposable OpenSSH server in Docker, added to `~/.ssh/config` — `npm run testhost:up` / `:down` / `:logs`. Set `HOSTBEAM_TESTHOST_ALIAS` + `_PORT` for a second one, which pairing work needs. Carries Claude Code, tmux and mosh, and rebuilds itself when its Dockerfile changes. |
| `spikes/ctrl-v/` | The next.md § 10a spike: Ctrl+V in Claude Code on the test host pastes the Mac's clipboard image, through tmux and mosh. `ctrl-v.sh test hostbeam-testhost` proves it end to end without touching your clipboard; its README has the findings. Spike-grade, never shipped. |
| `test-update-install.sh` (`npm run test:update-install`) | A background update end to end, published nowhere: builds a throwaway test app twice, serves the newer build locally, and checks that checking off sends nothing, a read-only app folder downloads nothing, and an install relaunches once idle (ADR 0022). About ten minutes; removes everything it made. |
| `find-license.mjs` | Support: `<email or txn_id>` → licence key, status, seats. Resolves the email through Paddle because Keygen's metadata search is case-sensitive. |
| `grant-license.mjs` | Mints a free licence as a one-time checkout link, for open-source maintainers and similar. No discount code exists to leak. |
| `stats.mjs` (`npm run stats`) | Everything counted, in one go: Mac downloads and copies running (`downloads.mjs`, also `npm run downloads`), sales from Paddle live (`sales.mjs`), and the iPhone app's downloads, updates and ratings (`appstore.mjs`). Keys from 1Password, so run it from a terminal; each part fails alone with a reason. |
| `ai-answers.sh` | Asks Claude Code and Codex the questions a Hostbeam user would ask, starting from nothing, and saves the answers in `docs/research/ai-answers/<date>/` to compare with earlier runs. Uses the subscriptions they are signed in with. |

`changelog-parse.mjs` is a shared parser with no side effects, imported by both
`changelog.mjs` and the site's `/changelog` page. `release.env.example` shows the `op://` references the release reads; the
real `release.env` is not in this public repository.

Both licence scripts read credentials from 1Password at call time and need an
interactive terminal for its prompt; each prints the exact `export` to use if
you would rather pass the key by environment variable.

## Develop

- `npm install` (at the repo root) then `npm run tauri dev` — run the app (menu-bar popover; toggle with the tray icon or `⌘⇧7`).
- **Tray right-click menu**: Open Hostbeam · Preferences… · Restart onboarding · Quit. (*Restart onboarding* is a temporary dev action that resets config + re-runs first-run onboarding.)
- Frontend lives in `apps/desktop/src/` (design system under `src/design/`); the Rust core is in `apps/desktop/src-tauri/`.
- **A local SSH host for testing**: `npm run testhost:up` runs a disposable
  OpenSSH server in Docker (publickey-only, port 2222) and adds it to
  `~/.ssh/config`, so the beam path is testable without a live remote box —
  from the iPhone too. `npm run testhost` for status, `testhost:down` to stop.
  See [the test host](docs/process/test-host.md).
- `npm run clean:rust` empties `apps/desktop/src-tauri/target`. Cargo never
  deletes an old build, and every version bump, dependency update or Rust
  update starts a new one, so it grows by tens of GB a month. Clearing it is
  safe; the next build just starts from scratch.
- The root `package.json` proxies the common scripts (`dev`, `build`, `typecheck`, `lint`, `test`, `format`, `tauri`) to the desktop workspace, so they work from the repo root or from `apps/desktop/`.

## Quality Commands

Run these before handoff (from the repo root):

- `npm run build` (Vite production build)
- `npm run typecheck` (`tsc --noEmit`)
- `cargo fmt --check` and `cargo clippy` (in `apps/desktop/src-tauri/`)
- `cargo test` (in `apps/desktop/src-tauri/`)
- `npm run tauri build` (bundle)

## Start Here

- [Onboarding](docs/onboarding.md), [Product](docs/product.md), [Experience](docs/experience.md)
- [Engineering](docs/engineering.md), then the stack guides in `docs/engineering/`
- [Design](docs/design/README.md) — the original design handoff; the app was built from it twice (Flutter, then Tauri)
- [ADRs](docs/adr/README.md)
- [Progress](docs/process/progress.md) and [what was next](docs/process/next.md)
- [Required reading for agents](docs/agents/required-reading.md), [current handoff](docs/agents/current-handoff.md), [pitfalls](docs/agents/pitfalls.md)
- [Open questions](docs/research/questions.md)

## Naming

Hostbeam is the final product name (ADR 0015; clearance pass done 2026-07-04, `hostbeam.app` registered).

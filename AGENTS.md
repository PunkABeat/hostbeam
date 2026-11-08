# Agent Instructions

This repository has completed its documentation foundation, first implementation proof, and first usable screenshot bridge milestone. Do not add file browsing (a manual file picker or a remote file browser), syncing, SSH config editing, remote cleanup automation, or interactive SSH password/passphrase behavior unless the current task explicitly starts the relevant milestone.

Scope note (2026-09-26, owner-opened): **any file the user hands over** is in
scope — dropped on the popover or the menu-bar icon, copied in Finder and
beamed with the shortcut, shared from the iPhone, or passed with
`open -a Hostbeam`. Browsing the disk or the server, syncing, and folders stay
out. Decided in [ADR 0006](docs/adr/0006-screenshot-bridge-first-product-scope.md)'s
2026-09-26 amendment; built on the Mac (2026-09-26) and the iPhone
(2026-09-27); the Mac shipped it in 0.1.30 ([next.md](docs/process/next.md) § 10).

Scope note (2026-08-23, owner-opened): **manual** remote cleanup exists — an
owner-invoked, confirmation-gated "clean up" that deletes only Hostbeam's own
artifacts (one directory level, never recursive, never the folder). Since
2026-09-26 "Hostbeam's own" means the name carries its millisecond stamp —
`hostbeam-` then exactly 13 digits then an end, `.` or `-` — for every type,
images included; never the bare prefix and never a list of extensions
(`artifact_match()`, ADR 0006's amendment). *Automatic* cleanup (schedules,
retention policies) remains fenced.

Scope note (2026-09-28, owner-opened): Hostbeam may **forward the agent's dev
server to the Mac** — the popover lists the SSH user's own listening ports when
it opens, and **Open** holds one connection and forwards that port to
`127.0.0.1` until Stop ([ADR 0029](docs/adr/0029-open-the-agents-dev-server.md)).
Nothing is installed on the host; no connection is held without a click; no
background checking; the iPhone and the server-to-Mac clipboard stay out.

## Required Reading

Before changing this repository, read:

1. [docs/agents/required-reading.md](docs/agents/required-reading.md)
2. [docs/agents/current-handoff.md](docs/agents/current-handoff.md) and [docs/agents/pitfalls.md](docs/agents/pitfalls.md)
3. [docs/process/progress.md](docs/process/progress.md)
4. [docs/agents/contribution-protocol.md](docs/agents/contribution-protocol.md)
5. Any ADR relevant to the change

## Repository Layout

This is an npm-workspaces monorepo. The macOS desktop app lives in `apps/desktop/` (frontend `src/`, Rust core `src-tauri/`); the marketing website in `apps/web/` (Astro + React islands, ADR 0013); the Paddle → Keygen licensing glue worker in `apps/license-webhook/` (ADR 0014); the download counter in `apps/download-counter/` (ADR 0030 — a pass-through Worker on `download.hostbeam.app` that keeps daily counts of downloads and update checks in D1, never who; read them with `npm run downloads`); the iOS companion app in `apps/mobile/` (Swift + XcodeGen, ADR 0016 / Milestone 008 — not part of the npm workspaces); the Raycast extension in `apps/raycast/` (deliberately outside the npm workspaces — maintainer notes in `docs/process/raycast-extension.md`; its README is the store page); the launch film in `apps/video/` (Remotion, also outside the workspaces; its README says what in it is the product's own UI and what is staged); the agent-side MCP server and prompt hook in `apps/agent/` (ADR 0020 — dependency-free, runs on the *host*, reads only `hostbeam-*` images; the server alone is published, as `@hostbeam/mcp` through `scripts/mcp-release.sh`, ADR 0021); release and operations tooling in `scripts/` (release, changelog, licence support and grants — see the root README); the shared design system in `packages/ui/` (`@hostbeam/ui` — changes affect both web-stack apps, run both apps' gates). Older docs may reference `src/` / `src-tauri/` from the repo root — those paths are now relative to `apps/desktop/`.

## Testing against a real SSH host

Hostbeam's core workflow needs an SSH server, and there is one in the repo —
you do not need a remote box, credentials, or the network:

```sh
npm run testhost:up      # start it; adds `hostbeam-testhost` to ~/.ssh/config
npm run testhost         # status: reachable, host key, authorized keys, files landed
npm run testhost:logs    # follow sshd
npm run testhost:down    # stop it, remove it from ssh config
```

It is Alpine + OpenSSH on **port 2222**, publickey-only, reachable from the Mac
and (on the same network) from an iPhone. Full details, including why the port
is not 22 and why the ssh Include has to sit at the top of the file:
[docs/process/test-host.md](docs/process/test-host.md).

Use it whenever a change touches beaming, host discovery, diagnostics, host-key
pinning, the upload contract, or iPhone pairing. **Do not invent a host, mock
`ssh`, or ask the owner for a server** — start this one. The one stub is
`apps/desktop/src-tauri/tests/fake_ssh.rs`, which checks which commands the
orchestration sends in CI; it proves nothing about a real host, so it never
stands in for this one.

Two things it is especially good at:

- `npm run testhost` shows every authorized key fingerprint, so "the client
  offered the wrong key" is distinguishable from "the client never connected".
  That distinction is what found the milestone 008 share-extension bug.
- `npm run testhost:logs` prints the fingerprint sshd was offered on a failed
  auth — usually the fastest route to the real cause of a failed beam.

It does not replace a real host for latency, flaky links, or share-extension
memory pressure. Correctness only.

## Repository Rules

- Keep durable decisions in `docs/adr/`.
- After any dependency change (`Cargo.lock`, `package-lock.json`, `Package.resolved`, the font, the icon set), run `npm run notices` and commit the regenerated JSON with it. `npm run check:notices` fails otherwise, and every release and deploy script runs it. Procedure: `docs/process/third-party-notices.md` (ADR 0026).
- Keep live work state in `docs/process/progress.md`, short, with its
  `progress-state` marker current. `npm run check:docs` verifies it.
- Keep handoff state short in `docs/agents/current-handoff.md` — capped at 90 lines by `npm run check:docs`, which the release also runs. Narrative it sheds goes to the end of `docs/agents/handoff-log.md`; a trap that stays true after the work is done goes to `docs/agents/pitfalls.md`.
- Put open product, security, and platform questions in `docs/research/questions.md`.
- Prefer small, reviewable documentation changes.
- Do not store SSH credentials, private keys, tokens, or host-specific secrets in the repo.
- Paddle runs as **two environments from one source** (live and sandbox side by side) — retired by ADR 0031, kept as a record. Before
  touching checkout, the licensing worker, or anything Paddle-related, read
  `apps/license-webhook/README.md` and `apps/web/README.md` (both have a "Two environments"
  section). Never collapse the two paths back into one, and never put a Paddle API key or
  webhook secret in the repo — those are `wrangler secret put` values, per environment.
- Do not reference unrelated previous projects, frameworks, or build histories.
- Do not expand implementation scope without updating the relevant milestone and ADRs.
- Do not hide uncertainty. Record open questions instead of silently choosing defaults for product, security, or platform behavior.

## Current Scope

Milestones 001-005 are complete, and 006 (licensing) and 007 (packaging) are shipping. Hostbeam is live and free — licensing was retired on 2026-11-08 ([ADR 0031](docs/adr/0031-licensing-retired.md)); the licensing code stays in the tree, unwired; the Mac app is signed, notarized, and auto-updates. `docs/process/progress.md` is the current picture — read it rather than this paragraph, which is a summary and will age.

Still out of scope until a milestone explicitly opens it: file browsing (a manual file picker or a remote file browser) and syncing. Hostbeam moves only what you hand it, to the host you choose — the screenshot on your clipboard, or any file you hand over (since [next.md](docs/process/next.md) § 10's first step: the Mac from 0.1.30, the iPhone from its first release). It is not a file manager.

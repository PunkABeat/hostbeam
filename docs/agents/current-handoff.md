# Current Handoff

What the next person needs before touching the code. **Short on purpose, and
checked for it** (`npm run check:docs`) — this file grew to 492 lines of
narrative once, which is how it stopped being read. History lives in
[handoff-log.md](handoff-log.md); nothing was thrown away. **Where things stand
— versions, App Review, the Raycast PR — lives only in progress.md's Now
table**: copies of it here went stale, so this file points there instead.

## Read these first

| | |
|---|---|
| What is true now, and what is blocked | [docs/process/progress.md](../process/progress.md) |
| Quality gates to run before stopping | [progress.md § Quality gates](../process/progress.md) |
| Repo layout and house rules | [AGENTS.md](../../AGENTS.md) |
| What happened before | [handoff-log.md](handoff-log.md) |
| Why something is the way it is | [docs/adr/](../adr/) |
| Per-area state and post-mortems | [docs/process/milestones/](../process/milestones/) |
| What is left before the App Store | [ios-submission-checklist.md](../process/ios-submission-checklist.md) |
| Traps that have already cost a day | [pitfalls.md](pitfalls.md) |

Hostbeam is live and free: licensing was retired 2026-11-08 ([ADR 0031](../adr/0031-licensing-retired.md)),
the source is being published, and the Paddle, Keygen and Resend accounts stay
open for the owner's next projects, the worker idle. The Mac ships continuously
through its own updater; the iPhone app goes through App Review in batches.

## Where to pick up

**Reviewed 2026-09-23** — [desktop-code-review-2026-09.md](../process/desktop-code-review-2026-09.md).
Both code reviews are done (desktop bar its Windows/Linux Phase 3, parked as [milestone 009](../process/milestones/009-windows-and-linux.md)). The licence worker requiring a signed App Store transaction is live, and the Mac uploads in one sftp session under temporary names (both 2026-09-25). The iPhone review's status lists the next iPhone release notes.

**CI minutes are scarce** (a job red in five seconds ran out of them — [pitfalls.md](pitfalls.md);
the allowance reset 2026-10-01). Since 2026-09-26 the macOS gates
(`desktop.yml`, `iphone.yml`) run only by hand and before a release; a push
gets only the Linux checks, so run the gates locally. Making the macOS jobs
cheap enough for every push is planned, not started: [ci.md](../process/ci.md).

**[next.md](../process/next.md) § 10 is the plan** (agreed 2026-09-26). Its
first step, **any file you hand over, shipped in Mac 0.1.30** with Show in
Finder from Recent, and the site copy went live with it: any file up to 100 MB,
a held "send anyway?" for secrets, Clean up by the 13-digit stamp, and a Finder
copy beams the file, never its icon. The iPhone half shipped in build 9; its
share sheet was tried under App Store signing on build 11. **10a, Ctrl+V
works in remote agents: the spike passed 2026-09-27** ([scripts/spikes/ctrl-v/](../../scripts/spikes/ctrl-v/README.md);
the test host now carries Claude Code, tmux and mosh). **Then (2026-09-28):
agents turn a pasted image path into the image, nothing on the host — so a
beam now copies just the path** (ADR 0006's amendment) — shipped in Mac
0.1.32 and the site, iPhone build 10 on, and Raycast's store PR. The helper
is parked. **10b, open the agent's dev server:
shipped in Mac 0.1.33, 2026-09-28** ([ADR 0029](../adr/0029-open-the-agents-dev-server.md));
hot reload through the relay is still untried with a real dev server. 10c is decided (free). § 8 (let the agent wait for a beam) stays deferred; § 3's other
half, files coming back, waits for beam back's checks; § 5's decision remains.

**Pricing**: [ADR 0028](../adr/0028-free-to-use-with-a-reminder.md) (2026-09-27, Mac 0.1.31: free with a
reminder), then [ADR 0031](../adr/0031-licensing-retired.md) (2026-11-08): free, no reminder,
nothing sold; `licensing::LICENSING_RETIRED` is the switch, the code stays.

**Direction, researched 2026-09-26** — the upload is now a commodity on every
platform (Termius, cmux, Herdr, FainLane, the Codex and Claude apps). The owner
endorsed the proposals in [differentiation-brainstorm.md](../research/differentiation-brainstorm.md)
as a set; none is opened, and its § 6 lists the decisions. The cheapest one
changes § 8: Claude Code hooks can now wake an idle session when a beam lands.
An agent-first variant, with no restrictions assumed, is in
[agent-first-brainstorm.md](../research/agent-first-brainstorm.md); ideas past
the screenshot in [beyond-screenshots-brainstorm.md](../research/beyond-screenshots-brainstorm.md);
and the two-way clipboard, explored the same day, in
[two-way-clipboard.md](../research/two-way-clipboard.md) — Hostbeam's core
rather than a product of its own.

**Launch and being found (2026-10-03)**: the plan is
[launch-day.md](../process/launch-day.md) — message decided, boards chosen,
waiting for Apple. Guides, Search Console, Bing, IndexNow and the Cloudflare
zone's settings: `apps/web/README.md`.
Mac downloads and copies running are counted since 2026-10-06: `npm run downloads` ([ADR 0030](../adr/0030-count-downloads-at-the-edge.md)); `npm run stats` adds Paddle sales and the App Store.
New third-party accounts are PunkABeat's (admin@punkabeat.com), made by the owner.

**Releasing the Mac**: `npm run release:cut`, `scripts/release.sh`, then tag
and push that tag alone; approve 1Password within a minute. **The dmg is
`scripts/make-dmg.sh`'s, not Tauri's** ([releasing-macos.md](../process/releasing-macos.md)).
Every clipboard use goes through `clipboard.rs` — one lock, AppKit exceptions
caught — after 0.1.27 crashed reading it from two threads (stress test: `cargo
test --lib clipboard -- --ignored`).

**Raycast**: working on it, publishing, and the store review —
[raycast-extension.md](../process/raycast-extension.md). **iOS**: 1.0 is on the App
Store since 2026-10-09; `asc versions list --app 6804413107` shows the state. A
1.0.1 goes through review again, with the review host back up
([checklist](../process/ios-submission-checklist.md) § The demo-host problem).

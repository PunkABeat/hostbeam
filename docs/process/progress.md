<!-- progress-state: desktop=0.1.35 ios=1.0 -->

# Progress

Where the project actually stands. **Short on purpose**: this file went stale
once because it had grown to 288 lines of history, and a document that is
expensive to update does not get updated. History belongs in the milestone
docs, the ADRs, and `docs/agents/handoff-log.md`; this file says what is true
now and points at the detail.

`npm run check:docs` fails if the versions in the marker above have drifted from
the source of truth, and the release script runs it — so a release cannot ship
while this file describes an older one.

## Now

**Hostbeam is live, and free.** Licensing was retired on 2026-11-08
([ADR 0031](../adr/0031-licensing-retired.md)): nothing is sold, the next Mac
release drops the reminder (`licensing::LICENSING_RETIRED`), the site says so,
and the Paddle, Keygen and Resend accounts stay open for the owner's next
projects, the licence worker deployed and idle. The source is being published
(the root README, "Why this is public"). The Mac app auto-updates.

| | Version | State |
|---|---|---|
| Mac | 0.1.35 | Shipped — signed, notarized, on `download.hostbeam.app` and Homebrew (`brew install --cask punkabeat/tap/hostbeam`, since 2026-09-05) |
| iPhone | 1.0 (build 12) | **On the App Store since 2026-10-09** ([apps.apple.com/app/hostbeam/id6804413107](https://apps.apple.com/app/hostbeam/id6804413107)). Approved 2026-10-08 16:06 UTC, nine days after the resubmission that answered Guideline 2.1's request for information; released by hand 2026-10-09 00:40 UTC (`asc versions release`), and the review host destroyed the same morning. Free, no in-app purchase ([ADR 0028](../adr/0028-free-to-use-with-a-reminder.md)); 174 of 175 territories, France held back for ANSSI, China mainland off ([checklist § 0](ios-submission-checklist.md)). The site went to the App Store with it ([checklist § 3b](ios-submission-checklist.md)) |
| Raycast extension | — | **Merged and published to the Raycast Store 2026-10-07 (12:13 UTC)**: [raycast.com/PunkABeat/hostbeam](https://raycast.com/PunkABeat/hostbeam) answers 200; PR [#31483](https://github.com/raycast/extensions/pull/31483), merged by raycastbot. Raycast's bot could not find a Raycast account for the GitHub user @PunkABeat, so the credits go unclaimed until the account is linked ([raycast.com/settings/account](https://www.raycast.com/settings/account)). Later changes go in as new PRs to `raycast/extensions` — [raycast-extension.md § Store review](raycast-extension.md#store-review) |
| MCP server | 0.1.4 | Published on npm as `@hostbeam/mcp` (0.1.4, 2026-10-09: the README names the iPhone, the homepage is /agents) and in the MCP registry; needs nothing ([ADR 0021](../adr/0021-publish-the-mcp-server.md)) |
| Launch | — | **Now, with what is ready** (owner, 2026-10-09, the morning after approval: "we are launching now with what we've got"), in place of the one-to-two-week wait [launch-day.md](launch-day.md) planned. Message, boards and posts: [launch-day.md](launch-day.md), [launch-posts.md](../marketing/launch-posts.md). **Being found, started 2026-10-03:** two guides at `/guides`, Google Search Console and Bing Webmaster Tools owned by admin@punkabeat.com with the sitemap in both, IndexNow, and a before-launch record of what AI assistants answer, in which none names Hostbeam ([ai-answers](../research/ai-answers/README.md)) |

This table is the one place that says where each part stands. Other documents
link here rather than repeat it — the handoff still put the Mac at 0.1.30 three
releases later — and `npm run check:docs` fails on a stated version that is
not the repo's or a deadline ("until …", "by …") that has passed.

The iPhone app is on its own version lane (independent cadence — the Mac ships
continuously through its updater, the phone in batches through App Review).

**Shipped in 0.1.30 (2026-09-27):** any file you hand over ([next.md](next.md)
§ 10's first step) and Show in Finder from Recent; the site copy went live with
it. The iPhone half came in build 8.

**Shipped in 0.1.31 (2026-09-27): free to use, with a reminder**
([ADR 0028](../adr/0028-free-to-use-with-a-reminder.md), next.md § 10c). No
daily cap on either app; the Mac asks after every 10th beam once the first is a
week old; a license covers every Hostbeam 1 update, with no year to run out.
The site deployed with the release, the key email's worker (live and
sandbox) the same day, and the iPhone half came in build 9.

**Shipped in 0.1.32 (2026-09-28): a beam copies just the path**, which Claude
Code, Codex, Gemini CLI and OpenCode attach as the picture itself (next.md
§ 10a, ADR 0006's amendment). The site deployed with it; the iPhone half came
in build 10, and Raycast's in its store PR (the Raycast row above).

**Shipped in 0.1.33 (2026-09-28): open the agent's dev server on the Mac**
([ADR 0029](../adr/0029-open-the-agents-dev-server.md), next.md § 10b). The
popover lists the SSH user's listening ports when it opens; Open forwards one
to `127.0.0.1` and holds a connection until Stop; nothing installed on the host.

## Milestones

| | | |
|---|---|---|
| 001 | Documentation foundation | Done |
| 002 | Flutter scaffold, first proof | Done (superseded by ADR 0010) |
| 003 | First usable screenshot bridge | Done |
| 004 | Utility shell polish | Done |
| 005 | UI/UX maturation | Done — superseded by the ADR 0011 UI detach |
| 006 | Licensing and the free tier | Live; the cap became a reminder in 0.1.31 (ADR 0028); the iOS IAP is dropped |
| 007 | Packaging and distribution | Shipping releases; the iPhone on the App Store since 2026-10-09 |
| 008 | iOS companion | Released: iPhone 1.0 on the App Store, 2026-10-09 |
| 009 | Windows and Linux | Not opened; the decisions it needs are listed in it |

## What is actually blocking

Nothing is blocked on code. What remains needs Apple, or real traffic:

- **App Store Connect → Business for PunkABeat**, now waiting on **a D&B
  address change** (filed 2026-09-18; D&B quotes 7–14 business days). Apple updates the legal entity address only after
  that, and the Paid Apps Agreement, tax and banking wait behind it — none of
  which a free app with no in-app purchase needs (ADR 0028): the iPhone shipped
  on 2026-10-09 without them. The migration itself kept the Team ID and
  certificates, so milestone 008's `APPSTORE_*` and access-group warnings never
  applied; the local-law paperwork is done; the EU's trader address is published (DSA Active
  since 2026-09-28).
- **Per-purchase cover for App Store sales** — moot while the iPhone sells
  nothing (ADR 0028); kept for a paid iPhone layer later. The daily job now checks that the
  Apple credentials still authenticate, which is the failure an account move
  causes — but Apple has no "what did I sell" endpoint and the iOS mint is
  client-driven, so a single purchase that never reached us still leaves no
  trace to reconcile against. Needs a per-exchange alert or Apple's notification
  history.
- A native translation review of the machine-quality strings (zh, ja, ko).

## Testing

`npm run testhost:up` gives you a real SSH server locally — no remote box, no
credentials, no network. Use it for anything touching beaming, host discovery,
diagnostics, host-key pinning, or iPhone pairing. See
[test-host.md](test-host.md).

## Quality gates

From the repo root, before handoff:

```sh
npm run typecheck && npm run lint && npm test && npm run build
npm run check:docs                                   # this file is current
npm run check:notices                                # in-app open-source notices match the lockfiles
cd apps/desktop/src-tauri && cargo fmt --check && cargo clippy --all-targets && cargo test
cd apps/mobile/BeamEngine && swift test              # iOS engine
```

## Where the detail lives

- **What to build next** — [next.md](next.md): reviewed candidates in
  implementation order, each marked done, ruled out or open, and the ideas
  deliberately turned down.
- **Per-milestone state and post-mortems** — `docs/process/milestones/`.
  Milestone 008 carries the iOS device findings, including the share-extension
  key bug and the 2026-08-30 polish batch.
- **Durable decisions** — `docs/adr/`.
- **Handoff state** — `docs/agents/current-handoff.md`, capped at 90 lines by
  `npm run check:docs`; the narrative it sheds lands in `handoff-log.md`.
- **Open questions** — `docs/research/questions.md`.
- **CI** — [ci.md](ci.md): Linux checks on every push; the macOS gates by hand
  and before a release, and the plan to make them cheap enough for every push.
- **Releasing** — `releasing-macos.md`, `packaging-checklist.md`,
  `release-smoke-test.md`.
- **Downloads** — `npm run downloads`: Mac downloads and copies running
  (from the daily update check), counted since 2026-10-06, bots kept separate ([ADR 0030](../adr/0030-count-downloads-at-the-edge.md),
  [apps/download-counter](../../apps/download-counter/README.md)).
  `npm run stats` adds Paddle sales and the iPhone app's App Store downloads
  and ratings (keys from 1Password; the App Store part needs its own
  Sales-role key, "App Store Connect API (Sales)" — the release key is refused).

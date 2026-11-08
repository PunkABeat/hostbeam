# The Raycast extension

Maintainer notes for `apps/raycast/`. They live here rather than in its README
because that README is the **store page**: Raycast shows it to users, and
`npm run publish` copies the whole folder into `raycast/extensions`, so anything
written there for us would ship to them.

Origin and scope: [next.md § 9](next.md); the links it drives:
[ADR 0025](../adr/0025-a-url-can-start-a-beam.md).

## Working on it

```sh
cd apps/raycast
npm install
npm run dev        # ray develop — live-loads into Raycast
npm run lint       # ray lint — also checks `author` against Raycast's API
npm run build      # ray build — the distribution build
```

It is deliberately **not** an npm workspace (`"!apps/raycast"` in the root
`package.json`): the Raycast toolchain is large and irrelevant to the app and
the site, and `ray` expects a standalone package.

Each link-driven command checks the app before firing — installed, new enough
(`NEEDS` in `src/permission.tsx`), and the *Let other apps control Hostbeam*
switch not turned off — and says which, with the fix attached, rather than
reporting a beam that never happened. A missing `allowUrlBeam` key counts as
allowed, matching the app since 0.1.26.

## Before publishing

Checked against Raycast's
[prepare an extension for store](https://developers.raycast.com/basics/prepare-an-extension-for-store):

| | State |
| --- | --- |
| `author` = a Raycast username | Done — `PunkABeat` (account created 2026-09-24; the API's canonical casing). `ray lint` passes. |
| `platforms` | `["macOS"]` — without it the store assumes Windows too, and nothing here works there |
| `license: MIT`, categories, keywords | Done |
| 512×512 PNG icon, legible in light *and* dark | Done — the app's own icon, a white mark on an opaque blue field |
| `CHANGELOG.md` with `{PR_MERGE_DATE}` | Done — Raycast replaces the placeholder with the merge date |
| README | Done — written for users, since the extension needs the Mac app first (Raycast asks for one whenever setup is needed). US English: Raycast's rule. |
| Screenshots: 2000×1250 PNG, 16:10, in `metadata/` | Done 2026-09-24 — five, taken against demo data (below). |
| A distribution build | `npm run build` — passes as of 2026-09-24; run it again right before submitting |

## Retaking the screenshots

What the 2026-09-24 set needed, in the order it bit:

- **Demo data, not yours.** A real config shows real host names and real
  screenshots, and Raycast rejects sensitive data. For the session only, point
  `CONFIG_PATH` in `src/hostbeam.ts` at a hand-written config — made-up hosts,
  `recent` rows whose `thumb` paths are generated images — behind
  `environment.isDevelopment`, and revert it before committing. Rows' `at`
  values are absolute, so shift them to now just before capturing.
- **A 2× display.** Raycast's window is a fixed 750×474 pt; on a 1× screen
  Window Capture warns that the resolution is too low and saves 1000×625. The
  built-in Retina screen and a 4K monitor at "looks like 1920×1080" both work.
  Raycast opens on the screen holding the pointer.
- **One background for all of them** (Raycast rejects mixed ones): Window
  Capture's background is set in Raycast → Settings → Advanced. The set uses
  a brand-blue gradient, `Hostbeam Raycast Background.png` (4000×2500) in the
  PunkABeat Hostbeam project folder.
- **In `npm run dev`**, so Window Capture strips the development badges.
  Captures of an extension command land in `metadata/` with "Save to
  Metadata" ticked; a capture of Raycast's root search does not — it goes to
  Raycast's save folder, and is copied in by hand.
- **The root search shot needs fallbacks off.** Typing `hostbeam` also lists
  "Use 'hostbeam' with…" (File Search, Dictionary, a Google Chrome quicklink);
  turn those off from the ⚙ beside that heading while capturing.

The five, in order: Recent Beams; Recent Beams with ⌘K on the `×3` row;
Switch Host; Switch Host with ⌘K on a non-current host; root search for
`hostbeam` showing the app and all four commands.

## How `npm run publish` works

Walked 2026-09-24: submitted as
[raycast/extensions#31483](https://github.com/raycast/extensions/pull/31483),
from the PunkABeat GitHub account.

- **It refuses a dirty git tree — the whole repository's, not this folder's.**
  With someone else's work uncommitted elsewhere in the monorepo, publish from
  a clean worktree of the commit instead: `git worktree add --detach <dir>
  <sha>`, `npm ci` in its `apps/raycast`, publish there, remove the worktree.
- **It signs in to GitHub with a device code**, and waits for a keypress
  (raw-mode stdin) before opening the page, so it needs a real terminal. Under
  a borrowed pty with no size its progress UI redraws forever — 375MB of output
  in a minute; give the pty a size (`stty rows 40 cols 100`) if it has to run
  unattended. **Approve as the PunkABeat GitHub account**: the fork and the
  pull request belong to whichever account approves. The grant is GitHub's
  `repo` scope, saved as `GithubAccessToken` in `~/.config/raycast/config.json`
  for later publishes — revoke it under PunkABeat's GitHub → Settings →
  Applications. `GITHUB_ACCESS_TOKEN` in the environment overrides it.
- **With that grant saved, it runs unattended** (2026-10-02): no sign-in, no
  keypress. Two things are still needed. `npx` asks before downloading
  `@raycast/api@latest`, so set `npm_config_yes=true`. And the progress UI
  needs a sized pty: `script -q <log> /usr/bin/env npm_config_yes=true zsh -c
  'stty rows 40 cols 100; npm run publish' </dev/null`. Before pushing,
  check whose grant it is: GitHub's `/user` with that token should answer
  `PunkABeat`. `@raycast/api` 2.6.1 wants Node ≥ 22.22.2 (on 22.13 it warned
  but still published); this Mac's `fnm` default is 22.23.2 since 2026-10-02.
- It forks `raycast/extensions`, copies this folder in — everything except
  `.git`, `.github`, `node_modules` and `raycast-env.d.ts` — pushes
  `ext/hostbeam`, and opens the pull request **as a draft**. Raycast does not
  review a draft: fill in the description and mark it *Ready for review*.
  Publishing again pushes to the same branch and updates the same PR.
- **Publishing again first merges upstream into the PR branch, and GitHub can
  refuse it**: "refusing to allow an OAuth App to create or update workflow
  `.github/workflows/…` without `workflow` scope" (2026-09-28, 422). Raycast
  changed a workflow upstream since `ext/hostbeam` was made (146 commits
  behind that day), and the CLI's grant cannot write one. Nothing is sent. The
  fork's `main` being up to date does not help — it is the PR branch. Fix: open
  `github.com/PunkABeat/raycast-extensions/tree/ext/hostbeam` as PunkABeat,
  **Sync fork → Update branch**, then publish again. That merge then reads as
  "some edits were made on your PR": run `npx @raycast/api@latest
  pull-contributions` (it found none — the merge does not touch
  `extensions/hostbeam/`) and publish once more. Distance alone does not
  trigger it: on 2026-10-06, 321 commits behind, publish went straight through. Publishing also refuses a
  worktree with any uncommitted change, anywhere in the monorepo.
- Checks run on the PR (changelog, metadata images, a build), plus AI
  reviews. Greptile applies the repository's own rules — it caught an
  unused dependency, the ESLint config not using `defineConfig`, and a
  switch-then-beam race. Cursor Bugbot joined on 2026-10-02 (below). Review
  itself was quoted at up to 15 business days.

Publishing also leaves a git tag, `__raycast_latest_publish_ext/hostbeam__`,
marking the commit it sent. The CLI reads it here to know what it last
published, and it stays on this Mac. Git will not move a tag GitHub already
has, so pushing it with `--tags` failed on every publish after the first.
That is why releases push only their own `v<version>` tag, and GitHub's stale
copy was deleted on 2026-10-02.

Later versions: add a `CHANGELOG.md` entry headed `{PR_MERGE_DATE}` and publish
again. If anyone changes the extension inside `raycast/extensions`,
`ray pull-contributions` brings that back here.

## Store review

**2026-10-07: merged and published.** raycastbot merged PR #31483 at 12:13 UTC
and the Store page is live at <https://raycast.com/PunkABeat/hostbeam>. Raycast's
bot could not find a Raycast account for the GitHub user @PunkABeat, so the
credits it offered wait until the owner links the two at
[raycast.com/settings/account](https://www.raycast.com/settings/account). From
here an update is a new PR to `raycast/extensions`.

**2026-10-06: cleared as its own listing, and the review's fixes are
published.** The reviewer withdrew the duplicate question below —
"Hostbeam is a separate Mac app companion (`hostbeam://`), so it should ship
as its own Store listing" — and reviewed the code:

- **Should fix: no `navigationTitle` on a command's root**
  ([Raycast's rule](https://developers.raycast.com/basics/prepare-an-extension-for-store#navigation-title)).
  Switch Host had swapped its title for "Hostbeam is not accepting commands";
  that now sits in the list's section subtitle, shown only then, so the
  screenshots are unchanged.
- **Suggested: the description opens with "Control the Hostbeam Mac app — …"**,
  the rewording the owner had offered, so it no longer reads like SSH Image
  Drop's pitch.
- **Suggested: Recent Beams' Open Hostbeam ran `open("", BUNDLE_ID)`**, an
  empty target. It now runs `open -b` through `openHostbeam()` in
  `hostbeam.ts`, shared with Beam Selected Files, and closes Raycast's window
  first: the popover closes when it loses focus, and an open Raycast takes it
  straight back.

Fixed in `735dafa` and `000de46`, published to the PR as `4c11160` and
`27489b7`. Checked by hand in `ray develop`: the section subtitle shows with
the switch off, and Open Hostbeam shows the popover — on the laptop screen
whichever screen you are on, which is the app's, not the extension's
([questions.md](../research/questions.md), "Two desktop bugs"). The owner
replied to the reviewer and marked it *Ready for review* the same day; it is
back with Raycast.

Greptile's two comments that day:

- **P1, withdrawn:** Beam Clipboard needs 0.1.23 though `beam` works on
  0.1.22. Deliberate (`4bbea45` above); the owner replied, and Greptile
  withdrew it.
- **P2, fixed:** with the app removed but its config left behind (Trash, or
  `brew uninstall` without `--zap`), Open Hostbeam and Beam Selected Files
  closed Raycast and failed with nothing on screen. `openHostbeam()` now
  answers whether it opened anything, and both say "Hostbeam is not installed
  on this Mac". Fixed in `b5aaa6e`, published as `ac7666c`.
- **P2 on that fix, fixed:** it called every failed `open` "not installed",
  including a Finder file moved before the hand-over. `openHostbeam()` now
  returns what to say: not installed only when `installedVersion()` finds no
  app, "<name> is no longer there" for a file that has gone, else `open`'s own
  line. Fixed in `310d103`, published as `6391502`. From here, only the
  reviewer's asks get a push: every push gets a fresh bot pass.

**2026-10-02: flagged as a possible duplicate.** The reviewer pointed at
[SSH Image Drop](https://www.raycast.com/wjsong/ssh-image-drop), already in the
Store, and an open draft, Relay (#29763) — Raycast's guidelines reject "an
extension on our Store providing very similar value" — asked for the commands
to go into SSH Image Drop, and converted the PR to draft. The owner replied
that SSH Image Drop is its own SSH client while this extension never connects
to anything: all four commands drive the Hostbeam app and do nothing without
it, the same reason Things, Todoist and TickTick each have their own extension.

- **Cursor Bugbot, the same day, found a real bug:** the "newer Hostbeam is
  needed" toast's button opened `hostbeam://preferences`, which only exists
  from 0.1.23, so every app old enough to see it ignored the click. Fixed in
  `4bbea45`: the button downloads the latest dmg, and Beam Clipboard now needs
  0.1.23 too, because its switch toast had the same hole on 0.1.22. Published
  to the PR as `8d5f863`.
- **Raycast's stale bot does not skip drafts.** After 25 days with no activity
  it labels a PR `status: stalled`, and 7 days later it closes it. Any comment
  or push resets the count. With the last activity on 2026-10-06, it would be
  labelled around 2026-10-31 and closed around 2026-11-07.

## Where this lives

**Here, in the monorepo**, and `npm run publish` sends a copy to
`raycast/extensions` where the store builds from. No mirror repository, unlike
`apps/agent`: npm shows a package's own repository prominently, so the MCP
server earned one, while a store listing points at Raycast's monorepo anyway.
Worth revisiting if people start filing issues against the extension — a
public home for them would be the reason, not publishing.

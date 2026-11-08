# Releasing the macOS app

Three steps, one of which is a habit rather than a step. Verified end to end on
v0.1.6 (2026-08-28), the first release through the 1Password wrapper, and on
every release since — most recently 0.1.10 (2026-08-31).

## Releasing

Releases here are driven through a conversation with the coding agent; the
owner's only manual step is approving the 1Password prompt. The steps are the
same either way.

**1. Notes are already written.** Every user-visible change lands with a bullet
under `## Unreleased` in `CHANGELOG.md`, as the work happens. This is the part
that has to be a habit rather than a step: notes reconstructed from `git log`
at release time are how they end up subtly wrong, and users read them before
choosing to install.

**2. Cut it.**

```sh
npm run release:cut            # next patch, e.g. 0.1.10 -> 0.1.11
npm run release:cut 0.2.0      # or an explicit version
```

That renames `## Unreleased` to `## <version> — <date>` and bumps all four
version files (`tauri.conf.json`, `Cargo.toml`, `Cargo.lock`, `package.json`)
plus `progress.md`. It refuses to cut an empty section, and refuses to go
backwards — the updater serves whatever `latest.json` names, so a lower version
strands everyone on it.

Commit the result: `git commit -am "chore(release): <version>"` — or, with
another session's work uncommitted in the tree, `git add` the files the cut
changed, by name.

Then push `main` and run the Mac's CI on it: `gh workflow run desktop.yml
--ref main`, then `gh run watch <id> --exit-status` ([ci.md](ci.md) has the
id lookup). It runs the gates on a clean Mac, which nothing else here does,
because pushes no longer trigger it (2026-09-26). Ship on green.
**`scripts/release.sh` checks this itself** (`scripts/check-ci-passed.sh`): it
refuses unless `desktop.yml` passed on the exact commit being released, and
refuses uncommitted changes under `apps/desktop`, which CI cannot have tested.
Written down was not enough: the runs on the 0.1.32 and 0.1.33 commits had
failed in eight seconds and both shipped. If it fails in seconds with no step
run, the month's Actions minutes are spent: run the gates locally
([progress.md § Quality gates](progress.md)), then release with
`SKIP_MAC_CI="gates run locally: <what you ran>" scripts/release.sh`.

If clipboard code changed since the last release, run its stress test before
shipping: `cd apps/desktop/src-tauri && cargo test --lib clipboard -- --ignored`
(about 15 seconds; it overwrites the clipboard). It crashed on every run before
the 0.1.28 lock, so a failure there is a real regression, not flakiness.

**3. Ship it.**

```sh
scripts/release.sh
```

Version-sync and doc checks → republish guard → universal build → sign →
notarize the `.app` *and* the dmg → Gatekeeper verify → `latest.json` → R2
upload → Homebrew tap bump → deploy the site so `/changelog` matches. Expect one 1Password
authorization prompt; the two secrets are resolved at runtime and never touch
disk, the repo, or shell history. **Approve that prompt promptly** — it gives up
after about a minute, and the run fails with "authorization timeout".

**The dmg is built by `scripts/make-dmg.sh`, not by Tauri** (2026-09-19).
Tauri's dmg bundler arranges the installer window by sending Apple events to
Finder, and macOS started refusing them — from a terminal that holds the
Automation permission, and from an agent's shell, which cannot be prompted for
it. 0.1.21 stopped dead after the app was signed, notarized and stapled. That
window is a `.DS_Store` inside the image, so the one that shipped with 0.1.20
lives in the repo (`apps/desktop/src-tauri/dmg/window-layout.dsstore`) and the
script assembles the image around it. `dmg` is off Tauri's bundle targets, so
no plain `tauri build` can reach the Finder path again. To change how the
window looks: arrange it once in Finder on a mounted read-write image, copy
that volume's `.DS_Store` over the file in the repo.

**4. Tag it.** `git tag v<version> && git push origin main v<version>`. Name
the tag rather than `--tags`: the Raycast publish tag must stay local
([raycast-extension.md](raycast-extension.md)).

### From a clean worktree

The release deploys the site from the working tree, so with another session's
edits uncommitted there, release from a worktree of the release commit instead
(0.1.29 did, 2026-09-26). A fresh checkout lacks four ignored things the
pre-checks need. Prepare them first, because each missing one fails the run
only after the 1Password prompt:

```sh
git worktree add --detach <dir> <release commit>
cp apps/web/.env apps/web/.env.production <dir>/apps/web/
cp -c -R apps/desktop/src-tauri/target <dir>/apps/desktop/src-tauri/  # APFS clone: warm cache
cd <dir> && npm ci
(cd apps/mobile && xcodegen generate)                  # the version check reads the plists
(cd apps/mobile/BeamEngine && swift package resolve)   # the notices check reads the checkouts
node scripts/check-version-sync.mjs && node scripts/third-party-notices.mjs --check
```

Then `scripts/release.sh` from `<dir>`, tag, and `git worktree remove --force <dir>`.

## Never edit a shipped entry

A released `CHANGELOG.md` entry **is** the release notes users already received:
the Mac updater serves them from `latest.json` before anyone agrees to install,
and the site renders them. Editing one rewrites something people have read.

Adding a note to the newest entry after it shipped is the natural mistake,
because that entry is at the top of the file and looks like the current one. It
has happened twice — 0.1.7, and 0.1.11 an hour after release. The rule was
written down after the first and did not survive the second.

`npm run release:cut` now checks it: before cutting, it fetches `latest.json`
and refuses if the entry for the published version no longer matches what was
served. New notes belong under `## Unreleased`, which is what it will tell you.

The check covers the newest released entry, which is where the mistake actually
happens; older entries are not compared.

## When to release, and when to wait

Release **immediately** for anything that costs a user money, loses data,
blocks a purchase or a licence activation, or has no workaround — the whole
checkout → webhook → Keygen → key email chain, and anything security-related.
Every hour of delay there is a buyer who hits it.

**Bundle** polish, layout, and copy. An update announces itself as one
dismissible line in the popover rather than a modal, so shipping often is
cheap for users — but a release is still an interruption, and a version number
for its own sake is not worth one. Notes accumulate safely under `##
Unreleased` in the meantime.

## Where the pieces live

| Piece | Location |
| --- | --- |
| Non-secret env + `op://` refs | `scripts/release.env.example` (the real `release.env` is not in this public repository) |
| Notarization app-specific password | 1Password → Private → "<the Apple account item>" → field "App-specific password for notarization" |
| Updater key password | 1Password → Private → "Hostbeam - Tauri updater signing key" → field `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` |
| Updater private key (the one unrecoverable secret) | `~/.tauri/hostbeam.key` (backed up in the same 1Password item) |
| Signing certificate | login Keychain (`Developer ID Application`, team U3C6XC6LHJ) |
| R2 auth | wrangler's cached login (same account as the worker) |
| Homebrew cask | `github.com/PunkABeat/homebrew-tap`, `Casks/hostbeam.rb`; only `version` and `sha256` change per release, rewritten by `scripts/homebrew-bump.sh` |

## Prerequisites (already true on the owner's machine)

- 1Password CLI (`op`) with desktop-app integration unlocked.
- Rust targets, on the toolchain `apps/desktop/src-tauri/rust-toolchain.toml`
  pins: `rustup target add aarch64-apple-darwin x86_64-apple-darwin --toolchain 1.93.0`.
  A new pin installs a bare toolchain; 0.1.27's first build stopped on the
  missing arm64 target.
- wrangler authenticated against the Hostbeam Cloudflare account.

## After it finishes

- `https://download.hostbeam.app/Hostbeam.dmg` serves the new version;
  `latest.json` offers it to installed apps (daily background check, or
  About → Check for updates immediately). Macs with "Install updates
  automatically" on install it without asking and relaunch once idle
  (ADR 0022). It carries the newest entry as
  `notes` and the newest ten as `history`, so the app can list everything
  since the version it is running.
- `brew install --cask punkabeat/tap/hostbeam` installs it too: the bump
  step pushed the version and checksum to the tap, and `brew update` picks
  that up. The cask is `auto_updates`, so brew users get new versions from
  the app itself, not from `brew upgrade` (unless `--greedy`).
- For a deeper pass on a fresh machine, `release-smoke-test.md` is the
  full checklist.

## If it breaks

- **"missing env" / op resolution error** — an item or field in the table
  above was renamed; fix the `op://` ref in your `scripts/release.env`.
- **"already published"** — the version wasn't bumped (or was released
  before). Bump; never overwrite a published version, it breaks the updater.
- **Notarization rejected** — the app-specific password may have been
  revoked (appleid.apple.com → Sign-In and Security → App-Specific
  Passwords); generate a new one and update the 1Password field, not the
  env file.
- **"Homebrew tap bump FAILED"** — the release itself is done; rerun the
  printed `scripts/homebrew-bump.sh <version> <dmg>` line. It refuses to
  point the cask at a DMG that is not served at the versioned URL, or to
  move the version backwards, so a failure here is never a wrong cask.

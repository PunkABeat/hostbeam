# CI

What runs on GitHub Actions, what it costs, why the macOS half runs only by
hand, and the plan for putting it back on every push.

## What runs

| Workflow | Runner | When | What |
|---|---|---|---|
| `ci.yml` | Linux | every push to `main`, every PR | `npm run check:docs`, the script tests, `cargo deny` |
| `desktop.yml` | macOS | by hand | the frontend gates, the Rust gates, `npm run check:notices` |
| `iphone.yml` | macOS | by hand | swift-format, the engine tests, every target built, the app tests on a simulator, the strings check |

Run a macOS workflow on what is pushed to `main`:

```sh
gh workflow run desktop.yml --ref main       # or iphone.yml
gh run list --workflow desktop.yml --limit 1 # the run's id
gh run watch <id> --exit-status
```

Run `desktop.yml` before every Mac release ([releasing-macos.md](releasing-macos.md))
and `iphone.yml` before every App Store build (`scripts/release-ios.sh`). **Both
release scripts enforce it** through `scripts/check-ci-passed.sh`: no passing
run on the exact commit, or uncommitted changes in what that workflow builds,
and they stop with the commands to run. Neither release script runs the tests,
the linters or clippy itself. Between those runs the local gates
([progress.md § Quality gates](progress.md)) are the only check a push gets.
When the minutes are spent (a run red in seconds with no step run), run those
gates and release with `SKIP_MAC_CI="gates run locally: <what you ran>"`.

## Why by hand (2026-09-26)

The repo is private, so every minute comes out of the owner's GitHub account's
2,000 free Actions minutes a month. A macOS minute counts ten, and each job is
rounded up to a whole minute before that. A $0 Actions budget with "stop usage"
means an empty allowance blocks jobs rather than billing them: every job then
fails in five seconds ([pitfalls.md](../agents/pitfalls.md)).

With both macOS jobs on every push, one push cost about 60 minutes, and the
allowance was gone three and a half days after CI was added: 39 pushes, 1,974
minutes, 16 of the runs docs-only. Path filters (commit `c2fe4ee`) would have
cut the same pushes to about 690 minutes, which still left only about 30 code
pushes a month. So the owner made the macOS jobs manual until they are cheaper.

## What a run spends

Medians of eight successful runs, 2026-09-26.

**`desktop`: 86 s, charged 20 minutes.**

- 23 s: runner, Node, Rust 1.93, the Rust cache restored.
- 19 s: `npm ci` and the frontend gates.
- 17 s: the Rust gates with a warm cache. About 3.5 minutes when `Cargo.lock`
  changes and the cache misses.
- 21 s: `swift package resolve` for BeamEngine, only because the notices check
  reads the iPhone's Swift licences.

**`iphone`: 213 s, charged 40 minutes.**

- 72 s: `swift test` compiles SwiftNIO, NIOSSH, swift-crypto and Citadel for
  macOS. The 76 engine tests themselves take 4 s.
- 19 s: `xcodebuild` resolves the same packages again.
- About 50 s: it compiles them again for the simulator, then the app, both
  extensions and the widget.
- About 57 s: it boots the simulator, installs the app and runs the 29 app
  tests. The tests themselves take 2 s.

## Later: cheap enough for every push

Not started. The target is `desktop` under 60 s on macOS (10 minutes) and
`iphone` under 120 s (20). Then restore the push triggers with the path filters
from `c2fe4ee` (`git show c2fe4ee:.github/workflows/desktop.yml`): about 30
minutes a code push instead of 60, and 2 for a docs push.

1. **Desktop: only Rust on macOS.** Move `npm ci`, the frontend gates and
   `npm run check:notices` to a Linux job. The notices script already names
   its cargo targets (`--filter-platform` for both Apple architectures), so
   the host should not change its output. Prove two things in Docker first:
   - `npm ci` on Linux from the lockfile the Mac wrote, then the five frontend
     gates. npm has dropped other platforms' optional native packages from a
     lockfile before (rollup and esbuild were the usual victims).
   - `swift package resolve` for BeamEngine with Ubuntu's Swift, after which
     `npm run check:notices` passes.

   That leaves about 40 s on macOS.
2. **iPhone: build the packages once.** Add BeamEngine's test target to the
   `Hostbeam` scheme's test action in `project.yml` (check that XcodeGen can
   name a local package's test target), and drop the separate `swift test`
   step. The engine tests then run on the simulator, which is closer to what
   ships; `swift test` stays the local command. Start booting the simulator in
   the background at the top of the job (`xcrun simctl boot "$UDID" &`), so the
   boot overlaps the compile. Prove it with the job's `xcodebuild` line on the
   Mac. Expect about 120 s.
3. **Left out on purpose: caching the compiled Swift packages.** It is
   unmeasured. A fresh checkout's timestamps make Xcode rebuild the app's own
   sources anyway, and restoring a large cache on macOS costs time of its own.
   Measure before adding it.

A manual run costs the same minutes as a push run, so try each change with
`gh workflow run` only after proving it locally.

**The alternative that makes all of this moot** is a self-hosted runner on the
owner's Mac. Its minutes do not come out of the 2,000, and GitHub's planned
$0.002-a-minute fee for self-hosted runners is postponed
([GitHub, checked 2026-09-26](https://github.com/resources/insights/2026-pricing-changes-for-github-actions)).
The costs:

- Jobs run on the laptop, only while it is awake, in the development
  environment rather than a clean one.
- The `sudo xcode-select` step has to go.
- The runner is a background service to install and keep running.

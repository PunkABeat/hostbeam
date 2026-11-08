# Third-party notices — keeping them current

Every Hostbeam binary carries an "Open source licenses" screen, and the
website has `/licenses`. The lists are **generated, committed, and checked**
([ADR 0026](../adr/0026-open-source-notices-ship-in-every-app.md)). This page
is the procedure. It is short because the tooling does the work; what is left
is knowing *when* to run it.

## When

Regenerate whenever a change touches what ships:

| You changed | Which list moves |
|---|---|
| `apps/desktop/src-tauri/Cargo.toml` / `Cargo.lock` | Mac |
| `apps/desktop/package.json`, `packages/ui/package.json`, or `package-lock.json` | Mac (and the site, if `@hostbeam/ui` gained a dependency) |
| `apps/mobile/BeamEngine/Package.swift` / `Package.resolved` | iPhone |
| `apps/web/package.json` | Website |
| A font, an icon set, or any other asset copied in by hand | Whichever app got it — and the script's `EXTRAS` table, by hand |

Bumping a version counts. Removing a dependency counts. A transitive change
you did not ask for, pulled in by `cargo update` or `npm install`, counts.

## How

```sh
npm run notices          # regenerate the three JSON files
git add apps/desktop/src/generated apps/mobile/App/ThirdPartyNotices.json apps/web/src/generated
```

Commit the regenerated JSON **in the same commit** as the lockfile change, so
the diff shows the two together and a reviewer never has to wonder whether the
notice was forgotten.

`npm run check:notices` tells you whether anything is stale without writing.
It regenerates in memory and compares.

## What stops the script, and what to do

- **"no preferred licence in …"** — a package arrived under a licence family
  the script does not know. Read the licence. If it is permissive, add its id
  to `PREFERENCE` and drop the canonical text into
  `scripts/third-party-notices/texts/<ID>.txt` from
  <https://github.com/spdx/license-list-data/tree/main/text>. If it is
  copyleft or unclear, do not add it — record the question in
  `docs/research/questions.md` and find another package. This stop is the
  point of the check.
- **"no licence field"** — a crate's manifest has no `license`. Read its
  README or repository, then add it to `LICENSE_OVERRIDES` with a comment
  saying where you read it.
- **"not checked out"** or **"checkout is at …"** — BeamEngine's sources are
  missing or behind `Package.resolved`. Run
  `cd apps/mobile/BeamEngine && swift package resolve` and try again.
- **"licence text not recognised"** (Swift) — a new Swift package under
  something other than MIT or Apache-2.0. Teach `swiftPackages()` to
  recognise it, the same way it recognises those two.

## Where it is enforced

The check runs in every path that ships something, so a stale list cannot
leave the machine:

- `scripts/release-macos.sh`, before the build.
- `scripts/release-ios.sh archive`, before the archive.
- `npm run deploy:web` (`apps/web/package.json`), before the build.
- `npm run check:notices`, in the quality gates in
  [progress.md](progress.md).

## What is deliberately not automated

Nothing regenerates on its own — no build step, no git hook. A licence the
script has never seen should be a decision made by a person reading it, not a
line written into a JSON file while nobody was looking. The check is the
backstop; the habit above is the process.

# ADR 0026: Open-Source Notices Ship in Every App, Generated

Status: Accepted.

Date: 2026-09-22.

Relates to: ADR 0013 (the website), ADR 0016 (the iPhone app), milestone 007
(packaging) and the iOS submission checklist.

## Context

Hostbeam is a thin product on a thick stack of open source: 274 Rust crates
linked under Tauri on the Mac, SwiftNIO, swift-crypto and Citadel on the iPhone,
React and a handful of runtime packages in both, Astro on the site, plus the
Geist typeface and Lucide's icon paths, which no package manager tracks.

Nearly all of it is MIT or Apache-2.0, and both licences say the same thing:
the copyright notice and the licence text travel with any binary that contains
the code. That is an obligation on the binary, not on the website, and until
now no Hostbeam binary carried it. The iPhone app noted the font (OFL wants
that) and nothing else; the Mac app noted nothing.

The question that prompted this — does an acknowledgements screen help App
Review — has a short answer: no. Apple does not check for one, and the
guidelines do not ask for one. The Developer Program License Agreement makes
the developer responsible for third-party licence compliance, which is a
contract term, not a review step. So the screen is owed regardless, and it is
not a lever on the review.

## Decision

**Every app has an "Open source licenses" screen, and its contents are
generated.** `scripts/third-party-notices.mjs` writes one JSON file per app:

- Mac: `apps/desktop/src/generated/third-party-notices.json`, from
  `cargo metadata` for both halves of the universal build and the desktop's
  npm production tree. Only crates linked into the binary count: build
  dependencies run on the developer's machine and proc-macros run inside the
  compiler, so neither ships and neither is listed — cargo-about's default cut.
  That is 274 crates rather than the 333 in the full graph.
- iPhone: `apps/mobile/App/ThirdPartyNotices.json`, from BeamEngine's
  `Package.resolved`, with the licence read from each checkout and the
  copyright line from Apple's source headers, since Apple's packages ship the
  bare Apache text.
- Website: `apps/web/src/generated/third-party-notices.json`, from the site's
  own dependencies — Astro and its integration listed shallowly, because only
  their runtime reaches a browser and the build toolchain behind them does not
  ship.

Each file lists every package with its name, version, chosen licence,
copyright lines and URL (plus the NOTICE file, where Apache packages have one),
and carries each licence text once, verbatim from SPDX
(`scripts/third-party-notices/texts/`). A dual-licensed package is taken under
one of its options, most permissive first, the way `cargo-about` does; "A AND
B" keeps both. The font and the icon set are hand-listed in the script, each
with the reason.

The screens: iPhone Settings → About → Open source licenses (a list, each
package a page); Mac Preferences → About → Open source (a sheet, loaded on
open — 110 KB nobody needs until they ask); and `hostbeam.app/licenses`, which
reads all three files at build time and is linked from the footer.

**A stale list cannot ship.** `--check` regenerates in memory and compares;
both release scripts and `npm run deploy:web` run it, and
`npm run check:notices` is in the quality gates. A dependency bump without a
regenerated notice fails the release. The procedure, and what to do when the
script stops, is [docs/process/third-party-notices.md](../process/third-party-notices.md).

## Consequences

- The generated files are committed, so a reviewer sees the notice change in
  the same diff as the lockfile change, and the website builds without
  `cargo` or a Swift toolchain on the machine.
- A new licence family (anything outside the preference list) stops the
  script rather than silently picking. That is the point: a copyleft crate
  arriving through a transitive dependency should be a decision, not a line in
  a JSON file.
- The iPhone check needs BeamEngine's checkouts on disk at the pinned
  revisions (`swift package resolve`), which the archive step already
  guarantees.
- Thirteen crates have no licence file and no `authors` in their manifest, so
  they list with a link and no copyright line. That is what upstream ships;
  inventing a holder would be worse than leaving it blank.
- **Keeping it current is a habit, not a hook.** Any change to a lockfile,
  `Package.resolved`, the font or the icon set is followed by
  `npm run notices`, and the regenerated JSON goes in the same commit. Nothing
  regenerates on its own; the check is the backstop, and it runs before every
  release and in the quality gates.
- The Mac app's screen is in-app rather than a link to the website on purpose:
  the obligation is on the binary, and it should hold with the network off.

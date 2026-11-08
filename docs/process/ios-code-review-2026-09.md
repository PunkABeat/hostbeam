# iPhone app code review — 2026-09-23 (at 1.0 build 7)

Scope: `apps/mobile/` — the `BeamEngine` Swift package, the app (`App/`), the
share and action extensions (`Share/`, `ActionExt/`, `ShareUI/`), the widgets
(`Widgets/`), the shared layer (`Shared/`) and `project.yml`. All 51 tracked
Swift files (6.8k lines) were read in full; the decision-driving findings were
re-checked against the code, the entitlements, the licensing worker and the
pinned Citadel checkout.

Gates as found: `swift test` in `BeamEngine` passes, 68 tests. There is no iOS
test target, no lint or formatter, and CI never builds the app or runs
`swift test` — it only resolves the Swift packages for the notices check. The
language mode is Swift 5.9 (`project.yml:11`, `swift-tools-version:5.9`) on a
6.2 toolchain, so strict concurrency checking is off.

## Verdict

The split is right and the engine is good. Everything that touches the network
or the upload contract lives in `BeamEngine` behind a `Transport` protocol,
unit-tested with a fake session; the app, the extensions, the widget and the
Shortcuts intent all reach it through one `BeamService`. The device key is
created by the app only and merely loaded elsewhere, which closed a real
identity-split bug. Host keys are pinned on first use and a changed key is
refused, including across an address edit. The free tier, the licence tiers and
the pairing link are pure and tested. As on the desktop, the comments explain
*why* unusually well.

The weaknesses sit above the engine. Error presentation, the add-host sequence
and the "which host" rule are each written three times, and the copies have
already drifted: the Shortcuts intent handles fewer errors than the app, and a
Settings field does nothing at all. The upload is stop-and-wait, so it is as
slow as the link's latency allows. Nothing outside the engine is tested, CI does
not compile the app, and the concurrency checker that would catch the one data
race found is switched off.

## A. Bugs found (fix first)

| # | Where | What |
|---|---|---|
| A1 | `App/SettingsView.swift:40`, `App/Settings.swift`, `Shared/AppGroup.swift:27` | **"Default remote folder" does nothing.** Settings writes `settings.folder`; nothing reads it. Every new host is created with `/tmp/hostbeam` (`HostViews.swift:330`, `HostPairing`), whatever the user set. |
| A2 | `App/Intents/BeamLastScreenshotIntent.swift:65` | **A shortcut naming a removed host beams to the default one instead.** The dialog says where it went, but the screenshot has already landed on a server the shortcut did not name. A named host that no longer exists should fail and say so. |
| A3 | `App/RootView.swift:519` | **The photo picker holds every picked image in memory at once.** The comment above it says loading one at a time avoids holding 25 full-size images; the loop then appends each `Data` to an array and writes them out only after the last. Write each to its temp file as it loads (or take a file `Transferable`). |
| A4 | `App/Intents/BeamLastScreenshotIntent.swift` | **Shortcuts gets raw errors for the common failures.** The intent maps five `BeamError` cases; `authRejected`, `deviceKeyMissing` and `tooManyFiles` fall through as the engine's debug description. The app and the share extension map all of them (see B1). |
| A5 | `App/ScreenshotSource.swift:11`, `Shared/Localizable.xcstrings` | `ScreenshotSourceError.description` returns plain English literals, not `String(localized:)`. Found while fixing it: **40 strings were English in all seven other languages** — the share sheet's error cards, the Shortcuts dialog, the widget, the scanner — because `SWIFT_EMIT_LOC_STRINGS` was off (XcodeGen does not set it), so the catalog never learned of a string added after it was first filled. |
| A6 | `App/HostDetailView.swift:208` | Storage check and cleanup show "Testing…" while they run; the cleanup confirmation says only `hostbeam-….png` is deleted when the engine deletes any `hostbeam-*` image (eleven extensions). |
| A7 | `App/HostDetailView.swift:297`, `App/Onboarding/OnboardingView.swift:213` | A failed Test connection shows `String(describing: error)` — a Swift enum dump or a NIO error — rather than the sentence the beam path would show for the same error. |
| A8 | `App/HostViews.swift` `HostEditView` | The add form neither trims hostname/username nor range-checks the port (`Int(port) != nil` accepts 0 and 99999); the address editor beside it does both. A pasted trailing space fails later as "didn't answer". |
| A9 | `App/Onboarding/QRScannerView.swift:121`, "Paste instead" | A QR code or pasted text that is not a Hostbeam pairing code is ignored silently; the scanner keeps running with no hint that it saw something. |
| A10 | `BeamEngine/.../Beamer.swift:154` | An empty batch throws `noFreeFilename`. Harmless (no caller passes one) but misleading in a log. |

## B. Architecture and structure

### B1. One presentation of `BeamError`, not three

`RootView.beam(datas:)`, `ShareViewController.run()` and
`BeamLastScreenshotIntent.perform()` each translate `BeamError` into a title,
detail and hint. They agree today on six cases and disagree on three (A4). Move
the mapping into `Shared/BeamErrorPresentation.swift` —
`BeamErrorPresentation(error:, host:) -> (title, detail?, hint?, kind)` — and
have all three surfaces render it. The catch-all "didn't answer" also swallows
SFTP errors such as a permission denied on create; give those their own case in
the engine (`BeamError.remote(detail:)`) so the card can say "couldn't write to
the folder" instead of blaming the network.

### B2. One add-host flow, not three

Add → (authorize if needed) → (offer as default) is implemented in `RootView`,
`HostListView` and onboarding's `AddHostStep`, each with its own sheet state and
its own `Task.sleep(350/600 ms)` to let a dismissal finish before the next
presentation. Extract it once: an `AddHostFlow` view modifier (or a small
`@Observable` coordinator) that owns the sheets, the pairing-link intake and the
sequencing, applied in the three places. The sleeps then live in one spot, and
the next change to the sequence (there have been several — see the comments)
happens once.

### B3. The engine should not speak English

`Beamer.diagnose` returns labels ("SSH connection", "Round-trip") and details
("ed25519", "host key mismatch"), and `HostDetailView.DiagRow` re-translates by
step id because `Text(step.label)` is never looked up. Return ids and structured
details only; let the app own every string. Same for the `detail:` strings the
error cards pass ("publickey rejected", "device key unavailable"), which are
shown to users verbatim.

### B4. Concurrency: turn the checker on, starting with the engine

`TOFUHostKeyDelegate.sawMismatch` (`CitadelTransport.swift:51`) is written on a
NIO event-loop thread and read from the async caller with no synchronisation — a
real, if benign, data race that Swift 6 mode rejects at compile time.
`HostKeyStore`, `BeamCounter`, `ReviewPrompt` are non-`Sendable` classes passed
across tasks. Move `BeamEngine` to `swift-tools-version:6.0` (language mode 6),
fix what it reports (make the stores `Sendable` structs over `UserDefaults`,
carry the mismatch out through the promise's error instead of a flag), then set
`SWIFT_STRICT_CONCURRENCY: complete` on the app targets before moving them to
Swift 6 as well. `AppStore` and `PurchaseController` are already `@MainActor`.

### B5. `AppStore` is doing four jobs

It holds the host list, the recent log, reachability probing with its watchdog,
and licence revalidation on foreground. Reachability (`probe`, `authorizeNeed`,
the TTL and timeout) is self-contained and the most intricate part; move it to
`App/Reachability.swift` as its own `@MainActor` type the store owns. With
iOS 17 as the floor, new state types can use `@Observable` instead of
`ObservableObject`, which also removes the need to mirror store values into
`@State` to get re-renders (`pinnedFingerprint` in `HostDetailView`).

### B6. Timeouts: say what they are, and shorten the connect

Citadel's `SSHClient.connect` has a 30 s connect timeout by default; the
comments in `AppStore` ("the transport sets no connect timeout of its own") are
out of date, and the app works around it with a 15 s probe watchdog and a 4 s
`authorizeNeed` poll. Pass an explicit `connectTimeout` (8–10 s) from
`CitadelTransport` and correct the comments. The share sheet has no Cancel
button, so today an unreachable host holds it for 30 s.

## C. Performance

### C1. The upload is stop-and-wait (largest win)

`Beamer` writes 64 KB, awaits the SFTP status, writes the next
(`Beamer.swift:213`). Throughput is therefore capped at one chunk per round
trip: 640 KB/s at 100 ms, 2.5 MB/s at 25 ms, whatever the link's bandwidth. A
full-size iPhone screenshot is 2–4 MB. Keep several writes in flight (a small
window of 4–8 concurrent `write(_:at:)` on the same handle, via a task group,
reading ahead from the `FileHandle`) — SFTP is designed for this, OpenSSH's
`sftp` pipelines 64 requests. Larger chunks (up to the server's limit, 255 KB
for OpenSSH) help too but pipelining is the real fix. The fake session in
`BeamerTests` already records offsets, so byte-identical ordering stays
testable.

### C2. One round trip per filename candidate

Each file does `exists(candidate)` (a `stat`) and then opens with
`[.write, .create, .truncate]` (`CitadelTransport.swift:126`). Open with
`[.write, .create, .forceCreate]` instead — Citadel's name for SFTP's
exclusive-create bit, `SSH_FXF_EXCL` — and treat "file exists" as the
collision: one round trip fewer per file, and the check-then-truncate race (two
devices beaming in the same millisecond overwrite each other) disappears.

### C3. Smaller items

- `RecentRow` decodes the thumbnail with `UIImage(contentsOfFile:)` in `body`,
  on every render of the Home list. Cache it (`@State` loaded in `.task`) or use
  `AsyncImage` over the file URL.
- `AppGroup.license().tier()` reads the Keychain and decodes JSON on every
  `makeBeamer()` and every Settings render. Cheap enough, but it is on the
  share extension's cold path; read once per beam.

## D. Security

Sound: private key in the Keychain with `AfterFirstUnlockThisDeviceOnly`,
created only by the app; one keychain access group across all four targets
(checked in the entitlements); host keys pinned and a mismatch refused; the
address editor keeps the pin so a moved host is re-verified rather than
re-trusted; a link may only update a host that already has a pin; only
`hostbeam-*` images are ever listed or deleted; no shell anywhere on the phone
side (SFTP only).

- **D1. The folder-ownership check fails open** (`CitadelTransport.swift:96`).
  If the server returns no uid for the home directory or the folder,
  `isOwnedByLogin` answers `true`. The desktop's equivalent (`test -O`) fails
  closed. Return `false` — or a distinct "cannot tell" that the beam treats as
  a refusal — when either uid is missing.
- **D2. The App Store key exchange trusts possession of a transaction id**
  (`PurchaseController.swift:121`, worker `/appstore/key`). The worker confirms
  the id with Apple (bundle, product, not revoked) and returns that purchase's
  key, idempotently — so anyone holding another buyer's original transaction id
  (it appears on Apple's emailed receipts) receives that buyer's key. Send the
  signed transaction instead (`VerificationResult.jwsRepresentation`) and have
  the worker check its `deviceVerification` against
  `AppStore.deviceVerificationID` sent alongside, or set an `appAccountToken`
  at purchase and require it. Impact is bounded (one licence, three seats), so
  this is Medium, not urgent.
- **D3. Files are visible under their final name while they upload.** A
  `hostbeam-*.png` exists on the host from the first chunk; an agent tool
  reading the folder at that moment gets a truncated image. Upload to
  `.hostbeam-….part` and rename on close (SFTP `rename` is atomic on
  POSIX servers). The desktop's `scp` has the same property; fix both or
  neither, and record it in the upload contract.
- **D4.** `DeviceKey.installCommand` appends with `echo … >>` every time it is
  run and sets no permissions; the Mac's `install_pubkey` script is idempotent
  and `chmod`s `~/.ssh` and `authorized_keys`. Use the same script text.
- **D5.** The pairing link sets the remote folder with no validation. It only
  ever receives `hostbeam-*` files over SFTP, so the risk is a confusing folder,
  not code execution; still, require an absolute path the way the Mac's
  `valid_folder` does, and reject `..` segments on both.

## E. Maintainability for agents

- **E1. CI does not build the iPhone app.** Add a `macos-15` job: `swift test`
  in `BeamEngine`, `xcodegen generate`, and an unsigned simulator
  `xcodebuild build` (`CODE_SIGNING_ALLOWED=NO`). Today a change that breaks
  the app target, an extension, or the widget is found on the owner's phone.
- **E2. No tests above the engine.** The logic worth testing without UI is
  already plain Swift: `RecentLog` (alignment, pruning, thumbnail deletion),
  `SharedHosts.defaultHost`, the intent's host choice (A2), the error
  presentation once extracted (B1), `HostEditView`'s namesake/update rules.
  Move the pure parts into `Shared/` types and add a `HostbeamTests` unit-test
  target in `project.yml` that runs on the simulator in the CI job above.
- **E3. No engineering guide.** `docs/engineering/` covers the Rust core and the
  web frontend; the iPhone app's rules live only in the README's four bullets
  and in comments. Add `docs/engineering/ios.md`: the target map (which
  sources compile into which target — `project.yml` adds files across targets,
  which surprises), the engine/app boundary, the app-group and keychain
  contract, the "app creates the key, extensions only load it" rule, the error
  presentation rule, how to run the gates, and the screenshot rig.
- **E4. The README is out of date.** Its layout lists three of six folders
  (no `ActionExt/`, `ShareUI/`, `Widgets/`); "the image is streamed, never
  decoded" predates `ImagePrep`, which does decode oversized images at 2000 px
  (the share extension's header says 2048 px — one of them is wrong).
- **E5. Generated plists are half-tracked.** `App/Info.plist` and
  `Share/Info.plist` are ignored as XcodeGen output; `ActionExt/Info.plist` and
  `Widgets/Info.plist`, generated the same way, are committed. Ignore all four.
- **E6. No formatter or linter.** Adopt `swift-format` (ships with the 6.x
  toolchain) with a checked-in `.swift-format`, and run `swift format lint
  --strict` in the CI job. The code is already consistently styled, so the
  first diff is small.
- **E7.** `LicenseClient` parses Keygen responses with `JSONSerialization` into
  `[String: Any]`. The tests cover the parsing, but `Decodable` structs for the
  four shapes it reads would make the contract visible and the casts go away.

## F. Recommended order of work

Status 2026-09-23: Phase 0 landed. A1–A10 fixed; D1 now fails closed (a
reversal of a documented choice — the old comment said a server reporting no
owners "gives no grounds to refuse"); B6's 10 s connect timeout; E1 (CI job
`iphone`: engine tests, unsigned simulator build of every target, string
check), E4, E5. B1 landed early because it is how A4 and A7 are fixed:
`Shared/BeamFailure.swift` is the one wording of a failed beam. A5 widened to
the 40 untranslated strings, all translated, with `SWIFT_EMIT_LOC_STRINGS` on
and `scripts/check-ios-strings.mjs` failing CI on the next one. Installed on
the owner's iPhone 13.

For the next iPhone release notes (the `## Unreleased` heading is the Mac's
lane, so these wait here): the Default remote folder setting now applies to
new hosts; a shortcut naming a removed host fails instead of beaming to the
default; picking many photos no longer holds them all in memory; Shortcuts
explains every failure as the app does; the last English-only messages are
translated; a QR code that is not Hostbeam's says so; an unreachable host
gives up after 10 s rather than 30.

Phase 1 landed next: B2 (`App/AddHostFlow.swift` — one flow, one sheet slot,
a scan swaps the scanner for the confirm form with no pause); B3 (diagnostics
return `DiagnosticStep.Detail` data and the app words them; error details no
longer restate titles in English); E2 (`HostbeamTests` in `project.yml`,
`AppTests/`: failure wording, `HostDraft` — the add form's rules, now a plain
type — the Shortcuts host choice as `SharedHosts.choose`, the flow's routing;
CI runs them on a simulator); E3 (`docs/engineering/ios.md`).

Phase 2 landed next. C1: writes pipelined (32 in flight of Citadel's 32,000-byte
requests) — against the test host with 50 ms added, one 2.5 MB screenshot went
from 6.9 s to 1.3 s, and five now take 2.5 s (not measured before the change). C2 and D3 together: each
file is written as `.hostbeam-….part` and renamed into place, the rename being
the collision check (OpenSSH refuses a rename onto an existing name — checked),
so no `stat` per file and no half file under a `hostbeam-*` name; Clean up, on
the phone and the Mac, removes leftover `.part` files. The Mac followed on
2026-09-25: one `sftp` session per beam, `put` + `rename` per file
(`ssh::upload` in `services/ssh.rs`), which measured faster as well as safer —
five files 7.6 s → 3.2 s at 50 ms, one file unchanged. D2: the app sends the signed transaction and the worker
verifies it when present (`appstore-jws.ts`, chain to Apple Root CA G3 pinned
by fingerprint, tested against Apple's real certificates). On 2026-09-25 the
worker was made to require it — no App Store build without it ever existed,
since the iPhone app had not shipped — and deployed to both environments. For the next iPhone release notes: beams are
several times faster on a slow connection; a host's page has "Authorize
this iPhone…" at any time, and the Authorize screen has "Check again" and
updates the host's dot when it closes.

Phase 3 landed last, and with it the review. E7: Keygen's responses decode
into one `Decodable` document and the requests are `Encodable`. B4: the engine
and then every app target build in Swift 6 language mode; it found a real race
the checker itself could not see (the host-key delegate's flag, now locked),
the QR scanner touching UIKit off the main actor, and mutable intent
statics; every place the checker is told to trust the code is listed in
`docs/engineering/ios.md` with its reason. B5: `Reachability` is its own
`@Observable` type with six tests. E6: `swift-format` (`.swift-format`,
4 spaces, 120 columns) formatted the tree once; CI runs `lint --strict` on the
newest Xcode 26 the runner has. Everything in §§ A–F is closed.

**Phase 0 — bugs and the gate (days).** A1–A9; D1; B6's explicit connect
timeout; E1 (CI builds the app and runs the engine tests); E4, E5.

**Phase 1 — one of each (a week).** B1 error presentation (closes A4, A7);
B2 the add-host flow; B3 engine without English; E2's first tests over what
B1/B2 extract; E3 the guide.

**Phase 2 — speed and safety (a week).** C1 pipelined upload and C2 exclusive
create, each against the test host with timings before and after; D3 upload
under a temporary name (together with the desktop); D2 the signed-transaction
exchange (app and worker together, both environments).

**Phase 3 — Swift 6 (days).** B4, engine first, then the app targets; B5 split
reachability out and adopt `@Observable` where it is touched; E6 formatter;
E7.

## G. Keep

The engine/app boundary and the `Transport` fake; the rule that only the app
mints the device key; pinned host keys that survive an address change; the
calm, specific failure copy and the refusal to guess ("cannot tell" is a state,
not a "no"); partial batches reported as partial; the screenshot rig; the
comments that record *why* and what broke on device.

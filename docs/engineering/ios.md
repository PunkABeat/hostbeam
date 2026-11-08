# iPhone app

The iOS companion (`apps/mobile/`, ADR 0016/0017): SwiftUI, one Swift package
for everything that is not UI, four targets that share it. The review this
guide follows from is `docs/process/ios-code-review-2026-09.md`.

---

## Targets and what compiles into them

`project.yml` (XcodeGen) is the project; the `.xcodeproj` and every target's
`Info.plist` are generated and not committed.

| Target | Sources | What it is |
|---|---|---|
| `Hostbeam` | `App/`, `Shared/`, plus `ShareUI/ShareStatusView.swift` and `Widgets/BeamControlIntent.swift` | The app, the Shortcuts intent, the screenshot rig |
| `HostbeamShare` | `Share/`, `ShareUI/`, `Shared/` | Share extension ("Beam to host" in the share sheet) |
| `HostbeamAction` | `ActionExt/`, `ShareUI/`, `Shared/` | Action extension — the same controller, other slot |
| `HostbeamWidgets` | `Widgets/`, `Shared/` | Home Screen widget and the iOS 18 Control |
| `HostbeamTests` | `AppTests/` | Unit tests, hosted in the app |

Two single files cross over on purpose, and each says why in `project.yml`:
the share view is in the app for the screenshot rig, and the Control's intent
is in the app because `openAppWhenRun` performs it there.

Everything in `Shared/` compiles into every target, so it may only use what an
extension may use: no `UIApplication.shared`, no `AppStore`.

## Layers

- **`BeamEngine/`** (SwiftPM, iOS 17 + macOS 14): the upload contract, the
  `Transport`/`SFTPSession` protocols and their Citadel implementation,
  host-key pinning, the device key, `ImagePrep`, licensing, the counter,
  diagnostics. No SwiftUI, no app group, **no user-facing strings** —
  diagnostics and errors are returned as data (`DiagnosticStep.Detail`,
  `BeamError`) and worded by the app.
- **`Shared/`**: the glue every target needs — `AppGroup` (suite, keys,
  stores), `SharedHosts`, `RecentLog`, `BeamService`, `BeamFailure`,
  `HostDraft`, the brand layer, the string catalog.
- **`App/`, `ShareUI/`, `Widgets/`**: views and the state that drives them.

## The rules

- **Every beam goes through `BeamService`.** It builds the `Beamer` with the
  device key, the pinned host keys and the sentence template — and no
  counter: the iPhone is free and unmetered (ADR 0028) — and records the
  success for the rating prompt.
- **Only the app creates the device key** (`AppStore.init`,
  `DeviceKey.loadOrCreate`). Extensions and the intent call `DeviceKey.load`
  and fail with `deviceKeyMissing` rather than mint a second identity.
- **One keychain access group, one app group, in all four entitlements**
  (`$(AppIdentifierPrefix)app.hostbeam.ios.Hostbeam`, `group.app.hostbeam`).
  A mismatch only shows on a device, never in the simulator.
- **A failed beam is worded once**, in `Shared/BeamFailure.swift`. The app's
  card, the share sheet, Shortcuts and Test connection render it. A new
  `BeamError` case does not compile until it has its wording there.
- **Adding a host is `AddHostFlow`** (`App/AddHostFlow.swift`): a screen owns
  one and applies `.addHostFlow(_:)`. The form's rules — trimming, the port,
  the default folder, what a name you already have means — are `HostDraft`.
- **Reachability is its own type** (`App/Reachability.swift`, owned by
  `AppStore` as `store.reachability`): the dots, probes that run only while a
  screen is visible, and the authorize step's "does this host already accept
  this iPhone?". Record fresher evidence (a Test connection, diagnostics) with
  `record`; forget a host's state when its address changes. New state types
  are `@Observable`.
- **Where a beam goes is never guessed.** A shortcut naming a host that is
  gone fails (`SharedHosts.choose`); a new host is offered as the default,
  never made it.
- **Host keys are pinned on first use and a change is refused.** Editing an
  address keeps the pin; a pairing link may update a host only once its key is
  pinned.
- **A file is whole before it has its name.** The engine writes each file
  under a hidden `.hostbeam-….part` name, up to `Beamer.writesInFlight`
  writes in flight, and claims the `hostbeam-*` name with a rename that
  refuses to replace anything — that rename is the collision check. The agent
  tools only read `hostbeam-*`, so they never see half an image. Clean up
  removes `.part` files a dropped connection left behind.
- **A purchase is redeemed with its signed transaction** — when there is one.
  Unwired since ADR 0028 (the iPhone sells nothing); kept for a paid layer:
  `PurchaseController` sends StoreKit's JWS with the id, and the worker
  verifies it.
- **Image bytes are streamed, not held.** Picked, pasted and shared images go
  to temp files one at a time; `ImagePrep` decodes only oversized or
  unreadable images, at 2000 px.

## Strings

Every user-facing string is a key in `Shared/Localizable.xcstrings` with all
seven translations (de, es, fr, ja, ko, pt-BR, zh-Hans). Write strings as
`Text("…")` or `String(localized: "…")`; interpolations become `%@`/`%lld`.
Technical values — paths, fingerprints, key types — use `Text(verbatim:)`.

`SWIFT_EMIT_LOC_STRINGS` is on, so the compiler lists every literal it sees,
and `node scripts/check-ios-strings.mjs <derived data>` fails on any key
without all seven translations. CI runs it. The catalog's `extractionState:
stale` flag is not reliable in this repo; ignore it.

## Concurrency

Everything — the engine (`swift-tools-version:6.0`) and every app target
(`SWIFT_VERSION: "6.0"`) — builds in Swift 6 language mode, so a data race
the compiler can see is an error. UI state is `@MainActor` (`AppStore`,
`Reachability`, `PurchaseController`, `AddHostFlow`).

Where the compiler cannot see, the code says so, and why:

- `AppGroup.defaults` is `nonisolated(unsafe)`: `UserDefaults` is documented
  thread-safe but not marked `Sendable`.
- `TOFUHostKeyDelegate` is `@unchecked Sendable` with its flag behind a lock:
  NIO calls it on its event loop, and Citadel's protocol is not annotated.
- `CitadelFileHandle` is `@unchecked Sendable`: concurrent writes on one
  Citadel file are safe (locked request ids, replies matched on the loop).
- The QR scanner's session is handed to a background queue to start, as
  Apple asks, in an `@unchecked Sendable` box.

Add to this list rather than silencing a diagnostic without a reason.

## Gates

```sh
cd apps/mobile
git ls-files '*.swift' | xargs swift format --in-place --configuration .swift-format   # format
git ls-files '*.swift' | xargs swift format lint --strict --configuration .swift-format
cd apps/mobile/BeamEngine && swift test               # engine, no network
cd apps/mobile && xcodegen generate
xcodebuild -project Hostbeam.xcodeproj -scheme Hostbeam \
  -destination 'platform=iOS Simulator,name=iPhone 17' -derivedDataPath dd-sim test
node scripts/check-ios-strings.mjs apps/mobile/dd-sim  # from the repo root
```

CI (`.github/workflows/iphone.yml`) runs the same, unsigned, on the newest
iPhone simulator the runner has: by hand, and before each App Store build
([ci.md](../process/ci.md)).

What is tested: the engine (upload contract, pinning, keys, licensing, image
preparation, diagnostics) against a fake `Transport`; in `AppTests/`, the
failure wording, the add form's rules, the Shortcuts host choice and the add
flow's routing. What is not: views, the extensions' controllers, `RecentLog`
(it writes the app group). Put new rules in a plain type in `Shared/` so they
can be tested there.

Then, for any change under `apps/mobile/`, build for the owner's iPhone and
install it: the simulator has hidden real bugs. A real SSH server is
`npm run testhost:up` (`docs/process/test-host.md`).

## Recipes

**A new failure.** Add the case to `BeamError` (engine), throw it, and give it
its wording in `BeamFailure.from`; add the strings to the catalog. Every
surface picks it up.

**A new setting.** A key in `AppGroup`, a published property in
`SettingsStore`, a row in `SettingsView`, and — if an extension or the intent
needs it — a reader in `AppGroup` so they get it without the app running.

**A new beam entry point.** Go through `BeamService`, write files not `Data`,
record the outcome with `RecentLog.record` (the app: `AppStore.recordBeam`),
put the sentence on the pasteboard only on success, render failures with
`BeamFailure`.

**App Store screenshots.** `ScreenshotStage` (debug only) seeds data and
stages a screen from a launch argument; `scripts/ios-screenshots.sh` drives it.

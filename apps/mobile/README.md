# Hostbeam for iPhone

How the app is built and the rules it follows: `docs/engineering/ios.md`.

The iOS companion app (ADR 0016, Milestone 008): beam a phone screenshot to
your SSH host and get the paste-ready sentence on the clipboard for a remote
coding-agent session.

## Layout

- `BeamEngine/` — SwiftPM package with all non-UI logic: the upload contract
  (naming, collision suffix, sentence), image preparation (`ImagePrep`), the
  SSH/SFTP transport behind a protocol (Citadel implementation), host-key
  pinning (TOFU), the device key (Keychain), licensing, and the free-tier
  counter. Unit-tested without a network. Licensing and the counter are kept
  but unwired: the iPhone app is free, with no limit, no in-app purchase and no
  licence (ADR 0028 §4).
- `App/` — the SwiftUI app: hosts, onboarding, the device key, the picker and
  clipboard beams, recent beams, settings, the Shortcuts intent, and
  `PurchaseController` (StoreKit, kept unwired since ADR 0028: nothing creates
  it or starts its observer).
- `Shared/` — compiled into every target: the app-group settings, the host
  list, the recent log, `BeamService` (the one way anything beams),
  `BeamFailure` (the one wording of a failed beam), the brand design layer and
  the string catalog.
- `ShareUI/` — the share sheet's controller and view, used by two targets:
  `Share/` (the share extension) and `ActionExt/` (the action extension).
- `Widgets/` — the Home Screen widget and the iOS 18 Control.
- `AppTests/` — unit tests for the app's own rules, hosted in the app.
- `project.yml` — XcodeGen definition. The `.xcodeproj` and the targets'
  `Info.plist` files are generated, not committed.

Which sources go into which target is set in `project.yml`, and it is not
only folders: two single files (`ShareUI/ShareStatusView.swift`,
`Widgets/BeamControlIntent.swift`) are also compiled into the app, for the
reasons given there.

## Build (simulator)

Requires Xcode 16+ and [XcodeGen](https://github.com/yonaskolb/XcodeGen)
(`brew install xcodegen`).

```sh
cd apps/mobile
xcodegen generate
xcodebuild -project Hostbeam.xcodeproj -scheme Hostbeam \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath dd-sim \
  CODE_SIGNING_ALLOWED=NO build
```

## Quality gates (run before handoff; CI runs the same)

```sh
cd apps/mobile && git ls-files '*.swift' | xargs swift format lint --strict --configuration .swift-format
cd apps/mobile/BeamEngine && swift test          # engine unit tests (no network)
cd apps/mobile && xcodegen generate && xcodebuild -project Hostbeam.xcodeproj \
  -scheme Hostbeam -destination 'platform=iOS Simulator,name=iPhone 17' \
  -derivedDataPath dd-sim test                   # every target, plus AppTests/
node scripts/check-ios-strings.mjs apps/mobile/dd-sim     # every string translated
```

A new user-facing string needs an entry in `Shared/Localizable.xcstrings` for
all seven languages; the last check fails until it has one. End-to-end
verification against a real sshd is `npm run testhost:up`
(`docs/process/test-host.md`); on a phone, build for the device and install
it — the simulator has hidden real bugs (keychain access groups).

## Rules that bind this app

- No real hostnames, credentials, or private keys in the repo or fixtures.
- Host-key pinning is mandatory (`acceptAnything` is spike-only, never here).
- Only the app creates the device key; the extensions and the intent only
  load it, so no process can mint a second identity no host has authorized.
- A screenshot is streamed as it is. An image a model cannot read, or one over
  `ImagePrep.maxPixelSize` (2000 px), is decoded only at that size into a
  temporary copy — never at full size, which is what keeps the share
  extension inside its memory ceiling.
- Failure leaves the clipboard untouched.
- No beam is metered and nothing is sold: `BeamService` passes no counter, and
  there is no licence or purchase UI (ADR 0028 §4). The scheme still attaches
  `Hostbeam.storekit` to Xcode runs; it is inert while nothing asks StoreKit.
- A failed beam is worded once, in `Shared/BeamFailure.swift`.

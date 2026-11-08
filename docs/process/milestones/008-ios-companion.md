# Milestone 008: iOS Companion (v1)

Status: In progress. Opened by ADR 0016 (accepted 2026-07-05) after the
Phase 0/1 feasibility spikes passed (see
[mobile-companion-brainstorm.md](../../research/mobile-companion-brainstorm.md)).

**Pricing changed 2026-09-27 ([ADR 0028](../../adr/0028-free-to-use-with-a-reminder.md)
§4): the iPhone app is free, with no daily limit, no in-app purchase, no licence
entry and no reminder.** The licence is Mac-only. Slice 6's code
(`PurchaseController`, `Licensing`, `BeamCounter`, `Hostbeam.storekit`) stays in
the tree unwired: `BeamService` passes no counter, Settings has no licence
section, and the transaction observer and licence revalidation are not started.
No in-app purchase is submitted. The two account warnings below only matter again
if a paid iPhone layer comes back.

## ⚠ Swapping to the PunkABeat Apple account breaks iOS licensing

**Resolved 2026-09-15: no swap happened.** The personal account was converted
to the PunkABeat organization in place, and Membership details still show Team
ID `U3C6XC6LHJ`, so the issuer does not change. The warning below still applies
to any future move to a *different* account.

Blocked on D-U-N-S at the time of writing, and easy to treat as a billing-only
change. It is not.

iOS purchases mint licences by verifying the StoreKit transaction against
Apple's App Store Server API, signed with `APPSTORE_ISSUER_ID`,
`APPSTORE_KEY_ID` and `APPSTORE_PRIVATE_KEY`. **The issuer belongs to the App
Store Connect account.** After the swap those credentials no longer authenticate
for the app, verification fails, and no licence is minted.

The buyer still pays — Apple takes the money regardless — and receives nothing.
Worse, the daily reconciliation cannot detect it: it compares *Paddle*
transactions against Keygen licences, and an App Store purchase has no Paddle
transaction.

Full reissue steps in `apps/license-webhook/README.md`, "Moving the Apple
account to PunkABeat will break iOS licensing". Reissue the key in the new
account, set all three secrets on **both** worker environments, store the `.p8`
in 1Password (it downloads once), and **verify with a real sandbox StoreKit
purchase** — a silent failure means deploying proves nothing.

**It is no longer silent.** The daily reconciliation asks Apple about a
transaction that cannot exist and expects a 404; a 401 or 403 emails "iOS
purchases may not be minting licences" with the reissue steps in it. That is a
canary for the credentials, not cover for a specific purchase — Apple has no
endpoint that lists sales, and the mint is client-driven, so an individual
purchase that never reached the worker still leaves nothing to reconcile.

## ⚠ The team prefix is baked into the device key's access group

**Resolved 2026-09-15:** the organization conversion kept Team ID `U3C6XC6LHJ`,
so nothing here changes. It still applies to a move to a different team.

`DeviceKey.accessGroup` is the literal `U3C6XC6LHJ.app.hostbeam.ios.Hostbeam`.
**The PunkABeat move changes that prefix.**

Smaller than it first looked: the four entitlements files declare
`$(AppIdentifierPrefix)app.hostbeam.ios.Hostbeam`, which Xcode expands from
whatever team signs the build, so they need no edit at all. Only three tracked
places carry the literal — `DeviceKey.accessGroup`, the test asserting it, and
`DEVELOPMENT_TEAM` in `project.yml`. (An earlier version of this note said the
entitlements had to change too. They do not.)

Worth considering rather than doing twice: the constant could be derived from
the same `$(AppIdentifierPrefix)`, exposed through Info.plist, and then no team
change would ever touch Swift again. The reason it is a literal is that a
*wrong* group must fail loudly rather than fall back to a per-process one; a
derived value is right by construction, so it keeps that property.

Unlike the licensing credentials, this one fails *loudly*: a mismatch makes the
Keychain return `errSecMissingEntitlement` (-34018), and since every beam path
now reads rather than creates, the app reports a missing device key instead of
silently minting a new one.

## The share extension beamed with a key no host had authorized (fixed 2026-08-30)

Found on device the first time the share sheet was exercised against a real
host — the whole point of the device-time checks, and it had been invisible
until then.

**Symptom**: `Test connection` and the in-app beam both succeeded; the share
sheet failed with "hostbeam-test didn't answer · Citadel.SSHClientError error
4". The wording sent the investigation at the network for twenty minutes.

**Cause**: `DeviceKey` queried the Keychain with no access group, so every
process fell back to its own default group (its application-identifier). The
app's key lived in `…Hostbeam`; the share extension looked in
`…Hostbeam.HostbeamShare`, found nothing, and — because the beam path called
`loadOrCreate` — **generated a second identity** the host had never authorized.
The server log is unambiguous: `Failed publickey … SHA256:<the share extension's key>…` against an
`authorized_keys` holding the app's `SHA256:<the app's key>…`. ADR 0016 §2 always
specified a shared access group; the doc comment on `DeviceKey` even claimed
one. Only the code never did it.

**Why every earlier pass missed it**: the acceptance criteria exercise the
share extension *in the simulator*, and **the simulator does not enforce
Keychain access groups**. The widget and Shortcuts paths are device-verified but
beam by opening the app, so they run in the app's process and never crossed the
boundary. The share extension was the only surface that beams out-of-process,
and it had never run on hardware.

**Fix**: all four targets declare `keychain-access-groups` with the app's own
existing group, first entry. Using the group the key *already lives in* means
no migration — nothing has to move, so no install can lose the identity its
hosts have authorized. Reads are pinned to that group so a stray key from an
earlier build cannot be picked up by an ambiguous query.

**Hardening, which matters more than the entitlement**: beam paths now call
`DeviceKey.load` and fail, never `loadOrCreate`. Minting an identity belongs to
setup. The root flaw was that "I cannot read the key" silently became "here is
a new key" — success-shaped right up to the server's refusal. Citadel's
`allAuthenticationOptionsFailed` is now mapped at the transport boundary to
`BeamError.authRejected`, so a refused key says so instead of blaming the
network.

**Verified on device 2026-08-30**: same phone, same host, share sheet —
`Accepted publickey … SHA256:<the app's key>…` (the app's key) and a byte-complete
1,926,812-byte PNG landed. Engine tests 37/37, including one that encodes this
bug directly (`testLoadNeverCreatesAKey`).

## A camera photo reached the host as HEIC inside `.png` (fixed 2026-09-13)

Found by reading the code while writing a test plan, not on a device. No photo
had been beamed yet, only screenshots — and a screenshot is a real PNG, which is
why every check so far passed.

**Cause**: nothing read what a file was. The share extension copies the shared
file untouched, the "Beam last screenshot" shortcut writes Photos data to a
`.png` temp name and falls back to the latest *photo* when the library has no
screenshot, and `Beamer.filename` named every remote file `.png`. A camera photo
is HEIC by default, so the host would get HEIC bytes under `.png`. The agent
tools and Claude's own file reader both take the type from the extension, so
the agent would get an image it cannot open — while the App Store copy offers
"a whiteboard" as the thing to show it.

**Why every earlier pass missed it**: every device check beamed screenshots,
whose bytes and name happen to agree, so the name was never tested against the
bytes.

**Fix**: `ImagePrep` reads the type from the bytes with ImageIO (part of the OS,
no dependency). PNG, GIF and WebP go untouched — PNG is a screenshot's format
and re-encoding would soften its text. A JPEG goes untouched if it is upright
and within 2048px. Anything else, or a larger or rotated JPEG, becomes a JPEG no
more than 2048px on its long edge — the Mac's cap — with the EXIF rotation
applied to the pixels and no metadata carried over, so no location either. The
thumbnail call decodes only at that size, which keeps it inside the share
extension's memory ceiling, and the copy is deleted before the next file. It
lives in `Beamer`, so the share sheet, the shortcut and the in-app beam all get
it, and the remote name carries the real extension.

**Verified 2026-09-13**: engine tests 57/57, including a real HEIC fixture, a
rotated portrait arriving upright, a location that does not survive, and a
screenshot arriving byte-identical. Built and installed on the device.

**Verified on device 2026-09-13** (owner): a camera photo shared from the
iPhone landed on the host as JPEG data named `.jpg`, where before it would have
been HEIC under `.png`.

## Device-driven polish batch (2026-08-30, owner-verified on hardware)

Found in one sitting of pairing an iPhone to a live host. Every one was
invisible in the simulator or to a reviewer who already had a working host.

- **Adding a host offered no way to authorize it.** Saving a host from the
  Hosts screen stopped there, so the host failed on first beam with a rejected
  key and no explanation. Authorization is **per host**, not per device — a
  fact "Authorize this iPhone" actively obscures, since it reads like device
  setup a second host would inherit. Saving now leads into the key step, and
  that step names the host it applies to. *(Refined 2026-08-31 — see below:
  the step is now conditional, because the Mac may already have done the work.)*
- **The empty state hid QR pairing.** Its single "Add a host" opened the manual
  form, so the one screen most certain to need pairing was the only one that
  never offered it. Now both routes, as onboarding §4.2 and the Hosts toolbar
  already had.
- **The authorize step died with the screen that launched it.** From the empty
  state, `store.addHost` flips `hosts.isEmpty` *before* the edit sheet
  dismisses, so RootView swapped EmptyStateView for BeamHomeView and took the
  pending sheet and its `onDismiss` with it. The whole add sequence now belongs
  to RootView, which survives the swap. The Hosts path was never affected —
  that view stays mounted.
- **Deleting the last host re-ran onboarding.** First-run was gated on
  `!onboarded && hosts.isEmpty`, so anyone who acquired a host without
  finishing onboarding stayed flagged un-onboarded, with the host merely
  masking it. Gated on the flag alone now, and `addHost` sets it.
- **"Re-trust on next beam" appeared to do nothing.** It unpinned correctly,
  but the fingerprint above it was read inline from `AppGroup.hostKeys()` —
  invisible to SwiftUI — and the only state it touched was already idle, so
  nothing re-rendered. The fingerprint is view state now, and un-pinning says
  "Trust cleared".
- **"Reachable" in green beside a red dot.** `test()` never wrote
  `store.reach`, and `probe`'s 120s TTL plus its `.onAppear`-only trigger meant
  nothing corrected it. Test and diagnostics both record their result now.
- **The pinned fingerprint gained a character it does not have.** Wrapping let
  SwiftUI hyphenate it — `…5SVP-DoBdL5R3Y` for a key with no `-` in it, in the
  one string users are asked to compare character by character. One line,
  scaled to fit, still a single `Text` so selection copies the exact value.
- **Duplicate host names could stack.** `addHost` appends unconditionally, so
  re-scanning the same QR made identical entries. The Mac has rejected
  duplicate names since `AddHostSheet`; iOS now applies the same rule.

Common shape, worth naming: all but one are **a step that looked like it
succeeded because its failure had nowhere to report itself** — the same family
as the licensing bugs in milestone 006 and the share-extension key above.

## Native-feel batch (2026-09-20)

Three gaps found by reading the app against what an iPhone offers, after the
Mac's own UX round. All built, simulator-built, engine tests green, and
installed on the iPhone 13 — **the three behaviours still want an owner pass
on hardware**, since none of them can be seen from a build log.

- **Haptics, which the app had none of anywhere.** `sensoryFeedback` on
  `BeamState` in the app — one hook, because every outcome passes through
  that state — and a `UINotificationFeedbackGenerator` in `ShareViewController`,
  which both extensions share. Three outcomes, three signals: success when it
  landed, warning for a partial (the phone must not say "done" with the same
  tap when files are still missing), error when it was refused. This matters
  most in the share sheet, which shows its answer for 2.2s over a photo the
  user is still looking at.
- **The widget said nothing.** `BeamWidget` rendered a static label. It now
  names the current host, read from the app group the extension already
  shares, and `AppStore.setDefault` reloads timelines — the one fact it
  shows, so the one place that reloads it.

  It also carried the time of the last beam for an hour, until the owner
  asked what that was for. Nothing: "when did the last one land" is not a
  question anyone asks a Home Screen, and the obvious way to render it,
  `Text(date, style: .relative)`, is a counter ticking every second on a
  screen people glance at. It was chosen because it self-updates without a
  timeline reload — the implementation's convenience, not the reader's. A
  thumbnail of the last beam was the other candidate and is worse: a
  screenshot is exactly the thing not to put on a Home Screen.
- **Shortcuts could only reach the current host.** `BeamHostEntity` +
  `BeamHostQuery` expose the app-group host list to Shortcuts, and
  `BeamLastScreenshotIntent` gained an optional `host` parameter: empty is the
  gesture it always was, filled in sends somewhere specific without changing
  what the phone does next. A named host that no longer exists falls back to
  the current one rather than failing a shortcut written months ago, and the
  dialog now names where it went.

### Spoken phrases naming a host: built, removed, revisit later

Written and working the same day ("Beam to prod with Hostbeam"), then removed
at the owner's call before it was pushed. The reason is not that it failed —
it is that by the time it existed there were already six faster ways to do
the same thing: the Action Button, Control Center, the Home Screen widget,
the share sheet, the Shortcuts action and the app itself. A spoken sentence
ending in "with Hostbeam" was the slowest of them, and it only worked in
English.

What it took, so a revisit does not start from nothing:

- **`EntityStringQuery`, not `EntityQuery`.** That is the whole difference
  from the Shortcuts field, which was kept. A picker hands back an id; Siri
  hands back *what it heard*, so something must turn "prod" into a host.
- **Loose matching.** Lowercased, with hyphens, underscores and dots
  flattened to spaces, prefix or contains in either direction, exact hits
  sorted first. Aliases are machine names (`dev-box-2`) and
  speech recognition returns them approximately; an exact comparison fails
  almost every time.
- **Phrases with a parameter** go in `AppShortcutsProvider`, must contain
  `\(.applicationName)`, and are **not** covered by `Localizable.xcstrings` —
  spoken phrases want an `AppShortcuts.strings` per language, which is why
  the existing three are English-only too.

Worth revisiting if a hands-free case appears — driving, a phone on a desk
mid-pairing — or when the phrases would be translated anyway.

Not done: a VoiceOver and Dynamic Type pass, which wants a device and a
person.

## Versioning — independent of the Mac (decided 2026-08-30)

The iPhone app carries its own `MARKETING_VERSION`, not the desktop's. The Mac
ships continuously through its own updater (0.1.7 and 0.1.8 landed on the same
day); the iPhone ships in batches through App Review. Forcing one number would
mean burning App Store versions on Mac-only fixes, and **an App Store version can
never be reused**.

`scripts/check-version-sync.mjs` now validates two lanes: the desktop trio must
agree with each other, and iOS must declare a well-formed `MARKETING_VERSION`
plus an integer `CURRENT_PROJECT_VERSION`. It cannot cross-check them, so it
enforces what it can — a malformed version otherwise fails at upload, after the
whole build.

`CURRENT_PROJECT_VERSION` must strictly increase for **every** upload, including
a re-upload of the same marketing version after a rejection.

**Open: the version to submit under.** Still `0.1.0`, which no longer describes
an app that has gained the share extension, QR host pairing, the one-tap widget
and an iOS 18 Control. Nothing has shipped to the App Store, so no number is
burned yet and the choice is free — but it is a product-identity decision (a
1.0 reads as finished; 0.x reads as beta) rather than a technical one, so it is
left for the submission.


## Goal

"Hostbeam for iPhone": a phone screenshot reaches the user's SSH host and a
paste-ready sentence lands on the clipboard, so a developer driving a remote
coding agent from an SSH client (Termius or any other) never breaks flow.
Simulator-first: the whole slice is built and tested on the iOS simulator;
real-device work (Phase 2 spike items, TestFlight) waits on Apple Developer
enrollment.

## Slice 1 (current): walking skeleton

- `apps/mobile/` scaffold (ADR 0012): XcodeGen `project.yml` (generated
  `.xcodeproj` is gitignored), app target + share-extension target, and a
  `BeamEngine` local Swift package holding all non-UI logic (SSH/SFTP via
  Citadel behind a small interface, unit-testable without a real host).
- Main app: manual host entry (alias, hostname, port, user, remote folder),
  on-device ed25519 key generation stored in the Keychain (shared access
  group), a "install this public key" helper (copyable `authorized_keys`
  one-liner), beam-from-photo-picker, and a local recent-beams list.
- Share extension: streamed upload (never decode the image), progress UI,
  pasteboard write before `completeRequest`, calm failure states (clipboard
  untouched on failure).
- **Host-key pinning**: trust-on-first-use with a stored known-hosts record;
  the spike's `acceptAnything()` must not survive into product code.
- Free tier: the 5-successful-beams/day counter (ADR 0014 semantics: only
  successes count, resets at local midnight) in app-group storage shared by
  app and extension. No license/network code in this slice.
- Upload contract identical to macOS: `/tmp/hostbeam`, timestamped
  `hostbeam-YYYY-MM-DD-HHMMSS.png`, collision suffix, never overwrite,
  `Use this screenshot: {remote_path}` on the clipboard.

## Slice 2 (done 2026-07-05): App Intent

`BeamLastScreenshotIntent` (background, `openAppWhenRun=false`) +
`AppShortcutsProvider` — the zero-tap surface (Action Button / Shortcuts /
Spotlight / Siri). Fetches the newest screenshot (falls back to the newest
image), beams via the shared `BeamService`, copies the sentence. Host reader
unified into `Shared/SharedHosts`. **Verified on the simulator**: ran via
Shortcuts, AppIntents logged `perform() finished`, upload landed on the
Docker sshd **byte-identical to the original** (md5 match), exact sentence on
the clipboard. Confirmed en route: the Keychain device key survives app
uninstall/reinstall (same public key across installs).

## Slices 3–5 (defined 2026-07-05 by ADR 0017 + docs/design/ios-companion.md)

- **Slice 3 — brand layer**: **done 2026-07-05** (commits 46e13e0 + 8f7155c).
  BrandTokens.swift, Geist bundled (woff2→ttf from packages/ui), BeamMark
  SwiftUI port (uploading pulse + landing bloom, Reduced Motion safe), Home
  restructured to the popover order with the accent-tint result block and
  taxonomy error cards, share extension rebuilt on the shared brand layer,
  free-tier limit card + ≤2-remaining hint (ADR 0014 UX). Verified building
  and running on the simulator; engine tests 10/10. **Open polish**: Geist on
  nav titles (UINavigationBar.appearance not honored by SwiftUI on iOS 26 —
  needs a toolbar-principal or custom header approach), Recent thumbnails,
  app icon.
- **Slice 4 — onboarding + QR pairing**: iOS half **done 2026-07-05**
  (commit c682ee2): the 4-step guided flow (all steps skippable), QR scanner
  with paste fallback, `HostPairing` payload parse/encode in BeamEngine
  (13/13 tests), `Beamer.verify` connection test wired into the Authorize
  step. Verified rendering on a fresh simulator install; full walkthrough
  with a live host + the scanner's camera path are device-time checks.
  **Desktop half done 2026-07-05** (commit de198f5): Preferences → Hosts
  "Share to iPhone" per-host action → PairSheet renders the shared
  hostbeam-host/v1 payload (encodeHostPayload matches the iOS parser via
  sorted keys) as an inline-SVG QR + copy-text fallback. Dependency
  `qrcode-generator` (MIT, zero transitive deps) chosen over hand-rolling
  because QR encoding is correctness-critical; smartphone icon + 5 i18n keys
  ×8 locales added; all desktop + web gates green. **Slice 4 complete.**
  Device-time checks that remain: the live camera scan path and a real
  desktop→phone pairing round-trip.
  **Port fix 2026-08-30**: the payload hard-coded `port: 22`, because the
  desktop models no port anywhere — it beams `ssh <alias>` and lets OpenSSH
  resolve one, so nothing upstream of the QR ever needed the number. A host on
  a non-standard port therefore paired with a silently wrong port and failed
  the phone's Test connection as *unreachable*, pointing the user at wifi or
  the local-network permission rather than the field they watched get filled
  in. Now resolved per-host by a `resolve_port` command shelling to `ssh -G`
  (`services::ssh::resolve_port`), which is the only source that honours
  `Match`, `Host *` defaults, `Include`, the system config, and OpenSSH's
  first-obtained-wins precedence — all invisible to `ssh_config.rs`, which
  models alias/hostname/user only. Manual hosts resolve the same way via
  `user@address`, so the QR always claims the port the Mac itself would use.
  PairSheet renders a spinner until it lands (no wrong-then-corrected QR), and
  any failure falls back to 22, which is what `ssh` would have used anyway.
- **Slice 5 — host management parity**: **done 2026-07-05** (commit 249a3af).
  BeamEngine gained a configurable sentence template, host-key fingerprint
  (SHA256:…), and `Beamer.diagnose` (reachable+auth → folder → latency,
  skip-on-fail); 20/20 tests. HostDetailView (rename, per-host folder, set
  default, Test connection, diagnostics, pinned-key fingerprint + re-trust,
  remove-with-unpin) and SettingsView (sentence editor + live preview,
  default folder, About/privacy) with an app-group-backed SettingsStore.
  Verified building + running on the simulator; the interactive host-detail
  and Settings paths (and a live diagnostics run) are device/hands-on checks.

## The authorize step earns its place (2026-08-31)

Since ADR 0018 the Mac can install this iPhone's key on a host from a device it
remembers, so by the time a host is saved the work may already be done. The step
now **asks before it appears**: `AppStore.authorizeNeed(for:)` consults the
reachability probe, and the sheet is presented only when there is something to
do. Both add paths gate on it (`RootView.offerAuthorize`, `HostViews`). Success
is therefore silent — the confirmation is the host's dot going green.

It reuses the probe rather than connecting again: both call the same `verify`,
and for the phone a successful `verify` *is* the authorization answer, since it
connects with the device key. `DeviceKeyView` had been opening a second SSH
connection to ask a question the host list had just answered.

**Owner testing then found the case it had no answer for.** It gave one reply to
every failure — "it can't accept a beam until this iPhone's key is on it" —
which for a host that never replied is a diagnosis, not an observation, and
sends someone to `authorized_keys` when the problem is the address or the
network.

`BeamError.authRejected` already drew the distinction, and the beam path already
used it; reachability was discarding it. `Reach.fail` now carries `refusedKey`,
and the step has three outcomes: skip, needs-key, or "couldn't reach — so I
can't tell", the last with what to check and the instructions still offered.

Two bugs surfaced writing it, both worth remembering:

- **The 4s bound did not bind.** `withTaskGroup` awaits every child before
  returning, and `await task.value` on a `Task<Void, Never>` ignores
  cancellation, so `cancelAll()` freed nothing. It is a poll against a deadline
  now. This reads like something to tidy back into a task group; tidying it
  would silently remove the bound.
- **`.checking` could last forever.** The transport sets no connect timeout, so
  a host that swallows packets left the dot promising an answer it would never
  produce. A 15s watchdog settles it, firing only if that same probe is still in
  flight.

Residual: the watchdog settles the dot, not the socket. A hung connection stays
parked until NIO gives up. Nothing user-visible leaks and nothing has been seen
to hang since; a connect timeout in `CitadelTransport` is the real answer if it
ever matters.

**Verified on device** (iPhone 13, two `testhost` containers): the step skipped
on a host the Mac had authorized; the step appearing via `authRejected` once the
key was stripped; and the unreachable path against `192.0.2.1`. Shipped in Mac
0.1.10; the iOS half ships with the first App Store submission.

## Real-device verification (2026-08-22, iPhone 13, owner-driven)

Apple enrollment approved → `project.yml` switched to real-team automatic
signing (`U3C6XC6LHJ`); built, installed, and launched on hardware entirely
via CLI (`xcodebuild` + `xcrun devicectl` — no Xcode GUI). Verified on the
device in one pass:

- **Live camera QR pairing**: desktop PairSheet (installed v0.1.3) → phone
  onboarding scanner → host fields filled — the full desktop→phone round trip.
- **Authorize + connection test** against a real host (device key auth).
- **Real beam via the share extension**: phone screenshot → share sheet →
  upload landed on the host, paste-ready sentence on the phone clipboard
  (pasted into the SSH client) — extension upload + pasteboard-write-from-
  extension confirmed on hardware.

Still open on-device: Action Button/Shortcuts intent on hardware; stress
items (cellular/throttled link, screen lock mid-upload, large-photo jetsam
ceiling); live host-key mismatch refusal; local-network prompt (TN3179) not
observed — host was not on the LAN. Next: TestFlight (Phase C), then slice 6.

## Share-sheet visibility (owner feedback 2026-08-22)

Real-device finding: the share extension lands at the very end of the share
sheet's app row until the user favorites it — iOS gives developers no API
over that ordering. Two responses: (1) **HostbeamAction** — an action-
extension twin (`com.apple.ui-services`) reusing the same UI/engine sources
(`ShareUI/`), so "Beam to host" also appears in the share sheet's vertical
*actions* list (Copy / Save to Files territory); (2) backlog: an onboarding
"pro tip" teaching users to favorite the share-row entry.

## Device-driven polish batch (2026-08-23, all owner-verified on hardware)

Real-world use on the iPhone surfaced and fixed, same day:

- **BeamMark pulse actually animates** — the Canvas + withAnimation Bool was
  a single still frame; now TimelineView-driven. The in-app beaming state got
  share-extension-scale presence (44px centered mark) + a landing bloom.
- **Add host via QR after setup** — the Hosts list's + is a menu (Scan from
  Mac / Enter manually), reusing the onboarding scanner; previously the only
  QR path was re-running onboarding.
- **Key-install friction** (see questions.md): Mac authorize leg in the
  PairSheet (`install_pubkey`, shipped desktop v0.1.4) + phone-side "Copy
  public key" / ShareLink (AirDrop fallback for flaky Universal Clipboard) +
  reframed manual command (Mac terminal or on-phone SSH app).
- **Reachability dots** on Home / Hosts list / detail — probes only from
  visible surfaces, 2-min TTL, pull-to-refresh forces; no background polling.
- **Recent beams**: shared app-group RecentLog written by ALL surfaces (the
  share extension and intent previously recorded nothing), bounded ImageIO
  thumbnails (≤480px downsample, extension-memory-safe), tap-to-enlarge,
  swipe-delete, Clear. 20 kept / 5 shown.

## Localization (2026-08-23)

The iOS app is localized in the desktop's 8 languages via String Catalogs
(`Shared/Localizable.xcstrings`, 98 keys; InfoPlist catalogs for permission
prompts + the extensions' share-sheet display name; compiled into app + both
extensions). Terminology anchored to the desktop `i18n.ts`; machine-quality
pending the same native review (questions.md § Localization). Not localized
yet: BeamEngine-produced detail strings (diagnostic step labels, error
descriptions) — engine API would need LocalizedError treatment; and the
default sentence template stays English by design (it addresses the agent).

## Slice 6 plan — licensing (designed 2026-08-23, build paused by owner)

**Unwired 2026-09-27 (ADR 0028 §4).** Everything below was built and is kept in
the tree for a possible paid layer, but nothing reaches it: no counter, no
Settings → License, no transaction observer, no revalidation, no IAP product.

Model per ADR 0016: one $29 license = 3 devices (Mac + iPhone mix); iOS
fingerprint = Keychain-stored UUID (AfterFirstUnlockThisDeviceOnly, never
synchronizable). Two paths to licensed: key entry (Paddle/web purchase) and a
day-one $29 non-consumable IAP (3.1.3(b): key entry is only allowed alongside
an equivalent IAP). IAP glue mirrors Paddle: App Store Server Notifications →
worker route (JWS verify, idempotent mint by originalTransactionId, refund →
suspend); Restore Purchases re-links via the worker. iOS-specific decisions:
IAP-minted keys are delivered **in-app only** (Apple exposes no buyer email;
copyable "Your license key" screen so it works on Macs too); the 12-month
update window does **not** apply to the iOS app (App Store updates are free
by platform rule — the window keeps governing desktop updates; MAINTAIN_ACCESS
means the license never stops working anywhere); license state lives in the
app-group Keychain so the share extension and intent honor the licensed tier;
free tier (5/day, already shipped) is skipped when licensed.

Build order: **(1) done 2026-08-23** — `Licensing.swift` in BeamEngine
(KeygenClient with desktop-parity pure parsers incl. never-revoke-on-unknown,
Keychain-UUID fingerprint, LicenseStore with key in the app-group Keychain +
tier state machine fresh-7d/grace-30d/free, 24h fail-open revalidation on
app foreground); Settings → License section (key entry / masked-key +
deactivate / grace notice; deliberately **no purchase link or price** until
the IAP exists — App Review 3.1.1); licensed tier skips the free-tier meter
via BeamService (app-group-backed, so the extension and intent honor it).
Engine tests 33/33 (10 licensing). **(2) done 2026-08-28** — StoreKit 2
purchase + Restore (`App/PurchaseController.swift`): Settings → License gains
"Unlock Hostbeam · <price>" + "Restore Purchases" above key entry; redeem
exchanges the transaction id at `POST /appstore/key` for a key and activates
it through the same `LicenseClient` path as manual entry; a transaction is
`finish()`ed only after activation (worker down post-purchase → transaction
stays open, a launch-time `Transaction.updates` observer retries — also
covers Ask to Buy); licensed state gains "Copy license key" (IAP keys exist
only in-app). Local `Hostbeam.storekit` config wired into the Xcode scheme
for on-device testing without the ASC product. **(3) done 2026-08-28**
(code; deploy pending secrets) — worker `/appstore/key` + `/webhooks/appstore`.
Verification model refined from the original "JWS x5c verify" plan: clients
and notifications supply only a transaction id; the worker fetches the
transaction from the **App Store Server API** over TLS (production, then
sandbox) and trusts only that — Apple's documented fetch-to-verify pattern,
no hand-rolled certificate-chain crypto on the money path. Mint is idempotent
by `metadata[appleTransactionId]` (notification and app exchange can race);
sandbox purchases mint real keys tagged `appleEnvironment: Sandbox`; REFUND/
REVOKE suspends only after the API confirms `revocationDate` (a forged
notification can only make us do what Apple's records justify);
ONE_TIME_CHARGE mints proactively. Worker tests 19/19. Remaining: **(4)
owner-side ASC** — Paid Apps agreement active, create the $29 non-consumable
`app.hostbeam.ios.license`, create an **In-App Purchase key** (Users and
Access → Integrations) and set worker secrets `APPSTORE_ISSUER_ID` /
`APPSTORE_KEY_ID` / `APPSTORE_PRIVATE_KEY` (.p8 content) via
`wrangler secret put`, then deploy the worker; point App Store Server
Notifications V2 (sandbox + production) at
`https://license.hostbeam.app/webhooks/appstore`; add a sandbox tester.

## TestFlight (live 2026-08-24)

ASC app record created (bundle `app.hostbeam.ios.Hostbeam`); first build
0.1.0 (1) archived + uploaded entirely via CLI (`xcodebuild archive` →
`-exportArchive` method app-store-connect/destination upload — gotchas
recorded in the commit: Homebrew rsync shadowing, uploadSymbols, full disk);
export compliance recorded (France No for now — ANSSI item below); internal
group live, owner installing via TestFlight (90-day builds, auto-notify on
new uploads). Dev-signing reinstalls no longer needed.

## App Review readiness audit (2026-08-24)

Fixed immediately: **app icon** (was entirely missing — hard blocker; now a
full-bleed 1024 derived from the canonical SVG, corners/sheen removed, opaque)
and **iPhone-only targeting** (was 1,2 — review would have judged iPad
layouts that were never designed). Verified clean: no purchase links, prices,
or external-buy mentions anywhere in the app (3.1.1); specific localized
permission strings; graceful photo/camera permission denial; launch screen;
no private APIs, no background modes.

One-tap entry points (2026-08-29, "fewest taps to beam"): Home Screen
widget (deep-links hostbeam://beam-last — WidgetKit ignores openAppWhenRun
on widget buttons, first attempt's mistake), iOS 18 Control (canonical
OpenURLIntent pattern riding the same link), Shortcuts/Back Tap (existing
background intent). The app runs the beam with full UI on the deep link.
**Verified on device: widget ✓, Shortcuts ✓. The custom Control is inert
under dev signing** (plus the known gallery "?" preview bug) — matches
multiple forum reports of controls misbehaving on dev installs;
**re-verify on the next TestFlight build** before touching the code
further. Working today regardless: the system "Shortcut" control in
Control Center running "Beam last screenshot".

*Correction (2026-09-05): signing was never the cause — TestFlight build 2
was inert too. The Control's intent has `openAppWhenRun = true`, which
makes the system open the app and perform the intent there, but the intent
type was compiled only into the widget extension, so the app had nothing
to run. Moved to `Widgets/BeamControlIntent.swift`, compiled into both
targets; the tap opens the app and beams, on a dev build and on
TestFlight build 3 alike. Lesson: an in-app intent
referenced from a widget or control must be a member of the app target,
not just the extension.*

Small fix spotted during screenshot capture (2026-08-29): the ACTION
extension's row in the share sheet rendered a black square — action rows
template-render icons (alpha mask only), so the full-bleed app icon masked
solid. **Fixed same day**: the action extension carries its own icon, the
beam mark alone on transparency (ActionExt/Assets.xcassets).

Remaining before submission — **superseded by
[ios-submission-checklist.md](../ios-submission-checklist.md)**, which is
checked against the repo rather than carried forward. Three items below were
already done by 2026-08-31 (privacy URL, export-compliance key, Geist OFL) and
the IAP item is narrower than it reads: the client half is built. Kept for the
reasoning, which the checklist does not repeat:
1. ~~**IAP must exist** (3.1.3(b)) — key entry may only ship alongside an
   equivalent in-app purchase. Slice 6 steps 2–4.~~ **Moot since ADR 0028**:
   there is no key entry and no in-app purchase.
2. **Privacy policy URL** — hard App Store Connect field; the site has no
   /privacy page yet (also on the desktop launch checklist).
3. **Review environment** — the app is useless without an SSH host: submit
   with review notes + a throwaway demo host (credentials/key pre-installed)
   (~~+ a valid license key for testing key entry~~, moot since ADR 0028).
   **Plus a 60–90s demo video**
   (decided 2026-08-29): the full loop — screenshot → share → beam → file
   landing on the demo host in a terminal — recorded against the final
   submission build (sim + terminal side by side), uploaded as the App
   Review Information attachment with an unlisted URL in the notes as
   backup. Apple's recommended practice for apps needing external servers;
   cuts "couldn't verify functionality" rejection risk. **No App Preview
   (store video) at v1** — marketing-only, extra metadata-rejection
   surface, can ship in any later version.
4. **Export compliance** — resolved for TestFlight (2026-08-24): compliance
   recorded as exempt/no-non-exempt encryption, **France answered No** to
   skip the ANSSI-documentation branch. **Launch item:** file the one-time
   ANSSI simple declaration (ssi.gouv.fr), flip France to Yes with the
   acknowledgment uploaded, and include France in availability — France
   stays excluded until then. Consider ITSAppUsesNonExemptEncryption=false
   in Info.plist to skip per-build questions.
5. **App Privacy labels** — **decided 2026-08-31; the suggestion below was
   not taken.** "Not linked" is wrong: the webhook writes `metadata.email` onto
   the Keygen licence, so the key resolves to a person in our own systems.
   Declared Linked. Full reasoning in
   [ios-submission-checklist.md](../ios-submission-checklist.md#app-privacy-decision-2026-08-31).
   Original note: decide how to declare the Keygen fingerprint
   (a random app-scoped UUID + license key sent for validation): likely
   "Identifiers — app functionality, not linked to identity" conservatively,
   or argue not-collected; needs an owner call.
6. Minor: bundle the Geist OFL license text (attribution hygiene).

## The device identity had no owner (2026-09-01)

Found rehearsing App Review on an **erased** simulator — a reviewer's starting
state, and the only state that exposes this.

`BeamService.makeBeamer` uses `DeviceKey.load()`, never `loadOrCreate`, and that
is right: a process that cannot reach the shared access group must fail rather
than mint a second identity no host has authorized, which is exactly what the
share extension did on device. But nothing else created the key either. It was
minted only as a **side effect** of opening the onboarding authorize step or the
device-key screen, so anyone reaching a host by another route had no identity at
all.

Every beam then failed with `deviceKeyMissing` before a socket was opened, and
the app reported **"couldn't reach the host"** — about a host answering
perfectly. Same shape as the authorize-step bug fixed the day before: naming a
cause it had not established.

`AppStore.init` now mints it. The app is the only process permitted to —
`AppStore` lives in `App/`, which only the `Hostbeam` target compiles, so every
extension still only ever loads — and it exists before anything can want it.
Shipped in Mac 0.1.12; reaches iPhone users with the first submission.

**Why the simulator hid it, again.** A simulator that has run Hostbeam before
keeps its Keychain key and passes. Only `xcrun simctl erase` reproduces a
reviewer. That is the second time the simulator has concealed something real
here — the first was the share extension's access group.

## Closed: a host can be edited, and a re-scan updates it (2026-09-19)

**Was:** the QR was one-shot. Rename a host or move it on the Mac and the phone
kept the old value indefinitely; re-scanning could not correct it, because
`nameTaken` in `HostEditView` refused a host whose alias already existed, so the
only route was delete and re-add. Found while assessing iCloud sync
(2026-08-31), and recorded as the cheaper answer that question keeps circling.

**Built** after the owner's test host moved with its Mac's DHCP lease
(`192.0.2.87` → `.79`) and the phone had no way to follow:

- The Address row on a host's screen opens an **Address sheet** — hostname,
  port, username — beside the name and folder, which were already editable in
  place. `AppStore.updateAddress` keeps the host's identity, its folder, its
  default status and its **pinned key**, so the same server at a new address
  simply works and a different one is refused on the next beam as a changed key.
  A probe still in flight to the old address drops its answer rather than
  painting the new one's dot.
- A **scan of a host you already have updates it**, which is what re-sharing
  from the Mac is for; the form shows `old → new`, and says so plainly when
  nothing would change. Typed by hand, a duplicate name is still refused.
- A **pairing link** may update one only once this iPhone has pinned that host's
  key ([ADR 0024](../../adr/0024-pairing-is-a-link.md)).

Sync is still not built, and this is still the cheaper answer.

## Explicit non-scope (later slices)

- Licensing: Keygen client, $29 IAP, Restore Purchases, key entry (**slice 6**,
  built, then **unwired by ADR 0028 §4** on 2026-09-27: the iPhone is free, and
  the licence is Mac-only. Kept in the tree for a paid layer that may come later).
- iCloud sync (**assessed and declined 2026-08-31** — full reasoning in
  questions.md § Mobile; the short version is that ADR 0018 removed most of the
  pain it would address, the App Sandbox question is unverified and gating, and
  the two things worth syncing are the two that must never sync); key import;
  ProxyJump; password auth; Android.
- Real-device-only spike items (throttled-link survival, jetsam ceiling,
  local-network prompt, extension pasteboard on hardware) — blocked on Apple
  Developer enrollment; tracked in questions.md § Mobile.
- App Store submission, TestFlight, encryption-export filings.

## Acceptance criteria (slice 1)

- `BeamEngine` unit tests pass without any network or host (protocol
  interfaces + fixtures), runnable from the command line.
- The app and extension build for the iOS simulator from a clean checkout
  with documented commands (xcodegen + xcodebuild).
- A driven end-to-end check against a local Docker sshd passes: in-app beam
  uploads byte-identically, pasteboard holds the exact sentence, collision
  suffix works, and the 6th beam of the day is blocked before upload with the
  clipboard untouched.
- Host-key pinning verified: first connect records the key; a changed host
  key is refused with a clear error.
- The share extension is exercised by hand in the simulator (share sheet has
  no scriptable automation) with the same success criteria.
- No SSH credentials, private keys, or real hostnames in the repo or in test
  fixtures (repo rule).

## Quality gates

From `apps/mobile/`: `xcodegen generate` + a simulator `xcodebuild build` +
`swift test` in `BeamEngine/` must all pass before handoff, mirroring the
desktop app's gate discipline (ADR 0007). CI path-filtering (ADR 0012) applies
when CI exists.

## Slice 1 status (2026-07-05): built and verified on the simulator

- BeamEngine: **10 unit tests green, no network** (upload contract,
  collision suffix, streaming, daily-limit-before-network, success-only
  quota, OpenSSH pubkey encoding, TOFU pin/match/mismatch, Keychain
  load-or-create never-regenerate-when-locked).
- App + share extension **build for the simulator** (XcodeGen, ad-hoc signed).
- **Owner-driven end-to-end pass**: added a host in-app, generated the
  device key in the Keychain, seeded its public key into a Docker sshd's
  `authorized_keys`, picked a photo, and the streamed upload **landed on a
  server that trusted only the app-generated key** — proving device-key
  auth + TOFU host-key pinning + the Citadel upload + the clipboard sentence
  together. Recent history recorded.
- Findings folded back in: (1) unsigned simulator builds
  (`CODE_SIGNING_ALLOWED=NO`) have no entitlements, so the Keychain
  device-key path fails — fixed with ad-hoc signing + an app-group
  entitlement; (2) a SwiftUI integer-interpolation bug rendered the port as
  "2,222" — fixed with `Text(verbatim:)`.

### Still open in slice 1 (small)

- Share-extension **end-to-end** was not driven (no scriptable share sheet;
  its engine path is identical to the verified in-app path). App-group
  sharing now has the entitlement but was not separately confirmed across
  the app↔extension boundary on the simulator.
- The "6th beam blocked" acceptance is covered by a unit test, not yet by a
  live 6-beam run.
- Host-key **mismatch** refusal is unit-tested; not yet driven live by
  rotating a server key.

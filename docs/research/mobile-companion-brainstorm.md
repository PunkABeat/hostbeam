# Mobile Companion Brainstorm — iPhone → SSH Host → Remote Agent

Date: 2026-07-05 (design session + same-day verification research pass; claims
below are sourced unless marked *unverified*). Feeds
[ADR 0016 (proposed)](../adr/0016-ios-companion-app-direction.md) and the
Mobile section of [questions.md](questions.md).

## The problem

Developers increasingly drive remote coding agents from the phone (e.g. Termius
on iPhone → dev box running Claude Code). A phone screenshot — a bug, a design,
a whiteboard — has no good path to that remote agent today. Hostbeam's core job
("move a screenshot to the SSH host, put a paste-ready sentence on the
clipboard") applies unchanged; only the platform constraints differ.

One observation does a lot of work in this design: **the target user has
already solved network reachability.** If they can SSH to the box from Termius
on the phone, a direct SSH connection from a Hostbeam app on the same phone
reaches the same box. No relay is needed for exactly the audience we care
about.

## 0. Demand and competition (verified 2026-07-05)

**The demand is real and publicly named.** Pieter Levels — the loudest
evangelist of the exact VPS + Termius + Claude Code workflow — publicly asked
Termius for precisely Hostbeam's behavior and called it his "#1 problem":
detect image paste → SFTP to /tmp → paste the filename
([tweet](https://x.com/levelsio/status/2053771680317636965)). Claude Code
cannot accept pasted images over SSH at all (the image lives on the local
device — [claude-code#89](https://github.com/anthropics/claude-code/issues/89)),
which is why a cottage industry of desktop hacks exists (clipssh,
tmux-paste-image, Hammerspoon scripts, VS Code extensions). **None of them are
on iOS**, where the pain is worse: no drag-and-drop, no image paste into any
terminal.

**But the nearest competitor is close.** Honest ranking:

- **Secure ShellFish** (Anders Borum): mature share-sheet SFTP upload plus
  Shortcuts actions (Upload, Get Path, Run Command…) that chain
  ([docs](https://secureshellfish.app/help/shortcuts-automation)). A motivated
  user can likely compose ~90% of our flow as a Shortcut today. What it lacks
  is the opinionation: no agent-ready sentence, no /tmp convention, no
  zero-setup path. **Must-test before committing: whether its Upload Shortcut
  action returns the remote path** — the single fact that most determines our
  differentiation. *(Unverified; requires buying the app.)*
- **Termius** documents a manual version of the flow in its own marketing
  (SFTP tab → upload → long-press copy path → back to terminal). No share
  extension; levelsio's request unimplemented as of July 2026 — but they could
  ship it any release.
- **Blink Shell**: remote FS via Files.app; clunky and manual for this job.
- **Dedicated agent-mobile clients** (Happy Coder, Omnara, and Anthropic's own
  Remote Control in the Claude mobile app) are the structural long-term
  threat: they bypass the terminal entirely. Anthropic's image support there
  is currently photos-only and buggy
  ([#53596](https://github.com/anthropics/claude-code/issues/53596)), but if
  it matures, the SSH-path workflow this product serves shrinks.

**Positioning verdict (owner decision, 2026-07-05):** Hostbeam-for-iPhone is
a convenience layer over capabilities that partially exist — the same
position the Mac app holds versus an `scp` one-liner, and the owner is
explicitly not worried about the Secure ShellFish overlap. The product bet is
**maximum ease of use** and **fitting into the user's existing workflow**
(Termius or any other SSH client — Hostbeam feeds the clipboard and stays out
of the way, so it is client-agnostic by construction). The ShellFish
Shortcuts test is demoted from gating decision to useful reconnaissance
(steal UX lessons, know the objection). The timing argument stands: ship
small and fast — the window may close from two directions (Termius shipping
levelsio's request, or Remote Control fixing images).

## 1. User flows

Two candidate primary surfaces emerged, and the verification pass **upgraded
the App Intent from "nice add-on" to "arguably the better primary"**:

### A. Share-sheet extension

Screenshot → tap thumbnail → Share → **Hostbeam** → beams to default host →
*"Copied — paste it to your agent."* → back to Termius → paste. ~3 taps; works
from Photos, Files, Safari; host picker inline only when no default is set.

### B. App Intents / Shortcuts action ("Beam last screenshot")

An App Intent with `openAppWhenRun = false` runs in the background **without
opening the app**, can fetch the newest screenshot directly
(`PHAssetMediaSubtype.photoScreenshot`), upload it, and put the sentence on
the clipboard ([App Intents](https://developer.apple.com/documentation/appintents),
[Photos query pattern](https://ikyle.me/blog/2025/querying-the-ios-photo-library)).
Bound to the **Action Button** (iPhone 15 Pro+), **Back Tap**, a widget, or
Control Center, this is a *zero-tap* beam — the closest thing iOS allows to
the Mac hotkey, and it runs in the app's process with far more memory headroom
than an extension. Constraint: **~30-second execution ceiling** from
Shortcuts; iOS 26 adds `LongRunningIntent` to exceed it with Live Activity
progress ([WWDC26](https://developer.apple.com/videos/play/wwdc2026/345/)).

Recommendation: **build both on one engine; ship both in v1.** The share sheet
is discoverable and handles "an image from anywhere"; the intent is the magic
path for the screenshot-heavy loop. Which one the marketing leads with can be
decided from real use.

### C. In-app picker (fallback + home base)

`PHPickerViewController` (no permission prompt) plus "Beam last screenshot"
button. The main app is also where hosts, the device key, history, and the
license live — which defuses the App Review "minimal functionality" concern.

### D. Clipboard watcher — rejected

No background clipboard monitoring exists on iOS, and reads trigger the paste
banner; on iOS the screenshot lands in Photos, not the pasteboard, anyway.

## 2. Technical feasibility (verified)

### SSH without OpenSSH

ADR 0003's "use system OpenSSH" cannot survive on iOS: no `ssh` binary, no
agent, no `~/.ssh/config`, no process spawning. The app embeds an SSH/SFTP
client. Verified landscape (July 2026):

- **Citadel** (Swift, on a NIOSSH fork; active, 0.12.1 Apr 2026): complete
  SFTP client (write/mkdir/rename verified in source), **first-class ed25519**
  auth including OpenSSH-format key parsing, KEX/cipher overlap with stock
  Ubuntu 22.04/24.04 sshd. Known sharp edges: **RSA userauth signs with
  legacy SHA-1** ([#131](https://github.com/orlandos-nl/Citadel/issues/131)) —
  broken against OpenSSH ≥ 8.8, so **v1 is ed25519-only by design**; **no
  chacha20-poly1305**, so a hardened server offering *only* chacha20 fails
  (spike must test); pins a third-party fork of Apple's swift-nio-ssh
  ([#116](https://github.com/orlandos-nl/Citadel/issues/116)) — a
  supply-chain/maintenance risk to accept knowingly. The fork's
  `NIOSSHPrivateKeyProtocol` makes an external-signer (Secure Enclave) path
  implementable today.
- **Apple swift-nio-ssh** upstream: no SFTP, no RSA, no external signers yet
  ([#220](https://github.com/apple/swift-nio-ssh/issues/220)) — Citadel is the
  usable layer over it.
- **russh** (Rust): best-in-class algorithm coverage and heavyweight
  production users (Warpgate, Bitwarden, a Microsoft fork for VS Code) — but
  **no public precedent of russh inside a shipping iOS app or extension**,
  and it would drag cargo-cross-compilation + UniFFI + an embedded tokio
  runtime into a memory-capped extension. Rejected for v1; attractive later
  only if we need certificates/rsa-sha2/PQ breadth.
- **libssh2 wrappers** (NMSSH, SwiftSH): dead. **Blink's libssh-apple fork**
  is maintained and production-proven (Blink ships Secure Enclave SSH keys on
  iOS with it; [docs](https://docs.blink.sh/basics/ssh-keys)) — it is the
  realistic **plan B** if Citadel fails the interop spike, at the cost of a
  C API.

**Decision for the draft ADR: Citadel, ed25519-only, direct TCP only** (no
ProxyJump v1, no password/keyboard-interactive — matching the Mac app's
non-interactive stance). Same upload contract as macOS: `/tmp/hostbeam`,
timestamped name, never overwrite, sentence on clipboard, clipboard untouched
on failure.

### Keys on device — the one principle that must bend

No agent to defer to, so the app holds a key. Recommended: **generate a
dedicated ed25519 keypair per device in the app**, private key in the iOS
Keychain (shared access group with the extension), never exported, never the
user's existing keys. The user installs the public key once — copy button +
ready `echo '…' >> ~/.ssh/authorized_keys` one-liner; trivial for someone who
by definition has an SSH session open in the next app. Revoking the phone is
deleting one line.

Secure Enclave upgrade path (P-256 → `ecdsa-sha2-nistp256`): production-proven
on iOS by Blink and Panic Prompt; implementable in Citadel via the fork's
external-signer protocol. Not v1 — ed25519-in-Keychain first.

Key import: rejected for v1 — it encourages copying private keys between
devices, the opposite of the product's credential philosophy.

### Extension constraints (verified, with sources)

- **Memory**: share extensions jetsam at **~120 MB** (confirmed via crash
  logs across many apps, e.g.
  [flutter#135243](https://github.com/flutter/flutter/issues/135243); the
  number is undocumented and could shift). Binding rule: **stream the PNG
  bytes to the socket; never decode to UIImage** — a 20 MB PNG decodes to
  100+ MB of bitmap.
- **Lifetime**: while the extension's UI is presented and `completeRequest`
  has not been called, it keeps running (chat apps upload with progress UI
  this way); after `completeRequest` it can be killed immediately. So: upload
  first with visible progress, write the pasteboard, *then* complete. No
  documented wall-clock limit, but kills on lock/host-app-swipe are real —
  spike on a throttled link.
- **No background story for SFTP**: background `URLSession` is **HTTP(S)-only**
  ([Apple docs](https://developer.apple.com/documentation/foundation/urlsessionconfiguration/background(withidentifier:))),
  and a share extension **cannot silently wake its containing app** — if the
  user dismisses mid-upload, the upload dies. Accepted v1 limitation, shown
  honestly (failure leaves the clipboard untouched).
- **Pasteboard**: `UIPasteboard.general` **writes are allowed and silent**
  from share extensions — the iOS 16 permission banner fires on *reads* only
  ([ref](https://sarunw.com/posts/uipasteboard-privacy-change-ios16/)). Only
  keyboard extensions are restricted. Cheap on-device test anyway.
- **Local-network privacy trap** ([TN3179](https://developer.apple.com/documentation/technotes/tn3179-understanding-local-network-privacy)):
  extensions inherit the *container app's* local-network permission, and an
  extension whose privilege is undetermined may be **silently denied** (the
  connection hangs in `.waiting`). Matters for dev boxes on raw LAN IPs
  (Tailscale/VPN/public IPs are unaffected). Mitigation: the main app
  pre-arms the prompt during onboarding via a "test connection" step.

### Which principles survive on iOS

| Principle | Verdict |
|---|---|
| No cloud relay / hosted infra | **Survives** — direct phone→host SSH; reachability is the user's existing Termius/VPN/Tailscale setup |
| Prefer explicit local control | **Survives** |
| Use the developer's existing SSH setup | **Half-survives** — same `authorized_keys` mechanism and host, but Hostbeam-specific key and host list on the phone |
| No credential storage in the app | **Needs documented amendment** — device-generated dedicated key in the Keychain (ADR 0016) |
| No interactive password/passphrase flows | **Survives** (publickey only) |
| Clipboard sentence contract, `/tmp/hostbeam`, never-overwrite, quiet failure | **Survive unchanged** |

## 3. Getting host config onto the phone

1. **Manual entry (v1)**: alias, hostname, user, port, remote folder — the
   same fields the user already typed into Termius; 1–2 hosts is the
   realistic count. Plus the onboarding "test connection" step (which also
   pre-arms local-network permission, §2).
2. **QR pairing from the Mac app (fast follow)**: Mac renders a QR of host
   settings (**never key material**); phone scans → configured. Later reverse
   leg: phone shows its public key; the Mac app offers to append it to the
   host's `authorized_keys` over the Mac's existing SSH.
3. **iCloud/CloudKit host-list sync**: parked, then **assessed and declined
   2026-08-31** — see questions.md § Mobile. The no-cloud tension is real but
   is not the strongest objection; the sandbox constraint (ADR 0008) and the
   asymmetric data models are.

## 4. Licensing and pricing (against ADR 0014)

- **Model**: free download, same fully-local **5 beams/day** free tier (zero
  network calls). A Hostbeam license lifts the cap as one of the seats;
  ADR 0014's "3 **Macs**" is reworded to "3 **devices**".
- **Fingerprint (verified)**: an app-generated UUID in the Keychain —
  `kSecClassGenericPassword`, **`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`,
  never `kSecAttrSynchronizable`**, in the shared access group. Keychain items
  survive uninstall/reinstall on all shipping iOS (undocumented but stable
  since the iOS 10.3-beta rollback; no iOS 18/26 change found) and
  `ThisDeviceOnly` items cryptographically cannot migrate to new hardware —
  so **a phone upgrade always consumes a new seat**, which makes the in-app
  **Deactivate** flow a hard requirement, and Keygen-side inactivity culling
  worth considering. One implementation trap: treat
  `errSecInteractionNotAllowed` (pre-first-unlock) as *retry*, never
  *regenerate* — regeneration mints duplicate fingerprints. Keygen's own iOS
  example uses `identifierForVendor`, which resets on plain reinstall for a
  single-app vendor — strictly worse; keep it only as support metadata.

### App Store review reality (verified — this reversed the session's first draft)

Guideline **3.1.1 names license keys verbatim** as a prohibited unlock
mechanism, and **3.1.3(b) is conditional**: web-acquired entitlements may be
honored *"provided those items are also available as in-app purchases"*
([guidelines](https://developer.apple.com/app-store/review/guidelines/)).
Apps surviving without IAP (Tailscale, Figma, 1Password) all use **account
sign-in framing** and mostly shelter under enterprise-sales rationale; indie
precedents cut the other way (HEY, ProtonMail; forum threads confirm raw
key-entry fields draw 3.1.1 rejections). Notably, **Secure ShellFish itself
chose the IAP route**.

**Decision for the draft ADR: ship a $29 non-consumable IAP from day one**
alongside key entry — the compliant 3.1.3(b) configuration (OmniFocus is the
canonical precedent):

- The IAP's App Store Server Notification hits the existing webhook worker,
  which mints a normal Keygen license (usable on Mac too — cross-platform
  entitlements from IAP are explicitly fine); REFUND notifications revoke it,
  mirroring the Paddle flow. Restore Purchases implemented (required).
- Key entry stays, framed as *"Already have a Hostbeam license?"* — with the
  IAP present this is formally sanctioned, not merely tolerated.
- No links to the web checkout from inside the app. The US external-link
  freedom (Epic v Apple contempt ruling, April 2025) is real today but under
  **active Supreme Court review** (cert granted June 2026) — don't architect
  around it.
- Small Business Program: 15% on the minority who buy in-app; Paddle remains
  the primary channel via the website.

## 5. Distribution reality

- **App Store only** (TestFlight for beta). Apple Developer individual
  enrollment (submitted 2026-07-04, pending) is the prerequisite.
- The iOS **sandbox is a non-issue**, unlike ADR 0008 on macOS: no config
  files to read, no processes to spawn — outbound sockets and its own
  Keychain. SSH clients are an unremarkable App Store category (Termius,
  Blink, Prompt, Secure ShellFish).
- Review risks, ranked after research: (1) unlock mechanism — resolved by the
  day-one IAP above; (2) "minimal functionality" — defused by the real main
  app; (3) **encryption export**: self-classify as mass-market 5D992.c
  (standard protocols; `ITSAppUsesNonExemptEncryption` questionnaire) — plus
  the **annual BIS self-classification report** (a US regulatory duty, not an
  Apple one) and the **French ANSSI declaration** (an SSH client is squarely
  "Secure Communications" under French control) — or exclude France from
  availability until filed.

## 6. Recommended v1 + spike

### v1 shape ("Hostbeam for iPhone", companion)

1. **One beam engine, two surfaces**: share-sheet extension (streamed SFTP,
   progress UI, pasteboard write before `completeRequest`) and a
   `Beam last screenshot` App Intent (Action Button / Back Tap / widget /
   Shortcuts). In-app picker as fallback.
2. Main app: host list (manual entry + test-connection onboarding), device
   key generation + public-key install helper, recent beams (7-day parity),
   License pane (IAP + "already have a license?" key entry, Restore
   Purchases, Deactivate seat).
3. SSH: Citadel, ed25519 device key only, direct TCP only.
4. Explicitly out: key import, ProxyJump, password auth, iCloud sync, QR
   pairing (fast follow), Android, non-image files.

### Spike checklist (kills the biggest risks, ~a day)

Throwaway extension + intent against stock Ubuntu 22.04 **and** 24.04 sshd,
plus one hardened config, over Wi-Fi and LTE+Tailscale:

1. KEX: `curve25519-sha256` negotiates when the server prefers PQ KEX
   (`sntrup761x25519` / `mlkem768x25519`).
2. Cipher: AES-GCM negotiates when the server prefers chacha20; **expected
   failure** against a chacha20-*only* server — document it.
3. Host keys: ed25519 and ECDSA-P256 verify; RSA-only host key = expected
   failure to document.
4. ed25519 userauth with an app-generated key installed via the one-liner.
5. Streamed SFTP upload of 2–20 MB inside the share extension: memory
   headroom vs the ~120 MB jetsam limit, survival on a throttled link
   (Network Link Conditioner), behavior on screen lock.
6. `UIPasteboard.general` write from the extension on a real device.
7. Local-network prompt behavior with privilege undetermined, from the
   extension and from the intent (TN3179 ambiguity).
8. App Intent variant: latest-screenshot fetch → upload → clipboard within
   the 30 s ceiling on LTE.
9. **Product test, same priority as the technical spike**: buy Secure
   ShellFish and attempt to replicate the full flow with its Shortcuts
   actions — the result calibrates how much differentiation actually exists.

### Phase 0 spike results (2026-07-05) — Citadel interop: PASS

Run the same day as a throwaway macOS SwiftPM harness (Citadel 0.12.x,
Swift 6.2/Xcode 26.3) against Dockerized sshd: Ubuntu 22.04 (OpenSSH 8.9),
Ubuntu 24.04 (OpenSSH 9.6, PQ-preferring KEX), and a chacha20-poly1305-only
hardened 24.04. Spike code was throwaway (session scratchpad, not committed);
these findings are the deliverable:

- **Ubuntu 22.04 and 24.04: PASS end-to-end** — connect + ed25519 publickey
  auth in 49–92 ms, `/tmp/hostbeam` mkdir (idempotent-tolerant), 8 MiB
  streamed upload in 64 KiB chunks at ~3.5 MiB/s (localhost), remote size
  exact, **md5 byte-identical** to the source payload.
- **PQ KEX fallback confirmed**: against OpenSSH 9.6 the session negotiated
  `ecdh-sha2-nistp384` + `ssh-ed25519` host key + `aes256-gcm@openssh.com`
  (from sshd DEBUG logs). Mild surprise: not `curve25519-sha256` — NIOSSH's
  client preference order put ECDH-P384 first; functionally fine, worth
  knowing.
- **chacha20-only server: fails as predicted**, surfaced as
  `NIOSSHError.keyExchangeNegotiationFailure` — a misleading, user-hostile
  error (it's a cipher mismatch, not KEX). The app must map this to a kind
  "this server's SSH configuration isn't supported yet" message.
- **OpenSSH key parsing: PASS** for both plain and passphrase-protected
  ed25519 private keys.
- **Collision suffix: PASS** — second run targeted `…-120000-2.png` after
  detecting the existing file.
- **Platform floor discovered**: Citadel 0.12 requires **macOS 14 / iOS 17**
  minimum — acceptable for the target audience; record in the milestone when
  opened.
- Minor: Citadel logs a spurious `SSH Server Error: NIOSSHError.tcpShutdown`
  on clean `client.close()` — log noise to suppress/ignore, not a failure.
- Harness note: the code compiled against Citadel's documented API on the
  first attempt — the library's ergonomics claim held.

**Conclusion: the ADR 0016 library bet is validated on macOS.** Remaining
spike items are iOS-device-only (extension memory/lifetime on a throttled
link, pasteboard write on device, local-network prompt) — Phase 1/2.

### Phase 1 spike results (2026-07-05) — engine + surfaces on the iOS runtime: PASS

Throwaway iOS app + share-extension (xcodegen project, Citadel wrapped in a
shared `BeamEngine` package, iOS 17 min), built and run on the iPhone 17 Pro
simulator (iOS 26.3) against the same Dockerized Ubuntu 22.04 sshd:

- **In-app beam: PASS end-to-end** — a bundled ~10 MB PNG streamed to the
  host, **remote md5 byte-identical** to the (build-processed) source, and
  `UIPasteboard.general` held exactly
  `Use this screenshot: /tmp/hostbeam/hostbeam-…​.png`. Citadel runs on the
  iOS runtime (arm64 sim), not just macOS.
- **Memory headroom is large**: streaming the 10 MB image peaked at **14.5 MB
  process footprint** — roughly 100 MB under the ~120 MB share-extension
  jetsam ceiling. Strong evidence the streaming approach (never decode)
  survives the extension memory limit, since the extension uses the identical
  engine. (Real jetsam enforcement is still device-only — the simulator does
  not enforce it — so this is predictive, not proof.)
- **Both bundle-ID nesting and platform-floor gotchas surfaced and were
  resolved** during the build: the extension's bundle id must nest under the
  app's; Citadel forces iOS 17 minimum.
- **Not yet driven**: the share extension was built and installed but not
  exercised end-to-end (the simulator has no scriptable tap; the share sheet
  is interactive). Its engine path is identical to the validated in-app path,
  so the residual extension-specific risks are exactly the device-only ones
  below. The Photos-permission prompt also can't be dismissed headlessly on
  the simulator — a real-device / UI-test concern, noted for Phase 2.

**Owner-driven hands-on run (2026-07-05):** the owner personally drove the
built app in the simulator — the in-app beam succeeded, and a second,
differently-sized image landed on the test host a minute later (consistent
with a share-extension beam of a sample photo), i.e. the primary product
surface exercised by hand, not just headlessly. Both files verified intact on
the server. The end-to-end concept is now confirmed by the product owner, not
only by scripts.

**Phase 2 (real device, needs Apple Developer enrollment — pending) remains
the only way to settle**: share-extension survival on a throttled link and on
screen lock, actual jetsam ceiling, pasteboard write from the *extension*
process, and the local-network permission prompt (TN3179).

### Second-order risks (not spike-killable)

- App Review outcome — mitigated to near-certainty by the day-one IAP.
- Termius shipping levelsio's request, or Anthropic Remote Control maturing
  image support — argues for a small, fast v1 rather than a big one.

## Rejected alternatives (recorded for the future)

- **Cloud relay upload**: violates the no-relay principle; the target user
  doesn't need it (they already reach the host from the phone).
- **Mac as bridge** (phone → Mac → host): fails exactly when the phone-only
  scenario matters (couch/commute).
- **russh/UniFFI for v1**: no iOS precedent, FFI + tokio runtime + binary
  size inside a memory-capped extension; Citadel first, Blink's libssh-apple
  as plan B.
- **Background URLSession for the upload**: HTTP(S)-only — would require a
  server-side HTTPS receiver, i.e. new host-side software, which breaks
  "works with a bare SSH box".
- **iCloud/AirDrop to the Mac, beam from there**: more steps than the problem.

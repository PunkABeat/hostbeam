# Research Questions

Open questions live here until resolved by research, prototype evidence, or ADR.

## Product

- What exact UI/UX changes are required for Milestone 005 to make the prototype feel like a polished compact macOS utility?
- What is the best menu-bar layout for upload action, recent history, settings, and diagnostics?
- Should host reachability be displayed with a status dot or another compact indicator?
- Should local history show only the last five uploads in the menu-bar dropdown?
- Should fuller history live in a popover, settings/history window, or another surface?
- What should the default local history folder be on macOS?
- Should remote cleanup ever be automatic, optional per host, or never supported?
- What should the future arbitrary-file-transfer product shape be if screenshot upload proves useful?
  **Decided 2026-09-26 by the owner:** "anything you hand over", not file
  transfer — scope by intent rather than by file type; browsing and syncing
  stay out. Recorded in ADR 0006's and ADR 0020's amendments; reasoning in
  [differentiation-brainstorm.md](differentiation-brainstorm.md) § 5, bet 5.
  Not built yet: `docs/process/next.md` § 10, its first step.
- About says "Nothing leaves your Mac except the screenshot you beam", but the
  daily update check asks download.hostbeam.app for `latest.json` (and so
  reveals the Mac's IP), and the licence check calls Keygen. "Check for updates
  automatically" can now be switched off (ADR 0022). Should the line name those
  two requests, or is "nothing about you or your screenshots" the promise it
  means? Left as is until decided.
- **Direction, now that the upload is a commodity (open, 2026-09-26).** Should
  Hostbeam move from screenshot uploader to a two-way visual channel for
  agents people run themselves — the agent reacting to a beam, the host found
  for you, context computed on the device, and later the way back (thinly
  evidenced so far; three checks first) and the agent asking to see? The owner endorsed the proposals as a set; each
  still needs its decision (the pitch, the iPhone launch route, the two-way
  bridge, an MCP server that writes, any file you hand over, typing the path
  on the host, an SSH connection the Mac owns for a session, the free tier):
  [differentiation-brainstorm.md](differentiation-brainstorm.md) § 6. The
  pitch was settled for the launch on 2026-10-03: "Agent on a server? Show it
  anything. See what it built." ([launch-day.md](../process/launch-day.md)
  § The message).
- **Agent-first (explored 2026-09-26, no restrictions assumed).** Should the
  agent become Hostbeam's main user — capturing windows, reading your
  browser's console, driving the simulator and asking you on the phone, all
  under rules you set once? It would step outside the no-account, no-relay
  principles, so it is recorded as an exploration, not a proposal:
  [agent-first-brainstorm.md](agent-first-brainstorm.md).
- **Beyond screenshots (explored 2026-09-26).** Hostbeam's asset is the bridge
  between your devices and your agents' machines, not the image. Is the next
  product a clipboard that works both ways, links and logins that open
  locally, and previews that open by themselves — "everything VS Code Remote
  does for the boundary, for people who live in a terminal"? The owner flagged
  the two-way clipboard as a possible product of its own, to explore next:
  [beyond-screenshots-brainstorm.md](beyond-screenshots-brainstorm.md).
- **The two-way clipboard (explored 2026-09-26, open).** As a separate product
  the evidence says no; as Hostbeam's core — Ctrl+V working in remote agents,
  copies coming back to the Mac and iPhone, an agent outbox, consent built in —
  it is the strongest idea of the day. Tests before building and the decisions
  it needs: [two-way-clipboard.md](two-way-clipboard.md) §§ 7–8.

## Localization (decided 2026-07-05)

Launch **English-only** for the marketing site, the /buy + /thanks pages, and
the license email — deliberately, not by omission:

- Paddle's checkout already auto-localizes (30+ languages, local currencies and
  payment methods) — the highest-stakes moment is covered for free.
- The audience (developers running remote coding agents) searches and reads in
  English; site localization would multiply the copy-maintenance and
  claims-drift surface ×8 before a single sale.
- The license email is six plain lines after an English checkout; localizing it
  would require guessing language from Paddle country data, which mis-fires.
- Revisit **data-driven** after launch: Paddle's dashboard shows buyer
  countries; if a segment emerges (e.g. Japan), localize the site for that
  locale first.
- Where language effort IS warranted pre-launch: a **native review of the
  app's 8 machine-quality locales** (especially zh/ja/ko) — paying users live
  in the app, not on the landing page (see the open items in `docs/process/progress.md`).
- **Reconfirmed 2026-08-27** after the site redesign and the iPhone app:
  English-only site holds (the redesign iterated copy three times in two
  days — every pass would have been ×8), and two things are new. (1) The
  **App Store listing** is the localization move for this launch: localize
  the ASC metadata (description, keywords, screenshot captions) into the 8
  app languages at submission — one-time, no churn, and it's where
  non-English users actually discover apps; the app they land in already
  speaks their language. (2) The data instrument now exists: Cloudflare Web
  Analytics country breakdowns + Paddle buyer countries are the trigger for
  any future per-locale site page.

## Mobile (ADR 0016 draft, 2026-07-05 brainstorm + verification research)

See `mobile-companion-brainstorm.md` for the session record and sources.
Resolved that day (recorded there and in ADR 0016): library = Citadel
(ed25519-only, Blink's libssh-apple as fallback; russh rejected for v1),
fingerprint = Keychain UUID (`AfterFirstUnlockThisDeviceOnly`, never
synchronizable), App Review = day-one $29 IAP alongside key entry
(3.1.3(b)-compliant), pasteboard writes from extensions confirmed silent.

Still open:

- Secure ShellFish reconnaissance (demoted from gating decision, owner call
  2026-07-05 — positioning is ease-of-use + workflow fit, not capability
  exclusivity): still worth ~$10 to see its share/Shortcuts UX and know the
  "just use ShellFish" objection firsthand.
- What does "adapts to the user's workflow" require in v1 beyond the
  clipboard sentence? Candidates: per-host copied-text templates (different
  agents want different phrasing — earlier than the Mac app's "later
  setting"?), per-host remote folder, and whether the success banner should
  deep-link back to the user's SSH client (is that even possible per app —
  Termius/Blink URL schemes?).
- Spike unknowns (Phase 0 macOS interop + Phase 1 iOS-simulator spikes both
  PASSED 2026-07-05 — see the brainstorm doc's results sections; PQ-KEX
  fallback, chacha20-only failure mode, engine-on-iOS-runtime, pasteboard
  write from the app, and ~14.5 MB peak memory for a 10 MB streamed upload
  are now answered). Genuinely device-only, blocked on Apple Developer
  enrollment: share-extension survival on a throttled link and on screen
  lock; the real jetsam ceiling under load. **Answered on device 2026-08-30**:
  the share extension writes the pasteboard fine, and TN3179 is a non-issue in
  practice — once the *app* has been granted local-network access (the
  onboarding test connection does it), the extension connects to a LAN host
  without a prompt of its own. The extension's real blocker was unrelated and
  is fixed: it read the device key from its own Keychain access group, found
  none, and minted a second identity (milestone 008, "The share extension
  beamed with a key no host had authorized").

- **Simulator blind spot, learned the hard way 2026-08-30.** The simulator does
  not enforce Keychain access groups, so any cross-process key sharing looks
  correct there and can be broken on every real device. Milestone 008's
  acceptance criteria exercise the share extension in the simulator; that is
  not sufficient for anything touching the Keychain. What else in the criteria
  is simulator-verified and process-crossing?
- Ship-risk watch: Termius implementing levelsio's image-paste request;
  Anthropic Remote Control maturing image upload. What signal (or timeline)
  would make us drop or accelerate the iOS app?

  **Both halves have landed** (checked 2026-09-25 and 2026-09-26, before our
  submission): Termius for iPhone pastes images into the terminal since 7.5.0
  (July 2026), and Anthropic's Remote Control docs list attaching photos from
  the Claude app. Evidence, sources and what is still unverified:
  § Competitive landscape, "Termius and Anthropic Remote Control".

  **Corrected 2026-09-26: the Mac app is affected too.** This entry said it was
  not. The same upload now ships on the Mac (cmux, Herdr, FainLane, the Codex
  app) and on Android (Termius 7.8.0): § Competitive landscape, "The upload is
  everywhere, desktop included".

  **Decided 2026-09-27 ([ADR 0028](../adr/0028-free-to-use-with-a-reminder.md)):
  launch it, free, with no in-app purchase** — the App Store as a way in, not a
  till. That drops the IAP, its notifications and (per Apple's own page) the
  Paid Apps agreement, tax and banking from the list below; confirming in App
  Store Connect that nothing else hangs on the D&B address change is what is
  left. The question as it stood:

  **Open for the owner:** is what Hostbeam for iPhone still has over both
  (listed there) enough to be worth what launching still takes, now that the
  building is done? That is Apple
  admin (D&B, then the Paid Apps agreement, tax and banking; the IAP and its
  notifications), the review host and store assets, and afterwards a second
  platform to keep up through App Review. France and export compliance are
  already settled (France out until an ANSSI declaration; the encryption is
  exempt). Compare side by side first, on a real phone against
  `hostbeam-testhost`.

  **Two inputs added 2026-09-26**
  ([differentiation-brainstorm.md](differentiation-brainstorm.md) § 5): a
  pitch neither competitor can make — "share from your phone and your agent
  reacts", once the host-side hook wakes the session — and a third route,
  launching free with no in-app purchase, which should need only the Free Apps
  agreement and so skip the D&B → Paid Apps → tax → banking chain
  (*unverified*; confirm in App Store Connect first).
- ~~IAP ↔ Keygen glue~~ — designed 2026-08-23 (see milestone 008 § Slice 6
  plan): notifications route with JWS verification, idempotent mint by
  originalTransactionId, refund → suspend; delivery is **in-app only**
  (Apple exposes no buyer email). Implementation paused by owner.
- Free-tier metering must live in code shared by the app, the share
  extension, and the intent (app-group container) — what is the correct
  storage so all three surfaces count the same day consistently?
- Secure Enclave-backed key (P-256 → `ecdsa-sha2-nistp256`) as a later
  upgrade: worth the ecdsa-vs-ed25519 tradeoff? (Citadel's fork supports
  external signers; Blink/Prompt prove the pattern on iOS.)
  **Assessed 2026-09-25: not before launch.** Termius's SSH ID sells exactly
  this ("cannot be exported"), which is what raised it again. The key is
  already hard to take: generated on the phone, never exported, stored
  `AfterFirstUnlockThisDeviceOnly` (`DeviceKey.swift`), so it never reaches
  iCloud Keychain or another phone. Getting it out takes a jailbroken or
  forensically cracked phone. The Enclave only helps in that case, and only
  partly: code running on the phone can still *use* an Enclave key while it is
  there; it just cannot take it away. That already beats the usual key for the
  same server, a plain file in the Mac's `~/.ssh`, often with no passphrase.
  Against that: a new key type and a new signing path in the most bug-prone
  code in the app (the share extension once minted a second identity), just
  before submission. Its real value is trust and marketing ("the key cannot
  leave the chip"). No Face ID per beam if it is ever built: the Shortcuts
  action runs in the background, where Face ID cannot be shown. Switching is
  cheapest before the App Store release; after it, every installed phone
  needs re-authorizing on every host. Worth that cost only if reviewers or
  users ask, or if Hostbeam sells to companies with compliance checklists.
- Phone-upgrade seat burn: is Deactivate-on-old-device enough, or should the
  worker/Keygen cull inactive machines automatically (heartbeat/inactivity)?
- ~~QR pairing payload format / reverse leg~~ — resolved: payload shipped
  (hostbeam-host/v1, config only); the reverse leg was built 2026-08-23 (the
  PairSheet's "Authorize the iPhone" paste field → `install_pubkey` appends
  over the Mac's SSH; strict ed25519-line validation both ends). One-time
  password authorize on the phone was floated and **rejected by the owner
  (2026-08-23)**: even a never-stored password field normalizes password
  auth on servers — the practice hardened setups disable first. Standalone
  phones install the key via an SSH session the user already has (their SSH
  app, a cloud console) — needing existing access to add a credential is
  SSH's trust model, not a product gap: **Hostbeam inherits access, never
  creates it**. Remaining follow-up: a copy pass so onboarding/device-key
  wording presents the Mac-assisted and phone-only paths neutrally.
- Is there real demand for ProxyJump/bastion support from phones, or do
  Tailscale/VPN setups make direct TCP sufficient?
- Remote-folder *browsing* (pick the screenshot destination from a server
  directory tree) — **considered and rejected 2026-08-23**: the folder is a
  set-once scratch destination, `mkdir -p` makes typing forgiving, and
  diagnostics already verify writability; a tree browser is a mini SFTP
  client (per-click SSH round-trips, permissions/symlink/new-folder UI) that
  drifts the product's character (ADR 0006 scope). If folder-typing friction
  ever shows up in feedback, the designated shape is inline **path
  completion** on the field (debounced `ls -1dp <prefix>*`), not a browser.
  Cheap adjacent improvement, also deferred: live "exists · writable"
  feedback on folder fields using the existing probe machinery.

- LocalSend-style P2P transfer between desktop and mobile — **considered and
  rejected 2026-08-23**: Hostbeam's devices share infrastructure (the SSH
  host is the rendezvous); a P2P channel would add a second transfer stack,
  multicast discovery, cert trust ceremonies, and the iOS Local Network
  prompt (TN3179) for a data path the model doesn't need. The one borrowable
  *use case* — "beam from iPhone straight to my Mac" when the agent runs
  locally — already works over macOS's built-in SSH server (Remote Login) and
  needs only an affordance: a **"Share this Mac to iPhone"** option in the
  desktop pairing flow (QR for `<hostname>.local` + current user, prompt to
  enable Remote Login, existing authorize leg; UI notes the same-network /
  Tailscale caveat). Designed, not yet built.

- Direct Mac↔iPhone pairing over the LAN (phone discovers the Mac, pulls host
  config, posts its public key) — **considered and rejected 2026-08-30**. It is
  easy to build and circular to secure: a service handing out your host list and
  accepting public keys cannot be open to everyone on a coworking or hotel
  network, so it needs a secret established out of band, and the natural way to
  show one between a Mac screen and a phone camera is a QR code. You would scan
  a QR to bootstrap the channel meant to replace the QR.

  It also arrived after its own justification shrank: with ADR 0018 the
  copy-paste is once per *device*, not per host, so mDNS + a listener + a trust
  ceremony + TN3179 would remove one scan and one paste, once per phone. And it
  changes what the Mac app is — today it makes outbound SSH connections and
  listens on nothing; an inbound listener is a different posture, a macOS
  firewall prompt, and silently broken by AP client isolation on exactly the
  guest networks where it would be most wanted. Apple already provides the
  trusted device-to-device channel the idea wants: Universal Clipboard and
  AirDrop, both already used by the authorize step.

  **The borrowable part turned out to be already built** (noticed the same day,
  after it was first written up as a cheap idea): the no-camera path exists end
  to end — the Mac's "Copy pairing text" puts the `hostbeam-host/v1` JSON on the
  clipboard, Universal Clipboard carries it, and the iOS scanner's "Paste
  instead" consumes it. AirDrop would add only the case where Universal
  Clipboard is unavailable (different Apple IDs, Handoff off, not signed into
  iCloud), and is not the few lines it first looked like: receiving it needs a
  registered document type on iOS plus routing into the confirm form, and the
  Mac side needs the macOS share sheet called from Rust. Narrow gap, real cost —
  not worth it unless that case shows up in feedback.

  The want underneath is probably host-list *sync* rather than pairing, which
  LAN P2P suits badly (both devices awake, same network, same moment) — see the
  CloudKit question immediately below.

- Host-list sync via CloudKit private database: does "user-controlled Apple
  E2E storage" pass the no-cloud principle, or stay manual forever?
  **Assessed 2026-08-31 — not worth building; the case is weaker than when it
  was parked.** Details, because the reasoning is what will matter if this comes
  back:

  *Pairing and sync are different problems, and only one is still open.* ADR
  0018 took host 2..n down to one click plus one scan, and the phone is not
  needed until the scan. iCloud would remove the scan and nothing else — the
  authorize step is an SSH operation against the host, not data, so it survives
  either way. Five seconds, against a scan that is arguably a feature: an
  explicit physical act of consent that *this* phone gets *that* host.

  *The gating question is the sandbox, and it is unverified.* ADR 0008 disables
  the App Sandbox and forbids re-enabling it without an ADR that redesigns SSH
  config access. iCloud Documents and key-value storage have historically
  required the sandbox on macOS; CloudKit may not. **Verify that first** — every
  other consideration is moot if it fails.

  *The data models are asymmetric.* The Mac's host is a *reference* (an alias
  into `~/.ssh/config`); the phone's is a self-contained record. Since 0.1.9 the
  Mac can resolve one into the other via `ssh -G`, so Mac → phone is newly
  possible. Phone → Mac is the direction that breaks something: the Mac would
  hold hosts that are not in `~/.ssh/config`, making Hostbeam a *source* of host
  configuration rather than a reader of it, against "Hostbeam inherits your
  access; it never creates it". One-way avoids that, and one-way is not sync.

  *Two things must never sync, and they are the load-bearing ones.* **Pinned
  host keys** — TOFU is per-device evidence ("I saw this key, from this
  device"); syncing a pin makes one device's trust decision silently become
  another's, and a MITM against one poisons the other. **The device key** — ADR
  0016 §4 makes it deliberately non-migratable because licence seats count
  devices. What is left to sync is the least sensitive and least valuable data
  in the app.

  *The question's own premise needs checking.* A CloudKit private database is
  encrypted in transit and at rest, but **Apple holds the keys unless the user
  has Advanced Data Protection on**, which most do not — so "user-controlled
  E2E" is conditional, not given. CloudKit's per-field `encryptedValues` (keyed
  from the user's iCloud Keychain) may be genuinely E2E regardless; confirm
  before answering the principle question either way. It matters because the
  site answers "What ever leaves my machine?" with "Your screenshot, to your
  host, over your SSH… no analytics, no crash reporters, no phone-home", and
  syncing host names and addresses to Apple would need that sentence caveated.

  *What is real underneath, and is not sync:* **there is no update path at all.**
  The QR is one-shot, so renaming a host or changing its remote folder on the
  Mac leaves the phone on the old value forever — and re-scanning cannot fix it,
  because `nameTaken` in `HostEditView` refuses to save a host whose alias
  already exists. Delete and re-add is the only route. Letting a re-scan
  *update* an existing host would capture most of what sync promises, for a
  fraction of the cost and with no cloud dependency. **That is the thing to
  build if host drift is what prompts this again.**

  *Kept on the list, both sharper with real users:* a **second Mac** (manual
  hosts, folders and paired devices sync Mac-to-Mac not at all today), and
  **restoring after a phone replacement**.
- ~~Does the 5 beams/day free tier need a different number on mobile, given
  lower expected beam volume?~~ Moot: the iPhone app is free with no counter
  (ADR 0028).
- France availability at launch: file the ANSSI declaration first, or exclude
  France until filed? (Annual BIS self-classification report needed either
  way.)
- Android companion: out of scope until iOS proves the concept — what signal
  would justify it? Assessed 2026-07-05: React Native was considered and
  rejected for iOS v1 (the hard parts — share extension under the ~120 MB
  cap, App Intents, SSH engine, Keychain/StoreKit — are all native-only; RN
  would share only the thin settings UI). If Android happens, the credible
  options are a small native Kotlin twin (sshj; share targets and background
  uploads are easier there) or extracting a shared Rust core (russh) with
  thin native UIs, mirroring the desktop's Rust-core shape — decide then,
  with usage data. Keep the iOS core cleanly separated from UI so the port
  stays cheap. Note: Google Play has its own billing-requirement rules
  (rhymes with the Apple IAP question), though direct APK distribution is
  possible on Android.

## Monetization (ADR 0014)

- How exactly is the license key delivered — Paddle receipt customization, a transactional
  email from the glue function (e.g. Resend), or success-page display only?
- Where does the glue webhook function run (Cloudflare Workers, Vercel, other), and under
  what domain?
- Do EU consumer-protection rules (withdrawal rights for digital goods) require specific
  checkout wording, and does Paddle's default checkout already cover it?
- ~~Should the free-tier daily counter be mirrored in the Keychain, or is plain config
  storage enough?~~ Moot since ADR 0028: no counter blocks anything, and the
  reminder's count in `license.json` only paces a line of text.
- **New with ADR 0028:** are 7 days and every 10th beam the right numbers for
  the reminder? No telemetry can say; the first months' Paddle sales and
  support mail are the only signal. The constants are in
  `src-tauri/src/licensing/mod.rs`.

## Being found (opened 2026-10-03)

The owner wants to explore these "at some point"; the launch boards are
settled in [launch-day.md](../process/launch-day.md). Where each starts from:

- **LLM search** — being the tool an assistant names when asked how to show
  an agent on a server a screenshot. The groundwork exists: `/llms.txt`, and
  `robots.txt` lets AI crawlers in. What moves it now is being mentioned where
  assistants read (HN, Reddit, GitHub lists, comparison pages), which is the
  launch itself. Cheap first step: ask the main assistants those questions
  before launch, note which tools they name, and ask again after. **Asked
  2026-10-03** ([ai-answers/](ai-answers/README.md)): no answer names
  Hostbeam; asked for a Mac app, Claude Code, Codex and ChatGPT all name
  Paste2SSH; products appear only when the assistant searches the web.
- **SEO** — the site has no page for the questions people type (the marketing
  plan of 12 Sep listed seven, led by "how to code from your phone with Claude
  Code"). Pages take weeks to be found, so this is the one to start before
  launch: a `/guides` section, two pages first. **Built 2026-10-03:** pasting a
  screenshot into Claude Code over SSH, and opening the agent's dev server on
  the Mac ([apps/web/README.md](../../apps/web/README.md) § Guides). The
  code-from-your-phone guide waits for the iPhone app, which it needs.
- **ASO** — the listing and keywords are written in eight languages. The work
  starts after release, when App Store Connect shows which searches find the
  app; keywords change only with a new version.
- **Paid ads** — the marketing plan's arithmetic still holds: about $0.50 per
  visitor ($29 once, at a guessed 2% conversion) against $2–6 a click, and
  with the app free a visitor is worth less up front. If tried at all, after
  launch, once a free channel has shown who buys: a small, capped Apple Search
  Ads test on narrow keywords (untested).

## Security

- What threat model applies before implementing image upload?
- What command construction rules are required to prevent shell injection?
- How should host aliases, wildcard SSH config entries, and included files be handled?
- Which SSH config directives should be parsed, ignored, or treated as unsupported?
- What sensitive values must be excluded from logs and diagnostics?
- What remote path values are safe to display in UI or notifications?
- Should uploads have a local audit history, and if so what should be redacted?
- How should local full image history be protected, disabled, cleared, and retained?
- What security review is needed before supporting interactive SSH password or passphrase flows?
- What security review is needed before supporting remote auto-cleanup?

### Ctrl+V over SSH: the consent model (open, 2026-09-27; parked 2026-09-28)

Parked with the helper it belongs to: a beam now copies just the path, which
agents attach as the image with nothing on the host (next.md § 10a). It comes
back only if the helper does.

next.md § 10a's spike works, and settled one thing the consent model rests on:
while the Mac's connection is up, **every process of that user on the host can
read what the Mac serves** — the agent included, and anything that has
compromised the account. The stand-in can label who asked (Ctrl+V and the
agent's shell have different parents) but cannot enforce it: the socket is
reachable directly. So the Mac decides, never the asker. Open:

- **Per read, per grant, or per item?** A prompt on every read breaks the
  point of Ctrl+V. A time-limited grant per host ("devbox may read images for
  30 minutes") is simple and leaks anything copied meanwhile. Limits on what
  is served — only images, only one copied in the last few minutes, never a
  password manager's — keep Ctrl+V instant and cap what a prompt-injected
  agent could take to "the screenshot you just copied". A HUD naming the host
  on every read makes any of them visible.
- **Text.** The spike serves images only. Text is where secrets live;
  `pbpaste` from an agent is the exfiltration path the research warned about.
- **Apple.** macOS previewed alerts for pasteboard reads the user did not
  start (15.4, absent from 26). A read on a server's request is exactly that;
  if enforced, every Ctrl+V could show a system prompt.

### The iPhone refuses a chrooted SFTP account's own folder (found 2026-09-28, open)

SFTP has no "who am I", so `isOwnedByLogin` (`CitadelTransport.swift`) takes
the folder a session starts in as the login's own and refuses a beam folder
owned by anyone else (review § D1). Under sshd's `ChrootDirectory` the session
starts at the chroot's top, which sshd requires to be root's, so every folder
the account really owns is refused: "The remote folder belongs to another
user." Found on submission day, when the review host's checks passed and the
owner's beam from build 11 failed; the host now starts sessions in the folder
(`internal-sftp -d`, `scripts/reviewhost/sshd.conf`), and `reviewhost.sh
check` makes the app's comparison.

Real users hit it only on an SFTP-only, chrooted account, where no agent can
run, so it did not hold 1.0. Open for 1.0.1: a file the session itself creates
is the login's by construction, so compare the folder with a probe written
into it (one more round trip, and a stray file if the beam dies between), or
accept a root-owned start folder as "cannot tell" rather than "someone else"
(which re-opens D1's fail-open on a server that starts everyone at `/`). The
Mac is unaffected: it needs a shell, which such an account refuses anyway.

### Any file you hand over: what is still open (built 2026-09-26/27)

Built on the Mac and the iPhone (next.md § 10's first step); these are the
edges it left. (The iPhone's Clean up moved to the same stamp rule on
2026-09-27, so the two apps now count and clean the same set.)

- **The iPhone's pre-2026-09-13 names** (`hostbeam-2026-08-28-153012.png`) are
  no longer counted or removed by the Mac — the owner accepted it; only test
  builds ever wrote them. Remove by hand on the test hosts if they matter.
- **A file with no extension is invisible to the agent tools.** Their `NAME`
  pattern requires one; decide with ADR 0020's amendment (10a).
- **The secret list is a heuristic.** Names and a private key's armour line;
  it misses a token pasted into `notes.txt`, and it asks about a public
  certificate in a `.pem`. Widen from real misses, not guesses.
- **The iPhone carries a shared file's name from `suggestedName`**, falling
  back to the file's own. For photos that is often `IMG_1234` or
  `FullSizeRender`, which names nothing; the Mac has the same with a dragged
  Photos item. Fine until someone minds.
- **Auto-beam's race.** It decides from the clipboard's types, then the beam
  reads the clipboard again; a file copied in Finder in that instant would be
  beamed as a file. Closing it means telling the beam it came from auto-beam.

### App Store key exchange: the signed transaction is required (decided 2026-09-25)

`POST /appstore/key` returns the licence key for an App Store purchase. An id
alone is on Apple's emailed receipts, so the app sends the transaction as
StoreKit signed it on the buyer's device and the worker verifies it against
Apple's certificate chain (`apps/license-webhook/src/appstore-jws.ts`;
review § D2). Whether to go on serving id-only requests was open, on the
assumption that installed 1.0 clients sent only the id. They do not exist: the
iPhone app had not reached the App Store when this was settled (only
TestFlight builds, which update), so the worker requires the signed
transaction from the start and strands no buyer. A TestFlight build older than
2026-09-24 can no longer redeem; install a newer one.

### The Mac writes beams in place (decided and done 2026-09-25: option B)

The iPhone uploads each file under a hidden `.hostbeam-….part` name and
renames it into place once complete, so a `hostbeam-*` name never points at
half an image — which matters because the prompt hook attaches any recent
`hostbeam-*` file, including one still arriving. The Mac's `scp` still writes
to the final name (`send()` in `beam.rs`, one `scp` per file, each on its own
connection with `ControlPath=none`).

Measured against the test host with 50 ms added, 2.5 MB files, best of three:

| | one file | five files |
|---|---|---|
| today: `scp` per file | 1.56 s | 7.60 s |
| A: same, then `mv` on a fresh connection | 2.26 s | 8.27 s |
| A: same, `mv` on a shared (ControlMaster) connection | 1.67 s | 7.68 s |
| B: one `sftp -b` session, `put` + `rename` per file | 1.61 s | 3.22 s |

B is effectively free for one file and more than twice as fast for a batch,
because one connection replaces one per file; it stays a direct connection
(`ControlPath=none`), and modern `scp` already speaks SFTP, so the
bandwidth-starved regime should not change — to be re-measured, as `send()`'s
comment asks. Its cost is code: per-file progress for the HUD, which files
landed in a partial batch, and error classification all come from one
process's output instead of one exit status per file. **Chosen by the owner
and built the same day** (`ssh::upload`): progress comes from sftp's echo of
each command as it starts it, tested against a stub (`tests/fake_ssh.rs`) and
the real test host (`tests/testhost_upload.rs`). sftp's own `rename` replaces
an existing file on OpenSSH, as `scp` did; the Mac's names are unique per
gesture, so nothing is there to replace.

Re-measured 2026-09-26 with 250 ms added (a server on another continent; a
fresh login takes 3.2 s), same files, one run each: `scp` per file 6.95 s for
one file and 27.7 s for four, B 7.2 s and 12.6 s. In the dev build, four
screenshots started uploading at once (previews now decode alongside) and
landed in 12.1 s, the HUD counting each file; the owner confirmed it.

### A published key URL: parked until Hostbeam has accounts (2026-09-25)

Termius's SSH ID (in the app since 7.2.0, November 2025; announced May 2026)
publishes each user's device public keys at `sshid.io/<handle>`, and a host is
authorized with `curl -fs https://sshid.io/<handle> >> ~/.ssh/authorized_keys`.
The Hostbeam version would be a page like `hostbeam.app/k/<id>` serving the
phone's public key, so an iPhone-only user authorizes a host with one command.

**Not now.** It needs a server that stores keys and an account that owns them.
That goes against the fully local free tier (ADR 0016 §4) and against the line
ADR 0024 holds for pairing links, whose details "reach no server, hostbeam.app
included". Both paths it would shorten already exist without it: the Mac's
one-click Authorize (ADR 0018) and the iPhone's ready-made
`echo '…' >> ~/.ssh/authorized_keys` line.

**Revisit if Hostbeam ever gains a user account** (host sync is the likeliest
reason: see the CloudKit question under Mobile). If it does, close the gaps
SSH ID leaves open instead of copying it:

- **Removing a key, not only adding one.** `>>` only appends, and Termius's
  docs leave a removed device's line on every server for the user to delete by
  hand. Either the URL *is* the authorized list (served through
  `AuthorizedKeysCommand`, at the cost of every login depending on the site
  being up), or removal ships with it. ADR 0018 §3 still applies: "which devices
  can reach my servers" must be answerable.
- **Fetching the list is an act of trust.** Whoever controls the page decides
  what the next server accepts, and SSH ID's docs do not say what happens if a
  handle or the site is compromised. Sign the list with a key only the user's
  devices hold, and make the server-side step verify it.
- **Public keys only.** Private keys never sync; the device key stays
  device-generated and never exported (ADR 0016 §2).

### Removing a device from every host: wanted, with conditions (2026-09-25)

Removing a remembered device in Preferences → Hosts only stops the Mac from
installing its key on new hosts. The line stays in `authorized_keys` on every
host it already went to, so a lost or replaced phone keeps its access until
someone edits each host by hand. SSH ID has the same gap.

The idea: removing a device offers to take its line off every host the Mac can
reach. **Owner's conditions (2026-09-25): the user explicitly approves it, and
sees exactly what would be removed before anything is.**

**Decided: [ADR 0027](../adr/0027-remove-a-device-from-every-host.md)**
(accepted 2026-09-26), which carries the design. One change from the first
sketch here: a line matches by the key, not by its exact text, so a copy of the
same key added by hand under another comment or with options also goes. Every
match is still shown verbatim before anything is removed. Not built: it needs a
milestone or a `next.md` item before any code.

## Platform

- What are the platform clipboard APIs and permission prompts for image reads?
- What are the platform-specific constraints for global hotkeys?
- What are the platform-specific constraints for macOS menu-bar presence?
- How should native notifications be handled per platform?
- Can macOS notifications practically include image thumbnails?
- **Windows and Linux (open, 2026-09-26):** which first, whether one licence
  covers every platform, and what signing and packaging cost. These are the
  decisions that open [milestone 009](../process/milestones/009-windows-and-linux.md).

### Two desktop bugs found testing the Raycast extension (decided and fixed, 2026-10-06)

Both seen on a mixed-scale setup (laptop as the main display, two externals
above it) in 0.1.33, both fixed in code the same day and not yet released. Neither
was in the Raycast extension.

- **The popover always opened on the main display**, and a tray click's x was
  read as if on the main screen's menu bar, so a click on an external's menu
  bar or Dock opened it out of sight. Nobody chose this: `2ecdeb3`
  (2026-09-24) fixed it opening off every screen and kept the screen it was
  using. **Now** the popover and the beam HUD open on the screen holding the
  pointer — under the icon for a tray click, at the right edge otherwise —
  read from Quartz in points (`popover::target_screen`), the main display only
  if Quartz cannot say.
- **A host that dropped out of `~/.ssh/config` silently moved where beams
  went** — at launch `config-bridge.ts` dropped it from `addedIds` and the
  popover fell back to the first host, here a real server — and the
  popover read `~/.ssh/config` only at launch. **Decided by the owner: keep it
  and refuse to beam.** Recorded as [ADR 0003's 2026-10-06
  amendment](../adr/0003-use-system-openssh-first.md).

## Competitive landscape (checked 2026-09-20)

**Cloudflare Quick Tunnels** (`try.cloudflare.com`), assessed after the owner
flagged its new landing page. Verdict: **not a competitor.**

The capability is years old (`cloudflared tunnel --url`); what is new is the
positioning — "Localhost, meet the _Internet_", "No account. No DNS. No open
ports.", and JSON output pitched explicitly at coding agents. It exposes a local
*port* to the public internet; it does not move a *file* to a host you control.
Nothing on the clipboard reaches an agent through it without a local HTTP server
in between, and the URL it returns is a public, unauthenticated random subdomain
— no SLA, 200 in-flight requests, "intended for testing and development only"
per Cloudflare's own docs. The contrast sharpens Hostbeam's "no cloud account,
relay service, or hosted infrastructure" promise rather than threatening it.

Open, and worth re-checking whenever agent vendors ship local-access features:

- **Does the agent workflow shift from "see my screenshot" to "drive my running
  app"?** If remote agents routinely tunnel into a local dev server and drive it
  headlessly, some screenshot round-trips disappear. Bounded: that covers only
  the user's own web app in a browser — never native UI, a design tool, another
  window, a phone screen, a PDF, or an image someone sent them. Hostbeam is
  clipboard-shaped, not app-shaped, and that is the answer when the objection
  comes up.
- **Transport was never the moat** — SSH is free plumbing too. A
  clipboard-over-tunnel clone is a plausible weekend build; the keystroke, the
  host picker, host-key pinning, the returned agent sentence and the iPhone
  share sheet are not. Positioning should keep reinforcing those, not the pipe.

Worth borrowing from that page (copy and measurement only — no implementation
scope implied):

- **A negative-space line above the fold.** Cloudflare's sub-headline is three
  things you don't have to do. The hero states the transformation and the
  paste-ready sentence well already, but the privacy claim only appears further
  down the page. Hostbeam can out-claim them there: no cloud, no account, no
  relay, your keys, your host.
- **A concrete number — measured 2026-09-20, and it is not printable yet.**
  Timed from the owner's Mac against throwaway Hetzner boxes (`reviewhost-deploy.sh`, torn
  down after), reproducing `send()`'s exact path: `ssh` mkdir, then `scp` with
  `ControlPath=none`, same options as `services/ssh.rs`.

  | Host | RTT | 45 KB | 1.9 MB |
  |---|---|---|---|
  | `hostbeam-testhost` (OrbStack) | ~0 | 0.15 s | 0.20 s |
  | US west (hil) | 130 ms | 3.44 s | 4.26 s |
  | EU (fsn1) | 288 ms | 7.25 s | 9.15 s |

  A beam is ≈ `0.14 s + 25 × RTT`, which fits every point above. Treat it as a
  three-point fit, not a law: the only sub-130 ms point is a local container, so
  the curve between 0 and 130 ms is unmeasured. (`linux-box` looked like the
  LAN point, but it resolves over Tailscale and was offline when this ran, so
  its logged figures are left out.)

  **These are network cost only, and are ~300 ms lower than what the app logs
  for the same work** (app: 458/463/460 ms for 45/67/1926 KB to
  `hostbeam-testhost`; harness: 146/135/202 ms).

  **Resolved 2026-09-20: the beam thread runs at background QoS.**

  `ssh::run` already logged each command, so the breakdown was sitting in the
  existing logs — no new build needed. Three beams to `hostbeam-testhost`:

  | mkdir | scp | total logged | unaccounted |
  |---|---|---|---|
  | 19.9 ms | 341.0 ms | 457.6 ms | ~97 ms |
  | 16.7 ms | 379.3 ms | 459.9 ms | ~64 ms |
  | 15.7 ms | 346.0 ms | 463.3 ms | ~101 ms |

  The mkdir at ~16 ms confirms it does reuse the master. The ~64–101 ms
  unaccounted matches `animate_during`'s join and nothing more. **The gap is the
  `scp` itself: 341–379 ms inside the app against 132 ms for the identical
  command from a shell.**

  Bisected by elimination — same host, same flags, same 45 KB throughout:

  | | scp |
  |---|---|
  | shell | 132 ms |
  | plain Rust `Command::output()` | 115–166 ms |
  | ad-hoc signed, `-o runtime` (hardened) | 113–119 ms |
  | **under `taskpolicy -b` (background QoS)** | **296–306 ms** |
  | shipping app | 341–379 ms |

  So it is not `Command`, not the network, and not hardened runtime. A beam
  arrives on `tauri::async_runtime::spawn_blocking`, whose pool threads do not
  inherit the gesture's priority, and macOS throttles a background thread's
  *child processes* as well as the thread itself. Fixed by claiming
  `QOS_CLASS_USER_INITIATED` at both blocking entry points — correct on its own
  terms, since someone pressed a key and is watching the menu bar. The change
  logs the prior class, so the next real beam confirms it in one line.

  Worth ~200 ms on **every beam, every host, every user** — larger and more
  universal than either the animation or the `ControlPath` question.

  **Confirmed in 0.1.24 on 2026-09-21**, first real beam after updating:

  ```
  beam thread qos 0x15 → user-initiated (rc 0)
  beam ok → hostbeam-testhost:/tmp/hostbeam (1 of 1 file(s), 266KB)
    transfer 163.1ms (mkdir 16.6ms, scp 144.0ms, overhead 2.6ms)
  ```

  scp 341→144 ms and the animation wind-down 97→2.6 ms, so 458→163 ms overall
  — 2.8× on a file 6× larger than the one it is compared against. Both fixes
  land, independently.

  One correction the log forced: `0x15` is `QOS_CLASS_DEFAULT`, not
  `QOS_CLASS_BACKGROUND` (`0x09`). The `taskpolicy -b` probe that pointed here
  matched the symptom's *magnitude* by coincidence, not its mechanism. And this
  Mac is an Intel i7-9750H, so there are no efficiency cores in it — the effect
  is ordinary scheduling and I/O priority, not P-core/E-core placement. The
  conclusion held; the label on it did not.

  Post-fix, the app now performs like the shell harness did (144 ms for 266 KB
  against the harness's 132 ms for 45 KB), so the 2026-09-20 harness figures for
  the US and EU hosts can be read as the fixed app's, and the
  `0.14 s + 25 × RTT` model stands — the measured 163 ms at ~0 RTT is its
  intercept.

  Two things hold regardless. The site must not quote the app's log line as a
  transfer time — it is not one. And the interruptible-wait change is still
  worth making on its own merits (strictly better, ~75 ms average), just not on
  the ~300 ms claim. **"About a
  second" is true only on a LAN**, so the site must not print it. What *is* true
  at any distance: size barely matters — 1.9 MB costs 0.8–1.9 s more than 45 KB,
  not 40× more. Revisit the wording after the item below.

  **Owner's call 2026-09-21: no speed copy on the site, and the size line was
  declined too.** The page stays as it is. Nothing here is blocked on that —
  the numbers are recorded for whenever it is worth revisiting, and a future
  reader should not read this entry as a queued task.

- **`ControlPath=none` costs about half the beam on a distant host** (same
  2026-09-20 run). The `scp` leg is ~23 × RTT; the mkdir leg is only ~2 × RTT —
  so `ensure_folder` is *not* the expensive part, the forced fresh connection
  for `scp` is. Letting `scp` reuse the control connection the mkdir already
  opened:

  | | US 45 KB | US 1.9 MB | EU 45 KB | EU 1.9 MB |
  |---|---|---|---|---|
  | `ControlPath=none` (shipping) | 3.05 s | 3.97 s | 6.58 s | 8.62 s |
  | reuse the master | 1.53 s | 1.82 s | 2.95 s | 3.46 s |

  The saving is *larger* for the big file — the opposite of the assumption in
  `beam.rs`'s comment ("dramatically slower for bulk data", measured against a
  fast link such as OrbStack).

  **Re-measured on the fast link the same day, and the comment's premise does
  not reproduce.** `hostbeam-testhost` on OrbStack — the exact setup the comment
  names — with the mkdir leg run first each time, as `send()` does:

  | | 45 KB | 1.9 MB | 10 MB |
  |---|---|---|---|
  | `ControlPath=none` (shipping) | 132 ms | 228 ms | 505 ms |
  | reuse the master | 29 ms | 116 ms | 467 ms |

  Reuse wins at every size and every distance measured. Its margin does narrow
  as the file grows (103 → 112 → 38 ms), which is the direction the comment
  predicts, but it never crosses over inside the range a screenshot can occupy.
  **Do not act on that alone — the original decision was measured, and on a link
  these tests did not cover.** Commit `5395fa1` (2026-06-28) added the flag
  against `linux-box` as *"a Tailscale peer ~344 ms away, ~13KB/s
  end-to-end"*, where bypassing the master took a ~130 KB beam from 17 s to 7 s.
  That is a **bandwidth-starved** path. Every host measured on 2026-09-20 was
  high-latency but high-bandwidth (Hetzner, direct internet), where the
  handshake dominates and reuse wins. Both results can be true; they are
  different regimes, and Hostbeam cannot tell which one a user is on without
  measuring.

  So the open question is *not* "flip the flag" — that would regress the case
  the flag exists for. It is: can a beam cheaply detect which regime it is in
  (e.g. throughput observed on the previous beam to that host), and is that
  worth the complexity? **Still needs a link-conditioned test** — reproduce a
  ~13 KB/s path and re-run the comparison before anyone touches `beam.rs:212`.

  **The catch that makes it a milestone and not a one-liner:** this only helps
  users who already have `ControlMaster` in their SSH config (the owner's has
  `host *` → `ControlMaster auto`). For everyone else no master exists for the
  mkdir to open, so removing the flag changes nothing. Making the win universal
  means Hostbeam opening its *own* short-lived master over a private
  `ControlPath` for the pair of commands — more scope, and it needs an ADR
  because it puts Hostbeam in charge of a connection it currently only borrows.
  Unknown worth measuring first: why reuse saves ~3.6 s on a 288 ms link when
  a handshake alone should cost ~1.4 s.

### Termius and Anthropic Remote Control (checked 2026-09-25 and 2026-09-26)

The two ship risks ADR 0016 named have both landed on the phone. The decision
this raises is in § Mobile, ship-risk watch; what has since reached the desktop
is in the next entry.

| | Termius for iPhone | Anthropic Remote Control | Hostbeam for iPhone |
|---|---|---|---|
| Since | 7.5.0, July 8, 2026; Mosh from 7.8.0, September 14 | In the docs by September 2026; missing or broken in May and June | Built; not yet on the App Store |
| How | Paste, drag or share into a Termius session: uploads over SFTP to `/tmp` under a unique name, types the path into the terminal | Attach a photo or file in the Claude app or at claude.ai/code; Claude sees photos directly | Share sheet or Shortcuts action: uploads over SFTP, puts a sentence with the path on the clipboard |
| Works with | Termius only | Claude Code only, and only through Remote Control | Any SSH client, any agent |
| Passes through | Your phone and your host | Anthropic's servers, which store the transcript while connected | Your phone and your host |
| Price | Looks free (below) | Part of a Claude plan | Free, every feature; a $29 one-time licence hides the Mac's reminder (ADR 0028) |

**Termius, verified from its changelog.** In `docs.termius.com/changelog/ios`
each date sits above its version, which is why one search summary reported
7.6.0: the entry is under 7.5.0. Android followed in 7.8.0 (August 10; a
paperclip button in 7.8.1, August 19). The desktop changelog, up to 10.1.0
(September 21), still has no equivalent entry. **Looks free, not confirmed
in the app:** the feature's docs page shows no plan badge, and the free
Starter plan includes SSH and SFTP. Termius's SSH ID (device-bound keys,
7.2.0, November 2025) is assessed separately in § Security.

**Anthropic, verified from its docs; reliability untested.** The Remote
Control page lists "Send images and files from your phone or browser: attach a
photo or file in the Claude app or at claude.ai/code, with or without a
caption. Claude sees attached photos directly as part of your message." Two
bug reports said otherwise earlier: #62031 (May 24, attachments silently
dropped on the way to a Windows session) and #65868 (June 6, no attach button
in the iOS app), both closed as duplicates of
[#57882](https://github.com/anthropics/claude-code/issues/57882) (Android
attachments not reaching shared sessions), still open on 2026-09-26. The docs
describe `claude` on "your machine"; this entry said they never mention a
server. **Corrected 2026-09-26: they do** — "To keep a session running on a
remote machine after you disconnect from SSH, start it inside `tmux` or
`screen`." The same page lists who cannot use it: API keys, Bedrock, Google
Cloud, Foundry, LLM gateways, Zero Data Retention and HIPAA organizations, and
Team or Enterprise until an Owner turns it on.

**What Hostbeam for iPhone still has over both:** any SSH client and any
agent, not one of each; nothing passes through a third party's servers; one
licence covers Mac and iPhone; the Shortcuts action beams the latest
screenshot without opening anything; host keys are pinned; and the agent-side
hook and MCP server read only `hostbeam-*` files, so they never see a Termius
upload.

**Unverified, worth doing before submitting:** Termius's feature on a free
account, and Remote Control's photo attach against a session on a server, both
on a real phone against `hostbeam-testhost`, next to Hostbeam doing the same.

Sources: [Termius iOS changelog](https://docs.termius.com/changelog/ios),
[Android changelog](https://docs.termius.com/changelog/android),
[desktop changelog](https://docs.termius.com/changelog/desktop),
[paste images and files](https://docs.termius.com/terminal/mobile-terminal),
[pricing](https://termius.com/pricing),
[Remote Control docs](https://code.claude.com/docs/en/remote-control),
[#62031](https://github.com/anthropics/claude-code/issues/62031),
[#65868](https://github.com/anthropics/claude-code/issues/65868),
[levelsio's original request](https://x.com/levelsio/status/2053771680317636965).

### The upload is everywhere, desktop included (checked 2026-09-26)

The same day, the check widened past the phone. Moving a clipboard image to the
agent's host and handing back a path now ships on every platform:

| | Who ships it |
|---|---|
| Phone | Termius (iPhone and Android), Secure ShellFish, Moshi Pro, Remote Control, the ChatGPT app to Codex hosts |
| Mac | cmux, Herdr and Paste2SSH (all free), FainLane ($12/yr: Ctrl+V in the terminal, the host found for you), the Codex app on SSH hosts and its CLI's `--remote` mode (since 2026-09-22), AgentsRoom (since 2026-09-24) |
| Terminals | kitty today; Ghostty's main branch (OSC 5522), not yet in a release |

Not yet: Termius desktop, Warp, stable Ghostty, Terminal.app — and the Claude
Code CLI, where Anthropic closed image paste over SSH as not planned
([#42712](https://github.com/anthropics/claude-code/issues/42712)). Two findings
matter more than the table. The vendors are moving the agent's client back onto
your machine, where a local paste just works. And Remote Control excludes
API-key, Bedrock, Vertex, gateway, zero-retention and HIPAA setups (previous
entry). "No relay" is no longer Hostbeam's alone either: Moshi's desktop app
leads with it.

Evidence, the unmet demand, and the proposals the owner endorsed as a set are in
[differentiation-brainstorm.md](differentiation-brainstorm.md); the decisions
they need are under § Product.

## Email / mailbox hosting (deferred 2026-08-28)

Real `hostbeam.app` mailboxes are **wanted but deliberately not bought yet**.
Today: Resend sends the license email, Cloudflare Email Routing forwards
support@/license@ (catch-all) to the owner's personal mailbox — free, working,
10/10 on mail-tester. The chosen replacement is **Zoho Mail Lite**
($1/user/month, one user, `support@` primary + `license@`/`hello@`/`privacy@`
as free aliases, IMAP included) — full rationale, DNS caveats and cutover
order in `apps/license-webhook/README.md` ("Mailbox hosting").

- **Trigger for acting: the first real sales/support mail**, not a date. The
  addresses are already the public commitment; the provider behind them is a
  ~30-minute swap that gets no harder by waiting.
- The only thing that doesn't reverse is the owner's personal address
  appearing in customer threads answered before the switch — the free
  send-as-via-Resend-SMTP step (same README) removes that risk in the
  meantime, worth doing at the first inbound support email.
- Open when the time comes: is Zoho's catch-all setting exposed on the Lite
  tier, and which data centre region (the choice is effectively permanent).

## Operations

- What manual verification matrix is acceptable before the first usable release?
- What level of automated testing is required around SSH config parsing?
- What exact Developer ID signing, Hardened Runtime, notarization, and direct-update process should packaging use?

### Keep a count of update checks? (decided 2026-10-06: yes, site unchanged)

Requests for `latest.json` are the only sign of how many copies are
*running*. The owner chose to count them (ADR 0030 § 3, `npm run downloads`
shows "Copies running") and to leave the privacy page and FAQ as they are,
although the page says the apps send no usage analytics and the FAQ's list of
what the app sends names neither the update check nor the count.

### Left unverified by 0.1.28 (closed, 2026-09-24)

All three are closed: one by evidence, two by the owner's decision without
being seen. Reopen either of those if its symptom shows up.

1. ~~**Beam Clipboard from Raycast, on a signed build.**~~ — closed by the
   owner, unseen. 0.1.27 crashed on this path (a `hostbeam://beam` link also
   opens the popover, a third clipboard reader). The fix is proven by the
   stress test, which crashed without it, and by hotkey beams on a dev build,
   not by a Raycast beam on the released app. A crash mid-beam again would be
   a regression in `clipboard.rs`.
2. ~~**The mixed-display placement fix, in the case it fixed.**~~ — resolved:
   seen on 0.1.28 itself. The popover could open off screen when Hostbeam
   *started while the 1080p (1×) monitor was active*. With the 1× monitor
   active at launch, the never-shown popover sat on it (x = −470,
   y = −1057); switching to Hostbeam then opened it on the Retina MacBook's
   screen at x = 1140, y = 26, wholly visible (ADR 0022 amendment).
3. ~~**Recent rows pointing at deleted thumbnails.**~~ — closed by the owner,
   unseen since. During testing, Preferences → Recent asked for two preview
   files that no longer existed, while `config.json` still listed them. Guess,
   unconfirmed: two copies of the app (installed and a dev build) ran at once
   over the same config and cache, and one pruned previews the other's list
   still held (`thumbs.rs` prunes after every config write). If it happens with
   one copy running, it is a real bug.


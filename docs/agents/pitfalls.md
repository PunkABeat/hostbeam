# Things That Will Bite You

Traps that have already cost someone a day, and that neither the code nor a
review makes obvious. Read this with [current-handoff.md](current-handoff.md)
before touching the code.

It is kept apart from the handoff because it is not handoff state: a trap is
still true after the work that found it is done, so inside the handoff it
crowded out what the next person needs to pick up (moved out verbatim on
2026-09-26, when it was 35 of the handoff's 90 capped lines). It has no line
cap. Once an entry is written down where its code is documented
(`docs/engineering/`, a process doc or an ADR), replace it here with a one-line
pointer.

- **Never edit a shipped `CHANGELOG.md` entry.** It *is* the release notes users
  already received, served by the updater from `latest.json`. Adding a new entry
  above is fine; if you touched the file at all, diff the old entry against the
  published `latest.json` before committing.
- **`npm run testhost:up`** gives you a real SSH server locally — use it rather
  than mocking `ssh`. [test-host.md](../process/test-host.md) also covers
  forcing the pairing branches.
- **To try a desktop change on screen, build a throwaway copy, never touch
  `/Applications`** (brew owns it): from `apps/desktop`, `npm run tauri build
  -- --debug --bundles app --config '{"productName":"HostbeamScreenTest",
  "identifier":"com.hostbeam.screentest","bundle":{"createUpdaterArtifacts":false},
  "plugins":{"updater":{"endpoints":["http://127.0.0.1:9/latest.json"],
  "dangerousInsecureTransportProtocol":true}}}'` with the `APPLE_*` variables
  unset (as `scripts/test-update-install.sh` does). Its own id means its own,
  empty settings. Have the owner quit the real Hostbeam first (shortcuts and
  icon), and **never stop the test host while a Hostbeam older than
  0.1.34 is running**: it would move beams to the first host left, here a real one. Two traps found that day: on the owner's crowded menu bars
  a new icon is hidden (Bartender, or no room) — ⌘⇧7 opens the popover while
  no host is set; and a build run from a temp folder is not registered with
  Launch Services, so `open -b <id>` fails — use `open -a <path>`. Remove
  `~/Library/{Application Support,Logs}/com.hostbeam.screentest` and its
  `Preferences` plist afterwards.
- **This Mac's `ssh` shares one connection per host** (`ControlMaster auto` in
  `~/.ssh/config`), so `ssh -L` against the test host hands the forward to the
  connection already open: its errors ("administratively prohibited",
  "Address already in use") print there, not in your command, and the forward
  outlives it. Test forwarding with `-S none`; end a stray one with
  `ssh -O cancel -L <spec> hostbeam-testhost` (2026-10-03, the dev-server guide).
- **A SwiftUI row's `.swipeActions` never appear if its `ForEach` has
  `.onDelete`** — silent, and only a real swipe shows it (the iPhone's Hosts
  list, 2026-09-28). Put Delete in the row's own trailing `.swipeActions`
  and drop `.onDelete`.
- **A project-level setting in `project.yml` loses to XcodeGen's target
  presets.** `TARGETED_DEVICE_FAMILY: "1"` sat in `settings.base` from the
  start, and the iOS preset put `"1,2"` on every target, so builds 1–11 were
  iPad apps too. Nothing complained until App Store Connect refused to submit
  without 13-inch iPad screenshots (2026-09-28). Set anything that must hold
  per target, and read the built value (`xcodebuild -showBuildSettings`, or
  the archive's `Info.plist`) rather than the YAML; `release-ios.sh archive`
  now checks the device family.
- **App Review wants the demo video from a real iPhone, starting at launch.**
  The simulator recording (`scripts/ios-demo-video.sh`) came back as Guideline
  2.1 Information Needed on the first submission (2026-09-29), with five
  written questions an account with little review history gets; the answers
  now live in [app-review-notes.md](../marketing/app-review-notes.md). Record
  with the phone's Screen Recording (add it in Control Center first) on the
  latest iOS and the submitted build, then make it H.264
  (`ffmpeg -i in.MP4 -vf scale=720:-2,fps=30 -c:v libx264 -crf 26 -an out.mp4`:
  138 MB of HEVC became 8.8 MB). A review detail holds **one** attachment —
  delete the old one before `asc review attachments-upload`. And quote the
  app's labels exactly in the notes: the first ones said "Type it in", a
  button that never existed. Replying in App Store Connect does not resubmit:
  click **Update Review** on the version page, then **Resubmit to App Review**
  (greyed out until then) — a day was lost waiting on the reply alone.
- **`check-ios-strings.mjs` reads every build ever left in the folder you give
  it.** Against a long-lived `dd-sim` it reported strings deleted days earlier
  as untranslated (2026-09-28). Point it at a fresh `-derivedDataPath` build
  when it complains about strings you cannot find in the source.
- **`AllowTcpForwarding no` refuses Unix-socket forwards too.** OpenSSH checks
  it for `ssh -R /remote.sock:/local.sock`, not only
  `AllowStreamLocalForwarding`, and the client says just "remote port
  forwarding failed" (sshd's log has "…remote forward to path …, but the
  request was denied"). Alpine's stock sshd — the test
  host's — has it off, as do hardened hosts. Anything that needs a channel
  back to the Mac runs a command on the host and talks over its
  stdin/stdout instead (`scripts/spikes/ctrl-v/`, next.md § 10a).
- **The iOS 4s authorize wait is a poll, not a task-group race**; tidying it
  silently removes the bound ([ADR 0018](../adr/0018-remember-paired-device-keys.md)).
- **A share extension's `NSExtensionActivationRule` decides whether iOS offers
  it at all.** `SupportsImageWithMaxCount: 1` removed Hostbeam from the share
  sheet for two photos: correct code, wrong manifest, invisible failure, and
  only a device shows it. It lives in `project.yml`.
- **Two more share-extension traps that only a device showed (2026-09-27).**
  A file iOS does not know (`.env`, `id_ed25519`) arrives as a `dyn.…` type
  that does not conform to `public.data`, so filtering on `public.data` said
  "Nothing to beam". And a static helper on `ShareViewController` is
  main-actor isolated: called from an item provider's completion handler it
  traps under Swift 6 and the sheet closes the instant it opens — the build,
  the simulator tests and the lint all pass. Mark such helpers `nonisolated`,
  and read crash reports off the phone (`devicectl device info files
  --domain-type systemCrashLogs`) before guessing.
- **A remote name carries the original file name, so it is someone else's
  string in a shell.** `slug()` allow-lists `[A-Za-z0-9._-]`, and since any
  file can be beamed the extension is someone else's too, so
  `remote_extension()` takes plain ASCII only; scp expands the remote half of
  its argument through a shell on older OpenSSH. For the same reason every
  remote script single-quotes the folder (`mkdir_script`), and Storage counts
  exactly what Clean up deletes, from one `artifact_match()` — which matches
  Hostbeam's 13-digit stamp, never a list of types: widening what can be
  beamed must never widen a `-delete`. Its tests *run* `find` on a fixture.
- **A file copied in Finder carries its icon, and AppKit hands that icon over
  as a TIFF.** So "is there an image on the clipboard" says yes to a copied
  PDF, and `arboard::get_image` reads the icon. Every decision about what the
  clipboard holds goes through `clipboard::current()` / `source()` (files
  before an icon, a real picture before its own file); never ask
  `get_image()` or `availableTypeFromArray:` alone. Recorded pasteboards and
  an `#[ignore]`d real-clipboard test are in `clipboard.rs`.
- **`localStorage` is a 5MB cache, not the store.** A config that outgrew it
  threw out of `setupConfigBridge`, which every `boot()` awaits with no catch —
  Preferences rendered nothing at all. Recent thumbnails are what got it there,
  so they are budgeted (`trimThumbs`). Never add a bare `setItem`.
- **Testing `hostbeam://` against a local build is a LaunchServices fight.**
  Every copy shares the bundle id and macOS prefers `/Applications` — links go
  there, relaunching the installed app behind your back. Unregister it
  (`lsregister -u /Applications/Hostbeam.app`, in CoreServices), test, then
  `-f` it back and `-u` every `target/**/Hostbeam.app`, or `open -a Hostbeam`
  keeps starting a build out of the target directory.
- **A CI job that fails in five seconds has not run.** The repo is private and
  the macOS jobs count ten times against 2,000 free Actions minutes a month;
  once they are spent, every job fails at once with the annotation "The job was
  not started because recent account payments have failed or your spending
  limit needs to be increased" (the $0 budget stops it, and nothing is billed).
  Read the annotation before debugging the workflow. That is why the macOS
  workflows run only by hand ([ci.md](../process/ci.md)); every push still
  costs two Linux minutes, so batch them.
- **A partial beam is neither done nor failed** (`BeamResult.failed`,
  `BeamOutcome.unsent`, the `partial` HUD phase); collapsing it into either
  loses files that are really on the host. To reproduce, revoke write permission
  on the host's beam folder mid-batch — no local file can do it, since they are
  all validated before any is sent.
- **Never turn on Bot Fight Mode for hostbeam.app**, however Cloudflare's
  Security Insights rate it: it would challenge the Mac app's update check and
  Homebrew's download, and the free plan cannot exempt a path. AI Labyrinth
  stays off too. Why, and the zone's other settings:
  [apps/web/README.md § Cloudflare](../../apps/web/README.md#cloudflare-the-hostbeamapp-zone).
- **Wrangler's first call after an idle hour can be refused with 7403** ("The
  given account is not valid or is not authorized to access this service").
  Its login lasts an hour; once it lapses, wrangler mints a new token and uses
  it at once, and Cloudflare refused that brand-new token on 2026-10-29, then
  took the same token seconds later. It is not a login problem: run it again.
  `npm run downloads`/`stats` retry by themselves; a deploy does not. With
  `--json`, wrangler writes its error to stdout and leaves stderr empty.

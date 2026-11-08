# Changelog

What changed in Hostbeam, newest first. This file is the single source: the site
renders it at [hostbeam.app/changelog](https://hostbeam.app/changelog), the Mac
updater shows the newest entry before you install, and App Store release notes
are taken from it — so the four never disagree.

Written for the people who use Hostbeam, not for the commit log. Internal work
(build scripts, signing, refactors) is deliberately left out; if a change is not
visible or does not matter to you, it does not belong here.

Write new notes under **`## Unreleased`**, as the work lands. `npm run
release:cut` renames that heading to the version being shipped, so nothing has
to be reconstructed from `git log` later — which is how release notes become
subtly wrong. Unreleased notes are not published: the site and the updater only
ever see numbered entries.

Every entry belongs to one app. A bare heading is the **Mac**
(`## 0.1.15 — 2026-09-07`), because the updater and the release scripts have
always read them that way; the iPhone **names itself**
(`## iPhone 1.0 — 2026-09-20`) and keeps its own version numbers, since it ships
in batches through App Review rather than continuously.

Nothing that drives a Mac release ever reads the iPhone lane, so an iPhone entry
can never become the notes in `latest.json`. The site shows both at `/changelog/`,
newest first, and each app's own at `/changelog/mac/` and `/changelog/iphone/`,
where every release has an anchor (`#mac-0.1.20`, `#iphone-1.0`): each app opens
its page at the version it runs. The All · Mac · iPhone tabs appear once both
apps have a release.
`node scripts/changelog.mjs --platform=iphone` prints the newest iPhone entry,
which is what App Store Connect's "What's New" wants.

Entries written before the iPhone shipped are all Mac entries. The iPhone work
inside them is tagged in the bullet (`**iPhone:**`) and stays that way: a
shipped entry is never rewritten.

## Unreleased

## 0.1.35 — 2026-11-08
### Changed

- **Hostbeam is free, for good.** The reminder to buy a license is gone, and so
  is "Unlicensed" in the popover. Every feature stays exactly as it was;
  nothing was ever behind the license. Licenses are no longer sold, and a key
  you already activated changes nothing.

## 0.1.34 — 2026-10-06
### Fixed

- **A beam never goes to a host you didn't choose.** If the host you beam to
  disappears from `~/.ssh/config` — a stopped container, an `Include` that
  isn't there right now, an edited file — Hostbeam used to quietly switch to
  the first host in your list. Now it keeps your host, marked "Not in
  ~/.ssh/config", and beams stop with a note in the popover saying why until
  it's back or you pick another. Hostbeam also notices a host coming back as
  soon as you open the popover, with no restart.
- **The popover opens on the screen you're using.** With more than one
  display, clicking the menu-bar icon or the Dock icon on another screen, or
  pressing the shortcut, opened the popover on the main display. It now opens
  where the pointer is — under the icon you clicked — and so does the beam
  confirmation.

## iPhone 1.0 — 2026-10-09

### Added

- Hostbeam for iPhone. Send a screenshot, or any file, from your phone to your
  own server over SSH, and get its path on your clipboard. Paste it to a coding
  agent running there and the agent gets the picture itself, not a line of
  text. It is built for one moment: you are working with an agent, and you
  want to show it something you can only see on your phone.
- Share a screenshot, a PDF or a recording to Hostbeam from anywhere in iOS: it
  sends, copies the path, and gets out of the way. Several at once go as one
  beam, their paths on one line. Up to 100 MB a file, and anything that looks
  like a secret, such as a `.env` or a private key, waits for your "Send
  anyway".
- Or beam without opening the app at all: a Home Screen widget, a Control in
  Control Centre, and a Shortcuts action, each sending your latest screenshot
  to your default host in one tap.
- Beam an image straight from the clipboard, when what you want to send did not
  come from the screenshot button.
- Recent shows what you have sent, with a thumbnail, and copies its path again
  whenever you need it.
- Add a host by scanning the QR the Mac app shows, or by typing it in. The phone
  makes its own SSH key on first launch and shows you the one command that
  authorizes it; if your Mac has already done that for this host, the step does
  not appear at all.
- Switch where beams go in one tap from the home screen, or with a swipe in
  Hosts. A host's page copies its hostname, port, username or the whole SSH
  command, for setting it up in your SSH app.
- Host keys are pinned. If a server's key changes, Hostbeam refuses to send
  until you re-trust it, rather than quietly trusting something new.
- See how much space your beams take on a host, and clean them up from the app.
  Only files Hostbeam named are ever removed.
- Free, with no limit and nothing to buy: no in-app purchase, and no licence
  key to enter.
- In English, French, German, Spanish, Portuguese, Japanese, Korean and
  Chinese.

### Nothing in the middle

- Your phone talks to your server directly. No account, no sign-in, no
  Hostbeam relay, no telemetry. What you beam is never routed through or
  stored by anything of ours, because there is nothing of ours in the path.

## 0.1.33 — 2026-09-28
### Added

- **See what your agent is building.** When the agent starts a dev server on
  your server — Vite on 5173, a Next.js app on 3000 — the popover lists it
  under "Running on <host>" when you open it. Click **Open** and it opens in
  your Mac's browser, at `127.0.0.1` and the same port. **Stop** ends it, as
  does the "Stop forwarding" line in the menu-bar menu; it also ends when the
  dev server stops or you quit. Hostbeam only ever looks when you open the
  popover, only lists servers your own user runs, and installs nothing on the
  server. It works on servers that forbid SSH port forwarding, too.

## 0.1.32 — 2026-09-28
### Changed

- **Your agent now gets the picture itself, not a line of text.** After a
  beam, Hostbeam copies just the file's path on your server. Paste it into
  Claude Code, Codex, Gemini CLI or OpenCode there and it is attached as the
  image — `[Image #1]` — exactly as if you were working locally. With the old
  "Use this screenshot: …" line around it, only Claude Code did that; the
  others saw text. Nothing is installed on your server for it.
- **Several files paste as several pictures** in Claude Code and Gemini CLI:
  their paths now go on one line, a space apart. Codex and OpenCode take one
  picture at a time, and see several paths as text they can still open.
- **The sentence is still there if you want it:** Preferences → General →
  "Add a sentence around the path". If you wrote your own sentence, it is kept
  and stays on. Copying a beam again from Recent now gives exactly what the
  beam copied, sentence or not.

## 0.1.31 — 2026-09-27
### Changed

- **Hostbeam is free to use, with no daily limit.** Every feature, as many
  beams as you like. Instead of stopping you after five a day, Hostbeam now
  asks now and then: after your first week, a line under a beam that has
  landed — "Enjoying Hostbeam? Get a license". It never blocks or slows a
  beam, and the popover says "Unlicensed" beside the name until you have one.
- **A license is $29 once, for up to 3 Macs, and every Hostbeam 1 update is
  included** — no year of updates to run out, nothing to renew. Preferences →
  License says so instead of showing a date.

## 0.1.30 — 2026-09-27
### Added

- **Beam any file, not just screenshots.** Drop a PDF, a log, a CSV or an
  archive on the popover or the menu-bar icon, open it with Hostbeam, or copy
  it in Finder and press your beam shortcut: it lands in the same folder, with
  the same paste-ready line — "Use this file: …" for anything that is not a
  picture, unless you have written your own. Up to 100 MB a file; folders are
  still not beamed, and one gesture is still one beam.

- **A second look before a secret leaves your Mac.** A `.env`, a private SSH
  key, a `.pem` or a credentials file is held rather than sent: Hostbeam asks
  first, and nothing goes unless you click Send anyway. Return answers "Don't
  send", so a stray keystroke cannot send it for you.

- **Show in Finder from Recent.** A beam that came from a file on your Mac —
  dropped, opened with Hostbeam, or copied in Finder — has a folder button in
  the popover's Recent list and in Preferences → Recent that shows the file in
  Finder, or every file of a drop at once. If it has moved since, the row
  says so. A screenshot beamed from the clipboard never was a file, so it has
  none.

- **iPhone:** share any file, not just pictures. The share sheet now offers
  Hostbeam for a PDF, a log or a screen recording from Files or Photos, and
  sends it as it is, keeping its name — up to 100 MB. A `.env`, a private key
  or a credentials file waits for "Send anyway", as on the Mac.

### Changed

- **Clean up only ever touches what Hostbeam named.** Storage and Clean up now
  recognise a beamed file by the time stamp in its name, so a
  `hostbeam-notes.txt` — or a `hostbeam-diagram.png` — that someone else left
  in the folder is never counted or deleted.

### Fixed

- **Copying a file in Finder no longer beams its icon.** Finder puts the
  file's icon on the clipboard beside it, and the beam shortcut — and
  automatic beaming — sent that icon as if it were a screenshot. The shortcut
  now sends the file itself, and automatic beaming, which is for screenshots,
  leaves a copied file alone. A capture tool that puts both a picture and its
  file there, like CleanShot X, still beams the picture as before.

- **A file that cannot be sent no longer blames the host.** When a beam from
  the shortcut or the Dock could not send a file, the floating overlay said
  the host "didn't answer". It now says the file was not sent, and why.

## 0.1.29 — 2026-09-26
### Changed

- **Several screenshots at once arrive about twice as fast.** A beam of
  several files now goes over one connection instead of one per file — five
  screenshots on a slow link went from 7.6 s to 3.2 s — and starts sending
  straight away: the Recent previews are made while the files travel, instead
  of all of them first with the progress stuck at "0 of 4". A single
  screenshot is as quick as before.

### Fixed

- **Your agent never picks up half a screenshot.** A file used to appear on
  the host under its final name while it was still arriving, so a prompt sent
  at that moment could hand your agent a partial image. Each file now arrives
  under a hidden name and takes its real one only once it is complete.

- **A host's "authorized" badge no longer outlives the key.** Preferences →
  Hosts learned which devices a host accepts only when it opened, so a key
  removed from the host afterwards still showed as authorized, with no way to
  authorize again. It now asks the host again when you open its row and when
  the Preferences window comes back to the front.

## 0.1.28 — 2026-09-24
### Changed

- **A new version is shown when Hostbeam starts.** If the check Hostbeam makes
  shortly after starting finds a new version, the popover now opens on its own
  to say so, instead of leaving it to a dot on the gear. Only at start: the
  daily check stays quiet as before. A version you skipped, or one already
  installed in the background, never opens it.

### Fixed

- **Beaming no longer quits Hostbeam now and then.** Reading the screenshot
  for the beam and for the overlay's thumbnail at the same moment could crash
  the app mid-beam — more often when the beam came from another app, such as
  Raycast. The clipboard is now read one step at a time, and if macOS still
  fails to read it, that one beam says so instead of the app quitting.
- **The beam overlay speaks your language.** The small overlay that shows a
  shortcut beam in flight followed the Mac's language, not the one chosen in
  Preferences → General. It now uses your choice, like the rest of Hostbeam.
- **The last few English labels are translated.** "Click to enlarge", "Back",
  "Diagnostics failed" and a handful of labels read aloud by VoiceOver were
  English in every language; they now follow your language too.
- **The popover and the beam overlay stay on screen with mixed displays.**
  With a Retina screen and a standard one side by side, the popover opened
  from the keyboard shortcut could appear off screen, and the overlay half off
  it, when Hostbeam had started while the standard screen was active.

## 0.1.27 — 2026-09-23
### Fixed

- **Diagnostics and Test connection in Preferences now really connect.** The
  Hosts pane's *Diagnostics* sheet and the *Test connection* button when adding
  a host showed made-up results — a random latency, a key that was never
  checked — whatever the host was doing. Both now run the same real checks the
  popover runs.
- **Beaming to a host you typed in works from the popover.** A host added by
  name and address (rather than from `~/.ssh/config`) was asked for by its
  nickname, which `ssh` cannot resolve; the popover now connects the way
  Preferences always did — to beam, to check the host, and to pull.
- **Recording a shortcut with ⇧ held saves the key, not the symbol it typed.**
  ⌘⇧7 used to be saved as `⌘⇧&` on a US keyboard, a combination that could not
  be registered.
- **A setting changed in Preferences stays changed.** The popover kept the copy
  it loaded at launch and could put it back on its next save, undoing the
  edit; it now re-reads the config whenever Preferences writes it.
- **Reset to defaults no longer plants two example screenshots in Recent.**

## 0.1.26 — 2026-09-23
### Added

- **Hide from Dock, from the Dock.** Right-click Hostbeam's Dock icon and the
  menu offers *Hide from Dock* — the same as turning off *Show in the Dock*
  in Preferences, one step closer to hand. The menu-bar icon stays, so
  Hostbeam is always one click away.
- **The shortcut shows on the empty popover too.** With nothing on the
  clipboard, the popover now says which keys beam, so the first screen tells
  you the fastest way in.

### Changed

- **`hostbeam://` links work out of the box.** *Let other apps control
  Hostbeam* is now on for new installs, so Raycast, a script or the agent can
  beam and switch host without a first trip to Preferences. It is the same
  switch, one click to turn off.

## 0.1.25 — 2026-09-22
### Added

- **Open source licenses**, under About. Hostbeam is a small app on a large
  stack of open source, and every package inside the Mac app is now listed
  there with its license and copyright — the same on the iPhone, and at
  [hostbeam.app/licenses](https://hostbeam.app/licenses). Nothing to do; it
  was owed.

## 0.1.24 — 2026-09-21
### Added

- **iPhone:** a beam you can feel. The phone taps when a screenshot lands,
  buzzes when a host refuses it, and gives a third, different tap when only
  part of a batch arrived — which matters most in the share sheet, where the
  answer shows for two seconds over a photo you are still looking at.
- **iPhone:** the Home Screen widget says where a tap would send, instead of
  being a button wearing a widget's clothes.
- **iPhone:** Shortcuts can beam to a *named* host. Leave the new Host field
  empty and it behaves as before, using your current host — so an automation
  can send somewhere specific without changing what the phone does next
  time.

### Fixed

- **Beams are faster, the upload step most of all.** macOS was running the
  transfer at background priority and throttling it: the same `scp`, to the
  same host, took about three times longer from inside Hostbeam than from a
  terminal. A beam is something you pressed a key for and are standing there
  waiting on, so it now tells the system exactly that.
- **A finished beam no longer waits for the menu-bar animation.** The spinner
  ran in fixed steps and only checked between them, so a beam that landed
  early still held on until the current step ran out, with the file already
  on your host.

## 0.1.23 — 2026-09-20
### Added

- **`hostbeam://host?id=<host>` switches which host beams go to**, so a script
  or a launcher can pick one without opening the app. It needs the same
  permission a URL beam does, which is now called *Let other apps control
  Hostbeam*, and it can only choose between hosts you have already added.
- **`hostbeam://preferences`** opens Preferences — at a named tab with
  `?tab=general`. It is the one link that works without the permission above,
  because it is how you grant it: a tool that finds Hostbeam ignoring it can
  now offer a button rather than directions.

### Fixed

- **`hostbeam://beam` works when Hostbeam was not already running.** The link
  launched the app and then did nothing, because the window it asks was still
  starting. It now waits a few seconds for it — and only a few, so a beam can
  never surface later out of nowhere.

## 0.1.22 — 2026-09-20
### Added

- **Beam screenshot** is the first item when you right-click the menu-bar icon,
  with your shortcut printed beside it. Beaming no longer starts with opening
  the popover when your hand is already on the mouse — and the menu you open
  anyway is now where the shortcut is easiest to find.
- **Switch host**, under it, lists your hosts with a tick on the one beams go
  to; picking another switches to it, exactly as the popover's host selector
  does. **Manage hosts…** at the foot of that list opens Preferences → Hosts,
  where hosts are added, renamed and removed.
- **Recent** lists your last few beams by file name — a drop of several counts
  its files (`shot.png ×3`). Picking one puts its paste-ready text back on the
  clipboard, the whole drop at once, the same as the copy button on its row.
  **Show all…** opens Preferences → Recent, where the same shots can be seen
  full size. Each row carries its thumbnail, so a list of `hostbeam-…png`
  names is still recognisable at a glance.
- **About Hostbeam** and **Check for updates…** are in the same menu. The
  check opens About and runs there, so it can tell you that you are up to
  date as readily as that you are not.
- **Drop a screenshot on the menu-bar icon** and it beams — the icon is where
  you were aiming anyway. The Dock icon and the popover already took drops;
  now the one you can always see does too.
- **⌥-click the menu-bar icon to beam** without opening anything. A plain
  click still opens the popover, a right-click still opens the menu.
- **Other apps can start a beam**, if you let them: switch on Preferences →
  General → Beaming → *Let other apps start a beam*, and `hostbeam://beam`
  works from a script, a Raycast command, a Shortcut or your agent. It is off
  by default, because a web page can open a link like that too. Separately,
  and always available: `open -a Hostbeam shot.png` beams a file.

## 0.1.21 — 2026-09-19
### Changed

- **Changelog** in the popover, after an update, opens the notes for the version
  you are now on rather than the top of the list. About's link opens the Mac
  releases on their own.
- **Share to iPhone** shows a code the iPhone's Camera app recognises: scanning
  it opens Hostbeam for iPhone with the host filled in, rather than having to
  find the app's own scanner first. **Copy link** puts the same link on the
  clipboard, to AirDrop or message to the phone. The iPhone app is still in
  testing — this is ready for the day it ships.
- **Removing a host** in Preferences → Hosts is a bin, not a minus. A minus next
  to a row that also expands reads as a collapse control, and got clicked
  expecting the drawer. Forgetting a paired device matches it.

## 0.1.20 — 2026-09-15
### Added

- **Install updates automatically**, in Preferences → General → Updates. Off
  unless you turn it on. Hostbeam downloads the update in the background and
  relaunches into it when you are not using it — never with the popover or
  Preferences open, while a beam is on its way, or while automatic beaming is
  on. A version past your year of updates is never installed.
- **Check for updates automatically** can be turned off, for a Mac that should
  not ask download.hostbeam.app anything. About → Check for updates still works.
- After an update, the popover says which version you are on now, with a link
  to what changed.
- **Request a feature** and **Share Hostbeam**, in About. The first writes to
  support the way Send feedback does, so a request lands in the same inbox. The
  second shares hostbeam.app on X, Bluesky, LinkedIn, Reddit or Hacker News,
  copies the link, or opens the macOS share menu for AirDrop and Messages.
- **iPhone:** Settings → About has Rate Hostbeam and Request a feature. After a
  few beams, the app asks for a rating through Apple's own prompt — only right
  after a beam from inside the app succeeds, and at most once per version.
- **Send Feedback…** in the menu bar menu, right above Quit.
- **iPhone:** long-press the app icon for Beam last screenshot and Send feedback.

### Changed

- **Skip for now** skips an update everywhere, the dot on the gear included,
  until a newer version comes out. It is still there to install from About.
- Screenshots are scaled to 2000 px on their longest side by default, down from
  2048, and the 2048 choice in Preferences → General is now 2000. Once a
  conversation holds more than 20 images, Claude refuses any image larger than
  that, which could end a long session with an agent in an error.
- Hostbeam no longer beams into a remote folder that belongs to another user.
  On a shared server, someone else can create `/tmp/hostbeam` before you do;
  beams would have landed where they could read them. You get a clear error and
  nothing is sent. A folder Hostbeam creates is now private to your account.

### Fixed

- The **Remote folder writable** check in a host's diagnostics reported a
  failure for every folder, even ones beams were landing in. It now checks the
  folder for real.

## 0.1.19 — 2026-09-09
### Added

- Beam several screenshots at once. Drop a handful on the popover, or select
  them in Finder and choose Open With — they all go, and the whole thing counts
  as **one** beam, because the free tier counts gestures rather than files. The
  pasted line carries one path per screenshot. More than 25 at a time is refused
  outright rather than quietly trimmed.
- Recent gives every screenshot its own entry and folds a single drop into one
  row with a count on it. Click that row's thumbnail to step through the whole
  drop with the arrows or the ← → keys; its copy button takes every path.
  Preferences still lists them one by one.
- A beam of several shows how far it has got, in the popover and in the floating
  overlay, with a bar that fills to the count instead of sweeping back and
  forth.
- If a beam stops part-way — the connection drops, the host stops accepting —
  it says so instead of calling the whole thing a failure. What arrived is
  listed, copied and in Recent, and Hostbeam offers to send just the rest. That
  retry costs no extra beam: it is the same drop continuing.

### Fixed

- Preferences could open as a blank window once Recent had built up enough
  thumbnails. They live in the settings file, which outgrew what the app can
  cache, and the window waiting on that gave up before drawing anything. Recent
  now keeps its newest thumbnails within a budget and drops older pictures
  rather than whole entries — and the window opens either way.
- "Try again" after a failed drop retries the files you dropped. It used to
  quietly beam your clipboard instead.
- Recent shows a thumbnail for a dropped JPEG, GIF, WebP, BMP or TIFF, not just
  a PNG. Those used to beam fine and then sit in the list as a grey square with
  a file name. Pulled images get the same treatment. HEIC, HEIF and AVIF still
  show the placeholder — decoding them would mean shipping C libraries for a
  38-pixel picture.
- Clean up on a host now removes the JPEGs, HEICs and other images it beamed,
  and the Storage figure counts them. Only PNGs were matched before, so anything
  else you dropped was sent and then left behind, with the size readout saying
  it was not there.

### Changed

- A beamed file keeps the name it had. Drop `shot-2.png` and it lands as
  `hostbeam-<timestamp>-shot-2.png`, so you can tell screenshots apart in
  Recent, in the line you paste, and in the folder on your host. Awkward
  characters are replaced and long names trimmed, since the name has to be safe
  on the other end. A screenshot beamed from the clipboard has no file name and
  is unchanged.

## 0.1.18 — 2026-09-08
### Added

- Screenshots are scaled down before they are sent, to 2048px on the longest
  edge by default. A vision model downsamples on arrival anyway — Claude's
  limit is about 1568px — so the extra pixels of a 5K capture cost upload time,
  disk on your host, and tokens without ever being seen. Preferences → General
  sets the size, or turns it off. Files you drop are still sent exactly as they
  are.
- Beam screenshots automatically, whichever tool took them. Switch it on in the
  popover and every screenshot you take goes straight to your host — no second
  keystroke — whether you capture with ⌃⌘⇧4, CleanShot, Shottr, or anything else
  that leaves an image on the clipboard. It starts off every launch and switches
  itself off after an hour by default; Preferences → General changes that. The
  menu-bar icon carries a dot while it is on, so it is never running unnoticed.
  Nothing new is asked of macOS: Hostbeam watches a counter that tells it
  *something* was copied, and only looks at what once it is going to send it.
- An optional shortcut for that switch, so you can start and stop automatic
  beaming from any app without opening the popover. Off until you record one in
  Preferences → Shortcuts — three global combos claimed by default would be
  greedy on a machine that already runs a launcher and a screenshot tool.
- Bring back images your agent left on the host. Turn it on in Preferences →
  General and the popover gets a Check button: press it and any images written
  into that host's beam folder — a browser test's screenshot, a chart a script
  made — come back to your Mac, where a click opens them. Hostbeam's own uploads
  are skipped, so a check never re-downloads what you just sent. Nothing is
  fetched unless you ask, and images only: Hostbeam is a screenshot bridge, and
  whether it carries anything else is a decision for another day.

## 0.1.17 — 2026-09-08
### Added

- Beam a screenshot that is already a file: drop it on the popover, drop it on
  the Dock icon, or right-click it in Finder and choose Open With → Hostbeam.
  Images up to 50 MB, sent as they are.

## 0.1.16 — 2026-09-07
### Changed

- The QR code you point your iPhone at now has the Hostbeam icon in the middle,
  so it is recognisably ours rather than an anonymous square.

## 0.1.15 — 2026-09-07
### Fixed

- The popover no longer sits in a grey rectangle. Its drop shadow was wider than
  the window holding it, so macOS cut the shadow off square at the window's edge.
  Invisible over a dark desktop, plain over anything light.
- With "Show in the Dock and ⌘⇥" on, switching to Hostbeam with ⌘⇥ now opens the
  popover. It brought nothing forward before, since the app has no ordinary window.

## 0.1.14 — 2026-09-06
### Fixed

- "Launch Hostbeam at login" now lists Hostbeam under System Settings → General →
  Login Items → Open at Login, with its icon, like any other app. 0.1.13 had
  registered it as a background item under "Allow in the Background" instead;
  that entry is removed the first time this version starts.

## 0.1.13 — 2026-09-06
### Added

- "Show in the Dock and ⌘⇥" in Preferences → General → Startup. Off by default;
  when on, Hostbeam has a Dock icon and an entry in the app switcher, and a click
  on the Dock icon opens the popover. One of the two icons, menu bar or Dock,
  always stays on.
- A second global shortcut shows or hides the popover from any app. Record it
  in Preferences → Hotkey; it stays off until you do, and Clear turns it off again.
- Hostbeam can be installed with Homebrew: `brew install --cask punkabeat/tap/hostbeam`.
  It is the same signed build the download button serves, and the app keeps updating itself.

### Changed

- The update panel in About lists what changed in every version since the one
  you are running, not only the newest.

### Fixed

- "Launch Hostbeam at login" and "Show icon in the menu bar" now do what they
  say. They had been switches with nothing behind them. Launch at login
  registers a login item that System Settings lists under Login Items; if the
  switch was on in your settings, Hostbeam registers itself at its next start.
- A long host address (an EC2 hostname, say) no longer wraps onto several lines
  inside the popover's "Beam to" picker; it is cut with an ellipsis and the host
  name keeps its place. Hovering a cut address shows the whole of it, in the
  picker and in its dropdown.

## 0.1.12 — 2026-09-01
### Fixed

- **iPhone:** a freshly installed app could reach a host it was perfectly able
  to reach, and report it as unreachable. The phone's own SSH identity is
  created once, on first launch, instead of waiting for you to open the screen
  that happened to create it — so beaming works from the first host you add,
  however you got there.

## 0.1.11 — 2026-08-31
### Added

- **Both:** adding a host that isn't your default now asks whether it should be.
  Adding a host is usually the prelude to beaming to it, but the hotkey on the
  Mac, and the widget, shortcut and share sheet on iPhone, all kept beaming to
  the previous one — silently, which is how a screenshot ends up on the wrong
  server. Asked, never switched for you.
- **Mac:** adding a host from the SSH-config list now opens it, the way adding
  one by hand always did. Its settings — including which host is the default —
  were behind a row you had to know to click.

### Fixed

- **Mac:** searching your SSH config for a host and adding it no longer answers
  with "no matching hosts" — it says you have added everything matching, and
  offers to clear the search. The host had simply left the list by being added.
- **Mac:** the pairing sheet fits the window again. Sharing a host to your
  iPhone meant scrolling to reach the part that authorizes it — the QR and the
  authorize step were stacked in a narrow column while half the window's width
  sat empty. They sit side by side now.

## 0.1.10 — 2026-08-31

### Added

- **Mac:** Hostbeam remembers an iPhone you have authorized, so putting it on
  another host is one click — you no longer need the phone in your hand or a key
  to copy across. Offered per host, never automatic: which servers your phone
  can reach stays your decision.
- **Mac:** each host says whether your iPhone is already on it, and offers to
  authorize it right there if it isn't — in the host's own row, next to
  Diagnostics and Open Terminal.
- **Mac:** Preferences → Hosts lists the devices you have paired, when each was
  last used, and lets you remove one.
- **iPhone:** adding a host offers the key that host needs, there and then.

### Fixed

- **Both:** a host you have just added is checked straight away, instead of
  sitting grey until you think to press Test.
- **iPhone:** the authorize step asks the host before it tells you anything. If
  your Mac has already installed the key, the step no longer appears at all; if
  the host can't be reached, it says so, rather than telling you to add a key
  that may well be there already.

## 0.1.9 — 2026-08-30

### Fixed

- **Mac:** pairing your iPhone to a host on a non-standard SSH port now sends
  the right port. The QR always claimed 22, so the phone was set up with a port
  that couldn't connect — and the failure looked like the host being
  unreachable, which sent you looking at your network instead of the one field
  that was wrong.

### Added

- **Mac:** the SSH port is shown next to a host when it isn't the usual 22, in
  Hosts and on the pairing sheet, so you can check what your iPhone will
  receive against what it actually got.

## 0.1.8 — 2026-08-30

### Added

- **Both:** a "What's new" link in About, for the full history rather than just
  the pending update.
- **Mac:** an update is announced in the popover itself now — one quiet line you
  can dismiss — instead of only a dot on the gear you had to notice and then go
  looking for. Dismissing it hides that version, not the next one.

### Fixed

- **Mac:** the update dot on the menu-bar gear actually appears. The popover is
  a non-activating panel, so it never received the event it was waiting for, and
  the dot stayed stuck at whatever was known when the app started — which was
  nothing, since the first check runs shortly after launch.

## 0.1.7 — 2026-08-30

### Added

- **iPhone:** a home-screen widget and an iOS 18 Control that beam your latest
  screenshot in one tap, without opening the app first.
- **Mac:** see what an update contains before installing it — the release notes
  now appear in About, next to the Install button.

### Fixed

- **Both:** a refunded or suspended licence can be removed from the app again.
  It previously reported "Couldn't reach the license server" — about a server
  that had answered immediately — and left the dead key in place, with no way to
  enter a new one.
- **Both:** a licence is described as covering 3 devices, Macs and iPhones
  together, rather than 3 Macs. Corrected everywhere, in all eight languages.
- **iPhone:** widget and Control taps reliably open the app and beam.
- **iPhone:** the Hostbeam action shows its icon in the share sheet.

## 0.1.6 — 2026-08-28

### Added

- **iPhone:** beam an image straight from the clipboard — the row appears only
  when there is actually an image to send.
- **Both:** Website, Privacy and Terms links, plus Send feedback, in About.

### Fixed

- **iPhone:** result cards now anchor inside the action section instead of
  drifting out of place.

## 0.1.5 — 2026-08-23

### Added

- **Both:** see how much space Hostbeam's own screenshots use on a remote host,
  and clean them up — owner-invoked, confirmation-gated, and never touching
  anything Hostbeam did not upload.
- **iPhone:** appearance switcher (System / Light / Dark), matching the Mac.

### Fixed

- **iPhone:** the appearance setting now applies to sheets as well as the main
  screens, and changes take effect immediately rather than on next launch.

## 0.1.4 — 2026-08-23

### Added

- **iPhone:** add hosts by scanning a QR code from the Mac at any time, not only
  during first-run setup.
- **iPhone:** beam from the share sheet in any app, via a Hostbeam action.
- **Both:** a friction-free way to get your SSH key onto the iPhone, authorised
  from the Mac.

### Fixed

- **iPhone:** the uploading animation actually animates.

## 0.1.3 — 2026-08-22

### Added

- **Mac:** an update indicator — a dot on the popover gear and in About when a
  newer version is available.

## 0.1.2 — 2026-08-22

### Fixed

- **Mac:** "Open Terminal" opens Terminal rather than handing the connection to
  whatever claimed the `ssh://` URL scheme.

## 0.1.1 — 2026-08-22

### Added

- **Mac:** working About links, Send feedback, and Open Terminal.

## 0.1.0 — 2026-08-22

First public release: signed, notarised, and distributed directly.

- Beam the screenshot on your clipboard to your own server over your existing
  SSH config, and get the paste-ready URL back on your clipboard.
- Menu-bar app with a global hotkey and a floating beam HUD.
- Host discovery from your SSH config, per-host remote folders, reachability
  checks and diagnostics.
- Recent history, and a diagnostic log you can read and copy.
- Eight languages: English, French, Japanese, Spanish, German, Simplified
  Chinese, Brazilian Portuguese and Korean.
- Free tier of 5 beams a day, metered entirely on your own machine — no account,
  and no network calls for free users.

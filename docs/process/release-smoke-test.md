# Release Smoke Test (signed artifact)

The concrete run sheet behind [packaging-checklist.md](packaging-checklist.md) §8.
Run it against **the artifact a user would get** — not the local build output —
after `scripts/release-macos.sh` finishes. Reusable every release; items marked
**(first release only)** can be skipped on later ones.

## 0. Install like a user

- [ ] Download `https://download.hostbeam.app/Hostbeam.dmg` **in a browser**
      (this attaches the quarantine attribute — the whole point; opening the
      locally built dmg skips the real Gatekeeper path).
- [ ] Mount, drag Hostbeam to `/Applications`, eject.
- [ ] First launch from `/Applications`: opens **without** any right-click →
      Open bypass or "unidentified developer" dialog. A plain "downloaded from
      the internet" confirmation is fine; a scary blocked dialog is a fail.
- [ ] **Homebrew path** (the release script bumped the tap): `brew update &&
      brew livecheck --cask hostbeam` names the new version, and `brew upgrade
      --greedy hostbeam` installs it. Plain `brew upgrade` must leave it alone
      (`auto_updates`).

## 1. Verify the signature chain (terminal)

```bash
spctl -a -vvv -t execute /Applications/Hostbeam.app   # → accepted, Notarized Developer ID
codesign --verify --deep --strict -v /Applications/Hostbeam.app
xcrun stapler validate /Applications/Hostbeam.app     # → The validate action worked!
```

## 2. First-run + core beam

- [ ] **(first release only)** Wipe app state first so onboarding runs:
      `defaults` / `~/Library/Application Support/com.hostbeam.app` cleared,
      Keychain item `com.hostbeam.license` deleted.
- [ ] Onboarding completes; a real host is added (from ~/.ssh/config discovery).
- [ ] **Popover beam** to a real host: screenshot on clipboard → beam →
      success state, file lands on the host, sentence on the clipboard.
- [ ] **Silent hotkey beam**: HUD appears top-center (preview → beaming →
      Beamed → auto-hide), same result on the host.
- [ ] **Ten silent hotkey beams in a row**, a fresh screenshot each time: no
      crash, all ten land. The beam and the HUD's thumbnail read the clipboard
      at once, which could abort 0.1.27 (fixed in 0.1.28, `clipboard.rs`).
- [ ] **Ten beams started by a link** — `open hostbeam://beam`, or Raycast's
      Beam Clipboard: a link also opens the popover, a third clipboard reader.
      Same result, never a crash.
- [ ] **Copy buttons** (written by Rust since 0.1.28): a Recent row in the
      popover and in Preferences, Logs → Copy all, Share → Copy Link — each
      pastes what it says.
- [ ] **Failure state**: beam to an unreachable host → calm taxonomy error
      card, clipboard untouched.
- [ ] **Any file, where only a bundle can show it** (since any file became
      beamable; `tauri dev` cannot test these): drop a PDF on the **Dock**
      icon; `open -a Hostbeam report.pdf`; Finder → a PDF → right-click → Open
      With — note whether Hostbeam is listed (LSHandlerRank `None` may keep it
      off; nothing claims it is). Each lands, pasting "Use this file: …".
- [ ] **Finder copy + hotkey**: ⌘C a PDF in Finder, press the beam shortcut —
      the PDF lands, never a picture of its icon. ⌘C an `id_*` key → the
      popover asks; Return does *not* send it.
- [ ] **Show in Finder**: the folder button on that PDF's Recent row (popover
      and Preferences) reveals it in Finder; after moving the file, the row
      says "No longer on this Mac". A clipboard screenshot's row has no button.

## 3. The reminder + licensing under the signed binary

The Keychain is the area most likely to behave differently for a signed app
vs a dev binary — exercise it deliberately.

- [ ] Unlicensed: the popover says "Unlicensed" beside the name, and it opens
      the license card (Buy / Enter key / Not now). No beam is ever refused.
- [ ] The reminder (ADR 0028): with `license.json` set to `"beams": 9` and a
      `"firstBeam"` more than 7 days ago, the next shortcut beam's HUD says
      "Enjoying Hostbeam? Get a license" and stays up longer; clicking it
      opens the popover on the license card. A beam from the popover shows
      the same line under the done card.
- [ ] **Activate** a real (sandbox-minted) license in Preferences → License:
      succeeds, and "Unlicensed" is gone the next time the popover opens.
- [ ] Key is in the **Keychain, not on disk**: `license.json` has no `key`
      field; `security find-generic-password -s com.hostbeam.license` finds it.
- [ ] **Quit and relaunch**: still Licensed, **no Keychain permission prompt**
      (a per-launch prompt = ACL problem = fail).
- [ ] **Deactivate → reactivate** round-trip works; deactivate removes the
      Keychain item.
- [ ] About pane → **Check for updates**: reports up-to-date against the
      just-published `latest.json` (the real update install is testable only
      from the *next* release: install this version, publish v0.1.x+1, then
      verify About offers + installs it). With **Install updates
      automatically** on, that next release should instead install itself and
      relaunch within a couple of minutes of the popover and Preferences being
      closed, and the popover should then say "Updated to 0.1.x+1" once
      (ADR 0022; log lines `update … installed` and `relaunching into …`).
- [ ] **An update pending at launch opens the popover by itself, on screen**
      (since 0.1.28): launch with a newer version on the feed → within seconds
      of starting, the popover opens on its own, wholly on screen — with a
      Retina and a standard display side by side, whichever was active at
      launch. A skipped version, or one already installed in the background,
      does not open it. Testable from the next release (install this one,
      publish 0.1.x+1, relaunch), or now through the local feed below, whose
      read-only step is exactly this launch.

### Trying a background install without a release

`npm run test:update-install` (`scripts/test-update-install.sh`, about ten
minutes) builds the app twice as a throwaway test app — its own name and bundle
identifier, a throwaway updater key — serves the newer build from a local feed,
and checks the three paths ADR 0022 cares about: with checking off nothing is
sent; with the app's folder read-only `latest.json` is fetched but not the
archive, the log says why, and the launch check opens the popover instead; with
both switches on the update installs, the app relaunches once idle, the
relaunched app finds nothing newer, and neither opens the popover. It prints
PASS or FAIL per check and exits non-zero on any failure; keep the lid open, since
a step the Mac sleeps through is reported as SKIP (exit 2) rather than failed. Nothing touches
`/Applications`, `com.hostbeam.app` or `download.hostbeam.app`, and everything it
creates is removed on exit (`--keep` keeps the builds, feed and logs).

Leave the test app's second menu-bar icon alone while it runs, and its popover
when it opens by itself in step 2: an open popover is exactly what holds a
relaunch back. "Updated to …" cannot appear in this test,
because `app_version` is the Cargo version and the test build overrides only the
Tauri one.

## 4. Preferences sweep

- [ ] Startup switches (General): turning "Launch at login" on adds Hostbeam
      under System Settings → General → Login Items (off removes it); "Show icon
      in the menu bar" off hides the tray icon; "Show in the Dock" on shows a
      Dock icon whose click opens the popover, and the switch that would remove
      the last icon is disabled. With the Dock icon on, ⌘⇥ to Hostbeam opens the
      popover too; launching the app does not (only a later switch to it does).
- [ ] Updates switches (General → Updates, ADR 0022): checking is on and
      installing off unless changed; turning checking off greys installing out
      and shows it off. With an update pending, **Skip for now** on the popover
      line hides that version from the line and both dots, and About still
      offers to install it.
- [ ] Every pane renders (General / Hosts / Hotkey / License / Recent / About);
      sheets open (Add host, Diagnostics, Share to iPhone QR).
- [ ] Appearance switcher: System / Light / Dark apply live and persist;
      popover picks the change up on next show.
- [ ] No white flash on opening Preferences; quit button in the popover works.
- [ ] i18n spot check: switch through a few locales (at minimum ja or zh +
      one European) — no missing keys, layout holds.

## 5. Environment quirks

- [ ] **Menu-bar manager check**: with Bartender / Ice running, open
      Preferences from the popover — the window must appear and stay
      (regression guard for the ActivationPolicy fix, b3ef39f).
- [ ] Tray icon reads correctly in light **and** dark menu bars, including
      while the beam animation plays.
- [ ] Dock icon (visible while Preferences is open) and ⌘⇥ icon show the
      padded mark, not a full-bleed square.

## 6. Close out

- [ ] `git tag v<version> && git push origin main v<version>`; note anything found above in
      the milestone doc before fixing.

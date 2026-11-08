# Packaging & Distribution Readiness

The single tracked checklist for shipping Hostbeam. Nothing here blocks development;
it's the "before we cut a release" list so no hardening/signing step is forgotten.

**Distribution shape (decided — [ADR 0008](../adr/0008-direct-macos-distribution-without-app-sandbox.md)):**
direct macOS distribution, **Developer ID signed + notarized**, **outside** the Mac App Store,
**App Sandbox disabled** (the app reads `~/.ssh/config` and shells out to system `ssh`/`scp`).

**Snapshot (2026-07-01):** Tauri v2 (CLI 2.11.3) · `productName` Hostbeam · `identifier`
`com.hostbeam.app` · `version` 0.1.0 (tauri.conf.json / Cargo.toml / package.json in sync) ·
icons present incl. tray · **not yet configured:** CSP, macOS signing, notarization,
entitlements, bundle metadata, auto-update.

---

## 1. Content Security Policy — apply & verify FIRST

**Status: applied ✅ and verified (2026-07-01)** in both `npm run tauri dev` and `npm run tauri build`
— both windows render, IPC works (beam / hosts / diagnostics / hotkey), no CSP violations. If the
values below are ever changed, re-run the verification (a wrong value can break IPC silently).

The values now in `src-tauri/tauri.conf.json` under `app.security`:

```jsonc
"security": {
  // Production (built app). Tauri auto-injects nonces/hashes for the bundled
  // scripts/styles it parses at compile time; we only declare what the app needs
  // beyond that.
  "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: data:; font-src 'self'; connect-src 'self' ipc: http://ipc.localhost; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  // Development (tauri dev over the Vite server): adds the HMR websocket + the
  // inline React-refresh preamble Vite injects (not present in prod).
  "devCsp": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: data:; font-src 'self'; connect-src 'self' ipc: http://ipc.localhost ws://localhost:1420 http://localhost:1420; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
}
```

Why each non-obvious token:
- `style-src 'unsafe-inline'` — **required**: the design system injects `<style>` at runtime via
  `ensureStyle()` and uses inline `style={{}}`; Tauri can't hash runtime-injected styles.
- `img-src … data:` — clipboard thumbnails/previews are base64 `data:` URIs. `asset:` is for any
  future `convertFileSrc()` file previews (harmless now).
- `connect-src … ipc: http://ipc.localhost` — Tauri v2 IPC transport. **If beam / host list /
  hotkey / diagnostics stop working after enabling CSP, this directive is the first suspect.**
- dev-only `script-src 'unsafe-inline'` + `ws://localhost:1420` — Vite's React-refresh preamble
  and HMR socket; prod stays strict (`script-src 'self'`).

**Verify (both required) — done 2026-07-01:**
- [x] `npm run tauri dev` → **both** windows load; beam / Diagnostics / hotkey / appearance all work
      (IPC ok); no CSP violations observed.
- [x] `npm run tauri build` → built app: same checks pass (prod CSP). (Devtools aren't exposed in the
      release build, so this was a functional/visual pass; use `tauri build --debug` if you need the
      console against the prod policy.)

## 2. macOS signing (Developer ID)

- [x] Apple Developer account — individual enrollment **approved 2026-07-07**
      (convert to the company later once its D-U-N-S exists). **Developer ID
      Application** certificate created and installed in the login Keychain
      (`Developer ID Application: <developer name> (U3C6XC6LHJ)`) — verified with
      `security find-identity -v -p codesigning`. Post-enrollment gotcha: certificate
      creation 403s ("Access Unavailable") until the latest Program License Agreement
      is accepted on the account overview page.
- [x] Team ID: **U3C6XC6LHJ**.
- [x] **Signing identity backed up**: Developer ID cert + private key exported as a
      password-protected `.p12` into the owner's password manager (2026-07-07), alongside
      the notarytool app-specific password (on the Apple ID entry) and the updater key.
- [x] Config: env-driven — `APPLE_SIGNING_IDENTITY` consumed by `scripts/release-macos.sh`;
      no identity committed to tauri.conf.json. Hardened Runtime is on by default for Developer ID.
      Both rust targets (`aarch64-apple-darwin`, `x86_64-apple-darwin`) installed for the
      universal build.
- [ ] **App Sandbox stays OFF** (ADR 0008) — do not add the sandbox entitlement.
- [ ] Entitlements: create `src-tauri/entitlements.plist` **only if** codesign/notarization flags a
      hardened-runtime issue. Shelling out to system `ssh`/`scp` normally needs none; if it does,
      add the minimal `com.apple.security.cs.*` exception and reference it via `bundle.macOS.entitlements`.

## 3. Notarization + stapling — done ✅ (2026-08-22, v0.1.0)

- [x] Tauri notarizes + staples the `.app` during build (`APPLE_ID`/`APPLE_PASSWORD`/`APPLE_TEAM_ID`);
      the **dmg needs its own** notarize + staple pass — `scripts/release-macos.sh` does it
      (found live: spctl rejects the dmg as "Unnotarized Developer ID" otherwise).
- [x] Verified on the shipped v0.1.0: `spctl -a -vvv` accepted (Notarized Developer ID) for app
      and dmg, `stapler validate` ok, quarantined download launches clean.

## 4. Bundle metadata — done ✅ (2026-07-04)

- [x] `bundle.copyright` / `category` (DeveloperTool) / `shortDescription` /
      `longDescription` / `publisher` set in tauri.conf.json; targets narrowed to app+dmg.
- [x] `bundle.macOS.minimumSystemVersion` = **13.0** (matches the site's claims).

## 5. Auto-update — decided & integrated ✅ (2026-07-04)

- [x] **Release notes reach the user before they install (2026-08-30).**
      `scripts/release-macos.sh` fills `notes` in `latest.json` from
      `CHANGELOG.md` via `scripts/changelog.mjs --json`, and **aborts the
      release if the changelog's newest entry is not the version being
      shipped** — an update with no description of what it changes is not worth
      publishing, and a stale entry is worse than none. `UpdateStatus` carries
      the notes through to the About pane, which shows them above Install.
      Same file feeds the site's /changelog and App Store Connect's "What's
      New" (`node scripts/changelog.mjs`), so the four cannot disagree.
- [x] **Yes**: `tauri-plugin-updater`, endpoint `https://download.hostbeam.app/latest.json`,
      public key in tauri.conf.json (private key + password in the owner's password
      manager — the one unrecoverable secret), `createUpdaterArtifacts` on. Rust-side
      `update_check`/`update_install` gate on the ADR 0014 update window
      (`licensing::release_within_window`); the About pane's check is real.
      Artifacts publish to R2 via `scripts/release-macos.sh`.

## 6. Version management

- [x] `scripts/check-version-sync.mjs` guards tauri.conf.json (source of truth) /
      Cargo.toml / package.json drift; the release script runs it first.
- [ ] Bump all three together each release (a bump script is still a nice-to-have).

## 7. App + tray icons

- App icons (`src-tauri/icons/*` — `.icns`/`.ico`/PNGs) are generated from the canonical logo
  `public/assets/hostbeam-icon.svg`. To regenerate after a logo change:
  ```
  rsvg-convert -w 1024 -h 1024 public/assets/hostbeam-icon.svg -o /tmp/icon-1024.png
  npm run tauri icon /tmp/icon-1024.png
  # then delete the android/ ios/ (and 64x64.png) it emits — this is a macOS-only app
  ```
- [ ] Confirm the menu-bar tray icon is a **template image** (black + alpha) so macOS tints it for
      light/dark menu bars automatically; verify it reads correctly in both, and while the
      beam-in-flight animation plays. (The tray glyph is separate — `hostbeam-menubar.svg` /
      `icons/tray/` — and is *not* touched by `tauri icon`.)
- [ ] After a rebuild, the new app icon may be cached by Finder/Dock; if the old one lingers,
      clear the icon cache (or re-login) to force a refresh.

## 8. Pre-release smoke test (real environment)

- [ ] Run the concrete run sheet in [release-smoke-test.md](release-smoke-test.md) against the
      **downloaded** artifact (quarantined, like a user gets it): Gatekeeper/first-launch, signature
      chain, real-host beam (all states incl. failure), first-run onboarding, free tier + Keychain
      licensing under the signed binary, every Preferences pane + sheet, the appearance switcher,
      and an i18n spot check.
- [ ] **Menu-bar managers** — test with **Bartender / Ice / Vanilla** running. They hook menu-bar
      apps and can interfere with the non-activating panel's window activation; a confirmed symptom
      was the Preferences window showing then immediately vanishing under Bartender (not a Hostbeam
      bug — it worked with Bartender off). **Mitigated (b3ef39f, verified working under Bartender):**
      `open_preferences` promotes the app to `ActivationPolicy::Regular` while Preferences is open and
      drops back to `Accessory` on the window's `Destroyed` event — so a real window activates
      normally even under a menu-bar manager. Tradeoff: a Dock icon appears for the lifetime of the
      Preferences window (gone when closed). Re-verify with Bartender/Ice/Vanilla on each release.

(The native success notification was removed — the beam HUD is the confirmation now — so there's
no notification to verify here.)

---

## Decisions still needed from the owner

- Developer ID identity + Team ID (credentials).
- Auto-update: yes (Tauri updater) or no (manual).
- Minimum macOS version to support.
- Distribution host for the `.dmg` (+ update manifest, if auto-update).

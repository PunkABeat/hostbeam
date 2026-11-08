# iOS Companion — Design & Parity Spec

Governs `apps/mobile/` UI work (ADR 0017). Source of truth for brand values:
`docs/design/hostbeam-handoff/` (tokens doc 02, voice doc 01, behavior doc 05).
Rule of thumb: **structure is iOS, identity is Hostbeam.**

## 1. Brand layer (the token bridge)

Transcribe into `App/Design/BrandTokens.swift`:

- **Accent**: beam-500 `#2D6CF6` as the app tint (`.tint`), beam-600 pressed.
  Dark mode: beam-500 `#4C8DFF`. Accent-tint fills: `#EAF1FE` /
  `rgba(76,141,255,0.16)`.
- **Semantic**: success `#28A745`/`#32D74B`, warning `#E08600`/`#FF9F0A`,
  danger `#E5484D`/`#FF6961` (light/dark).
- **Surfaces**: use system backgrounds (`systemGroupedBackground` etc.) — do
  NOT transcribe desktop surface hexes; iOS materials are the point of the
  native idiom.
- **Type**: Geist (bundled) for **display roles only** — nav/hero titles,
  onboarding heads, empty-state titles. System (SF) for body/controls/lists.
  Mono (SF Mono via `.monospaced()`) for paths, hostnames, `user@address`,
  sentences — "mono for the literal" carries over verbatim.
- **BeamMark**: port the mark + its uploading/landing animation (signal bars
  pulse toward the node; one node-pop + ring bloom on landing) as a SwiftUI
  view from `assets/hostbeam-mark.svg` + the keyframes in the reference
  prototypes. **It remains the only expressive animation.** Respect
  `accessibilityReduceMotion` (show end state).
- **Motion**: durations 80/140/200/320ms, desktop ease-out curve, press scale
  0.97, no bounce anywhere except the single landing spring.
- **App icon**: derive from `hostbeam-icon.svg` (needs iOS master sizes —
  open item).

## 2. Voice

Doc 01 applies verbatim: calm not chirpy; **Beam** is the verb everywhere
("Beam screenshot", "Beaming…", "Beamed to {host}", "Beam again"); one warmth
line per surface max; sentence case; no exclamation marks. Reused copy:
result label `Copied — paste it to your agent.`, empty hero `No host yet.` +
warmth `Point me at a host and I'll beam your screenshots there.`, privacy
stance "There's no 'us' in the path."

## 3. Feature-parity map (desktop → iOS)

| Desktop | iOS disposition |
|---|---|
| Menu-bar popover | **Home screen** (§5.1) — same section order: beam action → result → Recent → Beam-to footer |
| Global hotkey ⌘⇧7 | **App Intent** (done, slice 2) via Action Button/Back Tap/Shortcuts — the parity surface |
| Clipboard screenshot source | Latest screenshot (intent) / share sheet / photo picker — iOS reality, already decided (ADR 0016) |
| `~/.ssh/config` discovery | **QR pairing from the Mac** + manual entry (no config file exists on iOS) |
| Host manager (rename, set-default, remove, per-host folder, last-beamed) | **Full parity** in Hosts screen (§5.3). Remove = swipe + Edit mode; remove also unpins the host key |
| Connection test + 4-step diagnostics | **Parity**: same checks (reachable / auth / folder writable / latency), ok/warn/fail/skip rows, mono details |
| Error taxonomy (timeout/auth/perm) | **Parity + 2 iOS-only kinds**: `hostKeyMismatch` ("{host}'s key changed — refused for safety." + "If you rebuilt this server, re-trust it in Hosts.") and `unsupportedServer` ("This server's SSH setup isn't supported yet.") |
| Paste-ready sentence template editor | **Parity** in Settings (same `{path}` token + live preview) |
| Recent beams (thumbnails, copy button, relative time) | **Parity** on Home; add thumbnails + copy affordance (today it's text-only) |
| Success notification | **Not in-app-triggered on iOS**; the intent's dialog + share extension's confirmation are the feedback. Local notifications: not needed v1 |
| Launch-at-login / show-in-menubar | N/A on iOS |
| Preferences window | **Settings screen** (§5.4), grouped Form |
| Free-tier limit card + ≤2 remaining counter | **Removed** (ADR 0028, 2026-09-27): the iPhone is free with no limit, so there is no card, no count and no reminder. The Mac's limit went too, replaced by a reminder that never shows on the iPhone |
| Updater/About | About section in Settings (version, privacy stance); updates come from the App Store |

## 4. Onboarding (full guided flow, 4 steps)

Native full-screen paged flow, Geist heads, 4-dot indicator; **every step
skippable** ("Set up later" → empty-state Home; setup must never feel like
paperwork). BeamMark plays its one-time gentle beam on the Welcome step.

1. **Welcome** — mark + "Beam screenshots to your dev box." + privacy warmth
   line. `Get started` / ghost `Skip for now`.
2. **Add your host** — two cards: **Scan from your Mac** (camera → QR, §6) and
   **Enter manually** (the existing form). Post-scan the form shows prefilled
   for confirmation.
3. **Authorize this iPhone** — the iOS-unique step. Shows the device key
   install one-liner (mono block + Copy), a plain-words explanation ("your
   private key never leaves this phone"), and **Test connection** → first
   connect performs TOFU pinning, then success row `ed25519 · {folder}
   writable` or a taxonomy error. This step is where the magic bar is won;
   copy must assume the user has a Termius session open to paste into.
4. **Beam something** — offers the three surfaces (share sheet, Action
   Button/Shortcut with an `Add Shortcut` button via `ShortcutsLink`, in-app
   picker) and finishes into Home. If a screenshot exists, offer a live first
   beam.

## 5. Screens

### 5.1 Home
Replaces the current list. Sections (mirrors popover order): **hero beam
button** (accent, BeamMark idle at left) + beneath it the last-result block
(accent-tint bg, `Copied — paste it to your agent.` + sentence in mono,
`{path}` accent/semibold) → **Recent** (thumbnail + mono filename + `{host} ·
relative time` + copy button; 5 shown, `+N more` → full history) → **Beam to**
footer row (StatusDot-equivalent, alias + `user@address` mono, chevron →
host picker sheet). Beaming state: BeamMark uploading + `Beaming to {host}…`,
thin progress bar. Errors render the taxonomy card inline (title / mono
detail / hint / Retry · Switch host).

### 5.2 Share extension
Same visual system (compact): BeamMark uploading → landing, then the result
block; errors use the same taxonomy cards. Failure never writes the clipboard.

### 5.3 Hosts
List of hosts (alias, `user@address` mono, default checkmark, last-beamed
caption). Swipe to delete (also unpins host key), tap → **Host detail**:
rename, per-host remote folder override (folderFor rule from doc 05: override
wins, else default), set default, **Test connection**, diagnostics rows,
pinned-key status with `Re-trust` (unpin + explain). Add via + → QR scan or
manual. Device-key screen stays as-is (already on-voice).

### 5.4 Settings
Grouped Form: **General** (paste-ready sentence editor with `{path}` token +
live preview using the real last path; default remote folder), **Beam
faster** (widget, Back Tap, Control Center tips), appearance and language,
**About** (version, privacy stance, links). No plan or license section: the
iPhone app is free with nothing to buy (ADR 0028 §4, 2026-09-27; the license
section that slice 6 built is removed).

## 6. QR pairing payload (`hostbeam-host/v1`)

Desktop renders; iPhone scans. JSON, versioned, **never contains keys**:

```json
{"v":1,"kind":"hostbeam-host","alias":"prod-box","hostname":"10.4.0.12",
 "port":22,"user":"dev","folder":"/tmp/hostbeam"}
```

- iOS validates `kind`+`v`, then shows the prefilled confirm form (never
  silently adds).
- Desktop surface: Hosts pane → host row action "Share to iPhone…" showing
  the QR + the same info as text. Desktop slice tracked in Milestone 008.
- Camera permission string: "Hostbeam uses the camera only to scan the host
  QR from your Mac."

## 7. Open items

- App icon master + BeamMark SwiftUI port fidelity pass.
- Whether Home needs a widget (later; the intent already covers Lock
  Screen/Action Button).
- Haptics: single soft success tap on landing (respecting system settings) —
  the iOS analog of the menu-bar blip; chime stays desktop-only.

# Hostbeam Design QA

scope: the **desktop app's** popover, and only that. Nothing here applies to
`apps/web` — the marketing site is not QA'd against a prototype, by
[ADR 0019](../adr/0019-marketing-site-dressed-like-the-app.md).

source visual truth path: `docs/design/hostbeam-handoff/reference/prototypes/popover/index.html`
source component evidence: `docs/design/hostbeam-handoff/reference/prototypes/popover/popover.jsx`
implementation target: current Flutter/AppKit popover implementation
implementation screenshot path: `docs/design/hostbeam-handoff/qa-popover-ready.png` (live capture, ready state, host `linux-box`, history empty)
reference screenshot path: `docs/design/hostbeam-handoff/qa-reference-ready.png` (prototype `prototypes/popover/index.html` rendered server-side, steady state with recent + host)
viewport: intended menu-bar popover, 340px wide
state: steady-state ready popover with one selected host (plus no-host, beaming, done, failed, recent)
reference sync: live `claude.ai/design` project and the local `docs/design/hostbeam-handoff/reference/` snapshot are byte-for-byte identical (popover.jsx + all five token CSS files verified). No drift; the snapshot is a valid source of truth.
final result: steady-state structure aligned and visually confirmed by a live render; prior P1 blockers closed. Pass 2026-06-22 applied and verified [O2] meta, [O3] beak, [O6] done-state swap, [O7] interactive recent copy, [O8] dead-button removal, [O4] shadow token helpers, [O5] SVG brand mark, the ⌘⇧7 hotkey change, [O9] Phase 3 host selection, and [O10] Phase 4 BeamMark motion. Product decisions: hotkey → ⌘⇧7, Preferences → deferred (so [O1] header gear stays Refresh for now). [O11] error taxonomy, [O12] dark theme, and [O13] Geist font are also done. The only remaining item is [O1] (header gear), deferred with Preferences. The live capture covered only the ready state (capturing no-host/beaming/done/failed would mutate the user's real host config or trigger real uploads); those remain source-level / test-covered.

## Component Source Audit (2026-06-22/23)

Ported each popover component from its actual `components/*.jsx` source (not the spec docs), fixing every property delta:

- **HostSelect** → `HbHostSelect`: bordered 28px trigger; upward, full-width `surface-overlay` + 20px blur menu with `shadow-menu`; accent-on-hover rows (white text), `Default` pill, check on selected; filter field appears at >5 hosts; 6px name/address gap.
- **Button** → `HbButton`: 13px text (was 12), 4px icon gap (was 6), `lg` padding 16, secondary is a 0.5px hairline ring with no drop shadow (was a control shadow), danger is an outline (was solid red).
- **Badge** → `HbBadge`: full **pill** radius (was 5px rect), 3×8 padding, 6px dot, accent foreground = `--accent` (was beam-600), neutral bg = `fill-secondary`.
- **Keycap** → `HbKeycap`: system font (was SF Mono), `label-secondary` color, min-width 18, 3px inter-key gap with 6px lead from "or press", hairline + 1px bottom shadow.
- **StatusDot/ShotThumb**: dot sizes and the thumbnail placeholder already align with source.

## Layout Reconciliation vs popover.jsx (2026-06-23)

Region-by-region pass against `prototypes/popover/popover.jsx`:

- Host selector trigger/options: name + address are both `Expanded` so the right-aligned `user@address` (or check) sits flush against the chevron — fixes the short-name float where the address landed mid-row.
- Idle block: button→keycaps gap is the content column's 13px (was 8); "or press" is `label-tertiary` (was secondary).
- Recent rows: replaced the heavy shared `HbListRow` with a dedicated `_RecentRow` matching the prototype — `7×6` padding, 38×26 thumb, regular 11px mono filename, 10.5px tertiary "host · time", 26×26 copy button.
- Clipboard row, footer, header padding/gaps already matched the source.
- Known residual: the done-state sentence is rendered fully in the accent color rather than label text with only the path in accent (minor); the rich error panel is our own layout, not a 1:1 port of the prototype's failed state.

## Live Render Comparison (ready state)

Captured the real AppKit panel by CoreGraphics window ID (it anchors to a status item on a secondary display, off the main screen) and rendered the prototype server-side for a direct side-by-side. The implementation reads convincingly as a compact macOS menu-bar popover; the steady-state structure matches the reference. Visual deltas confirmed against `qa-reference-ready.png`:

- Beak: reference has the top-right beak pointing at the menu bar; implementation has none ([O3]).
- Header trailing icon: reference shows the Preferences sliders/gear; implementation shows a Refresh icon ([O1]).
- Clipboard meta: reference shows full `PNG · 2560 × 1440` in mono; implementation shows `PNG · checked when you b…` which **visibly truncates** next to the Ready badge — worse in render than on paper, promote within [O2].
- Beam button icon: FIXED — was a bolt, now an upward arrow (`Icons.arrow_upward`) matching the design's upload glyph.
- Hotkey hint: RESOLVED — the default hotkey was changed to `⌘⇧7` (Command+Shift+7) per the product decision; native registration and the keycap hint now both show `⌘ ⇧ 7`, matching the reference.
- Footer "Beam to": FIXED — ported the design's `HostSelect` component to `HbHostSelect`. Trigger is a 28px bordered field (1px `border-field` ring, dot + 500-weight name + 10px mono `user@address` + chevron). Clicking opens the design's upward, full-width menu: `surface-overlay` + 20px backdrop blur, `radius-lg`, `shadow-menu`, 4px padding; rows highlight to the accent with white text on hover, show a `Default` pill, and a check on the selected row (address otherwise). `HostName`/`User` parsed from the SSH config into `SshHost.address`.
- Recent section correctly hidden when history is empty (matches the reference's conditional Recent).

Otherwise the surface material (`#F6F6F7`), 340px width, header scale, compact uppercase labels, separators, badge, keycaps, and primary button all render faithfully.

## Status Of Previous Findings

- [P1 → RESOLVED] Host management no longer appears in the everyday popover.
  `lib/src/ui/hostbeam_app.dart` 342-397: the selected-host branch renders `_ClipboardPanel`, `_BeamActionPanel`, optional result/error/notice/setup, `_HistoryPanel`, then `_BeamToFooter`. `_HostPanel` is now only in the `selectedHost == null` branch (325-341). `_BeamToFooter` is a compact host selector (`PopupMenuButton`), matching the prototype's "Beam to" footer (`popover.jsx` 299-303).

- [P1 → RESOLVED] Header is now compact.
  `_AppHeader` (421-461): 18px `HostbeamMark`, 13px/600 `Hostbeam` title, no subtitle, `12px 16px` padding, gap 9, hairline bottom separator. Matches `popover.jsx` 41-47. Remaining nit folded into [O1] below (trailing icon is Refresh, not the Preferences gear).

- [P1 → RESOLVED] Section structure uses compact labels and hairlines.
  `_CompactSectionLabel` (1173-1191) renders 10px/600 uppercase, 0.5 tracking, tertiary, used for both `Recent` (950) and `Beam to` (1042). The large visible history switch is gone; history shows only when enabled and non-empty (932) with a quiet `Clear` text button. `_SectionHeading` survives only in the no-host `_HostPanel`.

- [P2 → RESOLVED] Clipboard row matches prototype measurements.
  `_ClipboardPanel`: card surface (`surface-content` + `radius-lg`), `12px 13px` padding, 44x30 `ShotThumb`, 12.5/500 title, 11px mono meta, success badge with dot. [O2] fixed — meta is now a clean, non-truncating `PNG`; real dimensions stay out of scope (no proactive clipboard inspection in Milestone 005). Minor remaining: 1px border vs the prototype's 0.5px inset hairline ring (folded into [O4]).

- [P2 → RESOLVED] Hotkey keycaps are symbolic.
  `_BeamActionPanel` (583-586) renders `⌃ ⌥ ⌘ U` via `HbKeycap`, preserving the real Control+Option+Command+U shortcut.

- [P2 → RESOLVED] Popover radius and beak.
  `HostbeamPlatformBridge.swift`: `panelCornerRadius = 12` ✓ and a top-right beak is now drawn via a `CAShapeLayer` mask (rounded body + triangle, `beakRightInset = 23`, `beakHeight = 7`) on the enlarged panel window; the Flutter header reserves the strip via `kPopoverBeakInset`. No outer opaque shell reintroduced. Confirmed in `qa-popover-ready.png`.

- [P2 → RESOLVED] Button/surface shadows token-aligned.
  `HostbeamTokens.shadowAccent` (`rgba(27,90,224,.35)` drop) is applied to the primary `HbButton`, with a subtle top gradient approximating the token's inset white highlight (Flutter shadows have no inset). `shadowControl` is applied to secondary buttons. Content cards now use a 0.5px hairline border to match the inset-ring weight. See [O4].

- [P2 → RESOLVED] Brand mark renders from SVG.
  `HostbeamMark` now uses `SvgPicture.asset('assets/hostbeam-mark.svg')` via the new `flutter_svg` dependency (bundled copy uses literal `#2D6CF6`; `flutter_svg` does not resolve the source SVG's `var(--accent)`). The custom painter was removed; `BeamMark` keeps its painter for the upload animation. See [O5].

## New Findings

- [O1][DEFERRED] Header trailing affordance is Refresh, not Preferences.
  `_AppHeader` uses `Icons.refresh` ("Refresh SSH hosts"); the prototype uses a `sliders` gear that opens Preferences. Product decision (2026-06-22): Preferences is deferred, so there is no surface for the gear to open — Refresh stays intentionally until Preferences is built. Revisit then.

- [O2][P2] Clipboard meta copy and card edge drift from the prototype.
  See clipboard-row note above. The real dimensions are not known until the clipboard image is read; either read width×height from the pending PNG to show `PNG · W × H`, or accept the placeholder and document it. Also consider an inset 0.5px hairline ring instead of the 1px `Border.all` to match the prototype's edge weight.

- [O3][P2] No popover beak.
  Add a lightweight top-edge arrow (right-aligned, ~23px from the right) in Flutter content or AppKit so the surface reads as an anchored menu-bar popover. Must not reintroduce an outer opaque shell.

- [O4][RESOLVED] Shadow token helpers ported.
  `HostbeamTokens.shadowAccent` / `shadowControl` added and applied to primary/secondary buttons; the inset highlight is approximated by a top gradient (no inset shadow in Flutter); content cards use a 0.5px hairline. AppKit keeps the outer panel shadow.

- [O5][RESOLVED] Mark renders from SVG.
  Added `flutter_svg`, bundled `assets/hostbeam-mark.svg` (literal accent color), and `HostbeamMark` renders it; custom mark painter removed. `BeamMark` painter retained for the upload animation.

- [O6][RESOLVED] Done/result state is now a swap.
  `build` computes `showResult = _lastBeam != null && _errorMessage == null && !_isUploading`; when true the beam button is replaced by `_ResultPanel` — an `accent-tint` block (paste icon + "Copied to clipboard" + "Beamed to {host}" + mono accent path) plus a block "Beam again" button (`_beamAgain` resets to idle). The clipboard badge flips to accent "Beamed". Covered by the "beam again swaps…" widget test.

- [O7][RESOLVED] Recent-row copy is interactive.
  `_HistoryPanel` is now stateful; the trailing `_RecentCopyButton` copies `entry.copiedText` via `Clipboard.setData` and flips to a check for 1.4s. Covered by the "recent beam row copies…" widget test. (Overflow link left as `+N more` — the prototype's "in Preferences" target does not exist yet.)

- [O8][RESOLVED] Dead "Add a host" hero button removed.
  `_NoHostHero` no longer renders the no-op button; the discovered host list directly below is the real action. The prototype's single-CTA empty state is Phase 3 ([O9]). The empty-state widget test now asserts the button is absent.

- [O9][RESOLVED] No-host surface reworked into a clean host-selection step (Phase 3).
  The no-host branch is now `_HostSelectionStep`: the hero, an optional pending-upload notice ("Screenshot ready — pick a host to beam it."), and a compact "Pick a host" list where tapping a row chooses it as default, completes setup, and continues any pending just-in-time upload. The management-style `_HostPanel`/`_HostRow` (add/remove/default per row) and the separate `_SetupPanel` were removed; host switching after first run lives in the footer selector. Covered by the "first run shows a clean host picker" widget test.

- [O10][RESOLVED] Beaming state matches the prototype (Phase 4).
  `BeamMark` was rebuilt as a stateful widget with idle/uploading/landing states: uploading staggers a pulse up the three beam slices with a repeating ring bloom; landing blooms the ring once and pops the node — both gated behind `MediaQuery.disableAnimations` (reduced motion). The beaming view now uses `BeamMark(size: 58)`, 13/500 status text, and an indeterminate→full progress bar; a ~720ms landing beat plays on success before the result panel. Covered by the "BeamMark settles under reduced motion" widget test. The success notification copy (`Beamed to {host}`) already matched the handoff voice.

- [O11][RESOLVED] Beam error taxonomy.
  Added `BeamErrorKind` (unreachable/auth/folder/unknown) + `classifyBeamError(raw)` that classifies the OpenSSH `ssh`/`scp` output; `UploadFailure` carries the kind. The new `_BeamErrorPanel` shows a danger-tint card (icon + kind-specific title using the host + concise mono detail + recovery hint), a primary "Try again", an "or switch host below" pointer to the footer selector, and a collapsible diagnostics section. The idle beam button is omitted while a classified error shows. The clipboard-empty case keeps the simple notice. "Change folder" / live "Run diagnostics" are intentionally out of scope (folder editing belongs to deferred Preferences; diagnostics stay in the collapsible). Covered by classifier unit tests and an auth-failure widget test.

- [O12][RESOLVED] Dark theme.
  Added a brightness-aware `HbColors` palette (light/dark ported from `tokens/colors.css` + elevation shadows), provided via an `HbTheme` inherited widget and read with `context.hb`; `hostbeamTheme(Brightness)` drives `MaterialApp` `theme`/`darkTheme`/`themeMode: system`, and the AppKit panel material now resolves from `effectiveAppearance`. All widget color usages read from the palette. Covered by the "renders the dark palette…" widget test. (Live dark screenshot not captured — would require flipping the system-wide appearance.)

- [O13][RESOLVED] Geist UI face bundled.
  The OFL Geist weights (regular/medium/semibold/bold) were converted from the handoff `.woff2` to `.ttf` (Flutter desktop needs sfnt fonts), bundled under `assets/fonts/`, declared as the `Geist` family in `pubspec.yaml`, and set as `ThemeData.fontFamily`. Mono text keeps `'SF Mono'` explicitly. Confirmed loading in `qa-popover-ready.png`.

## Required Fidelity Surfaces

- Fonts and typography: aligned. Compact labels, header, and clipboard-row sizes/weights match the prototype; the UI now renders in Geist (bundled OFL `.ttf`) with mono on SF Mono ([O13] resolved).
- Spacing and layout rhythm: aligned for the steady-state popover (header, sections, footer, 340px width). The no-host surface is still heavier than the prototype ([O9], Phase 3).
- Colors and visual tokens: aligned for both light and dark. The `HbColors` palette (provided via `HbTheme`/`context.hb`) carries label/fill/separator/surface/accent/semantic colors plus accent and control shadows for each brightness ([O12] resolved).
- Image quality and asset fidelity: aligned — brand mark now renders from `assets/hostbeam-mark.svg` via `flutter_svg` ([O5]).
- Copy and content: aligned. [O2]/[O6]/[O7] resolved; recent overflow link kept as `+N more` (no Preferences target yet).

## Patch Set — Status

Applied 2026-06-22: **[O2], [O3], [O6], [O7], [O8]**, then **[O4], [O5]**, then the **⌘⇧7 hotkey change** and **Phase 3 host selection ([O9])**, then **Phase 4 BeamMark motion ([O10])**. Product decisions taken: hotkey → `⌘⇧7`, Preferences → deferred. All verified (analyze + 21 widget tests + `flutter build macos`; ready-state captured in `qa-popover-ready.png` showing the beak, `PNG` meta, SVG mark, accent button shadow, and `⌘ ⇧ 7` keycaps).

Also applied: ⌘⇧7 hotkey, Phase 3 host selection ([O9]), Phase 4 BeamMark motion ([O10]), a `NativeBridge` interface (JIT upload now tested), and [O12] dark theme.

Also fixed in follow-up visual passes: the beam button icon (bolt → upward arrow) and the BEAM TO host selector (now a bordered select field showing `user@address`, parsed from the SSH config).

Every numbered finding (O1–O13) is now closed or consciously deferred. The two remaining visible deltas from the design are intentional, not bugs:

1. [O1] Header trailing icon is Refresh, not the Preferences gear — deferred with Preferences (no surface to open yet).
2. Clipboard meta reads `PNG` rather than `PNG · W × H` — we do not proactively inspect the clipboard (Milestone 005 excludes clipboard detection), so real dimensions aren't known until beam time; showing fixed/fake dimensions would be dishonest.
3. Optional: capture beaming/landing/done/failed renders in a throwaway run (fixture host + auto-hide disabled) if pixel-level QA of those states is wanted. The beaming/landing states need a real or simulated upload; the no-host picker needs the configured default host temporarily cleared.

# Hostbeam — Developer Handoff (Flutter / macOS)

> **Audience:** an AI coding agent (and its human reviewer) building the real
> Hostbeam macOS app in **Flutter**. This package is the complete bridge from the
> HTML/React design prototypes in this project to a native Flutter implementation.

Implementation agents should also read:

- [Implementation readiness review](implementation-readiness-review.md)
- [Implementation plan](implementation-plan.md)

Those files explain how this handoff maps onto the current repository scope. The
handoff is authoritative for UI/UX direction, but milestone scope and ADRs still
control what behavior may ship.

---

## 0. Read this first

**The files referenced in this package are _design references_, not production code.**
They are HTML + React prototypes that demonstrate the intended look, motion, copy,
and behavior. **Do not transpile or embed the HTML.** Your job is to **recreate
these designs natively in Flutter**, using Flutter's widget system, `flutter_test`,
and a clean app architecture — matching the visuals and interactions pixel-for-pixel
and behavior-for-behavior.

**Fidelity: high.** Colors, typography, spacing, radii, shadows, motion, and copy
in these docs are final. Treat the hex values, px sizes, and durations as the spec.

---

## 1. What Hostbeam is (one paragraph)

Hostbeam is a **compact macOS menu-bar utility**. You copy a screenshot to your
clipboard, press one global hotkey (default ⌘⇧7), and Hostbeam uploads it over your
own SSH to a host you choose (default folder `/tmp/hostbeam`), then copies a
**paste-ready sentence** back to your clipboard —
`Use this screenshot: /tmp/hostbeam/2026-06-16-15.12.04.png` — which you paste into
a remote coding agent. The upload action ("the beam") is the center of the product;
everything else supports it. The aesthetic is restrained, quiet, and macOS-native.

## 2. The product principle that drives every decision

**The beam is the hero.** One primary action per surface. Everything else (host
selection, settings, history) is *supporting* and must never compete with it
visually or in motion. **The beam is the only expressive animation in the product** —
see §Motion. Copy is calm, plain, sentence-case, one warmth line per surface max.
The verb is **"Beam"** (never "Upload"/"Send"). Mono type is used for paths,
hostnames, and hotkeys.

## 3. ⚠️ Architecture note: screenshot-first, file-architected

The **product is positioned and presented as a screenshot tool** — all UI copy,
onboarding, and marketing say "screenshot." Keep it that way.

**But architect the input layer to be file-agnostic from day one.** On macOS the
clipboard (`NSPasteboard`) carries either **image data** (a screenshot) *or*
**file-reference URL(s)** (what Finder's ⌘C puts there). Build the "what's on the
clipboard?" resolver to handle both — image-data → screenshot beam; file-URL(s) →
file beam — even though the UI only ever talks about screenshots in v1. This makes
"beam any file" a capability that already exists quietly, and lets the product
widen later **without a rewrite**. Concretely:

- Model the beam payload as `BeamItem { kind: image|file, bytes/sourcePath, filename, mime, size }`, not as "a screenshot."
- The paste-ready sentence template should be type-aware-ready (`Use this screenshot:` vs `Use this file:`), even if only the screenshot string ships.
- Do **not** add file-picker / drag-drop UI in v1 — just make the clipboard resolver and the data model general.

Do not widen the *story*; widen the *seams*.

## 4. How to use this package

Read in order:

| Doc | What it covers |
|---|---|
| `01_product_and_voice.md` | Product surfaces, the "Beam" voice, copy rules, exact state-copy tables |
| `02_design_tokens.md` | Every color/type/spacing/radius/shadow/motion token → Flutter `ThemeData` + a ready-to-paste `HostbeamTokens` Dart class |
| `03_components.md` | Each design-system component → the Flutter widget to build, with props and visuals |
| `04_screens.md` | The popover, onboarding, and Preferences window — layout, sizes, and per-state behavior |
| `05_state_and_behavior.md` | The shared config model, the beam state machine, error taxonomy, persistence, hotkey |
| `reference/` | The original HTML/React prototypes — run them in a browser to see motion & interaction |
| `assets/` | App icon / mark / menu-bar glyph (SVG) and the Geist font files |

## 5. The three surfaces you are building

1. **Menu-bar popover** (340px wide) — the everyday surface: clipboard status →
   Beam button → result with the copied sentence → recents → host selector.
2. **First-run onboarding** — a 3-step popover-native flow (Welcome → choose host →
   Almost done, with an optional connection test) ending in the live Ready state.
3. **Preferences window** — a macOS Settings window with a Ventura-style sidebar
   (General / Hosts / Hotkey / About).

Plus the **menu-bar icon** itself (status item) and a **success notification/toast**.

## 6. Brand assets

- `assets/hostbeam-icon.svg` — full app icon (rounded-rect, beam-blue, the "beam ascending to a host node" mark).
- `assets/hostbeam-mark.svg` — the standalone mark (in-app, headers).
- `assets/hostbeam-menubar.svg` — the monochrome menu-bar template glyph (renders at 16–18px; macOS tints it).
- `assets/fonts/Geist-*.woff2` — primary UI face (Geist, SIL OFL — free to embed/ship). For Flutter, fetch the matching `.ttf`/`.otf` from github.com/vercel/geist-font (same license) and declare in `pubspec.yaml`. Mono is SF Mono on Mac (system), JetBrains Mono as fallback.

The app name "Hostbeam" is provisional but use it throughout.

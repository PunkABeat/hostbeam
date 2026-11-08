# Hostbeam — prototypes

Interactive, high-fidelity prototypes built from the Hostbeam design system
(`/styles.css` + `/_ds_bundle.js` components). Open each `index.html` directly.

## onboarding/
First-run onboarding. **Direction A (Popover-native) is locked in** as `index.html`:
a 3-step popover flow (Welcome → choose host → "Almost done" with an inline,
optional connection test) ending in the live Ready state.
- `index.html` — the chosen flow, in a menu-bar context (Replay + link to comparison).
- `comparison.html` — archived 3-way comparison (A · Popover-native, B · Welcome window,
  C · Single-card), all still clickable. Preserves directions B and C.
- `flowA/B/C.jsx`, `shared.jsx` — flow sources + shared data/icons (`window.OB`, `window.Ic`).

## preferences/
The macOS **Settings window** (compact, 4 tabs):
- **General** — startup + beaming toggles, remote folder.
- **Hosts** — SSH-host list (from `~/.ssh/config`), details, live connection test, set default.
- **Hotkey** — a real keystroke recorder (click Record, press a shortcut) + feedback toggles.
- **About** — version, provisional-name note, diagnostics/feedback.

Reuses `../onboarding/shared.jsx` for icons and mock host data.

# 01 — Product & Voice

## The "Beam" voice — four principles

1. **Calm, not chirpy.** Plain language, sentence case. No exclamation marks, no
   hype. "Beamed to prod-box." not "Success! 🎉"
2. **The verb is "Beam."** Beam (v.) replaces upload/send/transfer everywhere the
   user can see. The noun for a past upload is "a beam." "Beam screenshot",
   "Beaming…", "Beamed", "Beam again", "Beam to".
3. **One warmth line per surface, max.** A single human touch is allowed per
   surface; never two. e.g. the empty state's "Point me at a host and I'll beam
   your screenshots there." Everything else stays factual.
4. **Mono for the literal.** Paths, hostnames, addresses, and hotkeys render in the
   monospace face — they are values the user could type.

## Motion discipline (critical)

**The beam is the only expressive animation in the entire product.** Functional
feedback (hover, press, toggles, fades) uses quick, calm ease-outs with **no
bounce**. The only place with character is the **beam mark animation** and its two
companion cues:

- **BeamMark animation** — during a beam, the mark's horizontal "signal" bars pulse
  upward toward the node; on landing, the node pops once and a ring blooms outward a
  single time. (See `reference/` — `BeamMark` in `prototypes/onboarding/shared.jsx`,
  CSS keyframes in each prototype's `index.html`.)
- **Menu-bar blip** — when a beam lands, the menu-bar icon does one subtle scale +
  accent-ring pulse (~0.6s), then still. Confirmation, not decoration.
- **Soft chime** (optional, off by default) — a synthesized 3-note rising cue
  (D5→A5→D6) the instant a beam lands. Gated by a preference. In Flutter, ship a
  short bundled audio asset rather than synthesizing.

Everything else holds still. A spinning/looping decoration anywhere else is a bug.

`prefers-reduced-motion` (macOS "Reduce Motion") must disable the beam animation
(show end-state instead) and zero out all durations.

## Exact state copy (use verbatim)

### Popover — clipboard / beam states
| State | Copy |
|---|---|
| Ready (screenshot on clipboard) | Title: `Screenshot on clipboard` · meta: `PNG · 2560 × 1440` · badge: `Ready` (success) |
| Primary button (idle) | `Beam screenshot` (+ hint: `or press ⌘⇧7`) |
| Beaming | `Beaming to {host}…` · badge: `Beamed` once landed |
| Landed | `Beamed to {host}` · badge: `Beamed` (accent) |
| Result block | label `Copied to clipboard` + the sentence (mono) |
| Secondary after beam | `Beam again` |
| Nothing on clipboard | `Nothing to beam yet` · helper: `Copy a screenshot (⌘⇧4) and it shows up here.` |
| No host configured (empty) | `No host yet.` + warmth: `Point me at a host and I'll beam your screenshots there.` → CTA `Add a host` |

### Beam-to host footer
- Section label: `Beam to` · row: host name + `user@address` (mono) + chevron.

### Error taxonomy (each: calm title, mono detail, optional hint, recovery actions)
| Key | Title | Detail (mono) | Hint | Actions |
|---|---|---|---|---|
| `timeout` | `{host} didn't answer.` | `Operation timed out after 10s` | — | Retry · Run diagnostics · Switch host |
| `auth` | `{host} refused the key.` | `Permission denied (publickey)` | `Add your key with ssh-add, then beam again.` | Retry · Run diagnostics |
| `perm` | `Remote folder isn't writable.` | `mkdir {folder}: permission denied` | `Pick another folder in Preferences.` | Retry · Run diagnostics · Change folder |

### The paste-ready sentence
- Default template: `Use this screenshot: {path}` where `{path}` is the full remote
  path. The `{path}` token is the only variable. Editable in Preferences › General.
- The rendered `{path}` is shown in the accent color + semibold inside the sentence.

## Privacy stance (copy you'll surface in About / onboarding)
- No account. No cloud relay. No telemetry. The file goes from your clipboard
  straight to your host over your own SSH. "There's no 'us' in the path."

## Default config values (the seed state)
- Default hotkey: `⌘⇧7` (`cmd shift 7`).
- Default remote folder: `/tmp/hostbeam`.
- Default sentence: `Use this screenshot: {path}`.
- Filenames: timestamped, `YYYY-MM-DD-HH.mm.ss.png`.
- Settings defaults: launch-at-login on, show-in-menubar on, beam-immediately on,
  copy-sentence on, notify-on-success on, sound off.

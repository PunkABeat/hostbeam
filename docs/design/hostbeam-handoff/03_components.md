# 03 — Components → Flutter widgets

Build each as a reusable Flutter widget. Props below are the React contract from
the design system (`components/**/*.d.ts`); mirror them as constructor params.
All sizing/colors come from `HostbeamTokens` (doc 02). Source for each is in
`reference/` if you want to inspect exact rendering.

> **One-primary rule:** exactly one `Button(variant: primary)` per surface — it is
> the Beam action. Everything else is secondary/ghost.

---

### HbButton  (← Button)
Primary action button. `variant: primary | secondary | ghost | danger`,
`size: sm(22) | md(28) | lg(36)`, `block`, `icon`, `iconRight`, `disabled`, `onTap`.
- **primary:** fill `beam500`, text white, shadow `accent`; hover→`beam600`,
  press→scale 0.97. `lg` + `block` is the Beam button.
- **secondary:** neutral `fill` bg, label-color text, hairline ring.
- **ghost:** transparent, fill on hover.
- **danger:** `danger` fill (destructive confirms only).
- Radius `md` (6). Body text 13/600. Icon is leading, ~1em.

### HbIconButton  (← IconButton)
Icon-only, for row/toolbar affordances (copy, settings, retry, close).
`size`, `variant: plain | solid | accent`, required `label` (a11y + tooltip).
plain = transparent; solid = neutral fill; accent = beam tint on hover.

### HbBadge  (← Badge)
Status pill. `tone: neutral | accent | success | warning | danger`, `solid`, `dot`.
Default is **tinted** (tint bg + colored text); `solid` = white text on solid color.
`dot` adds a leading dot. Radius `sm` (5), text 10–11/600, tight padding (~2×8).
Used for `Ready` (success), `Beamed` (accent), `Unreachable` (danger).

### HbStatusDot  (← StatusDot)
Tiny health dot. `status: online | pending | offline | error`, `size`, `pulse`
(soft expanding pulse — **only** for `pending`, the one allowed extra motion for a
host warming up). online=success, pending=warning, offline=label-tertiary,
error=danger.

### HbSpinner  (← Spinner)
Quiet indeterminate ring for the beaming state. `size` (px diameter), `thickness`,
`tone: accent | neutral | onaccent`. Thin ring, no color flash. `onaccent` = on the
primary button mid-beam. (Note: the *beam mark* is the hero motion; this spinner is
the restrained generic one.)

### HbTooltip  (← Tooltip)
Hover capsule above trigger; quick fade. `label`, `mono` (mono + wrap, for full
remote paths). Dark capsule. On macOS desktop, show on pointer hover.

### HbField  (← Field)
Labeled text input for setup (host alias, remote folder, hotkey, sentence).
`label` (small uppercase), `value`, `placeholder`, `icon` (leading), `suffix`
(trailing mono hint), `mono` (render input mono — for paths/hosts), `invalid`
(red ring + red help), `help` (text below). Radius `md`, control height 28, field
border `border-field`, focus → focus-ring halo.

### HbHostSelect  (← HostSelect)  ★ key control
The just-in-time host picker. Data: `Host { id, name, address?, status?, isDefault? }`.
Props: `hosts`, `value`, `onChange(id)`, `searchable` (auto: on when ≥6 hosts).
- Collapsed: a row showing StatusDot + host name + `user@address` (mono) + chevron.
- Open: a menu/popover listing hosts (default first, then recents). When searchable,
  an inline **type-to-filter field with keyboard nav (↑/↓/Return)** at the top.
- Selecting calls `onChange` and collapses. This must feel supporting, not loud.
- **For the large-list case** the menu scrolls; the search field filters in place.

### HbSegmentedControl  (← SegmentedControl)
macOS segmented control, 2–4 short options (e.g. Diagnostics `Summary / Log`).
`options: [{value,label}|string]`, `value`, `onChange`. Selected segment rides a
**sliding white pill** (animate with easeStandard, ~140ms). Track = fill, pill =
white/raised.

### HbSwitch  (← Switch)
macOS toggle for binary settings. `checked`/`defaultChecked`, `onChange`, `label`,
`disabled`. Green when on (`success`/system green), knob slides. No bounce.

### HbKeycap  (← Keycap)
Renders a shortcut as macOS keycaps (`⌘⇧7`). `combo` ("cmd shift 7") or `keys[]`,
`size: md | lg`, `accent` (filled beam for an active hotkey). Map tokens to glyphs:
cmd→⌘, shift→⇧, opt/alt→⌥, ctrl→⌃, return→↩, etc. Radius xs (3), mono, subtle 3D
keycap shading. **The one place the product uses unicode glyphs as icons.**

### HbListRow  (← ListRow)  ★ workhorse
Host lists + recent beams. `leading` (thumbnail/icon/StatusDot), `title`,
`subtitle`, `trailing` (Badge/IconButton/timestamp), `monoTitle` (recent filenames),
`monoSub` (paths), `selected` (beam tint bg), `interactive`/`onTap`. Separators
**auto-inset to the content edge** (start at the title, not the row edge). Row height
36 (52 with a thumbnail).

### HbSurface  (← Surface)
Container primitive carrying the shadow + hairline-ring system.
`variant: popover | card | raised | well | sheet`, `padded` (popover padding 12).
- **popover** = the 340px menu-bar shell (radius xl, shadow popover, surface-popover
  bg, often over a blur).
- **card/raised** = inner groupings (radius xl/lg).
- **well** = recessed (inset shadow, surface-sunken).
- **sheet** = first-run surface (radius 2xl).

---

### Two app-specific composite widgets (not in the DS, but you'll need them)

### BeamMark  ★ the hero
The animated brand mark. States: `idle` (static logo), `uploading` (signal bars
pulse upward in staggered sequence), `landing` (node pops once + ring blooms once).
Build with `AnimationController`s. SVG geometry: a rounded-square tile (beam-blue
gradient `#5A95FF`→`#2A66EC`), three horizontal "signal" bars of increasing width
rising toward a circular node near the top, and a small screen/box at the bottom.
See `assets/hostbeam-icon.svg` for exact geometry and `reference/.../shared.jsx`
(`BeamMark`) + the `@keyframes wbPulse/wbRing/wbPop` in the walkthrough/landing
`index.html` for timings (pulse 1.15s loop; ring 0.7s ease-out once; pop 0.6s).

### ShotThumb
Screenshot thumbnail placeholder (used in clipboard row + recents before a real
preview exists): a tinted rounded rect with faux window dots + a content bar.
In the real app, replace with an actual thumbnail of the captured image when
available; keep the placeholder for file-type-without-preview (see file-architected
note).

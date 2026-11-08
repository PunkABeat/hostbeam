# 04 — Screens (layout & per-state behavior)

Three surfaces + the menu-bar item + a notification. Reference prototypes:
`reference/prototypes/popover/`, `reference/prototypes/onboarding/`,
`reference/prototypes/preferences/`. Run them in a browser to see live behavior.

---

## A. Menu-bar popover  (the everyday surface) — width 340px

A `Surface(popover)` anchored under the menu-bar icon with a small upward beak/arrow
(see Tweaks in the prototype: arrow style/size/offset are configurable; pick a
single clean default). Sections top→bottom, separated by hairlines:

1. **Header** — mark + "Hostbeam" + (optional) a settings IconButton.
2. **Clipboard row** (`Surface(well)` / content row) — ShotThumb +
   `Screenshot on clipboard` + `PNG · 2560 × 1440` (mono) + `Ready` badge (success).
   - Empty variant: `Nothing to beam yet` + helper.
3. **Action zone** — state machine:
   - **idle:** `HbButton(primary, lg, block)` = `Beam screenshot` + below it a
     centered hint `or press` + `HbKeycap ⌘⇧7`.
   - **beaming/landing:** centered **BeamMark** (uploading→landing) + `Beaming to
     {host}…` → `Beamed to {host}`, plus a thin progress bar.
   - **done:** a result block (`accent-tint` bg, hairline) — `Copied to clipboard`
     label + the sentence (mono, `{path}` in accent/semibold) + a secondary
     `Beam again` button.
   - **error:** the error block (title/detail/hint + recovery actions) — see doc 01
     error taxonomy. Recovery actions reuse the diagnostics sheet inline.
4. **Recent** — section label `Recent` + up to 3 `HbListRow`s (ShotThumb,
   mono filename title, `{host} · {relative time}` subtitle, a copy IconButton
   trailing). If more than 3 exist, a `+N more` row → opens Preferences › Recent.
5. **Beam to** (footer) — section label + the selected host row (StatusDot + name +
   `user@address` mono + chevron) → opens `HbHostSelect`.

Empty/no-host state replaces sections 2–5 with the empty hero
(`No host yet.` + warmth line + `Add a host` CTA).

## B. First-run onboarding  (popover-native, 3 steps)

Same 340px popover shell; steps animate with the `.hb-step` transition (gentle
260ms slide-up — this is a *surface* transition, allowed). A 3-dot step indicator.

1. **Welcome** — mark (a gentle one-time beam plays), title + one warmth line, a
   `Get started` primary, and a quiet `Skip setup` / `Choose later` ghost. Skipping
   lands on the popover's no-host empty state (consistent copy).
2. **Choose host** — `HbHostSelect` populated from `~/.ssh/config` (mock data in
   prototype). Pick a default. Searchable when ≥6.
3. **Almost done** — confirms host + folder; an **optional inline connection test**
   (`Test connection` → spinner → `ssh-agent · ed25519 · /tmp/hostbeam writable`
   success row, or an error row). `Finish` → drops into the **live Ready state**
   popover. (Shown inside a menu-bar desktop context in the prototype.)

## C. Preferences window  (macOS Settings, Ventura sidebar)

A standard macOS window (~width 720) with a **left sidebar nav** (Ventura style:
rounded selected row with a tinted icon) and a content pane on the right. Tabs:

- **General** — toggles (`Launch at login`, `Show in menu bar`, `Beam immediately`,
  `Copy the paste-ready sentence`, `Notify on success`, `Play a sound when a beam
  lands` [off by default]), the **remote folder** field, and the **paste-ready
  sentence editor** with a **live preview** that uses the actual last-beamed path.
- **Hosts** — the host manager:
  - **Added hosts** list (`HbListRow`s) with rename, reorder, set-default, remove,
    and a per-host "last beamed" stat + a Test / diagnostics affordance.
  - **Add a host:** an autocomplete search over `~/.ssh/config` entries, **or** an
    "Add manually" sheet (alias, address, user, folder) with a Test button.
  - Diagnostics: a multi-step check (SSH reachable / Authentication / Folder
    writable / Round-trip latency) with ok/warn/fail/skip rows.
- **Hotkey** — a **live keystroke recorder** (click → press the combo → it captures
  and shows `HbKeycap`s). Warn on conflict with a macOS system shortcut
  (e.g. ⌘⇧3/4/5, Spotlight) — show which shortcut it collides with.
- **About** — app icon, name, version + "check for updates", the privacy stance
  lines, and credit/links. (Default host + diagnostics were intentionally removed
  from About — they live in Hosts.)

Preferences and the popover **share one config source** (doc 05). Changing the
default host, folder, or sentence in Preferences reflects immediately in the popover
and vice-versa.

## D. Menu-bar status item

A template (monochrome) icon — `assets/hostbeam-menubar.svg`, rendered ~16–18px;
macOS tints it for light/dark menu bars. On a successful beam it does the **blip**
(one scale + accent-ring pulse ~0.6s). Click toggles the popover.

## E. Success notification / toast

When `Notify on success` is on, show a macOS-style notification on beam landing:
title `Beamed to {host}`, body = the remote path (mono), with the sentence already
on the clipboard. (Mocked in the prototype as an in-app toast; in the real app use
a native `UNUserNotification`.)

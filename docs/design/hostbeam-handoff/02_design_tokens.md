# 02 — Design Tokens → Flutter

All values are final (high-fidelity). Ship them as a `HostbeamTokens` class +
two `ThemeData` (light/dark). Light is default; dark is the common menu-bar
vibrancy look. Below each table is the CSS source for reference.

## Color — Light (default)

| Token | Hex / value |
|---|---|
| Beam 50 / 100 / 200 | `#EAF1FE` / `#D3E1FD` / `#A9C4FB` |
| Beam 300 / 400 | `#7AA2F8` / `#5183F7` |
| **Beam 500 (accent)** | **`#2D6CF6`** |
| Beam 600 (hover) / 700 (pressed) | `#1B5AE0` / `#1648B4` |
| label (primary text) | `rgba(0,0,0,0.85)` |
| label-secondary | `rgba(0,0,0,0.50)` |
| label-tertiary | `rgba(0,0,0,0.26)` |
| label-quaternary | `rgba(0,0,0,0.14)` |
| window | `#ECECEC` |
| surface-popover | `#F6F6F7` |
| surface-content | `#FFFFFF` |
| surface-raised | `#FFFFFF` |
| surface-sunken | `#F0F0F2` |
| fill / secondary / tertiary | `rgba(0,0,0,0.05)` / `0.08` / `0.12` |
| fill-hover / active | `rgba(0,0,0,0.06)` / `0.10` |
| separator / strong | `rgba(0,0,0,0.10)` / `0.16` |
| border-field | `rgba(0,0,0,0.16)` |
| accent-tint (selected row) | `#EAF1FE` |
| focus-ring | `rgba(45,108,246,0.40)` |
| success / tint | `#28A745` / `#E6F4EA` |
| warning / tint | `#E08600` / `#FCEFD9` |
| danger / tint | `#E5484D` / `#FBE9EA` |
| dot online/pending/offline/error | success / warning / label-tertiary / danger |

## Color — Dark (`.theme-dark`)

| Token | Hex / value |
|---|---|
| ink / paper | white / black (opacities flip to white) |
| label / secondary / tertiary | `rgba(255,255,255,0.92)` / `0.55` / `0.32` |
| window / popover / content / raised / sunken | `#1C1C1E` / `#262628` / `#2C2C2E` / `#323234` / `#202022` |
| fill / secondary / tertiary | `rgba(255,255,255,0.08)` / `0.12` / `0.16` |
| separator / strong | `rgba(255,255,255,0.12)` / `0.20` |
| Beam 500 / 600 / 700 | `#4C8DFF` / `#6EA1FF` / `#8FB6FF` |
| accent-tint | `rgba(76,141,255,0.16)` |
| focus-ring | `rgba(76,141,255,0.50)` |
| success / warning / danger | `#32D74B` / `#FF9F0A` / `#FF6961` (each tint = color @16% alpha) |

> Label colors are **opacity over an ink color** (black in light, white in dark).
> In Flutter, compute them as `inkColor.withOpacity(x)` so the system stays
> consistent — do not hardcode greys.

## Typography

- **UI face:** Geist (declare Geist-Regular/Medium/SemiBold/Bold in `pubspec.yaml`;
  `.ttf`/`.otf` from github.com/vercel/geist-font, SIL OFL). Fallback to the system
  San Francisco stack.
- **Mono face:** SF Mono on Mac (system), JetBrains Mono as bundled fallback. Use
  for paths, hostnames, addresses, hotkeys, timestamps.
- `fontFeatures`: enable `ss01`, `cv01` on Geist if available.

| Role | px | weight | use |
|---|---|---|---|
| largetitle | 26 | 600 | first-run / empty hero only |
| title | 22 | 600 | setup step heads (rare) |
| title2 | 17 | 600 | popover section titles |
| title3 | 15 | 600 | prominent labels |
| headline | 13 | 600 | emphasized body |
| body | 13 | 400 | default body / controls |
| callout | 12 | 400 | secondary controls, meta |
| subhead | 11 | 500 | uppercase labels above fields |
| footnote | 11 | 400 | helper text |
| caption | 10 | 400 | timestamps, tiny meta |
| mono | 12 | 400/500 | paths/hosts/hotkeys |

Line heights: tight 1.2, snug 1.3, normal 1.45. Letter spacing: tight -0.02em
(display), snug -0.01em, wide +0.02em (small all-caps eyebrows).

## Spacing (4pt grid)

`0,2,4,6,8,10,12,16,20,24,32,40,48` px (space-0…space-12). Utility surfaces are
dense — most gaps are **6–12px**. Semantic: inline gap 6, control gap 4, stack gap
8, section gap 16, row pad 12×10, popover padding 12.

**Fixed metrics:** popover width **340px** · row height 36 (large 52 for recents) ·
control height 28 (lg 36 = the Beam button, sm 22) · min hit target 28 (utility) /
44 (touch, if ever).

## Radius

xs 3 (keycaps) · sm 5 (badges) · md 6 (buttons, fields) · lg 9 (rows, thumbnails) ·
xl 12 (popover, cards) · 2xl 16 (first-run sheets) · full 999.

## Elevation (pair every shadow with a 0.5px hairline ring)

| Token | Light value |
|---|---|
| control | `0 0.5px 0 rgba(0,0,0,.04), 0 1px 1.5px rgba(0,0,0,.10)` |
| accent (Beam btn) | `inset 0 .5px 0 rgba(255,255,255,.20), 0 1px 2px rgba(27,90,224,.35)` |
| menu | `0 0 0 .5px rgba(0,0,0,.12), 0 8px 24px rgba(0,0,0,.16)` |
| popover | `0 0 0 .5px rgba(0,0,0,.14), 0 12px 36px rgba(0,0,0,.20), 0 2px 8px rgba(0,0,0,.10)` |
| inset (well) | `inset 0 1px 2px rgba(0,0,0,.08)` |
| focus ring | `0 0 0 3px {focus-ring}` |

Dark shadows are heavier/darker — see `tokens/elevation.css` in reference.

## Motion

| Token | Value |
|---|---|
| dur-instant / fast / base / slow | 80 / 140 / 200 / 320 ms |
| ease-out | `cubic-bezier(0.22, 1, 0.36, 1)` (Flutter `Cubic(0.22,1,0.36,1)`) |
| ease-in-out | `cubic-bezier(0.45, 0, 0.20, 1)` |
| ease-standard | `cubic-bezier(0.2, 0, 0.2, 1)` |
| ease-spring | `cubic-bezier(0.34, 1.4, 0.5, 1)` (the one spring, success only) |
| press-scale | `0.97` (press shrinks, never bounces) |

`prefers-reduced-motion` → all durations 0, press-scale 1, beam shows end-state.

---

## Ready-to-paste Dart

```dart
import 'package:flutter/widgets.dart';

class HostbeamTokens {
  // Brand — beam blue
  static const beam50  = Color(0xFFEAF1FE);
  static const beam100 = Color(0xFFD3E1FD);
  static const beam200 = Color(0xFFA9C4FB);
  static const beam300 = Color(0xFF7AA2F8);
  static const beam400 = Color(0xFF5183F7);
  static const beam500 = Color(0xFF2D6CF6); // accent
  static const beam600 = Color(0xFF1B5AE0); // hover
  static const beam700 = Color(0xFF1648B4); // pressed

  // Semantic (light)
  static const success = Color(0xFF28A745);
  static const warning = Color(0xFFE08600);
  static const danger  = Color(0xFFE5484D);

  // Surfaces (light)
  static const window        = Color(0xFFECECEC);
  static const surfacePopover= Color(0xFFF6F6F7);
  static const surfaceContent= Color(0xFFFFFFFF);
  static const surfaceSunken = Color(0xFFF0F0F2);

  // Opacity-based label colors over ink (black in light)
  static Color label(Color ink)           => ink.withOpacity(0.85);
  static Color labelSecondary(Color ink)  => ink.withOpacity(0.50);
  static Color labelTertiary(Color ink)   => ink.withOpacity(0.26);
  static Color fill(Color ink)            => ink.withOpacity(0.05);
  static Color fillHover(Color ink)       => ink.withOpacity(0.06);
  static Color separator(Color ink)       => ink.withOpacity(0.10);

  // Radii
  static const rXs = 3.0, rSm = 5.0, rMd = 6.0, rLg = 9.0, rXl = 12.0, r2xl = 16.0;

  // Spacing (4pt)
  static const s1=2.0, s2=4.0, s3=6.0, s4=8.0, s5=10.0, s6=12.0,
               s7=16.0, s8=20.0, s9=24.0, s10=32.0;

  // Fixed metrics
  static const popoverWidth = 340.0;
  static const rowHeight = 36.0, rowHeightLg = 52.0;
  static const controlH = 28.0, controlHLg = 36.0, controlHSm = 22.0;

  // Motion
  static const durInstant = Duration(milliseconds: 80);
  static const durFast    = Duration(milliseconds: 140);
  static const durBase    = Duration(milliseconds: 200);
  static const durSlow    = Duration(milliseconds: 320);
  static const easeOut     = Cubic(0.22, 1, 0.36, 1);
  static const easeInOut   = Cubic(0.45, 0, 0.20, 1);
  static const easeStandard= Cubic(0.2, 0, 0.2, 1);
  static const easeSpring  = Cubic(0.34, 1.4, 0.5, 1);
  static const pressScale  = 0.97;
}
```

# CSS Guide

Standards for styling the WebView. The design system is **CSS custom properties (design tokens) + small, well-named classes**. This guide defines the token tiers, where styles live, naming, cascade control, and theming. See [frontend.md](frontend.md#inline-styles-vs-css) for the inline-style policy.

---

## Token tiers

Design tokens are the foundation — every visual value should resolve to a token, never a magic literal. The token files live in `packages/ui/src/tokens/` and are imported by `packages/ui/src/styles.css` (the `@hostbeam/ui` package every window imports):

| File | Tokens |
|---|---|
| `colors.css` | brand (`--beam-500`), label opacities, surfaces, fills, semantic (success/warning/danger), status dots, selection |
| `typography.css` | `--font-system`, `--font-mono`, weights, sizes (`--text-body`, `--text-callout`, `--text-caption`) |
| `spacing.css` | the 8-step scale `--space-1` … `--space-7` |
| `elevation.css` | `--shadow-accent`, `--shadow-menu`, `--shadow-popover` |
| `motion.css` | `--dur-fast`, `--dur-instant`, `--ease-standard`, `--ease-out` |
| `fonts.css` | `@font-face` / system font wiring |

**Separate primitive from semantic tokens** — the single most important token rule:

- **Primitive** tokens are raw values: `--beam-500: #2D6CF6`, a spacing step, a duration.
- **Semantic** tokens express *intent* and reference primitives: `--accent`, `--surface-content`, `--separator`, `--label`, `--danger`.

Components and views should consume **semantic** tokens (`var(--accent)`), not primitives (`var(--beam-500)`). That indirection is what makes theming and rebranding a one-file change. When adding a token, decide which tier it belongs to and place it accordingly; if a component needs a raw value, add a semantic alias rather than reaching for the primitive.

---

## Where styles live

There are three legitimate homes for CSS. Put each rule in the right one:

1. **Component-injected CSS** — design-system components (`packages/ui/src/components/**`) inject a `<style>` once via an `ensureStyle()` IIFE holding a CSS template string (e.g. `.hb-btn`, `.hb-btn--primary` in `Button.tsx`). This keeps a component's styles co-located and self-contained. Keep this pattern for design-system components; one `ensureStyle` per component, idempotent.
2. **Page-level CSS files** — `src/app.css`, `src/popover-page.css`, `src/prefs.css` hold layout/structure and view-specific classes (`.pv-recent`, `.pf-thumb`, `.bm-bar`). This is where **repeated layout patterns from the prototype views belong** (card, row, section header) rather than as inline styles.
3. **Inline `style={{}}`** — only for **dynamic, per-instance values** computed at render (a measured width, a state-driven transform). Never for static, repeated styling. See the [policy](frontend.md#inline-styles-vs-css).

The views still lean on home 3 (several hundred inline-style objects). Move a repeated block into home 2 when you touch it; do not add new repeats.

---

## Naming

Classes use short, prefixed, BEM-flavored names. The prefix marks **ownership** so it's obvious where a class is defined and what may touch it:

| Prefix | Owner / file | Example |
|---|---|---|
| `hb-` | design-system components (injected) | `.hb-btn`, `.hb-hostsel__menu` |
| `pv-` | popover page (`popover-page.css`) | `.pv-recent`, `.pv-thumb` |
| `pf-` | preferences page (`prefs.css`) | `.pf-thumb`, `.pf-nav-item` |
| `bm-` | beam-mark animation (`@hostbeam/ui` BeamMark) | `.bm-bar`, `.bm-el` |
| `ob-` | onboarding (`views/onboarding`) | `.ob-changehost` |

Rules:

- **Match the prefix to the home.** A class defined in `prefs.css` is `pf-`; a popover-page class is `pv-`. Don't define a `pv-` class in the prefs stylesheet.
- **BEM for structure**: `block__element` and `block--modifier` (`.hb-hostsel__opt`, `.hb-btn--primary`). Keep it shallow.
- **Keep specificity low and flat** — single classes, no long descendant chains or `!important`. The token + class approach should make overrides unnecessary.

---

## Cascade control with `@layer`

As the page stylesheets grow, use native CSS `@layer` to make override order explicit instead of relying on file/source order:

```css
@layer tokens, base, components, views, utilities;
```

Tokens and resets in `base`, design-system component CSS in `components`, page/view CSS in `views`, one-off helpers in `utilities`. Not adopted yet — `utilities.css` relies on load order — and additive when someone does.

---

## Theming (light / dark)

The token architecture is what makes theming possible: define light and dark values for the **semantic** tokens (keyed off `prefers-color-scheme` or a `[data-theme]` attribute), and everything consuming `var(--surface-content)` / `var(--label)` adapts for free.

This is the other reason the inline-style debt matters: **inline styles can't be re-themed.** A `style={{ color: "var(--label)" }}` does follow the token, but a `style={{ color: "#1c1c1e" }}` is frozen. Every hardcoded color/shadow/size in an inline object is a spot that breaks dark mode. Route all of them through semantic tokens, and prefer classes so the values live in one themeable place.

---

## Accessibility & motion

- Respect `prefers-reduced-motion`: gate translate/scale/opacity-heavy animation behind `@media (prefers-reduced-motion: no-preference)` and provide a calm, opacity-only fallback (the beam-mark animation already does this — keep that standard for new motion).
- Keep interactive controls keyboard-operable with visible `:focus-visible` rings (driven by tokens), semantic roles, and labels. Verify small-window/popover layouts with realistic host names, long paths, errors, and thumbnails — calm, distinct loading/success/failure states, no layout shift.

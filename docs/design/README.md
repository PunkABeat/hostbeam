# Design

Design source material and implementation guidance live here.

## Current Design Source

- [Hostbeam handoff](hostbeam-handoff/README.md): high-fidelity product, visual, component, screen, and behavior reference for Milestone 005 UI/UX maturation. (Note: the handoff was authored against an earlier Flutter plan; the app now runs the design's own React/CSS directly in a Tauri WebView — see [ADR 0010](../adr/0010-migrate-to-tauri-webview-shell.md).)
- [Implementation readiness review](hostbeam-handoff/implementation-readiness-review.md): notes on what can be implemented directly, what conflicts with current milestone scope, and what needs a product or ADR decision first.
- [Implementation plan](hostbeam-handoff/implementation-plan.md): phased UI/UX maturation plan for applying the handoff without widening scope.
- [Design QA](design-qa.md): fidelity baseline of the implemented app against the design reference (numbered findings O1–O13 and their status).
- [Landing page](hostbeam-handoff/reference/landing/): marketing one-pager design (Nav, live hero popover demo, How-it-works, Features, Privacy, FAQ, Download, Footer) snapshotted byte-for-byte from the live claude.ai/design project. **Reference and history, not the source of truth** — `apps/web` owns its own visual system as of [ADR 0019](../adr/0019-marketing-site-dressed-like-the-app.md), which is also where the reasons are. The prototype still carries the page's structure and copy faithfully; where the two differ visually, the site is right and the prototype is old.

## Agent Rules

- Treat the handoff as design reference and implementation guidance, not production code.
- The voice doc ([01_product_and_voice.md](hostbeam-handoff/01_product_and_voice.md)) is authoritative for the **marketing site** too, not just the app. Mono is for values a reader could type; one warmth line per surface.
- For the **desktop app's** screens, the prototypes remain the visual reference — match them rather than re-authoring the UI in another framework. (The app no longer *runs* the prototype scripts; see [ADR 0011](../adr/0011-detach-app-ui-from-design-prototypes.md).)
- This does **not** extend to the **marketing site**. `apps/web` owns its own visual system ([ADR 0019](../adr/0019-marketing-site-dressed-like-the-app.md)); a difference between the site and `reference/landing/` is a decision, not drift, and must not be "fixed".
- Keep Milestone 005 focused on the screenshot bridge UI/UX.
- Do not implement arbitrary file transfer, manual file picker, drag-and-drop, SSH config editing, remote cleanup, packaging, signing, notarization, or updater work from design collateral unless a later milestone explicitly opens that scope.

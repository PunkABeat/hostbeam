# Required Reading

Agents should read these files before making changes:

1. `README.md`
2. `docs/process/progress.md`
3. `docs/agents/current-handoff.md` and `docs/agents/pitfalls.md`, the traps
   that have already cost someone a day (the handoff is short by design; the
   narrative it sheds is in `docs/agents/handoff-log.md`, worth reading when
   you need the reasoning behind something rather than its current state)
4. `docs/agents/contribution-protocol.md`
5. `docs/engineering.md`
6. `docs/product.md`
7. `docs/experience.md`
8. `docs/research/questions.md`
9. `docs/design/README.md` for UI/UX work
10. `docs/process/test-host.md` before testing anything that talks to a host —
    `npm run testhost:up` gives you a real SSH server locally, so no change to
    beaming, diagnostics, pinning, or pairing has to go untested
11. `docs/process/third-party-notices.md` before any change to a lockfile,
    `Package.resolved`, a font or an icon set — the in-app open-source
    notices are generated from them and must move in the same commit
12. Relevant ADRs in `docs/adr/`

## Current Rule Of Thumb

If the task would add app source code, generated files, or dependencies, keep it aligned with the active migration plan ([tauri-migration-plan.md](../process/tauri-migration-plan.md)) and [ADR 0010](../adr/0010-migrate-to-tauri-webview-shell.md) rather than expanding scope incidentally.

If the task requires a product, security, naming, or platform decision that is not already documented, ask for that decision or record it as an open question before implementing.

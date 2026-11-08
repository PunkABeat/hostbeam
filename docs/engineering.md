# Engineering

Hostbeam is a macOS menu-bar utility built as a **Tauri** app: a privileged **Rust core** (`apps/desktop/src-tauri/`) paired with a **system WebView** running a **React/TypeScript** UI (`apps/desktop/src/`) — first-party screen components built on the design-system library (`packages/ui`). It integrates with the system OpenSSH toolchain. It was first built in Flutter, then migrated to Tauri ([ADR 0010](adr/0010-migrate-to-tauri-webview-shell.md)); the UI was detached from the design prototypes into app-owned components ([ADR 0011](adr/0011-detach-app-ui-from-design-prototypes.md)). A review of the whole app and its phased follow-through is in [docs/process/desktop-code-review-2026-09.md](process/desktop-code-review-2026-09.md).

This document is the **hub** for engineering standards. It states the principles and gates that apply everywhere; the stack-specific guides go deep:

| Guide | Covers |
|---|---|
| [architecture.md](engineering/architecture.md) | The two-process model, the two IPC channels, state ownership, layering, platform code |
| [rust.md](engineering/rust.md) | The module map, error handling, concurrency, config and state, `unsafe`, tooling, testing, security |
| [frontend.md](engineering/frontend.md) | Structure (composition, hooks, components, lib), talking to Rust, config and i18n, styling policy, gates |
| [css.md](engineering/css.md) | Design-token tiers, class naming, `@layer`, theming, where styles live |
| [ios.md](engineering/ios.md) | The iPhone app: targets, the engine boundary, the rules every beam follows, strings, gates |

Read this hub first, then the guide for whatever you are touching.

---

## Engineering North Star

Build a small, native-feeling desktop utility with production-grade discipline.

Hostbeam should be **easy to reason about, easy to test without real remote hosts, conservative with user data, and careful around system integration**. The app should feel simple because the implementation is *deliberately bounded*, not because edge cases were ignored.

The product should feel nearly magical to use. Engineering decisions protect that feeling by keeping latency low, states explicit, failure behavior calm, and native integration polished.

---

## Core Principles

These six principles are the lens for every change and every review. The stack guides apply them concretely; this section is the "why".

### 1. Simplicity and bounded scope

- Prefer boring, explicit code over clever abstractions. The cleverest solution that a future reader has to decode is usually the wrong one.
- Add scope as a deliberate decision, not an incidental one. New surface area (a dependency, a command, a window, a config field) is a cost paid forever.
- Delete dead code rather than working around it.

### 2. DRY — one source of truth

Every fact, rule, or helper should have exactly one home. Duplication is not just extra typing; it is a correctness hazard — the copies drift, and a fix lands in some of them.

- **Extract on the second or third repetition**, not the first. Premature abstraction is its own smell; copy-pasted logic that has clearly settled is the signal to extract.
- **Config is the single source of truth for app state.** It lives in one shape, is mirrored between the WebView and Rust by the config bridge, and is read through one accessor on each side — never re-derived ad hoc. See [architecture.md](engineering/architecture.md#state-ownership).
- A `[[name]]`-style "this rule has one home" applies to copy and translations too: every user-facing string has one key in `src/i18n.ts` (and the Rust mirror), never a literal repeated inline.

### 3. Separation of concerns

Keep three layers from bleeding into each other: **presentation** (UI), **application/domain logic**, and **infrastructure/IO** (SSH, clipboard, filesystem, process, notifications).

- **Tauri commands are a thin IPC boundary, not a place for logic.** A command deserializes input, calls one service function, and maps the result to a serializable response ([rust.md](engineering/rust.md#module-map)). The WebView's `lib/ipc.ts` is the matching boundary on its side.
- **Domain logic must be testable without the UI, without real hosts, and without real clipboard contents.** The `ssh_config` module is the model to follow: pure parsing/classification with strong fixture tests.
- **The UI must not embed system knowledge.** It calls a command or reads config; it never shells out, parses SSH config, or formats remote paths itself.

### 4. Explicitness over cleverness

- **Model states directly.** Loading, empty, ready, success, and each failure kind are explicit, not inferred from incidental nulls.
- **Use typed errors with preserved context.** The Rust core's `error.rs` is a typed enum whose variants keep their cause; it becomes a stable, serializable code in exactly one place, at the command edge ([rust.md](engineering/rust.md#error-handling)).
- **Never swallow errors silently.** `let _ = window.eval(...)`, `let _ = app.notification()…`, and `let _ = fs::create_dir_all(...)` hide real failures. If a failure is genuinely ignorable, say so with a logged reason; otherwise propagate it.
- **Typed at the boundary.** Every command and every message between Rust and the WebView has one typed definition on each side (`lib/ipc.ts`, `lib/rust-bridge.ts`, `ui_bridge.rs`), with a test pinning the wire shape ([architecture.md](engineering/architecture.md#the-ipc-contract)).

### 5. Testing by default

Testing is required by default for every feature; an exception must be documented with a reason, the remaining risk, and a follow-up.

- Unit-test pure logic directly (parsing, validation, path/format, command construction, error mapping, translation fallback). The Rust `ssh_config` and `i18n` tests show the bar.
- Prefer fixtures and fakes over real SSH hosts, real clipboard contents, or machine-specific state.
- The bar today: every pure rule on both sides has a test beside it (`services/`, `ssh_config.rs`, `lib/*.ts`). Screens and the beam hook's transitions are the open gap.

### 6. Security and privacy by default

- Never store private keys, passphrases, SSH credentials, or cloud credentials. Hostbeam relies on the user's existing `ssh`/`ssh-agent` environment and is **not** a credential manager.
- No cloud account, relay, or hosted infrastructure by default. Nothing leaves the Mac except the screenshot the user beams.
- Prefer structured process invocation (argument arrays) over shell strings; keep command construction in one place and auditable.
- Do not log clipboard image contents, secrets, or unnecessary host details. Treat remote paths as sensitive.
- Distribution is direct (Developer ID, Hardened Runtime, notarization), not the Mac App Store; App Sandbox stays disabled because the product needs the user's real SSH environment (ADR 0008). Because the sandbox is not the safety boundary, keep diagnostics, logs, and command construction especially conservative.

---

## Non-Negotiable Constraints

- Do not mix UI code with SSH, clipboard, filesystem, or process-execution details.
- Do not introduce stringly-typed errors in new Rust code; use the project error type.
- Do not add platform-specific behavior without a narrow interface and a verification plan.
- Do not ship a feature without meaningful tests unless the exception is explicitly documented (reason, risk, follow-up).
- Do not store secrets or run broad shell strings when structured invocation is possible.
- Do not expand scope without updating `docs/process/progress.md`, the relevant plan/milestone, and any affected ADR.
- Do not log clipboard image contents, secrets, private paths, or unnecessary host details.

---

## Quality Gates

Run these locally before calling work done. They are the real commands for the current stack (no hidden IDE state).

**Frontend (TypeScript/React), from the repo root:**

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint src
npm run test          # vitest run
npm run format:check  # prettier --check src
npm run build         # vite build (catches what the type-checker doesn't)
```

**Rust core, from `apps/desktop/src-tauri/`:**

```bash
cargo fmt --check                      # formatting
cargo clippy --all-targets -- -D warnings  # static analysis / lints (warnings = failures)
cargo test                             # unit + integration tests
cargo deny check advisories sources    # dependency advisories and sources (deny.toml)
```

The toolchain is pinned (`src-tauri/rust-toolchain.toml`), so these mean the same thing on every machine.

**Marketing site, from the repo root:**

```bash
npm run typecheck:web  # astro check
npm run build:web      # astro build (static output)
```

The design system (`packages/ui`, `@hostbeam/ui`) is consumed by **both** apps — a change
there must pass the desktop gates *and* the website gates before landing.

CI runs `cargo deny`, `npm run check:docs` and the script tests on Linux on
every push (`.github/workflows/ci.yml`). The frontend and Rust gates and the
notices check (`desktop.yml`), and the iPhone's gates (`iphone.yml`), run on
macOS **by hand only**, before a release or with `gh workflow run`. A macOS
minute counts ten against the account's free Actions minutes
([ci.md](process/ci.md)). Between those runs, the gates above, run locally,
are the only check a push gets. The website's gates are not in CI.

A feature is not done until the applicable gates pass, or any failure is documented with a clear reason and follow-up.

---

## Dependency Policy

Dependencies are added sparingly. Before adding one, document: the problem it solves, why the platform/standard library is not enough, security and maintenance considerations, and the test coverage that proves the integration. Avoid broad frameworks for a narrow feature. Prefer first-party Tauri plugins and well-maintained, focused crates/packages.

---

## Definition of Done

A change is done when:

- Scope matches the active plan; new surface area was a deliberate decision.
- The applicable **quality gates pass** (or a failure is documented with reason + follow-up).
- **Tests** cover the important behavior, or a documented exception explains why not.
- **Errors are typed and contextful**, user-facing failure states are handled, and nothing is silently swallowed.
- The change respects **separation of concerns** (no logic in command handlers, no system calls in the UI) and **DRY** (no copy of an existing helper/string/rule).
- Product/security assumptions are documented; relevant **ADRs** are added or updated.
- A user-visible change has a note under `## Unreleased` in `CHANGELOG.md`, written while the reason is still fresh. `docs/process/progress.md` is updated, and `docs/agents/current-handoff.md` still describes what the next person needs before touching the code (it is capped at 90 lines; narrative goes to `docs/agents/handoff-log.md`).
- No secrets, credentials, generated clutter, or unrelated changes are introduced.

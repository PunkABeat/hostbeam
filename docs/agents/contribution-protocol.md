# Agent Contribution Protocol

This repository is designed for multiple AI agents to work in sequence without losing context or widening scope by accident.

## Operating Principles

- Read before editing.
- Keep changes small enough for another agent to review quickly.
- Preserve the difference between durable decisions, live progress, and handoff notes.
- Prefer explicit questions over hidden assumptions.
- Leave the repository easier for the next agent to continue.

## Where Information Belongs

- Durable decisions: `docs/adr/`.
- Current work state: `docs/process/progress.md`.
- Short handoff state: `docs/agents/current-handoff.md`.
- Historical handoff events: `docs/agents/handoff-log.md`.
- Traps that stay true after the work that found them: `docs/agents/pitfalls.md`.
- Open questions: `docs/research/questions.md`.
- Engineering practice and architecture guidance: `docs/engineering.md`.
- Product definition: `docs/product.md`.
- User experience intent: `docs/experience.md`.

**One home per fact.** Where each part stands — app versions, App Review, a
store PR, anything that changes between sessions — lives in the Now table of
`docs/process/progress.md` and nowhere else. Other documents link to it. A
copy gets missed on the next change: on 2026-10-02 the handoff still put the
Mac at 0.1.30 three releases later, said the iPhone app was never submitted
while it was in review, and kept a deadline that had passed the day before.
`npm run check:docs` (`scripts/check-docs-drift.mjs`) now fails on what it can
see:

- a deadline ("until 2026-10-01", "by 2026-10-27") in `progress.md` or the
  handoff once that day has passed;
- a stated version ("the Mac is at …") that is not the repo's;
- a retired claim, like the old "5 beams a day", in anything a customer reads
  (the site, the apps' strings, the store and npm pages). **When a promise
  changes, add its old wording to `RETIRED` in that script** in the same
  commit, so it cannot come back.

A check cannot tell that a sentence has stopped being true. Fewer copies can.

## Before Starting Work

1. Read `README.md`.
2. Read `docs/process/progress.md`.
3. Read `docs/agents/current-handoff.md`.
4. Read `docs/engineering.md`.
5. Read the relevant ADRs.
6. Check `docs/research/questions.md` for open questions that could affect the task.
7. Check `git status` and do not overwrite unrelated work.

## During Work

- Keep implementation scope aligned with the current milestone.
- Add or update an ADR when making a durable architectural, security, product-boundary, or platform decision.
- Update `docs/process/progress.md` when work state changes, and keep its
  `progress-state` marker in step. `npm run check:docs` enforces it and the
  release script runs it — this instruction alone was not enough once, which
  is why there is now a check. Keep the file short: it went stale at 288
  lines because a document that is expensive to update does not get updated.
- Update `docs/agents/current-handoff.md` before stopping.
- Add unresolved questions to `docs/research/questions.md`.
- Do not introduce dependencies without a documented reason and verification plan.
- When a dependency changes — added, removed, bumped, or moved by a lockfile — run `npm run notices` and commit the regenerated open-source notices with it. Procedure and what to do when the script stops: `docs/process/third-party-notices.md`.
- Do not add generated files before the milestone that explicitly allows them.
- Add or update tests with every feature unless a documented exception explains why tests are impracticable or deliberately deferred.
- Run the repository's formatter, lint/static-analysis, and test commands before handoff when those commands exist.

## Engineering Expectations

- Design from interfaces inward: platform, clipboard, SSH, filesystem, and notifications should sit behind small boundaries.
- Keep domain logic testable without desktop UI or real SSH hosts.
- Prefer deterministic tests using fixtures over tests that depend on a developer's machine.
- Keep command execution auditable and avoid string-built shell commands.
- Treat credentials, hostnames, usernames, paths, and clipboard contents as sensitive unless proven otherwise.
- Treat UX polish as part of correctness for user-facing work. Smoothness, native feel, small-state clarity, and copy quality are not optional cleanup tasks.
- Treat quality tooling as part of the product foundation: formatting, lint/static analysis, and tests should be easy for any agent to run locally.

## Handoff Expectations

Every handoff should answer:

- What changed?
- What decisions were made?
- What was verified?
- What remains open?
- What is the safest next task?

Keep `docs/agents/current-handoff.md` short — `npm run check:docs` fails past
90 lines, and the release script runs it. The cap is a smell test, not a budget:
failing it means a section has stopped being handoff state and become history.
Move it verbatim to the end of `docs/agents/handoff-log.md`, or to the ADR
or milestone it belongs to, and leave a pointer. Nothing is ever thrown away.
A trap the next person must not fall into goes to `docs/agents/pitfalls.md`,
not the handoff: it outlives the work that found it.

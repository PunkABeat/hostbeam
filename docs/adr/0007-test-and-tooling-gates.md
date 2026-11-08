# ADR 0007: Test And Tooling Gates

Status: Accepted.

Date: 2026-06-14.

## Context

Hostbeam is expected to be built by multiple AI agents. Without clear quality gates, agents can add features that work only manually, skip tests for speed, or leave formatting and static-analysis expectations implicit.

The project also needs to move quickly without pretending every native desktop behavior is easy to automate.

## Decision

Require meaningful tests by default for every feature.

Implementation milestones must establish and maintain local quality commands for formatting, linting or static analysis, and tests. Milestone 002 should create the initial Flutter/Dart quality tooling baseline when the scaffold is introduced.

Test deferral is allowed only as an explicit exception. The exception must document why tests are impracticable or intentionally deferred, the remaining risk, the manual verification performed, and the exact follow-up needed.

## Consequences

- Agents have a clear default: add tests with features.
- Quality tooling becomes part of the implementation foundation rather than cleanup.
- Native or exploratory work can still progress, but gaps must be visible and tracked.
- Future reviews can reject features that lack tests or documented exceptions.

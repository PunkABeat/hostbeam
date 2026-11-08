# ADR 0005: Agent First Engineering Governance

Status: Accepted.

Date: 2026-06-14.

## Context

This project is expected to be worked on by multiple AI agents over time. Without explicit contribution rules, agents can widen scope, make hidden product assumptions, mix platform details into UI code, or lose implementation context between handoffs.

## Decision

Treat agent contribution discipline and engineering guidance as part of the project architecture.

Future agents must follow `docs/agents/contribution-protocol.md` and `docs/engineering.md` before implementation work. Durable decisions belong in ADRs, live work state belongs in `docs/process/progress.md`, and short transfer state belongs in `docs/agents/current-handoff.md`.

## Consequences

- Implementation agents have a single operating model before writing code.
- Architecture, testing, security, and handoff expectations are explicit.
- Scope expansion requires documentation updates, not just code changes.
- Product, platform, and security uncertainty should be recorded or escalated instead of silently decided.

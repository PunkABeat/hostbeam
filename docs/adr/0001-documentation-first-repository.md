# ADR 0001: Documentation First Repository

Status: Accepted.

Date: 2026-06-14.

## Context

The project is starting as a clean repository. Implementation choices should be made from a clear product and engineering foundation, not from generated project defaults.

## Decision

Start with documentation only. Do not scaffold the Flutter app, install dependencies, create app source code, or add generated project files during Milestone 001.

## Consequences

- The repository remains easy to inspect before implementation starts.
- Product, experience, engineering, and process boundaries are explicit.
- The first implementation milestone can be intentionally narrow.
- Future generated files should be attributable to a specific implementation milestone.

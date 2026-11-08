# ADR 0002: Flutter Desktop App

Status: Superseded by [ADR 0010](0010-migrate-to-tauri-webview-shell.md) (migrate to a Tauri WebView shell). Originally Accepted.

Date: 2026-06-14.

## Context

Hostbeam is intended to be a small native-feeling desktop utility with room for later platform integrations such as menu-bar presence, global hotkeys, and native notifications.

## Decision

Use Flutter as the first application framework for the desktop app when implementation begins.

## Consequences

- Milestone 002 should scaffold a Flutter desktop app.
- Platform integration should be added incrementally and behind narrow interfaces.
- The initial scaffold should stay focused on proving SSH config host discovery.
- Generated Flutter files should not appear before Milestone 002 starts.

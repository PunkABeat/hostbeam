# Architecture Decision Records

Durable project decisions live here as ADRs.

## Index

- [0001 Documentation First Repository](0001-documentation-first-repository.md)
- [0002 Flutter Desktop App](0002-flutter-desktop-app.md) — superseded by 0010
- [0003 Use System OpenSSH First](0003-use-system-openssh-first.md)
- [0004 Keep Project Name Provisional](0004-keep-project-name-provisional.md) — superseded by 0015
- [0005 Agent First Engineering Governance](0005-agent-first-engineering-governance.md)
- [0006 Screenshot Bridge First Product Scope](0006-screenshot-bridge-first-product-scope.md)
- [0007 Test And Tooling Gates](0007-test-and-tooling-gates.md)
- [0008 Direct macOS Distribution Without App Sandbox](0008-direct-macos-distribution-without-app-sandbox.md)
- [0009 UI Framework Fidelity — Flutter vs a WebView Shell (Tauri)](0009-ui-framework-fidelity-flutter-vs-webview.md) — superseded by 0010
- [0010 Migrate Hostbeam from Flutter to a Tauri WebView Shell](0010-migrate-to-tauri-webview-shell.md)
- [0011 Detach the App UI from the Design Prototypes](0011-detach-app-ui-from-design-prototypes.md)
- [0012 One Monorepo for the Desktop App, Website, and Future Mobile App](0012-monorepo-for-desktop-web-and-mobile.md)
- [0013 Astro Marketing Site and the Shared UI Package](0013-astro-marketing-site-and-shared-ui-package.md)
- [0014 Licensing and Monetization](0014-licensing-and-monetization.md)
- [0015 Hostbeam Is the Final Name](0015-hostbeam-is-the-final-name.md)
- [0016 iOS Companion App Direction](0016-ios-companion-app-direction.md) — amends 0014's seat wording (3 Macs → 3 devices)
- [0017 iOS Visual Direction — Native Idiom + Brand Layer, QR Host Pairing](0017-ios-native-idiom-with-brand-layer.md)
- [0018 The Mac Remembers Paired Device Public Keys](0018-remember-paired-device-keys.md) — amends 0017's pairing flow
- [0019 The Marketing Site Is Dressed Like the App, Not Like the Prototype](0019-marketing-site-dressed-like-the-app.md) — amends 0013: the landing prototype is reference, not source of truth
- [0020 Agent-Side Tools, Scoped to What Hostbeam Delivered](0020-agent-side-tools.md) — an MCP server and a prompt hook that run on the host
- [0021 Publish the MCP Server, Not the Hook](0021-publish-the-mcp-server.md) — npm, a public mirror and the MCP registry; settles 0020's open distribution question
- [0022 Updates Install Themselves Only When Asked](0022-updates-install-themselves-only-when-asked.md) — skip per version, checking on by default, installing off by default, relaunch only when idle
- [0023 Ratings, Feature Requests and Sharing](0023-ratings-feature-requests-and-sharing.md) — Apple's rating prompt on iPhone only, feature requests by email, Share Hostbeam on the Mac
- [0024 Pairing is a Link](0024-pairing-is-a-link.md) — the Mac's QR holds a hostbeam.app/add link the iPhone's Camera opens; details in the fragment, and a link may only move a host whose key is pinned
- [0025 A URL Can Start a Beam, Once You Allow It](0025-a-url-can-start-a-beam.md) — `hostbeam://beam` and `hostbeam://host?id=…` for scripts, Raycast and the agent, behind one Preferences switch; amended 2026-09-22 to ship on, since a browser asks before opening a scheme
- [0026 Open-Source Notices Ship in Every App, Generated](0026-open-source-notices-ship-in-every-app.md) — every binary carries the MIT/Apache notices it owes, listed by one script from the lockfiles; a stale list fails the release; App Review never asked, the licences do
- [0027 Removing a Device From Every Host](0027-remove-a-device-from-every-host.md) — amends 0018 §3: a remembered device's key comes off every host the Mac lists, only after a read-only check shows each line and the user approves each host
- [0029 Open the Agent's Dev Server on the Mac](0029-open-the-agents-dev-server.md) — the popover lists the SSH user's dev servers when it opens; Open forwards one to 127.0.0.1 and holds a connection until Stop; nothing installed on the host (`ssh -W`, else a relay of `nc`, bash or perl)
- [0028 Free to Use, With a Reminder](0028-free-to-use-with-a-reminder.md) — amends 0014 and 0016: no daily cap; the Mac asks after every 10th beam once it is a week old; a license covers all of Hostbeam 1, with no update window; the iPhone app is free with no in-app purchase
- [0030 Count Downloads at the Edge](0030-count-downloads-at-the-edge.md) — a pass-through Worker on download.hostbeam.app adds each whole download and each update check (`latest.json`) to a daily count in D1 (day, file, agent, platform, country; never an IP or user agent); site copy unchanged; `npm run downloads`

## ADR Rules

- Use ADRs for durable decisions.
- Keep live status in `docs/process/progress.md`.
- Keep handoff notes in `docs/agents/current-handoff.md` and `docs/agents/handoff-log.md`.
- Supersede ADRs instead of silently rewriting major decisions after implementation begins.

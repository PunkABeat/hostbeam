# ADR 0021: Publish the MCP Server, Not the Hook

Status: Accepted.

Date: 2026-09-13.

Relates to: ADR 0020 (Agent-Side Tools), which built both tools, fixed their
scope, and left distribution open.

## Context

ADR 0020 stopped short of shipping anything, with three questions to settle
first: how to distribute, whether the hook's wiring is right, and whether
either tool is useful in a real session.

The last one is answered for the MCP server. On a real host (linux-box,
2026-09-13) Claude called `latest_screenshot` without being told to, read 11px
text off the image, and its feedback produced the drop grouping and the iPhone
naming fix. The hook has still not run against a live agent.

Distribution now has a reason to happen before the iPhone launch rather than
after it. The server works with the Mac app, which is already out. Directory
listings take time to appear, and a listing is not an announcement, so it does
not use up the launch.

## Decision

**Publish the MCP server, and only the MCP server.**

- **npm, as `@hostbeam/mcp`.** One file, bin `hostbeam-mcp`, no dependencies,
  so `npx -y @hostbeam/mcp` is the install. Copying the file by hand stays
  documented next to it, because ADR 0020's rule holds: a host with no network
  must still be able to run it.
- **Public source at `github.com/PunkABeat/hostbeam-mcp`.** This repo stays
  private; directories want a public link. The public repo is a mirror of what
  npm carries, produced by `scripts/mcp-release.sh`, never edited by hand.
  PunkABeat is the account that already holds the Homebrew tap and the name on
  the site's terms.
- **The official MCP registry, as `app.hostbeam/mcp`.** Authenticated by
  domain over HTTP: the site serves the public key at
  `/.well-known/mcp-registry-auth`, and the private key lives in the release
  Mac's Keychain. Chosen over `io.github.*` so the name does not depend on
  which GitHub account holds the repo.
- **MIT.** It runs on someone else's server; they should be free to read it,
  patch it, and keep running their copy.
- **The hook stays unpublished** until its wiring has been checked against a
  live agent (`docs/process/next.md` § 5).

## Consequences

- The version lives in three places: `publish/package.json`,
  `publish/server.json` and `VERSION` in the server. The agent tests fail
  unless all three agree.
- A version is permanent. npm will not take one back after 72 hours and the
  registry never deletes one, so the release script refuses to publish a
  version again with different contents. `mcpName` is part of each npm version,
  so the registry name cannot change without a new one.
- The public README introduces Hostbeam as a Mac app until the iPhone app can
  be installed. Adding the phone is a launch-day item in the iOS submission
  checklist, and it needs a release, because npm shows the README of the latest
  version.
- Found while packaging: the server decided whether it had been launched by
  comparing file names, and `npx` runs a bin through a symlink with a different
  name, so every `npx` user would have got a server that exits silently. It now
  compares real paths, and a test starts it through a symlink. The hook has the
  same check and needs the same fix before it ships.
- Registries other than the official one are submissions rather than code:
  Glama takes the GitHub URL; awesome-mcp-servers wants a Glama score badge, so
  it comes after Glama; mcp.so has a form. Smithery and Claude's directory list
  local servers only as MCPB bundles, which are not built.

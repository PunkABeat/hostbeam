# Screenshot-to-server tools, checked 2026-10-03

The facts behind [the comparison guide](https://hostbeam.app/guides/mac-tools-that-send-screenshots-to-a-remote-agent/)
(`apps/web/src/pages/guides/mac-tools-that-send-screenshots-to-a-remote-agent.astro`).
Every line is from the tool's own site, README, store page or changelog on
2026-10-03; star counts and dates from the GitHub API. "Not stated" means the
source does not say. Recheck the sources before changing a claim on the page,
then bump the guide's `updated` date in `lib/guides.ts`. The wider landscape
(Termius, Herdr, the vendors' own apps) is in
[differentiation-brainstorm.md](differentiation-brainstorm.md) § 1.

| Tool | Type | Price/licence | How it sends | Own SSH, no relay? | Files/multiple | iPhone | Last updated |
|---|---|---|---|---|---|---|---|
| Paste2SSH | Menu-bar app, macOS 14+ (Linux alpha) | Free, optional $5 tip; closed | Paste Mode watches the clipboard; drag-drop | Yes | Any file, several; one-click host switch | not stated | v1.2.0, 2026-06-29 |
| SSH Screenshot Bridge | Menu-bar app + CLI, macOS 15+, build from source | README says MIT, no LICENSE file | Clipboard watch, scp; deletes the previous upload | Yes (+ Tailscale peers) | Images; several hosts | not stated | 2026-04-02, 0★ |
| screencp | Menu-bar app, macOS 14+, unsigned | README says MIT, no LICENSE file | Pick from a grid, pick a host, Send; copies path, `host:path` or the scp command | Yes, system scp | Images | not stated | v0.1.0, 2026-04-28, 0★ |
| claude-screenshot-uploader | xbar plugin (xbar, python3, rsync) | MIT | Watches the screenshots folder, or a click; rsync over ssh | Own server list; ~/.ssh/config not stated | png/jpg; several servers | not stated | v3.1.0, 2026-08-04, 33★ |
| clipssh | Bash CLI, macOS (pngpaste) and Linux | MIT | `clipssh host`; file written 0600 | Yes, follows ~/.ssh/config | PNG; one host per run | not stated | 2026-09-25, 77★ |
| SSH Image Drop | Raycast extension, macOS 13+ / Windows 11 | MIT | Command or per-server hotkey; Finder selection; optional auto-paste | Password in Keychain, or a key it installs; adds an Include to ~/.ssh/config (asks first) | Files and folders, several; pulls back too; 20 MB image cap | not stated | store 2026-08-13, 75 installs |
| Image Paste for Remote SSH | VS Code extension, local Mac, VS Code 1.85+ | Free, MIT | Alt+I in a terminal; saves to `/tmp/screenshots/` via Remote-SSH; types the path | Via VS Code Remote-SSH | PNG | not stated | v0.1.3, 2026-03-20, 217 installs; linked repo 404 |
| FainLane | Menu-bar app, Apple silicon, macOS 15.7+ | $12/yr after a 14-day trial; proprietary | Catches Ctrl+V in Ghostty (prerelease), iTerm2, Terminal; types the path at the cursor; clipboard untouched | Yes; no backend; mosh OK (upload over SSH) | Images; host detected from the session; tmux | not stated | terms 2026-09-13; Show HN 2026-09-16 |
| cmux | Terminal app, macOS 14+ | Free, GPL-3.0-or-later (server parts BSL 1.1) | Drop an image or file into a remote session; scp over the session's connection. Paste-to-upload merged to main 2026-10-01 (PR #16523), not yet released | Reads ~/.ssh/config; `cmux ssh` installs `cmuxd-remote` on the host | Any file | iOS beta for terminal access only | v0.64.25, 2026-09-17, 27,585★ |
| clipaste | Rust daemon, macOS/Windows/Linux, WSL2 | MIT | Serves the clipboard on localhost:18340 via `RemoteForward`; `clipaste ssh-setup` installs an xclip shim and `clipaste-paste` on the server; Ctrl+V in Claude Code on Linux; Codex and macOS remotes print a path | Yes, but needs SSH port forwarding allowed | Images; several hosts not stated | not stated | v2.5.0, 2026-09-11 (v2.6.0 on main), 60★ |

**On the page with care:**

- Paste2SSH's homepage FAQ still offers opt-in cleanup after 7–90 days; its
  v1.2.0 changelog says that setting was removed. The guide mentions neither.
- cmux's paste-to-upload is unreleased; the guide describes drag-and-drop only.
  Recheck after cmux's next release.
- screencp and SSH Screenshot Bridge: "README says MIT" — no LICENSE file.
- No source describes sending from an iPhone. Termius (not a Mac tool) uploads
  an image pasted into a session on iPhone and Android.
- **Opening the remote dev server** (checked the same day for the guide's table):
  cmux does — "Browser panes in a remote workspace route all HTTP and WebSocket
  traffic through the remote machine's network. Type localhost:3000 and you're
  looking at the dev server running on the remote box"
  (https://cmux.com/docs/ssh). Paste2SSH's and FainLane's pages mention no
  port forwarding, dev-server preview or iPhone app, and FainLane none for files
  other than images. The other tools are image or file senders only.

**Sources:** https://paste2ssh.com/ · https://paste2ssh.com/changelog/ ·
https://paste2ssh.com/linux/ · https://github.com/stefanomainardi/ssh-screenshot-bridge ·
https://github.com/puma314/screencp · https://uma.sh/blog/screencp/ ·
https://github.com/mdrzn/claude-screenshot-uploader ·
https://github.com/samuellawrentz/clipssh · https://raycast.com/wjsong/ssh-image-drop ·
https://github.com/raycast/extensions/tree/main/extensions/ssh-image-drop ·
https://marketplace.visualstudio.com/items?itemName=asfeng.claude-code-image-paste ·
https://fainlane.com/ · https://fainlane.com/docs/getting-started ·
https://fainlane.com/terms-and-license · https://news.ycombinator.com/item?id=49728437 ·
https://cmux.com/docs/ssh · https://cmux.com/docs/changelog ·
https://github.com/manaflow-ai/cmux · https://github.com/hqhq1025/clipaste

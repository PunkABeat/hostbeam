# Two-Way Clipboard — Exploration

Date: 2026-09-26 (owner's request, four parallel research strands with full
web search — demand, market, technology, agents — then direct checks of the
load-bearing claims). Claims are sourced unless marked *unverified*; counts are
as of that day. Follows
[beyond-screenshots-brainstorm.md](beyond-screenshots-brainstorm.md), which
flagged the idea.

**The question (owner, 2026-09-26):** could "a clipboard that works both ways"
— between your devices, your servers and your agents — be a completely new
product?

**Status:** an exploration. Nothing is decided; § 8 lists the decisions it
would need.

## The short answer

**As a separate product, the evidence says no.** Both ends are crowded or
free, the vendors are fixing the loudest pain themselves, and nobody says they
would pay. **As Hostbeam's core, it is the strongest idea of the day.** It turns
Hostbeam from "upload a screenshot" into "your clipboard works on every machine
you work on", reuses everything Hostbeam already has, and can make **Ctrl+V
work in Claude Code over SSH** — the most-shouted pain in this whole space.

## 1. Demand

**Copying out of agents: huge volume, mostly not remote, being fixed.**

- Issues with clipboard, copy, paste or OSC 52 in the title across Claude Code,
  Codex, opencode and Gemini CLI: about 2,200, with about 5,100 👍 and 8,100
  comments; Claude Code alone about 1,200 issues and 3,000 👍, 100–200 new a
  month since April 2026. Title matches, so approximate.
- The biggest: Claude Code
  [#18170](https://github.com/anthropics/claude-code/issues/18170) (296 👍,
  indentation and trailing spaces), opencode
  [#4283](https://github.com/anomalyco/opencode/issues/4283) (129 👍, 133
  comments), Claude Code
  [#15199](https://github.com/anthropics/claude-code/issues/15199) (106 👍) and
  [#5512](https://github.com/anthropics/claude-code/issues/5512) (102 👍, the
  `/copy` request), Codex [#9252](https://github.com/openai/codex/issues/9252)
  (91 👍). A meta-issue,
  [#81472](https://github.com/anthropics/claude-code/issues/81472), tracks 42
  open copy/paste bugs.
- Only about 8% name SSH, tmux, WSL, RDP or containers in the title (a floor).
  Most of it is the agents' own screen rendering, local and remote alike.
- `/copy` now works over SSH in Gemini CLI (2025-12-04), Claude Code (2.1.176,
  2026-06-12) and Codex ([#45457](https://github.com/openai/codex/pull/45457),
  2026-09-14); Cursor's CLI calls it a "known limitation".

**Pasting images into a remote agent: the most intense.**

- [Theo, 2026-05-14](https://x.com/theo/status/2054787567095283940): "Just
  learned it's literally impossible to paste images into Claude Code over SSH"
  — 2,336 likes, 399 replies, 662k views. levelsio's "#1 problem"
  ([2026-05-11](https://x.com/levelsio/status/2053771680317636965), 715 likes).
- On WSL: Claude Code
  [#13738](https://github.com/anthropics/claude-code/issues/13738) (41 👍) and a
  Hacker News thread,
  "[Why Ctrl+V won't paste images in Claude Code on WSL](https://news.ycombinator.com/item?id=48267432)"
  (2026-05-25, 55 points, 90 comments).
- Terminal apps are absorbing it (Termius, Moshi, cmux, AbsoluteTelnet; see
  [differentiation-brainstorm.md](differentiation-brainstorm.md) § 1).

**The plumbing, and reading the local clipboard from the server.**

- mosh's clipboard fixes have sat open for years:
  [#1054](https://github.com/mobile-shell/mosh/pull/1054) (42 👍, since 2019)
  and [#1104](https://github.com/mobile-shell/mosh/pull/1104) (25 👍).
- Letting programs on the server read the local clipboard: Windows Terminal
  [#9479](https://github.com/microsoft/terminal/issues/9479) (73 👍) and WezTerm
  [#2050](https://github.com/wezterm/wezterm/issues/2050) (68 👍).
- Pasting text in: a login code that will not paste into Claude Code in a
  container, [#47699](https://github.com/anthropics/claude-code/issues/47699)
  (65 👍).

**Thin:** "the agent puts results on my clipboard" — a handful of DIY plugins
and 1–4-point launches, and Codex
[#36766](https://github.com/openai/codex/issues/36766) reports an agent writing
the clipboard unasked *as a bug*. "The agent reads my clipboard": no requests
at all.

**Willingness to pay: thin.** Moshi puts image paste in Pro; FainLane charges
$12/yr; nobody says "I'd pay". Free tools are everywhere, Cinch ("the clipboard
for the AI era") has no paid tier, Hacker News pushes back on clipboard
services it cannot self-host, and its top clipboard stories since 2025 are
privacy scandals.

## 2. Market

| Category | Examples | Reaches servers? | Money |
|---|---|---|---|
| Clipboard managers | Paste, Maccy (21.7k★), Raycast, Alfred, Pastebot 3 (2026-07-24), CopyQ, Ditto; macOS 26's Spotlight history | No | Paste $29.99/yr or $99.99 lifetime; newcomers $10–20 once; Raycast Pro does not sync clipboard history |
| Device-to-device sync | Universal Clipboard (Apple, one account, nearby), Phone Link, Samsung, Google Quick Share, Pushbullet, UniClipboard, SyncClipboard, LocalSend | No | Mostly free; Pushbullet's 2016 paywall "never really recovered" |
| Server bridges | [ssh-clipboard](https://github.com/standardagents/ssh-clipboard) (235★, since 2026-08-17, "native encrypted clipboard sync over SSH for macOS and Linux": text, images, files), cc-clip (161★), clipper and lemonade (no authentication) | Yes | Free |
| Agent clipboard tools (MCP) | Paste MCP (2026-06-02), CrossPaste (no authentication), PastePaw ($2.99/mo), MaCcyP (agents push to an "Agents" list) | No — all local | Mostly free |

- **Clipboard history pays.** Paste Team ApS, two employees, reported FY2025
  gross profit of DKK 6.563M and a net result of DKK 2.861M
  ([proff.dk](https://www.proff.dk/firma/paste-team-aps/k%C3%B8benhavn-k/internetdesign-og-programmering/0PO8KJI0C2C))
  — roughly US$1.0M and US$0.43M. But Apple put basic history into Spotlight in
  macOS 26.
- **Sync alone does not sell**, and the platforms are closing the
  phone-to-computer gap: Apple will share the iPhone clipboard with paired
  Windows PCs in the EU under the DMA, likely fall 2027
  ([Macworld](https://www.macworld.com/article/3205820/apple-is-finally-making-copy-paste-work-between-iphones-and-pcs.html)).
  None of them reaches servers.
- **The gap:** phones, desktops *and* servers, both ways, with history, a record
  of where each item came from, and consent — for people and for agents.
  Nothing found does all of it; ssh-clipboard has no phone, history or agent
  side, and the agent tools are all local.

## 3. How it could work

**The terminal's own clipboard (OSC 52) cannot carry it.**

| Terminal | Write | Read |
|---|---|---|
| Ghostty 1.3.1 | yes | asks (kitty's OSC 5522, which carries images, on main only) |
| kitty | yes | asks (OSC 5522 since 0.27) |
| iTerm2 | off until enabled | asks |
| WezTerm, Windows Terminal | yes | ignored |
| VS Code terminal | yes | answered without asking, per its source (*untested*) |
| Terminal.app, GNOME Terminal | no | no |
| Warp | denied by default since its CVE fix | — |
| Termius, Moshi | yes | *unverified* |

- It is text only (images need OSC 5522, which only kitty and Ghostty's
  nightly builds have). Every layer can cut a copy short: tmux drops sequences
  over 1 MiB and only passes a program's OSC 52 with `set-clipboard on`; mosh
  1.4.0 writes only, accepts one form and silently cuts at 16 KiB; Codex's
  `/copy` caps at 100 KB.
- Pasting big text in arrives as keystrokes: bracketed paste has to survive
  every layer, or auto-indent and shells mangle it. Claude Code collapses any
  paste over 800 characters into a placeholder.

**A side channel over Hostbeam's own SSH connection can.**

- A small program on the server answers to the names programs already call —
  `pbcopy`/`pbpaste`, `xclip`, `wl-copy`/`wl-paste` — and talks to the Mac
  through a Unix socket forwarded over an SSH connection the Mac holds open.
  OpenSSH creates forwarded sockets as 0600, so other users on the server
  cannot reach it; a stale socket needs a fresh path per connection (or
  `StreamLocalBindUnlink yes` on the server).
- It does not travel through the terminal, so tmux, mosh, phone SSH apps,
  Terminal.app and Warp's default no longer matter. With mosh, the terminal's
  own SSH connection closes after start-up; Hostbeam's separate connection
  carries the socket regardless.
- Fallbacks when no connection is open: OSC 52 (through `tmux load-buffer -w`
  inside tmux), then a drop folder the Mac collects on its next connection.
- The precedent exists: cc-clip serves images to remote Claude Code and Codex
  through `xclip`/`wl-paste` stand-ins behind a token-protected forward (Codex
  also needs a virtual X display, Xvfb); ssh-clipboard syncs both ways over
  SSH.

**Verdicts by direction.**

- **Server → Mac: feasible now.** Writing the Mac pasteboard needs no
  permission. To the iPhone: partial — through Universal Clipboard, or when the
  app is opened.
- **Mac → server: feasible now, images included.** Pushing is a user action.
  On Linux, Claude Code's Ctrl+V asks `xclip` or `wl-paste` for an image, so a
  stand-in serving the Mac's clipboard makes **Ctrl+V in remote Claude Code
  just work** — cc-clip proves the path. Pulling on the server's request needs
  the live connection and consent (below).
- **Device ↔ device: weak.** Universal Clipboard already covers Apple devices
  on one account; iOS cannot sync in the background, Android 10+ only lets the
  focused app read, and GNOME's Wayland does not allow background clipboard
  access.

**Platform rules.** macOS lets an app read the pasteboard without a prompt
today. Apple previewed alerts for reads the user did not start (macOS 15.4, a
developer preview absent from macOS 26), and a macOS 27.2 beta's notes
reportedly remove the preview's setting — direction unclear. Password managers
mark sensitive items (the nspasteboard.org Concealed and Transient types); a
bridge must skip them. On iOS, reading another app's clipboard in code shows
"Allow Paste", `UIPasteControl` does not, and background apps cannot read.

**What safety requires.** Consent for every read the server asks for, or a
time-limited grant per host; password-manager items never sent; items that
expire; per-host scoping (a 0600 socket, a token per connection, never a TCP
port on a shared server); a notification naming the host; control characters
stripped; size limits.

## 4. The agents

| Agent | User copies out | Over SSH | Image paste | Agent writes the clipboard | Agent reads it |
|---|---|---|---|---|---|
| Claude Code | `/copy` (or to a file, "useful over SSH") | OSC 52 / tmux, fixed in 2.1.176 | Ctrl+V, local only | only by running `pbcopy`; steered back to `/copy` | `pbpaste`, local only |
| Codex | `/copy` | native, tmux, then OSC 52 (#45457) | Ctrl+V, local | shell only; sandboxes block `pbcopy` | shell only |
| Gemini CLI | `/copy` | OSC 52 | Ctrl+V | blocks OSC 52 from commands it runs | no |
| OpenCode | copy on select | OSC 52 | Ctrl+V | no | no |
| Cursor CLI | `/copy` | fails, "known limitation" | local | no | no |
| Aider | `/copy` | local | `/paste` | no | `--copy-paste` mode watches the clipboard (opt-in) |

- **No agent has a real clipboard tool.** Vendors send agent-initiated writes
  back to the user's `/copy` or block them, and route around SSH with their
  own relays (Remote Control, Codex in ChatGPT).
- **Every agent clipboard server (MCP) is local**, over stdio or localhost.
  CrossPaste's serves clipboard history on localhost with no authentication.
- **The risks are real, and they are the product:** Warp's CVE-2026-48725 let
  any terminal output silently read or overwrite the clipboard through OSC 52
  (June 2026; the fix denies by default); "AI ClickFix" had a web page plant
  `curl … | sh` for an agent to paste
  ([Embrace The Red](https://embracethered.com/blog/posts/2025/ai-clickfix-ttp-claude/),
  2025-05-24). An agent that "copied the command for you" is a pastejacker if
  it has been prompt-injected.

## 5. The product it points to

*"Copy on your Mac, paste on your server. Copy on your server, paste on your
Mac or iPhone. Through tmux, mosh and your phone — for you and your agents."*

1. **Ctrl+V works in remote agents** — screenshots and text, natively; no
   hotkey, no path. The job Theo and levelsio asked for.
2. **Anything copied on the server lands on your Mac** — `pbcopy`, `/copy`,
   anything — with a small note naming the host.
3. **An agent outbox.** An agent can hand you a command, a snippet or a file;
   it arrives marked "from Claude on devbox", risky commands are flagged, and
   copying it is one click. Never silently.
4. **History with provenance** on the Mac and the phone: which host, session or
   agent each item came from.
5. **Consent built in.** The server cannot read your clipboard until you allow
   it, per host and for a limited time; password-manager items never leave.

**Why it stands out:** it works across the messy stack (the socket, not the
terminal), with any agent (the stand-ins are what agents already call), in
both directions, with images, consent and provenance, over your own SSH. The
vendors fix `/copy` for text inside their own tool; Termius works only inside
Termius; ssh-clipboard and cc-clip have no phone, history or consent; the agent
clipboard servers are local.

**It is Hostbeam, not a new product.** "Beam between your devices and your
hosts, both ways" is what the name already says. It reuses the SSH setup, the
host list, host-key pinning, iPhone pairing and the licence, and it gathers
several earlier proposals into one: the connection the Mac holds for a session
(differentiation-brainstorm bets 1 and 3), the `hb` command on the server
(beyond-screenshots-brainstorm), routing to the right session (bet 4), and any
file you hand over (bet 5).

## 6. Risks

- **Security is the product.** A server that reads your clipboard is an
  exfiltration path; an agent that writes it is a pastejacking path. Consent,
  provenance and no silent overwrite are not optional.
- **Vendors.** `/copy` keeps improving, and if the agents adopt kitty's OSC
  5522, kitty and Ghostty users get image paste without Hostbeam — Anthropic
  closed that request as not planned
  ([#42712](https://github.com/anthropics/claude-code/issues/42712)).
- **Apple.** Alerts for background clipboard reads were previewed; if enforced,
  pulls from the Mac need a user action or a prompt.
- **Willingness to pay** for plumbing is thin next to free tools. The value has
  to be reliability across the messy stack, the phone, history and safety.
- **Scope.** It moves Hostbeam's fences — screenshots only, no always-on
  connection, nothing running on the host but the read-only agent tools.

## 7. Test before building (days, not weeks)

1. **Use ssh-clipboard and cc-clip for a week** — feel the job and its gaps.
2. **Spike the socket:** a `pbcopy` stand-in on `hostbeam-testhost` writing the
   Mac pasteboard through a forwarded Unix socket, through tmux and mosh.
3. **Spike Ctrl+V:** an `xclip` stand-in serving the Mac's screenshot to Claude
   Code's image paste on the test host.
4. **Ask a few buyers** whether "Ctrl+V just works over SSH, and copies come
   back to your Mac and phone" is worth paying for.

## 8. Decisions it would need

- **Hostbeam's core or a separate product** (this record recommends the core).
- **Scope:** `AGENTS.md`'s fences, ADR 0006 and `docs/product.md` — clipboard
  text and files, both ways.
- **A connection the Mac holds open** for a session — a new ADR; it is
  background network activity.
- **Reading the Mac's clipboard on a server's request** — a security ADR: the
  consent model, what is never sent, per-host grants.
- **Code installed on the user's hosts** — the stand-ins and `hb`, beyond ADR
  0020's read-only agent tools.
- **Pricing:** where the bridge sits against the free tier and the licence.

## 9. Unverified

- Whether Apple will enforce pasteboard alerts (the macOS 27.2 beta report is a
  secondary source).
- ssh-clipboard's npm download count (672k in 30 days, out of line with 235★).
- OSC 52 read support in Termius, Blink and Moshi.
- Whether Codex's image paste on Linux can be served without a virtual X
  display.
- Willingness to pay, beyond the thin signals in § 1.

## How this was researched

Four research strands ran in parallel with full web search: demand (GitHub
issue counts through the API, Hacker News through its search API, X counts
through the FxTwitter API, and the `/last30days` social sweep; Reddit mostly
blocked scraping), the market, the technology (terminal and multiplexer
source code, platform documentation), and the agents. Then direct checks of
the claims the conclusion rests on: Theo's post, ssh-clipboard, cc-clip's
approach, every GitHub count cited in § 1, and Paste's company filing.

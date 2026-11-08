# Beyond Screenshots Brainstorm — Outside the Box, and Past the Image

Date: 2026-09-26 (two rounds of owner questions in one session: mostly ideas,
with direct checks of the evidence). Claims are sourced unless marked
*unverified*; GitHub counts are as of that day. Companion to
[differentiation-brainstorm.md](differentiation-brainstorm.md) and
[agent-first-brainstorm.md](agent-first-brainstorm.md).

**The questions (owner, 2026-09-26):**

1. "If we really think outside the box … what else could we think about making
   this product as useful as possible for the users?"
2. "Is there anything else if we even expand outside than just screenshot? …
   I don't mind it brings us towards a different product, just want to see
   what would be possible."

**The owner's response:** "these are truly great." The owner flagged **a
clipboard that works both ways** as possibly a completely new product, to
explore next (§ 3). Nothing here is decided.

## The short answer

Hostbeam's real asset is not the screenshot. It is **the trusted bridge
between your devices and the machines your agents run on**: your SSH, your
servers, your phone, and a foothold on the host. Round one stayed with images
and found the most useful new shapes — share a window with your agent, and
instant replay; a same-day check found that Apple's window picker makes the
first need no Screen Recording permission, on the Mac now and on the iPhone
with iOS 27. Round two left images behind and found the best-evidenced idea
of the day: everything VS Code Remote does for the boundary between your
machine and the server, for people who live in a terminal or on their phone —
starting with a clipboard that works both ways.

## Part A — Outside the box, still visual (round one)

### The three to look at hardest

1. **Share a window with your agent, like a Zoom screen share.** You pick a
   window (browser, simulator, Figma) with Apple's own picker; a badge shows it
   is shared; the agent can look at it whenever it wants; one click stops it.
   - Easier to trust than a list of rules: everyone understands screen
     sharing, the act of sharing *is* the consent, and nothing else on the
     screen is visible.
   - Apple's system picker is ScreenCaptureKit's
     [`SCContentSharingPicker`](https://developer.apple.com/documentation/screencapturekit/sccontentsharingpicker)
     (macOS 14+).
   - **It needs no Screen Recording permission** (verified 2026-09-26). Apple:
     with the picker "your app is not required to obtain separate permission
     to capture the screen" (WWDC23 session 10053), and Apple's developer
     support says it avoids macOS 15's recurring re-authorization prompt
     ([forums](https://developer.apple.com/forums/thread/765103)). The cost is
     one pick per session, so nothing can be captured silently — which is the
     point. Hostbeam stays "the tool that needed nothing".
   - **It reaches the iPhone in iOS 27.** ScreenCaptureKit arrives on iOS 27
     with the same picker: the whole display or the app itself, background
     capture, a rolling clip buffer; Apple says it "replaces ReplayKit… A
     broadcast extension is no longer necessary"
     ([docs](https://developer.apple.com/documentation/screencapturekit/capturing-screen-content-on-ios)).
     Whether iOS shows a prompt of its own is undocumented.
2. **Instant replay for bugs.** Hostbeam keeps the last 30–60 seconds of the
   shared window in memory only, never on disk. Something flickers, you press
   the key, and the last 30 seconds go to the agent as frames with timestamps.
   You never have to start recording in time.
   - The nearest precedent is Jam's Instant Replay: a replay of the page's
     structure (not video) for up to two minutes, buffered in its browser
     extension and uploaded when you file it, with console and network logs
     ([docs](https://jam.dev/docs/record-a-jam/instant-replay)). Jam's
     [MCP docs](https://jam.dev/docs/jam-mcp) say its frame and video tools
     (`getFrames`, `analyzeVideo`, `getVideoTranscript`, `getVideoChapters`,
     `getScreenshots`) "are not available for Instant Replay Jams" — so
     nothing found gives an agent the frames of what just happened, and
     nothing does it outside the browser.
   - With Apple's picker (idea 1), the buffer needs no permission either, and
     on iOS 27 ScreenCaptureKit offers a rolling clip buffer of its own.
3. **A "Loom for your agent": show and tell.** Hold the key, talk and point
   while you demonstrate, release. Hostbeam turns it, on your Mac, into a
   transcript lined up with keyframes and where you clicked, and beams it.
   - [Clipy](https://clipy.online/), "the agent-readable screen recorder",
     does this in its cloud for $9/month ($72/year): a person records, and the
     shared link carries a summary, transcript and "key moments" with frame
     references and click coordinates, as a link, a Claude Code skill or an MCP
     server. That proves the pattern. Hostbeam's version would run locally and deliver to
     your own server, for any agent.

### Bigger swings

4. **Before/after screenshots in every UI pull request, automatically.** The
   agent captures the shared window before and after its change and adds both
   to the PR. **Newly possible:** GitHub's REST and GraphQL APIs still take
   text only, but GitHub CLI 2.99.0 (2026-09-01) added `--attach` to
   `gh issue` and `gh pr` `create`, `edit` and `comment`, images up to 10 MB,
   not on GitHub Enterprise Server
   ([changelog](https://github.blog/changelog/2026-09-01-github-cli-media-in-issues-pull-requests-and-comments)).
   An agent can attach the pictures itself.
5. **Review your agents' work as swipeable stories on your phone.** Each
   finished task becomes a short before/after story: swipe to approve, reply,
   or send it back. Pictures are easy to review on a phone; diffs are not.
6. **"Does it match the mockup?"** Beam the design and the built screen;
   Hostbeam overlays them, marks the differences with measurements, and sends
   that to the agent. **Taken by enterprise tools:** Applitools's Figma
   design baselines report drift to Claude Code, Cursor, Copilot and Codex
   through its MCP server (2026-09-15), and TestMu AI (formerly LambdaTest)
   ships a SmartUI skill doing the same (2026-08-10). Hostbeam's version would
   only be the cheap, local one.
7. **Anyone can beam to your agent.** A link for a teammate, client or QA:
   screenshots from any device, nothing to install, straight into your agent's
   inbox, labelled with the sender. Needs a relay; competes with Jam, Marker.io
   and BugHerd, which now feed agents too.
8. **An open "agent inbox" standard.** Publish the folder layout, the sidecar
   and the agent tools as an open spec, and invite Termius, Moshi, cmux, Herdr
   and Blink to write into it, so every agent reads one inbox. Once the upload
   is a commodity, the standard is worth more than a feature. Claude Code
   already keeps private inboxes — `~/.claude/uploads/<session>/` for files
   from the web and mobile apps, and `~/.claude/channels/telegram/inbox/` (and
   Discord's, on demand) for its channel plugins — which shows the need.
9. **A command on the server: `hb`.** Every agent can run a shell command, even
   one without MCP, and so can scripts and CI: `hb show plot.png` (to your Mac
   and phone), `hb ask "Ship?"`, `hb look` (the shared window). A failing CI
   test could send its screenshot to your phone. It makes every other idea
   usable by every agent.
10. **Eyes on the physical world.** For hardware developers: the agent asks for
    a photo of the board or the device's display, and the iPhone takes it when
    you approve.

### Small things with big reach

- A macOS Share menu entry and a Finder right-click "Beam to host". The Mac app
  has neither: its only share code (`share.rs`) shares Hostbeam's website from
  About.
- Beams that queue while offline and send when back.
- One screenshot to two agents at once, to see which fixes it.
- A Stream Deck "beam" button.
- Agent skills shipped with the MCP server: turn a beam into a failing test,
  compare it with the design, check accessibility.

**Round one's pick:** window sharing plus instant replay — "your agent sees
what you see, and what just happened" — then `hb`.

## Part B — Past the screenshot (round two)

Everything that has to cross the line between your machine and where the agent
runs is in scope: text, logins, ports, secrets, access, sessions.

### 1. VS Code Remote's missing half, for people who live in a terminal

VS Code users working on a server get the boundary handled for them (checked
in VS Code's source, 2026-09-26): its server sets `BROWSER` in remote terminals
to a helper that opens links "on the local machine", so `gh auth login` just
works, and `remote.autoForwardPorts` — on by default — forwards ports that
remote processes start listening on. People who run agents in a terminal —
tmux, Ghostty, Termius, the phone — get none of it.

- **A clipboard that works both ways.** The agent, or you, puts clean text on
  the Mac's clipboard (`hb copy`, or a tool call: "the SQL is on your
  clipboard"); it reaches the iPhone through Universal Clipboard. Long text
  going the other way lands as a file. The strongest demand of anything found
  that day:
  [#18170](https://github.com/anthropics/claude-code/issues/18170) "Copy/paste
  from terminal includes unwanted indentation and trailing spaces" (296 👍,
  136 comments), [#62699](https://github.com/anthropics/claude-code/issues/62699)
  (text cannot be copied from the output, 73 👍),
  [#66192](https://github.com/anthropics/claude-code/issues/66192) (copy-paste
  does not work, 36 👍),
  [#70857](https://github.com/anthropics/claude-code/issues/70857) (cannot copy
  the login URL, 20 👍). Some of these are rendering bugs the vendor can fix;
  the path through SSH, tmux, mosh and phone clients stays broken regardless —
  Claude Code's own `/copy` relies on the terminal's OSC 52 and its docs
  suggest writing to a file instead "over SSH".
  It is also the closest fit: Hostbeam is a clipboard-to-server product at
  heart.
- **Links and logins open on your Mac.** When anything on the server wants a
  browser (`gh auth login`, `npm login`, `gcloud`, an agent's own login, a
  sign-in for an agent tool), the link opens on the Mac, and the server's
  `localhost` port the sign-in redirects back to is forwarded so the login
  completes. Evidence: Codex
  [#2798](https://github.com/openai/codex/issues/2798) "Support remote /
  headless OAuth sign-in" (100 👍, 49 comments), Claude Code
  [#47670](https://github.com/anthropics/claude-code/issues/47670) (pasting the
  login code fails, 26 👍) and #70857 above.
- **Previews open by themselves.** The agent starts a dev server on port 5173;
  Hostbeam notices, forwards it, and offers "Open devbox:5173" on the Mac, or
  on the iPhone to test on a real phone. Evidence: levelsio's 2,820-like post
  — Claude Code set up a live iOS Simulator stream from a remote Mac to his
  browser over an SSH tunnel, after only ever sending screenshots — and
  Termius's own port-forwarding post (990 likes); X figures read through the
  FxTwitter API on 2026-09-26.
- **Questions that wait for you.** The agent's question reaches your phone and
  waits instead of giving up:
  [#73125](https://github.com/anthropics/claude-code/issues/73125)
  "AskUserQuestion: 'No response after 60s — continued without an answer'"
  (388 👍, 144 comments).
- **Files and images both ways** — the earlier docs.

How much people want remote agents with a local interface shows in Codex
[#10450](https://github.com/openai/codex/issues/10450), "Remote Development in
Codex Desktop App" (693 👍), which Codex answered with SSH projects.

### 2. The trust layer for agents that run on their own

Once agents run unattended, the scary parts are access and money, and Hostbeam
already handles SSH keys, device trust and the phone. **Checked 2026-09-26:
this ground is contested, and funded.**

- **Secrets the model never sees.** The agent needs an API key; the phone asks
  "Allow devbox to use STRIPE_TEST_KEY for an hour?" with Face ID; the key goes
  into the command's environment, never into the conversation. Anthropic does
  this for environment-variable credentials in its Managed Agents ("the agent
  never sees the secret value",
  [vaults](https://platform.claude.com/docs/en/managed-agents/vaults)). For
  agents on your own machines it exists too: Infisical's Agent Proxy (GA
  2026-07-30, on every plan including free) swaps real credentials in at the
  network edge, OneCLI (3.5k★) does it as a gateway, and 1Password has
  promised runtime credentials for agents "later this year". Hostbeam's angle
  would be only the phone approval.
- **Access lent briefly.** Instead of copying long-lived keys onto the dev box,
  lend them for one task — a push, a deploy, another server — time-limited,
  approved on the phone, revoked everywhere with a tap. It extends
  [ADR 0027](../adr/0027-remove-a-device-from-every-host.md). Also being
  built: Tailscale Aperture (GA 2026-08-26, an SSH endpoint for agents with
  approval per new machine), shoephone (open source, 2026-09-07: Face ID on
  the phone, a one-host certificate), ssh.bot (private beta: time limits,
  approvals in Slack or Telegram), and Smallstep with Keycard (2026-03-23).
- **House rules on every server.** "Never read `.env`", "ask before
  `git push --force` or a deploy" — installed as agent hooks on every host.
- **A flight recorder and a panic button.** "What did my agents do today?" as a
  timeline on the phone, and one tap that pauses every agent on every server.
  Entire, from GitHub's former CEO, raised a $60M seed for agent checkpoints
  (2026-02; its CLI has 5.1k★); smaller recorders exist (tracehouse, ssh.bot's
  command log).

### 3. Other directions

- **Hand off the agent when you close the laptop.** One click moves the working
  copy and the session to the server and resumes it in tmux; later it comes
  back. Remote Control needs the machine to stay on, and its reconnect bugs
  ([#34255](https://github.com/anthropics/claude-code/issues/34255), 108 👍) and
  idle deaths ([#32982](https://github.com/anthropics/claude-code/issues/32982),
  86 👍) show how much people want sessions to survive. **Codex already does
  it:** its desktop app's Handoff moves a chat and its Git state between your
  Mac and an SSH host and back (not a live process; long chats are refused,
  [#40879](https://github.com/openai/codex/issues/40879)). Claude Code moves
  sessions only to and from Anthropic's cloud. Demand is modest: Claude Code
  [#11455](https://github.com/anthropics/claude-code/issues/11455) (25 👍),
  [#31992](https://github.com/anthropics/claude-code/issues/31992) (19 👍),
  Codex [#37967](https://github.com/openai/codex/issues/37967) (31 👍).
- **Borrow the Mac's toolchain.** An agent on a Linux server runs an approved
  `xcodebuild`, a macOS-only test or code signing on the Mac (Cursor's My
  Machines and OpenClaw's `system.run` do this for their own agents).
- **One place for every agent on every server** — who is running, who is
  waiting, one click into that session in your own terminal. Crowded (Herdr,
  cmux, Orca, AgentsRoom), though those replace the terminal.
- **A different product: SSH key hygiene** — which keys and devices can reach
  which servers, and stale ones cleaned up everywhere. ADR 0027 is a first
  step.

**Round two's pick:** direction 1. It has the best evidence (296, 388 and 100
upvotes, against single digits for most screenshot ideas), it is closest to
what Hostbeam already is, and it reuses what is already proposed (`hb`, a
connection the Mac holds for a session). The line: *"Everything VS Code Remote
does for the boundary, for people who live in a terminal or on their phone."*
Direction 2 turned out to be contested by funded players (Infisical, Tailscale,
1Password, Entire), which lowers it; the hand-off already exists in Codex.

## Next: the clipboard as its own product (owner, 2026-09-26)

**Explored the same day:** [two-way-clipboard.md](two-way-clipboard.md) — as a
separate product, the evidence says no; as Hostbeam's core, it is the strongest
idea of the day, and it can make Ctrl+V work in Claude Code over SSH.

The owner flagged "a clipboard that works both ways" as possibly a completely
new product, to explore after this write-up. A first look at what exists,
checked 2026-09-26:

- **The terminal's own clipboard (OSC 52) is text only, and patchy.** Copying
  out works in iTerm2 (once enabled), kitty, WezTerm, Alacritty, Windows
  Terminal and VS Code's terminal, not in Terminal.app; reading is usually off
  or asks first. Inside tmux, programs cannot set the clipboard by default;
  mosh copies out only, and its fix for tmux's form of the sequence is still
  an open pull request
  ([#1054](https://github.com/mobile-shell/mosh/pull/1054), 42 👍). kitty's
  OSC 5522 carries images, in kitty and Ghostty's nightly builds.
- **Clipboard-over-SSH tools are old or tiny:** lemonade (731★, quiet since
  2024), clipper (689★, remote to local only), remote-pbcopy-iterm2 (252★,
  quiet since 2021); Neovim built OSC 52 in with 0.10. The agent-era ones are
  small: cc-clip (161★: images into remote Claude Code, Codex, opencode and
  Cursor over an SSH tunnel, text back out, notifications) and clipssh (77★).
- **Device-to-device sync exists, with servers left out:** Universal
  Clipboard (Apple devices, nearby, one account);
  [CrossPaste](https://github.com/crosspaste/crosspaste-desktop) (2.6k★, local
  network, end-to-end encrypted, with an MCP server that exposes clipboard
  history to AI assistants);
  [ClipCascade](https://github.com/Sathvik-Rao/ClipCascade) (1.9k★,
  self-hosted, end-to-end encrypted; Windows, macOS, Linux, Android); KDE
  Connect; Paste ($29.99/yr, through iCloud).
- **"A clipboard for AI agents" has no funded product** — only small MCP
  servers and CrossPaste's.
- **The vendors are patching their own corner:** Claude Code's `/copy` (OSC
  52, or a file "over SSH"); Codex's `/copy` used to land on the server's
  clipboard, fixed on 2026-09-14
  ([#45068](https://github.com/openai/codex/issues/45068),
  [#45457](https://github.com/openai/codex/pull/45457)).

The questions it raises: who the user is (developers only, or anyone with a
server), which directions matter (server to Mac, Mac to server, phone), the
agent as a clipboard user, history and sync, and security, since clipboard
contents are among the most sensitive data on a machine. Hacker News lists 569
stories for "clipboard ssh"; the top one, "Show HN: Copy from tmux/nvim to
clipboard over SSH", had 38 points (2024-12-22).

## Unverified, worth checking first

- Whether iOS 27 shows a permission prompt of its own when an app captures
  through Apple's picker (macOS's answer is settled: no Screen Recording
  permission needed).
- Pricing and traction for the trust-layer entrants that do not publish
  them (1Password's agent credentials, Tailscale Aperture, ssh.bot).
- Everything about the two-way clipboard as a product beyond the landscape
  above — the exploration is next.

## How this was researched

Mostly ideas, with the evidence checked directly: GitHub issues and counts with
`gh`, vendor pages fetched directly (Clipy, Jam's MCP docs, Apple's
ScreenCaptureKit docs, VS Code's troubleshooting docs), and the Hacker News
search API. The session's web search budget (200 searches) ran out during
round one, which is why round two leaned on GitHub counts;
`CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` raises it, and it was raised the
same day.

**Verified again the same day, with web search.** Resolved or corrected as a
result: Apple's window picker needs no Screen Recording permission, and comes
to the iPhone with iOS 27; Jam's Instant Replay is a page replay without
frames; GitHub CLI 2.99.0 can attach images; the mockup comparison exists at
Applitools and TestMu AI; the trust layer is contested by funded players; the
hand-off already exists in Codex; levelsio's post is about a simulator stream;
and the clipboard landscape was added.

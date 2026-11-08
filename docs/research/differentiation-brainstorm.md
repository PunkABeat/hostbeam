# Differentiation Brainstorm — After the Upload Became a Commodity

Date: 2026-09-26 (owner's question, a same-day research pass in four parallel
strands, and direct checks of every load-bearing claim). Claims are sourced
unless marked *unverified*; engagement and star counts are as seen that day.
Feeds [questions.md](questions.md) § Product, § Mobile and § Competitive
landscape.

**The question (owner, 2026-09-26):** in the light of the competition from
Termius and Anthropic's Remote Control, what could Hostbeam add or change in
its direction to stand out — or what new kind of service could it become?

**The owner's response:** the proposals in § 5 were endorsed as a set ("all
these are good"). None is opened as a milestone or decided in an ADR; § 6 lists
the decisions each one needs.

## The short answer

Moving a clipboard image to the agent's host and handing back a path is now a
feature that ships everywhere, on the desktop as well as the phone. Hostbeam
cannot stand out on the upload any more. It can stand out on three things
nobody offers neutrally: **what arrives** (context the agent can act on,
prepared on the device), **the way back** (what the agent makes, delivered to
you), and **who it serves** (any agent, any terminal, any plan — including
everyone Remote Control shuts out). The proposal: reposition from "screenshot
uploader" to **the private, two-way visual channel for agents you run
yourself**. Of the three, the way back has the thinnest evidence so far (§ 3),
so the inbound side leads.

## 1. The upload is everywhere (checked 2026-09-26)

"Paste or share an image, it lands on the host, the path reaches the agent":

| Surface | Who ships it |
|---|---|
| Phone | **Termius** iPhone 7.5.0 (2026-07-08), Android 7.8.0 (2026-08-10), Mosh sessions from iPhone 7.8.0 (2026-09-14) · **Secure ShellFish**, option to insert the uploaded path since 2026.15 (2026-04-29) · **Moshi** Pro, SCP to `~/.moshi/uploads/` · **Remote Control** (photos and files from the Claude app) · the **ChatGPT** phone app to Codex hosts, Linux included, since 2026-09-01 · **Cursor**'s iOS app |
| Mac | **cmux** (free, GPL, 27.4k★): paste or drop in an SSH terminal, scp over the session's existing connection, path pasted, since 0.63.0 (2026-03-28) · **Herdr** (free, 40.8k★; in YC since August, a $6M seed announced 2026-09-08): remote mode since v0.6.0 (2026-05-20), several machines over SSH and WSL image paste since 0.9 (2026-09-07) · **FainLane** ($12/yr; Show HN 2026-09-16, 2 points): intercepts Ctrl+V in Ghostty, iTerm2 or Terminal, finds the session's host itself, uploads over SSH or Mosh, types the path at the cursor · **Paste2SSH**, a free Mac menu-bar app · the **Codex** app on SSH hosts, and its terminal client sending local images to a remote app server (`codex --remote`: [#45499](https://github.com/openai/codex/pull/45499), merged 2026-09-14, released in CLI 0.156.0 on 2026-09-22) · **AgentsRoom** (desktop agent IDE): "Screenshot to Agent", copied to SSH hosts since v1.189.0 (2026-09-24) |
| Terminals | **kitty**: `kitten clipboard` reads the local clipboard over SSH, images included · **iTerm2** 3.7 (2026-09-08) hands dropped files to remote programs that speak kitty's drag-and-drop protocol, and ships an iOS companion and a Claude Code integration · **Ghostty** merged the kitty clipboard protocol (OSC 5522) on main on 2026-08-22 and 2026-08-24; nightly builds only (latest tag v1.3.1, the 1.4 milestone open) · **AbsoluteTelnet/SSH** v14 (Windows) pastes screenshots into Claude Code over SFTP |
| Do it yourself | Roughly 115 public GitHub repos created in 2026 for this (a keyword search, so method-dependent), and almost none adopted: cc-clip 161★, clipssh 77★, clipaste 59★ (includes Windows/WSL2), claude-screenshot-uploader 34★, claude-clipboard-ssh 0★ (an OSC 5522 wrapper, 2026-09-20) |

**Not covered yet:** Termius desktop (nothing through 10.1.0, 2026-09-21),
Warp ([#8692](https://github.com/warpdotdev/warp/issues/8692), open since
2026-02-15), stable Ghostty, Terminal.app, Wave, Tabby, WezTerm — and the
Claude Code CLI itself. Anthropic closed
[#42712](https://github.com/anthropics/claude-code/issues/42712) ("Support OSC
52/5522 clipboard for image paste over SSH") as not planned on 2026-04-02, and
closed [#5277](https://github.com/anthropics/claude-code/issues/5277) ("image
paste in ssh/sftp") on 2026-08-16 by pointing at copying the file over or
Remote Control.

FainLane is the shape [next.md](../process/next.md) turned down ("typing the
pasteable sentence into the frontmost terminal"): it needs Mac permissions to
catch the paste and insert the path, and works in three terminals. It is
notable for what it removes — no second hotkey, no host picker.

## 2. Three findings that matter more than the table

**The vendors are splitting the agent.** The client, where you type and paste,
runs on your machine or in the vendor's app; only the execution runs on the
host. Codex does it with `codex app-server` and the terminal client above,
Claude Desktop runs Claude Code sessions on SSH hosts (the computer's own
OpenSSH by default on macOS and Linux since September), Cursor's self-hosted
machines say "only the execution environment moves" (2026-09-02), OpenCode
splits into a server and clients, and the Agent Client Protocol has an
HTTP/WebSocket transport proposal (active 2026-07-02). With a local client, a
local paste just works. Hostbeam's upload is needed only while people run the
agent inside a remote terminal — still common, but not where the vendors are
heading.

**Remote Control shuts out a real segment.** Verified from its docs: API keys
are not supported (nor `apiKeyHelper` or `ANTHROPIC_AUTH_TOKEN`); it is
unavailable on Amazon Bedrock, Google Cloud's Agent Platform and Microsoft
Foundry, with `ANTHROPIC_BASE_URL` pointing at a gateway or proxy, through an
enterprise Claude apps gateway, or with `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`
or `DISABLE_GROWTHBOOK` set; Zero Data Retention organizations cannot enable
it, HIPAA configurations are incompatible, and on Team and Enterprise it stays
off until an Owner turns it on. While connected, "the session transcript,
including your messages, Claude's responses, and tool activity, is stored on
Anthropic servers". It does run on a remote host: "start it inside `tmux` or
`screen`".

**"No relay" no longer sets Hostbeam apart, and "private" has a ceiling.**
Moshi's free desktop app leads with "Your SSH, no relay, no account." And once
the agent reads an image, the model provider has it — Hostbeam keeps
Anthropic's relay out of the path, not the model provider. The privacy claim
Hostbeam can still own is about what happens on the device *before* anything
leaves (§ 5, bet 2).

**Consequence for the existing record:** questions.md said "The Mac app is not
affected" by Termius and Remote Control. As of this check it is: the same
upload ships on the Mac through cmux, Herdr, FainLane and the Codex app. The
line is corrected there.

## 3. Where the unmet demand is

Ranked by the strength of the evidence. **Re-graded 2026-09-26**, after the
owner asked whether beam back is really wanted: the first pass ranked it first,
on a reading of a levelsio post that does not hold up (item 5).

**The best-evidenced pain is still the inbound one.** The upload itself is
solved elsewhere (§ 1); getting the image to the right agent without friction
is where people complain loudest. levelsio called pasting screenshots into
Termius his "#1 problem"
([2026-05-11](https://x.com/levelsio/status/2053771680317636965), 715 likes,
108k views); [#5277](https://github.com/anthropics/claude-code/issues/5277),
image paste over SSH, drew 33 upvotes and 25 comments before Anthropic closed
it; and about 115 homemade tools for it were published in 2026 (§ 1). That is
the evidence behind move 1 (beam, and the agent reacts) and bet 4 (the host
found for you, the path typed on the server).

1. **Screen recordings.** Claude takes JPEG, PNG, GIF and WebP, reads only the
   first frame of an animation, and takes no video
   ([vision docs](https://platform.claude.com/docs/en/build-with-claude/vision)).
   [#12676](https://github.com/anthropics/claude-code/issues/12676) (video
   input, 45 👍) has been open since 2025-11-29;
   [#80865](https://github.com/anthropics/claude-code/issues/80865) asks for
   frame extraction for UI bug reports. [peepshow](https://www.peepshow.dev/models/claude/)
   (open source) turns video into frames for a Claude on the same machine;
   Clipy does it in its cloud for $9/mo. Nothing does it for an agent on
   another machine.
2. **An inbox that needs no open terminal.** Getting an image to the agent
   without being inside the session it runs in: you are on the phone, or in
   another app, and see something the agent should have — a bug on the phone,
   a screenshot someone sent you, a design — and want to send it now for the
   agent to see when it is relevant.
   - **Why today's tools miss it:** Termius and Herdr paste into the session
     you have open, so with none open there is nowhere to paste. Remote
     Control does it, but for Claude only, on claude.ai plans, through
     Anthropic's servers.
   - **What people build instead:** the replies to levelsio's "#1 problem"
     post list an upload page on the server plus a `CLAUDE.md` rule telling
     the agent to look there, expiring upload links, and GitHub issues used as
     a mailbox; others build Telegram bots that save photos to the server
     ("You're not gonna SSH from your phone"). Each is a homemade inbox — a
     place on the server where what you send waits for the agent.
   - **Strength:** moderate. The workarounds show the want, but they are
     anecdotes, not counts.
   - **Hostbeam already mostly is this inbox** (§ 4): the iPhone's share
     sheet, Shortcuts action and Back Tap land the file in the beam folder
     without opening a terminal, and the MCP server lets the agent find it
     later — any agent, any SSH app, no third party.
   - **What is missing to make it a real inbox:** the agent does not know
     something arrived until told (move 1's wake-up hook for Claude Code, the
     parked hook's next-message line for the others); nothing says what you
     meant (bet 2's caption); and nothing says which agent it is for when one
     server runs several (item 3; bet 4's choice of pane is the nearest
     answer).
3. **Routing to the right session** — making a beam reach the agent you
   meant when there is more than one.
   - **The failure:** [herdr#4005](https://github.com/ogulcancelik/herdr/issues/4005)
     (2026-09-12, 0 👍): image paste "always resolves to one fixed remote path,
     ignoring which of 3 attached sessions (local + 2 remotes) is focused". You
     paste while looking at server B, the file lands on server A, and B's
     agent gets a path to a file that is not there. One report, but it is the
     mistake any tool makes once it juggles several sessions.
   - **Two levels.** *Which server:* Hostbeam's host is picked by hand today,
     so with three servers a forgotten switch sends a beam to the wrong one;
     bet 4's first half (the host from the terminal typed in last) fixes it.
     *Which agent on that server:* several agents on one box — two Claude Code
     sessions on different projects, or Claude and Codex side by side — all
     share one beam folder.
   - **Fine today, breaks with the proposals.** A pasted path is routed by the
     person pasting it. Move 1's wake-up hook, the next-message hook and the
     agent tools' "latest screenshot" are automatic: every agent on the host
     sees the same latest beam, and two sessions could both wake and both take
     it as theirs.
   - **Ways to solve it:** type the path into the pane you are looking at
     (bet 4's second half — routed by where you are); tag each beam with its
     target, with each agent's hook registering its session on the host
     ("Claude Code in `~/shop`, pane 2") and ignoring beams addressed to
     another; and, when Hostbeam cannot tell, ask in the HUD ("Which agent?
     shop · blog") before sending.
   - **Strength:** weak as evidence of demand (one report), strong as a
     requirement. Running many agents in parallel is a strong trend (Herdr
     40.8k★, cmux, Orca), so routing is not a product on its own, but the
     automatic proposals must get it right before they ship — or "your agent
     reacts" becomes "the wrong agent reacts".
4. **Secrets in screenshots.** Quiet as a complaint, yet on-device redaction
   sells on its own: [Redaktr](https://redaktr.app) ($39 one-time, 3 Macs, with
   a "clipboard guard"), BlurData, Snapline's Smart Redact.
5. **Getting things back from the agent — real, but thinly evidenced.**
   - The complaints exist but are barely upvoted:
     [#96120](https://github.com/anthropics/claude-code/issues/96120) (Claude
     Desktop cannot view or download files in SSH sessions, 1 👍), Codex
     [#41532](https://github.com/openai/codex/issues/41532) (mobile cannot
     preview generated images or video, 1 👍),
     [#79706](https://github.com/anthropics/claude-code/issues/79706) (inline
     images through terminal graphics protocols, 6 👍) and
     [#77190](https://github.com/anthropics/claude-code/issues/77190) (a preview
     panel for remote sessions, 0 👍, closed as not planned 2026-09-18).
   - levelsio's [2026-07-09](https://x.com/levelsio/status/2075328941317886210)
     post (2,820 likes, 431k views) was read here first as demand for this. It
     is about something else: Claude Code on his server set up serve-sim, which
     streams the iOS Simulator from a headless cloud Mac to his browser over an
     SSH tunnel — "Before Claude would make me a page with screenshots but I
     had no idea how the app felt." Screenshots already came back and were not
     enough. It argues for using the app live, not for screenshots back — and
     is strong evidence for the simulator direction in
     [agent-first-brainstorm.md](agent-first-brainstorm.md).
   - The stronger signal is that the vendors are building it: Claude Code has a
     way to send files to the user (broken for Remote Control server sessions,
     [#97301](https://github.com/anthropics/claude-code/issues/97301)), Cursor
     delivers agent screenshots and videos through its own service
     (2026-02-24), and Codex users ask for previews on the phone. Companies
     with usage data are investing in it — and their own users will get it
     built in.
   - Hostbeam's own pull button (next.md § 3, off by default since 2026-09-08)
     has no usage data, by design: the app collects no analytics.
   - Where it would matter most: the phone, which has no remote editor and no
     `imgcat`.

**Crowded, not unmet:** phone notifications and approvals (Remote Control,
Happy 23.9k★, Moshi, cmux, Secure ShellFish's agent hooks) and web previews
(port forwarding, which Termius itself promotes).

**What people pay:** $12–90 a year for this, usually inside a bigger tool
(FainLane $12/yr, Moshi Pro $89.99/yr — $69.99 as a promotion until
2026-10-01 — Termius Pro), or nothing (cmux, Herdr, Paste2SSH). Hostbeam's $29 one-time
matches Mac-utility norms (CleanShot $35, Shottr $12). Five beams a day looks
stingy next to free cmux, Herdr, Paste2SSH and Termius.

**Hostbeam's own signal:** `@hostbeam/mcp` had 375 npm downloads on its
publish day (2026-09-14) and 0–31 a day since — 74 in the week to 2026-09-24.
The host-side half is barely installed.

## 4. What Hostbeam still has

- Any agent, any terminal, any host — and any plan, including the API-key,
  Bedrock, Vertex, gateway and zero-retention setups Remote Control excludes.
- One licence across Mac and iPhone; the iPhone's Shortcuts action beams the
  latest screenshot without opening anything (Back Tap, Action Button).
- Host-key pinning, the system's OpenSSH, no account.
- A vendor-neutral foothold on the host: the MCP server, and the parked hook.
- Most of the inbox in § 3, item 2: an iPhone beam needs no open session, and
  the MCP server lets any agent pick it up later. Termius needs the session
  open; Remote Control is Claude-only and goes through Anthropic.
- The start of a return path: pull (next.md § 3), off by default.

## 5. Proposals (endorsed as a set, none opened)

**Order, after the re-grade (2026-09-26).** The inbound side first, where the
evidence is: moves 1–3 and bet 4, then bet 2. Bet 1 follows once its three
checks say it is wanted. Bet 3 is an experiment and bet 5 a decision. The bet
numbers are labels, not the order.

### This week — uses what exists

**1. Beam, and the agent reacts.** Claude Code's
[hooks](https://code.claude.com/docs/en/hooks) can now wake an idle session
(verified 2026-09-26): a `FileChanged` event watches files on disk during a
session, and `asyncRewake` runs a hook in the background and "wakes Claude on
exit code 2", showing the hook's stderr (or stdout) as a system reminder — text
only. A hook watching the beam folder means a beam from the Mac or the iPhone
wakes the agent in tmux, and it looks, with nothing typed.

- It overturns [ADR 0020](../adr/0020-agent-side-tools.md)'s premise, for
  Claude Code: "Nothing watches a folder between turns, so 'the user does
  nothing' is not reachable."
- It answers next.md § 8 (the agent asks, you beam, it carries on) without a
  blocking tool and without betting on whether a model reaches for one.
- **Routing comes first** (§ 3, item 3): with several agents on one host,
  every hook sees the same beam. The wake-up must reach only the session the
  beam was meant for.
- *Unverified:* whether `FileChanged` can watch a folder outside the project.
  The fallback is an async hook started with the session that polls.
- Codex's hooks (GA 2026-05-14) take the same `UserPromptSubmit` /
  `additionalContext` JSON, and Gemini CLI's `BeforeAgent` hooks add text, so
  the parked hook covers them on their next turn.
- Claude Code's Channels (a research preview since 2026-03-19) could push a
  beam into a session too, but only the channel plugins on Anthropic's own
  list register by default; anything else needs
  `--dangerously-load-development-channels` or a Team/Enterprise
  `allowedChannelPlugins` list, which replaces Anthropic's, and the
  `channelsEnabled` switch applies either way. It carries text and metadata
  only, and it fails to register on the newer MCP client runtime when
  `MCP_PROTOCOL_NEGOTIATION=auto` is set. Not worth building on yet.
- Ship the host side as one command, or as a Claude Code plugin in a
  Hostbeam-run marketplace (Anthropic's official directory takes plugins only
  through a partner contact). The download numbers in § 3 say distribution,
  not features, is the host side's bottleneck.

**2. Re-pitch on what is still true.** Any agent, any terminal, any plan
("works with API keys, Bedrock, Vertex and zero-retention orgs"), no vendor in
between. A candidate line: *"Show your agent anything. See what it made."*
Stop leading with "private" on its own (§ 2).

**3. Re-decide the iPhone launch with a new pitch.** Phone-to-host upload is
the most absorbed thing in this market; *"share from your phone and your agent
reacts — no terminal to open, no vendor in between"* is not; it is the inbox of
§ 3, item 2, which Hostbeam already mostly is. One option to
price: **ship it free, with no in-app purchase.** A free app should need only
the Free Apps agreement, which would take the D&B → Paid Apps agreement → tax →
banking → IAP chain off the launch path (*unverified; confirm in App Store
Connect before relying on it*). The EU still needs the trader address. The
cost: the licence's "any mix of Macs and iPhones" loses its iPhone half, and
the in-app route to buying a licence goes away.

### Bet 1 — Beam back (agent → you)

**Re-graded 2026-09-26: the thinnest evidence of the proposals** (§ 3, item
5), so it follows the inbound work instead of leading it. It is cheap to
finish, since pull already works, and it matters most on the phone. Each
vendor does it only inside its own client.

**Three checks before building the watch:**

1. Use the pull button for a week, with the agent told to save its
   screenshots and charts into the beam folder. Does it get pressed?
2. Ask a few buyers (their licence emails exist): "When your agent makes a
   chart or a screenshot, how do you look at it?"
3. Watch for support mail about files not coming back — the signal next.md
   § 3 was already waiting for.

- **What exists:** pull — a Check button fetches images the agent wrote into
  the host's beam folder, `! -name 'hostbeam-*'`, `-maxdepth 1`, `-type f`,
  with `safe_name` and `open_pulled` guarding every remote name (next.md § 3).
- **What to add:** a watch while a session is on, on auto-beam's model
  (visible badge, an expiry, never resumed at launch); the HUD when something
  new lands, with open, copy and drag; a folder the agent is told to write to,
  or a `show_user` tool on the MCP server that places a file there; and the
  file types agents actually make — PDF, HTML reports, recordings. The iPhone
  gets a "what your agents made" view (pull on open, plus a Shortcuts action
  for automations).
- **What it bends:** next.md § 3's open question (screenshot bridge or
  two-way file bridge) gets its answer; the MCP server stops being read-only
  (ADR 0020); and the app talks to a host on its own while a session is on,
  which wants a connection the Mac owns for the session (see bet 3).

### Bet 2 — Context, not just pixels (you → agent)

Everything computed on the Mac or iPhone before anything leaves — the part no
vendor relay can do.

- **The text beside the image.** Apple's on-device text recognition (Vision)
  needs no permission; the MCP server returns the text with the image, so the
  agent gets exact error strings.
- **Secrets and personal data blurred before upload.** Keys, tokens, JWTs,
  emails and card numbers found in that text are blurred, with a review in the
  HUD ("2 keys blurred — send the original?") and a per-host "always" for
  production. The claim this earns: *your API keys never reach the model
  provider* — which no relay, and no "no relay", can say.
- **Recordings as storyboards.** Drop a `.mov` or `.gif` from CleanShot or the
  system recorder; get keyframes at scene changes, a contact sheet and
  timestamps, which the MCP server serves by time. One gesture is still one
  beam.
- **An optional caption** that travels with the beam.
- A sidecar (`hostbeam-<stamp>.json`) beside the images carries the text,
  caption and frame times. The MCP server's `hostbeam-*` rule still holds; its
  images-only rule (ADR 0020) widens to Hostbeam's own sidecars.
- **No new permission:** no Screen Recording, no Accessibility. A spoken
  caption would need the microphone and speech recognition, so it stays
  opt-in and later. "The tool that needed nothing" survives.
- **What it bends:** ADR 0006's "screenshot bridge" becomes a *visual context*
  bridge; a recording is a file, so the file-type fence moves deliberately.

### Bet 3 — Let the agent ask (an experiment)

The agent calls something like `request_screenshot("the checkout page after
submit")`. While a session is on, the Mac shows the request in the HUD; you
capture with your own tool; the beam is the answer (and with the hook in move
1, the beam also wakes the agent).

- **Transport:** a connection the Mac holds for the session — polling a
  request file over it, or a forwarded Unix socket. No relay, nothing
  listening on the network. This is the app-owned SSH connection questions.md
  § Competitive landscape already expects to need an ADR.
- **Nothing like it exists for agents on a server.**
  [AgentsRoom](https://agentsroom.dev/features/ssh-connections) wires its own
  tools back "through a reverse SSH tunnel", inside its own IDE; Claude's
  computer use drives only the machine its app runs on.
- **Decide by next.md § 8's rule:** keep it if models reach for it
  unprompted; delete it if they do not.

### Bet 4 — FainLane's result, without its permission

Added after the owner asked why Hostbeam should not copy FainLane. **Owner,
2026-09-26: liked; to revisit after the remaining questions. Not decided.**

FainLane buys three things: the Ctrl+V that Claude Code users already press
for images, no host to pick (the host comes from the session you are typing
in), and the path landing in the prompt you are writing. Copied as-is it needs
the Accessibility permission twice — to catch and swallow Ctrl+V, and to type
the path — and has to be taught each terminal. Ctrl+V is also vim's
visual-block key, bash's literal-insert key and a local agent's own image
paste, so an interceptor must judge every keystroke. And none of it can exist
on the iPhone, where no app can type into another. The first two benefits can
be had with no permission at all:

1. **Beam to the host you are looking at.** On the shortcut, walk the
   frontmost app's processes to its `ssh` or `mosh` children, pick the one
   whose terminal was typed into last, and resolve its destination with
   `ssh -G`. With tmux on the Mac, ask tmux which pane is active. When it
   cannot tell, use the default host, as today.
   - Checked on this Mac (macOS 15, 2026-09-26): a pseudo-terminal's access
     time moves the moment it receives typed input — the same idle time `w`
     reports — and another of your own processes' command lines is readable
     without sudo. Neither needs a permission prompt.
   - It reads processes, not windows, so it should not care which terminal
     draws them: Ghostty, iTerm2, Terminal, kitty, the VS Code terminal.
     *Unverified* against real sessions in each.
2. **Type the path on the server, not on the Mac.** After the upload, run
   `tmux send-keys -l` into the active pane of the most recently active tmux
   client on that host. The path appears at the agent's prompt, as with
   FainLane, for any local terminal and any agent.
   - It works from the iPhone too: share a screenshot and the path appears in
     the Blink, Moshi, Secure ShellFish or Termius session — Termius's July
     feature, for every SSH app.
   - It needs tmux (or screen, or zellij) on the host. Most remote-agent
     setups run one, and Remote Control's own docs say to. Without it the
     sentence goes to the clipboard, as today.
   - It is the agent-agnostic sibling of move 1: the hook tells the agent a
     beam arrived; this types the path where you are writing.
   - It routes by where you are: only the agent in the active pane gets the
     path (§ 3, item 3).
3. **Ctrl+V itself — possible, fragile, later.** A global shortcut needs no
   permission but cannot hand the keystroke on to the terminal, so Hostbeam
   could claim Ctrl+V only while a terminal is frontmost, an image is on the
   clipboard and the focused session is remote. A wrong guess eats a local
   agent's image paste. Ship 1 and 2 first and wait to be asked.

**What it bends and risks.** Typing into someone's session is powerful: only
literal text, never Enter, only a path Hostbeam generated, folder names
checked for control characters, and opt-in per host. With several clients
attached (a Mac and a phone), "most recently active" needs testing. The test
host is Alpine with OpenSSH only, so tmux would have to be added to test it.
This does not reverse next.md's rejection of typing into the *frontmost
terminal* over Accessibility; it is a different mechanism, and next.md now
says so.

### Bet 5 — Any file you hand over (decided 2026-09-26)

Asked by the owner on 2026-09-26: should Hostbeam support all files, not just
screenshots? The proposal is yes, as *anything you hand over* — not as a file
transfer app. **Decided by the owner the same day:** ADR 0006 and ADR 0020
carry amendments, `AGENTS.md` and `docs/product.md` match, and `next.md` § 10
makes it the first, small step. Not built yet.

**Why the images-only rule no longer holds.**

- It was a focus choice for the first version (ADR 0006), and the competitors
  have since settled it the other way: Termius pastes "images and files", and
  Remote Control attaches "a photo or file". Beside them, a refused PDF reads
  as a missing feature, not a principle.
- The best-evidenced gap going in, screen recordings (§ 3, item 1), is not an
  image, and neither is most of what would come back (bet 1): plots, PDFs,
  reports.
- Agents use most files directly (Claude reads PDFs, logs, JSON and CSV
  through its own tools), so Hostbeam only has to deliver them.

**What the user would see.**

- Any file you hand over is accepted: dropped on the popover or the menu-bar
  icon, copied in Finder and beamed with the shortcut, shared from the iPhone,
  or passed with `open -a Hostbeam`. The same folder, the same sentence, and
  one gesture is still one beam.
- A size cap, and a warning before sending anything that looks like a secret
  (`.env`, `id_rsa`, `*.pem`, `credentials`) — landing those in `/tmp` on a
  shared server would be a real mistake.
- The way back (bet 1) carries any file the agent makes.
- Special handling only where it adds something: a recording becomes frames
  (bet 2). Everything else passes through untouched.

**The new fence: scope by intent, not by file type.** Only what you hand it,
only to the host you chose, only into its folder. Still out: browsing your disk
(no file picker) or the server, syncing, and folders at first. On the host, the
agent tools still read only Hostbeam's own `hostbeam-*` files — any type you
sent, and nothing you did not.

**The scope change, written out.** These move if it is decided:

- **`AGENTS.md`** — the opening scope paragraph and § Current Scope ("arbitrary
  file transfer, drag-and-drop, and a manual file picker … that constraint is
  the product, not a gap"). Opening it needs the owner's explicit go-ahead, a
  milestone. That line is already partly stale: drag-and-drop shipped for
  images on 2026-09-08 (next.md § 4).
- **ADR 0006** — amended or superseded. Its own consequence reads "Future
  arbitrary file support requires a new product and security review"; this
  entry is the product half, and the security half is below.
- **`docs/product.md`** — the non-goal "No arbitrary file transfer in the first
  usable product" and § Later Expansion. "No broad file manager behavior"
  stays.
- **ADR 0020** — the agent tools go from images only to any type under the
  same `hostbeam-*` rule. A non-image comes back as its name, size, type and
  path rather than its bytes; whether small text files come back as text is
  open.
- **The site** — `llms.txt` § Deliberate limits ("a file that is not an image
  is refused. That constraint is the product") and the pitch.

**The code, checked 2026-09-26.**

- **Mac, what is accepted:** every file beam passes `DROP_EXTENSIONS` in
  `beam.rs` (eleven image extensions) and is refused with
  `Error::UnsupportedFile` otherwise.
- **Mac, the shortcut:** it reads image data from the clipboard only. A file
  copied in Finder arrives as a `public.file-url`, which today only the
  menu-bar drop reads (`tray_drop.rs`). The shortcut would have to read file
  URLs first — and if Finder also leaves the file's icon on the clipboard as an
  image (*unverified*), reading them first is what stops Hostbeam beaming the
  icon.
- **Mac, clean-up — the security-sensitive part:** `artifact_match()` matches
  `hostbeam-*.<image extension>` on purpose, "because this feeds a `-delete`
  and the prefix on its own would also match a `hostbeam-notes.txt` somebody
  left there". Any type needs a stricter name first, such as the 13-digit
  millisecond stamp every beam carries, before Storage and Clean up widen.
  (`AGENTS.md`'s scope note still says `hostbeam-*.png`; the code already
  matches every image extension.)
- **iPhone:** the Share and Action extensions declare
  `NSExtensionActivationSupportsImageWithMaxCount: 25` in `project.yml`, so
  iOS never offers them for other files; files need
  `NSExtensionActivationSupportsFileWithMaxCount`. Memory is the one real
  risk: the 2026-07-05 spike streamed 10 MB at about 14.5 MB peak, well under
  the extension's ~120 MB cap, but much larger files are untested.
- **MCP server:** images only today (ADR 0020).

**If decided, the order:** any file on the Mac first (small: the type gate,
file URLs on the shortcut, clean-up's pattern, the agent tools), then the
iPhone, whose memory limit needs a device test first. Files coming back wait
for bet 1's checks.

### What not to do

- **An agent terminal or orchestrator.** Herdr, cmux, Orca, AgentsRoom and Warp
  own it, several with funding.
- **Phone control or notifications.** Crowded (§ 3).
- **FainLane's Ctrl+V interception, as-is.** Accessibility-gated, three
  terminals, and terminals are building the free version (OSC 5522). Bet 4
  gets most of its result without the permission.
- **Windows and Linux ([milestone 009](../process/milestones/009-windows-and-linux.md))
  as the way to stand out.** clipaste already does WSL2 for free, and Termius
  desktop is the obvious next place this lands. Port the differentiated layer
  later, not the upload.
- **Moving the paywall now.** "Free upload, paid channel" is right only once
  bets 1 and 2 exist; until then the daily cap is what sells.

### If Hostbeam wants a new kind of service

Two long shots, recorded so they are weighed rather than rediscovered.

- **Remote agents, local senses.** Bet 3, generalized: agents on your servers
  get consent-gated use of what only your Mac can reach — your screen when
  asked, the iOS Simulator (`xcrun simctl io booted screenshot` should need no
  Screen Recording grant; *unverified*), your logged-in browser behind a
  company VPN — per capability, time-boxed, over your SSH. It bends "acts only
  when you press a key" and widens what a prompt injection can ask for. Worth
  it only if bet 3 shows models actually ask. Developed, with every
  restriction lifted, in [agent-first-brainstorm.md](agent-first-brainstorm.md)
  (2026-09-26).
- **Agent vision for regulated teams.** Bet 2, sold to the organizations
  Remote Control excludes: enforced redaction, an allowed-host list from a
  device-management profile, a local log of what was sent, volume licences.
  The best revenue per customer, but it needs a sales motion Hostbeam does not
  have; a few conversations should come before any code.

### Other uses, beyond agents (asked 2026-09-26)

The owner asked whether developers could use Hostbeam for anything other than
agents. Without the agent angle, Hostbeam is "send what is on my clipboard or
phone to my server, over my own SSH, and get back something pasteable". That
fits several developer jobs — but these are where Hostbeam is *least*
special: good extras that come almost free, not a direction.

Ranked by fit:

1. **Images for docs and READMEs in a repo on a remote dev box** (high). You
   edit over SSH and need `docs/img/login.png` plus the Markdown line that
   shows it: beam into the repo's image folder and put `![](docs/img/…)` on
   the clipboard instead of the agent sentence. Same users, same mechanism.
   Demand is *unverified* — not researched.
2. **Screenshot links from your own server** (medium). Beam into a folder a
   web server serves and copy `https://shots.example.com/…` for an issue, a
   chat or a wiki. A proven category, and a crowded one:
   [Dropshare](https://dropshare.app) ($39 once for the Mac app, the iPhone
   app sold separately; already uploads over SFTP and SCP), [ShareX](https://github.com/ShareX/ShareX)
   (free, Windows, 39.8k★), [PicGo](https://github.com/Molunerfinn/PicGo)
   (27.3k★, an image uploader for Markdown writers),
   [uPic](https://github.com/gee1k/uPic) (3.7k★, macOS),
   [Zipline](https://github.com/diced/zipline) (3.4k★, a self-hosted upload
   server). Hostbeam would bring nothing they lack.
3. **Phone-to-server drops for self-hosted setups** (medium). Share from the
   iPhone into a folder another program watches: receipts and scans into
   [paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) (46k★),
   whose consume folder picks up whatever lands in it; whiteboard photos into
   a notes repo. It reaches developers who run home servers, and needs bet 5
   for PDFs.
4. **Files back from a server, without an agent** (medium-low): plots from a
   data script on a GPU box, render output, a failing test's screenshot. Bet 1
   for people, with the same thin evidence — Jupyter and VS Code Remote
   already show images.
5. **Text to a file on the server** (medium-low): a long config or log beamed
   as a file rather than pasted into an editor over SSH, where auto-indent
   mangles it.

**Two small features cover most of it, with no change of identity:**

- **Template tokens.** The pasted sentence is one global template with a
  single `{path}` token (`settings.sentence` in `config.rs`,
  `render_sentence()` in `beam.rs`). Add `{name}` and a per-host web address,
  and the same beam yields a Markdown line, a link, or the agent sentence —
  uses 1 and 2.
- **Several destinations per host.** One server, different folders, each
  with its own template: `/tmp/hostbeam` for the agent, `~/shop/docs/img` for
  docs, `/var/www/shots` for links — picked at beam time or bound to its own
  shortcut. Today the folder is per host and the template is global.

Two later rounds went further — outside the box, and past the image
altogether: [beyond-screenshots-brainstorm.md](beyond-screenshots-brainstorm.md).

**Not recommended:** pivoting to "screenshot sharing" or "file transfer" as the
main story. Those categories are mature and cheap or free, and none of
Hostbeam's strengths (the agent sentence, the MCP server, routing) counts
there. Keep coding agents as the headline and list these as "also good for" in
the FAQ, where they help sales without blurring what the product is.

## 6. Decisions this needs (owner's calls)

- **The pitch** — a copy decision, no ADR. *Decided 2026-10-03 for the
  launch: "Agent on a server? Show it anything. See what it built."
  ([launch-day.md](../process/launch-day.md) § The message).*
- **The iPhone launch route** — paid with IAP (the current plan), free without
  IAP, or hold. *Decided 2026-09-27: free, no IAP
  ([ADR 0028](../adr/0028-free-to-use-with-a-reminder.md)).*
- **Screenshot bridge or two-way bridge** (next.md § 3) — bet 1's return path
  carries PDFs, HTML and recordings.
- **An MCP server that writes** (ADR 0020) — `show_user` and
  `request_screenshot`.
- ~~**Any file you hand over** (bet 5)~~ — decided 2026-09-26: ADR 0006 and
  ADR 0020 amended, `AGENTS.md`, `docs/product.md` and the site's "deliberate
  limits" updated. It covers bet 2's recordings and bet 1's PDFs too.
- **An SSH connection the Mac owns for a session** — a new ADR; it is also
  background network activity while a session is on.
- **The free tier** — whether it stays at 5 beams a day once bets 1 and 2
  exist. *Decided 2026-09-27, before either: no cap at all, a reminder now and
  then instead ([ADR 0028](../adr/0028-free-to-use-with-a-reminder.md)).*
- **Typing on the server** (bet 4) — whether Hostbeam may type into a tmux
  session at all, and whether it is opt-in per host.
- **Other uses** (§ 5) — whether to add template tokens and several
  destinations per host, and whether the site mentions non-agent uses at all.

## 7. Unverified, worth checking first

- Whether Termius's image paste needs a paid plan (carried over from
  questions.md; still unstated in its docs, changelogs and pricing on
  2026-09-26).
- Whether Claude Desktop's attachments reach Claude Code on an SSH host for
  claude.ai sign-ins: "attach files in SSH Code sessions" appears only in the
  third-party-provider section of its changelog (v1.44121.1, 2026-09-02).
- When OSC 5522 reaches a tagged Ghostty release, and whether
  claude-clipboard-ssh works. No agent CLI (Claude Code, Codex, OpenCode,
  Gemini CLI) documents reading images through OSC 5522 yet.
- Whether Claude Code's `FileChanged` can watch a folder outside the project.
- Whether `xcrun simctl io` needs a Screen Recording grant.
- Whether a free iPhone app with no IAP skips the Paid Apps agreement for
  PunkABeat's account as it stands.
- Bet 4 against real sessions: finding the focused `ssh` in each terminal
  (VS Code and Warp run theirs under helper processes), `tmux send-keys`
  into a Claude Code and a Codex prompt, and the choice of pane with a Mac
  and a phone attached at once.
- Routing (§ 3, item 3): how an agent's hook would register its session on
  the host, and how often Hostbeam's users run several agents on one host.
- Bet 5: what Finder leaves on the clipboard when a file is copied (a file
  URL, and possibly its icon as an image), and the iPhone share extension's
  memory with files far above 10 MB.
- Still open from questions.md: Termius and Remote Control side by side with
  Hostbeam, on a real phone against `hostbeam-testhost`.

## How this was researched

Four research strands ran in parallel — Termius and the other SSH clients; the
agent vendors' remote features and the protocols; developer pain and
workarounds; the adjacent market — followed by direct checks of the claims the
proposals rest on: the Remote Control and hooks docs, the Termius Android
changelog, FainLane's, Moshi's, Redaktr's and AgentsRoom's own pages, every
GitHub issue and pull request cited above (`gh`), the star counts, and the npm
download counts. Reddit refused the research pass's requests, so no Reddit
quote is used here.

**Verified again the same day, with web search** (the session's search budget
had run out during the first pass and was raised). Most claims held. Corrected
here as a result: levelsio's 2026-07-09 post (about a live simulator stream,
not screenshots), Herdr's funding date, Moshi's and Dropshare's prices, the
Channels conditions, and AgentsRoom and Codex, which both closed the gap in
the week before (2026-09-22 and 2026-09-24); Paste2SSH, a free Mac competitor,
was added. X figures were read through the FxTwitter API on 2026-09-26.

## Sources

Termius: [iOS changelog](https://docs.termius.com/changelog/ios),
[Android changelog](https://docs.termius.com/changelog/android),
[desktop changelog](https://docs.termius.com/changelog/desktop),
[paste images and files](https://docs.termius.com/terminal/mobile-terminal).
Anthropic: [Remote Control](https://code.claude.com/docs/en/remote-control),
[hooks](https://code.claude.com/docs/en/hooks),
[channels](https://code.claude.com/docs/en/channels),
[Desktop](https://code.claude.com/docs/en/desktop),
[vision](https://platform.claude.com/docs/en/build-with-claude/vision),
[plugin publishing](https://code.claude.com/docs/en/plugins/publish).
OpenAI: [Codex changelog](https://developers.openai.com/codex/changelog),
[remote connections](https://learn.chatgpt.com/docs/remote-connections),
[hooks](https://learn.chatgpt.com/docs/hooks),
[#45499](https://github.com/openai/codex/pull/45499),
[#36518](https://github.com/openai/codex/issues/36518).
Others: [cmux](https://cmux.com/docs/ssh),
[Herdr v0.6.0](https://github.com/ogulcancelik/herdr/releases/tag/v0.6.0),
[FainLane](https://fainlane.com),
[Moshi image paste](https://getmoshi.app/docs/image-paste),
[Moshi Desktop](https://getmoshi.app/desktop),
[Secure ShellFish](https://apps.apple.com/us/app/id1336634154),
[AgentsRoom](https://agentsroom.dev/features/ssh-connections),
[Cursor self-hosted machines](https://cursor.com/blog/self-hosted-machines),
[OpenCode server](https://opencode.ai/docs/server/),
[ACP transport RFD](https://agentclientprotocol.com/rfds/streamable-http-websocket-transport),
[kitty clipboard](https://sw.kovidgoyal.net/kitty/kittens/clipboard/),
[iTerm2 downloads](https://iterm2.com/downloads.html),
Ghostty [#13963](https://github.com/ghostty-org/ghostty/pull/13963) and
[#13993](https://github.com/ghostty-org/ghostty/pull/13993),
[Redaktr](https://redaktr.app),
[peepshow](https://www.peepshow.dev/models/claude/),
[clipaste](https://github.com/hqhq1025/clipaste),
[cc-clip](https://github.com/ShunmeiCho/cc-clip),
[claude-clipboard-ssh](https://github.com/jcollie/claude-clipboard-ssh).

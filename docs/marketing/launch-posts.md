# Launch posts — drafts

Written 2026-10-03, cold, for launch week ([launch-day.md](../process/launch-day.md)).
**Nothing here is sent or posted until the owner says so, item by item.** All
of it is written for the day the iPhone app is live; `[brackets]` are links or
facts to fill in on the day. Read every draft again on the day: the product,
the competitors and each site's rules move.

The message every draft carries (launch-day.md § The message):

> **Agent on a server? Show it anything. See what it built.**
> Hostbeam links your Mac and iPhone to the server your coding agent runs on.
> Send it screenshots and files, and open the app it's building on your Mac.
> Over your own SSH, free.

Facts the drafts rely on, so one check covers them all: ⌘⇧7 beams the
clipboard; any file up to 100 MB; the path is copied and Claude Code, Codex,
Gemini CLI and OpenCode attach it as the image; system `ssh`/`scp`,
`~/.ssh/config`, host key checked first; no account, no relay, no telemetry,
nothing installed on the server; the popover lists the SSH user's listening
ports and **Open** forwards one to `127.0.0.1` (works where `ssh -L` is refused,
through `nc`/`bash`/`perl`); `npx -y @hostbeam/mcp`; free with no limit, the
Mac asks after every 10th beam once the first is a week old, $29 once for 3
Macs; macOS 13+, iOS 17+; `brew install --cask punkabeat/tap/hostbeam`.

---

## Reusable descriptions

For directories, listings and press. Same facts, four lengths.

**One line:** Hand files to the coding agent on your server, and open what it
builds on your Mac.

**160 characters:** Send screenshots and files from your Mac or iPhone to the
server your coding agent runs on, and open its dev server on your Mac. Own SSH,
free.

**60 words:** Hostbeam links your Mac and iPhone to the server your coding agent
runs on. Copy a screenshot or any file, press one shortcut, and it lands on the
server with its path on your clipboard, ready for Claude Code, Codex or any
agent. The other way, open the dev server the agent started in your Mac's
browser. Your own SSH, no account, free.

**160 words:** Coding agents increasingly run on a server: a VPS, a dev box, a
container. You can type at them over SSH, but you can't show them your screen,
and you can't see the app they're building. Hostbeam fixes both. On the Mac,
copy a screenshot or any file and press ⌘⇧7: Hostbeam uploads it to the host
you picked and copies its path, which Claude Code, Codex, Gemini CLI and
OpenCode attach as the image. On the iPhone, share a screenshot, or double-tap
the back of the phone. In the other direction, Hostbeam lists the dev servers
your agent started and opens one in your Mac's browser, even on servers that
refuse SSH port forwarding. An MCP server lets the agent fetch your latest
screenshot itself. It all runs over your own SSH keys and config: no account,
no relay, no telemetry, nothing installed on the server. Free to use; an
optional $29 licence supports it.

---

## Show HN

**Title** (79 of 80): Show HN: Hostbeam – Hand files to the agent on your server, open what it builds

**URL:** https://hostbeam.app/

**Text** (posted as the first comment if the title links the site):

> I run Claude Code and Codex on a server over SSH, and two things kept
> breaking the loop: I couldn't show the agent a screenshot, and I couldn't see
> the dev server it had just started.
>
> Hostbeam is a Mac menu-bar app and an iPhone app that fix both over your own
> SSH:
>
> - Copy a screenshot or any file and press ⌘⇧7. It's uploaded to the host you
>   picked and its path is on your clipboard. Paste the path and Claude Code,
>   Codex, Gemini CLI and OpenCode attach it as the image. On the iPhone it's
>   the share sheet, or a double-tap on the back of the phone.
> - Open the popover and it lists the ports your SSH user is listening on.
>   Click Open and the agent's dev server is on 127.0.0.1 on your Mac, on the
>   same port. That includes servers where `ssh -L` says "administratively
>   prohibited": each connection is relayed through `nc`, `bash` or `perl`
>   already on the host.
> - An MCP server (`npx -y @hostbeam/mcp`) lets the agent fetch your latest
>   screenshot itself, with nothing to paste.
>
> It runs your system `ssh` and `scp` with your `~/.ssh/config` and keys. No
> account, no relay, nothing installed on the server, no telemetry. The host
> key is checked before anything is sent, a name never overwrites a file, and a
> failed upload leaves your clipboard alone.
>
> Yes, the upload part is an scp one-liner, and several tools do it now:
> Termius on the phone, cmux in its own terminal, Paste2SSH on the Mac. I wrote
> up every way to do it, including a five-line shell function:
> https://hostbeam.app/guides/paste-a-screenshot-into-claude-code-over-ssh/
> Hostbeam is for when you want it in any terminal, with any agent, from your
> phone too, and the dev server coming back the other way.
>
> It's free with no limit. After the first week the Mac occasionally asks you
> to buy a $29 licence, Sublime Text style; it never blocks anything.
>
> macOS 13+, iOS 17+. `brew install --cask punkabeat/tap/hostbeam`. I'd
> especially like to hear from people whose servers block port forwarding.

On the day: check the HN account can post Show HN (new accounts have been
restricted), post around 8–9 am New York time, and stay in the thread.

---

## Product Hunt

- **Name:** Hostbeam
- **Tagline** (55 of 60): Agent on a server? Show it anything. See what it built.
- **Description** (≤ 260): Hostbeam links your Mac and iPhone to the server
  your coding agent runs on. Send it screenshots and files, and open the app
  it's building on your Mac. Over your own SSH: any agent, any terminal, no
  account. Free.
- **Topics:** Developer Tools, Mac, iPhone, Artificial Intelligence, Productivity
- **Links:** https://hostbeam.app/, [App Store link]
- **Pricing:** Free (optional one-time licence)
- **Gallery:** the four clips (Mac, iPhone, MCP, the way back), then the
  popover, the iPhone share sheet, the dev-server row.
- **Maker's first comment:**

> Hi Product Hunt! I'm the developer, and I build Hostbeam on my own.
>
> More and more of us run coding agents on a server: a VPS, a dev box, a
> container. Typing at them over SSH is fine. Showing them a bug is not: the
> screenshot is on your Mac or your phone, the agent is somewhere else. And
> when the agent starts the app, it's on the server's localhost, not yours.
>
> Hostbeam closes both gaps. Press ⌘⇧7 (or share from the iPhone) and the
> screenshot lands on the server with its path ready to paste; Claude Code,
> Codex, Gemini CLI and OpenCode see the picture. Open the menu, click Open,
> and the dev server your agent started is in your Mac's browser.
>
> Everything goes over your own SSH keys and config. No account, no cloud in
> the middle, nothing to install on the server. It's free to use; if you keep
> using it, a $29 licence supports it.
>
> I'd love to know what you'd want it to carry next.

---

## Peerlist Launchpad

- **Name:** Hostbeam
- **Tagline:** Agent on a server? Show it anything. See what it built.
- **Description:** use the 60-word description above.
- **Category:** Developer Tools
- **Built with:** Tauri, Rust, React, Swift, SwiftUI, Astro, Cloudflare Workers

---

## DevHunt

- **Name:** Hostbeam
- **Tagline:** Hand files to the coding agent on your server, open what it builds.
- **Description:** the 60-word description, then: "The MCP server is MIT
  and on GitHub: https://github.com/PunkABeat/hostbeam-mcp"
- **Tags:** CLI, MCP, macOS, iOS, AI

---

## X thread

Pinned on launch morning. One clip per post where marked.

1. Agent on a server? Show it anything. See what it built.

   Hostbeam is out today, free, for Mac and iPhone. [iPhone clip]
   hostbeam.app

2. Coding agents run on servers now. You can type at them over SSH. You can't
   show them your screen, and you can't see what they build.

3. On the Mac: copy a screenshot, press ⌘⇧7, paste the path. Claude Code sees
   the picture. Any file works, any terminal, any agent. [Mac clip]

4. On the iPhone: share a screenshot, or double-tap the back of the phone. It
   lands on your server before you've put the phone down. [iPhone clip]

5. The other way: your agent started a dev server. Click Open and it's in your
   Mac's browser, even where SSH forwarding is switched off. [way-back clip]

6. Or skip the paste: an MCP server lets the agent fetch your latest
   screenshot itself. [MCP clip]

7. Your own SSH keys and config. No account, no relay, nothing installed on the
   server. Free; a $29 licence if you keep using it.
   hostbeam.app

Reply to anyone asking "and the agent can see it?" with post 6's clip. Don't
tag Pieter Levels in the thread; the origin note goes to him privately first.

---

## Reddit

Read each subreddit's rules again on the day; post one subreddit at a time
over two days, and answer every comment.

### r/ClaudeCode

**Title:** I made a free Mac + iPhone app to show Claude Code on a server a
screenshot, and open the dev server it starts

> If you run Claude Code on a VPS or dev box over SSH, you've hit both of
> these: Ctrl+V can't reach your Mac's clipboard, and `localhost:5173` is the
> server's localhost, not yours.
>
> Hostbeam fixes both. Copy a screenshot (or any file), press ⌘⇧7, paste the
> path it copies: Claude Code attaches it as the image. From the iPhone, use
> the share sheet. And when Claude starts a dev server, Hostbeam lists it and
> opens it in your Mac's browser, even on servers with SSH forwarding off.
>
> It uses your own SSH keys and config: no account, no relay, nothing
> installed on the server. Free to use.
>
> Other ways to do this, if Hostbeam isn't your thing: scp by hand, cmux,
> Paste2SSH, Remote Control. I compared them here: [comparison guide link].
>
> hostbeam.app — feedback very welcome.

### r/macapps

The rules: a real identity, a site with a privacy policy and terms, the
problem stated, competitors named, the price given, once per 30 days.

**Title:** [Free] Hostbeam — send screenshots and files to a coding agent on
your server, and open the app it builds

> **The problem:** coding agents (Claude Code, Codex) often run on a remote
> server. Your screenshot is on your Mac; the agent can't see it. And the dev
> server it starts is on the server's localhost.
>
> **What Hostbeam does:** a menu-bar app. Copy a screenshot or any file, press
> ⌘⇧7, and it's uploaded to the server over your own SSH, with its path on your
> clipboard for the agent. The menu also lists dev servers running on the
> server and opens one in your browser. There's a free iPhone app too.
>
> **Alternatives:** Paste2SSH (free, uploads clipboard images automatically),
> cmux (a terminal that uploads files dropped into SSH sessions), scp by hand.
>
> **Price:** free, no limit. After a week it occasionally asks for a $29
> one-time licence; it never blocks anything.
>
> **Privacy:** no account, no telemetry, no server of ours in the path.
>
> I'm the developer (PunkABeat). hostbeam.app

---

## Communities in the app's other languages

One post per language the app ships in, written for that community's own
"show what you made" board and read by a native speaker first. The drafts are
not in the public repository.

---

## Newsletters

### Console.dev — hello@console.dev

**Subject:** Hostbeam — screenshots to remote coding agents, and their dev servers back

> Hi Console team,
>
> Hostbeam is a Mac menu-bar app (with a free iPhone app) for people who run
> coding agents on a server. It sends a screenshot or any file over the user's
> own SSH and copies the path, which Claude Code, Codex, Gemini CLI and
> OpenCode attach as the image; and it opens the agent's dev server on the Mac,
> including on servers that refuse SSH port forwarding.
>
> It's free to use with no sign-up, uses the system's OpenSSH and
> `~/.ssh/config`, installs nothing on the server and has no telemetry. The
> MCP server is MIT: https://github.com/PunkABeat/hostbeam-mcp
>
> https://hostbeam.app/ — happy to answer anything.
>
> PunkABeat

### iOS Dev Weekly — submit through the site's form

> **Hostbeam for iPhone** — a free app that sends a screenshot from your phone
> to your own server over SSH, for when the bug only shows up on the device and
> the coding agent is on a server. Share sheet, a widget, or a Shortcuts action
> you can put on Back Tap. Pairs with the Mac app by QR; the SSH key is
> generated on the phone and never leaves it. [App Store link]

---

## The origin note — Pieter Levels

Sent first, on its own, before anything public; a direct message on X. No
ask, no link to a launch post.

> Hey Pieter, a while back you posted that you couldn't get a screenshot to
> your agent when coding from your phone [link to the post]. It bugged me too,
> so I built Hostbeam: share a screenshot on the iPhone (or double-tap the back
> of the phone) and it lands on your server over your own SSH, with the path
> ready to paste. It's free. Nothing to ask, I just thought you'd like to know
> someone scratched that itch. hostbeam.app

Termius has since added image paste on the phone; if he mentions it, agree,
and say Hostbeam works with any SSH app and any agent.

---

## Creator note

For people who make Claude Code and agent-workflow videos or posts. Personal,
one at a time, no embargo, no ask.

> Hi [name], I liked your [video/post] on [topic]. I make Hostbeam, a free Mac
> and iPhone app for exactly that setup: it sends a screenshot to the server
> your agent runs on and opens the agent's dev server on your Mac. If it's ever
> useful to you, it's at hostbeam.app, and I'm glad to send a licence key so
> the occasional reminder never shows. No strings.

---

## AlternativeTo

- **Name:** Hostbeam
- **Description:** the 60-word description.
- **Platforms:** Mac, iPhone
- **License:** Freemium (free to use; optional one-time licence)
- **Tags:** screenshot, ssh, developer-tools, ai-coding, menu-bar
- **Alternative to:** Paste2SSH, screencp, clipssh — the apps assistants name
  today ([ai-answers](../research/ai-answers/README.md)).

## SaaSHub

- **Name / URL:** Hostbeam, https://hostbeam.app/
- **Description:** the 160-word description.
- **Category:** Developer Tools
- **Competitors:** Paste2SSH, screencp, cmux, Termius (naming them speeds the
  listing up).

---

## Outreach — pages that already rank for the problem

*Not in the public repository.* This section listed five people and companies
whose blog posts already rank for "paste a screenshot into Claude Code over
SSH", with a drafted private note to each. The names and the notes stay
private; the approach was: find the pages that rank for the problem, read
what they recommend, and offer the author a one-line addition rather than a
pitch. Pages whose scp-based advice is already complete were left alone.

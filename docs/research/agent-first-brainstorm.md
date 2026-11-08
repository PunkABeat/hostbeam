# Agent-First Brainstorm — Hostbeam as the Agent's Window onto Your Devices

Date: 2026-09-26 (owner's question, a same-day research pass in three parallel
strands, and direct checks of the load-bearing claims). Claims are sourced
unless marked *unverified*; star and reaction counts are as seen that day.
Companion to [differentiation-brainstorm.md](differentiation-brainstorm.md),
whose bet 3 and "Remote agents, local senses" this develops, and to
[beyond-screenshots-brainstorm.md](beyond-screenshots-brainstorm.md).

**The question (owner, 2026-09-26):** could Hostbeam automate further — remove
more of the user's part, and become a tool used mostly by agents? **For this
exploration, no restrictions:** permissions, a cloud account and a relay are
all allowed.

**Status:** an exploration, not a decision. It deliberately steps outside
today's principles (§ 9 lists which ones); nothing here changes them.

## The short answer

Stop making the person carry things to the agent. Let the agent **use your Mac
and iPhone itself**, within rules you set once, and reach you only for
decisions. The big vendors keep their remote agents away from your machine, and
the tools that do let a remote agent in hand over the whole machine. What
nobody offers is narrow and rule-bound: *this window, this ten-second clip,
this browser console*, with a log and approvals on your phone. The local
building blocks already exist as open-source tools; what is missing is the
bridge from the agent's server to your devices — which is what Hostbeam's Mac
app already holds.

## 1. The gap

- **The vendors document it themselves.** Claude Code Desktop's iOS Simulator
  pane "is available in local sessions only. In cloud and SSH sessions, Claude
  runs on a machine that can't reach the simulators on your Mac", and "Claude
  drives simulated devices only and can't control a physical iPhone or iPad"
  ([docs](https://code.claude.com/docs/en/desktop-ios-simulator), read
  2026-09-26). Codex's desktop app does not give its Browser and `node_repl`
  tools to tasks on an SSH host
  ([#34263](https://github.com/openai/codex/issues/34263), open since
  2026-07-20, 8 comments). Claude's computer use is not available through
  Bedrock, Google Cloud or Foundry at all
  ([docs](https://code.claude.com/docs/en/computer-use)).
- **Approvals do not travel.** A computer-use permission request shows only in
  the terminal, never in Remote Control's apps
  ([#80806](https://github.com/anthropics/claude-code/issues/80806), open).
- **No way to pick the machine.** Claude in Chrome runs through a WebSocket
  bridge (`bridge.claudeusercontent.com`) and, in practice, can reach a browser
  on another machine — but it connects to
  whichever answers first
  ([#25551](https://github.com/anthropics/claude-code/issues/25551), "connects
  to wrong browser when multiple Chrome instances on LAN", 5 👍, 10 comments).
- **Who does let a remote agent in hands over everything.** OpenClaw's nodes
  (390k★) give its gateway `screen.snapshot`, `screen.record`, the camera,
  `computer.act` and `system.run`, over SSH, LAN or a tailnet
  ([macOS docs](https://docs.openclaw.ai/platforms/macos)). Cursor's My Machines
  runs the tool calls on your Mac while "agent loop, inference, and planning
  remain in the Cursor cloud"
  ([blog, 2026-09-02](https://cursor.com/blog/self-hosted-machines)). Neither
  is a narrow "this window, this console" service with a log.

## 2. Levels of automation

| Level | Who does what |
|---|---|
| Today | You capture, beam, and paste |
| 1 | You beam; the agent reacts (differentiation-brainstorm move 1) |
| 2 | The agent asks; you capture (its bet 3) |
| **3** | **The agent captures by itself, within your rules** |
| **4** | **The agent tests its own work on your devices and asks you only for decisions** |

This doc is about levels 3 and 4.

## 3. The product sketch

### Tools the agent can call

Served from your Mac or iPhone, under your rules:

- **See** — a screenshot of a named window or app; a short recording, turned
  into frames an agent can read (Claude takes still images only).
- **Browser** — console errors, network requests, page structure and
  screenshots from *your* browser: signed in, and on your company network,
  which a server cannot reach.
- **Devices** — the iOS Simulator and Android emulator on your Mac
  (screenshot, record, tap), and your real iPhone through the Mac.
- **Clipboard and files** — read or write the clipboard; pick up files from
  folders you allowed (Downloads, Desktop).
- **You** — `ask_user("Ship this?", options)` sends a push to your phone or
  watch and returns your answer to the agent; `show_user(file)` is beam back,
  done by the agent.

**Bridge, do not rebuild.** Most of these exist as local open-source servers
already: Chrome DevTools MCP (52.6k★) for the browser, mobile-mcp (7.0k★,
with a Streamable HTTP mode) and idb (5.3k★, "the client can run anywhere")
for devices, `adb` over an SSH tunnel for Android. Hostbeam's part would be the
bridge to the agent's server and the rules and log laid over it — a policy
gateway for local tools, not a new automation stack.

### Rules set once

- which apps and windows may be captured, and which never (password managers,
  banking, anything showing a secret);
- which agents may ask, and from which hosts;
- when: only while you are at the Mac, during working hours, or always;
- what gets blurred (differentiation-brainstorm bet 2's redaction);
- what always needs your OK, on the phone;
- a visible log of every request, and one switch that stops everything.

### How it connects

- **Servers you can SSH into:** a reverse SSH tunnel the Mac holds open (no
  cloud needed even here).
- **Cloud agents:** a Hostbeam relay with an account, exposing a remote MCP
  server with OAuth; the Mac and iPhone keep an outbound connection to it (§ 6).
- **Your phone's attention:** a push service. Apple's push notifications
  require a server holding the app's key; there is no way around it (§ 7).

### Examples

- **Web.** The agent on your server changes the checkout page, screenshots it
  in your real Chrome, sees the button overlapping, fixes it and checks again.
  Your phone shows "Done — before and after attached. Ship?"
- **Mobile.** The agent builds an Expo app on the server; your Mac's simulator
  loads it; the agent taps through the signup flow and reads the screens
  through Hostbeam, iterates, and sends you a recording of the final flow.
- **Bug report.** You say "login is broken on my phone"; the agent asks for a
  screenshot of the phone, and the Mac, holding the rules you set, returns one.

## 4. Who already gives agents eyes and hands (as of 2026-09-26)

| Tool | Can do | Remote agent? | Status |
|---|---|---|---|
| Claude computer use (Code, Desktop) | Screenshot, click, type; per-app tiers | Local | Research preview, Pro and Max |
| Claude in Chrome | Tabs, console, network, screenshots, your logins | In practice, through its WebSocket bridge; not documented as a feature | Paid plans |
| Codex / ChatGPT computer use | Screenshot, click, type, clipboard | Local; steerable from the phone | Desktop app |
| OpenAI Appshots | Frontmost window's image and text | Local, and only a person can trigger it | Shipped |
| Cursor cloud agents + My Machines | Screenshot, click, type, screen video | **Yes** — loop in Cursor's cloud, tools on your Mac | Shipped 2026-09-02 |
| OpenClaw nodes | Snapshot, record, camera, computer control, shell | **Yes**, by design, for its own gateway | Open source, 390k★ |
| Peekaboo | Screenshots, UI tree, click, type, clipboard | Local (remote only through OpenClaw) | MIT, 5.2k★ |
| Cua | Drives macOS apps in the background | Partly, through its computer server | MIT, 26.5k★ |
| screenpipe | Continuous screen and audio capture, OCR | Local API and MCP | 21.7k★; $25/mo app |
| Chrome DevTools MCP | Console, network, DOM, screenshots, traces | Local; can reach a forwarded debug port | Free, 52.6k★ |
| Playwright MCP (extension mode) | Your real tabs and logins | Local | Free, 37.6k★ |
| Rewind / Limitless | — | — | Capture disabled 2025-12-19 after Meta bought Limitless |
| Apple (macOS 27) | On-screen awareness for Siri (View Annotations) | Any app can annotate its views; only Siri reads them | — |

Sources: [Claude computer use](https://code.claude.com/docs/en/computer-use),
[Claude in Chrome](https://code.claude.com/docs/en/chrome),
[Codex computer use](https://learn.chatgpt.com/docs/computer-use),
[Appshots](https://learn.chatgpt.com/docs/appshots),
[Cursor My Machines](https://cursor.com/docs/cloud-agent/self-hosted/computer-use),
[OpenClaw nodes](https://github.com/openclaw/openclaw/blob/main/docs/nodes/computer-use.md),
[Peekaboo](https://github.com/openclaw/Peekaboo),
[Cua](https://github.com/trycua/cua),
[screenpipe](https://github.com/screenpipe/screenpipe),
[Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/advanced-usage.md),
[Playwright MCP](https://github.com/microsoft/playwright-mcp),
[Limitless](https://9to5mac.com/2025/12/05/rewind-limitless-meta-acquisition/),
[WWDC26](https://developer.apple.com/wwdc26/guides/apple-intelligence/).

## 5. Phones and simulators

- **A real iPhone can be driven only through a Mac.** iOS has no API for one
  app to inject touches into the phone. The routes are WebDriverAgent/Appium
  (an HTTP server on the phone; needs Xcode signing and Developer Mode), idb,
  mobile-mcp, agent-device (Callstack, 4.8k★ since 2026-01-30), and iPhone
  Mirroring automated from the Mac (mirroir-mcp) — the phone locked and near
  the Mac, one phone per Mac, and **not available in the EU**
  ([Apple](https://support.apple.com/en-us/120421)).
- **Viewing only, from the phone itself — and changing in iOS 27.** Until
  now a ReplayKit broadcast extension streamed the whole screen once the user
  started it (from Control Center or an in-app button), under a 50 MB memory
  limit, with no remote control. Apple deprecates it in iOS 27 in favour of
  **ScreenCaptureKit, new on iOS 27, with the same system picker as the Mac**:
  capture of the whole display or of the app itself, background capture, and
  a rolling clip buffer; "a broadcast extension is no longer necessary"
  ([Apple](https://developer.apple.com/documentation/screencapturekit/capturing-screen-content-on-ios)).
  Whether iOS 27 shows a permission prompt of its own is undocumented. App
  Store rule 2.5.14 still requires consent and a visible indicator.
- **The simulator and emulator are the easy wins.** `xcrun simctl io
  screenshot` and `recordVideo`, idb for taps, `adb` for Android — all
  reachable over a tunnel. serve-sim (2.8k★ since 2026-04-29) streams a
  simulator with the line "host on a remote mac and tunnel anywhere".
- **An App Store point to check:** rule 4.2.7(a) limits remote-desktop apps
  that mirror *specific* software to a user-owned computer on a local network.
  Whether it would touch an iPhone app viewing one simulator from the Mac is a
  reading, not a ruling.

Sources: [WebDriverAgent](https://github.com/appium/WebDriverAgent),
[idb](https://github.com/facebook/idb),
[mobile-mcp](https://github.com/mobile-next/mobile-mcp),
[agent-device](https://github.com/callstack/agent-device),
[mirroir-mcp](https://github.com/jfarcand/mirroir-mcp),
[serve-sim](https://github.com/EvanBacon/serve-sim),
[scrcpy tunnels](https://github.com/Genymobile/scrcpy/blob/master/doc/tunnels.md),
[App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

## 6. Cloud agents

Four of seven accept your own remote MCP server with OAuth today:

| Agent | Your own remote MCP with OAuth | Other ways in |
|---|---|---|
| Claude Code cloud sessions | **Yes** — connectors from claude.ai, or a repo's `.mcp.json` | Image upload in the session; `claude --cloud` uploads the local repo |
| Cursor cloud agents | **Yes** — HTTP or stdio, OAuth per user | Image attachments (4 MB in the web app; the API takes five at 15 MB each) |
| Devin | **Yes** | An attachments API |
| Claude Managed Agents | **Yes** — up to 20 servers; private ones through MCP tunnels | Images and documents in messages |
| Copilot cloud agent (formerly coding agent) | Remote and local servers, tools only; OAuth no (header secrets) | Images in the issue assigned to it |
| Jules | Curated partners only | Images at task creation |
| Codex cloud | **Not documented** for cloud tasks (an open bug report, #45640); ChatGPT web can use remote MCP tools that plugins supply | Image attach in the web UI |

- **Nothing consumer-grade connects a cloud agent to your own laptop.** What
  exists is enterprise tunnels (Anthropic's MCP tunnels, Pomerium, ngrok,
  Cloudflare) and hobby projects (mcp-local-tunnel, 5★).
- **End-to-end encryption has a ceiling.** A relay can be kept blind (Happy
  stores only encrypted blobs), but the cloud agent must decrypt inside its
  sandbox, and the model provider sees the image once it is in context.
  End-to-end keeps it from Hostbeam, not from the model provider.

Sources: [Claude Code MCP](https://code.claude.com/docs/en/mcp),
[Cursor cloud agents](https://cursor.com/docs/cloud-agent/capabilities),
[Devin MCP](https://docs.devin.ai/work-with-devin/mcp),
[Managed Agents MCP](https://platform.claude.com/docs/en/managed-agents/mcp-connector),
[Copilot MCP](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/mcp-and-cloud-agent),
[Jules changelog](https://jules.google/docs/changelog/),
[Codex MCP](https://learn.chatgpt.com/docs/extend/mcp),
[MCP tunnels](https://platform.claude.com/docs/en/agents-and-tools/mcp-tunnels/overview),
[Happy encryption](https://github.com/slopus/happy/blob/main/docs/encryption.md).

## 7. Getting the person's attention

- A push to an iPhone needs a server holding the app's APNs key; Live
  Activities work the same way. ntfy's docs call relay-free instant iOS push
  "impossible". Bark publishes its key so self-hosted servers can push
  directly — at the cost of the key being public.
- Already shipping: Remote Control pushes when Claude needs you (Anthropic's
  relay); Codex Remote approvals from the ChatGPT app; Happy (end-to-end
  encrypted relay, 23.9k★); Moshi (push, Live Activities and watch approvals
  over plain SSH, and annotated screenshots pasted into prompts — an overlap).
- For Hostbeam: `ask_user` is the one tool here that needs hosted
  infrastructure even for SSH-reachable servers.

## 8. Evidence of demand

- **Modest in reactions.** Most relevant issues sit in single digits. The
  strongest is Codex [#4226](https://github.com/openai/codex/issues/4226), "MCP
  server tool support in Codex Web" (70 👍, open since 2025-09-25).
- **The strongest single signal is a simulator stream.** levelsio's
  [2026-07-09](https://x.com/levelsio/status/2075328941317886210) post (2,820
  likes, 431k views): Claude Code on his server set up serve-sim to stream the
  iOS Simulator from a headless cloud Mac to his browser over an SSH tunnel,
  after only ever sending him "a page with screenshots".
- **Strong in adoption of the local tools.** mobile-mcp 7.0k★, MobileBuildMCP
  6.4k★, agent-device 4.8k★ in eight months, serve-sim 2.8k★ in five, Chrome
  DevTools MCP 52.6k★.
- **The vendors ship the local version.** Claude Code Desktop's simulator
  pane (public beta), Xcode 27's agent tools and Device Hub — which confirms
  the use, and leaves the remote case as the documented gap (§ 1).
- **People asking for the remote case directly:** remote WebDriverAgent in
  mobile-mcp ([#385](https://github.com/mobile-next/mobile-mcp/issues/385));
  an AgentCloud author: "we use Cursor Cloud a lot but cannot test our ios app
  on it"
  ([HN, 2026-08-27](https://news.ycombinator.com/item?id=49469964)).

## 9. Risks, and what it would change in Hostbeam

- **OpenClaw is the largest competitor:** free, open source, and already doing
  much of this for its own agent. Hostbeam's angle would be narrow, rule-bound
  tools for *coding* agents (Claude Code, Codex, Cursor, Devin), polished Mac
  and iPhone apps, and approvals on the phone.
- **Prompt injection.** An agent that can see your screen can be talked into
  leaking it. Anthropic reported its browser agent's attack success falling
  from 23.6% to 11.2% after mitigations
  ([blog](https://claude.com/blog/claude-for-chrome)) — still one in nine. The
  rules, the blur and the log are the product, not an extra.
- **Platform limits:** iPhone Mirroring is not in the EU; capturing the
  phone's screen needs the person's pick each time (ScreenCaptureKit on iOS 27
  replaces the broadcast extension); Apple restricts remote-desktop apps
  (§ 5).
- **Size and identity.** A much bigger product for one developer, and a
  different one: from "the tool that needed nothing" to "the gateway your
  agents use". With accounts and relays, a subscription fits, since the relay
  and push cost money to run (comparables: Moshi $9.99/mo, $7.99 as a
  promotion until 2026-10-01; screenpipe $25/mo; gotoHuman from $99/mo).
- **Principles it would step outside** — each would need its own decision:
  `docs/product.md`'s default non-goals (no cloud accounts, relay or hosted
  infrastructure *by default*, so an opt-in tier is at least conceivable);
  next.md's "Anything with a relay, an account, or hosted storage"; ADR 0020's
  read-only, "only what Hostbeam delivered" agent tools; the Screen Recording
  and Accessibility permissions the app has avoided; and the site's answer to
  "What ever leaves my machine?".

## 10. Where to start, if pursued

1. **A screenshot of a named window, approved by rule, over the SSH tunnel.**
   Mac only; the rules and the log from day one. It is
   differentiation-brainstorm's bet 3 with the person removed. Capturing a
   window without anyone picking it needs the Screen Recording permission;
   capturing one the person shared through Apple's picker does not (see
   [beyond-screenshots-brainstorm.md](beyond-screenshots-brainstorm.md)).
2. **Simulator, emulator and browser console for remote agents,** by bridging
   the existing open-source servers rather than rebuilding them. This is where
   the vendors document the gap themselves.
3. **`ask_user` to the phone,** through a small push relay — the first hosted
   piece.
4. **Cloud agents through a hosted remote MCP server** with OAuth, for the four
   that accept one.

## 11. Unverified, worth checking first

- How Claude's cloud sessions treat computer use (the research pass quoted a
  line that was not in the docs on 2026-09-26).
- Whether cloud agents pass images returned by a remote MCP tool to the model
  (documented for Claude Code generally; not for Cursor, Devin or Managed
  Agents).
- Whether App Store rule 4.2.7(a) applies to an iPhone app viewing a
  simulator on the user's Mac.
- Whether ScreenCaptureKit on iOS 27 shows a permission prompt of its own.
- Whether Apple Watch delivery of approvals works for the apps listed in § 7.

## How this was researched

Three research strands ran in parallel — tools giving agents eyes and hands on
a computer; phones and simulators as agent-driven devices; reaching cloud
agents — followed by direct checks: the Claude simulator, Desktop and
computer-use docs, every GitHub issue quoted in § 1 and § 8 (`gh`), and the
star counts. One claim from the research pass (Claude's cloud sessions and
computer use) did not match the docs and is listed as unverified rather than
used.

**Verified again the same day, with web search.** 18 of 25 checked claims held
as written. Corrected here as a result: iOS 27 retires the ReplayKit broadcast
extension for ScreenCaptureKit (§ 5); Cursor's image limit; Codex cloud's MCP
wording; Copilot's new name; Claude in Chrome's bridge; Apple's View
Annotations; and levelsio's post added to § 8.

# The four clips: shot list

Short, silent, looping recordings of the real app, for the site and the launch
posts. Written 2026-10-09, after a look at how comparable sites use video: the
indie Mac apps (CleanShot X, Shottr, Screen Studio, Paste, Tuple, and
Paste2SSH) show the real product in short muted loops beside the claim each
one proves; a film behind a button is the exception, and never the only video.
Hostbeam's page has the film and two interactive mock-ups, but no recording of
the real app, and nothing at all for the dev server.

The film is staged (apps/video/README.md says which parts). **These are not:**
the real app, a real host, a real agent, cut only to remove waiting.

| # | Clip | Length | Goes on the site | Why this order |
|---|---|---|---|---|
| 1 | The way back | ~10 s | A small section of its own, after "On the Mac" (HowItWorks): "See what it built." | Half of the launch message, and the page never mentions it |
| 2 | The Mac loop | ~10 s | The "On the Mac" section, beside its steps | The real thing behind the hero's mock-up |
| 3 | The iPhone loop | ~15 s | The iPhone section; whether it replaces the interactive phone is decided once it exists | The launch asset for the phone |
| 4 | The MCP loop | ~20 s | `/agents`, in place of its static terminal | Skip it if time is short |

## Setup, for every clip

**The host.** The repo's test host (`npm run testhost:up`), never a server
that isn't yours. It shows as `hostbeam-testhost` in the popover; for a name
that reads like a server, add an alias to `~/.ssh/config` with the same
`HostName`, `Port`, `User` and `IdentityFile` as its `hostbeam-testhost` entry:

```
Host devbox
  HostName <same as hostbeam-testhost>
  Port 2222
  User dev
  IdentityFile <same as hostbeam-testhost>
```

Then add `devbox` in Hostbeam and make it the current host. The popover shows
`dev@<address>` under it; the test host's LAN address reads as a private
server, which is fine.

**The Mac.**

- Record on a 2× (Retina) display, not the 1× external: text must stay sharp
  when the clip is scaled down.
- Focus → Do Not Disturb on, for the whole session.
- One appearance for all four clips: dark, like the film.
- A plain wallpaper, desktop icons hidden.
- The menu bar as empty as you can make it: Hostbeam's icon must be easy to
  find.
- **The browser that opens is the default browser.** Make it Safari for the
  session, with the Favorites bar hidden and no other tabs. Chrome would show
  your profile, bookmarks and extensions.
- **Terminal:** font 16–18 pt, about 100 columns, dark theme, nothing in the
  scrollback but this session.

**Recording.** ⌘⇧5 → Record Selected Portion, Options → Show Mouse Clicks on,
Save to a folder you will tell me about (for example `~/Movies/hostbeam-clips/`).
The region is **1440 × 900, at the top right of the screen**: the popover
hangs from the menu-bar icon, so the menu bar must be inside it.

**How to move.** Slowly, in straight lines, with a short pause before each
click. Nothing happens off-screen. Three takes of each; I pick the cleanest.

**Must never appear:** notifications, other hosts (don't open the host
picker), real server names or addresses, an email address, personal tabs or
bookmarks, and on the iPhone the share sheet's row of contacts (below).

**What I do with the takes:** trim the waiting, crop, no zooms or effects.
Then encode H.264 without sound, about 1600 px wide and 1–2 MB, with the index
first so it starts at once. Upload to R2 under `download.hostbeam.app/clips/`,
next to the film. Embed it muted and looping, playing only while on screen,
and still for anyone who has asked their Mac or phone for reduced motion.

## 1. The way back (~10 s)

What it proves: the app the agent is building on the server opens on your
Mac, in one click, with nothing installed on the server.

**Before recording (I can do this part):**

1. Node on the test host (one line, from test-host.md):
   `docker exec hostbeam-testhost sh -c 'apk add --no-cache nodejs npm'`
2. A small Vite app in `~dev/app` on the host, its page a believable thing an
   agent built (a sign-in page, to match the film's story), with
   `npm run dev -- --host 127.0.0.1 --port 5173`.

**Arrange (inside the 1440 × 900 region):**

- **Terminal**, on the left two-thirds, connected to `devbox`, with tmux
  running Claude Code. The agent's last line says the dev server is running
  at `http://localhost:5173`. That is either Claude Code itself starting
  `npm run dev` (truer to the story; I trim its thinking) or Vite's own ready
  line in a tmux pane (faster).
- **Safari**, behind it, filling the region below the menu bar, on an empty
  tab, so the page opens there and comes to the front.
- **Hostbeam** closed (popover hidden), `devbox` the current host, no port
  open (press Stop if one is).

**The take:**

| Time | On screen | You do |
|---|---|---|
| 0–2 s | The terminal: the agent's "dev server running at http://localhost:5173" | Nothing: let it be read |
| 2–3.5 s | The pointer goes to Hostbeam's menu-bar icon; the popover opens. **Running on devbox** lists `:5173` with **Open** | Click the icon once |
| 3.5–5 s | **Opening…**, then the row reads **open at 127.0.0.1:5173**, with **Stop** | Click Open |
| 5–9 s | Safari comes forward on `127.0.0.1:5173` with the app's page | One small, real interaction (focus the email field, or hover the button) so it reads as live, not a picture |
| 9–10 s | Hold still | Stop recording after two seconds of stillness; the loop restarts on the terminal |

**Between takes:** Stop in the popover, close the Safari tab, bring the
terminal back to the front.

**It is right when:** you can read `:5173`, Open, and the `127.0.0.1:5173`
address bar without pausing, and the page is clearly a running app.

## 2. The Mac loop (~10 s)

What it proves: a screenshot on the Mac becomes a picture the agent on the
server can see.

- **Arrange:** the terminal on the left (Claude Code on `devbox`, an empty
  prompt), and on the right, something visibly wrong to screenshot: the same
  sign-in page from clip 1 with its button overlapping the field.
- **The take:** **⌃⌘⇧4** (Control too: plain ⌘⇧4 saves a file instead of
  copying), select the broken area → **⌘⇧7** (the Beam shortcut) →
  the beam lands and the popover or HUD says so. Click into the terminal,
  ⌘V, and the path becomes **[Image #1]**. Type `the button overlaps the
  field`, press Return, and the agent's first line of reply appears. Stop on
  that line.
- **Must be readable:** `[Image #1]` and the start of the reply.

## 3. The iPhone loop (~15 s)

What it proves: the same, from the phone, while you drive the agent from an
SSH app.

- **Before:** in Settings, search for **Show When Sharing** and turn it off
  (Apple moves it between iOS versions). This removes the row of contacts
  (faces and names) from the share sheet. Do Not Disturb
  on. The phone on the same network as the Mac, so the test host is
  reachable on port 2222. An SSH app (Termius or Blink) connected to it, with
  Claude Code at an empty prompt.
- **The take** (Control Center → Screen Recording): take a screenshot of a
  broken page in Safari → tap the thumbnail → Share → **Hostbeam** → **Copied
  — paste it to your agent.** → switch to the SSH app → paste → **[Image #1]**
  → send a few words → the agent's first line of reply. Stop there.
- **Must be readable:** the Hostbeam icon in the share sheet, the copied
  message, `[Image #1]`.

## 4. The MCP loop (~20 s)

What it proves: with the MCP server on the host, there is nothing to paste.

- **Before:** the MCP server on the test host (it needs the Node from clip 1):
  `claude mcp add -s user hostbeam -- npx -y @hostbeam/mcp`.
- **The take:** beam a screenshot with **⌘⇧7** (no paste), click into the
  terminal, and type `what does the screenshot I just sent show?` → the tool
  call **hostbeam · latest_screenshot** → the agent describes it. Stop on the
  first sentence of the answer.
- **Must be readable:** the tool call line.

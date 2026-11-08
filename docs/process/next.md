# What to build next

Started as four candidates from a product review on 2026-09-07, while the App
Store submission waits on the D-U-N-S number. They are written down because the
order matters and because several needed a decision before any code was worth
writing. Items added since keep the same shape.

Each was checked against the code before being written down, and none of them
had been assessed and declined before.

**Order: 4 (done), 1 (done), 2b (done), 3 (done in part), 5 (built, parked),
6 (done, both sizes), 7 (done). Every item that was a task is finished. The two
that remain are decisions: the one item 3 leaves — screenshot bridge, or
two-way file bridge — and whether to distribute item 5.**

**Since 2026-09-26, § 10 is the plan: any file you hand over first (small;
its scope decision is made), then 10a (Ctrl+V works in remote agents), then
10b (the agent's work opens on your Mac and phone), with 10c (launch the
iPhone app free, or park it) decided now.** The first step shipped on the Mac
in 0.1.30; 10a's spike passed on 2026-09-27, and its decisions come next.

That order is not the value order — it runs cheapest-and-safest first. Item 4
was small and needed no permission, item 1 was small and invisible, item 2 was
dropped for costing the app its first system permission prompt to serve the
wrong half of its users, and item 3 changes what the product is.

---

## 4. Drag a file onto the popover to beam it — done 2026-09-08

Shipped, and wider than written: an image can be dropped on the popover,
dropped on the Dock icon, opened with Hostbeam from Finder, or passed to
`open -a`. Declaring the image types in the bundle is what buys the last
three, and it is why Hostbeam now appears in the Open With menu for images —
a side effect accepted deliberately, with the role set to viewer so Preview
stays the natural default. Images only, up to 50 MB, sent as they are.

It was first for a reason worth keeping in mind for what follows: it was the
smallest, it needed no new permission, and it is the honest first step towards
item 3 — it shows whether anyone wants to move things that are not clipboard
screenshots before anything larger is built for that. The traps it turned up
are in [handoff-log.md](../agents/handoff-log.md).

---

## 1. Cap the uploaded image's size — done 2026-09-08

Shipped: 2048px on the longest edge by default, set (or turned off) in
Preferences → General, honoured by the clipboard path only — a dropped file is
still sent as it is, which is what 0.1.17 promised.

**It was measured, and the premise turned out to be understated.** On a real
5120×2813 clipboard capture, in a release build:

| | local work | file |
|---|---|---|
| cap 2048 | 816ms (611 scale + 205 encode) | 510 KB |
| off | 946ms (encode) | 2125 KB |

Capping is *faster* than not capping — encoding four times fewer pixels more
than pays for the resize — and sends 76% fewer bytes. There was no speed/size
trade-off to make.

The filter was the one real decision. Lanczos3 was the obvious pick, since text
is the payload and a soft filter would cost the user the thing they were
showing. Measured, the three candidates were indistinguishable on legibility at
this scale, and the sharper filters lost on both things that are not
subjective: they were slower, and they produced *larger* files, because the
high-frequency detail they preserve is exactly what PNG cannot compress.
Lanczos3 made a 29% bigger file than Triangle for no visible gain. Triangle
won, which also leaves the codebase with one resize filter instead of two.

The original entry follows, for the reasoning that led here.

### As written on 2026-09-07

Scale the screenshot down before upload, to a maximum long edge, on by
default and adjustable.

**Why.** The app scales images for its own thumbnails but uploads the
screenshot at full resolution. A screenshot from a 5K display is several
megabytes of pixels that the receiving agent never sees: vision models
downsample on arrival, and Claude's documented limit is about 1568 pixels on
the long edge. Those extra pixels cost upload time, disk on the host, and
tokens, and buy nothing. This is the best value for effort of the four.

**What exists.** `beam.rs` already calls a scaling helper for the card
thumbnail and the preview (`scaled_png_data_url`, with `THUMB_MAX` and
`PREVIEW_MAX`); the upload path calls `encode_png_file` at full size. The
change is which numbers the upload path uses, plus a setting.

**The catch.** Screenshots of text are the case where downscaling can lose
something the agent needed to read. The default should be generous enough that
a full-screen capture of an editor stays legible, and the setting should be
easy to turn off for someone who hits that.

---

## 2. Capture and beam in one gesture — ruled out 2026-09-08

*A second hotkey that runs an interactive region capture and beams the result.*

**Not building this.** The permission was never the strongest argument against
it; the audience was. It is recorded here in full so it does not get
re-proposed.

The feature only pays off if you use *Hostbeam's* capture — which would be the
stock macOS region selector. But this product is bought by people who already
own CleanShot X, Shottr or Xnapper and have rebound the screenshot shortcuts to
them on purpose. For that user the new hotkey is not a shortcut, it is a
downgrade with a shortcut attached: it offers the plain system selector instead
of the annotation and scrolling capture they chose, fights their existing tool
for hotkey space, and removes no keystroke at all — CleanShot already copies to
the clipboard, so their flow is one capture plus ⌘⇧7 either way. It cannot
remove that second press unless they abandon CleanShot.

So it would have spent the scariest permission on macOS to help only users of
the stock tool, while being useless-to-negative for the segment most likely to
pay for a Mac utility.

It also contradicts what the product already says. `HowItWorks.tsx`: *"Cmd-Shift-4,
a snip from any tool. Anything that lands a PNG on your clipboard works."*
Hostbeam is deliberately indifferent to where the pixels came from. Item 2
inverted that.

**The permission costs, for the record**, since they are real and would apply to
anything else that reaches for screen capture: the dialog is macOS's most
alarming and cannot be softened or explained inline; the grant is app-level and
permanent rather than per-use; it has historically needed an app restart to take
effect; macOS 15 re-prompts periodically; it puts the app in a category MDM
fleets audit, which matters for people who SSH into prod from work machines; and
"the permission isn't granted" is the single largest support category in this
niche. Against all that, the honest counterweight is that this buyer has almost
certainly already granted it to CleanShot — the cost is not that they refuse, it
is that Hostbeam stops being the tool that needed nothing.

**A spike was proposed and dropped.** It would have settled whether shelling out
to `screencapture -i` (where the *system* draws the selection UI) triggers the
prompt at all, or whether only programmatic capture does — genuinely unknown,
and worth knowing if screen capture is ever revisited. It was dropped because it
only prices a feature that should not be built.

---

## 2b. Beam whatever screenshot you just took, whoever took it — done 2026-09-08

Shipped as **session mode**, the shape this entry leaned towards: a switch in
the popover, an expiry the user sets in Preferences → General (15 min / 1 hour /
4 hours / until off, default an hour), and a badged menu-bar icon so a mode that
uploads on its own is never running unseen. The armed state is deliberately not
persisted — a launch can never resume sending.

**The privacy story turned out better than the entry assumed.** It does not
watch your clipboard. It polls `NSPasteboard`'s `changeCount`, an integer that
moves when *anything* is copied; only when it moves does it ask which *types*
are available, still metadata; and the pixels are read exactly once, by the
existing beam path, after the decision to send is already made. That ordering is
why it needs no permission and raises no prompt — verified, not assumed.

**Two things worth remembering.** The beam reuses `window.hbBeam()`, the same
call the shortcut makes, so auto-beam inherits the free-tier gate, the HUD, the
Recent entry, the pasted sentence and the error taxonomy, and cannot drift from
a manual beam. And the one piece of hand-written objc bit: building the type
array inline as the argument (`availableTypeFromArray: { ... }`) compiles and
then answers `true` for a plain-text clipboard — every copy of anything would
have woken the beam path. `msg_send!` does not parse a block argument the way it
reads. It is spelled out in separate bindings now, with a comment, and was
caught by dumping the real pasteboard rather than trusting the call.

**A shortcut for the switch followed the same day.** Arming is more frequent
than it looks — the window expires, so a long session re-arms several times, and
each one cost three actions through the popover. It is a third global shortcut,
off until recorded, matching the show/hide one's precedent: a menu-bar utility
claiming three combos by default on a machine that also runs CleanShot and
Raycast would be greedy. The fiddly part was not registration but conflict
reporting — with three shortcuts the UI has to name *which* two collide, because
Rust refuses a duplicate registration and drops the loser silently.

A dedicated "armed" HUD was considered and dropped. The feedback is already
there: the menu-bar badge flips immediately, and the first screenshot after an
accidental arm shows the same HUD a manual beam does, because it *is* the manual
beam's code path. Bolting a non-beam state onto a component called `BeamHud`,
which always renders a screenshot thumbnail, would have bought nothing.

The original entry follows.

### As written on 2026-09-08

Watch the clipboard, and beam a screenshot as it arrives — instead of making the
user press a second shortcut to say "that one".

**Why this and not item 2.** It reaches the same one-gesture outcome without a
permission, without a competing hotkey, and — the point — for *every* capture
tool rather than only the stock one. CleanShot, Shottr, Xnapper, `⌃⌘⇧4`, a snip
pasted out of Preview: they all end the same way, with an image on the
clipboard, which is the surface Hostbeam already reads. It extends the promise
the site already makes instead of narrowing it.

| | item 2 (capture) | 2b (watch) |
|---|---|---|
| Screen Recording permission | required | none |
| Works with CleanShot / Shottr / Xnapper | no | yes |
| Works with stock ⌃⌘⇧4 | yes | yes |
| Competes for hotkeys | yes | no |
| Consistent with "a snip from any tool" | no | yes |

**The decision it needs, and it is a real one.** Beaming automatically means
images leave the machine without an explicit act, from an app whose whole
character is that it does nothing until you press a key. The question is not
whether to watch the clipboard — it is what watching is allowed to trigger.
Five shapes, roughly worst to best:

- **Always on.** Any image you copy goes to your default host. Unacceptable:
  it would beam screenshots taken for Slack, a bug report, a password manager
  window, a customer's data — and burn the free tier silently doing it.
- **Armed.** A hotkey arms the next capture. Buys nothing: still two presses,
  just reordered.
- **Beam, then offer undo.** One gesture, but the bytes have already left. You
  cannot un-send, and for this product's positioning that is the wrong trade.
- **Offer, then send.** A new screenshot raises a HUD — "Beam to prod-box? ⏎" —
  that expires in a few seconds if ignored. Nothing sends unintentionally, and
  the second action is one key where you are already looking rather than one you
  have to remember.
- **Session mode.** A toggle — "beam screenshots automatically" — that you turn
  on for a debugging session with an agent and that expires on its own. This
  fits the actual usage: agent sessions are bursty, five screenshots in ten
  minutes and then nothing for hours. During that burst auto-beaming is exactly
  right; outside it, it is exactly wrong.

**Leaning: session mode, with the offer-then-send HUD as its fallback when the
session is off.** It needs the mode to be impossible to forget — a visible
menu-bar state (the icon already animates during a beam) and an automatic
expiry.

**Open questions, all cheap to answer once the shape is picked:**

- What ends a session — a timeout, quitting, switching host, or only the toggle?
- What counts as "a new screenshot"? `NSPasteboard.changeCount` plus an image
  type is the mechanism, but that also fires for an image copied out of a
  browser. In a session that is probably correct — it is your intent — but it
  means the feature is really "beam what I copy", and should say so.
- Duplicate suppression: some apps write the pasteboard several times per copy.
- The free tier has to fail *visibly* here. Silently eating 5 beams a day is a
  much worse failure when the user did not press anything.
- **Verify before building:** whether continuously polling `NSPasteboard` is
  still unrestricted on current macOS. On-demand reads are fine — the app does
  them today with no prompt — but Apple has been tightening pasteboard privacy,
  and a poll is a different thing from a read on a keypress. This is the one
  technical unknown, and it is the same class of question the item 2 spike was
  going to answer.

**What exists.** The clipboard read, the image path, the HUD (`hud.tsx`, driven
from Rust so it works while the popover is suspended), the menu-bar animation,
and the free-tier gate. Polling `changeCount` is an integer compare; there is no
new subsystem here, only the product decision.

---

## 3. Close the loop back from the host — done 2026-09-08 (in part)

Shipped as **pull, images only, off by default** — the narrow half of this
entry, chosen so the product question underneath it stays open.

What it does: with the setting on, the popover gets a Check button that fetches
images the agent wrote into that host's beam folder. `! -name 'hostbeam-*'` is
what makes it "what the agent left" rather than "everything here" — a check
never re-downloads the screenshots you just sent. `-maxdepth 1` and `-type f`
match the storage and cleanup scripts: never recursive, never a directory.

**What was left undone, deliberately.** No watch — it fetches when asked and
never talks to a host on its own, so the app still acts only when a key is
pressed. And images only, so the two-way *file* bridge is still unbuilt. The
question this entry ends on — is Hostbeam a screenshot bridge or a two-way file
bridge for agent sessions — is therefore still open, and now has evidence
attached to it: if people start asking why the PDF did not come back, that is
the signal to decide. The market answered first. **Files going in are
decided** (2026-09-26, ADR 0006's amendment: any file the user hands over; § 10
makes it the first step). **The way back is still open** — the thinner of the
two on evidence;
[differentiation-brainstorm.md](../research/differentiation-brainstorm.md)
§ 5, bet 1 lists three cheap checks to run first, starting with this entry's
Check button.

**Where the care went.** Every filename here is printed by a remote machine and
then interpolated into a shell command and joined onto a local path, so it is
untrusted input even though the host is the user's own. `safe_name` rejects
separators and `..`, a leading `-` (scp would read it as an option), quote and
`$` characters, control characters and whitespace, and anything that is not one
of the image extensions. A listing line must also name a path *directly inside*
the folder that was asked about: reducing a path to its base name and trusting
that was not exploitable — only the base name is ever used — but it meant
silently trying to fetch a file that was never in the folder. A test caught it.

`open_pulled` takes a path but will only open one inside the pull directory,
with both sides canonicalised first. That follows `open_url`, which is
https-only for the same reason: the webview must not be able to ask the app to
launch an arbitrary file.

Verified end to end against the SSH test host: two agent files came back with
previews, newest first, while Hostbeam's own upload, a `.txt`, and a nested
`sub/` were all correctly left behind.

The original entry follows.

### As written on 2026-09-07

Bring files the agent produced on the host back to the Mac.

**Why.** Hostbeam is one-way. Agents produce images too: a browser test
screenshots the page it rendered, a script writes a chart, the agent fixes the
bug you reported and screenshots the result. Seeing any of that means leaving
your flow for a terminal and an `scp`, which is the same interruption this
product exists to remove, pointed the other way.

**What it would look like.** The agent writes into the folder Hostbeam already
uses for that host. Hostbeam shows what is new, with a thumbnail, beside your
recent beams. Clicking opens it locally, or puts it on the clipboard to paste
into an issue.

**Two sizes.** *Pull* is a button: fetch anything new, when you ask. No
background activity, no battery cost, no change to the app's quiet character.
*Watch* polls the host and tells you when something appears. Better in use,
but it turns an app that acts only when you press a key into one that talks to
your servers on its own schedule, and that needs answers about frequency,
failure noise, and sleeping laptops. Start with pull; it would show whether
anyone wants the watch.

**What exists.** All of the plumbing. Hosts, a per-host remote folder, SSH and
file transfer, and a list UI to copy. It is the same machinery pointed the
other way.

**The decision it needs, and why it is last.** Whatever the agent writes could
be any file. [product.md](../product.md) defers arbitrary file transfer until
the screenshot workflow proves itself, and this is that, in a limited form. So
the real question is not technical: is Hostbeam a screenshot bridge, or a
two-way file bridge for agent sessions? That is a product decision, and it
should be made deliberately rather than arrived at through a feature.

---

## 5. Agent-side tools — MCP server published 2026-09-14, hook parked

`apps/agent/` holds an MCP server and a prompt hook that let the agent see a
beamed screenshot without the user pasting the path. Scope in
[ADR 0020](../adr/0020-agent-side-tools.md): only `hostbeam-*` images, one
directory, read-only. Distribution in
[ADR 0021](../adr/0021-publish-the-mcp-server.md).

**The MCP server is published** (since 2026-09-14). npm as `@hostbeam/mcp`, a
public mirror at `github.com/PunkABeat/hostbeam-mcp`, and the official MCP
registry as `app.hostbeam/mcp`, all through `scripts/mcp-release.sh`; each was
checked from outside afterwards, including an `npx` install into an empty
folder, and Claude Code on linux-box, set up with the README's own install
line, read a real beam through it. It was used in a real
session first (linux-box, 2026-09-13), which is where § 7's fixes came from.
Listing it in directories waits for launch day ([launch-day.md](launch-day.md)),
in this order, because each needs the one before:

- **Glama.** Web form with the GitHub URL; it scores the repo within minutes.
- **awesome-mcp-servers.** A README PR, which its CI rejects without the Glama
  score badge.
- **mcp.so.** Web form, free review.
- Not planned: Smithery and Claude's directory, which take local servers only
  as MCPB bundles.

**Codex needed two changes, released as 0.1.1** (tested 2026-09-14, Codex
0.154 on linux-box, approvals set to never). Codex asks before running any
MCP tool not annotated `readOnlyHint`, and with approvals off it refuses the
call outright, so every tool now carries the annotation. And asked about "the
screenshot I just sent", GPT-5.5 looked for a chat attachment and called
nothing, so `initialize` now returns `instructions` saying screenshots arrive as
files; Codex shows them to the model as the description of the server's tools.
With both, it called `latest_screenshot` unprompted and read the image. One
edge remains: Codex lists tools about two seconds after it opens and `npx`
takes about four, so a message sent in those first seconds goes out without
the tool.

**0.1.2 hardens it** (2026-09-14), after an audit against the MCP spec and the
clients' own source. It skips symlinks and refuses a beam folder that another
user owns or any user can write to, since `/tmp/hostbeam` belongs to whoever
creates it first. Names outside the characters the apps write are not served,
because a name reaches the model as text. Bad arguments are tool errors and an
unknown tool is a protocol error, as 2025-11-25 requires, and a line that is not
JSON gets a parse error. Images are capped at 3.75 MB each and 7.5 MB a reply
(5 MB of base64 per image on Bedrock; 20 MB a request on Gemini, 32 MB on
Claude). Anything over 8000 px is named instead of embedded, and so is anything
over 2000 px once the session has sent 20 images, since Claude then refuses the
whole request; the Mac's default and the iPhone moved to 2000 px for the same
reason. A reply is flushed before the process exits, which had cut large images
off at 8,190 characters.

Left out on purpose: `structuredContent`, which makes Codex replace the image
blocks with the JSON.

**0.1.3 speaks 2026-07-28 as well** (2026-09-15). That revision has no
`initialize`: each request carries its version in `_meta`, and a client learns
about the server from `server/discover`. The server decides per request — an
`io.modelcontextprotocol/` key in `_meta` means the new era, anything else the
old one — because the TypeScript client can open with an enveloped `tools/list`
and the Python client sends an empty `_meta` on old-era requests. Checked with
real clients, not just the spec: the TypeScript SDK 2.0.0 (pin, auto, legacy),
the Python SDK 2.2.0 (pin, auto) and the Inspector CLI 2.6.0 all reach the new
era, and the old handshake still negotiates 2025-11-25. A cancelled request gets
no reply in either era.

**The beam folder has to belong to the login** (2026-09-15, both apps). On a
shared host whoever creates `/tmp/hostbeam` first owns it, and `mkdir -p` used
to accept it silently. The Mac now runs `mkdir -p -m 700 … && test -O …`, and a
failure with nothing on stderr is the ownership test, since `mkdir` always
explains itself; it gets its own error card ("owner"). Pull checks the same
before fetching. The iPhone compares the folder's owner with the home folder's
over SFTP, which has no "who am I", and creates the folder `700`. Verified on
the test host: owned folder passes, `/tmp` (root's) fails silently, an
unwritable path still reads as "perm". Doing this turned up that the Mac's
"Remote folder writable" diagnostic had never worked: it passed `sh`, `-c` and
the script as separate words, so the host ran `sh -c mkdir` with no operand.

**The hook stays unshipped.** Two things first:

- **Verify its wiring.** The event name and payload are the part most likely to
  have moved; the script assumes only "run as a command, stdout becomes
  context", but the Claude Code snippet in the README is written from memory and
  has not been run against a live agent.
- **Take the server's launch-check fix.** It still decides it was run directly
  by comparing file names, so started through a symlink it exits silently. The
  server compares real paths since 2026-09-13.

---

## 6. Beam more than one screenshot at a time — done 2026-09-09

Shipped on both platforms: every file the gesture carried is beamed, and the
whole thing counts as **one** beam. `paths[0]` in the popover drop,
`urls.iter().find_map` in the macOS open handler, and
`inputItems.first`/`attachments.first` in the iOS share extension all took one
file and dropped the rest in silence; none of them do now.

What the shape bought: `check_beam_allowed` and `record_beam` did not change at
all — gate once before, count once after — which is what one-gesture-one-beam
promised. The sentence repeats the template per path, one per line. More than
25 files is refused whole (`MAX_BATCH` / `Beamer.maxBatch`) rather than trimmed,
because quietly sending the first 25 would be the same silent loss.

Two bugs the work turned up, both caught by writing the test first:

- On iOS the write offset accumulated **across** files, so every file after the
  first would have been written at the end of the previous one and corrupted.
  Each file writes from its own zero; the running total is only for `bytesSent`.
- iOS names are second-granular, so a batch collides with itself. Each file now
  resumes probing after the last one's name instead of restarting at attempt 0,
  which also stops a batch exhausting the ten-attempt budget.

### The full size — done 2026-09-09

**Partial-failure recovery.** A batch that stopped at file three left two files
on the host, told the user it had failed, and put nothing on the clipboard. The
files were real and nothing in the app admitted they existed.

A partial is now its own outcome rather than a shade of the other two, on both
platforms: `BeamResult.failed` / `BeamOutcome.unsent` name what did *not* go,
`paths` name what did, the clipboard gets the paths that really landed, and
Recent gets a row each. Nothing landing is still an ordinary failure with the
taxonomy the UI already had — a partial only exists once a file is on the host.

Three decisions inside that, each of which could have gone the other way:

- **Stop, do not try the rest.** What stops a transfer mid-batch is the link or
  the host, not that one file, and twenty-four more attempts each waiting out a
  timeout would hold the app for minutes to fail anyway. Retrying the rest is a
  button, not a loop.
- **A partial spends the beam, and its retry does not.** Files are on the host
  and their paths are on the clipboard, so the gesture was real and is counted.
  Sending the rest is that same gesture continuing — see the retry token below,
  which was missing when this was first written.
- **The Mac offers "beam the other 3", iOS does not.** A share extension is
  dismissed the moment it finishes, so an offer it cannot keep is worse than
  saying plainly what is still on the phone.

**A mid-batch failure is always remote, by construction.** Every local file is
validated before any is sent, so a bad one refuses the whole batch up front —
and macOS goes further: `open -a` with an unreadable file in the set returns
`-5000` and hands the app nothing. That is *why* the recovery is shaped the way
it is, and it is how the thing was finally tested: revoking write permission on
the host's beam folder after two files land. "Beam stopped after 2 of 5 …
Permission denied", three runs, same result each time, with two Recent rows and
two paths on the clipboard.

**HUD and popover progress.** Rust relays one call per landed file, through the
same `window.eval` relay everything else here uses rather than Tauri's event
system — one mechanism in this app, and it already works with a webview that is
suspended while hidden. Both surfaces show "3 of 5" and, more usefully, their
progress bars stop pretending: the indeterminate sweep becomes a bar that fills
to the count, and on a partial it stops where the beam stopped. Silent below two
files, because "1 of 1" tells nobody anything and every clipboard beam is one
file.

**Recent grouping.** Ten files from one drop filled all three rows the popover
shows and pushed the nine beams before it out of a list whose whole job is the
last few. Rows now carry the gesture that made them and the popover folds them:
one row, the first thumbnail with a count on it, and a copy that takes every
path. Folding hid four of the five pictures, so the lightbox grew arrows, a
counter and left/right keys — that row is now the only way to reach them, and
it has to be one. Clamped rather than wrapping, so the counter never jumps 5→1
under you; a drop where only some rows kept a thumbnail still opens the ones
that did. Preferences still lists them one by one — that is where you go to find one
particular file. Grouping is by *adjacency*, not by lookup, so it can never
merge two separate drops that collide on an id; rows written before this carry
no gesture and each stand alone, so an existing list renders exactly as it did.

**Found on the way:** "Try again" on a failed beam called `upload()` with no
files, so after a failed *drop* it quietly retried the **clipboard** — a
different beam wearing the same button.

**A review pass caught the licence gate lying.** The bullet above said charging
twice for one drop "would be the opposite of what one-gesture-one-beam
promised" — as if something prevented it. Nothing did: "beam the other 3" was a
plain `beam_files` call, so it hit `check_beam_allowed` on the way in and
`record_beam` on the way out like any other gesture. Measured, not inferred: two
single-file beams moved the counter 16 → 18.

Two consequences, the second worse than the first. A free user whose link
blipped paid **two of their five** for one drop. And if they were on their last
beam, the retry was *refused by the limit card* — three files stranded until
midnight, with the button right there offering to send them.

Fixed with a **retry token**, not a "don't charge me" flag. A partial issues
one; it names the exact files that did not go, it is good once, and it does not
outlive the process. `beam_files` claims it before any work, so a second press
cannot claim it twice, and hands it back intact if the beam delivered nothing —
the token should be spent by a transfer that happened, not one that was
attempted. A retry that itself stops part-way issues a fresh token for its own
remainder, so a flaky link still costs exactly one beam. Claim and restore live
at the command edge, the single place every failure path returns through,
because a restore per early return is how you miss one.

Verified end to end on 2026-09-09: a real partial (2 of 5, write permission
revoked on the host mid-batch) moved the counter 19 → 20, and pressing "beam
the other 3" left it at 20.

**And found by using it:** the partial card was built inside the `done` phase,
which auto-dismisses after 2.5s. A confirmation is something you glance at, so
fading is right; a partial asks you to decide about the rest, and taking its
button away mid-read is worse than never offering one. It now waits, like the
failure card, until the next beam replaces it. The HUD still lets go after
4.5s — it is a glance, and clicking it opens the popover, where the decision
lives. It now retries what was actually beamed.

**Testing § 6 found a much worse bug than § 6 had.** Beaming batches of noisy
test images filled Recent with 840KB PNG thumbnails; the config reached 9MB;
`config-bridge` mirrored it into `localStorage`, whose quota is about 5MB; the
bare `setItem` threw `QuotaExceededError`; `setupConfigBridge` rejected; and
both `boot()` functions `await` it with no `catch`, so `createRoot().render()`
never ran. **Preferences opened as a blank window** — and the popover only
survived because it had booted hours earlier, when the config was small. A
restart would have taken that too.

Three layers, all now fixed, because any one of them alone would leave the
trap armed:

- *The cache is a cache.* `localStorage` mirrors the durable Rust store, so
  failing to write it must cost a slow startup, never a window. It now catches,
  and on a quota failure retries without thumbnails rather than giving up —
  a stale copy is worse and much harder to notice than a thumbnail-less one.
- *A window must always render.* Both `boot()`s now render even when the bridge
  fails. A blank window is unrecoverable: you cannot reach the controls that
  would clear whatever broke it.
- *Thumbnails are bounded.* `trimThumbs` keeps the newest under a 2MB budget and
  drops only pictures, never rows — a row without one still names its file, its
  host and its time. Applied where the list grows, so an oversized config heals
  itself on the next beam.

**And the encoding was a guess worth measuring.** The obvious fix was "store
JPEG like iOS does". Measured, PNG *wins by 4x* on what a screenshot actually
is — flat panels, hard edges — and loses by 3x on photographic noise. Neither
is right, so `preview_data_url` encodes both and keeps the smaller; at 480px
that costs nothing and removes the guess.

**Verified by hand on 2026-09-09**, all of it: grouping and the lightbox
arrows, the partial card and its "beam the rest", live progress, the HUD's
partial state, the retry fix, and the same partial on an iPhone 13. The two
surfaces that had only been verified as data — the HUD and the partial card —
were the ones that turned up the last defect, which is the argument for looking
at a thing rather than at what it writes.

Worth knowing for next time: the HUD is a non-activating panel, and no
screen-capture tooling on this machine will enumerate it. Four attempts failed.
Anything that only shows up there has to be checked by a person.

**Verified on a device** (iPhone 13, 2026-09-08): three photos shared from the
Photos share sheet and three picked in the app both landed as three distinct,
byte-valid PNGs — checked by pulling them back and walking every chunk CRC,
which is what would have caught the offset bug in the wild. One beam spent per
gesture, and the collision suffixes (`-2`, `-3`) confirm the batch does not
overwrite itself.

**The device is what found the real bug.** `HostbeamShare` declared
`NSExtensionActivationSupportsImageWithMaxCount: 1`, which is how iOS decides
whether to *offer* an extension: selecting two photos removed Hostbeam from the
share sheet, so none of the multi-file handling could ever run. Everything
compiled, the engine tests passed, and the feature was unreachable. Raised to 25
in `project.yml` for both the share and action extensions.

**Recent showed one picture for three beams**, on both platforms, and it took
using it to see. The Mac made three rows but only the first carried a
thumbnail — `BeamResult` returned a single `preview`, so rows two and three
fell back to the grey placeholder. iOS was worse: one row per *gesture*, whose
caption was the three-line sentence with `lastPathComponent` taken off the end
of it. Both now record one row per file, each with its own thumbnail and its
own copyable path, which is the whole point of a list you use to find a
screenshot again. `BeamOutcome` gained `sentences` (one per path, index-aligned
with `remotePaths`) so nothing has to split the joined text back apart and hope
the split lines up; `sentence` is now that array joined, so there is one rule
for it rather than two that can drift. Every row having a thumbnail is not new
cost — one file per beam already meant one thumbnail per row.

The in-app `PhotosPicker` followed the same day — `maxSelectionCount:
Beamer.maxBatch`, images loaded one at a time rather than all at once, because
the picker will hand over 25 and holding 25 full-size images is how an app gets
killed for memory even outside an extension. "Beam last screenshot" stays
single: it means the latest.

The original entry follows.

### As written on 2026-09-08

Take every image the user handed over, instead of the first one.

**Why this is a bug before it is a feature.** All three multi-file entry points
already *receive* the extras and silently drop them:

| Path | Code | What happens |
| --- | --- | --- |
| Drop on the popover | `p.paths?.[0]` (`PopoverApp.tsx`) | five dropped → one beamed, four vanish |
| Dock icon / Finder Open With / `open -a` | `urls.iter().find_map(…)` (`lib.rs`) | same |
| iOS share sheet | `inputItems.first` → `attachments?.first` (`ShareViewController.swift`) | select three photos → one beamed |

Nothing tells the user. Selecting three screenshots in Photos and sharing them
is an ordinary thing to do, and two of them disappear without a word. That is
the case for doing this regardless of how much of the rest gets built.

It is also a good fit for the product: "here are three shots of the broken
flow" is a normal thing to say to an agent, and agents handle several images
well.

**What exists, and it is more than expected.**

- `send()` is already per-file and both entry points funnel through it, so a
  batch is a loop rather than a rewrite.
- Transfer cost is a non-issue: scp measured ~160–180ms per ~400KB file during
  the pull work, so ten files is under two seconds. One scp with many sources
  would be faster and is not needed.
- The image cap applies per file already.
- **iOS memory is not the risk it looks like.** `copyOut` uses
  `loadFileRepresentation` and copies file-to-file — no pixels held in memory —
  so batching there means looping, not accumulating. The extension's *time*
  budget is the thing to watch, not its memory.

**The pricing question is decided: one gesture is one beam, however many files
it carries.** (First settled the other way, then reversed on 2026-09-08 — the
reasoning is worth keeping because it is the same reasoning any future change
to the free tier has to answer.)

Three arguments, and they point the same way:

- **The product already defines the word.**
  [01_product_and_voice.md](../design/hostbeam-handoff/01_product_and_voice.md):
  *"Beam (v.) replaces upload/send/transfer everywhere the user can see. The
  noun for a past upload is 'a beam.'"* A beam is the act. Five files in one act
  is one beam, and the site advertises "5 beams a day". Counting files would
  make the word mean one thing in the pricing and another everywhere else.
- **The limit is not metering a resource.** The file goes to the user's own
  host: no bandwidth, no storage, no compute on our side. The cap exists to
  create a reason to buy, and a nag that punishes someone for a natural action
  — "here are three shots of the broken flow" — produces resentment rather than
  a sale. Same money either way; only the feeling differs.
- **It is less architecture, not more.** Gate once at the start, record once at
  the end. `check_beam_allowed` and `record_beam` do not change at all.

The counter-argument is that batching becomes a loophole. It is weak: a free
user still gets five *gestures* a day, and interactive use is one screenshot at
a time, so the limit still bites where it is meant to. If it ever matters the
answer is a **cap on files per batch** (ten or so), not accounting — and that
cap is wanted anyway, for transfer time, the iOS extension's time budget, and
not flooding Recent.

**Watch separately:** auto-beam changed this arithmetic. A free user in a
ten-minute session can now spend five beams without deciding to, so 5/day may
already be tighter than when it was set. Counting batches per file would have
made it worse. Not a reason to change anything today.

**Two sizes.** *Narrow* is: take all the paths, beam them under the single
existing gate, and repeat the sentence template per file (newline-joined) — no
new setting, works with a custom template, unambiguous for an agent. That
removes the data loss and is a fraction of the work.

*Full* adds the things the narrow version leaves rough: partial-failure state
("three of five beamed", retry the rest, and what the clipboard gets), HUD
progress ("beaming 3 of 5" — it shows one host and one file today), and Recent
grouping, since ten drops flood a list that shows three. The error taxonomy is
single-beam today (`timeout`, `auth`, `perm`) and would need a batch shape.

Do the narrow one first and decide the rest with it shipped — the same
sequencing that worked for the file drop in item 4.

---

## 7. Carry the original file name into the remote one — done 2026-09-09

Grew straight out of item 6. Beaming three files gave three Recent rows, and the
rows read `hostbeam-1788875278869-1.png`, `-2`, `-3` — a stamp and an index say
nothing about which screenshot is which, so the thumbnail was doing all the
identifying on its own.

Two ways to fix it, and the second is better:

1. **Remember the original name locally**, on the Recent row only. Cheap, no
   contract change — and it stops at the app's own window. The host still holds
   three files nothing can tell apart, and the pasted line still names them by
   number.
2. **Put the original name in the remote file**, `hostbeam-<stamp>-shot-2.png`.
   It identifies everywhere at once: Recent, the pasted sentence, `ls` on the
   host, and the agent tools' listing. One change, every surface.

Checked before touching it, because the name is a contract: nothing parses it,
the agent tools gate on the `hostbeam-` prefix plus an image extension
(ADR 0020), Storage and Clean up glob `hostbeam-*.png`, and pull *excludes*
`hostbeam-*`. All four survive a longer middle.

**No longer true that nothing parses it** (2026-09-13). The agent tools read the
stamp directly after the prefix to group a beam's files, and only take 13 or more
digits as a time. The iPhone moved from `yyyy-MM-dd-HHmmss` to the same
millisecond stamp that day, so there is one scheme to read; before, its files
sorted after every Mac file and never grouped. Keep the stamp first and in
milliseconds — `beam.rs` and `BeamerTests.swift` each carry a test that fails if
it moves.

**The sanitiser is the whole risk, so that is where the tests are.** The name
comes off someone's disk and ends up inside a shell command on their host:
anything outside `[A-Za-z0-9._-]` becomes `-`, runs collapse, edges are trimmed,
48 characters max. When nothing usable survives — a name that is all emoji — it
falls back to the plain timestamped form rather than inventing something, on
the grounds that a wrong name is worse than no name. A clipboard beam has no
original name and is unchanged.

**One stamp per gesture, and collisions are checked rather than assumed.** Two
dropped files can genuinely be called the same thing, and files with no usable
name all compose the same candidate, so `remote_name` suffixes until it is free.
Sharing a stamp is what makes a batch sort together; skipping the check would
have reintroduced the silent overwrite item 6 existed to remove.

**Six awkward names beamed at a real host found the one bug the unit tests
missed.** `wéird ñame; rm -rf ~.png` landed as `…-we-ird-n-ame-rm--rf.png`: a
dash the name already had was *kept*, so it doubled up against the one the
space in front of it produced. Harmless, but the doc comment claimed runs
collapse, so the code was wrong rather than the comment. `-` now goes through
the separator branch instead of the keep branch. The test that was supposed to
cover this used a string with no dashes in it — which is the sort of thing only
a real name shows you. (macOS also hands over decomposed unicode, so `é` is `e`
plus a combining mark and slugs as `e-`. Fine, and worth knowing.)

**The rename would have bought nothing without touching the UI.** The popover
row is 360px and ellipsises from the right, so a longer name showed *more*
stamp and less name. The row now shows the part that came from the file and
keeps the whole thing in its tooltip — the stamp said what the row's relative
time already says. Preferences has the width for both, so it dims the prefix and
lets it give up its space first.

**Left undone, deliberately:** iOS keeps its own names. Share providers
sometimes carry a `suggestedName` and `PhotosPicker` items usually do not
without broader Photos access, so it would be partial and permission-adjacent
for little gain.

**Two things checking the gates turned up, both since fixed.**

*Storage and Clean up matched `hostbeam-*.png` only*, but a dropped JPEG or
HEIC is beamed with its own extension — so those files were sent, then invisible
to the Storage view and untouchable by Clean up. Wrong since drops landed
(item 4), and demonstrable: `hostbeam-1788790553614.jpeg` was sitting on the
test host, uncounted. Both scripts now build from one `artifact_match()`, so the
readout cannot describe a different set from the deletion — the readout exists
to say what the deletion would remove. Widened to `DROP_EXTENSIONS`, **not** to
`hostbeam-*`: it feeds a `-delete`, and the bare prefix would also match a
`hostbeam-notes.txt` someone left there. iOS had the same gate and the same
gap — it only sends PNG, but it reads the folder the Mac fills — so
`isBeamArtifact` was widened with it.

*A dropped JPEG had no thumbnail.* `image` was compiled with `features =
["png"]`, so every other format beamed fine and then sat in Recent as a grey
square — the placeholder reading as a failure when nothing had failed. Now
`png, jpeg, gif, webp, bmp, tiff`: every format with a pure-Rust decoder, which
happens to be exactly the set `PULL_EXTENSIONS` already allows, so pull
previews gained the same thing. Measured cost, since that was the reason to
hesitate: **16.01 MB → 17.07 MB** on the release binary, +1.06 MB. HEIC, HEIF
and AVIF stay out — libheif and dav1d are C libraries, and a 38x26 preview is
not worth putting them in the bundle. Decoding is preview-only either way; a
dropped file is still sent byte-for-byte.

*Two remote scripts interpolated the folder unquoted*: `mkdir -p -- {folder}`
in the beam path and in diagnostics. Not the "path with a space" I first called
it — `valid_folder` refuses whitespace and both quote characters, so that case
is turned away at the gate. What it permits is `;`, `$(…)` and backticks, which
in an unquoted position are commands rather than path characters, on the host
of whoever typed the folder into Preferences. Every other remote script already
single-quoted it; these two now go through `mkdir_script`, and a test walks the
scripts to check none of them regress.

---

## 8. Wait for a beam instead of ending the turn — deferred 2026-09-13

Today the agent can only see what has already arrived. When it wants a
screenshot the user has not sent, it does the normal thing: asks in text and
ends its turn. The user beams, then has to say "done" — which is the narration
the agent tools exist to remove, reappearing one step later.

**A second route, found 2026-09-26 (not built).** Claude Code's hooks can now
wake an idle session: `FileChanged` watches files during a session, and
`asyncRewake` runs a hook in the background and wakes Claude on exit code 2,
with the hook's output as a system reminder (text only). A beam landing could
wake the agent that asked for it — no blocking tool, and no bet on whether a
model reaches for one. Claude Code only; whether `FileChanged` can watch a
folder outside the project is unchecked. It would ship as a mode of § 5's
parked hook. [differentiation-brainstorm.md](../research/differentiation-brainstorm.md)
§ 5.

**The shape, if it gets built:** a `wait_seconds` parameter on
`latest_screenshot`, **not** a new tool. The model already reaches for
`latest_screenshot` in the right situations; a parameter asks it to learn one
thing, a second tool asks it to recognise a novel moment *and* find the tool for
it. If a screenshot is already there it returns at once, exactly as now.

**Why it is deferred, and it is not a design problem.** Whether a model reaches
for this at all is unknown, and unknowable from here. Models are trained hard to
yield when they need something from the user, and this asks one to call a
blocking tool instead. It either happens in real sessions or it does not, so the
decision is an experiment, not an argument.

Four things that are already settled, so nobody re-derives them:

- **Short default, low cap** (~60s, hard cap ~180s). A waiting agent looks like
  a frozen session, and the user cannot type while a tool runs — only interrupt.
  A misfire must cost seconds.
- **The server's default must sit under the client's MCP tool timeout**, or a
  wait ends as a client-side error instead of a clean "nothing arrived". Check
  the client's actual value; do not assume one.
- **The timeout answer must discourage retrying**, not merely report: "Nothing
  arrived in 30 seconds. Do not wait again unless the user says they are sending
  one." Otherwise the agent can loop on it and burn minutes. A normal result,
  never `isError` — nothing failed.
- **Stopping is already solved**: the timeout, the client's interrupt, and
  beaming, which is the intended exit anyway.

**How to decide it:** wire it up and use it. If the model reaches for it
unprompted in ordinary conversation, it is the strongest thing the agent tools
do. If it never does, delete the parameter; the cost was an hour. Either way it
satisfies § 5's "use them first", which is the gate that caught three bugs on
2026-09-13 — including tool calls being dropped whenever stdin closed, invisible
to eighteen passing tests because none of them ran the process.

## 9. A Raycast extension — scaffolded 2026-09-20

`apps/raycast/`, outside the npm workspaces. Three commands that need nothing
new from the app: Beam Clipboard (through `hostbeam://beam`, ADR 0025), Beam
Selected Files (`open -b com.hostbeam.app`, which already worked), and Recent
Beams, read straight from the app's config with its thumbnails.

Switching host landed the same day, as a fourth command and a second verb
(`hostbeam://host?id=…`); ADR 0025 is amended with why that is not the
`?host=` it originally refused. Publishing: the `author` is real since
2026-09-24 (`PunkABeat`), and the extension was submitted the same day as
[raycast/extensions#31483](https://github.com/raycast/extensions/pull/31483);
what is left is Raycast's review. State and route:
[raycast-extension.md](raycast-extension.md) — the route as walked, the way
[ADR 0021](../adr/0021-publish-the-mcp-server.md) and `scripts/mcp-release.sh`
recorded the npm one.

## 10. Make the server feel local — the plan after the upload became a commodity (2026-09-26)

A day of research found Hostbeam's core job — a clipboard image on the agent's
host, a path handed back — now shipping everywhere: in Termius on the phone,
in cmux, Herdr, FainLane and the free Paste2SSH on the Mac, and in the Codex
and AgentsRoom clients. Evidence and sources:
[differentiation-brainstorm.md](../research/differentiation-brainstorm.md),
[agent-first-brainstorm.md](../research/agent-first-brainstorm.md),
[beyond-screenshots-brainstorm.md](../research/beyond-screenshots-brainstorm.md),
[two-way-clipboard.md](../research/two-way-clipboard.md).

**Agreed with the owner on 2026-09-26 as the order: any file you hand over
first (small), then 10a, then 10b, with 10c decided now.** The first step is
shipped on the Mac in 0.1.30 (2026-09-27); 10a–10c are not, and each lists what
it needs first (10a's spike is done: below). The thread through all of them: stop
selling "upload a screenshot" and start selling "your servers feel local".

### First, small: any file you hand over — shipped on the Mac in 0.1.30 (2026-09-27)

**Why.** Parity, not a bet. Termius takes "images and files", Remote Control
"a photo or file", and the desktop agent apps take attachments; next to them a
refused PDF reads as a missing feature. The best-evidenced request going in —
a screen recording — is a file. Full reasoning:
[differentiation-brainstorm.md](../research/differentiation-brainstorm.md),
bet 5.

**The scope decision is made.** The owner moved the fence on 2026-09-26:
[ADR 0006](../adr/0006-screenshot-bridge-first-product-scope.md) and
[ADR 0020](../adr/0020-agent-side-tools.md) carry amendments, `AGENTS.md`
and `docs/product.md` match, and the site's `llms.txt` no longer calls the
image-only limit "the product" (it still states it, because it is still true).
Browsing and syncing stay out.

**What was built on the Mac (2026-09-26).** Each item as planned, with what
the owner decided on the way:

- **The type gate is gone.** Any regular file is beamed as it is;
  `IMAGE_EXTENSIONS` (was `DROP_EXTENSIONS`) now only decides the picture work
  — previews, the HUD's picture, the sentence. Folders and unreadable files are
  refused before anything is sent. The extension is carried only if it is plain
  ASCII (≤ 16); an odd one rides in the slug. A file with none keeps none
  (`hostbeam-<stamp>-Makefile`).
- **A file copied in Finder beams with the shortcut, never its icon.** Looked
  at first, as planned: Finder's copy carries `public.file-url`, the name as
  text and `com.apple.icns`, and AppKit offers that icon as a TIFF — so the
  shortcut *and* auto-beam would already have sent a picture of the icon
  (fixed; CHANGELOG). CleanShot X leaves a file URL *and* the real PNG. **Owner's
  call: a real picture wins over its own file** — the file wins only over an
  icon, or when anything it names is not a picture. The rule is one pure
  function (`clipboard::source`) that the beam, the popover's probe, the HUD's
  preview and auto-beam all go through; auto-beam decides from types alone
  except for that CleanShot case.
- **Clean up matches the stamp, for every type.** `hostbeam-` then exactly 13
  digits then an end, `.` or `-` — **the owner chose every type, images
  included**, which also stopped it deleting a `hostbeam-diagram.png` someone
  else made. Cost, accepted: the iPhone's pre-2026-09-13 names are no longer
  counted or removed by the Mac. Proven by running the real scripts against a
  fixture on BSD `find` (every `cargo test`) and BusyBox `find` (the test host,
  `#[ignore]`d); the local one was checked to fail on the bare prefix.
- **100 MB a file** (owner's call; was 50 MB for images).
- **Secrets are held, not refused.** By name (`.env`, private SSH keys,
  `credentials`, `*.pem` and other key stores; `.key` unless it is a Keynote
  zip) and by a private key's armour line in the first 4 KB, checked on a
  symlink's target too. A held beam is a result, not an error: nothing sent or
  spent, Rust opens the popover, "Don't send" is the focused default because
  that popover takes key focus, and "Send anyway" sends exactly the files
  named. There is no native dialog in the app, so the card is the popover's.
- **The sentence says "file" for a non-picture** — only while the template is
  the untouched default (owner's call). Rust and the popover share the rule.
- **Dock and Open With take any file** (`public.data`, LSHandlerRank `None`,
  owner's call), so Hostbeam is never the default app for anything.
- **The site's `llms.txt` and FAQ** are edited, not deployed: deploy after the
  Mac release carrying this ships. The rest of the site was rewritten for it
  on 2026-09-27, at the owner's request (home, features, `/agents`, privacy,
  refunds, the iPhone section, structured data); screenshots stay the
  headline, as the main use, and files join the supporting copy.

**Left for the release smoke test.** A Dock drop, `open -a` and whether Open
With lists Hostbeam for a PDF need a real bundle, so `tauri dev` could not show
them ([release-smoke-test.md](release-smoke-test.md)).

**The iPhone, built 2026-09-27 (TestFlight build 8, not yet in the App Store).** The device test came first, as
planned: the share extension streamed a 99 MB file at a **20 MB peak** on an
iPhone 13, the same as a 70-byte PDF, against a ceiling of about 120 MB. Test
builds append each share's peak to `share-memory.log` in the app group, read
off the phone with `xcrun devicectl device copy from --domain-type
appGroupDataContainer --domain-identifier group.app.hostbeam --source
share-memory.log`. Then the rest, matching the Mac: the share and action
extensions are offered for files and movies; a non-picture is sent as it is
under its own extension (it used to be named `.png`, and ImageIO would have
made a PDF's first page a JPEG); the original name rides behind the stamp; the
100 MB cap is checked before the file is copied; Clean up uses the same stamp
rule (`isBeamArtifact`); a secret is held with "Don't send" as the default; the
untouched default sentence says "file". Two bugs only the phone showed: a file
iOS does not know (`.env`, `id_ed25519`) arrives as a `dyn.…` type that is not
`public.data`, so the first build said "Nothing to beam"; and a static helper
on the share view controller is main-actor isolated, so calling it from the
provider's completion handler trapped under Swift 6 and closed every share
sheet the moment it opened (pitfalls.md).

**Show in Finder from Recent (owner, 2026-09-27).** A Recent row now keeps the
local file it was beamed from (`RecentBeam.local`), and a folder button reveals
it — or a whole drop — through `NSWorkspace` (`reveal.rs`), by row id so the
webview can only reveal what Hostbeam recorded. A clipboard picture has none.
Not on the iPhone: iOS has no public way to open Files or Photos at an item,
and a share extension only ever holds a copy.

**Still ahead of this step:** the agent tools' any-type change (ADR 0020's
amendment) ships with 10a's host setup rather than on its own — until then a
beamed PDF is on the host but `list_screenshots` will not show it, and a file
with no extension never will, since the tools require one.

**Not in this step.** Files coming back from the agent (10b's connection, and
beam back's three checks); recordings turned into frames (a later layer). The
iPhone, first left out, followed on 2026-09-27 once its device test passed
(above); it ships with 10c's release.

### 10a. Ctrl+V works in remote agents — first

**Why.** The loudest pain in the whole research: "literally impossible to
paste images into Claude Code over SSH"
([Theo](https://x.com/theo/status/2054787567095283940), 2,336 likes, 662k
views) and levelsio's "#1 problem". Everyone else answers it with a worse
shape — FainLane types a path and needs the Accessibility permission, Termius
works only inside Termius — and Anthropic closed the in-terminal fix as not
planned. cc-clip (161★) proves the technique; nobody has made it a product.

**What it would look like.** You copy a screenshot on the Mac and press Ctrl+V
in Claude Code on the server; the image arrives natively, with no hotkey and
no path. Small stand-ins for `xclip`, `wl-paste` and `pbpaste` on the host
(what Claude Code's image paste calls on Linux) reach the Mac through a Unix
socket forwarded over an SSH connection the Mac holds for a session, and the
Mac answers with its clipboard. The same one-command host setup installs the
MCP server and a wake-up mode for the parked hook (Claude Code's
`FileChanged` + `asyncRewake`; § 8), so a beam from the Mac or the iPhone
lands in the agent's conversation. The MCP server's ~10 npm downloads a day
say the host side needs exactly that one command.

**What exists.** The SSH plumbing, host list, host-key pinning and per-host
folders; the MCP server; the hook (`apps/agent/hostbeam-hook.mjs`, parked).
What does not: any connection the app keeps — every beam today is a fresh,
direct `sftp -o ControlPath=none` session (`services/ssh.rs`).

**The spike: done 2026-09-27, and it works.** Ctrl+V in Claude Code 2.1.283 on
`hostbeam-testhost` pastes the Mac's clipboard image as `[Image #1]`, inside
tmux on the host and over mosh from the Mac. Code, how to run it, and the
findings in full: [scripts/spikes/ctrl-v/](../../scripts/spikes/ctrl-v/README.md)
(`ctrl-v.sh test` proves it end to end on a private pasteboard). The test host
now carries Claude Code, tmux and mosh. What it changed:

- **Not sshd's forwarding.** OpenSSH refuses a remote Unix-socket forward
  wherever `AllowTcpForwarding` is off — Alpine's default and the usual
  hardening, and cc-clip's TCP forward fails there too. Instead the Mac's
  connection *runs* `hostbeam-clip serve` on the host, which owns
  `~/.hostbeam/clipboard.sock` (0600) and relays each request over the
  session's stdin/stdout. It needs only what a beam needs, replaces a stale
  socket itself, and hands over cleanly to a second connection.
- **Claude Code asks Bun's own clipboard reader first** and falls back to
  `xclip`/`wl-paste` only when it fails, as it does on any headless host
  (verified with no display, a dead X display and a missing Wayland socket).
  That is a vendor detail the feature rests on; the product needs a check per
  Claude Code release.
- **Install the stand-in as both `xclip` and `wl-paste`**: with a real `xclip`
  earlier on the `PATH`, Claude Code falls back to `wl-paste` and still works.
- **Anything running as the user on the host can read what the Mac serves**
  while the connection is up — the socket is the boundary, not the asker.
  The stand-in can tell Ctrl+V (`sh -c 'xclip … > …/claude_cli_latest_screenshot.png'`
  under `claude`) from the agent's own shell (`bash -c source
  ~/.claude/shell-snapshots/…`), but only as a label: it enforces nothing.

**The decisions it needs before code** — sharpened by the spike, and parked
with the helper on 2026-09-28 (below): they apply only if it comes back.

- **A connection the Mac holds for a session** — an ADR; it is background
  network activity, and questions.md § Competitive landscape already expects
  it. The spike's shape: an SSH session whose command is the host's relay,
  `ControlPath=none`, no agent or X11 forwarding, keep-alives, a deadline.
  Open: when it opens (per host, on demand, at launch), and what the menu bar
  shows while it is up.
- **Reading the Mac's clipboard on a server's request** — a security ADR. The
  spike settles that consent cannot depend on who asks, so it has to be the
  Mac's: consent per read, a time-limited grant per host, or limits on *what*
  is served (images only, only something copied in the last minutes, a HUD
  naming the host on every read). Password-manager items (concealed and
  transient) are never sent; the spike already skips them. Questions.md §
  Security, "Ctrl+V over SSH".
- **Code installed on the user's hosts** beyond ADR 0020's read-only agent
  tools: two names on the `PATH` and a relay. The spike's is Python; the
  product's must not need anything the host lacks — a static binary per
  architecture is the likely answer, which is new to build and to sign.
- Scope: `AGENTS.md`'s fences, ADR 0006 and `docs/product.md`.
- Pricing: the native paste as the paid part, the plain upload free.

**Still open from the first step:** ask five buyers whether "Ctrl+V just works
over SSH" is worth paying for — the owner's.

**Found 2026-09-28: most of it needs no helper at all.** The owner's objection
— people will not want to install anything on their servers, or will want it
open source — sent us back to Claude Code's paste code, and it already does
the job with today's beam. Pasted text is split into pieces, and every piece
that is the absolute path of a readable `.png`, `.jpg`, `.gif` or `.webp` is
attached as an image (the same code that handles a file dragged into a local
terminal). Tested on `hostbeam-testhost` with no `xclip`, `wl-paste` or
stand-in present, pasting as a terminal's Cmd+V does (bracketed paste):

| Pasted | Claude Code 2.1.283 shows |
|---|---|
| a beamed file's path | `[Image #1]` |
| today's sentence, `Use this screenshot: /tmp/hostbeam/….png` | `[Image #1]Use this screenshot:` |
| two paths, as a multi-beam pastes | `[Image #1] [Image #2]` |
| a PDF's path | the path, as text |

Through tmux, and over mosh. **So Hostbeam already hands Claude Code the
picture itself, not a path to read** — with any terminal, tmux, mosh, and the
iPhone's SSH apps, and with nothing on the host. It was never written down,
and the site does not say it. What the helper would still add is only the
last step: Ctrl+V on an image the Mac has not beamed yet. With auto-beam on,
that gap is the hotkey, or Cmd+V in place of Ctrl+V.

**Confirmed by the owner the same day in a real terminal**: a CleanShot capture,
⌘⇧7 to `hostbeam-testhost`, Cmd+V in Claude Code there → `[Image #1]Use this
screenshot:`. (Without the beam, the terminal pastes the capture's *Mac* path,
which the host cannot open — the gap Hostbeam fills.) **And from the iPhone,
2026-09-28:** a screenshot shared to `hostbeam-testhost` from build 10, its path
pasted in Termius on the phone into Claude Code there → `[Image #1]` (owner). **The other agents, the same day** (`scripts/spikes/ctrl-v/ctrl-v.sh paste
hostbeam-testhost` — re-run it, since agents change this between releases).
Claude Code 2.1.283, Codex 0.157.1, Gemini CLI 0.61.0, OpenCode 1.18.32:

| Pasted | Claude Code | Codex | Gemini CLI | OpenCode |
|---|---|---|---|---|
| one path, alone | picture | picture | picture | picture |
| today's sentence, one file | picture | text | text | text |
| two paths, a space apart | 2 pictures | text | 2 pictures | text |
| today's two-file form, a sentence per line | 1 picture + a path as text | text | text | text |
| two paths, one per line (sentence off) | text | text | text | text |

"Text" still works as it always has — the agent opens the path itself — but
it is not attached. Two things follow. **The bare path is the one form every
agent turns into the picture**, and today's sentence only does it in Claude
Code. **Several files have no form that works everywhere**: Claude Code splits
a paste at spaces, not line breaks (so today's one-per-line form attaches only
the last file there), Gemini CLI likewise, and Codex and OpenCode take a paste
as an image only when it is a single path. Space-separated bare paths are the
best of what exists: pictures in Claude Code and Gemini CLI, text elsewhere.

**Decided and built, 2026-09-28 (owner: "ok please do"):** after a beam the
clipboard holds **just the path**, several a space apart, and the sentence is
an option, off by default — [ADR 0006's 2026-09-28 amendment](../adr/0006-screenshot-bridge-first-product-scope.md).
Existing installs that never chose the sentence move over once; one someone
wrote is kept. On the Mac (`render_sentence`, `settle_copy_sentence`, the
webview's `clipboardText`, which also fixed Recent copies ignoring the switch),
the iPhone (`BeamOutcome.sentence`, `Beamer.template(saved:chosenSince:)`;
installed on the device), Raycast (`sentenceFor`, to publish to its store PR),
the site (hero demo, how it works, features, the agent moment, the iPhone
section, FAQ, structured data, `llms.txt`, `/agents`) and the App Store
listing text. **Shipped 2026-09-28:** Mac 0.1.32 with the site, and iPhone
TestFlight build 10, and Raycast's update to its store PR (#31483, still in
review).

**The helper is parked**, not built: Ctrl+V on an image not yet beamed is all
it would add, and it needs code on the host. If it comes back it is optional,
open source and removed when switched off (owner, 2026-09-28).

### 10b. The agent's work opens on your Mac and phone — second

**Why.** The second-strongest signal was *seeing* what the agent built:
levelsio's live-simulator post
([2,820 likes](https://x.com/levelsio/status/2075328941317886210)) and
Termius's port-forwarding post (990 likes). VS Code forwards new ports and
opens a server's links locally for its own users; people in a terminal get
none of it.

**What it would look like.** On 10a's connection: when the agent starts a dev
server, Hostbeam forwards it and offers "Open devbox:5173" on the Mac, or on
the iPhone to test on a real phone; and anything copied on the server
(`pbcopy`, `/copy`) lands on the Mac marked with its host — the server-to-Mac
half of the two-way clipboard.

**What it needs.** 10a's connection ADR; which ports qualify (new listeners on
the host's localhost, never a public bind); how the phone reaches them.

**Can it be done with nothing installed on the host? Mostly — checked on
`hostbeam-testhost`, 2026-09-28** (the owner's question after 10a):

- **Noticing a dev server: yes.** `/proc/net/tcp` and `tcp6` list every
  listening port with its owner's uid, readable by anyone. A stand-in server on
  `127.0.0.1:5173` showed up as the user's own; sshd showed up as root's. One
  command streamed over the connection can re-read it every few seconds.
- **Reaching it: yes, even where forwarding is off.** `ssh -L` was refused
  ("administratively prohibited": `AllowTcpForwarding no`). A relay made of a
  command already on the host carried it instead, each browser connection one
  SSH session: busybox `nc`, bash's `/dev/tcp`, and perl's `IO::Socket` all
  served the page, about 12 ms a request on a multiplexed connection. One of
  the three is on practically every server (bash and perl-base are essential
  on Debian and Ubuntu; busybox `nc` on Alpine; all three on macOS).
- **One connection carries 10 sessions** (sshd's `MaxSessions`); the 11th and
  12th were refused and retried on a second connection. A browser holds about
  six, so it is a limit to design for, not a blocker.
- **Server → Mac clipboard: not without something on the host.** Claude
  Code's `/copy` already reaches the Mac through the terminal where OSC 52
  works (two-way-clipboard.md), so Hostbeam adds little there; catching
  `pbcopy` needs a stand-in. Files the agent leaves come back already
  (`pullIncoming`, off by default).
- **Still the owner's call:** Hostbeam holding a connection while you work
  (background network activity — the decision parked with 10a's helper), and
  the phone, which would need its own. Not tested: a real dev server with
  WebSocket hot reload (a TCP relay carries it in principle).

**Decided and built, 2026-09-28 — "open the dev server" on the Mac**
([ADR 0029](../adr/0029-open-the-agents-dev-server.md)). The owner chose "when
I open the popover" over checking in the background. The popover lists the
user's listening ports on the current host under "Running on <host>"; **Open**
holds one connection and forwards the port to `127.0.0.1` (`ssh -W`, else the
relay), **Stop** or the menu-bar menu ends it. Proven end to end against a
real sshd both ways (`dev_forward_on_the_test_host…`), and tried by hand by
the owner in a test build the same day (list, Open, the menu-bar Stop line,
Stop — all worked). Not released yet. The clipboard half and the iPhone stay out.

### 10c. The iPhone app — decided 2026-09-27: launch it free, with no in-app purchase

**Decided, and widened to the whole product ([ADR 0028](../adr/0028-free-to-use-with-a-reminder.md)).**
The owner reviewed pricing against the free alternatives (Paste2SSH, cmux,
Herdr) and chose Sublime Text's model over the daily cap: every feature free
and unlimited on both apps; the Mac asks now and then after a beam has landed
(once the first beam is a week old, every 10th beam); a $29 license for 3 Macs
hides it for every Hostbeam 1 update, with no year to run out (a Hostbeam 2
would be a discounted upgrade). The iPhone app is free with no purchase, no
counter and no key.
Built the same day on the Mac, the iPhone and the site, and shipped the same
day: Mac 0.1.31, the site and key email, and iPhone TestFlight build 9.

The recommendation it settles, as written: **launch it free, with no in-app
purchase,** pitched as "share
from your phone and your agent sees it — any SSH app, any agent, no vendor in
between" (which leans on 10a's wake-up hook), and stop investing in
phone-upload features: that is the most commoditized thing in this market
(Termius, Moshi, Secure ShellFish, Remote Control, the ChatGPT app). The app is
built, and the App Store is a discovery channel.

**What would change.** The in-app purchase (`PurchaseController.swift`) and the
free-tier meter (`BeamCounter.swift`) leave the iPhone build or go dormant; the
licence becomes Mac-only, so the site's "3 devices, any mix" copy changes.

**Check first:** that a free app with no in-app purchase needs only the Free
Apps agreement for PunkABeat's account as it stands, which would take the D&B
→ Paid Apps → tax → banking chain off the launch path. Apple's own page says
free apps need only the Developer Program License Agreement
([Apple](https://developer.apple.com/support/terms/), checked 2026-09-27); what
is left to confirm in App Store Connect is that nothing else hangs on the D&B
address change. The EU still needs the trader address.

### Not now, from the same research

Beam back (thin evidence; three cheap checks first), window sharing and
instant replay (good, no permission needed — after 10a, on the same
connection), the trust layer (contested by funded players), session hand-off
(Codex has it), mockup checks (Applitools and TestMu AI sell them), the full
agent gateway, and Windows and Linux (milestone 009) until the core is
different enough to port.

## Considered and not recommended

Written down so they are not re-proposed:

- **Typing the pasteable sentence into the frontmost terminal.** Needs the
  Accessibility permission and behaves differently in every terminal. The
  clipboard already works everywhere. *Not covered by this rejection:* typing
  the path into the agent's tmux pane *on the host*, with the host found from
  the terminal's processes — no permission, any terminal, the iPhone too.
  Recorded, undecided, in
  [differentiation-brainstorm.md](../research/differentiation-brainstorm.md)
  § 5, bet 4 (2026-09-26).
- **Automatically beaming screenshots it detects.** Turns a quiet utility into
  one that nags. The offer-only variant in Later Directions is milder but buys
  little over pressing the hotkey.
- **Anything with a relay, an account, or hosted storage.** Ruled out by the
  product principles, for good reasons that have not changed.
- **⌘1–⌘9 in the popover to switch host** (2026-09-20). Built and removed the
  same day: the keystroke never reached the webview. `tauri-nspanel`'s `show()`
  calls `make_key_window()`, but a non-activating panel opened while another
  app is frontmost evidently does not end up taking key input — the same
  reason `show_panel` has to nudge the update dot by hand, because the
  webview's `focus` event never fires either. Anyone reaching for keyboard
  control of the popover has to solve *that* first, and making the panel
  activate would trade away the thing it is for: beaming without leaving the
  app you are in.
- **A "beam last screenshot" item in the Dock icon's right-click menu**
  (2026-09-19). The Dock icon is off by default, so it is the least-reached
  surface the app has, and a right-click there is slower than the shortcut it
  would duplicate — while "last screenshot" would have to mean either the
  clipboard (the existing beam, worse triggered) or the newest file on disk,
  which is the file-picker scope this milestone does not open. The gap it was
  reaching for was real, and went to the **menu bar's** right-click menu
  instead, where every user has one. If that item gets used, the Dock menu is
  a small follow-on sharing its handler — `applicationDockMenu:` is objc Tauri
  does not expose, and the menu exists only under `ActivationPolicy::Regular`.

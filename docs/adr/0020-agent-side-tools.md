# ADR 0020: Agent-Side Tools, Scoped to What Hostbeam Delivered

Status: Accepted.

Date: 2026-09-08.

Relates to: ADR 0006 (Screenshot Bridge First) — this is the first Hostbeam code
that runs anywhere other than the user's own devices, and it is scoped so that
0006's constraint still holds.

## Context

Hostbeam's loop ends with a paste. The Mac beams a screenshot, puts
`Use this screenshot: /tmp/hostbeam/….png` on the clipboard, and the user pastes
it to their agent. Auto-beaming (0.1.18) removed the second keystroke on the
capture side; the paste is what is left.

The paste exists only because the agent does not know the file arrived. It is a
notification, hand-delivered. If the agent could see the folder, the sentence
template would become plumbing rather than something a person handles.

Three mechanisms were considered.

- **A skill / context file.** Instructions telling the agent where screenshots
  land. Cheapest, works nowhere in particular — it fires when the agent decides
  it is relevant, and context files load once at session start.
- **An MCP server.** The agent can ask for a screenshot. Works in any client
  that speaks MCP, which is the only cross-agent standard here.
- **A prompt hook.** Attaches a newly beamed screenshot to the next message
  without being asked. Removes the paste entirely, but must be wired per agent:
  there is no cross-agent hook standard, and each vendor's is a different shape.

A fourth was rejected outright: having the Mac *type* the line into the terminal
over Accessibility. It needs the permission ADR-adjacent work has twice avoided,
and it breaks on tmux, panes, and every terminal but the one it was tested in.

The constraint that shapes all of this: **agents are turn-based**. Nothing
watches a folder between turns, so "the user does nothing" is not reachable.
"The user never pastes a path" is.

## Decision

Ship **both** the MCP server and the hook, in `apps/agent/`, as two dependency-free
Node files. MCP is the reach; the hook is the polish for one agent at a time.

**They read only what Hostbeam delivered.** `hostbeam-*` with an image
extension, one directory, no recursion, read-only. This is the load-bearing
decision and everything else follows from it:

- A name must be a bare file name — no separators, no `..` — so nothing can name
  a path outside the beam folder.
- The prefix means these cannot become a way to read arbitrary images off a
  host. Not the agent's own output, not a colleague's file in `/tmp`. Only what
  the user sent.
- Images only, so the open question in `docs/process/next.md` — screenshot
  bridge or two-way file bridge — is not answered by a side door. An MCP server
  that returns any file the agent asks for *is* that bridge, and it would have
  arrived without anyone deciding.
- No write, no delete, no move. Removing things stays in the Mac app's Storage
  view, behind a confirmation, where ADR-fenced remote cleanup already lives.

**No dependencies.** MCP over stdio is newline-delimited JSON-RPC, short enough
to write out. This code runs on someone else's server: it should be auditable in
one sitting and must not need `npm install` on a box with no network. The same
reasoning applies to the hook.

**The hook prints a path, never image bytes.** The agent decides whether to read
it. Pushing pixels into every prompt would be expensive, and would act on an
image the user never chose to show.

**Distribution is not decided here.** The files exist and are tested; whether
they ship in the DMG, go to npm, or land in an MCP registry is a separate
decision with its own trade-offs.

## Consequences

- Hostbeam now has code that runs somewhere other than the user's Mac and
  iPhone. That is new, and is why the scoping is written down rather than left
  to the implementation.
- `npm run test:agent` is a new gate. The tests are mostly about what the tools
  *refuse*, because the scoping rule is the entire security story.
- The hook's wiring is version-sensitive in a way the rest of this repo is not.
  Hook event names and payloads are the part most likely to have moved; the
  README says to verify before relying on it, and the script assumes only the
  lowest common denominator (run as a command, stdout becomes context).
- **Prompt injection is a real consideration and is documented, not solved.** An
  image can contain text that reads like an instruction. That is already true
  when a user pastes a path — but then they chose to show it. A hook attaches
  screenshots they may not have meant for the agent. The scope limits the blast
  radius (nothing lands in that folder unless the user beamed it), and the
  README says so plainly rather than pretending otherwise.
- If people ask why a PDF the agent wrote did not come back, that is the
  evidence for reopening the two-way-bridge question — now with a shipped narrow
  version on both sides of the loop to reason from.

## Amendment (2026-09-26): any type, the same rule

Status: accepted by the owner, 2026-09-26. **Not built** — it ships with the
one-command host setup in [next.md](../process/next.md) § 10. The Mac has beamed
any type since 2026-09-26 (unreleased), so until this lands a beamed PDF is on
the host but not in `list_screenshots`. A file with no extension
(`hostbeam-<stamp>-Makefile`) the tools' `NAME` pattern refuses outright, since
it requires one; decide that with this amendment.

"Images only" was written so that the screenshot-or-file-bridge question
would not be answered by a side door. It has now been answered deliberately:
[ADR 0006](0006-screenshot-bridge-first-product-scope.md)'s 2026-09-26
amendment puts any file the user hands over in scope. The agent tools follow,
under the same load-bearing rule: `hostbeam-*`, one directory, no recursion,
read-only, no symlinks, a folder owned by the user.

- **Images come back as images**, with today's limits (JPEG, PNG, GIF and WebP
  embedded; other image types described).
- **Everything else is described, not embedded:** name, size, type and path,
  so the agent opens it with its own tools. Claude, for one, reads PDFs, logs,
  JSON and CSV that way.
- **Whether small text files come back as text is open.**
- **The prefix rule is unchanged,** so the tools still cannot read anything the
  user did not send.

Prompt injection widens with the types — a PDF or a log can carry
instructions as readily as an image — and the answer is the same as above:
nothing lands in that folder unless the user sent it.

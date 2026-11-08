# ADR 0006: Screenshot Bridge First Product Scope

Status: Accepted.

Date: 2026-06-14.

## Context

Hostbeam could become a broader local-to-remote file transfer utility. The clearest first pain, however, is getting local screenshots into coding-agent sessions running on normal SSH servers or dev boxes.

The project also needs a clear distinction between the technical first proof and the first usable product so agents do not implement upload, hotkeys, menu-bar behavior, or history during the scaffold milestone.

## Decision

Define the first product as a macOS menu-bar screenshot bridge for remote coding agents.

Milestone 002 remains limited to Flutter scaffold plus SSH config host discovery.

The first usable product should upload clipboard screenshots to a selected SSH host using non-interactive OpenSSH readiness, copy `Use this screenshot: {remote_path}` back to the local clipboard, and keep a lightweight local recent history.

Broader arbitrary file transfer is a later expansion to revisit only after the screenshot workflow proves useful.

## Consequences

- Product docs can optimize around one core workflow instead of a general file-transfer surface.
- macOS menu-bar and global hotkey work belong to the first usable product, not Milestone 002.
- Clipboard image reading, upload, notifications, and history remain out of the scaffold milestone.
- Future arbitrary file support requires a new product and security review.

## Amendment (2026-09-26): anything you hand over

Status: accepted by the owner, 2026-09-26. **Built on the Mac the same day and
on the iPhone on 2026-09-27, once its device test passed (a 99 MB file at a
20 MB peak in the share extension). The Mac shipped it in 0.1.30
(2026-09-27); the iPhone carries it from TestFlight build 8** —
[next.md](../process/next.md) § 10's first step records what was built. Four
calls the owner made while it was built: 100 MB a file; the stamp rule below
applies to every type, images included; a capture tool's real picture wins
over the file it names on the clipboard (a copy in Finder carries only the
file's icon, which is never sent); and the pasted sentence says "file" for a
non-picture only while it is the untouched default.

The screenshot bridge proved itself: it ships and it sells. Its core — a
clipboard image on the agent's host, a path handed back — has meanwhile become
a commodity. Termius pastes "images and files", Remote Control attaches "a
photo or file", and the desktop agent apps take attachments. Beside them, a
refused PDF reads as a missing feature rather than a principle, and the
best-evidenced request going in, a screen recording, is a file
([differentiation-brainstorm.md](../research/differentiation-brainstorm.md),
bet 5).

**Decision: scope by intent, not by file type.** Hostbeam beams anything the
user hands over: the clipboard, a file dropped on the popover or the menu-bar
icon, a file copied in Finder and beamed with the shortcut, a file shared from
the iPhone, or `open -a Hostbeam <file>`. The same folder, the same sentence;
one gesture is still one beam.

**Still out:** browsing — a manual file picker or a remote file browser —
syncing, and folders at first. Nothing moves without an explicit act.

**What comes with it:**

- A size cap, and a warning before sending anything that looks like a secret
  (`.env`, `id_rsa`, `*.pem`, `credentials`): landing those in `/tmp` on a
  shared server would be a real mistake.
- Storage and Clean up widen only once a remote name must also carry
  Hostbeam's millisecond stamp. `artifact_match()` feeds a `-delete`, and the
  bare `hostbeam-` prefix would match a `hostbeam-notes.txt` someone else left
  in the folder.
- The iPhone accepts arbitrary files only after a device test of the share
  extension with large files; until then it stays images-only.

**Consequences.** This ADR's "future arbitrary file support requires a new
product and security review" is answered for files the user hands over: the
product half is this amendment, the security half the three points above.
Browsing and syncing would still need their own review. `docs/product.md` and
`AGENTS.md` change to match, the site retires "that constraint is the
product", and ADR 0020's agent tools move with it (its 2026-09-26 amendment).

## Amendment (2026-09-28): the clipboard gets just the path

Status: accepted by the owner, 2026-09-28; built the same day on the Mac, the
iPhone and in the Raycast extension.

**Change.** After a beam the clipboard holds the remote path alone, and several
paths go on one line a space apart. The sentence (`Use this screenshot:
{remote_path}`, above) becomes an option, off by default: "Add a sentence
around the path" on the Mac, a template with `{path}` on the iPhone. A sentence
someone wrote is kept, and stays on.

**Why.** Coding agents turn a pasted path to an image into the image itself —
the code that handles a file dragged into a local terminal — and they do it
over SSH, because the path names a file on the host where the agent runs.
Tested on `hostbeam-testhost` (next.md § 10a) with Claude Code 2.1.283, Codex
0.157.1, Gemini CLI 0.61.0 and OpenCode 1.18.32: a bare path became the picture
in all four; the sentence did only in Claude Code. Claude Code and Gemini CLI
split a paste at spaces, not line breaks, so several paths attach there only a
space apart; Codex and OpenCode take one picture per paste. This gives Ctrl+V's
result — the agent sees the image, not text — with nothing installed on the
host, which next.md § 10a's helper would have needed.

**Existing installs.** The Mac saves every setting, so a saved "sentence on,
default text" cannot be told from a choice; the iPhone's text field saves on an
ordinary Settings visit. Both read that combination, saved before the change,
as the new default, once: a `pathDefault` marker written with every save since
keeps a sentence switched back on (`config.rs` `settle_copy_sentence`,
`Beamer.template(saved:chosenSince:)`).

**Consequences.** The agent result depends on the agents' paste handling,
which they can change; `scripts/spikes/ctrl-v/ctrl-v.sh paste` re-checks it
against whatever agents a host has. A beam folder with a space in its path
breaks the space-separated form (remote names are slugged, folders are not).

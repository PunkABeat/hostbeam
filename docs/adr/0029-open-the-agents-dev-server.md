# ADR 0029: Open the Agent's Dev Server on the Mac

Status: **Accepted** (2026-09-28, owner decision: "let's do as you are
suggesting", with "when I open the popover" chosen over checking in the
background). Mac only.

Relates to: ADR 0003 (system OpenSSH, the user's own access), ADR 0006 (what
Hostbeam moves, and its 2026-09-28 amendment), next.md § 10b (the evidence),
§ 10a (the helper this deliberately does not need).

## Context

An agent working on a server starts a dev server — Vite on `localhost:5173`,
a Next.js app on `3000` — and the person asking for the work cannot see it.
VS Code forwards such ports for its own users; someone in a terminal types an
`ssh -L` by hand, or does without. After "paste images into remote agents",
*seeing what the agent built* was the strongest signal in the 2026-09-26
research (next.md § 10b).

The owner's standing constraint (2026-09-28): nothing installed on the server.
next.md § 10b checked it on `hostbeam-testhost` the same day:

- `/proc/net/tcp` and `tcp6` list every listening port with its owner's uid,
  readable by anyone — so the user's own dev servers can be found with one
  read-only command, and told apart from the host's services.
- `ssh -L` is refused wherever `AllowTcpForwarding` is off ("administratively
  prohibited"), which is Alpine's default and the usual hardening. A relay
  made of a command already on the host — busybox `nc`, bash's `/dev/tcp`, or
  perl's `IO::Socket` — carries the connection instead, one SSH session per
  browser connection, about 12 ms a request.
- One connection carries sshd's `MaxSessions` (10) sessions; OpenSSH's client
  falls back to a fresh connection past that on its own.

## Decision

1. **Hostbeam looks when you open the popover, and only then.** It asks the
   current host, read-only, which TCP ports the SSH user is listening on
   (`/proc/net/tcp` on Linux, `lsof` on a Mac host), and lists them in the
   popover. Nothing is checked in the background, and nothing stays connected
   until you click **Open** (owner's choice, 2026-09-28, over checking every
   few seconds and notifying).
2. **Only your own ports.** A port is offered when its owner is the SSH user,
   it is listening, and it is bound to loopback or to every address. The
   host's own services (sshd, databases run by other users) never appear.
3. **Open forwards it to your Mac, and only your Mac.** Hostbeam listens on
   `127.0.0.1` — never a LAN address — on the same port number when it is free
   (so the page's own links and origins match), else on any free one, and
   opens it in the default browser. Each browser connection is carried by
   OpenSSH's own forwarding (`ssh -W`) where the host allows it, and by the
   relay described above where it does not. The host key is checked exactly
   as for a beam: by the user's own `known_hosts` and ssh config.
4. **Nothing is installed or left on the host.** The relay is a command run
   for the length of one connection; the check is a read. There is no file
   written and no process left behind.
5. **While a port is open, one connection is held, and it shows.** The popover
   row says so, with **Stop**, and the menu-bar menu has a "Stop forwarding
   <host>:<port>" line. It ends on Stop, when the next check finds the dev
   server gone, when the connection drops, and when Hostbeam quits — and if
   Hostbeam dies without quitting, the connection's remote command reads from a
   pipe Hostbeam held, so it ends too. An automatic update waits while one is
   open, as it waits for a beam.
6. **Not in this decision:** the iPhone (it would need its own connection),
   the server-to-Mac clipboard (not possible without something on the host —
   next.md § 10b), checking in the background, and ports below 1024.

## Consequences

- Built 2026-09-28 in `dev_servers.rs` (the read-only check and the relays,
  pure and unit-tested) and `dev_forward.rs` (the held connection and the
  listener). `dev_forward_on_the_test_host…` (`#[ignore]`d, needs
  `npm run testhost:up`) runs the whole path against a real sshd: the relay
  on `hostbeam-testhost`, and `ssh -W` against a second host with forwarding
  on (`HOSTBEAM_FWD_HOST`, `HOSTBEAM_FWD_DIRECT=1`). Both pass. **Tried by
  hand by the owner the same day** in a test build against `hostbeam-testhost`:
  the popover listed `:5173`, Open showed the page in the browser (through the
  `nc` relay), the menu-bar menu had the Stop line, and Stop ended it. OrbStack
  was listening on `*:5173` on that Mac at the time, and Hostbeam still bound
  `127.0.0.1:5173` — the more specific address — so the page was the host's.
- Hostbeam holds a connection to a server for the first time, but only while
  the user has a port open, and says so. ADR 0006's "Hostbeam moves only what
  you hand it" still holds in spirit: nothing moves until a click, and what
  moves is a page view, not files.
- The relay depends on `nc`, `bash` or `perl` being on the host; one is on
  practically every server, and the popover says so plainly when none is.
- A page that opens a WebSocket (hot reload) is carried like any TCP
  connection; untested with a real dev server at the time of writing.

# Spike: Ctrl+V works in remote agents

[next.md](../../../docs/process/next.md) § 10a's first step, run 2026-09-27
against `hostbeam-testhost` with Claude Code 2.1.283. **Spike-grade: nothing
here ships.** The product would do the Mac side in Rust through
`clipboard::source()`, and the host side is a decision (below).

## The answer

**It works.** Copy an image on the Mac, press Ctrl+V in Claude Code on the
host: `[Image #1]` appears in the prompt, inside tmux on the host and over
mosh from the Mac. No hotkey, no path, no terminal involvement.

```sh
npm run testhost:up                                  # Claude Code, tmux, mosh on it
MOSH_PORTS=60000:60009 scripts/spikes/ctrl-v/ctrl-v.sh test hostbeam-testhost
```

`test` runs the whole path on a private named pasteboard (`app.hostbeam.spike`),
so it never reads your clipboard. By hand, on your real clipboard:

```sh
scripts/spikes/ctrl-v/ctrl-v.sh install hostbeam-testhost
scripts/spikes/ctrl-v/ctrl-v.sh connect hostbeam-testhost 10   # stops after 10 min
# in another terminal: ssh hostbeam-testhost, run claude, copy a screenshot, Ctrl+V
```

## How it works

```
Mac                                      host
mac-clipboard --relay                    ~/.local/bin/xclip, wl-paste → hostbeam-clip
  └─ ssh host 'hostbeam-clip serve' ───►   serve: owns ~/.hostbeam/clipboard.sock (0600),
       ◄── "REQ GET image/png" ──────        relays each request over the session's
       ─── "OK <n>" + PNG ───────────►       stdin/stdout, one at a time
```

Claude Code's Ctrl+V runs `xclip -selection clipboard -t TARGETS -o`, then
`xclip … -t image/png -o > /tmp/claude-<uid>/claude_cli_latest_screenshot.png`.
The stand-in asks the socket; nobody there means exit 1 and "No image found in
clipboard", exactly as an empty clipboard.

## What it found

1. **Claude Code asks Bun first, then falls back to `xclip`/`wl-paste`.** Since
   some 2.1.x, Ctrl+V calls `Bun.Image.fromClipboard()` (the Linux runtime has a
   native Wayland client and no X11). On a headless host that fails and the
   shell commands run — verified with `DISPLAY` and `WAYLAND_DISPLAY` unset, set
   to a dead X display, and set to a missing Wayland socket. **On a Linux host
   with a live desktop session Bun would read that session's clipboard and never
   call the stand-in.** Servers are not that; a vendor change here breaks the
   feature silently, so a release check belongs in the product.
2. **sshd's socket forwarding cannot be the path.** OpenSSH checks
   `AllowTcpForwarding` for remote Unix-socket forwards as well, not only
   `AllowStreamLocalForwarding` (`ssh -R` gets "remote port forwarding failed";
   the same request succeeds once `AllowTcpForwarding remote` is set, nothing
   else changed). Alpine's stock `sshd_config` has it off, and so do hosts
   hardened to the usual benchmarks. cc-clip's TCP forward fails there too.
   `CTRL_V_VIA=forward` keeps that variant for comparison.
3. **The relay needs only what a beam needs: running a command.** The
   connection's command owns the socket, so it also replaces a stale one (sshd
   does not: `StreamLocalBindUnlink` is off by default) and removes it on exit
   — only if it is still its own, so a second connection can take over and the
   first leaving does not break it (tested).
4. **The socket does not travel through the terminal**, so mosh (whose own SSH
   connection closes after start-up), tmux and the terminal app do not matter.
   The stand-in finds a fixed path, not an environment variable.
5. **Install it as both `xclip` and `wl-paste`.** With a real `xclip` earlier on
   the `PATH` (tested: `PATH=/usr/bin:/bin:~/.local/bin`), the real one fails
   for want of a display and Claude Code falls back to `wl-paste` — the
   stand-in. Only a real `wl-paste` ahead of it as well would defeat it.
6. **Who is asking can be told apart, not enforced.** The stand-in logs its
   parent processes (`~/.hostbeam/stand-in.log`). Ctrl+V is `sh -c 'xclip … >
   /tmp/claude-<uid>/claude_cli_latest_screenshot.png'` under `claude`; the
   agent's own shell (tested through Claude Code's `!` mode, the path its Bash
   tool takes) is `bash -c source ~/.claude/shell-snapshots/…` under `claude`.
   But anything running as the user can open the socket directly, so while the
   connection is up **the Mac's clipboard image is readable by every process of
   that user on the host.** The consent model has to hold on the Mac, whoever
   asks — next.md § 10a.
7. **Password managers' items are skipped** (`org.nspasteboard.ConcealedType`,
   `TransientType`), and a copied Finder file is served only if it is itself a
   picture, never its icon (pitfalls.md).

8. **Found the next day: Claude Code turns a pasted image *path* into the
   image.** With nothing on the host at all, pasting a beamed file's path
   (bracketed, as a terminal's Cmd+V sends it) shows `[Image #1]`, through
   tmux and over mosh; today's sentence and a multi-beam's two paths work too.
   The owner confirmed it with a real beam and Cmd+V in a real terminal, and
   from the iPhone: shared with Hostbeam, pasted in Termius → `[Image #1]`.
   Codex, Gemini CLI and OpenCode do it too for **one bare path**, but not
   for Hostbeam's sentence, and several files differ by agent — the grid is
   in next.md § 10a; `ctrl-v.sh paste <alias>` re-runs it against whatever
   agents the host has (test-host.md says how to add them).
   So the helper only adds Ctrl+V on an image not yet beamed —
   [next.md](../../../docs/process/next.md) § 10a, "most of it needs no
   helper at all".

## Not tested

- A real remote host (latency, a flaky link, a server that kills idle sessions).
- Codex and other agents: cc-clip reports Codex needs a virtual X display.
- Text (`pbpaste`, `xclip -t text/plain`) and the other direction (`pbcopy`,
  `xclip -i`): the stand-in refuses both.
- A host without Python: the spike's stand-in needs `python3`.

# What AI assistants answer

A record of what assistants tell someone with the problem Hostbeam solves, kept
so it can be asked again and compared after launch
([questions.md § Being found](../questions.md), LLM search). The five questions
are in [questions.txt](questions.txt); each dated folder holds the answers word
for word.

## How it is asked

- **Coding agents** — Claude Code and Codex, through the owner's subscriptions,
  with `scripts/ai-answers.sh`. Each starts knowing nothing: run from
  `/var/empty`, no MCP servers, no memory, no user settings, no session saved.
  The script's header says why each of those matters; the first attempt broke
  two of them.
- **Chat apps** — chatgpt.com, Perplexity, Copilot and Google, signed out, in a
  separate browser (chrome-devtools, never the owner's Chrome), non-essential
  cookies refused. No bot check is solved and no account is used. claude.ai
  needs a sign-in, so Claude is covered by Claude Code only.

## 2026-10-03 — before launch

Answered 16 of 30: Claude Code (Opus 5.5) and Codex (gpt-6.1-sol, web search
on) all five; ChatGPT (signed out, model not shown) all five; Perplexity
(Sonar) one before a "verify you are human" check. Copilot asked for a sign-in;
Google showed its "unusual traffic" page. Run from outside the US, which may explain both.

**No answer names Hostbeam.**

| | Claude Code | Codex | ChatGPT | Perplexity |
|---|---|---|---|---|
| A. Paste a screenshot into Claude Code over SSH | scp, sshfs, pngpaste, VS Code | scp, pngpaste; cites claude-ssh-image-skill | scp, rsync, VS Code | three VS Code extensions, clipaste, claude-screenshot-uploader |
| B. Screenshot from my Mac to a remote agent | scp, sshfs, VS Code, Shortcuts | scp | scp, an SFTP client, rsync, VS Code Remote | — |
| C. From my iPhone to Claude Code on my server | Termius, Remote Control, Secure ShellFish, Blink | Remote Control | Termius, Blink, a homemade Shortcut | — |
| D. A Mac app for this? | **Paste2SSH** ("the most polished"), claude-screenshot-uploader, clipssh, a VS Code extension | **Paste2SSH** ("built specifically for this"), screencp | SSH Screenshot Bridge, screencp, **Paste2SSH**, a VS Code extension, clipssh | — |
| E. Dev server when `ssh -L` is "administratively prohibited" | a `socat` + `nc` relay, Tailscale, cloudflared, ngrok | enable forwarding, or a `socat` relay | `ssh -D`, or enable forwarding | — |

What it says:

- **Products are named only when the assistant searches.** Without a search,
  the answer is scp and a path. Every product above came from a search, and
  ChatGPT searched only for D. So what moves these answers is being on the
  pages they find, not the training data: the sources cited were GitHub repos,
  the VS Code Marketplace, YouTube, paste2ssh.com, personal guides
  (yafl.dev, mattgoodrich.com, alexanderzeitler.com) and a r/ClaudeCode post
  presenting a free Mac app — Paste2SSH's own launch.
- **Paste2SSH is the default Mac answer.** All three assistants that answered D
  name it, two of them first. Hostbeam's listings (AlternativeTo against it,
  r/macapps, the launch posts) are where that changes.
- **The iPhone has no dedicated answer.** Remote Control, Termius or Blink,
  or a homemade Shortcut.
- **The dev-server question has no product answer.** Claude Code and Codex
  give the same `socat` relay as [the guide](https://hostbeam.app/guides/open-a-remote-dev-server-on-your-mac/);
  ChatGPT's `ssh -D` would hit the same refusal as `-L`.

Next run: about four weeks after launch, the same five questions, with the
chat apps from a network they do not block, or by hand.

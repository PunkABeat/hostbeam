import type { APIRoute } from "astro";
import { FAQ } from "../lib/faq";
import { APP_STORE_URL, BREW_COMMAND, DMG_URL } from "../lib/links";
import { GUIDES, guidePath } from "../lib/guides";

// /llms.txt — the plain-Markdown summary an assistant reads instead of parsing
// the marketing page.
//
// This is the one site convention Hostbeam has no excuse to skip. The product's
// whole premise is that its buyer is talking to a coding agent; when that agent
// is asked "how do I show you what's on my screen when you're running over SSH",
// this file is Hostbeam's answer, and it costs one build-time string.
//
// It is written to be *useful when quoted*, which means: no adjectives, the
// install command, the constraint stated as a constraint, and the price. It is
// generated from the same constants and FAQ the page renders, so it cannot
// describe a product that no longer exists.
export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL("https://hostbeam.app");
  const url = (p: string) => new URL(p, base).toString();

  const body = `# Hostbeam

> A macOS menu-bar utility (with an iPhone companion) that uploads the screenshot
> on your clipboard — or a file you hand it — to a server you already have SSH
> access to, then puts the file's remote path on your clipboard. Pasted into a
> coding agent running on that server, the path arrives as the image itself.

## The problem it solves

A coding agent running over SSH on a remote box cannot see your screen. Showing it
a screenshot normally means saving the file, scp-ing it, remembering where it
landed, and typing the path. Hostbeam is that loop reduced to one hotkey.

## How it works

1. Copy a screenshot (Cmd-Shift-4 on macOS, or any tool that puts a PNG on the clipboard).
2. Press Cmd-Shift-7. Hostbeam uploads it over SSH to the host you selected.
3. Your clipboard now holds \`/tmp/hostbeam/<file>.png\`. Paste it to the agent.

Claude Code, Codex, Gemini CLI and OpenCode attach a pasted image path as the
image itself (\`[Image #1]\`), exactly as on a local machine; nothing is installed
on the server for it. Several files are copied as paths on one line, a space
apart: Claude Code and Gemini CLI attach each one, and Codex and OpenCode, which
take one image per paste, see the paths as text they can open. A sentence around
the path ("Use this screenshot: {path}") is an option in settings, off by
default, because most agents then see text instead of the picture.

A file works the same way on the Mac: copy it in Finder and press the shortcut,
or drop it on the popover or the menu-bar icon.

The upload uses your existing OpenSSH setup — the same keys and the same
\`~/.ssh/config\` entries. Hostbeam does not create access, run a relay, or hold
an account; there is no Hostbeam server in the path of a screenshot.

## Install

- macOS: \`${BREW_COMMAND}\`
- macOS direct download: ${DMG_URL}
- iPhone: ${APP_STORE_URL}

Requires macOS 13 or later, or iOS 17 or later.

## For coding agents

An MCP server on the host lets the agent read the screenshots Hostbeam beams
there, with no path to paste. Install it on the server the agent runs on
(Node 18 or later):

- Claude Code: \`claude mcp add -s user hostbeam -- npx -y @hostbeam/mcp\`
- Codex: \`codex mcp add hostbeam -- npx -y @hostbeam/mcp\`
- Any other MCP client: command \`npx\`, arguments \`-y @hostbeam/mcp\`

Tools: \`latest_screenshot\` (the most recent beam, as images),
\`list_screenshots\` (recent beams, no image data) and \`read_screenshot\` (one
by name). It reads only Hostbeam's own screenshots in its folder
(\`HOSTBEAM_DIR\`, default \`/tmp/hostbeam\`) and never writes; other files
Hostbeam beams are there for the agent to open by path. Details:
${url("/agents")}

## Opening the agent's dev server on the Mac

When the agent starts a dev server on the host (\`localhost:5173\`, say), the
Mac popover lists the ports the SSH user is listening on, checked only when the
popover opens. Open forwards one to \`127.0.0.1\` on the Mac, on the same port
when it is free, and opens it in the browser; it holds one SSH connection until
Stop. It works where \`ssh -L\` is refused (\`AllowTcpForwarding no\`), through
\`nc\`, \`bash\` or \`perl\` already on the host, and installs nothing. Mac only,
Hostbeam 0.1.33 or newer.

## Starting a beam from something else

The MCP server reads beams; these start one. On the Mac:

- \`open hostbeam://beam\` — beam the screenshot on the clipboard.
- \`open "hostbeam://host?id=my-server"\` — change which host beams go to.
- \`open -a Hostbeam report.pdf\` — beam a file. Needs no permission.

The two links work out of the box; Preferences → General → Beaming → "Let
other apps control Hostbeam" turns them off, and a link that is ignored means
that switch. A link can only choose between hosts already added on that Mac.
Hostbeam 0.1.26 or newer.

## Price

- Free: every feature, no limit, no account, no reminder, on the Mac and the
  iPhone. There is nothing to buy. Licenses were sold for $29 until November
  2026; they no longer are, and a key activated then keeps working.
- The iPhone app is free, with no in-app purchase.

## Deliberate limits

Hostbeam moves only what you hand it, to the host you choose: the screenshot on
your clipboard, or a file you copy in Finder, drop on it, open with it or share
from the iPhone — up to 100 MB a file. Anything that looks like a secret,
such as a \`.env\` or a private key, waits until you confirm it. It is not a
file manager or a sync tool: there is no file picker, it never browses your disk
or your server, folders are not sent, and nothing moves unless you send it.

## Questions

${FAQ.map((f) => `### ${f.q}\n\n${f.a}`).join("\n\n")}

## Pages

- [Home](${url("/")}): what it does, with a live demo of the popover.
- [Pricing](${url("/pricing")}): free to use; nothing to buy.
- [For coding agents](${url("/agents")}): the MCP server that lets the agent read a beam without a paste.
- [Changelog](${url("/changelog")}): every release, dated.
- [Privacy policy](${url("/privacy")}): what is processed and what never leaves the device.
- [Terms](${url("/terms")}) and [Refunds](${url("/refunds")}): 14 days, no argument.
- [Open source licenses](${url("/licenses")}): every package inside the Mac app, the iPhone app and this site.

## Guides

Each covers every way to do the job, Hostbeam included.

${GUIDES.map((g) => `- [${g.title}](${url(guidePath(g.slug))}): ${g.description}`).join("\n")}

Support: support@hostbeam.app
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};

# Hostbeam agent tools

Two small programs that let a coding agent **see the screenshots you beamed**,
so you stop pasting the path.

They run **on the host** — the box the agent runs on, the one you beam to — not
on your Mac. Neither is required: Hostbeam works exactly as before without them.

|                     | What it does                                                                        | Works with                                                  |
| ------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `hostbeam-mcp.mjs`  | An MCP server. The agent can _ask_ for the latest screenshot whenever it wants one. | Any MCP client                                              |
| `hostbeam-hook.mjs` | A prompt hook. _Offers_ a newly beamed screenshot with your next message, unasked.  | One agent at a time — there is no cross-agent hook standard |

They solve the same problem from opposite ends and are useful together: MCP has
the reach, the hook removes the last paste.

Node 18+ (`node:fs/promises`, `node:test`). No dependencies, on purpose — this
runs on someone's server, so it should be readable in one sitting and should not
need `npm install` on a box that may have no network.

## What they will and will not read

Both are scoped to **files Hostbeam itself delivered**: `hostbeam-*` with an
image extension, in one directory, no recursion, read-only.

That is the whole security story, and it is deliberate:

- A name must be a bare file name. No separators, no `..`, so nothing can name a
  path outside the beam folder.
- The `hostbeam-` prefix means these cannot be turned into a way to read
  arbitrary images off the host — not the agent's own output, not anything a
  colleague left in `/tmp`. Only what you sent.
- Images only. Hostbeam is a screenshot bridge; whether it carries anything else
  is an open question (`docs/process/next.md`), not something these tools decide.
- No write, no delete, no move. Removing things stays with the Mac app's
  Storage view, behind a confirmation.

`HOSTBEAM_DIR` overrides the folder (default `/tmp/hostbeam`). Point it at the
same folder you beam to if you changed it per host.

## MCP server

Three tools:

- **`latest_screenshot`** — the newest *beam*, as images. One gesture can carry
  several files, and Hostbeam stamps them all the same because they belong
  together, so this returns the whole drop rather than one file of it. Above six
  it shows the first six and names the rest.
- **`list_screenshots`** — grouped by beam, with sizes, times, and how long ago.
  Metadata only, so it is cheap to call before deciding what to read.
- **`read_screenshot`** — one by name.

All three carry MCP's read-only annotations, and `initialize` returns
`instructions` saying a screenshot the user sent is a file on this host, not a
chat attachment. Codex needed both (2026-09-14): it asks before running any tool
not marked read-only, and refuses when approvals are off; and without the
instructions, a model asked about "the screenshot I just sent" looked for an
attachment and called nothing.

An image over 3.75 MB is described rather than read, and `latest_screenshot`
stops embedding a beam's files at 7.5 MB in total, naming the rest. Base64 is a
third bigger than the file, and every later request in the conversation carries
it again: Anthropic's API refuses an image over 5 MB of base64 on Bedrock and
Google Cloud and a request over 32 MB, and Gemini a request over 20 MB.

The server also skips symlinks (`lstat` to list, `O_NOFOLLOW` to open) and
refuses a folder owned by another user or writable by any user. The default is
`/tmp/hostbeam`, and on a shared machine whoever creates that first owns it.

A HEIC, HEIF, AVIF, BMP or TIFF is described rather than read too. Both apps
beam those — an iPhone photo is HEIC by default — but a model's vision request
takes only JPEG, PNG, GIF and WebP, so handing one over as an image would build
a request it cannot read. They still appear in `list_screenshots`, and
`read_screenshot` still finds them by name; you get the path instead of the
pixels, which is something the agent can act on.

Copy `hostbeam-mcp.mjs` to the host and register it. For Claude Code:

```sh
claude mcp add hostbeam -- node /path/to/hostbeam-mcp.mjs
```

Or in a client's JSON config:

```json
{
  "mcpServers": {
    "hostbeam": {
      "command": "node",
      "args": ["/path/to/hostbeam-mcp.mjs"],
      "env": { "HOSTBEAM_DIR": "/tmp/hostbeam" }
    }
  }
}
```

Check it by hand — it is newline-delimited JSON-RPC on stdin/stdout:

```sh
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | node hostbeam-mcp.mjs
```

That is the `initialize` handshake (2024-11-05 through 2025-11-25). The server
also speaks 2026-07-28, which has no handshake: each request carries
`io.modelcontextprotocol/protocolVersion` and `clientCapabilities` in `_meta`,
and `server/discover` describes the server. The era is decided per request, by
whether `_meta` carries those keys; `docs/process/next.md` § 5 has why and which
clients it was checked against.

## Prompt hook

Prints one line when a screenshot has arrived since it last spoke:

```
The user just beamed a screenshot to this host: /tmp/hostbeam/hostbeam-1788848045633.png
Read it if it is relevant to what they are asking.
```

It reports each file **once**, so three beams and three questions carry one new
screenshot each rather than all three every time. State lives in
`$XDG_STATE_HOME/hostbeam/seen` (or `~/.local/state/hostbeam/seen`);
`HOSTBEAM_STATE` overrides it, and deleting it re-offers everything.

It prints a **path, never image bytes**. The agent decides whether to read it.
A hook that pushed pixels into every prompt would be expensive, and would act on
an image you never chose to show.

It always exits 0. A broken hook must never block your prompt.

For Claude Code, in `.claude/settings.json` on the host:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          { "type": "command", "command": "node /path/to/hostbeam-hook.mjs" }
        ]
      }
    ]
  }
}
```

**Verify that event name against your version before relying on it** — hook
event names and payloads are the part of this most likely to have moved. The
script itself assumes only the lowest common denominator: it is run as a
command, may get JSON on stdin (which it ignores), and whatever it writes to
stdout becomes context for the turn. That shape ports to most agents that have
hooks at all.

## The thing to think about before turning the hook on

An image can contain text, and text in an image can read like an instruction.
That is already true when you paste a path yourself — but then _you_ chose to
show it. A hook attaches screenshots you may not have meant for the agent.

It is scoped to what you beamed, which is a real limit: nothing arrives in that
folder unless you sent it. Worth knowing all the same, and a reason to prefer
the MCP server if you want the agent to look only when it decides it needs to.

## Publishing

The MCP server is published and the hook is not (ADR 0021). npm and
`github.com/PunkABeat/hostbeam-mcp` get `hostbeam-mcp.mjs` plus `publish/`: the
npm manifest, the registry's `server.json`, the license, and a README written for
people installing it, which is not this one.

```sh
scripts/mcp-release.sh check      # stage it, and prove it starts the way npx starts it
scripts/mcp-release.sh mirror     # the public repo, tagged
scripts/mcp-release.sh publish    # npm; run it yourself, npm asks for a code
scripts/mcp-release.sh registry   # registry.modelcontextprotocol.io
```

A release bumps the version in `publish/package.json`, `publish/server.json`
and `VERSION` in the server. The tests fail until all three agree.

## Tests

```sh
npm run test:agent
```

They are mostly about what these tools **refuse**. The scoping rule is the
security story; everything else is plumbing.

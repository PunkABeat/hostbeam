# Hostbeam MCP server

[Hostbeam](https://hostbeam.app) sends a screenshot from your Mac or your iPhone
to a server over SSH and puts the remote path on your clipboard, so you can
paste it to a coding agent running there.

This MCP server runs on that server, next to the agent. The agent can ask for
the screenshot you just beamed and read it, without you pasting the path.

## Install

On the server your agent runs on, not on your Mac or your phone. Node 18 or later.

For Claude Code:

```sh
claude mcp add -s user hostbeam -- npx -y @hostbeam/mcp
```

`-s user` makes it available in every project on that server.

For Codex:

```sh
codex mcp add hostbeam -- npx -y @hostbeam/mcp
```

For other MCP clients, in their JSON config:

```json
{
  "mcpServers": {
    "hostbeam": {
      "command": "npx",
      "args": ["-y", "@hostbeam/mcp"]
    }
  }
}
```

If the server can't reach npm, copy `hostbeam-mcp.mjs` to it and run that
instead. It has no dependencies.

```sh
claude mcp add -s user hostbeam -- node /path/to/hostbeam-mcp.mjs
```

Hostbeam beams to `/tmp/hostbeam` unless you changed the folder for that host.
If you did, give the server the same folder: `-e HOSTBEAM_DIR=/your/folder` for
Claude Code, `--env HOSTBEAM_DIR=/your/folder` for Codex, or
`"env": { "HOSTBEAM_DIR": "/your/folder" }` in JSON.

## Tools

- **`latest_screenshot`** returns the most recent beam as images, with how long
  ago it arrived. If you beamed several files at once, it returns all of them,
  up to six, and names the rest.
- **`list_screenshots`** lists recent beams with file names, sizes and times. No
  image data.
- **`read_screenshot`** returns one file by name.

## What it reads

Only files Hostbeam delivered: names starting with `hostbeam-` with an image
extension, in that one folder. It doesn't look in subfolders, and it refuses a
name with a path in it. It never writes, moves or deletes anything.

It skips symlinks, and it won't read a folder that belongs to another user or
that any user can write to, because a file there may not be one you beamed.

JPEG, PNG, GIF and WebP come back as images, up to 3.75 MB each. Other formats
and larger files come back as a path instead: models only accept those four
formats, and model APIs refuse bigger images. When a beam holds several files,
`latest_screenshot` includes images up to 7.5 MB in total and names the rest.

## Check it by hand

It speaks newline-delimited JSON-RPC on stdin and stdout:

```sh
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_screenshots"}}' \
  | npx -y @hostbeam/mcp
```

## License

MIT

#!/usr/bin/env node
// Hostbeam prompt hook — attaches a newly beamed screenshot to your next
// message, so you never paste the path at all.
//
// Runs **on the host**, wired to a coding agent's prompt-submit event. It looks
// at the beam folder, and if a screenshot arrived that it has not already
// mentioned, it prints one line of context. The agent sees "there is a new
// screenshot at X"; you just type your question.
//
// The MCP server (hostbeam-mcp.mjs) and this hook solve the same problem from
// opposite ends, and are useful together. MCP lets the agent *ask* for a
// screenshot whenever it decides it wants one, and works in any client that
// speaks MCP. The hook *offers* one without being asked, but has to be wired
// per agent because there is no cross-agent hook standard.
//
// Deliberately narrow, for the same reasons as the server:
//
//   * Only Hostbeam's own deliveries (`hostbeam-*`, image extensions, one
//     directory). It cannot be pointed at another path.
//   * It prints a *path*, never image bytes. The agent decides whether to read
//     it. A hook that silently pushed pixels into every prompt would be both
//     expensive and a way to act on an image the user never chose to show.
//   * It reports each file once. Beam three screenshots and ask three
//     questions, and each question carries the one that is new — not all three
//     again.
//
// State lives in HOSTBEAM_STATE (default $XDG_STATE_HOME/hostbeam/seen, else
// ~/.local/state/hostbeam/seen). Delete it to re-offer everything.
//
// Configure with HOSTBEAM_DIR (default /tmp/hostbeam).
//
// Wiring it up is per-agent; apps/agent/README.md has the Claude Code snippet.
// The contract this file assumes is the lowest common denominator: it is run as
// a command, may receive JSON on stdin (which it does not need), and whatever
// it writes to stdout becomes context for the turn. Exit 0 always — a hook that
// fails must never block someone's prompt.

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { homedir } from "node:os";

const DIR = process.env.HOSTBEAM_DIR || "/tmp/hostbeam";

const STATE =
  process.env.HOSTBEAM_STATE ||
  join(
    process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"),
    "hostbeam",
    "seen",
  );

const EXTS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "tif",
  "tiff",
  "heic",
  "heif",
  "avif",
]);

/** Only what Hostbeam delivered: no separators, its own prefix, an image. */
export function servable(name) {
  if (name !== basename(name)) return false;
  if (!name.startsWith("hostbeam-")) return false;
  const ext = name.includes(".")
    ? name.slice(name.lastIndexOf(".") + 1).toLowerCase()
    : "";
  return EXTS.has(ext);
}

/** Beamed images newer than `since` (ms), newest first. */
export async function since(dir, sinceMs) {
  let names;
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const rows = [];
  for (const name of names) {
    if (!servable(name)) continue;
    try {
      const s = await stat(join(dir, name));
      if (s.isFile() && s.mtimeMs > sinceMs) rows.push({ name, at: s.mtimeMs });
    } catch {
      /* vanished mid-scan */
    }
  }
  return rows.sort((a, b) => b.at - a.at);
}

/** The line handed to the agent. Empty string means "say nothing". */
export function render(dir, rows) {
  if (!rows.length) return "";
  if (rows.length === 1) {
    return `The user just beamed a screenshot to this host: ${join(dir, rows[0].name)}\nRead it if it is relevant to what they are asking.`;
  }
  const list = rows.map((r) => `  ${join(dir, r.name)}`).join("\n");
  return `The user just beamed ${rows.length} screenshots to this host, newest first:\n${list}\nRead whichever are relevant to what they are asking.`;
}

async function readSeen() {
  try {
    const n = Number(await readFile(STATE, "utf8"));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

async function writeSeen(ms) {
  try {
    await mkdir(dirname(STATE), { recursive: true });
    await writeFile(STATE, String(ms));
  } catch {
    // Unwritable state means every beam is offered again — noisy, but the
    // prompt still goes through, which matters more.
  }
}

async function main() {
  const seen = await readSeen();
  const rows = await since(DIR, seen);
  if (!rows.length) return;
  process.stdout.write(`${render(DIR, rows)}\n`);
  await writeSeen(rows[0].at);
}

const isMain =
  process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]));
if (isMain) {
  // Never block a prompt: any failure is silent and exits clean.
  main()
    .catch((e) => process.stderr.write(`hostbeam-hook: ${e.stack || e}\n`))
    .finally(() => process.exit(0));
}

#!/usr/bin/env node
// Hostbeam MCP server — lets a coding agent see the screenshots you beamed,
// without you pasting a path.
//
// It runs **on the host**, next to the agent, and reads the folder Hostbeam
// beams into. The agent asks for the latest screenshot; the bytes come back as
// an image. That is the whole thing.
//
// Three properties are deliberate and worth keeping:
//
//   1. It only ever exposes files Hostbeam itself delivered — `hostbeam-*` with
//      an image extension, one directory, no recursion. It is not a way to read
//      arbitrary images off the box, and could not be turned into one by asking
//      it nicely for a different path.
//   2. Read-only. No write, no delete, no move. `host_cleanup` in the Mac app
//      already owns removing things, under a confirmation.
//   3. No dependencies. MCP over stdio is newline-delimited JSON-RPC, which is
//      short enough to write out. A server that runs on someone's server should
//      be auditable in one sitting and should not need `npm install` on a box
//      that may not have network access.
//
// Configure with HOSTBEAM_DIR (default /tmp/hostbeam).
//
// Usage, from an MCP client's config:
//   { "command": "node", "args": ["/path/to/hostbeam-mcp.mjs"] }

import { constants, realpathSync } from "node:fs";
import { lstat, open, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = process.env.HOSTBEAM_DIR || "/tmp/hostbeam";

/**
 * Extensions Hostbeam can deliver, and the MIME type each maps to. Delivering
 * is not the same as showing: see VIEWABLE.
 */
const TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  heic: "image/heic",
  heif: "image/heif",
  avif: "image/avif",
};

// An image becomes base64 in the agent's context, and every later request in
// the conversation carries it again. Anthropic's API refuses an image over 5 MB
// of base64 on Bedrock and Google Cloud (10 MB direct), which is 3.75 MB before
// encoding. A larger file is described by name instead, so the agent can say
// what happened rather than the whole request failing.
const MAX_BYTES = 3_750_000;

// And per result: six files at that size would be 30 MB of base64 in one reply,
// over Gemini's 20 MB request limit and most of Claude's 32 MB. Past this much
// image data, the rest of a beam is named rather than embedded.
const MAX_RESULT_BYTES = 7_500_000;

/** Bytes in the MB the limits above are written in. */
function mb(bytes) {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

// Anthropic's API refuses an image over 8000 px on either side and, once one
// request holds more than 20 images, any image over 2000 px, counting images
// from earlier turns because every request resends them. Both apps send 2000 px
// at most by default, but the Mac's limit can be raised or turned off. The
// server cannot see the conversation, so it counts what it has sent in this
// session (one stdio process serves one client session), and past 20 it names
// an image over 2000 px instead of embedding one that fails the next request.
const MAX_EDGE = 8000;
const MANY_IMAGES = 20;
const MANY_IMAGES_EDGE = 2000;

/** What this process has sent so far. */
const session = { imagesSent: 0 };

/**
 * The subset a model can actually look at. Both apps beam everything in TYPES
 * — `beam.rs` and `Beamer.swift` share that list, and an iPhone photo is HEIC
 * by default — but a vision request takes only these four. The rest still
 * list, and `read_screenshot` still resolves them by name; they are described
 * rather than embedded, because handing one over as an image block builds a
 * request the model cannot read, and the agent sees a failure it cannot act on
 * instead of a path it can.
 */
const VIEWABLE = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

/**
 * Protocol revisions this server has been checked against, newest first. It
 * implements tools only — no resources, prompts or sampling — so conformance
 * is narrow. Add a revision here after reading it, not before.
 *
 * 2025-11-25 went in once bad arguments became tool errors and an unknown tool
 * a protocol error, the one change in it a tools-only server had to make.
 * 2026-07-28 has no initialize at all; it is served beside these, request by
 * request (see MODERN_VERSIONS).
 */
const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

/** The version npm carries; the tests hold it to `publish/package.json`. */
const VERSION = "0.1.4";

// A drop of twenty is one gesture but twenty base64 images. Show the first few
// and name the rest, so a large beam informs the agent instead of flooding it.
const MAX_IN_DROP = 6;

/**
 * Names this server will serve: what Hostbeam delivered, and nothing else.
 *
 * Only the characters `beam.rs` lets into a remote name (`slug`); the iPhone's
 * names use fewer. No separator can appear, so no name reaches outside the
 * folder. And a name goes to the model as text, so one carrying a newline or a
 * sentence would read as part of what the server said.
 */
const NAME = /^hostbeam-[A-Za-z0-9._-]+\.([A-Za-z0-9]+)$/;

function servable(name) {
  const match = typeof name === "string" ? NAME.exec(name) : null;
  return match !== null && Object.hasOwn(TYPES, match[1].toLowerCase());
}

/**
 * The beam time encoded in a remote name, or null. `beam.rs` composes
 * `hostbeam-{stamp}[-{label}].{ext}` and gives every file in one gesture the
 * same stamp on purpose — "the files belong together, so they should sort
 * together" — which makes that stamp the only thing identifying a drop.
 *
 * A real stamp is epoch milliseconds, so it is 13 digits and counting. Anything
 * shorter is a name that merely looks like one, and is not read as a time.
 */
function stampOf(name) {
  const dot = name.lastIndexOf(".");
  const rest = (dot === -1 ? name : name.slice(0, dot)).slice("hostbeam-".length);
  const dash = rest.indexOf("-");
  const head = dash === -1 ? rest : rest.slice(0, dash);
  if (!/^\d+$/.test(head)) return null;
  const n = Number(head);
  return n >= 1e12 ? n : null;
}

/**
 * What identifies the gesture a file came from, or null. Hosts hold two shapes:
 * the epoch-millisecond stamp both apps compose, and the iPhone's
 * `yyyy-MM-dd-HHmmss` from before 2026-09-13 — one date per batch, with `-2`,
 * `-3` behind it — which old files and older builds still carry. That date has
 * no time zone, so it groups a beam but is never read as a time.
 */
const LEGACY_IPHONE = /^hostbeam-(\d{4}-\d{2}-\d{2}-\d{6})(?:-\d+)?\.[A-Za-z0-9]+$/;

function beamKey(name) {
  const stamp = stampOf(name);
  if (stamp !== null) return `ms:${stamp}`;
  const legacy = LEGACY_IPHONE.exec(name);
  return legacy ? `dt:${legacy[1]}` : null;
}

/** A beam time as something a model can judge without doing arithmetic. */
function ago(ms) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/** The files of one gesture: everything sharing the newest row's beam key. */
function newestDrop(rows) {
  if (!rows.length) return [];
  const { key } = rows[0];
  // No readable key means nothing to group it with; it stands alone.
  if (key === null) return [rows[0]];
  return rows.filter((r) => r.key === key);
}

/** Rows folded into gestures, in the order they first appear. */
function drops(rows) {
  const out = [];
  const seen = new Map();
  for (const r of rows) {
    const key = r.key === null ? `solo:${r.name}` : r.key;
    let group = seen.get(key);
    if (!group) {
      group = { beamedAt: r.beamedAt, files: [] };
      seen.set(key, group);
      out.push(group);
    }
    group.files.push(r);
  }
  return out;
}

function mimeOf(name) {
  return TYPES[name.slice(name.lastIndexOf(".") + 1).toLowerCase()];
}

/** Every beamed image in the folder, newest first. */
async function listShots() {
  let names;
  try {
    names = await readdir(DIR);
  } catch {
    return [];
  }
  const rows = [];
  for (const name of names) {
    if (!servable(name)) continue;
    try {
      // lstat, not stat: a symlink named like a beam is not one. Followed,
      // `hostbeam-1.png -> ~/.ssh/id_ed25519` would go to the model as an
      // image, planted by anyone who can write to the folder.
      const s = await lstat(join(DIR, name));
      if (s.isFile()) {
        rows.push({
          name,
          bytes: s.size,
          modified: s.mtime.toISOString(),
          key: beamKey(name),
          // The gesture's own time where the name carries it; the file's
          // otherwise, which is when scp finished rather than when it was taken.
          beamedAt: stampOf(name) ?? s.mtimeMs,
        });
      }
    } catch {
      /* vanished between readdir and stat — skip it */
    }
  }
  return rows.sort((a, b) => (a.modified < b.modified ? 1 : -1));
}

/**
 * Why this folder cannot be trusted, or null. /tmp is shared: whoever creates
 * /tmp/hostbeam first owns it, and anyone who can write to a folder can drop a
 * file named like a beam into it. So the server reads a folder only when it
 * belongs to the user running it and other users cannot write to it.
 */
async function folderProblem() {
  let s;
  try {
    s = await stat(DIR);
  } catch {
    return null; // no folder yet: nothing to read, and the tools say so
  }
  if (typeof process.getuid === "function" && s.uid !== process.getuid()) {
    return `Hostbeam will not read ${DIR}: it belongs to another user, so what is in it may not be what this user beamed. Remove it, or set HOSTBEAM_DIR and Hostbeam's remote folder to a folder this user owns.`;
  }
  if (s.mode & 0o002) {
    return `Hostbeam will not read ${DIR}: any user on this machine can write to it, so what is in it may not be what this user beamed. \`chmod o-w ${DIR}\` fixes it.`;
  }
  return null;
}

/**
 * A beamed file's bytes. O_NOFOLLOW makes the open itself fail on a symlink,
 * so a link swapped in after the folder was listed is refused too.
 */
async function readBeam(name) {
  let handle;
  try {
    // O_NONBLOCK too: a FIFO swapped in under a beam's name would otherwise
    // hold the open until a writer that never comes.
    handle = await open(
      join(DIR, name),
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
  } catch (e) {
    if (e.code === "ELOOP") throw new Error(`${name} is a symlink, not a file Hostbeam delivered`);
    throw e;
  }
  try {
    const s = await handle.stat();
    if (!s.isFile()) throw new Error(`${name} is not a regular file`);
    if (s.size > MAX_BYTES) throw new Error(`${name} grew past ${mb(MAX_BYTES)} after it was listed`);
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

/**
 * An image's width and height from its header, or null. Just enough of PNG,
 * GIF, WebP and JPEG to read the size without decoding anything, since the
 * server has no dependencies to decode with.
 */
function dimensionsOf(buf) {
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47 && buf.toString("ascii", 12, 16) === "IHDR") {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length >= 10 && buf.toString("ascii", 0, 4) === "GIF8") {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }
  if (buf.length >= 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8 ") {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === "VP8L") {
      const bits = buf.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") {
      return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
    }
    return null;
  }
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      if (marker === 0xff) {
        i += 1; // fill byte
        continue;
      }
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
        i += 2; // markers with no length
        continue;
      }
      // SOF0–SOF15 carry the frame size, except DHT (C4), JPG (C8) and DAC (CC).
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

/** One image as an MCP image content block, or a text block explaining why not. */
async function imageContent(row) {
  const mime = mimeOf(row.name);
  if (!VIEWABLE.has(mime)) {
    return [
      {
        type: "text",
        text: `${row.name} is ${mime}, which cannot be shown inline: only JPEG, PNG, GIF and WebP can. It beamed fine and is on the host at ${join(DIR, row.name)}.`,
      },
    ];
  }
  if (row.bytes > MAX_BYTES) {
    return [
      {
        type: "text",
        text: `${row.name} is ${mb(row.bytes)}, over the ${mb(MAX_BYTES)} a model's API accepts for one image, so it was not read. It is on the host at ${join(DIR, row.name)}.`,
      },
    ];
  }
  const data = await readBeam(row.name);
  const size = dimensionsOf(data);
  const edge = size ? Math.max(size.width, size.height) : 0;
  const at = join(DIR, row.name);
  if (edge > MAX_EDGE) {
    return [
      {
        type: "text",
        text: `${row.name} is ${size.width}×${size.height} px, over the ${MAX_EDGE} px a model's API accepts, so it was not embedded. It is on the host at ${at}.`,
      },
    ];
  }
  if (edge > MANY_IMAGES_EDGE && session.imagesSent >= MANY_IMAGES) {
    return [
      {
        type: "text",
        text: `${row.name} is ${size.width}×${size.height} px and was not embedded. This session has already been sent ${session.imagesSent} images, and once a conversation holds more than ${MANY_IMAGES}, Claude's API refuses any image over ${MANY_IMAGES_EDGE} px and fails the whole request. It is on the host at ${at}. A new conversation, or a smaller image size in Hostbeam's settings, avoids this.`,
      },
    ];
  }
  session.imagesSent += 1;
  return [
    {
      type: "text",
      text: `${row.name} — beamed ${ago(row.beamedAt)} (${row.modified})`,
    },
    {
      type: "image",
      data: data.toString("base64"),
      mimeType: mime,
    },
  ];
}

// Every tool only reads what Hostbeam delivered (ADR 0020), and says so in the
// annotations MCP defines for that. Clients act on them: Codex runs a tool
// marked read-only without asking, asks before any other, and refuses outright
// when the user has turned approvals off, which is how the first Codex test on
// a real host failed (2026-09-14).
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

// Sent once, at initialize, and shown to the model with the tools; Codex makes
// it the description of this server's tool group. A model asked about "the
// screenshot I just sent" otherwise looks for a chat attachment, finds none,
// and says so without calling anything, which is what Codex did (2026-09-14).
const INSTRUCTIONS =
  "Screenshots the user sends to this machine with Hostbeam, from their Mac or iPhone, arrive as image files here, not as attachments in the conversation. When the user mentions a screenshot they sent and none is attached, call latest_screenshot before saying you cannot see it. list_screenshots shows earlier ones, and read_screenshot opens one by name.";

const TOOLS = [
  {
    name: "latest_screenshot",
    title: "Latest screenshot",
    annotations: READ_ONLY,
    description:
      "Read the latest beam: every screenshot the user sent to this host with Hostbeam in one gesture (several, if they beamed several), with how long ago it arrived. Use this when they refer to a screenshot, to something being broken on screen, or ask you to look at what they are seeing. If it does not match what they describe, or arrived long before they asked, say so rather than assuming it is what they meant.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "list_screenshots",
    title: "List screenshots",
    annotations: READ_ONLY,
    description:
      "List the screenshots the user has beamed to this host, grouped by beam, newest first, with sizes and how long ago. Metadata only — no image data — so it is cheap to call before deciding which to read.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          description: "Default 10.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "read_screenshot",
    title: "Read screenshot",
    annotations: READ_ONLY,
    description:
      "Read one specific beamed screenshot by its file name, as listed by list_screenshots.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          pattern: NAME.source,
          description:
            "A file name exactly as list_screenshots gives it, such as hostbeam-1788875278869.png.",
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
];

/** A result the model reads as the tool failing, with the reason. */
function toolError(text) {
  return { content: [{ type: "text", text }], isError: true };
}

/**
 * Why these arguments do not fit the tool's input schema, or null. Checked here
 * rather than trusted to the client, and reported as a tool error (SEP-1303),
 * so the model sees what it got wrong and can call again.
 */
function argumentProblem(tool, args = {}) {
  if (args === null || typeof args !== "object" || Array.isArray(args)) {
    return "arguments must be an object";
  }
  const { properties, required = [] } = tool.inputSchema;
  for (const key of Object.keys(args)) {
    if (!Object.hasOwn(properties, key)) return `unknown argument: ${key}`;
  }
  for (const key of required) {
    if (!Object.hasOwn(args, key)) return `missing argument: ${key}`;
  }
  for (const [key, value] of Object.entries(args)) {
    const schema = properties[key];
    if (
      schema.type === "integer" &&
      !(Number.isInteger(value) && value >= schema.minimum && value <= schema.maximum)
    ) {
      return `${key} must be an integer from ${schema.minimum} to ${schema.maximum}`;
    }
    if (schema.type === "string" && typeof value !== "string") {
      return `${key} must be a string`;
    }
  }
  return null;
}

/** Run a listed tool; returns an MCP CallToolResult. */
async function callTool(name, args) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`unknown tool: ${name}`);
  const badArguments = argumentProblem(tool, args);
  if (badArguments) return toolError(`Hostbeam: ${badArguments}.`);
  const problem = await folderProblem();
  if (problem) return toolError(problem);

  if (name === "latest_screenshot") {
    const rows = await listShots();
    if (!rows.length) {
      return {
        content: [
          {
            type: "text",
            text: `No screenshots have been beamed to ${DIR} yet. The user beams one with Hostbeam: ⌘⇧7 on their Mac, or the share sheet on their iPhone.`,
          },
        ],
      };
    }
    const drop = newestDrop(rows);
    if (drop.length === 1) return { content: await imageContent(drop[0]) };

    // One gesture can carry several files, and they were sent together because
    // they belong together — so the latest screenshot is the latest *beam*. It
    // shows up to MAX_IN_DROP files and MAX_RESULT_BYTES of image data, and
    // names the rest, so a large beam informs the agent instead of producing a
    // request its model's API refuses.
    const shown = [];
    let budget = MAX_RESULT_BYTES;
    for (const row of drop) {
      if (shown.length === MAX_IN_DROP) break;
      const embeds = VIEWABLE.has(mimeOf(row.name)) && row.bytes <= MAX_BYTES;
      if (embeds && row.bytes > budget) break;
      shown.push(row);
      if (embeds) budget -= row.bytes;
    }
    const rest = drop.slice(shown.length);
    const content = [
      {
        type: "text",
        text: `${drop.length} screenshots were beamed together ${ago(drop[0].beamedAt)}${
          rest.length ? `; the first ${shown.length} follow` : ""
        }.`,
      },
    ];
    for (const row of shown) content.push(...(await imageContent(row)));
    if (rest.length) {
      content.push({
        type: "text",
        text: `Also in that beam, read one at a time with read_screenshot if you need them:\n${rest
          .map((r) => `  ${r.name}`)
          .join("\n")}`,
      });
    }
    return { content };
  }

  if (name === "list_screenshots") {
    const limit = args?.limit ?? 10;
    const rows = (await listShots()).slice(0, limit);
    if (!rows.length) {
      return { content: [{ type: "text", text: `No screenshots in ${DIR}.` }] };
    }
    return {
      content: [
        {
          type: "text",
          text: drops(rows)
          .map((g) => {
            const head =
              g.files.length > 1
                ? `beamed ${ago(g.beamedAt)} — ${g.files.length} files in one beam`
                : `beamed ${ago(g.beamedAt)}`;
            const body = g.files
              .map((f) => `  ${f.name}\t${f.bytes} bytes\t${f.modified}`)
              .join("\n");
            return `${head}\n${body}`;
          })
          .join("\n"),
        },
      ],
    };
  }

  if (name === "read_screenshot") {
    const wanted = args.name;
    // Checked against the same rule the listing uses, not against the listing
    // itself: a name that is not servable must be refused whether or not it
    // happens to exist, so this can never be talked into reading another path.
    if (!servable(wanted)) {
      return toolError(
        `Refused: this server only reads Hostbeam's own images (hostbeam-*) in ${DIR}.`,
      );
    }
    const rows = await listShots();
    const row = rows.find((r) => r.name === wanted);
    if (!row) return toolError(`${wanted} is not in ${DIR}.`);
    return { content: await imageContent(row) };
  }

  throw new Error(`unknown tool: ${name}`);
}

// ---- JSON-RPC over stdio ---------------------------------------------------
// stdout carries protocol only. Anything diagnostic goes to stderr, or it
// corrupts the stream and the client sees a dead server.

function send(msg) {
  process.stdout.write(`${JSON.stringify(msg)}\n`);
}

/** Requests being worked on, and those the client has since cancelled. */
const pending = new Set();
const cancelled = new Set();

/** The one reply a request gets, unless the client cancelled it meanwhile. */
function answer(id, body) {
  pending.delete(id);
  if (cancelled.delete(id)) return;
  send({ jsonrpc: "2.0", id, ...body });
}

function reply(id, result) {
  answer(id, { result });
}

function fail(id, code, message, data) {
  answer(id, { error: data === undefined ? { code, message } : { code, message, data } });
}

const SERVER_INFO = {
  name: "hostbeam",
  version: VERSION,
  title: "Hostbeam",
  websiteUrl: "https://hostbeam.app",
};

/**
 * tools/call in either era. A tool the server never listed is the client's
 * mistake, so it is a protocol error; everything a listed tool reports, bad
 * arguments included, is a result the model can read and act on.
 */
async function toolCall(params) {
  const tool = TOOLS.find((t) => t.name === params?.name);
  if (!tool) return { error: [-32602, `unknown tool: ${params?.name}`] };
  try {
    return { result: await callTool(tool.name, params.arguments) };
  } catch (e) {
    // A tool failure is a result too: the agent should be told what went wrong
    // rather than seeing the server break.
    return { result: toolError(`Hostbeam: ${e.message}`) };
  }
}

// ---- The 2026-07-28 era ----------------------------------------------------
// This revision has no initialize. Every request carries its protocol version
// and the client's capabilities in `_meta`, and a client learns about the
// server from `server/discover`. The spec lets one process serve both eras, so
// each request is served by what it carries: an `io.modelcontextprotocol/` key
// in `_meta` means this era, anything else the initialize era, as before. A
// client that speaks both probes with an enveloped discover and falls back to
// initialize if that fails.

/** Revisions served without initialize. */
const MODERN_VERSIONS = ["2026-07-28"];
const META = "io.modelcontextprotocol/";

// The tool list is the same for every client and every call, so any cache may
// keep it for an hour. `ttlMs` is how long a result may be reused unasked.
const CACHE = { ttlMs: 3_600_000, cacheScope: "public" };

/**
 * Whether a request carries the 2026-07-28 envelope. An empty `_meta`, which
 * the Python SDK sends on its initialize-era requests, does not.
 */
function isModern(params) {
  const meta = params?._meta;
  return (
    meta !== null && typeof meta === "object" && Object.keys(meta).some((k) => k.startsWith(META))
  );
}

/** A result in this era: marked complete, and naming the server that sent it. */
function modern(result) {
  return {
    ...result,
    resultType: "complete",
    _meta: { ...result._meta, [`${META}serverInfo`]: SERVER_INFO },
  };
}

async function handleModern(id, method, params) {
  const meta = params._meta;
  const version = meta[`${META}protocolVersion`];
  const capabilities = meta[`${META}clientCapabilities`];
  if (typeof version !== "string" || capabilities === null || typeof capabilities !== "object") {
    return fail(
      id,
      -32602,
      `Request is missing the required _meta envelope for protocol revision ${MODERN_VERSIONS[0]} (${META}protocolVersion, ${META}clientCapabilities)`,
    );
  }
  if (!MODERN_VERSIONS.includes(version)) {
    return fail(id, -32022, "Unsupported protocol version", {
      supported: MODERN_VERSIONS,
      requested: version,
    });
  }
  switch (method) {
    case "server/discover":
      return reply(
        id,
        modern({
          supportedVersions: MODERN_VERSIONS,
          capabilities: { tools: {} },
          instructions: INSTRUCTIONS,
          ...CACHE,
        }),
      );
    case "tools/list":
      return reply(id, modern({ tools: TOOLS, ...CACHE }));
    case "tools/call": {
      // A tool call is not cacheable, so it carries no ttlMs or cacheScope.
      const { error, result } = await toolCall(params);
      return error ? fail(id, ...error) : reply(id, modern(result));
    }
    default:
      // initialize, ping and logging/setLevel are not methods in this era.
      return fail(id, -32601, `method not found: ${method}`);
  }
}

async function handle(msg) {
  // A batch, a bare value or null is not a request with an id to answer, so it
  // gets JSON-RPC's answer for that, under a null id.
  if (msg === null || typeof msg !== "object" || Array.isArray(msg)) {
    return fail(null, -32600, "invalid request");
  }
  const { id, method, params } = msg;
  // Notifications have no id and take no response. The one that changes
  // anything is a cancellation: the request it names gets no reply.
  if (id === undefined) {
    if (method === "notifications/cancelled" && pending.has(params?.requestId)) {
      cancelled.add(params.requestId);
    }
    return;
  }
  // Nor does a response: this server never sends a request for one to answer.
  if (method === undefined && ("result" in msg || "error" in msg)) return;
  pending.add(id);
  if (isModern(params)) return handleModern(id, method, params);

  switch (method) {
    case "initialize": {
      // Echo a revision this server has been checked against; answer anything
      // else with the newest one it has. This used to echo whatever the client
      // named, reasoning that refusing an unfamiliar version would fail a
      // client that would have worked — but echoing is a claim of conformance,
      // and it is not refused here: a client naming a future revision is told
      // what this speaks and decides for itself, which is what the handshake
      // is for.
      const asked = params?.protocolVersion;
      return reply(id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked)
          ? asked
          : PROTOCOL_VERSIONS[0],
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case "tools/list":
      return reply(id, { tools: TOOLS });
    case "tools/call": {
      const { error, result } = await toolCall(params);
      return error ? fail(id, ...error) : reply(id, result);
    }
    case "ping":
      return reply(id, {});
    default:
      return fail(id, -32601, `method not found: ${method}`);
  }
}

function main() {
  let buf = "";
  // Every handle() is async, and stdin closing must not cut one short. A client
  // that writes its requests and closes the pipe — which is what the smoke test
  // in the README does — would otherwise get replies only for the methods that
  // happen to answer without awaiting anything, and silence for every tool call.
  const inflight = new Set();
  const track = (p) => {
    inflight.add(p);
    p.finally(() => inflight.delete(p));
  };
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        // JSON-RPC answers even what it cannot parse, under a null id, so a
        // client waiting on a malformed request is not left hanging.
        process.stderr.write(`hostbeam-mcp: unparseable line\n`);
        fail(null, -32700, "parse error");
        continue;
      }
      track(
        handle(msg).catch((e) => {
          process.stderr.write(`hostbeam-mcp: ${e.stack || e}\n`);
          if (msg?.id !== undefined)
            fail(msg.id, -32603, String(e.message || e));
        }),
      );
    }
  });
  process.stdin.on("end", async () => {
    await Promise.allSettled([...inflight]);
    // Exit once stdout has flushed. On a pipe the last writes can still be
    // queued, and exiting then cuts a large image reply off mid-line.
    process.stdout.write("", () => process.exit(0));
  });
}

// Importable for tests; only speaks the protocol when run directly. Compared by
// real path, not by name: npx and `npm install -g` run a package's bin through
// a symlink named `hostbeam-mcp`, and matching names would exit silently there,
// which is the launch the published package exists for.
function launchedDirectly() {
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false; // no script path at all, as under `node -e`
  }
}
if (launchedDirectly()) main();

export {
  DIR,
  INSTRUCTIONS,
  MAX_BYTES,
  MAX_IN_DROP,
  MAX_RESULT_BYTES,
  MANY_IMAGES,
  MODERN_VERSIONS,
  PROTOCOL_VERSIONS,
  TOOLS,
  VERSION,
  VIEWABLE,
  ago,
  beamKey,
  callTool,
  dimensionsOf,
  drops,
  handle,
  listShots,
  newestDrop,
  servable,
  session,
  stampOf,
};

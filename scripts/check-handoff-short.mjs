#!/usr/bin/env node
// current-handoff.md must stay short enough that people actually read it.
//
// The rule already existed — contribution-protocol.md says "Keep
// docs/agents/current-handoff.md short. Put detail in the relevant source
// document, ADR, or progress file." It had no check, so the file reached 492
// lines of narrative, which is precisely how progress.md went stale before it
// was rewritten and given a check of its own.
//
// The cap is a smell test, not a budget. Failing it does not mean "delete
// something": it means a section has stopped describing what the next person
// needs before touching the code, and belongs in handoff-log.md, an ADR, or a
// milestone. Move it there — nothing is ever thrown away. A standing trap goes
// to pitfalls.md instead: those used to live here and took a third of the cap.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = "docs/agents/current-handoff.md";
const MAX = 90;

const lines = readFileSync(join(root, FILE), "utf8").split("\n");
// Trailing blank lines are not content.
while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

if (lines.length > MAX) {
  console.error(`${FILE} is ${lines.length} lines; the cap is ${MAX}.`);
  console.error("");
  console.error("Something in it has stopped being handoff state and become history.");
  console.error("Move that section verbatim to the END of docs/agents/handoff-log.md,");
  console.error("or to the ADR / milestone it belongs to, and leave a pointer.");
  console.error("A trap that stays true after the work is done goes to docs/agents/pitfalls.md.");
  console.error("");
  console.error("Sections, longest first:");
  const heads = [];
  lines.forEach((l, i) => {
    if (l.startsWith("## ")) heads.push({ title: l.slice(3), at: i });
  });
  heads
    .map((h, i) => ({ ...h, size: (heads[i + 1]?.at ?? lines.length) - h.at }))
    .sort((a, b) => b.size - a.size)
    .forEach((h) => console.error(`  ${String(h.size).padStart(4)}  ${h.title}`));
  process.exit(1);
}

console.log(`current-handoff.md is ${lines.length} lines (cap ${MAX}) — still readable.`);

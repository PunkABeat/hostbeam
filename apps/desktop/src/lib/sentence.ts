// What a beam puts on the clipboard, the way Rust renders it (beam.rs
// `render_sentence`): just the paths by default, or the template with `{path}`
// substituted when "Add a sentence around the path" is on.

import { isImagePath } from "./files";

/** The sentence nobody has changed, used once the sentence is switched on —
 *  config.rs `DEFAULT_SENTENCE`. */
export const DEFAULT_SENTENCE = "Use this screenshot: {path}";

/** What the default says for a file that is not a picture — beam.rs
 *  `FILE_SENTENCE`. "Use this screenshot" in front of a PDF would be the one
 *  wrong word in the line. */
export const FILE_SENTENCE = "Use this file: {path}";

/** The template for one path: the file sentence for a non-picture while the
 *  template is still the default, and the template otherwise — a template
 *  someone wrote is never rewritten. Mirrors beam.rs `template_for`, so the
 *  done card, a Recent copy and the clipboard all say the same thing. */
export function templateFor(template: string, path: string): string {
  return template === DEFAULT_SENTENCE && !isImagePath(path) ? FILE_SENTENCE : template;
}

/** One path's line under a template; the bare path when it has no token. */
export function renderSentence(template: string, path: string): string {
  const tpl = templateFor(template || "", path);
  return tpl.includes("{path}") ? tpl.split("{path}").join(path) : path;
}

/** Exactly what a beam of these paths put on the clipboard — what a Recent
 *  copy of one file, or of a whole drop, hands back. Mirrors beam.rs
 *  `render_sentence`:
 *
 *  - Just the paths (the default, or a template with no token), one line, a
 *    space apart. A lone path is the one form every agent tested attaches as
 *    the picture itself; Claude Code and Gemini CLI do it for several a space
 *    apart too, since they split a paste at spaces, not line breaks.
 *  - A sentence: the template once per path, one line each. */
export function clipboardText(template: string, copySentence: boolean, paths: string[]): string {
  if (!(copySentence && (template || "").includes("{path}"))) return paths.join(" ");
  return paths.map((p) => renderSentence(template, p)).join("\n");
}

/** The template split around its `{path}` tokens, for rendering the path
 *  highlighted: the pieces between tokens, in order. `["Use ", ""]` for the
 *  default template; a single piece when there is no token. */
export function sentenceParts(template: string): string[] {
  return (template || "").split("{path}");
}

import { describe, expect, it } from "vitest";

import {
  clipboardText,
  DEFAULT_SENTENCE,
  renderSentence,
  sentenceParts,
  templateFor,
} from "./sentence";

describe("sentence", () => {
  it("substitutes every token, and copies the bare path when there is none", () => {
    expect(renderSentence("Use this screenshot: {path}", "/t/a.png")).toBe(
      "Use this screenshot: /t/a.png",
    );
    expect(renderSentence("see {path} ({path})", "/x.png")).toBe("see /x.png (/x.png)");
    expect(renderSentence("no token", "/x.png")).toBe("/x.png");
    expect(renderSentence("", "/x.png")).toBe("/x.png");
  });

  it("copies just the paths by default, one line, a space apart — as Rust does", () => {
    // A lone path is what every agent tested attaches as the picture; Claude
    // Code and Gemini CLI split a paste at spaces, so several work there too.
    expect(clipboardText(DEFAULT_SENTENCE, false, ["/t/a.png"])).toBe("/t/a.png");
    expect(clipboardText(DEFAULT_SENTENCE, false, ["/a.png", "/b.png", "/c.pdf"])).toBe(
      "/a.png /b.png /c.pdf",
    );
    // A template with no token is bare paths too, whatever the switch says.
    expect(clipboardText("no token", true, ["/a.png", "/b.png"])).toBe("/a.png /b.png");
    expect(clipboardText("", true, ["/a.png"])).toBe("/a.png");
  });

  it("renders a drop one sentence per line when the sentence is on", () => {
    expect(clipboardText("look at {path}", true, ["/a.png", "/b.png"])).toBe(
      "look at /a.png\nlook at /b.png",
    );
    expect(clipboardText("x {path}", true, [])).toBe("");
  });

  it("splits a template around its tokens for highlighting", () => {
    expect(sentenceParts("Use this screenshot: {path}")).toEqual(["Use this screenshot: ", ""]);
    expect(sentenceParts("plain")).toEqual(["plain"]);
  });

  it("says file, not screenshot, for a non-picture under the untouched default", () => {
    expect(renderSentence(DEFAULT_SENTENCE, "/t/r.pdf")).toBe("Use this file: /t/r.pdf");
    expect(renderSentence(DEFAULT_SENTENCE, "/t/hostbeam-1-Makefile")).toBe(
      "Use this file: /t/hostbeam-1-Makefile",
    );
    expect(renderSentence(DEFAULT_SENTENCE, "/t/a.PNG")).toBe("Use this screenshot: /t/a.PNG");
    expect(clipboardText(DEFAULT_SENTENCE, true, ["/t/a.png", "/t/b.pdf"])).toBe(
      "Use this screenshot: /t/a.png\nUse this file: /t/b.pdf",
    );
  });

  it("never rewrites a template someone wrote", () => {
    expect(templateFor("look at {path}", "/t/r.pdf")).toBe("look at {path}");
    expect(renderSentence("Use this screenshot please: {path}", "/t/r.pdf")).toBe(
      "Use this screenshot please: /t/r.pdf",
    );
  });

  it("matches the Rust core's default, word for word", () => {
    expect(DEFAULT_SENTENCE).toBe("Use this screenshot: {path}");
  });
});

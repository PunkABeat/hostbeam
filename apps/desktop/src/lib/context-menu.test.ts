// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import { shouldSuppressContextMenu } from "./context-menu";

afterEach(() => {
  document.body.replaceChildren();
});

describe("shouldSuppressContextMenu", () => {
  it("suppresses on non-editable elements", () => {
    const div = document.createElement("div");
    expect(shouldSuppressContextMenu(div)).toBe(true);
  });

  it("keeps the native menu on inputs and textareas", () => {
    expect(shouldSuppressContextMenu(document.createElement("input"))).toBe(false);
    expect(shouldSuppressContextMenu(document.createElement("textarea"))).toBe(false);
  });

  it("keeps the menu inside a contenteditable region (via closest)", () => {
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    const child = document.createElement("span");
    editable.appendChild(child);
    document.body.appendChild(editable);
    expect(shouldSuppressContextMenu(child)).toBe(false);
  });

  it("suppresses when the target is null", () => {
    expect(shouldSuppressContextMenu(null)).toBe(true);
  });
});

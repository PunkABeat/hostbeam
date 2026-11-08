import { describe, expect, it } from "vitest";

import { hotkeyKeyFrom } from "./hotkey-keys";

describe("hotkeyKeyFrom", () => {
  it("records the physical digit even when Shift turned it into a symbol", () => {
    // ⌘⇧7 on a US keyboard: key is "&", code is Digit7. The combo is "7".
    expect(hotkeyKeyFrom({ key: "&", code: "Digit7" })).toBe("7");
    expect(hotkeyKeyFrom({ key: "7", code: "Digit7" })).toBe("7");
    expect(hotkeyKeyFrom({ key: "'", code: "Digit7" })).toBe("7"); // fr layout, unshifted
  });

  it("records letters by key, upper-cased, whatever the layout produced", () => {
    expect(hotkeyKeyFrom({ key: "a", code: "KeyA" })).toBe("A");
    expect(hotkeyKeyFrom({ key: "A", code: "KeyA" })).toBe("A");
    expect(hotkeyKeyFrom({ key: "å", code: "KeyA" })).toBe("A"); // ⌥A on macOS
  });

  it("names arrows, enter, space and tab the way the accelerator expects", () => {
    expect(hotkeyKeyFrom({ key: "ArrowUp", code: "ArrowUp" })).toBe("up");
    expect(hotkeyKeyFrom({ key: "Enter", code: "NumpadEnter" })).toBe("enter");
    expect(hotkeyKeyFrom({ key: " ", code: "Space" })).toBe("space");
    expect(hotkeyKeyFrom({ key: "Tab", code: "Tab" })).toBe("tab");
    expect(hotkeyKeyFrom({ key: "F5", code: "F5" })).toBe("F5");
  });

  it("keeps punctuation as the character, and ignores a bare modifier", () => {
    expect(hotkeyKeyFrom({ key: ",", code: "Comma" })).toBe(",");
    expect(hotkeyKeyFrom({ key: "Shift", code: "ShiftLeft" })).toBeNull();
    expect(hotkeyKeyFrom({ key: "Meta", code: "MetaLeft" })).toBeNull();
  });
});

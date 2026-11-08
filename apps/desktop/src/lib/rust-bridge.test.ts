// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import { onRustMessage, receive, resetRustBridgeForTests, type RustMessage } from "./rust-bridge";

afterEach(resetRustBridgeForTests);

describe("rust-bridge", () => {
  it("is what Rust calls, installed before any view mounts", () => {
    expect(window.__hbReceive).toBe(receive);
  });

  it("hands a message to the subscribers of its kind, with its fields", () => {
    const got: RustMessage[] = [];
    onRustMessage("setHost", (m) => got.push(m));
    onRustMessage("beam", (m) => got.push(m));
    receive({ kind: "setHost", id: "prod" });
    receive({ kind: "progress", sent: 1, total: 3 }); // nobody listening
    expect(got).toEqual([{ kind: "setHost", id: "prod" }]);
  });

  it("stops after unsubscribe, and one throwing handler does not stop the others", () => {
    const got: string[] = [];
    const off = onRustMessage("beam", () => got.push("first"));
    onRustMessage("beam", () => {
      throw new Error("boom");
    });
    onRustMessage("beam", () => got.push("third"));
    receive({ kind: "beam" });
    off();
    receive({ kind: "beam" });
    expect(got).toEqual(["first", "third", "third"]);
  });

  it("ignores anything that is not a message", () => {
    onRustMessage("beam", () => {
      throw new Error("must not be called");
    });
    for (const junk of [null, undefined, 42, "beam", {}, { kind: 7 }, { kind: "later-verb" }]) {
      expect(() => receive(junk)).not.toThrow();
    }
  });
});

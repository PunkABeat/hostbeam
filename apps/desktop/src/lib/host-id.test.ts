import { describe, expect, it } from "vitest";

import { slugId } from "./host-id";

describe("slugId", () => {
  it("slugs the name and falls back to 'host'", () => {
    expect(slugId("My Box", [])).toBe("my-box");
    expect(slugId("  Prod (EU) #2 ", [])).toBe("prod-eu-2");
    expect(slugId("", [])).toBe("host");
    expect(slugId("🎉", [])).toBe("host");
  });

  it("numbers a slug that is already in use, from 2", () => {
    expect(slugId("My Box", ["my-box"])).toBe("my-box-2");
    expect(slugId("My Box", ["my-box", "my-box-2"])).toBe("my-box-3");
  });
});

import { describe, expect, it } from "vitest";

import { pickLicense } from "./keygen";

describe("pickLicense", () => {
  it("extracts id and key from a keygen license document", () => {
    const doc = { id: "lic_1", type: "licenses", attributes: { key: "HB-KEY-1234" } };
    expect(pickLicense(doc)).toEqual({ id: "lic_1", key: "HB-KEY-1234" });
  });

  it("returns null for empty or malformed documents", () => {
    expect(pickLicense(null)).toBeNull();
    expect(pickLicense({})).toBeNull();
    expect(pickLicense({ id: "lic_1" })).toBeNull();
    expect(pickLicense({ attributes: { key: "k" } })).toBeNull();
  });
});

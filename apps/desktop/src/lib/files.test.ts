import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { IMAGE_EXTENSIONS, extOf, fileLabel, isImagePath } from "./files";

describe("files", () => {
  it("tells a picture by its extension, whatever its case", () => {
    for (const p of ["/t/a.png", "/t/A.PNG", "shot.jpeg", "x.heic", "hostbeam-1-Shot.webp"]) {
      expect(isImagePath(p), p).toBe(true);
    }
    for (const p of ["/t/report.pdf", "/t/Makefile", "/t/.env", "a.png.gz", "/t/.png", "", null]) {
      expect(isImagePath(p), String(p)).toBe(false);
    }
  });

  it("reads an extension the way a file manager would", () => {
    expect(extOf("/t/report.PDF")).toBe("pdf");
    expect(extOf("/t/archive.tar.gz")).toBe("gz");
    expect(extOf("/t/Makefile")).toBe("");
    expect(extOf("/t/.env")).toBe("");
    expect(extOf("/t/hostbeam-1788875278869-env")).toBe("");
  });

  it("labels a group by its shared type, or not at all", () => {
    expect(fileLabel(["/a.pdf", "/b.PDF"])).toBe("pdf");
    expect(fileLabel(["/a.pdf", "/b.csv"])).toBe("");
    expect(fileLabel(["/Makefile"])).toBe("");
  });

  it("names the same pictures the Rust core does", () => {
    // Two copies of one list: this is the test that notices when one changes.
    const beam = readFileSync(resolve(__dirname, "../../src-tauri/src/beam.rs"), "utf8");
    const block = /const IMAGE_EXTENSIONS: &\[&str\] = &\[([^\]]*)\];/.exec(beam);
    expect(block, "IMAGE_EXTENSIONS in beam.rs").not.toBeNull();
    const rust = [...block![1].matchAll(/"([a-z0-9]+)"/g)].map((m) => m[1]);
    expect([...IMAGE_EXTENSIONS]).toEqual(rust);
  });
});

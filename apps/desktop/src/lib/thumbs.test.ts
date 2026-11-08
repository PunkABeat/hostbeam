// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => ({ inside: false }));
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => transport.inside,
  invoke: () => Promise.resolve(undefined),
  convertFileSrc: (p: string) => `asset://localhost/${encodeURIComponent(p)}`,
}));

import { thumbUrl } from "./thumbs";

afterEach(() => {
  transport.inside = false;
});

describe("thumbUrl", () => {
  it("serves a cache path through the asset protocol inside the app", () => {
    transport.inside = true;
    expect(thumbUrl("/Users/me/Library/Caches/com.hostbeam.app/thumbs/hostbeam-1.png")).toBe(
      "asset://localhost/%2FUsers%2Fme%2FLibrary%2FCaches%2Fcom.hostbeam.app%2Fthumbs%2Fhostbeam-1.png",
    );
  });

  it("leaves a data URL alone — rows from before previews were files", () => {
    transport.inside = true;
    expect(thumbUrl("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
  });

  it("is null for a row without a preview, and a plain path in the browser", () => {
    expect(thumbUrl(null)).toBeNull();
    expect(thumbUrl(undefined)).toBeNull();
    expect(thumbUrl("")).toBeNull();
    expect(thumbUrl("/tmp/x.png")).toBe("/tmp/x.png");
  });
});

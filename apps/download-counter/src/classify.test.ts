import { describe, expect, it } from "vitest";

import { agentOf, counts, countryOf, fileOf, platformOf, type File } from "./classify";

// Every agent string below was seen on download.hostbeam.app between
// 2026-09-06 and 2026-10-06 (Cloudflare's zone analytics).
const SEEN = {
  updater: "tauri-plugin-updater/2.10.1",
  homebrew: "Homebrew/7.0.6-14-ge24c0e7 (Macintosh; Intel Mac OS X 15.7.3) curl/8.7.1",
  curl: "curl/8.7.1",
  macChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6.1 Mobile/15E148 Safari/604.1",
  android:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36",
  windows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.60 Safari/537.36",
  gptbot:
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.4; +https://openai.com/gptbot)",
  dotbot: "Mozilla/5.0 (compatible; DotBot/1.2; +https://opensiteexplorer.org/dotbot; help@moz.com)",
  fortline:
    "FortLineAgentShieldDiscovery/1.0 (+https://fortline.ai/bot; AI app directory research; contact: ops@fortline.ai)",
};

describe("fileOf", () => {
  it("knows the three files a person or the app downloads, and the update check", () => {
    expect(fileOf("/Hostbeam.dmg")).toEqual({ kind: "dmg", version: "latest" });
    expect(fileOf("/latest.json")).toEqual({ kind: "check", version: "latest" });
    expect(fileOf("/v0.1.34/Hostbeam_0.1.34.dmg")).toEqual({ kind: "dmg-versioned", version: "0.1.34" });
    expect(fileOf("/v0.1.34/Hostbeam.app.tar.gz")).toEqual({ kind: "update", version: "0.1.34" });
  });

  it("counts nothing else", () => {
    for (const path of [
      "/",
      "/latest.json.bak",
      "/v2/.env",
      "/v0.1.34/Hostbeam_0.1.33.dmg", // folder and file disagree
      "/Hostbeam_0.1.22_universal.dmg",
      "/hostbeam.dmg",
      "/v0.1.34/Hostbeam.dmg",
    ]) {
      expect(fileOf(path), path).toBeNull();
    }
  });
});

describe("counts", () => {
  const dmg: File = { kind: "dmg", version: "latest" };
  const check: File = { kind: "check", version: "latest" };

  it("counts a whole file, and a ranged one only from its first byte", () => {
    expect(counts(dmg, "GET", 200, null)).toBe(true);
    expect(counts(dmg, "GET", 206, "bytes=0-")).toBe(true);
    expect(counts(dmg, "GET", 206, "bytes=0-1048575")).toBe(true);
    expect(counts(dmg, "GET", 206, "bytes=1048576-")).toBe(false);
  });

  it("does not count a probe, a miss or a cache revalidation of a file", () => {
    expect(counts(dmg, "HEAD", 200, null)).toBe(false);
    expect(counts(dmg, "GET", 304, null)).toBe(false);
    expect(counts(dmg, "GET", 404, null)).toBe(false);
    expect(counts(dmg, "GET", 206, null)).toBe(false);
  });

  it("counts an update check that got an answer, fresh or not", () => {
    expect(counts(check, "GET", 200, null)).toBe(true);
    expect(counts(check, "GET", 304, null)).toBe(true);
    expect(counts(check, "HEAD", 200, null)).toBe(false);
    expect(counts(check, "GET", 404, null)).toBe(false);
  });
});

describe("agentOf", () => {
  it("tells the app, Homebrew and scripts from browsers", () => {
    expect(agentOf(SEEN.updater)).toBe("updater");
    expect(agentOf(SEEN.homebrew)).toBe("homebrew");
    expect(agentOf(SEEN.curl)).toBe("script");
    expect(agentOf("node")).toBe("script");
    expect(agentOf("python-requests/2.32.3")).toBe("script");
    expect(agentOf(SEEN.macChrome)).toBe("browser");
    expect(agentOf(SEEN.iphone)).toBe("browser");
  });

  it("calls crawlers, link previews and the nameless bots", () => {
    expect(agentOf(SEEN.gptbot)).toBe("bot");
    expect(agentOf(SEEN.dotbot)).toBe("bot");
    expect(agentOf(SEEN.fortline)).toBe("bot");
    expect(agentOf("WhatsApp/2.23.20.0")).toBe("bot");
    expect(agentOf("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)")).toBe("bot");
    expect(agentOf("")).toBe("bot");
    expect(agentOf(null)).toBe("bot");
    expect(agentOf("SomethingElse/1.0")).toBe("bot");
  });
});

describe("platformOf", () => {
  it("reads the platform a browser or Homebrew says it runs on", () => {
    expect(platformOf(SEEN.macChrome, "browser")).toBe("mac");
    expect(platformOf(SEEN.homebrew, "homebrew")).toBe("mac");
    expect(platformOf(SEEN.iphone, "browser")).toBe("ios");
    expect(platformOf(SEEN.android, "browser")).toBe("android");
    expect(platformOf(SEEN.windows, "browser")).toBe("windows");
    expect(platformOf("Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0", "browser")).toBe("linux");
    expect(platformOf(SEEN.curl, "script")).toBe("other");
  });

  it("puts the updater on a Mac, since Hostbeam only runs there", () => {
    expect(platformOf(SEEN.updater, "updater")).toBe("mac");
  });
});

describe("countryOf", () => {
  it("keeps Cloudflare's code and nothing else", () => {
    expect(countryOf({ country: "DE" })).toBe("DE");
    expect(countryOf({ country: "T1" })).toBe("T1"); // Tor
    expect(countryOf({})).toBe("XX");
    expect(countryOf(undefined)).toBe("XX");
    expect(countryOf({ country: "<script>" })).toBe("XX");
  });
});

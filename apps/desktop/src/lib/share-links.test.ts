import { describe, expect, it } from "vitest";

import { SHARE_NETWORKS, shareUrl, WEBSITE } from "./share-links";

const words = {
  text: "Beam a screenshot & paste the path #agents",
  title: "Hostbeam: beam a screenshot to your server",
};

describe("shareUrl", () => {
  it("opens every network over https, on the network's own site", () => {
    const hosts = SHARE_NETWORKS.map(({ id }) => new URL(shareUrl(id, words)));
    expect(hosts.every((u) => u.protocol === "https:")).toBe(true);
    expect(hosts.map((u) => u.hostname)).toEqual([
      "x.com",
      "bsky.app",
      "www.linkedin.com",
      "www.reddit.com",
      "news.ycombinator.com",
    ]);
  });

  it("carries the sentence and the link to X, encoded", () => {
    const u = new URL(shareUrl("x", words));
    expect(u.searchParams.get("text")).toBe(words.text);
    expect(u.searchParams.get("url")).toBe(WEBSITE);
    // An ampersand or hash in the sentence must not end the parameter early.
    expect(u.search).not.toContain("& paste");
  });

  it("puts the link inside Bluesky's single text field", () => {
    const u = new URL(shareUrl("bluesky", words));
    expect(u.searchParams.get("text")).toBe(`${words.text} ${WEBSITE}`);
  });

  it("gives LinkedIn only the link, and Reddit and Hacker News a title", () => {
    expect(new URL(shareUrl("linkedin", words)).searchParams.get("url")).toBe(WEBSITE);
    const reddit = new URL(shareUrl("reddit", words));
    expect(reddit.searchParams.get("url")).toBe(WEBSITE);
    expect(reddit.searchParams.get("title")).toBe(words.title);
    const hn = new URL(shareUrl("hackernews", words));
    expect(hn.searchParams.get("u")).toBe(WEBSITE);
    expect(hn.searchParams.get("t")).toBe(words.title);
  });
});

// "Share Hostbeam" → a network: each site's own post-a-link page, prefilled.
// macOS dropped its built-in X, Facebook and LinkedIn share services, so the
// system share menu only offers AirDrop, Messages and local apps; these are the
// web intents the networks publish instead (ADR 0023). No tracking parameters,
// in keeping with "no telemetry".

export const WEBSITE = "https://hostbeam.app";

export type ShareNetwork = "x" | "bluesky" | "linkedin" | "reddit" | "hackernews";

/** In menu order. Brand names are not translated. */
export const SHARE_NETWORKS: { id: ShareNetwork; label: string }[] = [
  { id: "x", label: "X" },
  { id: "bluesky", label: "Bluesky" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "reddit", label: "Reddit" },
  { id: "hackernews", label: "Hacker News" },
];

/** The words to share: a sentence for networks that post text, and a short
 *  title for the ones that post a titled link. */
export interface ShareWords {
  text: string;
  title: string;
}

export function shareUrl(network: ShareNetwork, words: ShareWords, url: string = WEBSITE): string {
  const e = encodeURIComponent;
  switch (network) {
    case "x":
      return `https://x.com/intent/post?text=${e(words.text)}&url=${e(url)}`;
    case "bluesky":
      // Bluesky's compose intent takes one text field; the link inside it
      // becomes the card.
      return `https://bsky.app/intent/compose?text=${e(`${words.text} ${url}`)}`;
    case "linkedin":
      // LinkedIn reads only the URL and builds the post from the page's tags.
      return `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`;
    case "reddit":
      return `https://www.reddit.com/submit?url=${e(url)}&title=${e(words.title)}`;
    case "hackernews":
      return `https://news.ycombinator.com/submitlink?u=${e(url)}&t=${e(words.title)}`;
  }
}

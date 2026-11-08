// The guides, in one place.
//
// Read by the guides index, each guide's layout (title, description, dates,
// structured data), the sitemap and /llms.txt, so a guide is added or retitled
// here once and every surface follows. Each guide answers a question people
// actually type, names every way to solve it (Hostbeam is one), and dates what
// it says about other tools: they change, and a guide that is wrong about a
// competitor is worse than none (launch-day.md, docs/research/questions.md
// § Being found).
export interface Guide {
  slug: string;
  /** The page's <h1> and its <title>, without the " · Hostbeam" suffix. */
  title: string;
  /** The meta description, and the line under the title on the index. */
  description: string;
  /** ISO dates. `updated` is when the claims about other tools were last checked. */
  published: string;
  updated: string;
}

export const GUIDES: Guide[] = [
  {
    slug: "paste-a-screenshot-into-claude-code-over-ssh",
    title: "Paste a screenshot into Claude Code over SSH",
    description:
      "Ctrl+V can't reach your Mac's clipboard when Claude Code runs on a server. Every way to get a screenshot to it anyway, from scp by hand to one shortcut, for Claude Code, Codex, Gemini CLI and OpenCode.",
    published: "2026-10-03",
    updated: "2026-10-03",
  },
  {
    slug: "mac-tools-that-send-screenshots-to-a-remote-agent",
    title: "Mac tools that send a screenshot to a remote coding agent, compared",
    description:
      "Eleven ways to get a screenshot from your Mac to Claude Code or Codex on a server: Paste2SSH, cmux, clipaste, FainLane, screencp, Raycast and VS Code extensions, scripts and Hostbeam. How each works, what it costs, what it installs.",
    published: "2026-10-03",
    updated: "2026-10-03",
  },
  {
    slug: "open-a-remote-dev-server-on-your-mac",
    title: "Open your agent's dev server on your Mac",
    description:
      "Your coding agent started a dev server on localhost, but localhost is the server, not your Mac. How to open it in your own browser: ssh -L, what to do when it says “administratively prohibited”, and the shortcuts.",
    published: "2026-10-03",
    updated: "2026-10-03",
  },
];

export const guidePath = (slug: string) => `/guides/${slug}/`;

export function guide(slug: string): Guide {
  const found = GUIDES.find((g) => g.slug === slug);
  if (!found) throw new Error(`No guide with the slug "${slug}" in lib/guides.ts`);
  return found;
}

/** "3 October 2026", for the line under a guide's title. */
export function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

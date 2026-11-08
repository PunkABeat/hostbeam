# Launch day

The iPhone app, the Mac app and the MCP server launch together, once Apple
approves iPhone 1.0. Decided 2026-09-15, in the owner's words: "I want to launch
everything at once." The marketing plan (rev. 2, 12 Sep 2026) says why: phone,
Mac and MCP server are one complete story, and told in three pieces they are
three shrugs.

**Apple approved iPhone 1.0 on 2026-10-08 (16:06 UTC) and it was released on
2026-10-09.** The plan below waited one to two weeks after approval for the
launch week; the owner chose otherwise that morning: "we are launching now with
what we've got." So the launch is now, and items not done by then (the clips,
DevHunt's booked week) follow it rather than hold it.

Nothing under "When Apple approves" happens before approval. Every item there
either points at the App Store, mentions the iPhone, or spends the launch
moment. "Before approval" is the work that does none of those.

## The message (decided 2026-10-03)

| | |
|---|---|
| Tagline (Product Hunt allows 60; this is 55) | **Agent on a server? Show it anything. See what it built.** |
| The line under it | Hostbeam links your Mac and iPhone to the server your coding agent runs on. Send it screenshots and files, and open the app it's building on your Mac. Over your own SSH, free. |
| Show HN title (HN allows 80; this is 79; a draft) | Show HN: Hostbeam – Hand files to the agent on your server, open what it builds |

- **It does not lead with the upload.** Sending a screenshot to a server ships
  in Termius, cmux, Herdr, the free Paste2SSH and more
  ([differentiation-brainstorm.md](../research/differentiation-brainstorm.md)
  § 1), and every 2026 Show HN about pasting screenshots into a remote agent
  over SSH scored 1–3 points: FainLane, cc-clip, ShellShot, RedTerm, "Paste
  Image to Claude Code over SSH" (HN search, 2026-10-03). The two directions
  together — files in, the agent's dev server out
  ([ADR 0029](../adr/0029-open-the-agents-dev-server.md)) — are paired by one
  other tool, cmux, and only inside its own terminal and browser panes
  (checked 2026-10-03, [screenshot-tools-2026-10.md](../research/screenshot-tools-2026-10.md)).
  Hostbeam pairs them for any terminal and any browser, and from the phone.
  Never claim "nobody else" in a post.
- **The question filters the reader.** Someone whose agent runs on their own
  laptop skips it without being told something false; "your agent can't see
  your screen" would have been false for them, and the marketing plan warned
  that HN answers it with "mine can, actually".
- **"Server", not "remote".** "Remote agent" now also means the agents vendors
  run in their own cloud (Cursor's background agents, Claude's Remote Control,
  Codex cloud), which Hostbeam cannot reach. Hostbeam needs a machine you can
  SSH into, and "server" says that.
- The site's headline is the tagline since 2026-10-09 (the owner saw it in
  place first), with the line under it as the lede and the same three lines on
  the link-preview card. The page title and description keep "Beam a
  screenshot straight to your server": they carry the words people search for.

## Where (checked 2026-10-03)

The list that circulates on X (21 boards) was checked site by site. Most of it
sells backlinks rather than readers: one founder put two products through 80
directories, and the best sent 7 engaged visits while a single X post sent 48
([dev.to, 2026-09-27](https://dev.to/alexcommitter/i-put-two-products-through-80-launch-directories-here-is-what-counted-with-live-domain-rating-281)).
A #2 of the day on Product Hunt brought about 4,400 visitors, and that founder
still named X as the biggest channel. The owner's own X posts matter more than
any directory.

**Launch moments** — each is a day of answering comments:

| Board | Why | Cost | Notes |
|---|---|---|---|
| Show HN | The right audience; a lottery | Free | Must be triable with no sign-up — free with no limit qualifies. New accounts have been kept from posting Show HN since about March 2026: check the owner's account can. A post that gets no attention may be posted again. |
| Product Hunt | 633 dev-tool launches in Q2 2026, about 200 upvotes on average | Free | Goes live at 00:01 Pacific. No hunter needed (Product Hunt's own guidance). |
| DevHunt | Dev tools only; voters sign in with GitHub; takes MCP servers | $19 picks the week | Tuesdays. The free queue runs about four weeks out. Median 1,995 impressions per launch week. |
| Peerlist Launchpad | 58% of its users are software engineers | Free | Mondays (UTC). Needs a verified profile. |

**Listings, once** — not announcements, and they keep working:

- **TinyShelf** (tinyshelf.co) — **listed 2026-10-09**, dofollow, in
  DevOps & Infrastructure; the price is its badge on the home page (below,
  under Badges).

- **AlternativeTo.** Free, "at least a few months" to appear; $5 for priority
  review. Listed against Paste2SSH, cmux and Termius.
- **SaaSHub.** Free; slower to appear without competitors named. Featured
  listings there get 15–29 referrals a month by its own account, so the free
  one gets fewer.
- **The MCP directories** — below, under "When Apple approves".
- **Console.dev** (hello@console.dev) and **iOS Dev Weekly** — curated, free.
- **r/macapps.** A main-feed post needs a real identity and a site with a
  privacy policy and terms (Hostbeam has both), must state the problem, name
  competitors and give the price, and is allowed once every 30 days.

**Maybe:** Uneed — a free queue of up to five months, or $29.99 to pick the
date. Only as one of the weeks after launch.

**Not these, and why:**

- **TrustMRR** — publishes your revenue; it is a marketplace for selling startups.
- **BetaList** — paid only now, and meant for products not yet launched.
- **OpenAlternative** — open-source products only.
- **There's An AI For That, SaaS Genius** — AI tools and SaaS only; SaaS Genius
  takes no free listings and carries casino pages.
- **SideProjectors** — a marketplace for selling side projects.
- **Fazier, TinyLaunch, LaunchIgniter** — their free tiers require their badge
  or a link on hostbeam.app.
- **Microlaunch, Tiny Startups, PeerPush, Toolfolio, the Indie Hackers product
  list** — months-long queues, links that do not count for search, ranking you
  pay or trade for, or a list overrun with spam.

**Badges** (owner, 2026-10-03: acceptable if they bring readers): a badge
earned by placing — Product Hunt, DevHunt, Peerlist — may go on the site. A
badge that is the price of being listed may not: those boards are the ones with
the least evidence of readers, so the badge buys a backlink, not an audience.
**Exception, 2026-10-09 (owner):** TinyShelf's badge, which is the price of a
dofollow link there, is on the home page, in the footer. It is their snippet
unchanged (owner's choice over a self-hosted copy), so its image loads from
tinyshelf.co on every view of the home page: the site's one third-party
request, which /privacy now states. They re-check the link weekly; removing it
drops the listing to nofollow, not off the site.

**Measuring:** Cloudflare Web Analytics, already on the site, lists which site
each visitor came from. That is enough to tell the boards apart; nothing new is
added.

## Before approval

None of these points at the App Store or spends the launch moment. Accounts
are PunkABeat's (admin@punkabeat.com), created by the owner; an agent fills
them in afterwards.

**Ranked 2026-10-07** by odds and hours, after the first download count
([ADR 0030](../adr/0030-count-downloads-at-the-edge.md)) found almost nobody
outside the owner had downloaded or run the Mac app in 30 days. Now, in order:
awesome-mac, AlternativeTo, the MCP directories (moved up from approval day:
they show the GitHub README, which can gain the iPhone later), MacMenuBar,
SaaSHub. Skipped or postponed (owner agreed): awesome-claude-code, Mac Apps
Library, the mailing list. Each item below says why.

- [x] **Guides** — two at `/guides`, live 2026-10-03
      ([apps/web/README.md](../../apps/web/README.md) § Guides).
- [x] **Search engines told** — Google Search Console and Bing Webmaster Tools
      verified and given the sitemap, IndexNow sent every URL (2026-10-03,
      [apps/web/README.md](../../apps/web/README.md), "Telling search engines").
- [x] **Cloudflare's hostbeam.app settings** — Always Use HTTPS and HSTS on,
      DMARC reports through DMARC Management, Bot Fight Mode and AI Labyrinth
      declined (2026-10-07, owner's clicks; checked live). Which and why:
      [apps/web/README.md](../../apps/web/README.md) § Cloudflare.
- [ ] **DMARC to `p=quarantine`** (owner, after 2026-10-14) — once Email →
      DMARC Management shows a week of Resend's mail passing; the licence
      keys go out by it. Same README section.
- [x] **What AI assistants answer, before launch** — recorded 2026-10-03:
      none names Hostbeam, and asked for a Mac app they name Paste2SSH
      ([ai-answers](../research/ai-answers/README.md)).
- [x] **The site's headline** to the message (2026-10-09, the owner saw it in place first).
- [ ] **The clips** (below, under "The launch bundle is ready"). The iPhone
      one can be shot on the TestFlight build.
- [x] **Posts drafted cold** — [launch-posts.md](../marketing/launch-posts.md)
      (2026-10-03): Show HN, Product Hunt, Peerlist, DevHunt, the X thread,
      Reddit, GeekNews, the newsletters, the origin note, the creator note,
      AlternativeTo and SaaSHub, and four reusable descriptions. Nothing is
      sent before approval, and each is read again on the day.
- [x] **The MCP repo on GitHub** has a description, the site and topics
      (2026-10-03, as PunkABeat). GitHub was the domain assistants cited most.
- [x] **A comparison guide** — the Mac apps that send a screenshot to a remote
      agent, Hostbeam among them, fairly. Assistants answer "is there a Mac app"
      with Paste2SSH; pages like this are what they quote. Live 2026-10-03,
      sent to IndexNow and Google's crawl queue; recheck its claims against
      [screenshot-tools-2026-10.md](../research/screenshot-tools-2026-10.md).
- [ ] **The name claimed** (owner, later) — "hostbeam" on X, Bluesky, YouTube,
      Reddit and GitHub, under PunkABeat. Then linked from the site's footer
      and its `sameAs` structured data, which tells Google and assistants these
      accounts are Hostbeam's.
- [ ] **A public Hostbeam repo?** (owner's call) — a README, issues and
      releases, no code. Some lists only take a GitHub link (awesome-claude-code
      asks for one), and assistants cite GitHub first.
- [ ] **Curated lists** — awesome-mac, and the MCP lists below.
  - **awesome-mac: [PR #3238](https://github.com/jaywcjlove/awesome-mac/pull/3238)
    opened 2026-10-07 as PunkABeat**: one line in
    Developer Utilities in all four READMEs (en, zh, ja, ko; its maintainer skill
    asks for the four), marked Freeware. 33 of its 40 PRs closed before it were
    merged.
  - **awesome-claude-code: not now** (2026-10-07). It needs 14 days of
    development or 100 stars, which `PunkABeat/hostbeam-mcp` (two days of
    commits) does not have. It also had 285 submissions in the month before,
    and approved about 1 in 4 of those it reviewed. Worth trying if a public
    Hostbeam repo exists with some history; an issue form, never a pull
    request.
- [ ] **Outreach** to the pages assistants and Google already show for the
      problem: short personal notes, drafted, sent by the owner.
- ~~**Nominate the iPhone app for featuring.**~~ Dropped (owner, 2026-10-03):
      a niche developer companion is a long shot for App Store editors, and
      nominating would have held the release two weeks after it. Revisit if
      the app ever has a consumer story.
- [ ] **Mac directories** (checked 2026-10-03):
  1. **MacMenuBar** (macmenubar.com/submit-your-menu-bar-app/) — about 1,600
     menu-bar apps, free, adding Claude tools this week. It refuses Gmail-type
     addresses and wants three screenshots taken in the real menu bar.
  2. ~~**Mac Apps Library**~~ (macappslibrary.com/submit) — skipped
     2026-10-07: easy to get into, but too small to be worth the time.
  3. At iPhone launch, a pitch to **9to5Mac's Indie App Spotlight**
     (weekly, Mac and iPhone) and, once a contact route
     is found, **MacStories**, whose editor writes about Claude Code.
  4. **Console.dev** lists pre-1.0 tools under "Betas", which Hostbeam 0.1.x is.
  5. iPhone only: **r/iosapps** with the developer flair.

  **Not these:** Setapp (its build must drop our own licensing), iCHAIT's
  awesome-macOS (its rules exclude agent and LLM tools), open-source-mac-os-apps
  (open source only), Indie App Santa and AppVisor (paid-promotion farms).
  **Homebrew's main catalogue** waits for independent demand: it takes a
  self-submitted app only with "substantial, independently verifiable public
  interest".
- [ ] **A mailing list** — **postponed 2026-10-07** until the site has
      visitors to sign up: 3–4 hours to build plus a privacy-page line, for a
      list nobody would see yet. "Tell me when the iPhone app is out", then
      occasional news (owner, 2026-10-03: in favour). Resend, which already
      sends the key email (its account is the owner's, keys in
      1Password), with double opt-in, an unsubscribe link and the sender's
      address in every email, and a privacy-policy line. The operator's
      home-country rules for advertising email (a marker in the subject, no
      sending at night) are not applied: the list is in English and not aimed
      at that market (owner, 2026-10-03).
- [ ] **Peerlist profile verified**, and **the HN account checked** for Show HN.
- [ ] **AlternativeTo and SaaSHub submitted** — their queues take months, so
      they cannot wait for approval. The Mac app now; the iPhone added on
      approval. AlternativeTo lists Hostbeam against Paste2SSH, the app every
      assistant names today.

## When Apple approves

Do these the day approval arrives, before any link is posted. The directory
listings are here rather than on launch morning because they take hours or days
to appear, and a listing is not an announcement.

**The launch week is chosen**

- [x] ~~**One to two weeks out**~~ — superseded 2026-10-09: the owner launches
      now, with what is ready (top of this file). Was: so that everything below is done first. Avoid
      the week of 2 November (the US midterm elections on Tuesday 3 November
      will fill HN and X) and Thanksgiving week (26 November).
- [ ] **Book DevHunt** for the week after it ($19 picks the week), and Uneed's
      date ($29.99) if it is used. Spending waits until this point.

**The products are current**

- [x] **Mac app.** `## Unreleased` in `CHANGELOG.md` is empty (checked 2026-10-09; 0.1.34 is current), or released first
      ([releasing-macos.md](releasing-macos.md)). Launch traffic installs
      whatever `latest.json` names.
- [x] **iPhone app.** Released 2026-10-09, 00:40 UTC, with
      `asc versions release` (it was set to release manually).
- [x] **The iPhone's changelog entry** (dated 2026-10-09, the release day). Write `## iPhone 1.0 — <date>` in
      `CHANGELOG.md` and deploy the site. That fills `/changelog/iphone/`, which
      the app's What's new opens at `#iphone-1.0`, adds the All · Mac · iPhone
      tabs to the changelog, and puts the page in the sitemap. Until then the
      page says there are no releases and is not indexed.

**The site tells the truth about the iPhone**

- [x] **`/add` switches with it** (2026-10-09, checked live; its button
      was shortened so it fits a 320px phone). The page a pairing link opens on a phone
      without the app says "coming soon" until `IPHONE_APP_LIVE` is true;
      `scripts/ios-launch-site.sh` flips it, so it is one less thing to
      remember — but check the page after deploying, because every Mac user who
      opens Share to iPhone can land there ([ADR 0024](../adr/0024-pairing-is-a-link.md)).
- [x] Everything in (2026-10-09)
      [ios-submission-checklist.md § 3b](ios-submission-checklist.md#3b-the-day-it-goes-live--put-the-app-store-back-on-the-site):
      `scripts/ios-launch-site.sh`, the store QR placement, the FAQ and SEO
      reads, the link-preview card with the phone on it, and the deploy.
      The card has to be deployed before the first link is shared, because
      platforms cache a preview by URL.

**The MCP server mentions the iPhone and gets listed**

- [x] Add the iPhone to `apps/agent/publish/README.md` and release it with
      `scripts/mcp-release.sh` (§ 3b has the steps; npm shows the README of the
      latest version only).
- [x] In the same release, point `homepage` in `apps/agent/publish/package.json`
      at `https://hostbeam.app/agents`, and add the iPhone to the site's
      `/agents` page (`apps/web/src/pages/agents.astro`), which says "from your
      Mac" until then.
- [ ] Directories, in this order, because each needs the one before. The
      official MCP registry already lists `app.hostbeam/mcp`, and PulseMCP picks
      servers up from there.
  1. **Glama.** glama.ai/mcp/servers → "Add MCP Server" →
     `https://github.com/PunkABeat/hostbeam-mcp`. It needs the owner's GitHub
     sign-in. Wait for the score; it usually takes minutes.
  2. **awesome-mcp-servers** (`punkpeye/awesome-mcp-servers`). A pull request
     adding one line, alphabetical, under Developer Tools. Its CI rejects an
     entry without the Glama score badge, wants the link text as `owner/repo`,
     and only accepts its legend emojis; read CONTRIBUTING again on the day, as
     the rules move. As of 2026-09-13 the line would be:

     ```md
     - [PunkAbeat/hostbeam-mcp](https://github.com/PunkAbeat/hostbeam-mcp) [![PunkAbeat/hostbeam-mcp MCP server](https://glama.ai/mcp/servers/PunkAbeat/hostbeam-mcp/badges/score.svg)](https://glama.ai/mcp/servers/PunkAbeat/hostbeam-mcp) 📇 🏠 🍎 🐧 - Lets a coding agent read the screenshots you beam to its server from your Mac or iPhone with Hostbeam. `npx -y @hostbeam/mcp`
     ```

  3. **mcp.so.** mcp.so/submit, the free review, with the same GitHub URL.

**The launch bundle is ready**

- [x] **The motion film, first cut** — `apps/video/` (Remotion), ~39 s,
      1920×1080, rendered 2026-10-03 for the owner's review. The attention
      piece for X, Product Hunt, YouTube and the site; square and vertical
      cuts once the wide one is approved. The clips below stay the proof.
- [ ] **Four clips**, the first three from the marketing plan's "What to make":
      the Mac loop (10 s: shortcut, HUD, paste, the agent reads it), the iPhone
      loop (15 s, on the real phone, the launch asset), the MCP loop (20 s: the
      agent reads the screenshot with no paste at all, in Claude Code or Codex),
      and the way back (10 s: Open in the popover, the app the agent is
      building appears in the Mac's browser) — the second half of the tagline.
      **Shot list, setup and where each goes on the site:**
      [clips-shot-list.md](../marketing/clips-shot-list.md) (2026-10-09; the
      way back first, since the page shows nothing of the dev server).
- [ ] **Posts drafted cold,** all on the message above: the Show HN post, the
      Product Hunt listing, the Peerlist and DevHunt entries, the subreddit
      posts, the X thread, the newsletter submissions (Console.dev, iOS Dev
      Weekly) and the seeding emails.
- [x] **The origin note to Pieter Levels,** whose complaint on X about sending a
      screenshot to his agent from his phone is why Hostbeam exists. Done
      differently: not a private DM but a public quote of his post, told as a
      story rather than an announcement, with the link inline. The X thread
      below is still unposted.

## Launch week

Show HN and Product Hunt go on different days, because each needs the owner in
the comments all day. Plan each day around the US morning.

1. **Monday — Peerlist Launchpad.**
2. **Tuesday or Wednesday — Show HN**, around 8–9 am New York time. The same
   morning: the X thread with the iPhone clip, pinned, with the MCP clip as the
   reply that answers "and the agent can see it?"; the newsletter submissions;
   the seeding emails.
3. **Thursday — Product Hunt**, live at 00:01 Pacific.
4. **The week after — DevHunt** (Tuesday), and the subreddits one at a time,
   not all in one hour. Uneed in a later week, if it is used.
5. **The same fortnight, in the app's other languages** — the maker and
   developer communities of each language the app ships in, one post each as a
   native speaker is found to read it. Smaller rooms than HN, far less crowded
   with screenshot tools.
6. **YouTube** — the four clips on a PunkABeat channel, titled the way people
   search ("Paste screenshots into Claude Code over SSH"). Perplexity cited
   four videos for one question.
7. **A second shot at HN, another week** — an essay, not a Show HN: going
   free with a reminder instead of a paywall (ADR 0028) is the September
   plan's candidate. Screenshot-tool posts score 1–3 points there; essays travel.

## The two days after

- Sit in the threads and answer everything. The marketing plan rates this above
  the posts themselves.
- Watch the support inbox, Paddle, and App Store Connect's crash and review
  pages.
- Then settle into the plan's rhythm: one clip a week, one guide page a
  fortnight, and Cloudflare's list of referring sites read monthly.

## After launch: being found

- **The iPhone guide** — "code from your phone", the one that needs the App
  Store link — once the app is live.
- **A new guide page**: run `node apps/web/scripts/indexnow.mjs <path>` after
  its deploy, and request indexing for it in Search Console (URL inspection).
- **Monthly:** Search Console's Performance, Bing's Search Performance and its
  "AI Performance" report (when Bing's AI answers cite the site).
- **About four weeks after launch:** `scripts/ai-answers.sh` again, and the
  chat apps from a network they do not block, then compare with the
  2026-10-03 record ([ai-answers](../research/ai-answers/README.md)).

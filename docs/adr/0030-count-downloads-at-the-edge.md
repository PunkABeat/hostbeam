# ADR 0030: Count Downloads at the Edge

Status: **Accepted** (2026-10-06, owner decision). Live the same day. § 3
revised the same day (owner): update checks are counted too.

Relates to: ADR 0022 (the app's updater, whose archives are counted), milestone
007 § 6 (which planned zone analytics for DMG downloads).

## Context

"How many times has the Mac app been downloaded?" had no answer that lasted.
Cloudflare's zone analytics for `download.hostbeam.app` see every request, but
on the Free plan they keep per-file detail for 31 days, and the raw total
misleads. Between 2026-09-06 and 2026-10-06 the site's DMG link served 32 GETs:
4 from the owner and 5 from named crawlers. The other 23 came from 13
addresses, mostly crawlers posing as old phone and Windows browsers. No
address outside the owner's checked `latest.json` in that window, so nobody
else had a copy running with update checks on.

A count that keeps going, and that separates people from bots, needs to be kept
somewhere we own.

## Decision

A Worker, `hostbeam-download-counter` ([apps/download-counter](../../apps/download-counter/README.md)),
sits on three routes: `download.hostbeam.app/Hostbeam.dmg`,
`download.hostbeam.app/v*` and `download.hostbeam.app/latest.json`. It passes
every request to R2 unchanged. When the answer was a whole file (a `GET` with a
200, or a 206 from byte 0) or an answered update check, it adds one to a row in
the D1 database `hostbeam-downloads`. `npm run downloads` prints the totals.

1. **Only whole downloads count.** Three files: the site's `/Hostbeam.dmg`,
   Homebrew's `/vX/Hostbeam_X.dmg`, and the updater's `/vX/Hostbeam.app.tar.gz`.
   A `HEAD`, a 304, a 404 or a later byte range is not a download.
2. **The row is a count, never a request.** Its key is the UTC day, the file,
   the version, and three words from fixed lists: the agent (browser, homebrew,
   updater, script, bot), the platform (mac, ios, android, windows, linux,
   other) and Cloudflare's two-letter country. No IP address and no user-agent
   string is stored, and no time finer than the day, so nothing in the table
   can tell two people apart. That is why the privacy page is unchanged. Its
   line about this website already covers Cloudflare's server logs and
   aggregate counts, "never people". A column that could tell people apart
   needs a new ADR and a line on that page.
3. **Update checks are counted, as `check`.** Every running copy asks
   `latest.json` 15 seconds after launch and then once a day (`updates.rs`), so
   a day's checks from the app's updater are roughly the copies that ran that
   day. The figure is slightly high, since a relaunch asks again, and it misses
   copies with automatic checks off. Checks from Homebrew's livecheck and
   scripts are stored but left out of that figure. The request is the one the
   app always made; nothing was added to it. This was first left out, since it
   measures use of the app rather than downloads, and the owner chose to count
   it the same day. **The site's copy is unchanged (owner, 2026-10-06).** That
   copy is the privacy page's "Usage analytics… There is none" and the FAQ's
   list of what the app sends, which names neither the update check nor this
   count. If it is ever revised, both are the places to say so.
4. **The download always wins.** The Worker returns R2's response untouched
   and streamed, writes the count after the response is sent (`waitUntil`), and
   calls `passThroughOnException`, so a fault in it serves the file as though it
   were not there. A failed count is logged and lost.
5. **D1, not Workers Analytics Engine.** Analytics Engine keeps three months.
   The question is "since launch", so the store must keep everything. It is a
   few rows a day.

## Consequences

- Downloads before 2026-10-06 are not in the table. The zone analytics query
  that produced the figures above can reach back 31 days at most.
- Bot classification is a heuristic on the user-agent string. Crawlers that
  pose as a current Mac browser are counted as people. The report keeps every
  line visible, so the total can always be checked by eye.
- The owner's own downloads count: their browser as "Mac, from the site", and
  their release scripts as "script". Updates count every install, the owner's
  included.
- Rolling back is deleting the three routes (or only the `latest.json` one, to
  stop counting checks). R2 serves the same URLs on its own,
  as it did before.

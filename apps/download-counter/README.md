# Download counter

Counts how many times the Mac app is downloaded, and how many copies are
running ([ADR 0030](../../docs/adr/0030-count-downloads-at-the-edge.md)).
A Cloudflare Worker on `download.hostbeam.app/Hostbeam.dmg`,
`download.hostbeam.app/v*` and `download.hostbeam.app/latest.json` passes
every request to the R2 bucket `hostbeam-releases` unchanged. For each whole
download, and each update check, it adds one to that day's row in the D1
database `hostbeam-downloads`.

## Reading the numbers

```sh
npm run downloads
```

It prints all-time and 30-day totals. The line that answers "how many people
downloaded it" is **People who downloaded it**: a browser on a Mac plus
Homebrew. The other lines are there so the total can be checked. Phones and
Windows can't run Hostbeam, the scripts are mostly the release's own checks,
and bots fetch whatever a page links to.

Below that, **Copies running** comes from the app's update checks. Each copy
asks `latest.json` 15 seconds after launch and then once a day, so a day's
checks are about the number of copies that ran that day. The figure is a
little high, because a relaunch asks again, and it misses copies with automatic
checks turned off. Only whole days are averaged, so the first figure appears
the day after counting began.

For anything the report doesn't show:

```sh
cd apps/download-counter
npx wrangler d1 execute hostbeam-downloads --remote --command "SELECT * FROM downloads ORDER BY day DESC LIMIT 50"
```

## What it keeps, and what it must never keep

One row per (day, kind, version, agent, platform, country), holding a count.
The kind is `dmg`, `dmg-versioned`, `update` or `check`.
The agent, platform and country are words from short fixed lists
(`src/classify.ts`). No IP address, no user-agent string, no time finer than
the day. That is why the privacy page needed no change. Adding a column that
could tell two people apart needs a new ADR and a line on that page first.

Counting `latest.json` measures use of the app, not downloads. The owner
chose to count it and to leave the privacy page and FAQ as they are (ADR 0030
§ 3).

## Deploying

```sh
npm test -w @hostbeam/download-counter
npm run deploy -w @hostbeam/download-counter
```

`deploy` applies any new migration in `migrations/` to the remote database,
then deploys. It uses the wrangler login on this Mac (`npx wrangler whoami`).
There is no sandbox. The Worker only passes requests through and adds to a
count, so the tests cover it.

After a deploy, check that a download is unchanged:

```sh
curl -s -o /tmp/hb.dmg https://download.hostbeam.app/Hostbeam.dmg && shasum -a 256 /tmp/hb.dmg
curl -sI https://download.hostbeam.app/Hostbeam.dmg | grep -i cf-cache-status   # HIT after the first
```

Save with `-o` and hash the file, not curl's output through a pipe: a shell
hook that filters command output can change the bytes, so a good download
looks broken.

## Turning it off

Delete the routes in the Cloudflare dashboard (Workers & Pages →
`hostbeam-download-counter` → Settings → Domains & Routes), or run
`npx wrangler delete` here. R2 serves the same URLs without it, as it did
before 2026-10-06. The table stays until the database is deleted.

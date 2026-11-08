-- One row per day and kind of download or update check, holding only how
-- many there were (ADR 0030). Nothing here can name a person: no IP address,
-- no user-agent string, no time finer than the day. Keep it that way. A column
-- that could tell two people apart needs a new ADR, and a line on the privacy
-- page.
CREATE TABLE downloads (
  day      TEXT    NOT NULL, -- UTC, YYYY-MM-DD
  kind     TEXT    NOT NULL, -- dmg | dmg-versioned | update | check (from 2026-10-06)
  version  TEXT    NOT NULL, -- x.y.z, or "latest" (/Hostbeam.dmg, latest.json)
  agent    TEXT    NOT NULL, -- browser | homebrew | updater | script | bot
  platform TEXT    NOT NULL, -- mac | ios | android | windows | linux | other
  country  TEXT    NOT NULL, -- Cloudflare's two-letter code; XX when unknown
  count    INTEGER NOT NULL,
  PRIMARY KEY (day, kind, version, agent, platform, country)
);

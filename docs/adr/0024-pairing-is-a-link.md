# ADR 0024: Pairing is a Link

Status: Accepted.

Date: 2026-09-19.

Relates to: ADR 0016 and 0017 (the iOS companion, its QR pairing and its native
idiom), ADR 0018 (remembered device keys, and "asked, never assumed").

## Context

"Share to iPhone" on the Mac showed a QR code holding a JSON object —
`{"v":1,"kind":"hostbeam-host","hostname":…}`. Only Hostbeam's own scanner
could read it, so pairing meant: install the iPhone app, find Hosts, find the
`+`, choose Scan from Mac, then point the phone at the Mac. The iPhone's Camera
app, which is what anyone actually points at a QR code, found nothing it could
act on.

The owner asked whether the Camera app could open the pairing screen directly.
It can, but only if the code holds a **link**, since that is the one payload
the Camera offers to open.

## Decision

**The code holds `https://hostbeam.app/add#v=1&name=…&host=…&port=…&user=…&folder=…`.**

**A web link, not `hostbeam://`.** With the app installed, both open the form;
without it, only the web link can say what the code is for and point at the App
Store. Every Mac user who opens Share to iPhone is exactly who the iPhone app is
for, so the page doubles as how they find it.

**The details go in the fragment.** Browsers never send the part after `#`, so a
phone without Hostbeam lands on the page and the host's address and user name
reach no server, hostbeam.app included. The page runs nothing that reads it, and
the site has no analytics beacon. `/add` is `noindex`.

**Both formats are read, one is written.** The iPhone parses the link and the
old JSON, because Macs up to 0.1.20 still show JSON. Nothing writes JSON again.

**A link may update a host only once its key is pinned.** A scan can only come
from a screen in front of the user; a link can come from anyone. Updating an
existing host's address — the behaviour that makes a re-shared QR useful when a
Mac's LAN IP moves — keeps the pinned host key, so a link that points a host at
someone else's server is refused on the next beam as a changed key. A host that
has never connected has no pin to protect it, so a link cannot update it at all.
Either way the form shows `old → new` before anything is saved, and the user
still taps Save.

**The release stopped depending on Finder.** Tauri's dmg bundler arranges the
installer window through Apple events, which this Mac began refusing on the day
this shipped — from a terminal holding the Automation permission, and from the
agent's shell, which cannot be prompted for one. `scripts/make-dmg.sh` builds
the image around a `.DS_Store` kept in the repo instead
(`docs/process/releasing-macos.md`).

## Consequences

The Mac needs a release before any of this reaches users, and the page says
"coming soon" until the iPhone app ships; `scripts/ios-launch-site.sh` flips
`IPHONE_APP_LIVE` on launch day.

The site now carries `/.well-known/apple-app-site-association`, which names the
app's Team ID and bundle id — public values, both already in every distributed
binary. The app claims `applinks:hostbeam.app`, which meant enabling Associated
Domains on the App ID and re-cutting the App Store profiles.

Apple's CDN serves that file to phones and took more than ten minutes to pick it
up when it first went live, so debug builds claim `?mode=developer` and read it
straight from the site (`ASSOCIATED_DOMAINS_MODE`, Debug only).

What is not decided: whether the Mac should accept the same link (it has no
scanner, and its hosts come from `~/.ssh/config`), and whether a link should be
able to carry anything beyond a host — it carries connection details and never
key material, and that is the whole of it.

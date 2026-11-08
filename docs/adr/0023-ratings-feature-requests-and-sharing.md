# ADR 0023: Ratings, Feature Requests and Sharing

Status: Accepted.

Date: 2026-09-14.

Relates to: ADR 0016 and 0017 (the iOS companion and its native idiom), ADR 0022
(the same "a menu-bar utility must not nag" stance, applied to updates).

## Context

Neither app asked for a rating or had a way to request a feature; both had only
Send feedback, a message to support. The owner asked whether apps usually have
these, and chose: Apple's rating prompt on iPhone plus a Rate row, "Request a
feature" in both apps, and "Share Hostbeam" on the Mac.

What decides the details is how each app is distributed. The Mac app is sold
directly — a download and a Homebrew cask — so it has no store page to rate and
Apple's prompt does not exist for it. The iPhone app is on the App Store, where
ratings help people find it and Apple's prompt is the only one its guidelines
allow.

## Decision

**iPhone: Apple's prompt, asked rarely.** `requestReview` runs after one of the
app's own beams lands in full, and only when all of these hold:

- at least 3 successful beams have happened, counted from every path — the app,
  the share and action extensions, the Shortcuts action — in the app group,
  through `BeamService`;
- the prompt has not been asked for this app version;
- no other sheet is up, and the screen is not a staged screenshot.

It waits 1.5 s after the done card, so the beam is seen to work first. Apple
still decides whether the prompt appears (at most three times a year). It is
never shown from the share extension, where Apple does not allow it, and never on
launch. Settings → About adds "Rate Hostbeam", Apple's write-review page, for
anyone who wants to rate it without being asked.

**Mac: no rating prompt.** There is nowhere to send anyone, and a menu-bar
utility must not ask for things. About gets "Share Hostbeam" instead: a native
menu of X, Bluesky, LinkedIn, Reddit and Hacker News, then Copy Link and More….
macOS dropped its built-in social share services, so its own share menu offers
only AirDrop, Messages and local apps — which is how the first version, the
system menu alone, looked in use. Each network opens that network's published
post-a-link page, prefilled, through the https-only `open_url`, with no tracking
parameters; More… opens the system menu for everything else. Copy Link and the
system menu use a link fixed in Rust. The sentence mentions only the Mac until
the iPhone app is live on the App Store, the same rule the site's structured
data follows. Mastodon is left out: a post goes to each person's own server,
which no single link can know.

**Feature requests: email, in both apps.** "Request a feature" sits next to Send
feedback and writes to the same inbox with its own subject. No public board or
voting for now: a board is a public to-do list that someone has to keep, and the
volume does not call for one. Revisit when requests pile up; GitHub Discussions
would suit an audience of developers.

**Asking where people leave.** Neither platform tells an app it is being deleted,
so there is no uninstall survey to add; App Store Connect's Deletions figure
(opt-in, aggregate, no reasons) is the only uninstall signal, and it needs no
code. What there is instead are the menus people open on their way out. On
iPhone, the Home Screen long-press menu — where Remove App lives — gets Beam last
screenshot and, last, Send feedback ("Goes straight to the developer"), next to
Apple's own items. On the Mac, the menu bar menu gets Send Feedback… right above
Quit. Both write the same mail as the Send feedback rows. The iPhone items are set
in code at launch so they share the app's string catalog, which means they appear
after the first launch; a tapped item is received by a scene delegate, and Beam
last screenshot goes through the same `hostbeam://beam-last` link as the widget.

## Consequences

- The Rate row points at `apps.apple.com/app/id6804413107`, which does not
  resolve until the App Store record is live, so TestFlight builds open a missing
  page.
- The new Settings rows change the "settings" App Store screenshot the next time
  `scripts/ios-screenshots.sh` runs.
- The prompt policy is `ReviewPrompt` in BeamEngine, under test. The share menu's
  coordinate conversion and the two mail subjects are tested in Rust.
- The system share menu is anchored on the assumption that the page fills the
  Preferences window's content view; it opened under the button when tried in
  the running app on 2026-09-14. If it ever opens in the wrong place, that
  assumption is the first thing to check. The network links are built and tested
  in `apps/desktop/src/lib/share-links.ts`; the networks change their intent
  URLs rarely, but they do change them.
- The new strings in both apps are machine translations, like the rest (see
  `docs/research/questions.md`).

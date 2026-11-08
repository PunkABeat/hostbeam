# Notes for App Review

The text for App Store Connect → App Review Information. `scripts/reviewhost-deploy.sh notes`
prints it with `{{HOST}}` filled in from the live box. Written so a reviewer who reads only
the first paragraph can still verify the app.

The reviewer's questions, in the order they hit them: what is this, who is it for, do I
need an account, how do I make it do the thing, is there anything to buy, what else is
there, what does it talk to. Keep it in that order.

WHO IT IS FOR, EXTERNAL SERVICES, REGIONS and REGULATED are there because App Review asked
for them (Guideline 2.1 Information Needed, 2026-09-29, on the first submission: "a
developer account that has a limited App Review history") and asked that they stay in the
Notes for future submissions. The notes field holds 4000 characters; this is under it.

The steps name the app's buttons exactly — grep `apps/mobile/App` for each quoted label
after any copy change. The first submission's notes said "Type it in", a label the app
never had (it is "Enter manually").

The host is a name, `review.hostbeam.app`, with the box's address as a fallback. App
Review tests on IPv6-only networks, and a bare IPv4 address there depends on the phone
synthesizing an IPv6 one; the name has an A and an AAAA record (Cloudflare, **DNS only** —
the proxy carries web traffic, not SSH) and needs no synthesis. A new box has new
addresses: update both records by hand, then `reviewhost.sh check` against the name.

There is nothing to buy since ADR 0028 §4 (2026-09-27): the iPhone app is free, with no
in-app purchase, no limit and no licence key, so the daily-limit, purchase and key-entry
sections are gone and there is no key to mint for review.

---

Hostbeam sends a screenshot (or any file you share to it) from your iPhone to a server
you own, over your own SSH, and copies the file's remote path so you can paste it to a
coding agent in a terminal. No account, no sign-in, no Hostbeam server in between.

WHO IT IS FOR
Software developers who run AI coding agents (Claude Code, Codex and similar) in a
terminal on a remote server. The agent can read an image file on that server but cannot
see a screenshot on the phone; getting it there otherwise means moving it to a computer,
uploading it with scp and typing its path. Hostbeam does it in one tap.

SIGN-IN: none. Nothing in the app asks for credentials.

TEST HOST (provided for review; it accepts the app's own device key, so nothing needs to
be configured on it):

    Hostname  review.hostbeam.app   (or by address: {{HOST}})
    Port      2222
    Username  review
    Folder    leave the default (/tmp/hostbeam)

THE MAIN FLOW
1. Open Hostbeam, tap "Get started", then "Enter manually". Fill in the test host above
   (any Name) and tap "Save".
2. "Authorize this iPhone" shows a command for the user's own server; the test host does
   not need it. Tap "Test connection" (it passes), "Continue", then "Start beaming".
3. Tap "Beam screenshot" and pick any image. It uploads, and its remote path is left on
   the clipboard. Any screenshot is a sample file (side + volume-up buttons if Photos is
   empty). Selecting several at once works too.
4. The same from outside the app: open a screenshot in Photos, tap Share, choose Hostbeam.
5. The Recent list on the home screen shows each beam; its copy button copies the path.

PRICE
Free. No in-app purchase, no usage limit, no paid content, nothing to unlock.

ONE-TAP ENTRY POINTS (all beam the newest screenshot to the default host)
- Home Screen widget "Beam last screenshot" (add it from the widget gallery).
- Control Center control "Beam last screenshot" (iOS 18+, add it in Control Center).
- Shortcuts action "Beam last screenshot".

EXTERNAL SERVICES
None. The app connects only to the SSH server the user enters, directly from the phone,
with SSH built into the app (the open-source SwiftNIO SSH library). No Hostbeam server,
no sign-in, payment, AI, analytics or ad service. Settings links open hostbeam.app pages
(privacy policy, terms) in Safari. The test host is a temporary server we run for review.

REGIONS
The app works the same in every region, with no region-specific features or content. It
is not offered in France or mainland China at launch (the French encryption declaration
and a Chinese ICP filing are not yet in place).

REGULATED INDUSTRY / THIRD-PARTY MATERIAL
Neither. It moves the user's own files to the user's own server and contains no
third-party content. Its only encryption is standard SSH, declared exempt.

ATTACHED VIDEO
Recorded on a physical iPhone with build 1.0 (12). It starts at launch; the app had
been opened before, so the first-launch welcome screens are not in it. Shown: adding the
test host, beaming two screenshots from the app, a photo from the Photos share sheet and a
new screenshot with the widget, then Settings, the connection test, and Clean up.

PRIVACY
Nothing leaves the phone except the files the user sends, to the user's own host over
SSH. No account, no analytics, no data collected.

Support: support@hostbeam.app

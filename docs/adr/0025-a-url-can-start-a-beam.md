# ADR 0025: A URL Can Start a Beam, Once You Allow It

Status: Accepted.

Date: 2026-09-20.

Relates to: ADR 0020 and 0021 (the agent-side MCP server), ADR 0024 (pairing is
a link — a *web* link, deliberately, for reasons that do not apply here).

## Context

Every way to start a beam was a human one: the global shortcut, the popover,
the tray menu, or arming automatic beaming. Nothing a script, a Raycast
command, a Shortcut, or the agent itself could reach. That is a gap for the
people Hostbeam is for — the whole product exists to feed an agent working on a
remote host, and the agent could not ask for the thing it needs.

One route already existed and nobody knew: `open -a Hostbeam shot.png` beams a
file, because macOS delivers it as `RunEvent::Opened`, the same event a Dock
drop arrives on. That covers "beam this file" and not "beam what I just
copied", which is the gesture the product is built around.

## Decision

**`hostbeam://beam` beams the clipboard**, doing exactly what the shortcut
does — silently when "Beam immediately" is on and a host exists, otherwise by
showing the popover.

**It is off until switched on**, in Preferences → General → Beaming ("Let other
apps start a beam"). Registering a scheme opens a door to every app *and every
web page*: a page can navigate to `hostbeam://beam` and the system will hand it
over. The harm is bounded — the screenshot goes to the user's own host, and the
page learns nothing — but an upload nobody asked for is precisely what this app
has refused to do everywhere else (auto-beam's armed state is not even
persisted, for the same reason). Consent belongs to the user, once, in a place
they can find and revoke.

**No `?host=`.** Beaming somewhere other than the current host is a second
decision with a lasting effect — switching hosts *is* setting the default —
and a URL that quietly rewrites a setting is worse than a URL that does one
thing. The current host is what a beam uses, whoever starts it.

**An unknown verb does nothing.** `hostbeam://anything-else` is ignored rather
than approximated, so a link written for a later version is inert on an older
one instead of doing something adjacent.

**Tao already delivers it.** `application:openURLs:` reaches `RunEvent::Opened`
with any URL, file or scheme, so no deep-link plugin and no new dependency;
`Info.plist` in `src-tauri/` carries the `CFBundleURLTypes` entry that Tauri
merges at build time.

## Amended 2026-09-20: a second verb, `host`

**`hostbeam://host?id=<id>` makes that host the current one.** The Raycast
extension needs it — a launcher that can list your hosts and not switch to one
is a catalogue, not a command.

**This is not the `?host=` the decision above refused.** That refusal was about
a *beam* link that also rewrote a setting: one link, two effects, the second
invisible in the first's name. A verb whose only effect is the switch is the
opposite — it is named for what it does, it is chosen deliberately (a command
someone picked from a list), and a beam link still beams to the current host,
whatever that is. The rule survives: no link changes a setting as a side
effect of doing something else.

**Behind the same switch.** Switching uploads nothing by itself, so it is
tempting to leave it ungated. It decides where the *next* beam goes, though,
and a screenshot arriving on a different one of your machines is the same
surprise one step earlier. The Preferences switch is therefore relabelled from
"Let other apps start a beam" to **"Let other apps control Hostbeam"** — the
consent was always about the door, not about one thing behind it.

**It can only pick between hosts you have added.** The id goes to the same
webview path the tray's Switch host uses, which ignores an id the config does
not have. A link cannot invent a host, name one you removed, or point a beam
at a machine you never configured.

**A third verb, `preferences`, is deliberately *not* gated.**
`hostbeam://preferences?tab=general` opens the window holding the switch. It
is the one door that cannot be behind the switch: a launcher that finds
Hostbeam ignoring it has to be able to say *here is where to allow me*, and an
offer to fix a permission cannot require that permission. Opening a window of
your own app sends nothing anywhere and changes no setting — the worst a web
page can do with it is show you your own Preferences, which is noise, not
harm. It is also what makes the refusal honest: the extension shows the reason
with a button, instead of naming a menu path and leaving you to find it.

**Parked like a beam, for the same reason.** A link that launches the app
arrives before the webview exists; both verbs wait up to ten seconds for it
and are then dropped. A host that changed on its own, minutes later, is the
surprise this ADR exists to prevent.

## Amended 2026-09-22: on by default

**The switch now ships on.** A fresh install accepts `hostbeam://beam` and
`hostbeam://host?id=…` without a visit to Preferences; the switch stays where
it is, and turning it off is one click.

Why the original decision moved: the people Hostbeam is for reach it from a
launcher, a script, or the agent, and every one of them met the same wall on
first use — a refusal, a toast, a trip to Preferences — for a permission they
would always grant. The threat the off-default guarded against is narrower
than the decision above gave it credit for: a web page cannot open a custom
scheme silently, because Safari, Chrome and Firefox each ask before handing a
page's link to another app, so the "upload nobody asked for" still needs a
click on a dialog that names Hostbeam. And what that click would send is the
screenshot already on the clipboard, to the user's own host. Bounded harm,
behind a browser prompt, was not worth a wall in front of every legitimate
caller.

**A saved `false` is kept.** The UI writes every setting, so every install
that ran 0.1.23–0.1.25 has `false` on disk, and a false the app wrote is
indistinguishable from one the user chose. The new default therefore reaches
fresh installs only; nobody who has run the app before is switched on by an
update. The Raycast extension reads a *missing* key as allowed, to match.

What does not change: the switch is still the audit point, the log still says
which door a beam came through, `?host=` is still refused, and a new verb
still inherits the rule — one thing, nothing that rewrites a setting behind
the user's back. Only "off by default" in the consequences below is history.

## Consequences

- Raycast, Shortcuts, a Makefile, a CI step, or an agent can start a beam with
  `open hostbeam://beam` — and the same door is open to a web page, which is
  why it was shut by default until 0.1.26 (see the amendment above: a browser
  asks before opening the scheme, and the switch is still there).
- The setting is the audit point. If a beam ever happens that nobody asked
  for, the switch is the first thing to check, and the log says which door a
  beam came through ("hostbeam://beam → immediate beam").
- `open -a Hostbeam shot.png` is now documented rather than accidental.
- Scheme registration belongs to whichever bundle LaunchServices saw last: a
  local debug build claims `hostbeam://` until the installed app is opened
  again. That is a developer's problem, not a user's, but it is worth knowing
  when testing.
- If a verb is ever added, it inherits this decision: behind the same
  switch, one thing, and nothing that changes a setting behind the user's back.

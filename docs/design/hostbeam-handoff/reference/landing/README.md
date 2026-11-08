# Landing page prototype — reference, not the target

This is the marketing one-pager as it was snapshotted from the `claude.ai/design`
project. It is kept for its structure, its copy, and its history.

**Do not restore `apps/web` to match it.** The site deliberately no longer looks
like this, and the reasons are in
[ADR 0019](../../../../adr/0019-marketing-site-dressed-like-the-app.md).

Where the two differ, the site is current and this file is old. The differences
are not drift:

| This prototype | `apps/web` | Why |
|---|---|---|
| Drafting grid behind the whole page | Plain ground | The app is a menu-bar glyph that disappears; the site was louder than the product |
| Mono "fig." eyebrow over each section | No eyebrow | The voice doc reserves mono for values a reader could type |
| `t+0.4s · in flight` annotations on the steps | Removed | Same rule — not a value anyone can type |
| iPhone parked over the Mac popover in the hero | Popover alone | It made a Mac utility read as a cross-platform suite; the iPhone has its own section |
| Two pricing cards, paid one highlighted | One plate, two columns, neither highlighted | Tier cards are the grammar of software that bills monthly |
| Blue gradient banner as the closing CTA | A plate on the page ground | The one shape on the page that belonged to a service |
| Geist Mono | The app's own `ui-monospace` stack | The app never used Geist Mono, and nothing is downloaded for it now |

What the prototype is still good for: the page's section order, the copy, and the
hero popover's interaction states. Those did not change.

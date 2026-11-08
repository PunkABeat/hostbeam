# ADR 0028: Free to Use, With a Reminder

**§ 2, § 3 and § 5 retired by ADR 0031 (2026-11-08):** the reminder is gone and
licences are no longer sold; § 1 and § 4 (every feature free, the iPhone free)
stand. What follows is the decision as it stood.

Status: **Accepted** (2026-09-27, owner decision). Amends ADR 0014 (the free
tier, and its 12-month update window) and ADR 0016 §4–5 (the iPhone's free
tier and its in-app purchase). Settles next.md § 10c.

**§3 revised the same day, before anything shipped** (owner, after testing
the reminder): the license is no longer a year of updates. It covers every
Hostbeam 1 release, with no time limit; a Hostbeam 2 would be a discounted
upgrade. The yearly version — updates for everyone, and a version released
after a license's year showing the reminder again until renewed at half price
— was built and tested first, then taken out.

Relates to: ADR 0014 (Paddle, Keygen, the honest-user stance — all kept),
ADR 0016 (the iPhone companion), ADR 0022 (updates install only when asked).

## Context

ADR 0014 made the free tier 5 successful beams a day, blocked before upload at
the sixth. That was written when nothing else did Hostbeam's job. By
2026-09-26 the same upload shipped in Termius, cmux, Herdr, FainLane, the Codex
and Claude apps ([differentiation-brainstorm.md](../research/differentiation-brainstorm.md)
§ 2), and on 2026-09-27 [Paste2SSH](https://paste2ssh.com/) was checked again:
a free Mac menu-bar app that uploads clipboard images automatically, switches
hosts, keeps the last 100 paths, takes dropped PDFs and logs, and cleans up old
uploads, with a $5 tip jar and nothing else.

A daily wall in that market fails at the worst moment. It stops someone in the
middle of a task, on the sixth beam, and the free alternative is one search
away: the wall does not make them pay, it makes them leave. Lowering the price
does not help, because the question it raises is "why pay at all", not "how
much". The research had already called five a day "stingy next to free cmux,
Herdr, Paste2SSH and Termius".

Nothing has been sold yet: the site takes money but the product has not been
launched, so there are no buyers whose purchase this changes.

The models looked at: Sublime Text (free to evaluate for as long as you like;
a small popup now and then, and "UNREGISTERED" in the title bar; nothing is
ever slowed down) and Shottr (free; after 30 days it asks you to consider
upgrading; $12, or $30 for a supporters' tier). A deliberate delay on each
beam was considered and rejected (below).

## Decision

1. **Every feature is free, without a limit, on the Mac and the iPhone.** No
   counter blocks a beam. The 5-a-day cap, the limit card and the low-count
   line are removed.

2. **The Mac asks, now and then, after a beam has landed.** Once the first
   successful beam on this Mac is **7 days** old, every **10th** successful
   beam shows one extra line: "Enjoying Hostbeam? Get a license". On a
   shortcut beam it is on the HUD, which stays up longer and opens the
   popover's license card when clicked; on a beam made from the popover it is
   on the popover's done state. The card says "Hostbeam is free to try for as
   long as you like. If you keep using it, please buy a license: $29, once."
   with **Buy…**, **Enter key…** and **Not now**.
   - It never blocks, delays or changes a beam, the clipboard or the sentence.
   - Never after a failed, partial or held beam, and never on the iPhone.
   - Counting stays as ADR 0014 had it: one gesture is one beam, a partial
     counts and its retry does not, and the count is local and never sent.
   - While unlicensed, the popover's header says "Unlicensed" beside the
     name, the way Sublime's title bar does, and it opens the license card.
     Passive: it never moves or animates.
   - 7 and 10 are constants to tune, not promises.

3. **The license is $29 once for up to 3 Macs, and covers all of Hostbeam 1.**
   It hides the reminder and the header's "Unlicensed", for every Hostbeam 1
   release, with no time limit. Every install is offered every update; nothing
   is withheld from anyone. **A Hostbeam 2, if there is one, is a discounted
   upgrade** (price undecided); until someone upgrades, Hostbeam 2 shows them
   the reminder, and nothing they paid for stops working. The 0.x versions
   count as Hostbeam 1.
   - **Why not a year of updates** (ADR 0014's model, and this ADR's first
     draft): under a reminder instead of a wall, the yearly rule would bring
     the reminder back to a paying user over a bug fix thirteen months later,
     and it was the hardest sentence in the pricing to explain. Per major
     version is one sentence, and gives the paid work in § 5 a natural
     home: if 10a and 10b become Hostbeam 2, that is when existing buyers pay
     again, and why they would want to.
   - **The cost:** buyers pay again only when a major version ships, which
     for one developer may be years, and there is a pull to hold features for
     it instead of shipping them as they are ready.
   - **Keygen:** the policy's one-year expiry means nothing now. Its
     `MAINTAIN_ACCESS` strategy already keeps an expired license valid and
     able to activate machines ([Keygen](https://keygen.sh/docs/api/policies/)),
     and the app records the date without reading it. Setting the policy's
     duration to none is tidier, not required. Hostbeam 2 will need to tell
     its licenses from Hostbeam 1's — a new Keygen policy is the obvious way,
     decided then; nothing is stored for it now.
   - An optional extra, not decided: a free upgrade for anyone who bought in
     the months just before a Hostbeam 2.

4. **The iPhone app is free, with no in-app purchase, no counter, no license
   entry and no reminder.** It is the App Store's way in to Hostbeam, and
   uploading from a phone is the most copied part of this market, so it is not
   where the money is. The license becomes Mac-only ("3 Macs"). The purchase,
   license and metering code stays in the tree unwired, for a paid layer that
   may come later; the StoreKit transaction observer is not started, and no
   in-app purchase is submitted. A free app with no in-app purchase needs only
   the Apple Developer Program License Agreement, not the Paid Apps agreement
   ([Apple](https://developer.apple.com/support/terms/)), so the iPhone launch
   no longer waits on it; the EU still needs the trader address. It also takes
   ADR 0016 §5's guideline 3.1.1 problem away: there is no key to unlock
   anything with.

5. **What is paid next is what nobody else does.** When next.md § 10a (Ctrl+V
   works in remote agents) and § 10b (the agent's work opens on your Mac and
   phone) are built, they are expected to need a license, decided in their own
   ADRs. The plain upload stays free for good: taking it back would be the
   backlash this decision avoids.

6. **Unchanged from ADR 0014:** Paddle as merchant of record, Keygen, the
   3-seat policy, the 30-day grace, refunds disabling the key, no account, no
   telemetry, no DRM. ADR 0014's intent to raise the price toward $39 is
   withdrawn until there is a paid layer to raise it for.

## Rejected

- **Slowing a beam down every Nth time.** Speed is the product: a beam that
  waits reads as "this app is slow", not "please pay", and the user is in
  their terminal when it happens, not in Hostbeam.
- **"License required for work use"** (Shottr's framing). The owner preferred
  asking the way Sublime does.
- **A tip jar only** (Paste2SSH), **a subscription** (FainLane, $12 a year;
  the refunds page promises nothing recurring), **a lower price on its own**,
  and **a supporters' tier now** (worth it only once there are users; early
  access to § 10a's experiments could be its perk later).

## Consequences

- Mac: `licensing::check_beam_allowed` and the daily counter go; `record_beam`
  keeps a lifetime count and the first beam's date and reports when the
  reminder is due; `BeamResult` carries it to the HUD and the popover; the
  limit card, `Error::BeamLimit`, and the low-count line go; the License pane
  and every string that said "5 a day" change in all eight languages; the
  update check stops gating on the license's year, and the License pane says
  "Every Hostbeam 1 update included" instead of a date.
- iPhone: `BeamService` passes no counter; Settings loses the license and
  purchase section; the transaction observer is not started; the App Store
  listing, review notes and submission checklist lose the in-app purchase.
- Site: pricing, FAQ, `llms.txt`, structured data, buy, terms, refunds,
  privacy and the iPhone section say "free, with a reminder" and "3 Macs".
  Deployed after the Mac release that carries it, as usual.
- Licence worker: the key email says "3 Macs" and "Every Hostbeam 1 update is
  included", with no date. Its App Store path (`/appstore/key`) stays deployed
  and unused.
- Revenue depends on people choosing to pay, which fewer will than a wall
  forces; the bet is more users. With no sales yet there is no baseline to
  compare against, so the first months' Paddle sales are the measure, and the
  reminder's two numbers are the first thing to adjust.

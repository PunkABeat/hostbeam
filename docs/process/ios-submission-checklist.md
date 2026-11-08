# iOS submission checklist

Everything standing between the current build and Hostbeam being on the App
Store, in one place. Written 2026-08-31 because the items were scattered across
milestone 008, milestone 006 and `questions.md`, and
`docs/marketing/app-store-listing.md` already referred to "milestone 008
submission checklist" as though this file existed.

**Every line below was checked against the repo or the live site, not copied
forward.** Milestone 008's older list had three items that were already done —
see [Corrections](#corrections-to-milestone-008) at the end. Do the same before
trusting this file in a month.

Facts as of writing: bundle id `app.hostbeam.ios.Hostbeam`, team `U3C6XC6LHJ`,
`MARKETING_VERSION 1.0`, `CURRENT_PROJECT_VERSION 1`. A TestFlight
build was uploaded on 2026-08-24, so **the app record already exists in App Store
Connect**.

---

## 0. Start here: App Store Connect after the free-app decision (ADR 0028)

Written 2026-09-27, when the iPhone app became free — no in-app purchase, no
licence, no daily limit ([ADR 0028](../adr/0028-free-to-use-with-a-reminder.md)
§4). The rest of this file was written for a paid app, so **this list is what
to do the next time you open App Store Connect**, in order. Each step says
where, what, and why; the long sections below keep the history and detail.

The app's pages are `https://appstoreconnect.apple.com/apps/6804413107/distribution/<page>`
(a bare `/apps/<id>` shows a blank page — see [App Privacy](#app-privacy-decision-2026-08-31)).

**State on 2026-09-28: 1–5 done, 8 stands, 9 reversed, 6–7 paused, then done.** Build 11
(replacing 10 the same evening) is attached and `asc validate` reports **0 errors, 0 warnings, 0 blocking**,
down from 37 findings on 09-10. No in-app purchase and no subscription exist
(`asc iap list`, `asc subscriptions list`, both `total: 0`). The price is Free
across 175 countries (`isFree: true`), with Apple Silicon Mac availability
unticked. App Privacy is re-answered **Data Not Collected** and published, so
it agrees with `PrivacyInfo.xcprivacy` and hostbeam.app/privacy — the
contradiction that would have been rejected is closed. **Step 9 is reversed by
events:** the trader address exists, so DSA is Active across all 27 EU
countries and **174 of 175 territories are available**, France alone held back
for ANSSI. **Steps 6 and 7 were paused on the owner's call (2026-09-28)** while
a feature was in flight; it landed (a beam copies just the path), and **step 6
is done** the same day: all 8 listings pushed with `asc`, read back field by
field against app-store-listing.md, `asc validate` still 0 errors / 0 warnings.
**Step 7's text is updated in the repo**; it goes in with the review host's
address on submission day. **Step 8 is done too**: 03, 04, 05 and 07 retaken and the
English set replaced in order (below).
**Submission day, as it stands on 2026-09-28** (everything else above is
done; build 11 was installed from TestFlight by the owner the same day, and
the owner confirmed App Privacy reads **Data Not Collected**, published, with
the policy URL https://hostbeam.app/privacy — the one check the API cannot
make):

1. **Done:** the box is up at 203.0.113.17:2222, and `check` passes all 9
   against it. The 9th was added the same day: the 8 passed while the owner's
   beam from build 11 was refused as "another user's" folder, so the box now
   starts sessions in `/tmp/hostbeam` (§ How it is hardened) and was updated in
   place, keeping its address and host key.
2. **Kept the old video** (the owner's call); the notes say it shows an
   earlier build and copied text.
3. **The owner's phone** (build 11, TestFlight) beams to the box, standing in
   for an erased simulator: its key was new to this box. The first try found
   the folder bug in 1; **after the fix both paths landed** (a screenshot beam
   and a photo through the share sheet, 14:21 UTC), and were then deleted so
   the reviewer starts with an empty folder.
4. **Done:** notes pasted and read back word for word, the video attached
   (`COMPLETE`), sign-in required set to No. `asc review doctor`: 0 blocking.
   The notes give the host as `review.hostbeam.app` (A and AAAA, DNS only),
   the address as a fallback, for App Review's IPv6-only network; `check`
   passes 9/9 through the name. China mainland was switched off (§ 4).
5. **Done:** the iPhone 1.0 entry is in `CHANGELOG.md`.
6. **Build 12 replaces 11.** "Add for Review" refused build 11: "You must
   upload a screenshot for 13-inch iPad displays". Every build so far had
   declared iPad as well (pitfalls.md, XcodeGen's target preset); build 12 is
   11 with each target set to iPhone only, and `release-ios.sh archive` now
   checks it. Nothing else in the app changed, so the testing of 11 stands.
7. **Submitted 2026-09-28, 15:04 UTC** (submission `6f9775a7…`, Waiting for
   Review). Release is **manual**: after approval, the owner picks the day,
   and § 3b puts the App Store on the site. Then `reviewhost-deploy.sh down`
   and delete `review.hostbeam.app`'s two DNS records.
8. **2026-09-29: Guideline 2.1, Information Needed.** Not a fault found in the
   app: the account has little App Review history, so Apple asked for (1) a
   screen recording on a physical device on the latest iOS, starting at launch;
   (2) purpose and audience; (3) setup; (4) external services; (5) regional
   differences; (6) regulated-industry documents — in a Resolution Center reply
   *and* in the Notes. The first video did not qualify (a simulator recording of
   an earlier build), and the notes named a button the app never had ("Type it
   in"; it is "Enter manually") and skipped "Authorize this iPhone".
   [app-review-notes.md](../marketing/app-review-notes.md) now answers all six.
   The owner recorded it on a physical iPhone (build 12) the same
   morning; the H.264 copy (`docs/marketing/video/hostbeam-review-iphone-2026-09-29.mp4`,
   8.8 MB from 138 MB HEVC) replaced `app-review-demo.mp4` as the one review
   attachment (Apple allows one; `COMPLETE`, checksum matches) and the notes
   were pushed and read back identical. The review folder is empty (the video
   ends with Clean up). **The owner replied the next morning, local time,** in App Store
   Connect (numbered 1–6, same video attached). **A reply does not resubmit:**
   a day later nothing had moved, with Resubmit to App Review greyed out on
   the submission page. It takes **Update Review** on the version page (the
   item shows "2.1.0 Performance: App Completeness", the same request, not a
   new issue), then Resubmit. **Resubmitted 2026-09-30, 13:59 UTC**: submission
   `6f9775a7…` and the version both `WAITING_FOR_REVIEW`, no new build.
9. **Approved 2026-10-08, 16:06 UTC** ("eligible for distribution"; the
   version went `PENDING_DEVELOPER_RELEASE`). **Released 2026-10-09, 00:40
   UTC** with `asc versions release --version-id e35ad191-… --confirm`
   (`READY_FOR_DISTRIBUTION`). The review host was destroyed the same morning
   (`reviewhost-deploy.sh down`: server, firewall, admin key), and the owner
   deleted its two DNS records in Cloudflare (`review.hostbeam.app` is
   NXDOMAIN) and checked the Hetzner console: nothing left running.
10. **For 1.0.1: the screenshots show an old file name.** `ScreenshotStage`
    stages `hostbeam-2026-08-28-153012.png`, a shape the app has not produced
    since the 13-digit stamp (2026-09-26), and 03 and 07 show it. Stage a
    13-digit name, retake them with `scripts/ios-screenshots.sh`, and upload
    with the next version: a live version's screenshots cannot be changed
    without one.

1. **Attached: build 1.0 (12)**, 2026-09-28, `VALID` — 11 made iPhone-only
   (item 6 above), and the only build to submit. Build 11 copies just the
   path after a beam, as the Mac does since 0.1.32 (ADR 0006's amendment), and
   adds the one-tap default host and the host page's copy buttons, which the
   retaken screenshots show. Build 10 had only the first; build 9 (2026-09-27, `VALID`) was the first
   free one but still copies "Use this screenshot: …", and build 8 and earlier
   still have the 5-a-day limit and the licence screen — never attach them to
   a submission. `asc builds list --app 6804413107 --processing-state all
   --limit 3` shows build 10 `VALID` once Apple has processed it.
2. **Confirm the D&B address change no longer blocks you.** A free app with no
   in-app purchase needs only the Apple Developer Program License Agreement,
   which is already Active under PunkABeat; the Paid Apps agreement, tax and
   banking are only for paid apps and in-app purchases
   ([Apple](https://developer.apple.com/support/terms/)). Business →
   Agreements should show the free agreement Active. Then run
   `asc validate --app 6804413107 --version 1.0 --platform IOS --output table`
   and read every finding: *done when* none of
   them mentions agreements, tax, banking or the legal entity. If one does,
   write it here — that would mean D&B still gates the launch.
3. **Make sure no in-app purchase goes with the version.** Monetization →
   In-App Purchases: if `app.hostbeam.ios.license` exists, leave it alone
   (don't submit it). On the version page, the "In-App Purchases and
   Subscriptions" section must be **empty**. *Why:* the app no longer contains
   any purchase screen, so a submitted purchase is one the reviewer cannot find.
4. **Set the price to Free.** Pricing and Availability → Price Schedule → Add
   Pricing → USD 0.00 (Free). `asc validate` does not flag an empty price, which
   is how it gets missed. While there, check "iPhone and iPad Apps on Apple
   Silicon Macs" is still **unticked** (it re-ticks itself after metadata edits).
5. **Re-answer App Privacy as "Data Not Collected", then Publish.** App Privacy
   (`distribution/privacy`) → Edit → "No, we do not collect data from this
   app". *Why:* the published answers still say User ID, Device ID and Purchase
   History — true when the phone checked a licence key, false now. The app's
   own privacy manifest (`App/PrivacyInfo.xcprivacy`) already says nothing is
   collected, and the two must agree. Reasoning: [the amendment](#app-privacy-decision-2026-08-31).
6. ~~**Replace the listing text.**~~ **Done 2026-09-28**: en-US plus de-DE,
   es-ES, fr-FR, ja, ko, pt-BR and zh-Hans (description, keywords,
   promotional text, subtitle, support/marketing/privacy URLs), unwrapped from
   the file's hard-wrapped English and checked against every limit first. The
   new languages have no screenshots of their own; `asc validate` does not ask
   for them. Its new promise — paste the path and the
   agent gets the picture itself — was checked on the phone on 2026-09-28:
   build 10, shared to `hostbeam-testhost`, pasted in Termius into Claude Code
   → `[Image #1]`. What is in App Store Connect is the older
   description (it mentions the licence and "3 Macs and iPhones"). Push the
   current text from [app-store-listing.md](../marketing/app-store-listing.md)
   with `asc localizations update` (en-US first, then the 7 translations when
   the listing goes out localized), or paste it on the version page. *Done
   when:* no field mentions a licence, a price or a daily limit.
7. **Replace the App Review notes.** App Review Information → Notes: paste the
   text from [app-review-notes.md](../marketing/app-review-notes.md) (from the
   `---` line down; `scripts/reviewhost-deploy.sh notes` prints it with the
   review host's address filled in). The old notes told the reviewer about the
   5-a-day limit and a licence key; there is neither now.
8. ~~**Screenshots: retake 03, 05 and 07.**~~ **Done 2026-09-28**: 03, 04, 05
   and 07 retaken with `scripts/ios-screenshots.sh` on the iPhone 17 Pro Max
   simulator (04 too, for the home screen's new host-picker arrows), and the
   `APP_IPHONE_67` set replaced whole with `asc screenshots upload --replace`,
   01–08 in order; `asc validate` still 0/0. The localized folders beside it
   are older and were never uploaded: every language shows the English set
   until they are retaken. What was wrong: 03 and 07 showed the done card with
   "Use this screenshot: /tmp/hostbeam/…", the old default; since build 10 the
   card shows just the path, and the listing says so. 05, the host page, was
   redesigned on 2026-09-28 (the address split into rows with copy buttons).
   `ScreenshotStage` already stages the bare path, so
   `scripts/ios-screenshots.sh` on a Debug simulator build regenerates them;
   01, 02, 04, 06 and 08 are unaffected. The next archive (build 11) carries
   the host-page change. Otherwise the eight uploaded 6.9-inch shots show no licence
   screen, so they stand. Don't use the held-back Settings screenshot or
   `docs/marketing/screenshots/iap-review.png` — both show the old licence
   section.
9. ~~**Leave the EU off.**~~ **Done the other way, 2026-09-28**: the trader
   address arrived, DSA went Active across 27 countries, and the 26 territories
   were switched back on — France excepted, pending ANSSI. The original
   reasoning, kept because it explains the order: the EU needs a public
   trader address (the DSA item in § 1). Everything else in § 1 marked "Not
   needed for the iPhone launch" stays undone on purpose — it matters again
   only if a paid iPhone layer is ever added.

After these, what is left is § 2's submission-day items (review host up,
release notes as `## iPhone 1.0 — <date>` in `CHANGELOG.md`) and § 3.

---

## 1. Blocked on Apple — nothing here can be worked around

*This section is not in the public repository.* It was a 800-line running log
of getting the developer account verified as a business: D&B, the business
registration documents, the Paid Apps agreement, tax forms and banking, with
the identity details of the owner and the business in it. What transfers:
the verification chain took from early July to late September 2026, every step
waited on a third party (Apple, D&B, the bank), none could be worked around,
and the decision to ship the iPhone app free (ADR 0028) was what finally took
the paid-apps paperwork off the launch path. Start the paperwork on day one,
and do not put a launch date behind it.
## 2. Doable now — no Apple dependency

- [x] **App Privacy labels — decided 2026-08-31.** See
      [the decision](#app-privacy-decision-2026-08-31) below.
- [ ] **Review environment.** The app is useless without an SSH host, so App
      Review needs a working one — the single biggest driver of "couldn't
      verify functionality" rejections for an app like this. See
      [the demo-host problem](#the-demo-host-problem); it is not the simple
      item milestone 008 describes. State on 2026-09-10:
      - [x] The host image still does everything the app asks of it. Re-checked
            after the multi-file work, which the 2026-09-01 rehearsal predates:
            8/8, including a new check covering a **batch** upload, the
            per-name probe a beam does before writing, and the list and delete
            behind the host detail screen. One upload was the whole app in
            September and is no longer enough to prove anything.
      - [x] Review notes written, in
            [app-review-notes.md](../marketing/app-review-notes.md). They now
            lead with the in-app "Beam screenshot" button rather than the share
            sheet — it is the first thing a reviewer sees, and it was missing —
            and explain that hitting the 5-a-day free limit is the intended
            behaviour rather than a fault, since a thorough reviewer will.
            **Since ADR 0028 there is no limit**; the notes say the app is free
            with nothing to buy instead.
      - [x] **Licence key for the key-entry test — minted and stored 2026-09-11;
            moot since ADR 0028**, which removed key entry from the iPhone and
            `{{LICENSE_KEY}}` from the notes. Minted with
            (`node scripts/grant-license.mjs "App Review"`; needs the Paddle ops
            key from 1Password). The checkout link is single-use and **expires
            2026-10-11**; the key it yields does not expire, so redeem it long
            before then. **Store the key in 1Password, never in the repo** —
            `app-review-notes.md` keeps `{{LICENSE_KEY}}` as a placeholder
            deliberately, and it is pasted straight into App Store Connect on
            submission day: **1Password → `Keygen` → field
            `LICENCE KEY (App Review)`**, beside `PRODUCT TOKEN (Hostbeam)`.
            Unlike every other `op://` reference here, nothing reads this one —
            it is for a human to copy into App Store Connect, which is why it
            needs no entry in `release.env`. If the link lapses, mint another;
            nothing is lost.
      - [x] **The local image still passes, re-run 2026-09-28** — 8/8, after
            the multi-file work and with build 10 current:
            `scripts/reviewhost.sh up`, `check`, `down`. Unseen key uploads;
            batch upload, probe, list and delete; shell refused; non-ed25519
            refused; `root`, `dev` and `admin` refused; chroot contains it.
            Free and local, so there is no reason to skip it before the cloud
            box costs anything.
      - [ ] **On submission day**: `scripts/reviewhost-deploy.sh up`, then
            `check` against the public IP, then test from an **erased**
            simulator (`xcrun simctl erase`) — a simulator that has run
            Hostbeam reuses its Keychain key and passes for the wrong reason.
            Deliberately left for the day: billing is hourly and the box must
            not outlive the review.
- [x] **Opted out of Apple Vision Pro — 2026-09-10.** Same screen, also ticked
      by Apple's default. The Mac reasoning below does *not* transfer — there is
      no Hostbeam for visionOS to compete with, and the app would probably work
      — but it is inert either way (1.0 is reported "not compatible and not
      available"), and shipping to a platform the app has never been run on
      invites a review question with no answer. Undecided until today; now
      decided and written down so it is not re-opened by the next person who
      notices the checkbox.
- [x] **Set the price to Free — done 2026-09-28**, in the web UI, across all
      175 countries. Verified with `asc pricing current --app 6804413107`:
      `{"customerPrice":"0.0","proceeds":"0.0","currency":"USD","isFree":true}`,
      which before the change errored with "no current price found for base
      territory USA". The same check confirmed **no in-app purchases and no
      subscriptions exist** (`asc iap list`, `asc subscriptions list`, both
      `total: 0`), and Apple Silicon Mac availability is still unticked.
      Why it was worth doing deliberately: Price Schedule starts
      empty ("Add Pricing"), and `asc validate` does not flag it — free reads as
      nothing to set, which is exactly how it gets missed. **No longer waits on
      the Paid Applications agreement** (ADR 0028): the app is free with no
      IAP, which the free agreement already covers. (It used to read "free with
      a $29 IAP, so the agreement is needed for the IAP regardless".)

      **`asc` cannot do this one — the web UI is the only way (tried
      2026-09-28).** Both `asc pricing schedule create --free` and `asc
      app-setup pricing set --free` require `--start-date`, and Apple rejects
      every value: today is "Entire timeline must be covered for USA. The first
      interval has a start date … in the future", and anything earlier is
      "Interval can not have a start date in the past". The first interval has
      to carry a *null* start date, which neither command can send. Do it in
      Pricing and Availability, and check the same screen still has **iPhone
      and iPad Apps on Apple Silicon Macs** unticked while you are there.
- [x] **Opted out of Mac availability — 2026-09-10.** Pricing and Availability
      → *iPhone and iPad Apps on Apple Silicon Macs* → untick "Make this app
      available". The macOS-version dropdown beside it is a red herring: it only
      matters if you are keeping the Mac listing, and choosing a version there
      quietly assumes you are. **Re-check this after every metadata edit.**
      Apple lists iPhone apps on the Mac App
      Store for Apple Silicon Macs **by default**, as a phone-sized window.
      Hostbeam already has a real Mac app
      sold through Paddle: a Mac user who found the iOS listing first could buy
      the $29 IAP and get the phone app in a window instead of the menu-bar app,
      and the two would sit beside each other in Mac search. (There is no IAP
      since ADR 0028; a phone app in a window beside the real Mac app is still
      the wrong thing to offer.) Reachable now,
      because the app record exists. Not covered by `asc` as far as its docs
      say, so it is a web step — check it survived after every metadata edit.
- [x] **The version in the binary is now the one in `project.yml`.** The
      first archive from `release-ios.sh` (2026-09-04) came out as 1.0 (1)
      although the project said 1.0.0 (2): XcodeGen writes literal values into
      each generated Info.plist and a literal wins over `MARKETING_VERSION` /
      `CURRENT_PROJECT_VERSION`, so no build had ever carried the project's
      numbers — which is why App Store Connect shows "iOS 1.0". The plists now
      reference the build settings, `check-version-sync` reads the plists to
      prove it, and the project says 1.0 to match the record. The build
      number bump is real for the first time.
- [x] **Write the 1.0 release notes — rewritten 2026-09-28** for build 11
      (any file, the agent getting the picture, the host shortcuts) in
      a draft; pasted into `CHANGELOG.md` as `## iPhone 1.0 — 2026-09-28` on
      submission day, and the draft deleted. Originally: write them from `next.md`. There is
      no iPhone lane in `CHANGELOG.md` yet, on purpose: every Mac entry is
      served to Mac users by the updater, so iPhone work does not go there.
      Nothing about 1.0 has shipped, so its notes cover the whole app — and the
      pieces added after the first build (several photos in one share or one
      pick, a beam that stops part-way saying so) are only recorded in
      [next.md § 6](next.md). Add `## iPhone 1.0 — <date>` when you submit.
- [ ] ~~**Attach the in-app purchase to the version before submitting.**~~
      **Not needed for the iPhone launch (ADR 0028 §4, 2026-09-27).** The opposite now: make sure **no** in-app purchase is attached
      to the version (the owner check in § 1). Kept for a paid layer: In
      App Store Connect the version page has an "In-App Purchases and
      Subscriptions" section; the product must be added there and submitted
      *with* the version, or the reviewer sees a purchase that cannot be
      made and rejects for a non-functional IAP. The product itself must be
      "Ready to Submit" with its screenshot and localizations first. This is
      the most common first-submission rejection for a paid unlock, and it is
      one click that is easy to miss.
- [x] **Age rating — set 2026-09-10, all 24 fields in one command.**
      `asc age-rating edit --app 6804413107 --all-none` sets every answer to
      NONE/false, which is exactly what was decided (4+, nothing to declare).
      Read back after: no field is anything but None/false, and all three
      overrides — including Korea — are NONE. **30 findings → 6.** The original
      note follows, because the reasoning still applies if any answer ever
      changes.

      Apple added
      them to the questionnaire (banner seen 2026-09-04). Hostbeam has no
      user-generated content, no messaging, no profiles and no social
      features, so every one is "No" — but they must be answered or the
      rating stays incomplete.
- [x] **Verified what `asc` covers — 2026-09-10** (4.6.0, authenticated).
      The three unknowns § Tooling flagged, settled:
      - **Export compliance is covered** — `asc encryption declarations`. The
        note guessed it was not.
      - **App Privacy is not**, and cannot be: `validate` says the publish state
        "is not verifiable via the public App Store Connect API". Web UI only.
      - **Creating an app record is not offered** (`asc apps` has no `create`).
        Moot — the record exists — but do not plan on it.
      Far more is automatable than the note assumed: `metadata`, `screenshots`,
      `age-rating`, `pricing`, `categories`, `iap`, `review`, `submit`.
- [x] **Run `asc validate` and treat it as the list, not this file.** It is the
      canonical readiness report and it knows things this checklist did not:

          asc validate --app 6804413107 --version 1.0 --platform IOS --output table

      **Clean on 2026-09-28: 0 errors, 0 warnings, 0 blocking.** The last
      blocking finding was `build.required.missing`, fixed by attaching build
      10 (`<build id>`, `VALID`, uploaded 09-27) with
      `asc versions attach-build --version-id <version id>
      --build-id <id>`. Two infos remain and both are wanted: **release type
      MANUAL**, which is the decision below, and **App Privacy publish state
      "not verifiable via the public API"** — the API cannot read it, so
      confirm by eye at `/apps/6804413107/appPrivacy` before submitting. From
      37 findings on 2026-09-10 to none.

      **First run, 2026-09-10: 37 findings — 34 errors, 2 warnings, 1 info**,
      across 11 blocking rules. Most are expected this far out (no build
      attached, no screenshots uploaded).

      **2026-09-19: 1 blocking finding, "no build attached to app store
      version"** — which is submission itself, and waited on the Paid Apps
      Agreement until ADR 0028 (2026-09-27); a free app with no IAP does not. The two remaining are information: the release type is Manual
      (deliberate, so the site, the updater and the store flip together) and
      App Privacy's publish state, which the public API cannot see and which
      reads **Published** in the web UI.

      Four were not tracked anywhere. Three are now done — **2026-09-10, set
      with `asc` and confirmed by re-running `validate`: 37 findings → 34,
      blocking errors 34 → 31** — using the values already decided in
      [app-store-listing.md](../marketing/app-store-listing.md):
      - [x] **Primary category** `DEVELOPER_TOOLS`, secondary `UTILITIES`:
            `asc categories set --app 6804413107 --primary DEVELOPER_TOOLS --secondary UTILITIES`
      - [x] **Content rights**:
            `asc apps update --id 6804413107 --content-rights DOES_NOT_USE_THIRD_PARTY_CONTENT`
      - [x] **Copyright** `2026 PunkABeat`:
            `asc versions update --version-id <version id> --copyright "2026 PunkABeat"`
      - [x] **Availability — set 2026-09-10; EU removed 2026-09-15.** 148 of
            175 territories on, with all 27 EU countries off: France for
            export compliance (§ 4), and the other 26 so that the DSA
            non-trader declaration is true (§ 1). `availableInNewTerritories`
            true. Re-enable them with the same `edit --available true` once a
            trader status is verified. Two things bite here:
            **Apple wants every territory listed, including the ones being
            switched off** — omitting France is rejected with "expects an
            included resource with type 'territories' and id 'FRA' but no
            matching resource was included" — and **the territory list is
            paginated at 50**, so a naive `pricing territories list` silently
            offers a fifth of the world. Create with all of them on, then edit
            the exceptions off:

                asc pricing territories list --paginate   # 175, not 50
                asc pricing availability create --app 6804413107 \
                  --territory "<all 175, comma-separated>" \
                  --available true --available-in-new-territories true
                asc pricing availability edit --app 6804413107 \
                  --territory FRA --available false

            Verify with `pricing availability territory-availabilities
            --availability 6804413107 --paginate` (that flag is `--availability`,
            not `--app`). The excluded row's id is base64 — decode it to see
            which territory it is.

      App id `6804413107`, version 1.0 id
      `<version id>` — most `asc` commands want both.

      **A finding's key is `id`.** Parsing the report for `rule` or `code`
      returns `None` for every row, so a "has this cleared?" check written that
      way reports success for everything, including things that are still
      broken. That is exactly what happened once here, and only the total count
      falling gave it away. Filter on `id`, or read the count.
- [x] **en-US listing copy and screenshots pushed — 2026-09-10.** Written was
      not entered; it is now. Description, keywords, promotional text, support
      and marketing URLs via `asc localizations update`, and the eight 6.9-inch
      screenshots in the decided order via `asc screenshots upload`, all eight
      `COMPLETE`. **30 findings left, down from 37.**

      **The description has since been rewritten** (2026-09-12), so what is
      in App Store Connect is now the old text. See the re-push item below.

          asc localizations update --app 6804413107 \
            --version <version id> --locale en-US \
            --description "…" --keywords "…" --support-url … --marketing-url …

          # screenshots want a per-locale subdirectory, and IPHONE_69 is the
          # right --device-type: it maps to Apple's APP_IPHONE_67 slot. Stage
          # 01-08 only; 09-settings is held back deliberately.
          asc screenshots upload --app 6804413107 \
            --version-id <version id> \
            --device-type IPHONE_69 --path <dir containing en-US/>

- [x] **App Privacy published — 2026-09-10.** **Out of date since ADR 0028**:
      re-answer as Data Not Collected ([the amendment](#app-privacy-decision-2026-08-31)).
      Privacy Policy URL set to
      <https://hostbeam.app/privacy>, and the questionnaire answered exactly as
      the decision below specifies: three data types (User ID, Device ID,
      Purchase History), each App Functionality, each linked to the user, none
      used for tracking. The product page preview shows "Data Linked to You —
      Identifiers, Purchases" and **no "Data Used to Track You" section at
      all**, which is the visible proof the tracking answers went in right.

      Apple's own wording for **Payment Info** confirmed the reasoning for
      leaving it out: "If your app uses a payment service, the payment
      information is entered outside your app, and you as the developer never
      have access to the payment information, it is not Collected and does not
      need to be declared."

      `validate` still reports `privacy.publish_state.unverified`. That is an
      **info, not a task**: the public API cannot read the publish state at all,
      so it says so whatever the truth is. The page says Published.

- [x] **Subtitle — set 2026-09-10** ("Beam screenshots to your host").
      Web UI only. It is an *appInfoLocalization* field, not a
      version field, and **`asc` cannot write it**: `asc localizations update`
      advertises `--subtitle`, `--name` and `--privacy-policy-url` and then
      silently ignores them — the response comes back with only the version
      attributes — and `asc apps info edit` has no such flags at all. Tried
      three ways on 2026-09-10; it went in on **App Information**
      (`/apps/6804413107/distribution/info`) by hand.

      **Superseded 2026-09-12** by "Screenshots to your SSH server". See
      the re-push item below; it is the same by-hand route.

- [x] **Re-push the en-US subtitle and description — done 2026-09-28** (§ 0 step 6).
      Copy changed 2026-09-12.
      Both went in on 2026-09-10 and have since been rewritten in
      [app-store-listing.md](../marketing/app-store-listing.md), so App Store
      Connect holds the old text for both. The other 7 locales were never
      pushed, so the doc is their only source and they need nothing extra —
      but they carry the same two changes, so push them from the doc as it
      stands now, not from memory of the old copy.

      - **Subtitle is now "Screenshots to your SSH server."** English was the
        only locale saying "host" while all seven translations said "server",
        and `ssh` earns more in the subtitle than in the keyword field, which
        Apple weights lower. All 8 subtitles now carry it. Web UI by hand, as
        before: `/apps/6804413107/distribution/info`.
      - **The description now opens on the action**, and the at-a-desk framing
        is gone. The app is for a terminal *on the phone* driving an agent on a
        remote server: that is the one case with no other answer, because a
        phone at a desk can AirDrop and the Claude and Codex apps take an image
        attachment directly. Re-run `asc localizations update … --description`.
        **No longer true for Termius users (found 2026-09-25):** Termius for
        iPhone has pasted images into the terminal since 7.5.0 (July 2026).
        The listing copy claims no uniqueness, so it needs no change; the
        positioning question is in
        [questions.md](../research/questions.md) § Mobile, ship-risk watch.
      - The 7 translated descriptions were regenerated to match and are
        machine-quality, like the app's own locales. They want the same native
        review tracked in [questions.md](../research/questions.md).

- [x] **The other 7 locales — text pushed 2026-09-28** (§ 0 step 6). Their
      screenshots are not: every language shows the English set until the
      localized ones are retaken and uploaded (optional polish). Originally:
      de-DE, es-ES, fr-FR, ja, ko,
      pt-BR and zh-Hans are written and length-checked in
      [app-store-listing.md](../marketing/app-store-listing.md) but not pushed.
      Screenshots for those locales come from
      `scripts/ios-screenshots.sh <sim> <out> <locale>` against the final build.
- [x] **App Store Connect API key — created 2026-09-04** (`hostbeam-release`,
      App Manager, in 1Password as "App Store Connect API (Apple Store)" since 2026-10-29). What it took to
      make the pipeline run, all now in `scripts/release-ios.sh`:
      - **This account's keys cannot use Apple's cloud-managed distribution
        certificate** — the "Access to Cloud Managed Distribution Certificate"
        option is simply not offered when generating a key here, and an
        automatic export fails with "Cloud signing permission error". So
        signing is local: `release-ios.sh signing` has Apple issue an iOS
        Distribution certificate through `asc`, imports it into the login
        keychain, and creates one App Store profile per bundle id (app + 3
        extensions), installed where Xcode looks. The export signs manually
        with those. **Apple confirmed 2026-09-14 that existing certificates
        stay valid and the Team ID is unchanged**. On 2026-09-15, after the
        conversion, `asc certificates list` still showed the Developer ID, iOS
        Distribution and Development certificates, so `signing` does not need
        re-running.
      - **A Homebrew rsync on PATH breaks the IPA step** ("Copy failed"; the
        real error, "rsync: syntax or usage error", is only in the
        `.xcdistributionlogs` bundle). The export runs with `/usr/bin` first.
      - 1Password titles and labels can carry an invisible leading space; the
        script matches on the trimmed title, as the Hetzner one does.
      `archive` → `validate` produced a signed IPA on 2026-09-04 and Apple's
      server-side check of it (`altool --validate-app`, the same check the
      upload runs) came back "VERIFY SUCCEEDED with no errors": the path from
      this checkout to App Store Connect is proven up to the upload itself.
      The distribution certificate's private key lives in the login keychain;
      the API key's `.p8` is also under `~/.appstoreconnect/private_keys/` for
      altool. **The certificate's backup is in 1Password since 2026-10-27**,
      item "iOS Distribution certificate (U3C6XC6LHJ)": the `.p12` attached,
      its export password beside it, expiry 2027-09-04. Before that the only
      copy was this Mac's keychain — the spare once in `apps/mobile/build/`
      had gone with the folder. The certificate is the team's, not the app's:
      any other app on the team would sign with it too, so revoking it reaches them as
      well. On a Mac without it, `release-ios.sh signing` imports it from
      the item, and has Apple issue a new one only when neither the keychain
      nor the item holds a valid one (since 2026-10-27; tested by importing
      into a throwaway keychain — same fingerprint as this Mac's). By hand:
      `security import <file>.p12 -k ~/Library/Keychains/login.keychain-db -P <password> -T /usr/bin/codesign -T /usr/bin/security`
      (the `-T` lets codesign use the key without a prompt, which would
      otherwise stall a headless build).
- [x] **"Sign-in required" unticked — 2026-09-10.** Apple ticks it by default
      and it is wrong for this app: there are no accounts and no credentials to
      give, so a reviewer left looking for a login finds none — the "could not
      verify functionality" rejection arriving by a different door.
- [x] **App Store Version Release set to Manual — 2026-09-10.** Apple defaults
      to *Automatically*. Manual keeps the timing: the site, the Mac updater and
      the store flip inside the same hour rather than on App Review's clock.
- [x] **App Review contact — done 2026-09-19.** the owner's name,
      `support@hostbeam.app`, and a phone number. The number is still
      not written anywhere in this repo, on purpose.

      **The API cannot set it piecemeal.** `asc review details-update` is
      refused without `--contact-phone` in the same request ("You must provide
      a value for the attribute 'contactPhone'"), so the name and email cannot
      go in ahead of the day. All four were entered in the web UI instead, in
      App Store Connect → the version → App Review Information.

      Use the international form. A number beginning `00` is the dialling
      prefix used from the operator's country; App Review calls from the US, where it is `011`,
      and would not reach you. A leading space saved from the web UI too, and
      was trimmed with `asc`. Keep the phone reachable during the review
      window.
- [x] **In-app purchase review screenshot — captured 2026-09-04** (**moot since
      ADR 0028**: no IAP, and Settings has no License section any more):
      `docs/marketing/screenshots/iap-review.png`, Settings → License with
      "Unlock Hostbeam · $29.00" showing, the product loaded from the local
      StoreKit configuration. To redo it: Xcode (not `xcodebuild`, not
      `simctl` — only Xcode's Run attaches `Hostbeam.storekit`), scheme
      Hostbeam, destination iPhone 17 Pro Max, with `-hb-stage settings` set
      temporarily as a run argument in `project.yml`, then
      `xcrun simctl io booted screenshot`. Under the debugger the first
      launch takes close to a minute and the screen stays black until then.

### Hardened for review, 2026-09-04

Found by a last full audit of the app against the rejection triggers that
actually get used, and fixed the same day:

- [x] **Privacy manifests** in the app and all three extensions
      (`PrivacyInfo.xcprivacy`): UserDefaults through the app group as the
      required-reason API, tracking off, and the three collected data types
      mirroring the App Privacy answers. None existed; Apple checks these at
      upload. **Since ADR 0028 the app's manifest declares no collected data**,
      like the extensions'.
- [x] **Build number guard.** `CURRENT_PROJECT_VERSION` was still 1 with build
      1 already on TestFlight — App Store Connect would have refused the next
      upload after the archive and signing. It is 2 now, uploaded builds are
      recorded in `apps/mobile/uploads.json`, and `check-version-sync` refuses
      a number that is not above the last one.
- [x] **Upload from the terminal**: `scripts/release-ios.sh` archives,
      validates and uploads with the API key (xcodebuild's own
      `destination: upload`; no altool, no Transporter). It never submits for
      review.

      **Builds 4 and 5 went up on 2026-09-19**, the first since build 3 on
      2026-09-05 — and the last three before them had been archived and never
      uploaded, so TestFlight had none of the rating prompt, the Rate and
      Request rows, JPEG photos, the 2000 px cap, the folder-owner check or the
      What's new link. Build 5 adds the editable host address, the pairing link
      and four translations. Apple validated it before upload; the next archive
      is build 6.

      **Apple never shows the rating prompt in a TestFlight build**
      (`requestReview` is a no-op there), so it can only be checked in a
      development build on the device — not, as this file once implied, through
      TestFlight.
- [x] **Review notes drafted in full** —
      [`app-review-notes.md`](../marketing/app-review-notes.md): what it is,
      no sign-in, the host, the exact taps, the widget/Control/Shortcut, the
      free tier and IAP, the licence key with 3.1.3(b) stated, the video and
      its older host address. (Free tier, IAP and key are gone since ADR 0028;
      the notes say "free, nothing to buy".) `reviewhost-deploy.sh notes` prints it filled in.
- [x] **Every App Store Connect form field decided** — categories, age
      rating, copyright, content rights, sign-in, release option, Mac opt-out,
      and the IAP's reference name, price, per-locale display names and
      descriptions (lengths checked) — in
      [`app-store-listing.md`](../marketing/app-store-listing.md) § App Store
      Connect fields. Only the review contact phone is left for the day.
- [x] **No link from the app to the page that sells the licence** (3.1.1):
      the Settings "Website" row is gone; privacy, terms, changelog and support
      stay.
- [x] **Camera denied** no longer shows a black scanner: the QR view asks for
      access properly and, when refused, says so with an Open Settings button.
      Typing the host remains the fallback.
- [x] **Photos denied** in-app gets its own sentence and an Open Settings
      button, instead of the Shortcuts wording "open Hostbeam once".
- [x] **Store unreachable** is said out loud with a retry, instead of a
      silently disabled "Unlock Hostbeam" — which reads as "purchase not
      functional" to a reviewer. (Moot since ADR 0028: there is no purchase.)

Verified fine and left alone: usage descriptions for camera and photos in
the right targets; no transport-security exceptions, background modes,
analytics or crash reporters; no debug entitlements or placeholder strings;
all screenshot-rig code behind `#if DEBUG`; 159/159 strings translated in
all 7 locales; product id, price, name and seats consistent across the
StoreKit file, the code, the listing and the site; Restore Purchases present;
licence-key entry mentions neither prices nor the website; the privacy
policy covers the Keygen check and the App Store transaction id.

## 3. Last — re-run against the final build

Milestone 008 said to record against the final submission build so nothing is
recorded twice. Both the screenshots and the video were made before it, once
each was one scripted command to redo, so the rule became: **re-run the two
scripts against the final build** and compare, rather than wait for it.

- [x] **Screenshots — English set current as of build 11, 2026-09-28** (§ 0
      step 8: 03, 04, 05 and 07 retaken and uploaded). Localized sets: see the
      other-7-locales item. The English 6.9-inch set exists —
      `docs/marketing/screenshots/ios-6.9/`, numbered in upload order, plus a
      held-back Settings shot, first captured 2026-08-29 with the DEBUG rig in
      `ScreenshotStage.swift`. Order decided 2026-09-02: share sheet → beaming
      → done → home → host detail → widget → home done → onboarding. The first
      three are what search results show, and they tell the whole loop. The
      host stage (`-hb-stage host`) was added the same day because the set
      had no answer to "how does it connect to my server".
      **Re-verified 2026-09-02** against current code: the rig re-run was
      pixel-identical on every store screen (the home screens differ only in
      the "41 seconds ago" text), so the fixes since capture changed nothing
      the store shows. Only Settings moved (the appearance picker gave way to
      the "Beam faster" section), and that shot is held back.
      **05-host recaptured in all 8 languages, 2026-09-19.** The Address row
      gained a chevron (it opens the address editor now), and "Connection",
      "SSH connection", "Remote folder writable" and "Round-trip" had never
      been translated — the engine names its steps in plain English strings, so
      every locale's host screenshot read half in English. Fixed in the catalog
      and by localizing the diagnostic rows by step id.

      **Filenames in the shots stay date-shaped — decided 2026-09-13.** Both
      apps now name files with a millisecond stamp, but this set, and the rig in
      `ScreenshotStage.swift` that makes it, show `hostbeam-2026-08-28-153012.png`
      style names. Left as they are: nobody compares a filename in a store
      screenshot, and re-shooting for it buys nothing. The other seven locales
      come from the same rig, so all eight will match. The listing text, the
      site and the link preview were switched (`a6c2c21`), because those are
      read rather than glanced at.
      **The other seven languages were captured 2026-09-13**, into
      `ios-6.9/<locale>/` (de-DE, es-ES, fr-FR, ja, ko, pt-BR, zh-Hans), 01–09
      each, every shot checked. The script sets only the *app's* language, so
      each run first switched the simulator's own (`AppleLanguages` and
      `AppleLocale` in its `.GlobalPreferences.plist`, while shut down);
      without that the Home Screen widget (06) and the share sheet (01) stay
      English. 01 was driven through the Simulator window rather than by hand.
      Worth knowing before redoing any of it:
      - The fixed 3.5 s wait in `shot()` raced the first frame: five blank
        shots, and two host shots taken before the detail had pushed. It now
        waits for a settled, non-blank screen, which in turn outlived the done
        card's 6 s fade on a slow launch, so the rig skips that fade
        (`RootView`, DEBUG only). A size-and-variance check against the English
        set caught every one of these; looking at a couple of shots did not.
      - Some of Apple's own share-sheet strings stay English in the iOS 26.3
        simulator in several locales ("1 Photo(s) Selected", "Use as
        Wallpaper"). They are Apple's strings, not ours.
      - `asc screenshots upload` wants one subdirectory per locale, and the
        English set is still flat in `ios-6.9/`: stage it as `en-US/` and
        upload 01–08 only.
      **The whole set is one command** — `scripts/ios-screenshots.sh <sim>
      <out> [locale]` against a Debug simulator build — which is what to run
      against the final build, once per locale for the other 7. Only
      `01-share-sheet` is by hand: real Photos UI, retaken only if the share
      extension's icon or name changes.
      **The widget shot cannot come from the widget gallery on this Mac.**
      Leaving jiggle mode crashes the iOS 26.3 simulator's SpringBoard in its
      own ripple animation (`SBHRippleSimulation`, an Intel-only segfault;
      Reduce Motion does not reach it), and the layout is not saved first —
      found 2026-09-02 after two attempts. The script writes the widget into
      SpringBoard's saved layout (`IconState.plist`) while the simulator is
      shut down, so it is on the Home Screen at boot without any animation.
      The wallpaper is a one-time manual step per simulator (script header):
      the iOS 26 default renders as striped moire on the Intel simulator, so
      the committed shot uses a plain black wallpaper set through Settings.
- [x] **Demo video for App Review Information — recorded 2026-09-03**:
      `docs/marketing/video/app-review-demo.mp4`, 48 s, 1080p, the full loop
      against the Hetzner review host with the terminal beside the phone.
      Recorded before the final build on purpose: the beam-loop screens were
      proven pixel-stable across the recent fixes, the purchase surface the
      "final build" rule was written for never appears in it, and a re-take
      is ten scripted minutes (`scripts/ios-demo-video.sh`) if the share or
      home UI changes before submission. The box it shows is gone; the
      review notes will carry the address of the one deployed on submission
      day, and a line saying the video was made against an earlier instance
      of the same image. **Correction, 2026-09-28: App Store Connect has no
      review attachment** (`asc review attachments-list` → 0) and empty
      review notes, so neither went in; and the video predates the free app
      and just-the-path (its done card shows "Use this screenshot: …").
      Re-record it with `scripts/ios-demo-video.sh` against the submission-day
      box and attach it with the notes. **No App Preview (store video) at v1** —
      marketing-only, and extra metadata-rejection surface.
- [x] **Custom Control fixed (2026-09-05).** It was not a signing issue:
      build 2 on TestFlight was just as inert as the dev builds. The cause
      was `BeamLastScreenshotInAppIntent` living only in the widget
      extension while `openAppWhenRun = true` makes the system run the
      intent *in the app process*; the app had no such intent, so a tap
      resolved to nothing. `Widgets/BeamControlIntent.swift` is now compiled
      into both targets (`project.yml`). Verified on the phone with a dev
      build and again on TestFlight build 3 (App Store signing): the tap
      opens Hostbeam and beams. The review notes keep the Control line.

### Recording plan — rehearsed 2026-09-03

Two full takes against the local review container from the simulator, both
beams landing; the second take is the reference cut. The whole procedure is
`scripts/ios-demo-video.sh` (`stage` → `start` → tap → `stop` → `cut`), and
the numbers in it are the rehearsal's. Budget ten minutes for the real take,
not an afternoon.

- **Prop**: a dark app screen with one red row, generated by `stage` and
  dropped into Photos, where the 2026-08-29 props still are, so the library
  looks like a library.
- **The take** (~35 s): Hostbeam home → Home button → Photos → the prop →
  Share → Hostbeam → the Copied card dismisses itself → Home button → tap the
  widget → the app opens and beams → stop. The file shows in the terminal
  within a second of the Copied card, both times.
- **The host is seeded, not typed**: `stage` writes the host into the app
  group through the simulator's own defaults daemon, clears the history and
  the free-tier counter (five beams a day would otherwise have bitten on
  retakes; nothing counts since ADR 0028, so this is now harmless),
  and relaunches the app already green.
- **For the real take** point `stage` at the Hetzner box from
  `reviewhost-deploy.sh` and set `HOSTBEAM_DEMO_WATCH` to list its upload
  folder; the container is identical.

What the rehearsal found, each of which would have cost the real take:

- **`simctl io recordVideo` is not wall-clock.** It drops repeated frames on
  static screens: 40 s of device video covered 47 s of real time, so it
  cannot be lined up with a terminal recording by any offset. Both halves now
  come from **one** ffmpeg capture of the display, in sync by construction.
- **`screencapture -v` writes nothing if stopped early.** Take one lost its
  terminal footage to that. ffmpeg's avfoundation input stops cleanly.
- **The Terminal title bar shows the user and machine name.** The crop starts
  below it.
- **The listing wraps at a demo-sized font**, so the watch prints size and
  name only.
- **Start tapping the moment `start` says recording** — every take so far
  carried ten to fifteen seconds of dead time while the operator waited for
  confirmation. It trims, but it is the first thing to cut every time.
- **The widget beam is slower than the share-sheet beam** — about 8 s
  against 2 s in the real take (it opens the app and exports the newest
  photo first), so the cut must run at least 10 s past the widget tap or it
  ends on "Beaming…". Use the phone-screen brightness timeline in the
  script's notes, or just watch the tail.
- **The pointer is recorded** despite `-capture_cursor 0`; it shows over the
  phone at the tap moments. Tolerable for a review attachment, and there is
  no clean way round it while the taps are made with the mouse.
- **The prop is added to Photos once per simulator** (marker file); before
  that, every `stage` re-run added another copy and the library grid in the
  take filled with identical dark tiles.

**Take 3 (2026-09-03, against the Hetzner box) is the candidate final**: 48 s,
both beams landing on `review@203.0.113.18`, the file names appearing in the
terminal within a second of each Copied card.

An external `simctl openurl` always shows an "Open in Hostbeam?" confirmation
that a real widget tap does not — so drive those segments by tapping, or the
recording shows a prompt users never see.

## 3b. The day it goes live — put the App Store back on the site

This section is the site. The whole launch — the Mac and MCP server alongside,
the directory listings, the clips and the posts — is
[launch-day.md](launch-day.md), which links back here.

`apps/web` currently tells the truth about iOS, which is that there is nothing
to install. Everything that pointed at `APP_STORE_URL` came out on 2026-09-08
(commit `1f1260b`), because a button that 404s and a QR that scans to an error
page are worse than saying "coming soon" plainly.

**`scripts/ios-launch-site.sh` puts it all back in one reviewable change.**
Written and *run* on 2026-09-10, not just written: it restores `StoreQr.tsx`
and the `.store-qr` rules out of `1f1260b^`, adds both missing imports, and
makes the copy edits — including, since 2026-09-28, the two "will be free"
sentences ADR 0028 left in the future tense (`IphoneApp.tsx` and `llms.txt`
§ Price), which are true only while nobody can install the app. Every edit asserts it matched, so drifted copy stops
the script rather than half-applying it. Verified end to end — typecheck clean,
9 pages built, `dist/llms.txt` carrying the store URL, the landing page saying
"Get it on the App Store" and no longer "Coming soon" — then reverted.

Running it before there is an app to install would publish a 404. It is for the
day Apple approves the build, not before.

```sh
scripts/ios-launch-site.sh          # apply
git diff                            # read it — that is the point of one command
npm run typecheck:web && npm run build:web
npm run deploy:web
```

Two things it deliberately leaves (all done 2026-10-09: the QR under the
button, hidden on phones and fixed-colour so it scans in dark mode; the FAQ
read and true; `installUrl` added; the card and the MCP README updated):

- [x] **Place `<StoreQr />`** beside the button in `IphoneApp.tsx`. The
      component and its CSS are restored and the import is done; where it sits
      is a layout decision, not a substitution.
- [x] **Read `lib/faq.ts` once.** It already describes the iPhone app in the
      present tense — deliberately, as product documentation — so confirm every
      sentence is true rather than changing anything.

- [x] Also check `seo.ts` still wants `installUrl: APP_STORE_URL` in the
      `SoftwareApplication` block; the script sets `operatingSystem` and the
      `featureList` line but does not invent a field that may have moved.
- [x] **Give the link preview the phone.** `apps/web/public/assets/og.png` is
      what X, Slack and iMessage show when the link is shared, and its tagline
      still reads "From the Mac menu bar, over your own SSH." Edit that line in
      `docs/marketing/og-card.svg` — something like "From your Mac or your
      iPhone, over your own SSH." — and re-export with the recipe at the top of
      that file. Do it **before the first launch link is posted**: platforms
      cache a preview by URL, so a card shared early keeps the old line. Not
      done before launch for the same reason the store button waits:
      advertising a phone app nobody can install sends the first clicks to a
      dead end. To check the export, diff it against the previous PNG — only
      that one line should change.
- [x] **Tell the MCP server's README about the phone.**
      `apps/agent/publish/README.md` is the npm page and the public repo's
      front page, and it introduces Hostbeam as a Mac app only, for the same
      reason. Add the iPhone to its opening paragraph, bump the version in
      `publish/package.json` and `VERSION` in `hostbeam-mcp.mjs` (a test holds
      them together), and release it with `scripts/mcp-release.sh`. npm shows
      the README of the latest published version, so an edit without a release
      changes nothing anyone sees.
- [x] `npm run deploy:web`.

## 4. Deliberately excluded at v1

- **France.** Export compliance was answered "no non-exempt encryption" with
  France answered **No**, to skip the ANSSI documentation branch. Including
  France needs the one-time ANSSI simple declaration (ssi.gouv.fr) filed and the
  acknowledgment uploaded. Until then France stays out of availability.
- **China mainland** (off 2026-09-28, before submission). Selling there needs
  an ICP filing number, which needs an entity in China; without one the app
  cannot be sold there anyway, and Apple's help does not say whether a missing
  number delays review, so it is off rather than a question. 173 of 175
  territories remain.
- **App Preview video** in the store listing — see §3.
- **iCloud sync** — assessed and declined 2026-08-31, `questions.md` § Mobile.

## 5. Tooling

The listing copy is already written and in git:
[`docs/marketing/app-store-listing.md`](../marketing/app-store-listing.md) —
name, subtitle, promotional text, description, keywords, URLs, and
localizations, each verified against the ASC field limits. "What's New" is
correctly empty: the field does not exist for a first version.

- [x] **Give the iPhone its first changelog entry, at submission — done
      2026-09-28** (`## iPhone 1.0 — 2026-09-28`; its closing paragraph became
      a bullet, because the parser drops prose after a `###`). It goes public
      with the next site deploy. Written as a product rather than a
      diff, because the `**iPhone:**` bullets in the Mac entries are increments
      to an app no App Store user has ever had. Kept out of `CHANGELOG.md`
      deliberately: the site renders numbered entries immediately, so the
      heading in git *is* the announcement. `CHANGELOG.md`
      carries both apps: a bare heading is a Mac release, `## iPhone 1.0 — <date>`
      is an iPhone one. Write that entry when the build goes for review, from the
      `**iPhone:**` bullets already in the Mac entries — they describe work no App
      Store user has ever received, so 1.0's notes are the product, not a diff.
      The moment it lands, hostbeam.app/changelog labels every entry with its app
      and offers a Mac/iPhone filter; before it lands the page looks exactly as it
      does today. Verified end to end on 2026-09-07 by building the site with a
      throwaway iPhone entry: filter chips appeared, the entry sorted first by
      date, Mac showed 16 entries and iPhone 1, and `changelog.mjs --json` and
      `--history` (what `latest.json` is built from) still returned only Mac
      versions. From the second iPhone release on, `changelog.mjs
      --platform=iphone` prints the notes for ASC's "What's New".

`asc` ([asccli.sh](https://asccli.sh/), MIT, `brew install asc`) drives
screenshot upload and framing, metadata across locales, build upload, readiness
checks, TestFlight and submission — **and, verified 2026-09-10, also export
compliance (`encryption declarations`), age rating, categories, pricing and
availability, content rights, copyright, and in-app purchases.** Two things it
does not do: create an app record, and the App Privacy questionnaire, which is
web-only and which `validate` explicitly reports it cannot see.

`asc validate` is the readiness report and should be the source of truth on
submission day; this file is a plan, that command is the state.

It needs an **App Store Connect API key with App Manager role**. This is *not*
the `APPSTORE_*` key already in the repo: that one is an App Store Server API
key used by the licensing worker to validate transactions. Two different keys
for two different jobs; do not reuse.

**Uploading is repeatable; submitting is not.** Builds and metadata can be
pushed and corrected freely. Submit-for-review is outward-facing and awkward to
undo — it should be an explicit decision each time, never a step inside a
script.

## Corrections to milestone 008

Its "Remaining before submission" list was written on 2026-08-29 and three of
its six items have since been done. Verified 2026-08-31:

| Item | Claimed | Actual |
|---|---|---|
| Privacy policy URL | "the site has no /privacy page yet" | `https://hostbeam.app/privacy` returns 200 |
| Export compliance | "Consider `ITSAppUsesNonExemptEncryption=false`" | Set, in `project.yml:66` and `Info.plist` |
| Geist OFL text | listed as an open minor item | Bundled at `apps/mobile/App/Fonts/OFL.txt` |

The IAP item is also narrower than it reads: the **client** is built
(`PurchaseController.swift`, `Hostbeam.storekit`, product
`app.hostbeam.ios.license` at $29). What is missing is the App Store Connect
product, which is blocked on the agreements in §1. (Moot since ADR 0028: the
iPhone has no IAP.)

---

## App Privacy decision (2026-08-31)

**Amended 2026-09-27 by ADR 0028 §4: Data Not Collected.** With no licence and
no in-app purchase on the iPhone, nothing reaches Hostbeam: `LicenseClient` is
never called (no Keygen check, no revalidation) and `PurchaseController` is
never created (no transaction exchange). The only thing that leaves the phone is
the screenshot, to the user's own host, which is not collected (below).
`apps/mobile/App/PrivacyInfo.xcprivacy` now declares no collected data types,
matching the three extensions. **Owner, web only:** re-answer App Privacy in App
Store Connect as "Data Not Collected" and publish before submission. The
published answers still declare User ID, Device ID and Purchase History. The
site's privacy policy is updated with the site (ADR 0028, Consequences). The
reasoning below is kept for a paid layer that brings the licence back.

**Where these screens live.** App Store Connect app URLs are
`https://appstoreconnect.apple.com/apps/6804413107/distribution/<page>` —
`distribution/privacy` for App Privacy, `distribution/info` for App
Information, `distribution/pricing` for Pricing and Availability. A bare
`/apps/<id>` renders a blank page, and so does the `/apps/<id>/appPrivacy`
that `asc validate` prints in its remediation text: that path is **stale**, and
it fails silently — the header and nav load, the body never does, which looks
like a broken account rather than a wrong URL. Two blank screens were spent on
this on 2026-09-10.


### What actually leaves the phone

Enumerated from the code, not from memory:

| Destination | Payload | When |
|---|---|---|
| `api.keygen.sh` | licence key, fingerprint, `"iOS"`, `"iPhone"` | licensed users only |
| `license.hostbeam.app/appstore/key` | StoreKit `transactionId` | IAP purchasers only |
| the user's own SSH host | the screenshot | every beam |
| — | nothing | free users — the daily limit is counted on-device |

Two details that shape the answer. `deviceName()` in `Licensing.swift` returns
the **literal string `"iPhone"`**, not `UIDevice.current.name`, so no personal
device name is transmitted. And the fingerprint is an app-generated UUID in the
Keychain (`ThisDeviceOnly`, never synchronizable) — not IDFV, not IDFA.

**The screenshot is not "collected".** Apple's definition turns on whether the
developer or its partners can access the data; it goes device → the user's own
server over the user's own SSH, and no Hostbeam system can read it.

### The declaration

| Data type | Purpose | Linked to the user | Used for tracking |
|---|---|---|---|
| Identifiers → **User ID** (the licence key) | App Functionality | **Yes** | No |
| Identifiers → **Device ID** (the fingerprint) | App Functionality | **Yes** | No |
| Purchases → **Purchase History** (the transaction id) | App Functionality | **Yes** | No |

Everything else: **Data Not Collected**. **Used to Track You: No** — there is no
advertising, no data broker, no cross-app linkage anywhere in the product, and
the site uses cookieless Cloudflare Web Analytics.

### Why "Linked", against milestone 008's suggestion

Milestone 008 item 5 proposed *"Identifiers — app functionality, not linked to
identity"* as the conservative option. **That is the wrong direction, and it is
not conservative.**

The licence key resolves to a real person in our own systems: the webhook writes
`metadata.email` onto the Keygen licence, and `scripts/find-license.mjs` depends
on exactly that to answer support requests. Apple's test is whether the data is
associated with an identity *through any means the developer holds*, not whether
the app transmits the email. It is, so it is linked.

Declaring "not linked" would be a factual misstatement about data we can, in
fact, tie to a person. The cost of declaring honestly is one line on the privacy
card reading "Data Linked to You: Identifiers, Purchases", which sits awkwardly
beside a product that says nothing leaves your machine. That is the better trade:
the awkwardness is explainable, an inaccurate label is not.

If the linkage is ever worth breaking, the lever is `metadata.email` on the
Keygen licence — but it is load-bearing for support, so that is a real trade and
not a tidy-up.

### The privacy policy had to change with it

It said the licence check *"is the only network request the apps make on our
behalf"*, which stops being true the moment IAP ships: `PurchaseController`
posts the transaction id to `license.hostbeam.app/appstore/key`. A paragraph now
covers that explicitly, because Apple reads the policy and the labels together
and a contradiction between them is a rejection.

---

## The demo-host problem

Milestone 008 says to submit with "a throwaway demo host (credentials/key
pre-installed)". **There is no key to pre-install.**

`DeviceKey.loadOrCreate` mints a fresh Curve25519 key on first use, in that
install's Keychain (ADR 0016 §4 — deliberately per-device and non-migratable).
So the reviewer's install generates a key no host has ever seen. And
`CitadelTransport` offers **only** `.ed25519` publickey auth — password auth is
explicit non-scope — so there is no fallback path.

The consequence: a reviewer opens the app, adds the demo host from the notes,
and **every beam fails**, because their key is not in its `authorized_keys` and
cannot be put there in advance. That is a "we were unable to verify the
functionality" rejection, and the demo video does not prevent it — reviewers
generally try the app regardless.

### Options

1. **A host that accepts any offered key**, via an `AuthorizedKeysCommand` that
   echoes back what was offered. The only option that actually works, because it
   is the only one that does not require knowing the key in advance.
2. **The reviewer installs the key themselves.** The app already shows a
   copyable `authorized_keys` command — but running it needs a shell on the
   host, which needs a second credential and a terminal. High friction inside a
   review, and likely to be skipped, which lands back at option 1's failure.
3. **Video only.** Does not survive a reviewer who opens the app.
4. **Bake a key into a review build.** No. A private key in an App Store binary
   is indefensible, and it would ship to everyone.

### Built: `scripts/reviewhost.sh`

Option 1, containerised so the exact configuration that will face the internet
can be run and verified locally first.

```sh
scripts/reviewhost.sh up       # locally, on port 2224
scripts/reviewhost.sh check    # prove an unseen key can beam, and only that
scripts/reviewhost.sh remote   # what to run on the VPS, and when to kill it
scripts/reviewhost.sh down
```

`check` verifies all seven properties, and passes as of 2026-09-01:

| | |
|---|---|
| unseen ed25519 key uploads to `/tmp/hostbeam` | PASS |
| shell refused | PASS |
| non-ed25519 key refused | PASS |
| users `root` / `dev` / `admin` refused | PASS |
| chroot contains it (cannot read `/etc/shadow`) | PASS |

**`ControlPath=none` in `check` is load-bearing.** A `ControlMaster auto` in
`~/.ssh/config` — which this machine has — silently reuses an earlier successful
connection, so every negative test passes for the wrong reason. It cost a wrong
conclusion once already: an RSA key appeared to be accepted when it was simply
riding a multiplexed session.

The remote folder is the app's **default** `/tmp/hostbeam`, pre-created inside
the chroot, so a reviewer adds the host and changes nothing.

### Deploying it

`scripts/reviewhost-deploy.sh` puts the same container on a Hetzner Cloud box
and takes it away again. It needs a Cloud API token (Read & Write), read from
1Password like the release secrets — item `Hetzner`, field
`HCLOUD_TOKEN (hostbeam review host)`, or `HCLOUD_TOKEN` in the environment.

```sh
scripts/reviewhost-deploy.sh up      # ~2 min for cloud-init to build the image
scripts/reviewhost-deploy.sh status  # is port 2222 open yet
scripts/reviewhost-deploy.sh notes   # the text to paste into App Review Information
scripts/reviewhost-deploy.sh down    # destroy the server, firewall and admin key
```

`up` creates a `cx22` in Ashburn — a US location, because App Review largely is
— with a firewall open on 22 (admin) and 2222 (the review host) and nothing
else. It generates a **dedicated** admin key under
`~/.config/hostbeam-reviewhost/`, never your own.

cloud-init carries the four container files inline, base64'd out of
`scripts/reviewhost/`. That is the point: the box never needs credentials for a
private repo, and what runs there is what was verified locally, not a
re-implementation.

Billing is hourly, so a two-week review is a couple of euros. **`down` is part
of the design, not tidying up** — the box must not outlive the review, and the
script says so on the way out.

**The notes give a name, `review.hostbeam.app`, not just the address**
(2026-09-28). App Review tests on IPv6-only networks, where a bare IPv4
address works only if the phone synthesizes an IPv6 one; the name has an A and
an AAAA record for the box (the box listens on both, and the firewall admits
`::/0`), so nothing needs synthesizing. The records are in Cloudflare, by hand,
and must be **DNS only**: proxied, the name answers with Cloudflare's addresses
and SSH hangs. `up` makes a box with new addresses, so update both records
after it, and delete both after `down`.

### Rehearsed end to end, 2026-09-01

Created for real, tested from an erased simulator, destroyed. It cost about two
cents and found three things that would each have cost an hour on submission
day:

- **`cx22` is deprecated** — the create fails outright with "server type 104 is
  deprecated".
- **`cpx11` is priced for `fsn1` but cannot be built there.** `/server_types`
  publishes prices for machines that are not available; only `/datacenters`
  knows what can actually be created. The script now **discovers** the cheapest
  available type rather than naming one, because Hetzner retires types often
  enough that any constant here is a future failed deploy.
- **`apparmor_parser` is missing on Debian 12.** `docker.io` does not pull in
  the userspace parser, so `docker build` died — and the next command then tried
  to *pull* an image that had never been built, reporting "repository does not
  exist", which points at entirely the wrong thing. `apparmor` is installed now,
  and build and run are chained with `&&`.

Second attempt: **port 2222 open 45 seconds after create.** All six hardening
checks passed against the public IP, and a beam from a freshly erased simulator
landed on the server — a device key minted minutes earlier, which that host had
never seen.

Also corrected: **US locations cost about three times EU** for the same machine
(Ashburn EUR 20.49/mo against EUR 5.99). Latency does not matter for one small
SFTP upload with no interactive session, so it defaults to the EU.

Two SSH gotchas worth remembering, both from this machine's `~/.ssh/config`:
`ControlMaster auto` reuses an authenticated connection and makes negative tests
pass for the wrong reason, and a loaded agent triggers "Too many authentication
failures" before your `-i` key is offered. `ControlPath=none` and
`IdentitiesOnly=yes` are required in anything that tests this host.

### How it is hardened

An SSH server accepting any key is an open door for the review window, so it
should hold nothing and do nothing else:

- a dedicated throwaway box, torn down once the app is approved
- `ForceCommand internal-sftp` with `ChrootDirectory` — the app is SFTP-only
  (`openSFTP` + `ensureDirectory`); it never needs a shell. `-d /tmp/hostbeam`
  starts each session in the beam folder: the app takes the start folder as
  the login's own, and the chroot's top is root's, so without it every beam
  was refused as "another user's" folder (2026-09-28; questions.md)
- `AllowTcpForwarding no`, `PermitTunnel no`, `X11Forwarding no`
- one writable upload directory, named in the review notes as the remote folder
- a non-default port, to cut background noise

**Test it from an erased simulator** (`xcrun simctl erase`) before submitting,
not from a device that already has a key. A simulator that has run Hostbeam
before will reuse its Keychain key and pass for the wrong reason — which is
exactly the mistake this section exists to prevent.

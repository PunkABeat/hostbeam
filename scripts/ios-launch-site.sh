#!/usr/bin/env bash
# Put the App Store back on hostbeam.app, the day the iPhone app is approved.
#
#   scripts/ios-launch-site.sh          # apply, then review `git diff`
#
# Everything pointing at APP_STORE_URL was removed on 2026-09-08 (commit
# 1f1260b): a button that 404s and a QR that scans to an error page are worse
# than saying "coming soon" plainly. This puts it all back in one reviewable
# change, so launch day is a diff to read rather than eight edits to remember.
#
# It does NOT deploy. `npm run deploy:web` is yours, after you have looked.
#
# Every edit asserts it actually matched. If the copy has drifted since this was
# written, the script stops and names the file rather than half-applying and
# leaving the site in a state nobody intended.
set -euo pipefail
cd "$(dirname "$0")/.."
WEB=apps/web/src
DELETED_IN=1f1260b   # the commit that removed StoreQr.tsx and the .store-qr CSS

say() { printf '  %s\n' "$*"; }
die() { printf '\n  STOPPED: %s\n\n' "$*" >&2; exit 1; }

# 1. StoreQr.tsx, recovered from the commit that deleted it.
if [ -f "$WEB/components/StoreQr.tsx" ]; then
  say "StoreQr.tsx already present — left alone"
else
  git show "$DELETED_IN^:$WEB/components/StoreQr.tsx" > "$WEB/components/StoreQr.tsx" \
    || die "could not recover StoreQr.tsx from $DELETED_IN^"
  say "StoreQr.tsx restored"
fi

# 2. The .store-qr rules, from the same commit, appended if missing.
if grep -q "store-qr" "$WEB/styles/landing.css"; then
  say ".store-qr CSS already present — left alone"
else
  git show "$DELETED_IN^:$WEB/styles/landing.css" \
    | awk '/^\.store-qr/,/^}$/' >> "$WEB/styles/landing.css" \
    || die "could not recover the .store-qr rules"
  say ".store-qr CSS restored"
fi

# 3-6. The copy edits.
python3 - "$WEB" <<'PY'
import pathlib, sys
web = pathlib.Path(sys.argv[1])

def edit(rel, pairs):
    p = web / rel
    s = original = p.read_text()
    for old, new in pairs:
        if new in s and old not in s:
            print(f"  {rel}: already updated")
            return
        if old not in s:
            raise SystemExit(f"\n  STOPPED: {rel} no longer contains the text this "
                             f"script replaces. Re-read the file and update the script.\n")
        s = s.replace(old, new, 1)
    if s != original:
        p.write_text(s)
        print(f"  {rel}: updated")

edit("components/IphoneApp.tsx", [
    # The import first: without it the button below does not compile, and a
    # launch-day script that leaves a guaranteed type error is not finished.
    ('import { BeamMark, Ic } from "@hostbeam/ui";',
     'import { BeamMark, Ic } from "@hostbeam/ui";\n\nimport { APP_STORE_URL } from "../lib/links";'),
    ("""            <span className="badge-soon">
              <Ic name="smartphone" size={15} /> Coming soon to the App Store
            </span>""",
     """            <a className="btn btn-primary" href={APP_STORE_URL}>
              <Ic name="smartphone" size={15} /> Get it on the App Store
            </a>"""),
    ("""              The iPhone app is built and in testing. Pairing starts on{" "}""",
     """              Pairing starts on{" "}"""),
    # ADR 0028 (2026-09-27) made the iPhone free and the licence Mac-only. The
    # sentence itself stays true either way; only its tense stops being right
    # the moment the app is downloadable.
    ("              and it will be free, with nothing to buy inside it.",
     "              and it is free, with nothing to buy inside it."),
])

edit("lib/seo.ts", [
    ('        operatingSystem: "macOS 13 or later",',
     '        operatingSystem: "macOS 13 or later, iOS 17 or later",'),
    ('"An iPhone companion that beams from the share sheet, paired by QR from the Mac — coming to the App Store",',
     '"An iPhone companion that beams from the share sheet, paired by QR from the Mac",'),
])

edit("pages/llms.txt.ts", [
    ('import { BREW_COMMAND, DMG_URL } from "../lib/links";',
     'import { APP_STORE_URL, BREW_COMMAND, DMG_URL } from "../lib/links";'),
    ("""- iPhone: not released yet. The companion app is built and in testing, and will
  pair with the Mac by QR. There is nothing to install on iOS today.""",
     """- iPhone: ${APP_STORE_URL}"""),
    ("Requires macOS 13 or later. The iPhone app will require iOS 17 or later.",
     "Requires macOS 13 or later, or iOS 17 or later."),
    # The licence line ("…and iPhones once the iPhone app ships") went with
    # ADR 0028: the licence is Mac-only. What is left is the § Price line, true
    # today only because nobody can install the app yet.
    ("- The iPhone app will be free, with no in-app purchase and no license.",
     "- The iPhone app is free, with no in-app purchase and no license."),
])

# /add, where the Mac's pairing QR lands on a phone without the app: it offers
# the App Store instead of "coming soon".
edit("lib/links.ts", [
    ("export const IPHONE_APP_LIVE = false;", "export const IPHONE_APP_LIVE = true;"),
])

# The closing call to action, at the very bottom of the page. Unlike the hero
# button, by the time a reader reaches this one they have already read the
# iPhone section, so the store is the right destination rather than a scroll.
edit("components/Download.astro", [
    ('import { BREW_COMMAND, DMG_URL, RAYCAST_URL } from "../lib/links";',
     'import { APP_STORE_URL, BREW_COMMAND, DMG_URL, RAYCAST_URL } from "../lib/links";'),
    ("""        {/* Says what it does until the App Store record goes live and this
            becomes APP_STORE_URL (lib/links.ts). */}
        <a class="btn btn-ghost" href="#iphone">""",
     """        <a class="btn btn-ghost" href={APP_STORE_URL}>"""),
])
PY

cat <<'NEXT'

  Still yours, by hand:
    · IphoneApp.tsx — render <StoreQr /> where you want it beside the button.
      The component is restored and the import is done; the script does not
      guess at layout.
    · seo.ts — put `installUrl: APP_STORE_URL` back in the SoftwareApplication
      block if it is still absent.
    · lib/faq.ts — already written in the present tense, deliberately. Read it
      once and confirm every sentence is now true.
    · Nothing else on pricing: the two "will be free" sentences (IphoneApp.tsx,
      llms.txt.ts § Price) are flipped to the present tense by this script,
      which is the only thing ADR 0028 left them needing.

  Then:
    npm run typecheck:web && npm run build:web
    git diff                  # read it. This is the whole point of one command.
    npm run deploy:web

NEXT

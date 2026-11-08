// The two artifact URLs, both live: the DMG since v0.1.0, the App Store since
// iPhone 1.0 was released on 2026-10-09.
export const DMG_URL = "https://download.hostbeam.app/Hostbeam.dmg";
// Apple ID 6804413107 is the app's record in App Store Connect.
export const APP_STORE_URL = "https://apps.apple.com/app/hostbeam/id6804413107";
/** Whether the iPhone app is on the App Store. Read by /add, the page a pairing
 *  link opens on a phone without the app. Flip it on launch day
 *  (docs/process/launch-day.md); the landing page's iPhone section is restored
 *  by hand, per the submission checklist § 3b. */
export const IPHONE_APP_LIVE = true;
// Homebrew: the cask lives in github.com/PunkABeat/homebrew-tap and is
// bumped by scripts/homebrew-bump.sh on every macOS release.
/** The Raycast Store listing (merged 2026-10-07). It drives the Mac app, so it
 *  is offered after the download, never instead of it. */
export const RAYCAST_URL = "https://raycast.com/PunkABeat/hostbeam";
export const BREW_COMMAND = "brew install --cask punkabeat/tap/hostbeam";
/** The 44-second launch film (apps/video), in the R2 bucket behind
 *  download.hostbeam.app rather than on this site: R2 answers the byte-range
 *  requests Safari needs to play an MP4, and the site's static assets do not.
 *  Still first-party, so the film adds no third-party request. Versioned and
 *  cached as immutable: a new cut is uploaded as -2, never over -1. */
export const FILM_URL = "https://download.hostbeam.app/film/hostbeam-launch-1.mp4";
export const FILM_POSTER = "/assets/film-poster.jpg";

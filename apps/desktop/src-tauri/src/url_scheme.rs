//! `hostbeam://` links (ADR 0025): what a URL may ask for, and the parking that
//! lets an ask survive the seconds between a cold start and the popover's
//! webview existing.

use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager};

use crate::actions::{beam_in_popover, beams_immediately, switch_host};
use crate::popover::show_panel;
use crate::{config, log};

/// What an incoming `hostbeam://` URL asks for. Only one verb so far, and it
/// is the one the whole app is about; anything else is refused rather than
/// guessed at, because a scheme is an open door and the app behind it should
/// answer exactly what it advertises.
#[derive(Debug, PartialEq, Eq)]
pub(crate) enum UrlAsk {
    Beam,
    /// Make this host the current one — the id as the config knows it.
    SwitchHost(String),
    /// Open Preferences, optionally at a named tab.
    Preferences(Option<String>),
}

/// Read a URL the system handed us. `None` for anything that is not ours, and
/// for a verb this build does not know — a newer link opened on an older
/// version does nothing rather than something approximate.
/// Parsed as a URL rather than split as a string, so `?id=my%20box` arrives
/// as the host id someone actually typed.
pub(crate) fn url_ask(url: &tauri::Url) -> Option<UrlAsk> {
    if url.scheme() != "hostbeam" {
        return None;
    }
    match url.host_str()?.to_ascii_lowercase().as_str() {
        "beam" => Some(UrlAsk::Beam),
        "host" => {
            let id = url.query_pairs().find(|(key, _)| key == "id")?.1;
            (!id.is_empty()).then(|| UrlAsk::SwitchHost(id.into_owned()))
        }
        "preferences" => Some(UrlAsk::Preferences(
            url.query_pairs()
                .find(|(key, _)| key == "tab")
                .map(|(_, tab)| tab.into_owned())
                .filter(|tab| !tab.is_empty()),
        )),
        _ => None,
    }
}

/// How long an ask from a URL waits for a webview that does not exist yet.
///
/// A `hostbeam://` link that *launches* the app arrives before the popover's
/// webview has registered anything, so the eval lands on nothing — files
/// survive this because they are parked in `actions::PendingOpen`, and asks did
/// not. They are parked too, and for a few seconds only: a beam that fired
/// minutes later, on some unrelated reload, would be exactly the surprise
/// upload this app refuses to do, and a host that changed on its own is the
/// same surprise one step earlier.
pub(crate) const URL_ASK_GRACE: Duration = Duration::from_secs(10);

/// Whether something parked this long ago is still what was asked for.
pub(crate) fn url_ask_still_wanted(age: Duration) -> bool {
    age <= URL_ASK_GRACE
}

/// One ask waiting for the webview. The payload is whatever the ask needs —
/// nothing, for a beam; a host id, for a switch.
#[derive(Default)]
pub(crate) struct Parked(std::sync::Mutex<Option<(String, Instant)>>);

impl Parked {
    fn park(&self, payload: String) {
        *self.0.lock().unwrap_or_else(|p| p.into_inner()) = Some((payload, Instant::now()));
    }

    /// Take it, if it is still fresh. Taking always empties the slot: a stale
    /// ask is dropped rather than left to surprise someone later.
    fn take(&self) -> Option<String> {
        let parked = self.0.lock().unwrap_or_else(|p| p.into_inner()).take();
        parked.and_then(|(payload, at)| url_ask_still_wanted(at.elapsed()).then_some(payload))
    }
}

/// The two asks a link can park, managed by Tauri (`app.manage`).
#[derive(Default)]
pub struct ParkedAsks {
    beam: Parked,
    host: Parked,
}

/// Take the parked beam, if there is a fresh one. Called by the popover when
/// it mounts — a cold start — and by its beam handler itself, so whichever
/// gets there first drains it and the other finds nothing.
#[tauri::command]
pub fn take_url_beam(asks: tauri::State<'_, ParkedAsks>) -> bool {
    asks.beam.take().is_some()
}

/// The same, for a parked host switch.
#[tauri::command]
pub fn take_url_host(asks: tauri::State<'_, ParkedAsks>) -> Option<String> {
    asks.host.take()
}

/// A beam asked for by `hostbeam://beam` — a Raycast command, a script, the
/// agent itself. On unless Preferences says otherwise (ADR 0025): the switch
/// stays, because this link sends a screenshot to a server, and the log says
/// which door a beam came through.
pub(crate) fn beam_from_url(app: &AppHandle) {
    let cfg = config::read(app);
    if !cfg.settings.allow_url_beam {
        log::info("hostbeam://beam ignored — not allowed in Preferences → Beaming");
        return;
    }
    if beams_immediately(cfg.settings.immediate, !cfg.added_ids.is_empty()) {
        log::info("hostbeam://beam → immediate beam");
        // Park first, then ask. A running app's webview answers the eval and
        // drains the parked copy on its way through; a cold start's webview
        // is not there to hear it and collects the parked one on mount.
        app.state::<ParkedAsks>().beam.park(String::new());
        beam_in_popover(app);
    } else {
        log::info("hostbeam://beam → show popover");
        show_panel(app);
    }
}

/// A host switch asked for by `hostbeam://host?id=…`. Behind the same consent
/// as a beam: switching uploads nothing by itself, but it decides where the
/// *next* beam goes, and a screenshot arriving on a different one of your
/// machines is the same surprise one step earlier (ADR 0025).
pub(crate) fn switch_host_from_url(app: &AppHandle, host_id: &str) {
    if !config::read(app).settings.allow_url_beam {
        log::info("hostbeam://host ignored — not allowed in Preferences → Beaming");
        return;
    }
    // Parked for the same reason a beam is: the link may be what launched the
    // app. The webview refuses an id the config does not have, so a link can
    // only ever pick between hosts already added here.
    app.state::<ParkedAsks>().host.park(host_id.to_string());
    switch_host(app, host_id);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_parked_ask_waits_for_the_webview_but_not_for_long() {
        // The cold start it exists for: launch, webview, beam — seconds.
        assert!(url_ask_still_wanted(Duration::from_millis(0)));
        assert!(url_ask_still_wanted(Duration::from_secs(3)));
        assert!(url_ask_still_wanted(URL_ASK_GRACE));
        // Past that it is not what anyone asked for any more.
        assert!(!url_ask_still_wanted(
            URL_ASK_GRACE + Duration::from_millis(1)
        ));
        assert!(!url_ask_still_wanted(Duration::from_secs(600)));
    }

    #[test]
    fn taking_a_parked_ask_leaves_nothing_behind() {
        let parked = Parked::default();
        parked.park("prod".into());
        assert_eq!(parked.take().as_deref(), Some("prod"));
        assert_eq!(parked.take(), None, "it is gone once taken");
        // A stale one is dropped rather than handed over — and dropped for
        // good, so the next caller cannot collect it either.
        *parked.0.lock().unwrap() = Some(("prod".into(), Instant::now() - Duration::from_secs(60)));
        assert_eq!(parked.take(), None);
        assert_eq!(parked.take(), None);
    }

    #[test]
    fn the_two_slots_do_not_share_an_ask() {
        let asks = ParkedAsks::default();
        asks.beam.park(String::new());
        assert_eq!(asks.host.take(), None, "a beam is not a host switch");
        assert!(asks.beam.take().is_some());
    }

    fn ask(url: &str) -> Option<UrlAsk> {
        url_ask(&tauri::Url::parse(url).ok()?)
    }

    #[test]
    fn the_scheme_answers_exactly_what_it_advertises() {
        assert_eq!(ask("hostbeam://beam"), Some(UrlAsk::Beam));
        // A trailing slash, a query, a fragment: all the same ask.
        assert_eq!(ask("hostbeam://beam/"), Some(UrlAsk::Beam));
        assert_eq!(ask("hostbeam://beam?from=raycast"), Some(UrlAsk::Beam));
        assert_eq!(ask("hostbeam://BEAM"), Some(UrlAsk::Beam));
    }

    #[test]
    fn a_host_link_carries_the_host_it_names() {
        assert_eq!(
            ask("hostbeam://host?id=prod"),
            Some(UrlAsk::SwitchHost("prod".into()))
        );
        // Percent-encoding is why this is parsed as a URL, not split.
        assert_eq!(
            ask("hostbeam://host?id=my%20box"),
            Some(UrlAsk::SwitchHost("my box".into()))
        );
        // Other parameters are none of its business.
        assert_eq!(
            ask("hostbeam://host?from=raycast&id=prod"),
            Some(UrlAsk::SwitchHost("prod".into()))
        );
    }

    #[test]
    fn a_host_link_naming_no_host_does_nothing() {
        // Rather than switching to something arbitrary, or to nothing.
        assert_eq!(ask("hostbeam://host"), None);
        assert_eq!(ask("hostbeam://host?id="), None);
        assert_eq!(ask("hostbeam://host?name=prod"), None);
    }

    #[test]
    fn a_preferences_link_opens_the_tab_it_names() {
        assert_eq!(
            ask("hostbeam://preferences"),
            Some(UrlAsk::Preferences(None))
        );
        assert_eq!(
            ask("hostbeam://preferences?tab=general"),
            Some(UrlAsk::Preferences(Some("general".into())))
        );
        // An empty tab is no tab, not a tab called "".
        assert_eq!(
            ask("hostbeam://preferences?tab="),
            Some(UrlAsk::Preferences(None))
        );
        // `open_preferences` is what refuses a tab that is not a plain slug;
        // this only carries what was asked for.
        assert_eq!(
            ask("hostbeam://preferences?tab=../etc"),
            Some(UrlAsk::Preferences(Some("../etc".into())))
        );
    }

    #[test]
    fn a_verb_this_build_does_not_know_does_nothing() {
        // A link written for a later version must not be approximated.
        assert_eq!(ask("hostbeam://beamall"), None);
        assert_eq!(ask("hostbeam://quit"), None);
        assert_eq!(ask("hostbeam://"), None);
    }

    #[test]
    fn nothing_that_is_not_our_scheme_is_ours() {
        assert_eq!(ask("file:///tmp/a.png"), None);
        assert_eq!(ask("https://hostbeam.app/beam"), None);
        // Not a prefix match on someone else's scheme, either.
        assert_eq!(ask("nothostbeam://beam"), None);
        assert_eq!(ask(""), None);
    }
}

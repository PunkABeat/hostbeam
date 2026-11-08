//! Menu-bar (status) icon: the Hostbeam beam glyph as a template image, plus a
//! short "beam travelling down" animation shown while a beam is in flight.

use std::sync::{Arc, Condvar, Mutex};
use std::time::Duration;

use tauri::image::Image;
use tauri::AppHandle;

pub const TRAY_ID: &str = "main";

const STATIC: &[u8] = include_bytes!("../icons/tray/menubar.png");
/// The resting icon with a badge, shown while auto-beam is armed. A mode that
/// uploads screenshots without being asked has to be visible without opening
/// anything, so it lives in the menu bar rather than only in the popover.
const ARMED: &[u8] = include_bytes!("../icons/tray/menubar-armed.png");
const FRAMES: [&[u8]; 3] = [
    include_bytes!("../icons/tray/menubar-1.png"),
    include_bytes!("../icons/tray/menubar-2.png"),
    include_bytes!("../icons/tray/menubar-3.png"),
];

fn img(bytes: &'static [u8]) -> Image<'static> {
    Image::from_bytes(bytes).expect("decode bundled tray PNG")
}

/// The icon the tray returns to whenever nothing is in flight — which is not a
/// constant, because auto-beam has its own resting state.
fn resting(app: &AppHandle) -> &'static [u8] {
    if crate::auto_beam::is_armed(app) {
        ARMED
    } else {
        STATIC
    }
}

/// The resting menu-bar icon at startup, before any state exists to consult.
pub fn static_icon() -> Image<'static> {
    img(STATIC)
}

/// Put the tray back to whichever resting icon is currently correct. Called when
/// auto-beam is armed or disarmed, including when it expires on its own.
pub fn refresh(app: &AppHandle) {
    set(app, resting(app));
}

fn set(app: &AppHandle, bytes: &'static [u8]) {
    // Tray/status-item updates must happen on the main thread on macOS. Icon
    // updates are cosmetic with no recovery, so failures are logged, not propagated
    // (this can fire each animation frame, but only ever logs when something breaks).
    let handle = app.clone();
    crate::log::warn_if_err(
        "tray icon update (main thread)",
        app.run_on_main_thread(move || {
            if let Some(tray) = handle.tray_by_id(TRAY_ID) {
                crate::log::warn_if_err("set tray icon", tray.set_icon(Some(img(bytes))));
                crate::log::warn_if_err("set tray icon template", tray.set_icon_as_template(true));
            }
        }),
    );
}

/// Run `work`, cycling the tray frames for its duration, then restore the
/// resting icon. The animation runs on its own thread so the work isn't blocked.
pub fn animate_during<T>(app: &AppHandle, work: impl FnOnce() -> T) -> T {
    // A condvar rather than a bare flag, because the wait has to be
    // interruptible. The frame delay used to be a plain sleep, and the stop flag
    // was only re-read between frames — so a beam that landed 10ms into a frame
    // still held `join()` for the remaining 140ms with the file already on the
    // host and nothing left to show. That wind-down is on the path the caller
    // times and the user waits through: ~75ms on average, 150ms at worst, on
    // every beam. Now the frame delay ends the moment the work does.
    let stop = Arc::new((Mutex::new(false), Condvar::new()));
    let anim = {
        let app = app.clone();
        let stop = stop.clone();
        std::thread::spawn(move || {
            let (flag, wake) = &*stop;
            let mut i = 0usize;
            // A poisoned lock means the setter panicked mid-beam. The icon is
            // cosmetic, so recover the guard and finish the animation rather
            // than take the beam down with it.
            let mut stopped = flag.lock().unwrap_or_else(|e| e.into_inner());
            while !*stopped {
                set(&app, FRAMES[i % FRAMES.len()]);
                i += 1;
                stopped = wake
                    .wait_timeout(stopped, Duration::from_millis(150))
                    .unwrap_or_else(|e| e.into_inner())
                    .0;
            }
            drop(stopped);
            // Back to whichever resting icon is right — a beam that finishes
            // while auto-beam is armed must not clear the badge.
            set(&app, resting(&app));
        })
    };
    let out = work();
    {
        let (flag, wake) = &*stop;
        *flag.lock().unwrap_or_else(|e| e.into_inner()) = true;
        wake.notify_all();
    }
    if anim.join().is_err() {
        crate::log::error("tray animation thread panicked");
    }
    out
}

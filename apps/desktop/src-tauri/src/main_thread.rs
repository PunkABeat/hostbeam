//! Running a closure on the main thread, the GCD way.

use dispatch2::{DispatchQueue, DispatchTime};

/// Run `f` on the main thread as soon as possible, and wake the run loop.
/// Through GCD rather than Tauri's `run_on_main_thread`: that goes through the
/// event-loop proxy, which does not wake an idle accessory app's run loop, so
/// a proxied call would sit unserviced until a click pumped the loop.
pub(crate) fn on_main<F: Send + FnOnce() + 'static>(f: F) {
    let _ = DispatchQueue::main().after(DispatchTime::NOW, f);
}

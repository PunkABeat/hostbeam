//! Show in Finder for a Recent row: the file on this Mac it was beamed from.
//!
//! Only rows that came from a file have one — a drop, a file opened with
//! Hostbeam, a copy in Finder. A clipboard picture never was a file. The
//! webview names rows by id, not by path, so this reveals only what Hostbeam
//! itself recorded, and it reveals rather than opens: nothing is run.
//!
//! Through `NSWorkspace`, not `open -R` or AppleScript: it needs no Automation
//! permission, and scripting Finder is refused on some Macs outright.

use std::path::PathBuf;

use tauri::AppHandle;

use crate::config::RecentBeam;

/// Reveal the source files of the Recent rows `ids` — one row, or every file
/// of one drop — selected together in Finder. Returns how many were still
/// there to reveal: 0 means moved or deleted since, and the row says so.
#[tauri::command]
pub fn reveal_recent(app: AppHandle, ids: Vec<String>) -> usize {
    let paths = locals(&crate::config::read(&app).recent, &ids);
    crate::log::info(format!(
        "show in Finder: {} of {} file(s) still there",
        paths.len(),
        ids.len()
    ));
    if !paths.is_empty() {
        let reveal_these = paths.clone();
        crate::main_thread::on_main(move || reveal(&reveal_these));
    }
    paths.len()
}

/// The source files of the rows `ids` that are still where they were beamed
/// from, in the order asked for. A row with none, or a path that is not
/// absolute, is skipped.
pub(crate) fn locals(recent: &[RecentBeam], ids: &[String]) -> Vec<PathBuf> {
    ids.iter()
        .filter_map(|id| recent.iter().find(|r| &r.id == id))
        .filter_map(|r| r.local.as_deref())
        .map(PathBuf::from)
        .filter(|p| p.is_absolute() && p.exists())
        .collect()
}

#[cfg(target_os = "macos")]
fn reveal(paths: &[PathBuf]) {
    use objc2::runtime::AnyObject;
    use objc2::{class, msg_send};
    objc2::rc::autoreleasepool(|_| unsafe {
        let urls: *mut AnyObject = msg_send![class!(NSMutableArray), array];
        for path in paths {
            let Ok(c) = std::ffi::CString::new(path.to_string_lossy().as_bytes()) else {
                continue;
            };
            let s: *mut AnyObject = msg_send![class!(NSString), stringWithUTF8String: c.as_ptr()];
            let url: *mut AnyObject = msg_send![class!(NSURL), fileURLWithPath: s];
            let _: () = msg_send![urls, addObject: url];
        }
        let workspace: *mut AnyObject = msg_send![class!(NSWorkspace), sharedWorkspace];
        let _: () = msg_send![workspace, activateFileViewerSelectingURLs: urls];
    });
}

#[cfg(not(target_os = "macos"))]
fn reveal(_paths: &[PathBuf]) {}

#[cfg(test)]
mod tests {
    use super::*;

    fn row(id: &str, local: Option<&str>) -> RecentBeam {
        RecentBeam {
            id: id.into(),
            path: format!("/tmp/hostbeam/{id}"),
            local: local.map(str::to_string),
            ..RecentBeam::default()
        }
    }

    #[test]
    fn only_rows_with_a_file_still_there_are_revealed() {
        let dir = std::env::temp_dir().join(format!("hb-reveal-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let here = dir.join("report.pdf");
        std::fs::write(&here, b"x").unwrap();
        let gone = dir.join("moved.pdf");
        let recent = vec![
            row("a", Some(here.to_str().unwrap())),
            row("b", Some(gone.to_str().unwrap())),
            row("c", None),                   // a clipboard picture
            row("d", Some("relative/x.pdf")), // never trusted
        ];
        let ids = ["a", "b", "c", "d", "zz"].map(String::from);
        assert_eq!(locals(&recent, &ids), vec![here.clone()]);
        std::fs::remove_dir_all(&dir).unwrap();
    }
}

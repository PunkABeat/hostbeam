//! The one way into the system clipboard.
//!
//! Every read and write goes through [`with`], for two reasons a crash in
//! 0.1.27 made plain (2026-09-24: `abort()` on a tokio worker, mid-beam, by way
//! of `__rust_foreign_exception`):
//!
//! - **One thread at a time.** AppKit's pasteboard is not safe to use from
//!   several threads at once, and a beam used it from up to three, each on its
//!   own `spawn_blocking` thread: the beam reading the image it sends, the HUD
//!   fetching that same image for its thumbnail, and — when a `hostbeam://`
//!   link had just activated the app — the popover checking what is there.
//! - **An exception is an error, not a crash.** When AppKit fails it throws an
//!   Objective-C exception, and Rust cannot unwind one: it aborted the whole
//!   app, from a background thread, with the beam half done. Caught here, it
//!   fails the one call that hit it and says so in the log.
//!
//! It also decides what a clipboard beam sends ([`current`]): files named on
//! the clipboard, or a picture — and never the icon Finder leaves beside a
//! copied file.

use std::path::PathBuf;
use std::sync::Mutex;

use crate::error::{CommandError, Error};

/// Held for the whole of one use — opening the clipboard, the read or write,
/// and dropping the handle — so two uses never overlap.
static LOCK: Mutex<()> = Mutex::new(());

/// Run `f` against the system clipboard: alone, and with any Objective-C
/// exception turned into an [`arboard::Error`].
///
/// Keep `f` to the clipboard call itself. Everything else — scaling, encoding,
/// the upload — belongs after it returns, so no other clipboard use waits on it.
pub(crate) fn with<T>(
    f: impl FnOnce(&mut arboard::Clipboard) -> Result<T, arboard::Error>,
) -> Result<T, arboard::Error> {
    let _alone = LOCK.lock().unwrap_or_else(|p| p.into_inner());
    guarded(|| arboard::Clipboard::new().and_then(|mut clipboard| f(&mut clipboard)))
}

/// What is on the clipboard, told from its types alone — nothing behind them is
/// read. Enough for auto-beam to decide without looking at what was copied.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub(crate) struct Kinds {
    /// A file URL: a copy in Finder, or a capture tool that also names the
    /// file it saved (CleanShot X does).
    pub files: bool,
    /// Image data the copying app put there itself — `public.png`,
    /// `public.tiff` or `public.jpeg` among an item's own types.
    ///
    /// Not the same as [`Kinds::image`]. A copy in Finder carries the file's
    /// icon as `com.apple.icns`, and AppKit will convert that to TIFF on
    /// request, so "is a TIFF available" says yes to a copied PDF — and arboard
    /// reads that TIFF, which is how the shortcut would have beamed a 1 MB
    /// picture of the PDF icon. Recorded on 2026-09-26: Finder's items carry
    /// `public.file-url`, the name as text and `com.apple.icns`, nothing else.
    pub picture: bool,
    /// An image AppKit will hand over as PNG or TIFF, its own conversions
    /// included. What arboard reads, and what auto-beam always went by.
    pub image: bool,
}

/// What a clipboard beam sends, decided before any pixels are read.
#[derive(Debug, PartialEq, Eq)]
pub(crate) enum Source {
    /// The files the clipboard names — a copy in Finder.
    Files(Vec<PathBuf>),
    /// The picture, read as pixels: scaled to the cap and sent as a PNG.
    Image,
    /// Nothing a beam can use.
    Nothing,
}

/// The rule, as a pure function of what [`kinds`] saw and the files the
/// clipboard names.
///
/// **A file URL wins over an icon, and a real picture wins over its own file.**
/// Finder names the file and adds only its icon, so the file is what goes —
/// never the icon. CleanShot X names the file it saved *and* puts the real PNG
/// there, and for that the picture goes, as it always has: it gets the size cap
/// and auto-beam keeps working (owner's call, 2026-09-26). The picture only
/// wins when every file it came with is a picture too; a copied PDF with some
/// preview image beside it is still the PDF.
///
/// A file URL that names nothing readable (a copied file since deleted) falls
/// back to the picture only if one is really there — never to an icon.
pub(crate) fn source(kinds: Kinds, files: Vec<PathBuf>) -> Source {
    if !files.is_empty() {
        let all_pictures = files.iter().all(|f| crate::beam::is_image_path(f));
        return if kinds.picture && all_pictures {
            Source::Image
        } else {
            Source::Files(files)
        };
    }
    let image = if kinds.files {
        kinds.picture
    } else {
        kinds.image
    };
    if image {
        Source::Image
    } else {
        Source::Nothing
    }
}

/// What a clipboard beam would send right now. Types and the file list are read
/// in one turn of the lock, so they describe the same copy.
///
/// A file list that fails to read for any reason but "there is none" is an
/// error, not an empty list: falling back to the image is exactly how a copied
/// file's icon would be beamed.
pub(crate) fn current() -> Result<Source, arboard::Error> {
    with(|c| {
        let kinds = read_kinds();
        let files = if kinds.files {
            match c.get().file_list() {
                Ok(files) => files,
                Err(arboard::Error::ContentNotAvailable) => Vec::new(),
                Err(e) => return Err(e),
            }
        } else {
            Vec::new()
        };
        Ok(source(kinds, files))
    })
}

/// The clipboard's [`Kinds`], alone and guarded like every other use.
pub(crate) fn kinds() -> Result<Kinds, arboard::Error> {
    let _alone = LOCK.lock().unwrap_or_else(|p| p.into_inner());
    guarded(|| Ok(read_kinds()))
}

/// `[[NSPasteboard generalPasteboard] changeCount]`: an integer that moves when
/// anything is copied — no contents, no types. Auto-beam polls it.
pub(crate) fn change_count() -> Result<i64, arboard::Error> {
    let _alone = LOCK.lock().unwrap_or_else(|p| p.into_inner());
    guarded(|| Ok(read_change_count()))
}

#[cfg(target_os = "macos")]
fn read_change_count() -> i64 {
    use objc2::runtime::AnyObject;
    use objc2::{class, msg_send};
    unsafe {
        let pb: *mut AnyObject = msg_send![class!(NSPasteboard), generalPasteboard];
        let count: isize = msg_send![pb, changeCount];
        count as i64
    }
}

#[cfg(not(target_os = "macos"))]
fn read_change_count() -> i64 {
    0
}

/// Every item's own types, and whether a PNG or TIFF is available. Types only:
/// the data behind them is never asked for. Called with [`LOCK`] held.
#[cfg(target_os = "macos")]
fn read_kinds() -> Kinds {
    use objc2::runtime::AnyObject;
    use objc2::{class, msg_send};
    use std::ffi::{c_char, CStr};

    let mut kinds = Kinds::default();
    objc2::rc::autoreleasepool(|_| unsafe {
        let pb: *mut AnyObject = msg_send![class!(NSPasteboard), generalPasteboard];
        let items: *mut AnyObject = msg_send![pb, pasteboardItems];
        let n: usize = if items.is_null() {
            0
        } else {
            msg_send![items, count]
        };
        for i in 0..n {
            let item: *mut AnyObject = msg_send![items, objectAtIndex: i];
            let types: *mut AnyObject = msg_send![item, types];
            if types.is_null() {
                continue;
            }
            let m: usize = msg_send![types, count];
            for j in 0..m {
                let ty: *mut AnyObject = msg_send![types, objectAtIndex: j];
                let utf8: *const c_char = msg_send![ty, UTF8String];
                if utf8.is_null() {
                    continue;
                }
                match CStr::from_ptr(utf8).to_bytes() {
                    b"public.file-url" => kinds.files = true,
                    b"public.png" | b"public.tiff" | b"public.jpeg" => kinds.picture = true,
                    _ => {}
                }
            }
        }
        // Each call spelled out in its own binding, as auto-beam always did:
        // building the array inline as the argument once compiled and then
        // answered yes for a plain-text clipboard, which would have woken the
        // beam path on every copy of anything.
        for uti in [c"public.png", c"public.tiff"] {
            let s: *mut AnyObject = msg_send![class!(NSString), stringWithUTF8String: uti.as_ptr()];
            let arr: *mut AnyObject = msg_send![class!(NSArray), arrayWithObject: s];
            let available: *mut AnyObject = msg_send![pb, availableTypeFromArray: arr];
            if !available.is_null() {
                kinds.image = true;
                break;
            }
        }
    });
    kinds
}

#[cfg(not(target_os = "macos"))]
fn read_kinds() -> Kinds {
    Kinds::default()
}

/// `f`, with an Objective-C exception it throws returned as an error. Split
/// from [`with`] so a test can throw one without touching the real clipboard.
#[cfg(target_os = "macos")]
fn guarded<T>(f: impl FnOnce() -> Result<T, arboard::Error>) -> Result<T, arboard::Error> {
    // Unwind safety: after an exception nothing `f` touched is used again — its
    // clipboard handle is gone with it, and the lock is held outside `catch`.
    match objc2::exception::catch(std::panic::AssertUnwindSafe(f)) {
        Ok(result) => result,
        Err(exception) => {
            let what = exception.map_or_else(|| "nil".to_string(), |e| e.to_string());
            crate::log::error(format!("clipboard: AppKit threw — {what}"));
            Err(arboard::Error::Unknown {
                description: format!("the system clipboard threw: {what}"),
            })
        }
    }
}

#[cfg(not(target_os = "macos"))]
fn guarded<T>(f: impl FnOnce() -> Result<T, arboard::Error>) -> Result<T, arboard::Error> {
    f()
}

/// Text the interface copies — a Recent row's paste-ready sentence, the logs,
/// the pairing link — put on the clipboard here rather than by WebKit's
/// `navigator.clipboard`, so it waits its turn behind [`LOCK`] instead of
/// landing in the middle of a beam's read. The webview could already put any
/// text on the clipboard that way, so this gives it nothing it did not have.
/// Off the main thread, because the turn may be a beam's image read.
#[tauri::command]
pub async fn copy_text(text: String) -> Result<(), CommandError> {
    tauri::async_runtime::spawn_blocking(move || with(|c| c.set_text(text)))
        .await
        .map_err(|_| Error::Join)?
        .map_err(|e| {
            crate::log::warn(format!("copy failed: {e}"));
            CommandError::from(Error::Clipboard(e))
        })
}

#[cfg(test)]
mod source_tests {
    use super::{source, Kinds, Source};
    use std::path::PathBuf;

    fn files(names: &[&str]) -> Vec<PathBuf> {
        names
            .iter()
            .map(|n| PathBuf::from(format!("/tmp/{n}")))
            .collect()
    }

    // The three copies recorded on 2026-09-26, as the pasteboard reported them.
    const FINDER: Kinds = Kinds {
        files: true,
        picture: false,
        image: true, // the icon, converted to TIFF on request
    };
    const CLEANSHOT: Kinds = Kinds {
        files: true,
        picture: true,
        image: true,
    };
    const SCREENSHOT: Kinds = Kinds {
        files: false,
        picture: true,
        image: true,
    };

    #[test]
    fn a_copy_in_finder_sends_the_file_never_its_icon() {
        assert_eq!(
            source(FINDER, files(&["Nine-Things.pdf"])),
            Source::Files(files(&["Nine-Things.pdf"]))
        );
        // A copied picture too: Finder's clipboard holds its icon, not its
        // pixels, so the file is what goes.
        assert_eq!(
            source(FINDER, files(&["Screenshot 2026-08-25.png"])),
            Source::Files(files(&["Screenshot 2026-08-25.png"]))
        );
        // A file link that names nothing readable any more still never falls
        // back to the icon.
        assert_eq!(source(FINDER, vec![]), Source::Nothing);
    }

    #[test]
    fn a_capture_tools_real_picture_wins_over_its_own_file() {
        // CleanShot X names the PNG it saved and puts the PNG there: the
        // picture goes, capped, as it always has.
        assert_eq!(
            source(
                CLEANSHOT,
                files(&["CleanShot 2026-09-26 at 23.00.19@2x.png"])
            ),
            Source::Image
        );
        assert_eq!(source(CLEANSHOT, vec![]), Source::Image);
    }

    #[test]
    fn a_picture_beside_anything_that_is_not_one_sends_the_files() {
        // A PDF with a preview image beside it is still the PDF.
        assert_eq!(
            source(CLEANSHOT, files(&["report.pdf"])),
            Source::Files(files(&["report.pdf"]))
        );
        assert_eq!(
            source(CLEANSHOT, files(&["a.png", "b.pdf"])),
            Source::Files(files(&["a.png", "b.pdf"]))
        );
    }

    #[test]
    fn without_a_file_link_nothing_changes() {
        assert_eq!(source(SCREENSHOT, vec![]), Source::Image);
        // An app that only offers a TIFF by conversion still beams, as before.
        let converted = Kinds {
            files: false,
            picture: false,
            image: true,
        };
        assert_eq!(source(converted, vec![]), Source::Image);
        assert_eq!(source(Kinds::default(), vec![]), Source::Nothing);
    }
}

#[cfg(all(test, target_os = "macos"))]
mod tests {
    use super::*;
    use objc2::msg_send;
    use objc2::rc::Retained;
    use objc2::runtime::NSObject;

    #[test]
    fn an_appkit_exception_fails_the_call_instead_of_the_app() {
        // A real NSException (NSInvalidArgumentException, unrecognized
        // selector) thrown from inside the closure, the way AppKit's pasteboard
        // threw mid-beam. Before `guarded`, this aborted the test process.
        let obj = std::panic::AssertUnwindSafe(NSObject::new());
        let result: Result<(), arboard::Error> = guarded(|| {
            let _: Retained<NSObject> = unsafe { msg_send![&*obj, copy] };
            Ok(())
        });
        match result {
            Err(arboard::Error::Unknown { description }) => {
                assert!(
                    description.contains("unrecognized selector"),
                    "the exception's reason is kept: {description}"
                );
            }
            other => panic!("expected the exception as an error, got {other:?}"),
        }
    }

    #[test]
    fn without_an_exception_the_result_passes_through() {
        assert_eq!(guarded(|| Ok::<_, arboard::Error>(7)).ok(), Some(7));
        assert!(matches!(
            guarded(|| Err::<(), _>(arboard::Error::ContentNotAvailable)),
            Err(arboard::Error::ContentNotAvailable)
        ));
    }

    /// Put `png` on the general pasteboard as `public.png` — what a capture
    /// tool leaves there — so each read has to convert it, the work AppKit was
    /// doing when 0.1.27 crashed. Marked transient and concealed, so clipboard
    /// history apps skip it (nspasteboard.org). Through the lock, like any use.
    fn put_png(png: &[u8]) {
        use objc2::class;
        use objc2::runtime::AnyObject;
        with(|_| {
            objc2::rc::autoreleasepool(|_| unsafe {
                let pb: *mut AnyObject = msg_send![class!(NSPasteboard), generalPasteboard];
                let _: isize = msg_send![pb, clearContents];
                let data: *mut AnyObject = msg_send![
                    class!(NSData),
                    dataWithBytes: png.as_ptr().cast::<std::ffi::c_void>(),
                    length: png.len()
                ];
                let empty: *mut AnyObject = msg_send![class!(NSData), data];
                for (ty, bytes) in [
                    (c"public.png", data),
                    (c"org.nspasteboard.TransientType", empty),
                    (c"org.nspasteboard.ConcealedType", empty),
                ] {
                    let ty: *mut AnyObject =
                        msg_send![class!(NSString), stringWithUTF8String: ty.as_ptr()];
                    let _: bool = msg_send![pb, setData: bytes, forType: ty];
                }
            });
            Ok(())
        })
        .expect("the test image went on the clipboard");
    }

    /// The real clipboard, used the way a beam uses it: several readers at
    /// once on freshly copied image data, then copies landing between reads.
    /// Without the lock this crashed every run; with it, every read must come
    /// back whole and nothing may throw.
    ///
    /// **Overwrites the system clipboard**, so it runs only by hand, before a
    /// release that touches clipboard code:
    /// `cargo test --lib clipboard -- --ignored --nocapture`
    #[test]
    #[ignore = "overwrites the system clipboard; run by hand"]
    fn hammering_the_real_clipboard_never_crashes() {
        use arboard::SetExtApple;
        use std::sync::atomic::{AtomicBool, Ordering::Relaxed};
        use std::sync::{Arc, Barrier};

        const W: u32 = 2000; // a store screenshot's size
        const H: u32 = 1250;
        const READERS: usize = 3; // the beam, the HUD, the popover
        const ROUNDS: usize = 40;

        let png = {
            let img = ::image::RgbaImage::from_fn(W, H, |x, y| {
                ::image::Rgba([(x % 251) as u8, (y % 241) as u8, ((x ^ y) % 256) as u8, 255])
            });
            let mut out = std::io::Cursor::new(Vec::new());
            img.write_to(&mut out, ::image::ImageFormat::Png)
                .expect("the test image encodes");
            out.into_inner()
        };

        // 1. Readers at once, on fresh PNG data every round: the crash itself.
        let start = Arc::new(Barrier::new(READERS + 1));
        let end = Arc::new(Barrier::new(READERS + 1));
        let readers: Vec<_> = (0..READERS)
            .map(|_| {
                let (start, end) = (start.clone(), end.clone());
                std::thread::spawn(move || {
                    let mut reads = Vec::new();
                    for _ in 0..ROUNDS {
                        start.wait();
                        reads.push(with(|c| c.get_image()).map(|i| (i.width, i.height)));
                        end.wait();
                    }
                    reads
                })
            })
            .collect();
        for _ in 0..ROUNDS {
            put_png(&png);
            start.wait();
            end.wait();
        }
        for reader in readers {
            for read in reader.join().expect("a reader thread survived") {
                assert_eq!(
                    read.expect("every read of a fresh image succeeds"),
                    (W as usize, H as usize)
                );
            }
        }

        // 2. Copies landing between reads, as a copy button can mid-beam. A
        // read may find text instead of an image; none may find an exception.
        let stop = Arc::new(AtomicBool::new(false));
        let readers: Vec<_> = (0..2)
            .map(|_| {
                let stop = stop.clone();
                std::thread::spawn(move || {
                    let mut thrown = 0;
                    while !stop.load(Relaxed) {
                        if let Err(arboard::Error::Unknown { .. }) = with(|c| c.get_image()) {
                            thrown += 1;
                        }
                    }
                    thrown
                })
            })
            .collect();
        for i in 0..ROUNDS {
            put_png(&png);
            with(|c| c.set().exclude_from_history().text(format!("copy {i}")))
                .expect("a copy lands");
        }
        stop.store(true, Relaxed);
        let thrown: usize = readers
            .into_iter()
            .map(|r| r.join().expect("a reader thread survived"))
            .sum();
        assert_eq!(thrown, 0, "AppKit threw during mixed reads and copies");

        with(|c| {
            c.set()
                .exclude_from_history()
                .text("Hostbeam clipboard test done")
        })
        .ok();
    }

    /// Put one pasteboard item on the general pasteboard carrying exactly
    /// `data`, type by type — the shape Finder and CleanShot X leave a copy in.
    /// Through the lock, like any use.
    fn put_item(data: &[(&std::ffi::CStr, Vec<u8>)]) {
        use objc2::class;
        use objc2::runtime::AnyObject;
        with(|_| {
            objc2::rc::autoreleasepool(|_| unsafe {
                let pb: *mut AnyObject = msg_send![class!(NSPasteboard), generalPasteboard];
                let _: isize = msg_send![pb, clearContents];
                let item: Retained<AnyObject> = msg_send![class!(NSPasteboardItem), new];
                for (ty, bytes) in data {
                    let ns: *mut AnyObject = msg_send![
                        class!(NSData),
                        dataWithBytes: bytes.as_ptr().cast::<std::ffi::c_void>(),
                        length: bytes.len()
                    ];
                    let ty: *mut AnyObject =
                        msg_send![class!(NSString), stringWithUTF8String: ty.as_ptr()];
                    let _: bool = msg_send![&*item, setData: ns, forType: ty];
                }
                let items: *mut AnyObject = msg_send![class!(NSArray), arrayWithObject: &*item];
                let _: bool = msg_send![pb, writeObjects: items];
            });
            Ok(())
        })
        .expect("the test item went on the clipboard");
    }

    fn file_url(path: &std::path::Path) -> Vec<u8> {
        format!("file://{}", path.display()).into_bytes()
    }

    /// The two copies recorded on 2026-09-26, rebuilt on the real pasteboard:
    /// Finder's (a file link, the name, the icon) must give the file and never
    /// a picture; CleanShot X's (a file link and the real PNG) must give the
    /// picture. Proves what the pure rule assumes — that AppKit offers Finder's
    /// icon as a TIFF, and that an item's own types do not list it.
    ///
    /// **Overwrites the system clipboard**, so it runs only by hand:
    /// `cargo test --lib finder_copy -- --ignored --nocapture`
    #[test]
    #[ignore = "overwrites the system clipboard; run by hand"]
    fn a_finder_copy_on_the_real_clipboard_gives_the_file_not_the_icon() {
        use arboard::SetExtApple;
        let dir = std::env::temp_dir().join(format!("hb-finder-copy-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let pdf = dir.join("report.pdf");
        std::fs::write(&pdf, b"%PDF-1.7").unwrap();
        let png = dir.join("capture.png");
        let png_bytes = {
            let mut out = std::io::Cursor::new(Vec::new());
            ::image::RgbaImage::from_pixel(64, 48, ::image::Rgba([200, 30, 30, 255]))
                .write_to(&mut out, ::image::ImageFormat::Png)
                .unwrap();
            out.into_inner()
        };
        std::fs::write(&png, &png_bytes).unwrap();
        let icns = std::fs::read(
            "/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericDocumentIcon.icns",
        )
        .expect("a system icon to stand in for Finder's");

        // Finder: link, name, icon.
        put_item(&[
            (c"public.file-url", file_url(&pdf)),
            (c"public.utf8-plain-text", b"report.pdf".to_vec()),
            (c"com.apple.icns", icns),
        ]);
        let seen = super::kinds().unwrap();
        assert!(seen.files, "{seen:?}");
        assert!(!seen.picture, "the icon is not a picture: {seen:?}");
        assert!(seen.image, "AppKit offers the icon as a TIFF: {seen:?}");
        assert_eq!(current().unwrap(), Source::Files(vec![pdf.clone()]));
        assert!(
            with(|c| c.get_image()).is_ok(),
            "arboard would read the icon — which is why nothing asks it to"
        );

        // CleanShot X: link and the real PNG.
        put_item(&[
            (c"public.file-url", file_url(&png)),
            (c"public.png", png_bytes),
        ]);
        let seen = super::kinds().unwrap();
        assert!(seen.files && seen.picture, "{seen:?}");
        assert_eq!(current().unwrap(), Source::Image);

        // Leave the clipboard holding something harmless, not a test file.
        with(|c| {
            c.set()
                .exclude_from_history()
                .text("Hostbeam clipboard test done")
        })
        .ok();
        std::fs::remove_dir_all(&dir).unwrap();
    }
}

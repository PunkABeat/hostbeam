//! Host discovery + beaming the clipboard screenshot to a host. This module is
//! the IPC-facing orchestration; the reusable logic lives in services
//! (`services::ssh` for ssh/sftp + validation, `services::image` for PNG work) and
//! SSH-config parsing/classification in `crate::ssh_config`.

use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::clipboard::Source;
use crate::error::{CommandError, Error, Result};
use crate::services::{image, ssh};
use crate::ssh_config::{self, BeamErrorKind};

#[derive(Serialize, Clone)]
pub struct HostDto {
    pub id: String,
    pub name: String,
    pub user: String,
    pub address: String,
    pub online: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BeamResult {
    /// Every remote path this gesture delivered, in the order sent. Usually one
    /// — a clipboard beam — but a drop of several is still a single beam.
    pub paths: Vec<String>,
    pub sentence: String,
    /// One ≤480px preview per path, aligned by index — every file gets its own
    /// Recent thumbnail. A path into the thumbnail cache (`thumbs.rs`), which
    /// the row keeps and the webview renders through the asset protocol.
    /// `None` where the bytes did not decode, which means HEIC, HEIF and AVIF
    /// only: they beam, but no pure-Rust decoder exists for them, so their row
    /// shows the placeholder.
    pub previews: Vec<Option<String>>,
    /// Local paths this gesture did **not** deliver, in order — empty unless the
    /// batch stopped part-way. Non-empty means a partial: `paths` really are on
    /// the host and really are on the clipboard, and these are what a retry
    /// should send. Reported rather than thrown away, because the alternative
    /// was a failure card and files nobody knew were there.
    pub failed: Vec<String>,
    /// Claims the unsent half without spending a second beam. Present only
    /// alongside a non-empty `failed`; see [`PendingRetry`].
    pub retry_token: Option<String>,
    /// The file on this Mac each path was beamed from, aligned with `paths` —
    /// what a Recent row's Show in Finder reveals (`reveal.rs`). `None` for a
    /// clipboard picture, which never was a file.
    pub sources: Vec<Option<String>>,
    /// Set when nothing was sent because a file looks like a secret, and the
    /// user has to say so first. Not a failure — nothing went wrong, and no
    /// beam was spent — so it is a result, not an error code; see
    /// [`looks_secret`].
    pub held: Option<Held>,
    /// This beam carries the reminder to buy a license (ADR 0028): it landed
    /// whole, was counted, and was a reminder beam by
    /// [`crate::licensing::reminder_due`]. Said after the beam, never instead
    /// of it.
    pub remind: bool,
}

/// A beam stopped before anything left the Mac, waiting for the user.
#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Held {
    /// Every local path of the gesture, in order — including files the
    /// clipboard named, which the popover could not otherwise know. "Send
    /// anyway" sends exactly these, so what was confirmed is what goes.
    pub paths: Vec<String>,
    /// The names that looked like secrets, for the card to name.
    pub flagged: Vec<String>,
}

impl BeamResult {
    fn held(held: Held) -> Self {
        BeamResult {
            paths: Vec::new(),
            sentence: String::new(),
            previews: Vec::new(),
            failed: Vec::new(),
            retry_token: None,
            sources: Vec::new(),
            held: Some(held),
            remind: false,
        }
    }
}

#[tauri::command]
pub async fn list_hosts() -> Vec<HostDto> {
    tauri::async_runtime::spawn_blocking(list_hosts_blocking)
        .await
        .unwrap_or_default()
}

pub(crate) fn list_hosts_blocking() -> Vec<HostDto> {
    let fallback_user = std::env::var("USER").unwrap_or_else(|_| "user".into());
    let home = dirs::home_dir();
    let path = match &home {
        Some(h) => h.join(".ssh").join("config"),
        None => return Vec::new(),
    };
    let home_str = home.as_ref().map(|h| h.to_string_lossy().to_string());

    ssh_config::discover_hosts(&path, home_str.as_deref())
        .into_iter()
        .map(|h| HostDto {
            id: h.alias.clone(),
            name: h.alias.clone(),
            user: h.user.clone().unwrap_or_else(|| fallback_user.clone()),
            // The popover composes `user@address`, so address is the bare host.
            address: h.host_name.clone().unwrap_or_else(|| h.alias.clone()),
            online: true,
        })
        .collect()
}

#[tauri::command]
pub async fn beam(
    app: AppHandle,
    alias: String,
    folder: String,
    hud: Option<bool>,
) -> std::result::Result<BeamResult, CommandError> {
    let _transfer = crate::updates::transfer();
    // Silent (shortcut) beam: drive the floating HUD from here, not the popover —
    // the popover webview is suspended while hidden, so its completion callback
    // would arrive only after the user next clicked the app.
    let hud = hud.unwrap_or(false);
    if hud {
        crate::hud::hud_uploading(&app, alias.clone(), None);
    }
    let (app2, alias2) = (app.clone(), alias.clone());
    let result =
        tauri::async_runtime::spawn_blocking(move || beam_blocking(app2, alias2, folder, hud))
            .await
            .map_err(|_| Error::Join)?;
    finish(&app, alias, hud, &result);
    result.map_err(CommandError::from)
}

/// How a beam ends on screen.
///
/// A held beam opens the popover whatever started it, because the question it
/// asks can only be answered there: a silent beam's HUD takes no input, and a
/// popover that was open may have been clicked away while the files were
/// checked. Showing it also wakes its webview, which is suspended while
/// hidden and would otherwise not draw the card until the next click.
/// `hud_open` cancels the HUD's pending hide, dismisses it, and shows the
/// popover — which does nothing if it is already up. Checked before anything
/// else, so a held beam can never read as "Beamed".
fn finish(app: &AppHandle, alias: String, hud: bool, result: &Result<BeamResult>) {
    if matches!(result, Ok(r) if r.held.is_some()) {
        let app = app.clone();
        crate::main_thread::on_main(move || crate::hud::hud_open(app, None));
        return;
    }
    if !hud {
        return;
    }
    match result {
        Ok(r) if r.failed.is_empty() => crate::hud::hud_done(app, alias, r.remind),
        Ok(r) => crate::hud::hud_partial(app, alias, r.paths.len(), r.paths.len() + r.failed.len()),
        Err(e) => crate::hud::hud_failed(app, alias, e.to_code().to_string()),
    }
}

/// `mkdir -p` for the remote folder, then `test -O`: the folder must belong to
/// the account Hostbeam logs in as.
///
/// The quotes are the point. `valid_folder` already refuses whitespace and both
/// kinds of quote, so nothing can escape these — but it permits `;`, `$(…)` and
/// backticks, and these were the only two remote scripts that interpolated the
/// folder bare. Every other one quotes it. Quoted, a folder someone typed into
/// Preferences is a path; unquoted, it was a command on their own host.
///
/// The owner test is for shared hosts. Anyone can write to `/tmp`, so whoever
/// makes `/tmp/hostbeam` first owns it, and `mkdir -p` accepts someone else's
/// folder without a word: beams would land where that user can read, replace or
/// add to them, and the agent tools would read what they left. A folder Hostbeam
/// creates is `700` for the same reason, so nobody else can list it.
fn mkdir_script(folder: &str) -> String {
    format!("mkdir -p -m 700 -- '{folder}' && test -O '{folder}'")
}

/// Whether a remote command failed without a word. `test -O` is the only step
/// in these scripts that fails silently; `mkdir`, `ssh` and the network always
/// say what went wrong, so an empty cause means the ownership test.
pub(crate) fn failed_silently(e: &Error) -> bool {
    matches!(e, Error::Ssh { detail, .. } if detail.is_empty())
}

/// Create the remote folder and confirm this login owns it ([`mkdir_script`]).
fn ensure_folder(alias: &str, folder: &str) -> Result<()> {
    ssh::run(
        "ssh",
        &ssh::ssh_args(&[alias, &mkdir_script(folder)]),
        "mkdir",
    )
    .map_err(|e| {
        if failed_silently(&e) {
            crate::log::error(format!(
                "beam refused: {alias}:{folder} belongs to another user"
            ));
            Error::FolderNotOwned
        } else {
            e
        }
    })
}

/// Every check a beam makes on its target before anything is read or sent.
/// Returns the folder with any trailing slashes removed. Nothing here is about
/// the license: no beam is ever refused for want of one (ADR 0028).
fn gate(alias: &str, folder: &str) -> Result<String> {
    if !ssh::valid_alias(alias) {
        crate::log::error(format!("beam rejected: invalid host alias '{alias}'"));
        return Err(Error::InvalidAlias);
    }
    let folder = folder.trim_end_matches('/').to_string();
    if !ssh::valid_folder(&folder) {
        crate::log::error(format!("beam rejected: invalid remote folder '{folder}'"));
        return Err(Error::InvalidFolder);
    }
    Ok(folder)
}

/// Everything a beam does once there are local files to send: create the remote
/// folder, copy them over, count *one* beam, and leave the pasteable sentence on
/// the clipboard. Both entry points — the clipboard screenshot and dropped
/// files — finish here, so they cannot drift apart.
///
/// One gesture is one beam, however many files it carries. The word is the
/// product's own (`01_product_and_voice.md`: "the noun for a past upload is a
/// beam"), and a beam is what the reminder counts (ADR 0028) — so it is counted
/// once here, after all of it. See `docs/process/next.md` § 6.
fn send(
    app: &AppHandle,
    alias: &str,
    folder: &str,
    files: &[(PathBuf, String)],
    // Called once the upload is over, so previews still being made are waited
    // for then, not before the first byte is sent (`previews_in_background`).
    previews: impl FnOnce() -> Vec<Option<String>>,
    count: bool,
) -> Result<BeamResult> {
    let t_ssh = Instant::now();
    // Create the remote folder over the (fast, reused) control connection, then
    // send the files over a *direct* connection: SSH connection multiplexing
    // (ControlMaster, which many configs — e.g. OrbStack — enable) is dramatically
    // slower for bulk data than a fresh connection, so `-o ControlPath=none`
    // makes the upload bypass any master. That was measured (5395fa1) on a
    // *bandwidth-starved* link, ~13KB/s; on a high-latency but fat pipe the
    // handshake dominates instead and the master wins. Do not change this
    // without re-testing BOTH regimes — see docs/research/questions.md.
    //
    // One mkdir for the gesture, one animation for the gesture, one sftp
    // session for all its files (`ssh::upload`: each under a hidden temporary
    // name, renamed into place when whole; until 2026-09-25 it was one scp per
    // file, straight to the final name). A failure part-way leaves the earlier
    // files on the host and reports the partial.
    // The legs are timed apart because the total alone could not answer where a
    // beam's time goes: a shell running the same two commands against the same
    // host measured ~300ms less than this function logged, and inference from
    // outside never settled why. `overhead` is whatever the total has that the
    // two legs do not — animation wind-down, process spawn, anything else on
    // this path — so the next person gets a number instead of a candidate list.
    let (paths, failed, mkdir_for, upload_for) = crate::tray::animate_during(
        app,
        || -> Result<(Vec<String>, Vec<String>, Duration, Duration)> {
            let t_mkdir = Instant::now();
            ensure_folder(alias, folder)?;
            let mkdir_for = t_mkdir.elapsed();
            let t_upload = Instant::now();
            let uploaded = ssh::upload(alias, folder, files, |landed| {
                crate::hud::beam_progress(app, alias, landed, files.len());
            });
            let sent: Vec<String> = files[..uploaded.landed]
                .iter()
                .map(|(_, remote_name)| format!("{folder}/{remote_name}"))
                .collect();
            if let Some(e) = uploaded.error {
                crate::log::error(format!(
                    "beam stopped after {} of {} file(s) → {alias}:{folder}: {e}",
                    sent.len(),
                    files.len(),
                ));
                // Nothing landed: an ordinary failure, and the taxonomy the UI
                // already has says exactly what went wrong. Only once something
                // is on the host does this become a *partial*, which is a
                // different kind of thing — the paths are real, the files are
                // there, and a failure card would hide both.
                if sent.is_empty() {
                    return Err(e);
                }
                // The session stopped at the first failure rather than trying
                // the rest. What stops a transfer mid-batch is almost always the
                // host or the link, not this one file. Retrying the rest is a
                // button in the popover, not a loop in here.
            }
            let failed = files[sent.len()..]
                .iter()
                .map(|(local, _)| local.to_string_lossy().into_owned())
                .collect();
            Ok((sent, failed, mkdir_for, t_upload.elapsed()))
        },
    )?;

    // Sizes of what actually went, not of what was asked for.
    let kb: u64 = files[..paths.len()]
        .iter()
        .map(|(l, _)| std::fs::metadata(l).map(|m| m.len()).unwrap_or(0) / 1024)
        .sum();
    let total_for = t_ssh.elapsed();
    crate::log::info(format!(
        "beam {verdict} → {alias}:{folder} ({n} of {total} file(s), {kb}KB) \
         transfer {total_for:?} (mkdir {mkdir_for:?}, upload {upload_for:?}, overhead {overhead:?})",
        verdict = if failed.is_empty() { "ok" } else { "partial" },
        n = paths.len(),
        total = files.len(),
        // Saturating: the legs are measured inside the span the total measures,
        // so this cannot go negative — but a clock that stepped would make it
        // look like it had, and a panic here would cost a beam that succeeded.
        overhead = total_for.saturating_sub(mkdir_for + upload_for),
    ));

    // Once per gesture, not once per file — and a partial spends it just as a
    // whole one does: files are on the host and their paths are on the
    // clipboard. The *retry* of that partial is the same gesture continuing, so
    // it arrives with `count == false` and is not counted again. The reminder
    // rides only on a beam that landed whole: a partial has its own news.
    let remind = count && crate::licensing::record_beam(app) && failed.is_empty();

    // Whatever is still unsent can be claimed once, without counting again —
    // and a retry that itself stops part-way issues a fresh token for its own
    // remainder, so a flaky link cannot count as more than the one beam.
    let retry_token = (!failed.is_empty()).then(|| app.state::<Retries>().issue(&failed));

    // Previews were built for every file; only the ones that landed have a row.
    let mut previews = previews();
    previews.resize(files.len(), None);
    previews.truncate(paths.len());

    let settings = crate::config::read(app).settings;
    let sentence = render_sentence(&settings.sentence, settings.copy_sentence, &paths);
    crate::clipboard::with(|c| c.set_text(sentence.clone()))?;

    // Where each landed file came from. A clipboard picture's is a temporary
    // PNG nobody would want revealed; `beam_blocking` clears those.
    let sources = files[..paths.len()]
        .iter()
        .map(|(local, _)| Some(local.to_string_lossy().into_owned()))
        .collect();

    Ok(BeamResult {
        paths,
        sentence,
        previews,
        failed,
        retry_token,
        sources,
        held: None,
        remind,
    })
}

/// The unfinished half of a partial beam, claimable exactly once.
///
/// One gesture is one beam, and a batch that stopped part-way was already
/// counted, so sending the rest must not count again — a link that blipped
/// would otherwise count one drop twice. Its files also passed
/// [`looks_secret`], or were confirmed past it, the first time.
///
/// The token is what makes skipping those safe to allow at all. It is issued
/// only by a partial, it names the exact files that did not go, it is good
/// once, and it does not outlive the process. A bare boolean would be a request
/// to skip the secret check, which is a different thing entirely.
struct PendingRetry {
    token: String,
    /// The local paths the partial left behind.
    paths: HashSet<String>,
    issued: Instant,
}

/// How long an unclaimed retry holds off relaunching into an update. It dies
/// with the process, so a relaunch would turn a retry into a fresh gesture;
/// but a partial nobody has come back to in an hour is not worth pinning an old
/// version for.
const RETRY_HOLDS_RELAUNCH: std::time::Duration = std::time::Duration::from_secs(60 * 60);

/// The one outstanding retry, and the sequence that makes its tokens unique.
/// Managed by Tauri.
#[derive(Default)]
pub struct Retries {
    slot: Mutex<Option<PendingRetry>>,
    seq: AtomicU64,
}

impl Retries {
    /// Record what a partial left behind and hand back the token that claims it.
    fn issue(&self, failed: &[String]) -> String {
        let token = format!("{}-{}", stamp(), self.seq.fetch_add(1, Ordering::Relaxed));
        if let Ok(mut slot) = self.slot.lock() {
            *slot = Some(PendingRetry {
                token: token.clone(),
                paths: failed.iter().cloned().collect(),
                issued: Instant::now(),
            });
        }
        token
    }

    /// Takes the outstanding retry when `token` is it and `paths` are all files
    /// it left behind — this gesture is then the continuation of one already
    /// counted. Anything else returns None and falls through to a normal,
    /// counted beam.
    ///
    /// Taken rather than merely checked, so it cannot be claimed twice; a beam
    /// that then delivers nothing puts it back with [`Retries::restore`],
    /// because the token should be spent by a transfer that happened, not by
    /// one that was attempted.
    fn claim(&self, token: Option<&str>, paths: &[String]) -> Option<PendingRetry> {
        let token = token?;
        let mut slot = self.slot.lock().ok()?;
        let matches = slot.as_ref().is_some_and(|p| {
            p.token == token && !paths.is_empty() && paths.iter().all(|path| p.paths.contains(path))
        });
        matches.then(|| slot.take()).flatten()
    }

    /// Put back a claim whose beam delivered nothing, keeping the same token so
    /// the popover's copy of it still matches and pressing again is still free.
    fn restore(&self, pending: PendingRetry) {
        if let Ok(mut slot) = self.slot.lock() {
            // Only if nothing newer has taken its place: a later partial's
            // token is the live one, and this claim is now history.
            if slot.is_none() {
                *slot = Some(pending);
            }
        }
    }

    /// Whether a partial beam's free retry is recent enough that relaunching
    /// into an update should wait for it (see [`RETRY_HOLDS_RELAUNCH`]).
    fn outstanding(&self) -> bool {
        self.slot.lock().is_ok_and(|slot| {
            slot.as_ref()
                .is_some_and(|p| p.issued.elapsed() < RETRY_HOLDS_RELAUNCH)
        })
    }
}

/// Whether a partial beam's free retry is recent enough that relaunching into an
/// update should wait for it.
pub(crate) fn retry_outstanding(app: &AppHandle) -> bool {
    app.state::<Retries>().outstanding()
}

/// Milliseconds since the epoch — the unique part of every remote filename.
fn stamp() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

/// Claim user-initiated priority for the thread a beam runs on.
///
/// A beam arrives on `tauri::async_runtime::spawn_blocking`, whose pool threads
/// do not inherit the priority of the gesture that started them — they land at
/// background QoS, and macOS throttles a background thread's *child processes*
/// too. That is not a small effect on the one child that matters: the same
/// `scp`, to the same host, measured ~120ms from a shell or a plain Rust binary
/// and ~300ms under `taskpolicy -b`, while the shipping app logged 341-379ms.
/// Hardened runtime was ruled out (an ad-hoc signed `-o runtime` binary stayed
/// at ~115ms) and so was `Command` itself.
///
/// This would be right even if none of that were true: somebody pressed a key
/// and is watching the menu bar, so the work is user-initiated by definition.
/// The pool reuses threads, so a raised thread stays raised — harmless, since
/// every user of this pool is servicing a gesture.
#[cfg(target_os = "macos")]
fn claim_user_initiated() {
    // `qos_class_self` lives in pthread/qos.h but the libc crate does not
    // re-export it, so declare it rather than give up the before/after evidence
    // that makes this change checkable from a log.
    extern "C" {
        fn qos_class_self() -> libc::qos_class_t;
    }
    // SAFETY: both are thread-local calls on the current pthread with no
    // preconditions and no shared state; they report failure by return value.
    let before = unsafe { qos_class_self() };
    // `qos_class_t` is a plain C enum with no PartialEq, so compare the values.
    if before as u32 == libc::qos_class_t::QOS_CLASS_USER_INITIATED as u32 {
        return;
    }
    let rc = unsafe {
        libc::pthread_set_qos_class_self_np(libc::qos_class_t::QOS_CLASS_USER_INITIATED, 0)
    };
    crate::log::info(format!(
        "beam thread qos {:#x} → user-initiated (rc {rc})",
        before as u32
    ));
}

#[cfg(not(target_os = "macos"))]
fn claim_user_initiated() {}

fn beam_blocking(app: AppHandle, alias: String, folder: String, hud: bool) -> Result<BeamResult> {
    claim_user_initiated();
    crate::log::info(format!("beam requested → {alias} folder={folder}"));
    let folder = gate(&alias, &folder)?;

    // What the clipboard holds decides what goes, before a single pixel is
    // read: a copy in Finder names files and carries only their icon, and the
    // icon must never be what is beamed (`clipboard::source`). A read that
    // fails aborts rather than falling back to the image — that fallback is
    // exactly the icon.
    let source = crate::clipboard::current().map_err(|e| {
        crate::log::error(format!("beam aborted: reading the clipboard failed: {e}"));
        Error::from(e)
    })?;
    match source {
        Source::Files(paths) => {
            crate::log::info(format!(
                "clipboard names {} file(s) → file beam",
                paths.len()
            ));
            let paths: Vec<String> = paths
                .iter()
                .map(|p| p.to_string_lossy().into_owned())
                .collect();
            // A copied file is a gesture like a dropped one: the same checks,
            // the same names, and — being the same gesture — one beam.
            return send_files(&app, &alias, &folder, &paths, Checks::gesture(), hud);
        }
        Source::Nothing => {
            crate::log::warn("beam aborted: no image or file on the clipboard");
            return Err(Error::ClipboardEmpty);
        }
        Source::Image => {}
    }

    // Read the clipboard screenshot and write it to a temporary PNG. Capture a
    // small preview from the same pixels for the Recent list (forward-only).
    let t_clip = Instant::now();
    let clip_img = crate::clipboard::with(|c| c.get_image()).map_err(|e| match e {
        arboard::Error::ContentNotAvailable | arboard::Error::ConversionFailure => {
            crate::log::warn("beam aborted: no image on the clipboard");
            Error::ClipboardEmpty
        }
        e => {
            crate::log::error(format!("beam aborted: reading the clipboard failed: {e}"));
            Error::from(e)
        }
    })?;
    let (w, h) = (clip_img.width as u32, clip_img.height as u32);
    let rgba = clip_img.bytes.into_owned();
    // One stamp names the upload and its preview alike.
    let millis = stamp();
    // Capture the small preview before the buffer is consumed by the encoder.
    let preview = stored_preview(&app, &format!("hostbeam-{millis}"), |dir, stem| {
        image::preview_file(dir, stem, w, h, &rgba, REC_PREVIEW_MAX)
    });
    let clip_ms = t_clip.elapsed();

    // Scale the capture down before it is encoded, if it is bigger than the user
    // wants to send. A 5K screenshot is megapixels the receiving model never
    // sees — it downsamples on arrival — so they only cost upload time, disk on
    // the host, and tokens. `imageMaxEdge: 0` turns this off entirely, and an
    // image already inside the cap is not touched.
    let cap = crate::config::read(&app).settings.image_max_edge;
    let t_scale = Instant::now();
    let (src_w, src_h) = (w, h);
    let (w, h, rgba) = image::cap_rgba(w, h, rgba, cap);
    let scaled = (w, h) != (src_w, src_h);

    let tmp = std::env::temp_dir().join(format!("hostbeam-{millis}.png"));
    let t_enc = Instant::now();
    image::encode_png_file(&tmp, w, h, rgba)?;
    crate::log::info(format!(
        "clipboard image {src_w}x{src_h}{resized} — read {clip_ms:?}, encode {enc_ms:?}",
        resized = if scaled {
            format!(
                " → {w}x{h} (cap {cap}, {scale_ms:?})",
                scale_ms = t_scale.elapsed()
            )
        } else {
            String::new()
        },
        enc_ms = t_enc.elapsed(),
    ));

    send(
        &app,
        &alias,
        &folder,
        &[(tmp, format!("hostbeam-{millis}.png"))],
        move || vec![preview],
        true,
    )
    .map(|mut result| {
        // A clipboard picture was never a file: the PNG above is a temporary
        // copy, so there is nothing to show in Finder.
        result.sources = vec![None; result.paths.len()];
        result
    })
}

/// Extensions that are pictures. Until 2026-09-26 this was the gate — anything
/// else was refused — and now it only decides the work that makes sense for a
/// picture: a Recent thumbnail, the HUD's preview, the pasted sentence's
/// "screenshot". Any file the user hands over is sent (ADR 0006's 2026-09-26
/// amendment); what keeps that from turning into a file manager is the
/// gesture, not the type. Mirrored in `src/lib/format.ts`.
const IMAGE_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "webp", "heic", "heif", "avif", "tif", "tiff", "bmp",
];

/// Whether `path` names a picture, by its extension, whatever its case.
pub(crate) fn is_image_path(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| IMAGE_EXTENSIONS.contains(&e.to_ascii_lowercase().as_str()))
}

/// Refused above this, per file, rather than tying the app up on a copy with no
/// cancel and no byte count. 100 MB since any file became beamable (owner's
/// call, 2026-09-26): PDFs, logs, archives and a short screen recording fit; at
/// 10 Mbit/s the worst case is about a minute and a half.
const FILE_MAX_BYTES: u64 = 100 * 1024 * 1024;

/// Most files one gesture will carry. Nobody drops twenty-six screenshots on
/// purpose; that is a mis-dragged folder, and a few hundred scps with no way to
/// cancel is a worse answer than saying no. The whole batch is refused rather
/// than trimmed to fit — quietly beaming the first twenty-five would be the
/// same silent loss this replaced.
const MAX_BATCH: usize = 25;

/// Longest extension carried as one. Past this it is more likely a name with a
/// dot in it than a type, and it rides in the slug instead.
const EXT_MAX: usize = 16;

/// The extension a remote name ends in, lowercased — Finder is full of `.PNG`
/// and `.JPG` — or None when the file has none worth carrying.
///
/// This used to come from a fixed list, so it could not carry anything odd.
/// Now it comes from someone's disk and lands in a shell command on their host
/// just as the slug does, so it gets a stricter rule than the slug: ASCII
/// letters and digits only, at most [`EXT_MAX`]. One that fails is not dropped
/// but folded into the slug ([`name_parts`]), where the slug's own rule makes
/// it safe.
fn remote_extension(path: &Path) -> Option<String> {
    let ext = path.extension()?.to_str()?;
    let ok =
        !ext.is_empty() && ext.len() <= EXT_MAX && ext.chars().all(|c| c.is_ascii_alphanumeric());
    ok.then(|| ext.to_ascii_lowercase())
}

/// The slug and the extension a local file contributes to its remote name.
/// With a usable extension the slug is the stem, as it always was; without one
/// it is the whole file name — `.env` gives `env`, `Makefile` gives `Makefile`,
/// and an extension too odd to carry is kept, sanitised, in the slug.
fn name_parts(path: &Path) -> (Option<String>, Option<String>) {
    match remote_extension(path) {
        Some(ext) => (slug(path), Some(ext)),
        None => (
            path.file_name().and_then(|n| n.to_str()).and_then(slug_str),
            None,
        ),
    }
}

/// Longest slice of an original file name carried into a remote name. Long
/// enough to recognise a screenshot by, short enough that `ls` on the host
/// stays readable and the whole name is nowhere near a 255-byte component
/// limit even with a stamp and a suffix on it.
const SLUG_MAX: usize = 48;

/// The recognisable part of a dropped file's name, safe to put in a remote path.
///
/// Everything outside `[A-Za-z0-9._-]` becomes `-`, and that is what makes this
/// safe rather than merely tidy: the name reaches the host inside a shell
/// command, so a separator would name a different directory and a quote would
/// end the argument. Runs collapse, and the edges are trimmed so nothing
/// composes a doubled dash or a leading dot.
///
/// `None` when nothing usable survives — a name that is all emoji, or no name
/// at all. The caller falls back to the plain timestamped name rather than
/// inventing one, because a wrong name is worse than no name.
fn slug(path: &Path) -> Option<String> {
    slug_str(path.file_stem()?.to_str()?)
}

/// [`slug`]'s rule, for any string.
fn slug_str(stem: &str) -> Option<String> {
    let mut out = String::with_capacity(stem.len().min(SLUG_MAX));
    for ch in stem.chars() {
        // `-` goes through the separator branch rather than being kept, so a
        // dash the name already had collapses with the ones this makes:
        // "rm -rf" is `rm-rf`, not `rm--rf`.
        if ch.is_ascii_alphanumeric() || ch == '.' || ch == '_' {
            out.push(ch);
        } else if !out.ends_with('-') {
            out.push('-');
        }
        // Every pushed char is ASCII, so length is char count.
        if out.len() >= SLUG_MAX {
            break;
        }
    }
    let trimmed = out.trim_matches(|c| c == '-' || c == '.');
    (!trimmed.is_empty()).then(|| trimmed.to_string())
}

/// The remote name for one file of a gesture.
///
/// The stamp stays in front — it is what sorts, and what keeps one gesture's
/// files together — and the original name rides behind it, so what landed can
/// be told apart from what else landed: in Recent, in the pasted line, and in
/// `ls` on the host. A clipboard beam has no original name and keeps the plain
/// timestamped form.
///
/// `taken` is the names already chosen for this batch. Two dropped files can be
/// called the same thing, and without a name they all compose the same one, so
/// uniqueness is checked rather than assumed — a batch must never overwrite
/// itself, which is the same rule the remote side has always had.
///
/// A file with no extension gets none (`hostbeam-{stamp}-Makefile`): inventing
/// one would tell the agent it is something it is not. Either way the stamp
/// follows the prefix directly, which is what Clean up matches on
/// ([`artifact_match`]).
fn remote_name(stamp: u128, slug: Option<&str>, ext: Option<&str>, taken: &[&str]) -> String {
    let dot_ext = ext.map(|e| format!(".{e}")).unwrap_or_default();
    let compose = |n: usize| match (slug, n) {
        (Some(s), 1) => format!("hostbeam-{stamp}-{s}{dot_ext}"),
        (Some(s), n) => format!("hostbeam-{stamp}-{s}-{n}{dot_ext}"),
        (None, 1) => format!("hostbeam-{stamp}{dot_ext}"),
        (None, n) => format!("hostbeam-{stamp}-{n}{dot_ext}"),
    };
    (1..)
        .map(compose)
        .find(|name| !taken.contains(&name.as_str()))
        .unwrap_or_else(|| compose(1))
}

/// Beam files already on disk — a drop onto the popover or the menu-bar icon, a
/// file opened from the Dock or Finder, and "Send anyway". Any regular file
/// (ADR 0006's 2026-09-26 amendment); it is sent as it is — no decode, no
/// re-encode, so a JPEG stays a JPEG and a PDF a PDF.
#[tauri::command]
pub async fn beam_files(
    app: AppHandle,
    alias: String,
    folder: String,
    paths: Vec<String>,
    hud: Option<bool>,
    // `retryToken` from a previous partial: claims its unsent half without
    // spending a second beam. Anything else is an ordinary beam.
    retry_token: Option<String>,
    // `allowSecrets`: the user saw these files named on the held card and said
    // send them anyway. Skips only [`looks_secret`] — never the type or size
    // checks.
    allow_secrets: Option<bool>,
) -> std::result::Result<BeamResult, CommandError> {
    let _transfer = crate::updates::transfer();
    // Same contract as `beam`: with `hud` the Rust core drives the floating
    // overlay, because the popover's webview is suspended while it is hidden —
    // which is exactly the case for a file opened from the Dock or Finder.
    let hud = hud.unwrap_or(false);
    if hud {
        crate::hud::hud_uploading(&app, alias.clone(), single_name(&paths));
    }
    // Claimed here, at the one place every failure path comes back through, so a
    // beam that delivers nothing can hand the claim back intact. Claiming before
    // the work is what stops a second press counting twice; restoring after a
    // total failure is what stops a flaky link counting a beam that never
    // happened. `send` replaces the claim itself when it does land something.
    let claimed = app.state::<Retries>().claim(retry_token.as_deref(), &paths);
    let count = claimed.is_none();
    if !count {
        crate::log::info(format!(
            "file beam is a claimed retry of {} file(s) — not counted",
            paths.len()
        ));
    }
    let checks = Checks {
        count,
        allow_secrets: allow_secrets.unwrap_or(false),
    };
    let (app2, alias2) = (app.clone(), alias.clone());
    let result = tauri::async_runtime::spawn_blocking(move || {
        beam_files_blocking(app2, alias2, folder, paths, checks, hud)
    })
    .await
    .map_err(|_| Error::Join)?;
    // A held beam delivered nothing either, so it gives the claim back too.
    let delivered_nothing = match &result {
        Ok(r) => r.held.is_some(),
        Err(_) => true,
    };
    if delivered_nothing {
        if let Some(c) = claimed {
            app.state::<Retries>().restore(c);
        }
    }
    finish(&app, alias, hud, &result);
    result.map_err(CommandError::from)
}

/// The name the HUD shows for a single file, or None for a batch, where the
/// count is the useful line.
fn single_name(paths: &[String]) -> Option<String> {
    match paths {
        [one] => Path::new(one)
            .file_name()
            .map(|n| n.to_string_lossy().into_owned()),
        _ => None,
    }
}

/// What a file beam may skip.
#[derive(Clone, Copy, Debug)]
struct Checks {
    /// False only for a claimed retry — see [`PendingRetry`]. A retry's files
    /// are the unsent half of a gesture that already passed [`looks_secret`]
    /// or was confirmed past it, so it is not asked again either.
    count: bool,
    /// The user confirmed the held card.
    allow_secrets: bool,
}

impl Checks {
    /// A fresh gesture: counted, and checked for secrets.
    fn gesture() -> Self {
        Checks {
            count: true,
            allow_secrets: false,
        }
    }

    fn secrets(self) -> bool {
        self.count && !self.allow_secrets
    }
}

fn beam_files_blocking(
    app: AppHandle,
    alias: String,
    folder: String,
    paths: Vec<String>,
    checks: Checks,
    hud: bool,
) -> Result<BeamResult> {
    claim_user_initiated();
    crate::log::info(format!(
        "file beam requested → {alias} folder={folder} ({} file(s))",
        paths.len()
    ));
    // One gesture is one beam however many files it carries — and a claimed
    // retry is the second half of a gesture already counted, so it is not
    // counted again (`send`).
    let folder = gate(&alias, &folder)?;
    send_files(&app, &alias, &folder, &paths, checks, hud)
}

/// Everything a file beam does after the gate, shared by files handed over
/// directly and files a copy in Finder left on the clipboard.
fn send_files(
    app: &AppHandle,
    alias: &str,
    folder: &str,
    paths: &[String],
    checks: Checks,
    hud: bool,
) -> Result<BeamResult> {
    // One stamp for the whole gesture: the files belong together, so they should
    // sort together, and the suffix is only meaningful against a shared one.
    let files = match prepare_files(paths, stamp(), checks.secrets())? {
        Prepared::Ready(files) => files,
        Prepared::Held(held) => return Ok(BeamResult::held(held)),
    };
    // The clipboard path learns the file's name only now; the HUD shows it
    // rather than a picture the clipboard does not really hold.
    if hud {
        crate::hud::hud_uploading(app, alias.to_string(), single_name(paths));
    }
    // One preview per picture, so every Recent row shows what it actually is —
    // made while the files upload, not before, and only once the files are
    // cleared to go, so a held beam leaves nothing in the thumbnail cache.
    let previews = previews_in_background(app, &files);
    send(
        app,
        alias,
        folder,
        &files,
        // A preview thread that panicked costs the thumbnails, not the beam.
        move || previews.join().unwrap_or_default(),
        checks.count,
    )
}

/// What [`prepare_files`] decided.
#[derive(Debug)]
enum Prepared {
    /// Every file checked and named: `(local path, remote name)`.
    Ready(Vec<(PathBuf, String)>),
    /// Stopped for the user: something looks like a secret.
    Held(Held),
}

/// Check every file of a gesture and give each its remote name, before any is
/// sent. A batch that is going to be refused should be refused before it has
/// half-landed on the host, and one that needs a yes should ask before anything
/// has left the Mac.
fn prepare_files(paths: &[String], stamp: u128, check_secrets: bool) -> Result<Prepared> {
    if paths.is_empty() {
        return Err(Error::UnsupportedFile);
    }
    if paths.len() > MAX_BATCH {
        crate::log::warn(format!("file beam rejected: {} files at once", paths.len()));
        return Err(Error::TooManyFiles);
    }
    let mut files: Vec<(PathBuf, String)> = Vec::with_capacity(paths.len());
    let mut flagged = Vec::new();
    for path in paths {
        let local = PathBuf::from(path);
        let head = inspect(&local)?;
        if check_secrets && looks_secret(&names_of(&local), &head) {
            flagged.push(
                local
                    .file_name()
                    .map_or_else(|| path.clone(), |n| n.to_string_lossy().into_owned()),
            );
        }
        let name = {
            let (slug, ext) = name_parts(&local);
            let taken: Vec<&str> = files.iter().map(|(_, n)| n.as_str()).collect();
            remote_name(stamp, slug.as_deref(), ext.as_deref(), &taken)
        };
        files.push((local, name));
    }
    if !flagged.is_empty() {
        // Names only in the log — a secret's *name* is not the secret.
        crate::log::warn(format!(
            "file beam held: {} of {} file(s) look like a secret ({})",
            flagged.len(),
            paths.len(),
            flagged.join(", ")
        ));
        return Ok(Prepared::Held(Held {
            paths: paths.to_vec(),
            flagged,
        }));
    }
    Ok(Prepared::Ready(files))
}

/// How much of a file's start [`looks_secret`] reads. A PEM or OpenSSH key
/// announces itself on its first line.
const HEAD_BYTES: usize = 4096;

/// Refuse what cannot be sent, and read the first [`HEAD_BYTES`] of what can.
///
/// Reading is also the honest readability test. `metadata` succeeds for a file
/// macOS will not let the app open — Desktop, Documents and Downloads are
/// protected, and a file named on the clipboard carries no consent the way a
/// drag does — and without this such a file would fail inside sftp, where the
/// error reads like the host's fault.
fn inspect(path: &Path) -> Result<Vec<u8>> {
    use std::io::Read;
    let meta = std::fs::metadata(path).map_err(|e| {
        crate::log::warn(format!("file beam rejected: unreadable ({e})"));
        Error::UnsupportedFile
    })?;
    if !meta.is_file() {
        // A folder, most likely. Folders are not beamed (ADR 0006).
        crate::log::warn("file beam rejected: not a regular file");
        return Err(Error::UnsupportedFile);
    }
    if meta.len() > FILE_MAX_BYTES {
        crate::log::warn(format!("file beam rejected: {} bytes", meta.len()));
        return Err(Error::FileTooLarge);
    }
    let mut head = Vec::with_capacity(HEAD_BYTES);
    std::fs::File::open(path)
        .and_then(|f| f.take(HEAD_BYTES as u64).read_to_end(&mut head))
        .map_err(|e| {
            crate::log::warn(format!("file beam rejected: cannot be read ({e})"));
            Error::UnsupportedFile
        })?;
    Ok(head)
}

/// The names a file answers to: its own, and — when it is a symlink — its
/// target's. What is sent is the target (`ssh::Stage` links to it), so a link
/// called `notes.txt` pointing at `~/.aws/credentials` must be judged as what
/// it points at.
fn names_of(path: &Path) -> Vec<String> {
    let mut names = Vec::new();
    for p in [Some(path.to_path_buf()), std::fs::canonicalize(path).ok()]
        .into_iter()
        .flatten()
    {
        if let Some(n) = p.file_name() {
            let n = n.to_string_lossy().into_owned();
            if !names.contains(&n) {
                names.push(n);
            }
        }
    }
    names
}

/// Whether a file looks like something that must not land in a folder on a
/// shared server: `/tmp/hostbeam` is readable by whoever can list it the moment
/// a folder is misconfigured, and an agent reads everything in it. A warning,
/// not a rule — the user can still send it — so it errs towards asking.
///
/// By name ([`secret_name`]), plus one look at the contents: a private key in
/// PEM, OpenSSH or PGP armour says so on its first line, whatever the file is
/// called — `server.txt` included. `.key` is judged by content too, because
/// every Keynote deck is a `.key`: a zip (`PK\x03\x04`) is not a key.
fn looks_secret(names: &[String], head: &[u8]) -> bool {
    let keynote = head.starts_with(b"PK\x03\x04");
    names.iter().any(|name| {
        let name = name.to_ascii_lowercase();
        secret_name(&name) || (name.ends_with(".key") && !keynote)
    }) || private_key_in(head)
}

/// Names that are secrets by convention. `name` is lowercased.
fn secret_name(name: &str) -> bool {
    const NAMES: &[&str] = &[
        ".env",
        "credentials",
        ".netrc",
        "_netrc",
        ".git-credentials",
        ".npmrc",
        ".pypirc",
        ".pgpass",
        "id_rsa",
        "id_dsa",
        "id_ecdsa",
        "id_ed25519",
        "id_ecdsa_sk",
        "id_ed25519_sk",
    ];
    // Templates for a `.env`, checked in to be copied: they hold placeholders.
    const ENV_TEMPLATES: &[&str] = &["example", "sample", "template", "dist"];
    const EXTENSIONS: &[&str] = &["pem", "p12", "pfx", "jks", "keystore", "ppk", "kdbx", "env"];

    if NAMES.contains(&name) {
        return true;
    }
    if let Some(rest) = name.strip_prefix(".env.") {
        return !ENV_TEMPLATES.contains(&rest);
    }
    if name.starts_with("credentials.") {
        return true;
    }
    name.rsplit_once('.')
        .is_some_and(|(_, ext)| EXTENSIONS.contains(&ext))
}

/// Whether `head` holds the armour line of a private key: `-----BEGIN ` and,
/// before that line's closing dashes, `PRIVATE KEY` — which covers RSA, EC,
/// OpenSSH, PKCS#8 (encrypted or not) and `PGP PRIVATE KEY BLOCK`, and not a
/// certificate or a public key.
fn private_key_in(head: &[u8]) -> bool {
    const BEGIN: &[u8] = b"-----BEGIN ";
    const LABEL: &[u8] = b"PRIVATE KEY";
    head.windows(BEGIN.len())
        .enumerate()
        .filter(|(_, w)| *w == BEGIN)
        .any(|(i, _)| {
            let rest = &head[i + BEGIN.len()..];
            let line = &rest[..rest.len().min(64)];
            let end = line
                .windows(5)
                .position(|w| w == b"-----")
                .unwrap_or(line.len());
            line[..end].windows(LABEL.len()).any(|w| w == LABEL)
        })
}

/// How many images are decoded for previews at once. Each decode holds a
/// whole image in memory — 36 MB for a 3024-pixel square — so this is kept
/// small rather than one per core.
const PREVIEW_WORKERS: usize = 4;

/// The Recent-row previews for a file beam, started now and finished while
/// the files upload. Made first, one after another, they held the beam at
/// "0 of 4" before anything was sent: about a second for four large
/// screenshots in a release build, eleven in a debug one (2026-09-25).
fn previews_in_background(
    app: &AppHandle,
    files: &[(PathBuf, String)],
) -> std::thread::JoinHandle<Vec<Option<String>>> {
    let dir = crate::thumbs::dir(app);
    let files = files.to_vec();
    std::thread::spawn(move || match dir {
        Some(dir) => previews_in(&dir, &files),
        // No cache dir on this platform: no thumbnails, never a failed beam.
        None => vec![None; files.len()],
    })
}

/// One preview per file, written to `dir` and named after its remote file so
/// one drop's previews sit together; returned in `files`' order whichever
/// finishes first. Decoded on up to [`PREVIEW_WORKERS`] threads.
fn previews_in(dir: &Path, files: &[(PathBuf, String)]) -> Vec<Option<String>> {
    let workers = std::thread::available_parallelism()
        .map_or(1, |n| n.get())
        .clamp(1, PREVIEW_WORKERS)
        .min(files.len().max(1));
    let next = AtomicUsize::new(0);
    let out = Mutex::new(vec![None; files.len()]);
    std::thread::scope(|scope| {
        for _ in 0..workers {
            scope.spawn(|| {
                // The user is waiting on this beam, as on the beam thread.
                claim_user_initiated();
                loop {
                    let i = next.fetch_add(1, Ordering::Relaxed);
                    let Some((local, name)) = files.get(i) else {
                        break;
                    };
                    // Only a picture has a preview; opening a 100 MB zip to
                    // find that out would cost the upload its disk.
                    let preview = is_image_path(local)
                        .then(|| {
                            let stem = name.rsplit_once('.').map_or(name.as_str(), |(s, _)| s);
                            image::preview_file_from(local, dir, stem, REC_PREVIEW_MAX)
                        })
                        .flatten()
                        .map(|p| p.to_string_lossy().into_owned());
                    out.lock().unwrap_or_else(|p| p.into_inner())[i] = preview;
                }
            });
        }
    });
    out.into_inner().unwrap_or_else(|p| p.into_inner())
}

/// A Recent row's preview, written to the thumbnail cache and returned as the
/// path the row keeps. `None` — no thumbnail, never a failed beam — when the
/// platform has no cache dir or the pixels will not encode. A preview for a
/// beam that then fails is pruned on the next config write (`thumbs.rs`).
fn stored_preview(
    app: &AppHandle,
    stem: &str,
    write: impl FnOnce(&Path, &str) -> Option<PathBuf>,
) -> Option<String> {
    let dir = crate::thumbs::dir(app)?;
    write(&dir, stem).map(|p| p.to_string_lossy().into_owned())
}

/// The clipboard text for a finished beam. Mirrored by `clipboardText` in
/// `src/lib/sentence.ts`, which the popover's and Preferences' Recent copies
/// use, so a copy gives back what the beam gave.
///
/// **Just the paths** (the default, and whenever the template has no `{path}`
/// token), on one line a space apart. A lone path is the one form every agent
/// tested attaches as the picture itself, and Claude Code and Gemini CLI do the
/// same for several a space apart — they split a paste at spaces, not line
/// breaks (next.md § 10a). Remote names are slugged, so only a beam folder with
/// a space in it could break a path in two.
///
/// **A sentence** ("Add a sentence around the path"): the template once per path,
/// one line each, rather than a plural form. It needs no new setting, it keeps
/// working with whatever template the user wrote, and an agent reading three
/// identical lines with three paths cannot misread which path is which. A file
/// that is not a picture gets [`FILE_SENTENCE`] in place of the untouched
/// default ([`template_for`]), so a mixed batch says what each line is.
fn render_sentence(template: &str, copy_sentence: bool, remote_paths: &[String]) -> String {
    if !(copy_sentence && template.contains("{path}")) {
        return remote_paths.join(" ");
    }
    remote_paths
        .iter()
        .map(|p| template_for(template, p).replace("{path}", p))
        .collect::<Vec<_>>()
        .join("\n")
}

/// What the default sentence says for a file that is not a picture. "Use this
/// screenshot" in front of a PDF would be the one wrong word in the line.
const FILE_SENTENCE: &str = "Use this file: {path}";

/// The template for one remote path: [`FILE_SENTENCE`] for a non-picture while
/// the template is still the default, and the template otherwise. A template
/// someone wrote is theirs and is never rewritten (owner's call, 2026-09-26).
fn template_for<'a>(template: &'a str, remote_path: &str) -> &'a str {
    if template == crate::config::DEFAULT_SENTENCE && !is_image_path(Path::new(remote_path)) {
        FILE_SENTENCE
    } else {
        template
    }
}

#[derive(Serialize, Clone, Default)]
pub struct ClipboardImage {
    pub present: bool,
    pub width: u32,
    pub height: u32,
    /// A small PNG preview as a `data:` URL (≤ ~160px long side), or null.
    pub thumb: Option<String>,
    /// The files a copy in Finder named, in order — what a beam sends instead
    /// of any picture. Empty otherwise, and `present` is then false: the
    /// picture beside them is Finder's icon, which is never shown or sent.
    /// Regular files only, so a clipboard of nothing but folders reads as
    /// empty and the shortcut opens the popover rather than failing.
    pub files: Vec<ClipFile>,
}

/// One file named on the clipboard.
#[derive(Serialize, Clone, Debug)]
pub struct ClipFile {
    pub path: String,
    pub name: String,
    pub bytes: u64,
}

fn clip_files(paths: &[PathBuf]) -> Vec<ClipFile> {
    paths
        .iter()
        .filter_map(|p| {
            let meta = std::fs::metadata(p)
                .ok()
                .filter(std::fs::Metadata::is_file)?;
            Some(ClipFile {
                path: p.to_string_lossy().into_owned(),
                name: p.file_name()?.to_string_lossy().into_owned(),
                bytes: meta.len(),
            })
        })
        .collect()
}

/// Longest side of the card thumbnail (logical px × ~2 for retina).
const THUMB_MAX: u32 = 160;
/// Longest side of the larger "tap to enlarge" preview.
const PREVIEW_MAX: u32 = 640;
/// Longest side of the preview persisted per Recent beam (row + enlarge).
const REC_PREVIEW_MAX: u32 = 480;

/// Inspect the clipboard so the popover can show the *real* state — a picture's
/// presence, dimensions and a small inline preview, or the files a copy in
/// Finder named. Decided by the same rule a beam uses (`clipboard::source`),
/// so the card never shows one thing while the shortcut would send another.
#[tauri::command]
pub async fn clipboard_image() -> ClipboardImage {
    tauri::async_runtime::spawn_blocking(|| match crate::clipboard::current() {
        Ok(Source::Files(paths)) => ClipboardImage {
            files: clip_files(&paths),
            ..ClipboardImage::default()
        },
        Ok(Source::Image) => {
            let Ok(img) = crate::clipboard::with(|c| c.get_image()) else {
                return ClipboardImage::default();
            };
            let (w, h) = (img.width as u32, img.height as u32);
            ClipboardImage {
                present: true,
                width: w,
                height: h,
                thumb: image::scaled_png_data_url(w, h, &img.bytes, THUMB_MAX),
                files: Vec::new(),
            }
        }
        Ok(Source::Nothing) | Err(_) => ClipboardImage::default(),
    })
    .await
    .unwrap_or_default()
}

/// A larger preview of the current clipboard image, fetched on demand (the popover
/// lightbox, the HUD) so the on-open probe stays light. Null when there is no
/// picture — including when the clipboard names files, whose only picture is
/// Finder's icon — and on failure.
#[tauri::command]
pub async fn clipboard_preview() -> Option<String> {
    tauri::async_runtime::spawn_blocking(|| {
        if !matches!(crate::clipboard::current(), Ok(Source::Image)) {
            return None;
        }
        let img = crate::clipboard::with(|c| c.get_image()).ok()?;
        image::scaled_png_data_url(img.width as u32, img.height as u32, &img.bytes, PREVIEW_MAX)
    })
    .await
    .ok()
    .flatten()
}

#[derive(Serialize, Clone)]
pub struct DiagRow {
    pub label: String,
    pub status: String, // ok | fail | warn | skip
    pub detail: String,
}

fn row(label: &str, status: &str, detail: impl Into<String>) -> DiagRow {
    DiagRow {
        label: label.into(),
        status: status.into(),
        detail: detail.into(),
    }
}

fn skip(loc: &str, key: &'static str) -> DiagRow {
    row(
        crate::i18n::t(loc, key),
        "skip",
        crate::i18n::t(loc, "diag.skipped"),
    )
}

/// Real connection diagnostics for a host: reachability + auth, remote folder
/// writability, and round-trip latency. Returns rows shaped like the popover's
/// mock `runDiagnostics` ({label, status, detail}).
#[tauri::command]
pub async fn diagnose(app: AppHandle, alias: String, folder: String) -> Vec<DiagRow> {
    let loc = crate::i18n::locale(&app);
    tauri::async_runtime::spawn_blocking(move || diagnose_blocking(loc, alias, folder))
        .await
        .unwrap_or_default()
}

/// `pub` for `tests/fake_ssh.rs`, which runs it against a stub `ssh`.
pub fn diagnose_blocking(loc: &'static str, alias: String, folder: String) -> Vec<DiagRow> {
    let tr = |k: &'static str| crate::i18n::t(loc, k);
    crate::log::info(format!("diagnostics → {alias} folder={folder}"));
    if !ssh::valid_alias(&alias) {
        return vec![row(
            tr("diag.sshReachable"),
            "fail",
            tr("diag.unsupportedAlias"),
        )];
    }
    let folder = folder.trim_end_matches('/').to_string();

    let start = Instant::now();
    let probe = Command::new("ssh")
        .args(ssh::ssh_args(&[&alias, "true"]))
        .output();

    match probe {
        Ok(out) if out.status.success() => {
            let ms = start.elapsed().as_millis();
            // One remote command string, as the beam sends it. This used to pass
            // `sh`, `-c` and the script as separate words; ssh joins words with
            // spaces, so the host ran `sh -c mkdir` with the rest as positional
            // parameters — `mkdir` with no operand — and the row said "not
            // writable" for every folder on every host.
            let writable = ssh::valid_folder(&folder)
                && Command::new("ssh")
                    .args(ssh::ssh_args(&[
                        &alias,
                        &format!("{} && test -w '{folder}'", mkdir_script(&folder)),
                    ]))
                    .output()
                    .map(|o| o.status.success())
                    .unwrap_or(false);
            vec![
                row(tr("diag.sshReachable"), "ok", alias),
                row(tr("diag.auth"), "ok", tr("diag.keyAccepted")),
                row(
                    tr("diag.folderWritable"),
                    if writable { "ok" } else { "fail" },
                    folder,
                ),
                row(
                    tr("diag.latency"),
                    if ms > 150 { "warn" } else { "ok" },
                    format!("{ms} ms"),
                ),
            ]
        }
        Ok(out) => {
            let err = String::from_utf8_lossy(&out.stderr)
                .lines()
                .next()
                .unwrap_or(tr("diag.connectionFailed"))
                .trim()
                .to_string();
            match ssh_config::classify_beam_error(&err) {
                BeamErrorKind::Auth => vec![
                    row(tr("diag.sshReachable"), "ok", &alias),
                    row(tr("diag.auth"), "fail", err),
                    skip(loc, "diag.folderWritable"),
                    skip(loc, "diag.latency"),
                ],
                _ => vec![
                    row(tr("diag.sshReachable"), "fail", err),
                    skip(loc, "diag.auth"),
                    skip(loc, "diag.folderWritable"),
                    skip(loc, "diag.latency"),
                ],
            }
        }
        Err(e) => vec![
            row(tr("diag.sshReachable"), "fail", format!("ssh: {e}")),
            skip(loc, "diag.auth"),
            skip(loc, "diag.folderWritable"),
            skip(loc, "diag.latency"),
        ],
    }
}

/// Append the iPhone's public key to the host's `authorized_keys` over the
/// user's existing SSH access — the PairSheet's "authorize" leg. Idempotent
/// (exact-line grep before append). Both inputs are validated before anything
/// runs, and the key rides inside single quotes `valid_pubkey` guarantees it
/// cannot escape.
#[tauri::command]
pub async fn install_pubkey(target: String, key: String) -> std::result::Result<(), CommandError> {
    let result =
        tauri::async_runtime::spawn_blocking(move || install_pubkey_blocking(&target, &key))
            .await
            .map_err(|_| Error::Join)?;
    result.map_err(CommandError::from)
}

/// `pub` for `tests/fake_ssh.rs`.
pub fn install_pubkey_blocking(target: &str, key: &str) -> Result<()> {
    if !ssh::valid_alias(target) {
        return Err(Error::InvalidAlias);
    }
    let key = key.trim();
    if !ssh::valid_pubkey(key) {
        return Err(Error::InvalidPubkey);
    }
    let script = format!(
        "k='{key}'; mkdir -p ~/.ssh && chmod 700 ~/.ssh && \
         touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && \
         (grep -qxF \"$k\" ~/.ssh/authorized_keys || printf '%s\\n' \"$k\" >> ~/.ssh/authorized_keys)"
    );
    ssh::run("ssh", &ssh::ssh_args(&[target, &script]), "install_pubkey")
}

/// Effective SSH ports, keyed by target — for the QR pairing payload (ADR 0017
/// §2) and the Hosts pane readout. Takes the same target shape as
/// [`install_pubkey`]: a config host passes its ssh alias, a manual host
/// `user@address`.
///
/// Batched because the Hosts pane needs every host it lists, and one IPC hop
/// beats one per host. Resolution is serial inside the blocking task: each
/// `ssh -G` is ~10ms of pure config parsing with no network I/O, so even a
/// large host list stays well under a frame budget it never blocks anyway.
/// Never fails — an unresolvable target yields the port `ssh` itself defaults to.
#[tauri::command]
pub async fn resolve_ports(targets: Vec<String>) -> std::collections::HashMap<String, u16> {
    tauri::async_runtime::spawn_blocking(move || {
        targets
            .into_iter()
            .map(|target| {
                let port = ssh::resolve_port(&target);
                (target, port)
            })
            .collect()
    })
    .await
    .unwrap_or_default()
}

#[derive(Serialize, Clone)]
pub struct StorageInfo {
    pub count: u64,
    pub kb: u64,
}

/// Digits in a beam's stamp: epoch milliseconds, 13 of them from 2001 until the
/// year 2286. [`artifact_match`] matches exactly this many, and a test pins
/// [`stamp`] to it.
const STAMP_DIGITS: usize = 13;

/// The `find` expression matching exactly what Hostbeam delivers: its prefix
/// *followed directly by its millisecond stamp*, then the end of the name, a
/// `.` or a `-` — the only shapes [`remote_name`] composes. Plus the hidden
/// `.hostbeam-*.part` an interrupted upload can leave.
///
/// **This feeds a `-delete` on someone's host, so what it matches is the whole
/// safety story.** Both remote scripts are built from it so they can never
/// describe different sets — the storage readout exists to say what cleanup
/// would remove, and a readout that counted a file the deletion missed would
/// be worse than none.
///
/// It used to be the prefix plus an image extension. Once any file could be
/// beamed that stopped being a boundary — the extension says nothing about who
/// made the file — and the prefix alone would match a `hostbeam-notes.txt`
/// somebody left in the folder. So the stamp is what makes a name Hostbeam's
/// own now, for every type, images included. That also stopped it deleting a
/// `hostbeam-diagram.png` somebody else made, which it would have before
/// (owner's call, 2026-09-26). The cost: the iPhone's names from before
/// 2026-09-13 (`hostbeam-2026-08-28-153012.png`) are no longer counted or
/// removed from the Mac.
///
/// Thirteen `[0-9]` classes rather than a regex: `-name` globbing is the same in
/// GNU, BSD and BusyBox `find`, and `-regex` is not. Never derived from a list
/// of types, so widening what can be beamed can never widen what is deleted.
///
/// `.hostbeam-*.part` is the name every upload is written under before it is
/// renamed into place (`ssh::upload`, and the iPhone's), so a dropped
/// connection can leave one behind and nothing else would ever remove it. Its
/// suffix is fixed and it is hidden; `hostbeam-*` on its own never matches.
fn artifact_match() -> String {
    let stamped = format!("hostbeam-{}", "[0-9]".repeat(STAMP_DIGITS));
    let names = [
        stamped.clone(),
        format!("{stamped}.*"),
        format!("{stamped}-*"),
        ".hostbeam-*.part".to_string(),
    ]
    .iter()
    .map(|n| format!("-name '{n}'"))
    .collect::<Vec<_>>()
    .join(" -o ");
    format!("\\( {names} \\)")
}

/// Remote script for the storage readout. Counts and sizes ONLY Hostbeam's own
/// artifacts (see [`artifact_match`]), top level, regular files — so the numbers
/// describe exactly what `cleanup_script` would remove.
fn storage_script(folder: &str) -> String {
    let match_ = artifact_match();
    format!(
        "find '{folder}' -maxdepth 1 -type f {match_} -exec du -k {{}} + 2>/dev/null \
         | awk '{{n+=1; s+=$1}} END {{print n+0, s+0}}'"
    )
}

/// Remote cleanup script. The safety properties live in the find flags:
/// `-maxdepth 1` (never recursive), `-type f` (never directories), the fixed
/// [`artifact_match`] pattern (never anything the app didn't create), and no
/// `rm` of the folder itself. Prints one line per deleted file for the count.
fn cleanup_script(folder: &str) -> String {
    let match_ = artifact_match();
    format!("find '{folder}' -maxdepth 1 -type f {match_} -print -delete | wc -l")
}

/// First line "N KB" → StorageInfo; anything else → None.
fn parse_storage(out: &str) -> Option<StorageInfo> {
    let mut it = out.split_whitespace();
    let count = it.next()?.parse().ok()?;
    let kb = it.next()?.parse().ok()?;
    Some(StorageInfo { count, kb })
}

/// Run a remote script and return trimmed stdout (unlike `ssh::run`, the
/// output is the result here). Shared with `pull.rs`, which runs its listing
/// the same way.
pub(crate) fn ssh_capture(target: &str, script: &str, label: &str) -> Result<String> {
    let out = Command::new("ssh")
        .args(ssh::ssh_args(&[target, script]))
        .output()
        .map_err(|e| ssh::ssh_error(&format!("ssh: {e}")))?;
    if !out.status.success() {
        let stderr = String::from_utf8_lossy(&out.stderr);
        crate::log::error(format!("{label} failed: {}", stderr.trim()));
        return Err(ssh::ssh_error(&stderr));
    }
    Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

/// Size + count of what Hostbeam beamed into the host's folder ([`artifact_match`]).
#[tauri::command]
pub async fn host_storage(
    target: String,
    folder: String,
) -> std::result::Result<StorageInfo, CommandError> {
    let result = tauri::async_runtime::spawn_blocking(move || -> Result<StorageInfo> {
        if !ssh::valid_alias(&target) {
            return Err(Error::InvalidAlias);
        }
        let folder = folder.trim_end_matches('/').to_string();
        if !ssh::valid_folder(&folder) {
            return Err(Error::InvalidFolder);
        }
        let out = ssh_capture(&target, &storage_script(&folder), "host_storage")?;
        parse_storage(&out).ok_or_else(|| ssh::ssh_error(&out))
    })
    .await
    .map_err(|_| Error::Join)?;
    result.map_err(CommandError::from)
}

/// Delete what Hostbeam beamed (and only that — [`artifact_match`]) from the beam folder.
/// Returns how many were removed. The UI confirms with the count first.
#[tauri::command]
pub async fn host_cleanup(
    target: String,
    folder: String,
) -> std::result::Result<u64, CommandError> {
    let result = tauri::async_runtime::spawn_blocking(move || -> Result<u64> {
        if !ssh::valid_alias(&target) {
            return Err(Error::InvalidAlias);
        }
        let folder = folder.trim_end_matches('/').to_string();
        if !ssh::valid_folder(&folder) {
            return Err(Error::InvalidFolder);
        }
        let out = ssh_capture(&target, &cleanup_script(&folder), "host_cleanup")?;
        crate::log::info(format!("cleanup {target}:{folder} removed {out}"));
        out.parse().map_err(|_| ssh::ssh_error(&out))
    })
    .await
    .map_err(|_| Error::Join)?;
    result.map_err(CommandError::from)
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TestResult {
    pub ok: bool,
    pub detail: String,
    /// Indices into the `keys` the caller asked about that are present in the
    /// host's `authorized_keys`. Empty when none were asked for, and empty on
    /// any failure — a host we could not reach tells us nothing about what it
    /// would accept.
    pub keys_present: Vec<usize>,
}

/// The remote command the probe runs. With nothing to ask it is `true`, exactly
/// as before: a bare "did the connection and auth succeed".
///
/// With keys it also reports which of them `authorized_keys` already holds,
/// which costs nothing — the connection is being made either way, and this is
/// the same file, matched the same way (`grep -qxF`), that `install_pubkey`
/// appends to. That symmetry is the point: it answers "is what we installed
/// still there", rather than a flag we wrote down once and hoped stayed true.
///
/// The trailing `exit 0` is load-bearing. Without it the script's status is the
/// last `grep`'s, so a perfectly reachable host that simply has none of the
/// keys would report as UNREACHABLE — the probe's own answer corrupted by the
/// question we added to it.
fn probe_script(keys: &[String]) -> String {
    let mut lines = String::new();
    for (i, key) in keys.iter().enumerate() {
        let key = key.trim();
        // Same gate as install_pubkey: no quotes, newlines or backslashes get
        // past it, so single-quoting here cannot be escaped. An invalid key is
        // skipped rather than rejected — it is simply not present.
        if !ssh::valid_pubkey(key) {
            continue;
        }
        // The caller's index, not the loop's, so skipping a key cannot silently
        // shift every answer after it onto the wrong device.
        lines.push_str(&format!(
            "grep -qxF '{key}' \"$f\" 2>/dev/null && echo {i}\n"
        ));
    }
    if lines.is_empty() {
        return "true".into();
    }
    format!("f=\"$HOME/.ssh/authorized_keys\"\n{lines}exit 0\n")
}

/// Line-per-index stdout → the indices. Anything unparseable is ignored: a
/// login banner or a shell notice on stdout must not become a device.
fn keys_found(stdout: &[u8]) -> Vec<usize> {
    String::from_utf8_lossy(stdout)
        .lines()
        .filter_map(|line| line.trim().parse().ok())
        .collect()
}

/// Quick reachability test for one host. `target` is an SSH config alias or a
/// `user@address`. Used by onboarding / manual-add to confirm a host before the
/// status dot turns green, and by the Hosts pane, which also passes the paired
/// devices (ADR 0018) so one connection answers both questions.
#[tauri::command]
pub async fn test_host(target: String, keys: Vec<String>) -> TestResult {
    tauri::async_runtime::spawn_blocking(move || test_host_blocking(target, &keys))
        .await
        .unwrap_or_else(|_| TestResult {
            ok: false,
            detail: "internal error".into(),
            keys_present: Vec::new(),
        })
}

/// `pub` for `tests/fake_ssh.rs`.
pub fn test_host_blocking(target: String, keys: &[String]) -> TestResult {
    if !ssh::valid_alias(&target) {
        return TestResult {
            ok: false,
            detail: "Unsupported host".into(),
            keys_present: Vec::new(),
        };
    }
    let t = Instant::now();
    let script = probe_script(keys);
    let probe = Command::new("ssh")
        .args(ssh::ssh_args(&[&target, &script]))
        .output();
    let result = match probe {
        Ok(out) if out.status.success() => TestResult {
            ok: true,
            detail: "Reachable".into(),
            keys_present: keys_found(&out.stdout),
        },
        Ok(out) => TestResult {
            ok: false,
            detail: String::from_utf8_lossy(&out.stderr)
                .lines()
                .next()
                .unwrap_or("Connection failed")
                .trim()
                .to_string(),
            keys_present: Vec::new(),
        },
        Err(e) => TestResult {
            ok: false,
            detail: format!("ssh: {e}"),
            keys_present: Vec::new(),
        },
    };
    crate::log::info(format!(
        "probe {target} → {} in {:?} ({})",
        if result.ok {
            "reachable"
        } else {
            "unreachable"
        },
        t.elapsed(),
        result.detail
    ));
    result
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    /// A fresh, empty directory for one test's files, removed and made again so
    /// a failed earlier run cannot leave anything behind in it.
    fn scratch(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("hb-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    /// Write `files` into `dir` and return their paths as a beam receives them.
    fn write(dir: &Path, files: &[(&str, &[u8])]) -> Vec<String> {
        files
            .iter()
            .map(|(name, bytes)| {
                let p = dir.join(name);
                std::fs::write(&p, bytes).unwrap();
                p.to_string_lossy().into_owned()
            })
            .collect()
    }

    fn ready(p: super::Result<super::Prepared>) -> Vec<(std::path::PathBuf, String)> {
        match p {
            Ok(super::Prepared::Ready(files)) => files,
            Ok(super::Prepared::Held(h)) => panic!("held: {h:?}"),
            Err(e) => panic!("refused: {e}"),
        }
    }

    // What a beam will carry. Since 2026-09-26 that is any regular file the
    // user hands over (ADR 0006's amendment): getting this wrong either refuses
    // a PDF someone meant to send, or sends something that is not a file.
    #[test]
    fn any_regular_file_is_accepted_whatever_its_type() {
        let dir = scratch("any-file");
        let paths = write(
            &dir,
            &[
                ("report.pdf", b"%PDF-1.7"),
                ("notes.txt", b"hello"),
                ("Makefile", b"all:"),
                ("archive.tar.gz", b"\x1f\x8b"),
                ("Shot.PNG", b"png"),
                ("run.sh", b"#!/bin/sh"),
            ],
        );
        let names: Vec<String> = ready(super::prepare_files(&paths, 1788875278869, true))
            .into_iter()
            .map(|(_, n)| n)
            .collect();
        assert_eq!(
            names,
            [
                "hostbeam-1788875278869-report.pdf",
                "hostbeam-1788875278869-notes.txt",
                "hostbeam-1788875278869-Makefile",
                "hostbeam-1788875278869-archive.tar.gz",
                "hostbeam-1788875278869-Shot.png",
                "hostbeam-1788875278869-run.sh",
            ]
        );
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn a_folder_is_refused_and_so_is_a_batch_holding_one() {
        // Folders stay out (ADR 0006): one in a batch refuses the batch, before
        // anything is sent, rather than quietly sending the rest.
        let dir = scratch("folder");
        let mut paths = write(&dir, &[("a.pdf", b"x")]);
        let sub = dir.join("sub");
        std::fs::create_dir(&sub).unwrap();
        paths.push(sub.to_string_lossy().into_owned());
        assert!(matches!(
            super::prepare_files(&paths[1..], 1, true),
            Err(super::Error::UnsupportedFile)
        ));
        assert!(matches!(
            super::prepare_files(&paths, 1, true),
            Err(super::Error::UnsupportedFile)
        ));
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn the_size_cap_is_100_mb_a_file() {
        // Sparse, so the test writes nothing: `set_len` is all `metadata` sees.
        let dir = scratch("size");
        let at = dir.join("at-cap.bin");
        let over = dir.join("over-cap.bin");
        for (p, len) in [
            (&at, super::FILE_MAX_BYTES),
            (&over, super::FILE_MAX_BYTES + 1),
        ] {
            std::fs::File::create(p).unwrap().set_len(len).unwrap();
        }
        assert_eq!(super::FILE_MAX_BYTES, 100 * 1024 * 1024);
        let one = |p: &std::path::PathBuf| vec![p.to_string_lossy().into_owned()];
        assert!(super::prepare_files(&one(&at), 1, true).is_ok());
        assert!(matches!(
            super::prepare_files(&one(&over), 1, true),
            Err(super::Error::FileTooLarge)
        ));
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn a_file_that_cannot_be_read_is_refused_before_anything_is_sent() {
        // What macOS's folder protection looks like from here: `metadata`
        // succeeds, opening fails. Refused now, it is a clear "can't send
        // that"; left to sftp, it read as the host's fault.
        use std::os::unix::fs::PermissionsExt;
        let dir = scratch("unreadable");
        let paths = write(&dir, &[("locked.pdf", b"x")]);
        std::fs::set_permissions(&paths[0], std::fs::Permissions::from_mode(0o000)).unwrap();
        let result = super::prepare_files(&paths, 1, true);
        std::fs::set_permissions(&paths[0], std::fs::Permissions::from_mode(0o600)).unwrap();
        assert!(matches!(result, Err(super::Error::UnsupportedFile)));
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn a_batch_over_the_cap_is_refused_whole() {
        let paths = vec!["/nonexistent".to_string(); super::MAX_BATCH + 1];
        assert!(matches!(
            super::prepare_files(&paths, 1, true),
            Err(super::Error::TooManyFiles)
        ));
        assert!(matches!(
            super::prepare_files(&[], 1, true),
            Err(super::Error::UnsupportedFile)
        ));
    }

    #[test]
    fn pictures_are_told_by_extension_whatever_its_case() {
        for name in [
            "shot.png",
            "shot.PNG",
            "photo.JPEG",
            "a.jpg",
            "b.heic",
            "c.webp",
        ] {
            assert!(super::is_image_path(Path::new(name)), "{name}");
        }
        for name in ["report.pdf", "Makefile", "a.png.gz", ".png", "notes.txt"] {
            assert!(!super::is_image_path(Path::new(name)), "{name}");
        }
    }

    // The extension now comes from someone's disk, not a fixed list, and lands
    // in the same shell command the slug does.
    #[test]
    fn only_a_plain_extension_is_carried_as_one() {
        for (input, want) in [
            ("/tmp/a.PDF", Some("pdf")),
            ("/tmp/archive.tar.gz", Some("gz")),
            ("/tmp/Shot.PNG", Some("png")),
            ("/tmp/Makefile", None),
            ("/tmp/.env", None),
            ("/tmp/a.$(whoami)", None),
            ("/tmp/a.b c", None),
            ("/tmp/a.x'y", None),
            ("/tmp/a.ñ", None),
            ("/tmp/a.abcdefghijklmnopq", None), // 17
        ] {
            assert_eq!(
                super::remote_extension(Path::new(input)).as_deref(),
                want,
                "{input}"
            );
        }
        assert_eq!(
            super::remote_extension(Path::new("/tmp/a.abcdefghijklmnop")).as_deref(),
            Some("abcdefghijklmnop"),
            "sixteen is still an extension"
        );
    }

    #[test]
    fn a_name_without_a_usable_extension_keeps_its_whole_name_safely() {
        for (input, slug) in [
            ("/tmp/.env", Some("env")),
            ("/tmp/Makefile", Some("Makefile")),
            ("/tmp/report.pdf", Some("report")),
        ] {
            assert_eq!(
                super::name_parts(Path::new(input)).0.as_deref(),
                slug,
                "{input}"
            );
        }
        // An extension too odd to carry is not dropped — it rides in the slug,
        // which cannot carry anything a shell would act on.
        let (slug, ext) = super::name_parts(Path::new("/tmp/odd.$(rm -rf ~)"));
        assert_eq!(ext, None);
        let slug = slug.unwrap();
        assert!(slug.starts_with("odd."), "{slug}");
        for bad in ['/', '\'', '"', ';', '$', '(', ')', ' ', '~'] {
            assert!(!slug.contains(bad), "{slug} still contains {bad:?}");
        }
    }

    // A warning before something that looks like a secret lands in a folder on
    // a shared server (ADR 0006's amendment). It errs towards asking — a false
    // alarm costs one click — but a card on every PDF would be ignored.
    #[test]
    fn secrets_are_known_by_their_names() {
        let secret = |name: &str| super::looks_secret(&[name.to_string()], b"");
        for name in [
            ".env",
            ".env.production",
            ".ENV.local",
            "prod.env",
            "id_rsa",
            "id_ed25519",
            "ID_ECDSA",
            "id_ed25519_sk",
            "credentials",
            "credentials.json",
            "Credentials.csv",
            ".netrc",
            ".git-credentials",
            ".npmrc",
            ".pypirc",
            ".pgpass",
            "server.pem",
            "SERVER.PEM",
            "cert.p12",
            "store.pfx",
            "release.jks",
            "debug.keystore",
            "putty.ppk",
            "vault.kdbx",
            "tls.key",
        ] {
            assert!(secret(name), "{name} should be held");
        }
        for name in [
            "id_rsa.pub",
            "id_ed25519.pub",
            ".env.example",
            ".env.sample",
            ".env.template",
            ".env.dist",
            "report.pdf",
            "notes.pem.md",
            "environment.txt",
            "credentials-guide",
            "screenshot.png",
            "Makefile",
        ] {
            assert!(!secret(name), "{name} should not be held");
        }
    }

    #[test]
    fn a_private_key_is_known_by_its_first_line_whatever_it_is_called() {
        let called = |head: &[u8]| super::looks_secret(&["server.txt".to_string()], head);
        for head in [
            &b"-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXk"[..],
            b"-----BEGIN RSA PRIVATE KEY-----\nMIIE",
            b"-----BEGIN EC PRIVATE KEY-----\n",
            b"-----BEGIN PRIVATE KEY-----\n",
            b"-----BEGIN ENCRYPTED PRIVATE KEY-----\n",
            b"-----BEGIN PGP PRIVATE KEY BLOCK-----\n",
            b"# deploy key\n\n-----BEGIN OPENSSH PRIVATE KEY-----\n",
        ] {
            assert!(called(head), "{}", String::from_utf8_lossy(head));
        }
        for head in [
            &b"-----BEGIN CERTIFICATE-----\nMIID"[..],
            b"-----BEGIN PUBLIC KEY-----\n",
            b"ssh-ed25519 AAAAC3Nza user@host",
            b"a private key is -----BEGIN something----- else PRIVATE KEY later",
            b"",
        ] {
            assert!(!called(head), "{}", String::from_utf8_lossy(head));
        }
    }

    #[test]
    fn a_keynote_deck_is_not_a_key() {
        // Every Keynote deck is a `.key`, and every one is a zip.
        assert!(!super::looks_secret(
            &["Q3 review.key".to_string()],
            b"PK\x03\x04\x14\x00"
        ));
        assert!(super::looks_secret(
            &["tls.key".to_string()],
            b"MIIEvQIBADAN"
        ));
    }

    #[test]
    fn a_symlink_is_judged_by_what_it_points_at() {
        // What is sent is the target, so a link called `notes.txt` pointing at
        // a credentials file must be held, and one called `id_rsa` pointing at
        // a harmless file is still held — either name is reason to ask.
        let dir = scratch("symlink");
        write(&dir, &[("credentials", b"[default]"), ("plain.txt", b"x")]);
        let link = dir.join("notes.txt");
        std::os::unix::fs::symlink(dir.join("credentials"), &link).unwrap();
        let names = super::names_of(&link);
        assert!(names.contains(&"notes.txt".to_string()), "{names:?}");
        assert!(names.contains(&"credentials".to_string()), "{names:?}");
        assert!(super::looks_secret(&names, b"[default]"));
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn a_secret_holds_the_whole_gesture_and_sends_nothing() {
        let dir = scratch("held");
        let paths = write(
            &dir,
            &[
                ("report.pdf", b"%PDF"),
                (".env", b"TOKEN=x"),
                ("id_ed25519", b"-----BEGIN OPENSSH PRIVATE KEY-----\n"),
            ],
        );
        match super::prepare_files(&paths, 1, true) {
            Ok(super::Prepared::Held(held)) => {
                assert_eq!(held.paths, paths, "Send anyway sends the whole gesture");
                assert_eq!(held.flagged, [".env", "id_ed25519"]);
            }
            other => panic!("expected held, got {other:?}"),
        }
        // Confirmed (or a claimed retry): the same files go, named as usual.
        let names: Vec<String> = ready(super::prepare_files(&paths, 1, false))
            .into_iter()
            .map(|(_, n)| n)
            .collect();
        assert_eq!(
            names,
            [
                "hostbeam-1-report.pdf",
                "hostbeam-1-env",
                "hostbeam-1-id_ed25519"
            ]
        );
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn confirming_a_secret_skips_nothing_else() {
        // `allowSecrets` answers one question. A folder, an oversized file or
        // too many files are refused exactly as before.
        let dir = scratch("allow");
        let big = dir.join("big.pem");
        std::fs::File::create(&big)
            .unwrap()
            .set_len(super::FILE_MAX_BYTES + 1)
            .unwrap();
        assert!(matches!(
            super::prepare_files(&[big.to_string_lossy().into_owned()], 1, false),
            Err(super::Error::FileTooLarge)
        ));
        assert!(matches!(
            super::prepare_files(&[dir.to_string_lossy().into_owned()], 1, false),
            Err(super::Error::UnsupportedFile)
        ));
        let checks = super::Checks {
            count: true,
            allow_secrets: true,
        };
        assert!(!checks.secrets());
        let retry = super::Checks {
            count: false,
            allow_secrets: false,
        };
        assert!(
            !retry.secrets(),
            "a claimed retry was checked the first time"
        );
        assert!(super::Checks::gesture().secrets());
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn only_pictures_get_a_preview() {
        // A PDF that happens to hold PNG bytes is still not previewed: the
        // extension decides, so a 100 MB zip is never opened to find out.
        let dir = scratch("preview-kind");
        let png = dir.join("real.png");
        ::image::RgbaImage::from_pixel(40, 30, ::image::Rgba([9, 9, 9, 255]))
            .save(&png)
            .unwrap();
        let fake = dir.join("fake.pdf");
        std::fs::copy(&png, &fake).unwrap();
        let out = super::previews_in(
            &dir,
            &[
                (png, "hostbeam-7-real.png".into()),
                (fake, "hostbeam-7-fake.pdf".into()),
            ],
        );
        assert!(out[0].is_some());
        assert!(out[1].is_none());
        std::fs::remove_dir_all(&dir).unwrap();
    }

    // The original name is carried into the remote one, which means an arbitrary
    // string from someone's disk ends up inside a shell command on their host.
    // These tests are mostly about what it refuses to carry.
    #[test]
    fn slug_keeps_a_name_you_would_recognise() {
        for (input, want) in [
            ("/tmp/shot-2.png", "shot-2"),
            (
                "/tmp/Screenshot 2026-09-09 at 11.04.21.png",
                "Screenshot-2026-09-09-at-11.04.21",
            ),
            ("/tmp/my_design_v2.PNG", "my_design_v2"),
        ] {
            assert_eq!(
                super::slug(Path::new(input)).as_deref(),
                Some(want),
                "{input}"
            );
        }
    }

    #[test]
    fn slug_cannot_carry_anything_that_would_leave_the_folder() {
        // A separator would name a different directory; a quote would end the
        // argument and start something else. Neither can survive.
        for input in [
            "/tmp/a b/../../etc/passwd.png",
            "/tmp/shot; rm -rf ~.png",
            "/tmp/sh'ot\"x.png",
            "/tmp/$(whoami).png",
            "/tmp/back\\slash.png",
        ] {
            let got = super::slug(Path::new(input)).unwrap_or_default();
            for bad in ['/', '\\', '\'', '"', ';', '$', '(', ')', ' ', '~'] {
                assert!(!got.contains(bad), "{input} → {got} still contains {bad:?}");
            }
        }
    }

    #[test]
    fn slug_gives_up_rather_than_inventing_a_name() {
        // Nothing usable survives, so the caller falls back to the plain
        // timestamped name. A wrong name would be worse than no name.
        for input in ["/tmp/🎉.png", "/tmp/---.png", "/tmp/....png", "/tmp/ .png"] {
            assert_eq!(super::slug(Path::new(input)), None, "{input}");
        }
    }

    #[test]
    fn slug_is_bounded_and_never_doubles_its_separators() {
        let long = format!("/tmp/{}.png", "a b".repeat(200));
        let got = super::slug(Path::new(&long)).unwrap();
        assert!(got.len() <= super::SLUG_MAX, "{} chars", got.len());
        assert!(!got.contains("--"), "{got}");
        assert!(!got.starts_with('-') && !got.ends_with('-'), "{got}");

        // A dash the name already had has to collapse with the ones this makes,
        // or "rm -rf" comes out as `rm--rf`. Found on a real host, not here.
        for input in ["/tmp/wéird ñame; rm -rf ~.png", "/tmp/a - b -- c.png"] {
            let got = super::slug(Path::new(input)).unwrap();
            assert!(!got.contains("--"), "{input} → {got}");
        }
        assert_eq!(
            super::slug(Path::new("/tmp/shot-2.png")).as_deref(),
            Some("shot-2"),
            "a dash that is doing real work still survives"
        );
    }

    // A batch shares one stamp, so if the composed names are not distinct the
    // second file silently overwrites the first — the exact loss this whole
    // feature replaced, reintroduced through the back door.
    #[test]
    fn previews_come_back_in_file_order_whichever_finishes_first() {
        let dir = std::env::temp_dir().join(format!("hb-previews-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        // Largest first, so the early files finish last.
        let mut files: Vec<(std::path::PathBuf, String)> = (0..6u32)
            .map(|i| {
                let path = dir.join(format!("src-{i}.png"));
                ::image::RgbaImage::from_pixel(
                    300 + (5 - i) * 400,
                    200,
                    ::image::Rgba([i as u8 * 40, 0, 0, 255]),
                )
                .save(&path)
                .unwrap();
                (path, format!("hostbeam-42-{i}.png"))
            })
            .collect();
        // One that will not decode costs its own preview, not the others'.
        let broken = dir.join("broken.png");
        std::fs::write(&broken, b"not a png").unwrap();
        files.insert(3, (broken, "hostbeam-42-broken.png".into()));

        let out = super::previews_in(&dir, &files);
        assert_eq!(out.len(), files.len());
        for ((_, name), preview) in files.iter().zip(&out) {
            let stem = name.trim_end_matches(".png");
            match preview {
                Some(p) => assert!(p.contains(stem), "{name} got {p}"),
                None => assert_eq!(stem, "hostbeam-42-broken"),
            }
        }
        assert!(out[3].is_none());
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn remote_names_within_a_batch_are_distinct() {
        let batch = |slug: Option<&str>, ext: Option<&str>| {
            let mut taken: Vec<String> = vec![];
            for _ in 0..3 {
                let refs: Vec<&str> = taken.iter().map(|s| s.as_str()).collect();
                taken.push(super::remote_name(42, slug, ext, &refs));
            }
            taken
        };
        assert_eq!(
            batch(Some("screenshot"), Some("png")),
            [
                "hostbeam-42-screenshot.png",
                "hostbeam-42-screenshot-2.png",
                "hostbeam-42-screenshot-3.png",
            ]
        );
        // Same again with nothing to name them by: every file composes the same
        // candidate, so the suffix is the only thing keeping them apart.
        assert_eq!(
            batch(None, Some("png")),
            ["hostbeam-42.png", "hostbeam-42-2.png", "hostbeam-42-3.png"]
        );
        // And with no extension, which a `Makefile` or a `.env` has.
        assert_eq!(
            batch(Some("Makefile"), None),
            [
                "hostbeam-42-Makefile",
                "hostbeam-42-Makefile-2",
                "hostbeam-42-Makefile-3"
            ]
        );
        assert_eq!(
            batch(None, None),
            ["hostbeam-42", "hostbeam-42-2", "hostbeam-42-3"]
        );
    }

    #[test]
    fn remote_names_stay_something_the_agent_tools_will_read() {
        // `apps/agent` serves `hostbeam-*` with an extension and refuses
        // anything with a separator in it (ADR 0020). Carrying a user's file
        // name into the middle must not break that.
        //
        // It also groups a beam's files by the stamp directly after the prefix,
        // and only reads 13 or more digits as a time (`stampOf` in
        // hostbeam-mcp.mjs), so the name is parsed after all: keep the stamp
        // first and in milliseconds. The iPhone composes the same shape — and
        // Clean up now matches exactly this (`artifact_match`).
        assert_eq!(
            super::stamp().to_string().len(),
            super::STAMP_DIGITS,
            "stamp must be epoch ms, and exactly as long as Clean up matches"
        );
        for (slug, ext) in [
            (None, Some("png")),
            (Some("shot-2"), Some("png")),
            (Some("Screenshot-2026-09-09-at-11.04.21"), Some("png")),
            (Some("report"), Some("pdf")),
            (Some("Makefile"), None),
            (None, None),
        ] {
            let name = super::remote_name(1788875278869, slug, ext, &[]);
            assert!(name.starts_with("hostbeam-"), "{name}");
            if let Some(ext) = ext {
                assert!(name.ends_with(&format!(".{ext}")), "{name}");
            }
            assert!(!name.contains('/'), "{name}");
            let stamp: String = name["hostbeam-".len()..]
                .chars()
                .take_while(|c| c.is_ascii_digit())
                .collect();
            assert_eq!(stamp.len(), 13, "stamp must lead the name: {name}");
            let after = name["hostbeam-".len() + 13..].chars().next();
            assert!(
                matches!(after, None | Some('.') | Some('-')),
                "only an end, a dot or a dash may follow the stamp: {name}"
            );
        }
    }

    // These two scripts run `find` on someone's host and one of them ends in
    // `-delete`, so what they match is the entire safety story.
    #[test]
    fn the_readout_and_the_deletion_match_the_same_files() {
        // The readout exists to say what cleanup would remove. If they can
        // describe different sets, it is lying rather than merely stale.
        let m = super::artifact_match();
        assert!(super::storage_script("/tmp/hostbeam").contains(&m));
        assert!(super::cleanup_script("/tmp/hostbeam").contains(&m));
    }

    #[test]
    fn cleanup_matches_the_stamp_not_a_type() {
        // Any file can be beamed now, so an extension says nothing about who
        // made a file. The stamp does: thirteen digits straight after the
        // prefix, then an end, a dot or a dash.
        let script = super::cleanup_script("/tmp/hostbeam");
        let d13 = "[0-9]".repeat(13);
        for pattern in [
            format!("-name 'hostbeam-{d13}'"),
            format!("-name 'hostbeam-{d13}.*'"),
            format!("-name 'hostbeam-{d13}-*'"),
        ] {
            assert!(script.contains(&pattern), "{pattern} missing: {script}");
        }
        // No pattern may be derived from a list of types any more — that is how
        // widening what can be beamed would widen what is deleted.
        for ext in super::IMAGE_EXTENSIONS {
            assert!(!script.contains(&format!("*.{ext}'")), "{ext}: {script}");
        }
    }

    #[test]
    fn cleanup_still_refuses_everything_the_app_did_not_create() {
        // This feeds a `-delete`, and `hostbeam-*` alone would match someone's
        // notes — or, since any file can be beamed, anything at all.
        let script = super::cleanup_script("/tmp/hostbeam");
        assert!(!script.contains("-name 'hostbeam-*"), "{script}");
        // Unfinished uploads, and only those: the suffix is fixed.
        assert!(script.contains("-name '.hostbeam-*.part'"), "{script}");
        assert!(!script.contains("-name '.hostbeam-*'"), "{script}");
        assert!(script.contains("-maxdepth 1"), "never recursive");
        assert!(script.contains("-type f"), "never directories");
        assert!(!script.contains("rm "), "no rm, only find -delete");
    }

    /// Everything a beam folder might hold, as `(name, deleted by Clean up)`.
    /// Shared by the local run and the one on the test host, so both prove the
    /// same thing.
    const CLEANUP_FIXTURE: &[(&str, bool)] = &[
        // Hostbeam's own: every shape `remote_name` composes.
        ("hostbeam-1788875278869.png", true),
        ("hostbeam-1788875278869-2.png", true),
        ("hostbeam-1788875278869-report.pdf", true),
        ("hostbeam-1788875278869-Makefile", true),
        ("hostbeam-1788875278869", true),
        ("hostbeam-1788875278869-archive.tar.gz", true),
        (".hostbeam-1a2b3c-0.part", true),
        // Somebody else's, or not quite Hostbeam's — every one must survive.
        ("hostbeam-notes.txt", false),
        ("hostbeam-diagram.png", false),
        ("hostbeam-2026-08-28-153012.png", false), // the iPhone before 2026-09-13
        ("hostbeam-178887527886.png", false),      // 12 digits
        ("hostbeam-17888752788690.png", false),    // 14 digits
        ("hostbeam-1788875278869x.png", false),    // a letter after the stamp
        // Its own stamp: macOS folds case, so it would overwrite the first row.
        ("HOSTBEAM-1788875278871.png", false),
        ("xhostbeam-1788875278869.png", false),
        (".hostbeam-notes", false),
        ("notes.txt", false),
    ];

    /// A shell script that builds [`CLEANUP_FIXTURE`] in `dir`, plus the three
    /// things `find`'s flags must keep it from touching: a stamped directory, a
    /// stamped file inside it (`-maxdepth 1`), and a stamped symlink to a file
    /// that is not Hostbeam's (`-type f`).
    fn fixture_script(dir: &str) -> String {
        let mut s = format!("set -e; mkdir -p '{dir}'; cd '{dir}'; ");
        for (name, _) in CLEANUP_FIXTURE {
            s.push_str(&format!("printf x > '{name}'; "));
        }
        s.push_str(
            "mkdir hostbeam-1788875278869-dir; \
             printf x > hostbeam-1788875278869-dir/hostbeam-1788875278869.png; \
             ln -s notes.txt hostbeam-1788875278870.png",
        );
        s
    }

    /// What must be left once Clean up has run.
    fn survivors() -> Vec<String> {
        let mut names: Vec<String> = CLEANUP_FIXTURE
            .iter()
            .filter(|(_, deleted)| !deleted)
            .map(|(n, _)| n.to_string())
            .chain(["hostbeam-1788875278869-dir", "hostbeam-1788875278870.png"].map(String::from))
            .collect();
        names.sort();
        names
    }

    fn deleted_count() -> u64 {
        CLEANUP_FIXTURE.iter().filter(|(_, d)| *d).count() as u64
    }

    /// Run `script` with `sh -c` and return its trimmed stdout.
    fn sh(script: &str) -> String {
        let out = std::process::Command::new("sh")
            .arg("-c")
            .arg(script)
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{script}: {}",
            String::from_utf8_lossy(&out.stderr)
        );
        String::from_utf8_lossy(&out.stdout).trim().to_string()
    }

    #[test]
    fn cleanup_deletes_exactly_what_hostbeam_beamed_on_a_real_find() {
        // Not the script's text: the script, run. `find`'s globbing is where a
        // pattern that reads right can still match wrong, so this proves the
        // set on this Mac's BSD `find`, and its #[ignore]d twin below on the
        // test host's BusyBox one.
        let dir = std::env::temp_dir().join(format!("hb-cleanup-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let folder = dir.to_string_lossy().into_owned();
        sh(&fixture_script(&folder));

        let storage = super::parse_storage(&sh(&super::storage_script(&folder))).unwrap();
        assert_eq!(
            storage.count,
            deleted_count(),
            "Storage counts what Clean up removes"
        );
        let removed: u64 = sh(&super::cleanup_script(&folder)).parse().unwrap();
        assert_eq!(removed, deleted_count());

        let mut left: Vec<String> = std::fs::read_dir(&dir)
            .unwrap()
            .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
            .collect();
        left.sort();
        assert_eq!(left, survivors());
        assert!(
            dir.join("hostbeam-1788875278869-dir/hostbeam-1788875278869.png")
                .exists(),
            "never recursive"
        );
        std::fs::remove_dir_all(&dir).unwrap();
    }

    /// [`cleanup_deletes_exactly_what_hostbeam_beamed_on_a_real_find`] on the
    /// repo's test host, whose `find` is BusyBox's. Needs `npm run testhost:up`:
    /// `cargo test --lib cleanup_on_the_test_host -- --ignored --nocapture`
    #[test]
    #[ignore = "needs the test host (npm run testhost:up)"]
    fn cleanup_on_the_test_host_deletes_exactly_what_hostbeam_beamed() {
        let host = "hostbeam-testhost";
        let folder = format!("/tmp/hb-cleanup-test-{}", std::process::id());
        let run = |script: &str| super::ssh_capture(host, script, "cleanup test").unwrap();
        run(&format!("rm -rf '{folder}'; {}", fixture_script(&folder)));

        let storage = super::parse_storage(&run(&super::storage_script(&folder))).unwrap();
        assert_eq!(storage.count, deleted_count());
        let removed: u64 = run(&super::cleanup_script(&folder)).parse().unwrap();
        assert_eq!(removed, deleted_count());

        let listing = run(&format!("ls -A '{folder}'"));
        let mut left: Vec<String> = listing.lines().map(str::to_string).collect();
        left.sort();
        let nested = run(&format!(
            "test -f '{folder}/hostbeam-1788875278869-dir/hostbeam-1788875278869.png' && echo yes"
        ));
        run(&format!("rm -rf '{folder}'"));
        assert_eq!(left, survivors());
        assert_eq!(nested, "yes", "never recursive");
    }

    /// Any file, end to end, on the repo's test host: named the way
    /// `prepare_files` names it, sent by the real `ssh::upload`, byte for byte
    /// — then Storage and Clean up in a folder that also holds a file that is
    /// not Hostbeam's, which must survive. The UI is not in this (it needs
    /// hands); everything under it is. Needs `npm run testhost:up`:
    /// `cargo test --lib any_file_on_the_test_host -- --ignored --nocapture`
    #[test]
    #[ignore = "needs the test host (npm run testhost:up)"]
    fn any_file_on_the_test_host_lands_byte_for_byte() {
        let host = "hostbeam-testhost";
        let dir = scratch("any-file-host");
        let pdf: Vec<u8> = (0..300_000u32).map(|i| (i * 7 % 251) as u8).collect();
        let paths = write(
            &dir,
            &[
                ("report.pdf", &pdf),
                ("data.csv", b"a,b\n1,2\n"),
                ("Makefile", b"all:\n\ttrue\n"),
                ("wéird ñame; rm -rf ~.txt", b"odd"),
                ("Shot.PNG", b"not really a png"),
            ],
        );
        let env = write(&dir, &[(".env", b"TOKEN=abc")]);

        // A secret in the gesture holds all of it, before anything is sent.
        let mut with_env = paths.clone();
        with_env.extend(env.iter().cloned());
        assert!(matches!(
            super::prepare_files(&with_env, super::stamp(), true),
            Ok(super::Prepared::Held(_))
        ));

        let files = ready(super::prepare_files(&paths, super::stamp(), true));
        let folder = format!("/tmp/hb-anyfile-test-{}", std::process::id());
        let run = |script: &str| super::ssh_capture(host, script, "any-file test").unwrap();
        run(&super::mkdir_script(&folder));
        let sent = crate::services::ssh::upload(host, &folder, &files, |_| {});
        assert!(
            sent.error.is_none(),
            "{:?}",
            sent.error.map(|e| e.to_string())
        );
        assert_eq!(sent.landed, files.len());

        for (local, name) in &files {
            let want = sh(&format!(
                "shasum -a 256 '{}' | cut -d' ' -f1",
                local.display()
            ));
            let got = run(&format!("sha256sum '{folder}/{name}' | cut -d' ' -f1"));
            assert_eq!(got, want, "{name} arrived changed");
        }

        // Someone else's file beside them: counted by nothing, deleted by nothing.
        run(&format!("printf mine > '{folder}/hostbeam-notes.txt'"));
        let storage = super::parse_storage(&run(&super::storage_script(&folder))).unwrap();
        assert_eq!(storage.count, files.len() as u64);
        let removed: u64 = run(&super::cleanup_script(&folder)).parse().unwrap();
        assert_eq!(removed, files.len() as u64);
        let left = run(&format!("ls -A '{folder}'"));
        run(&format!("rm -rf '{folder}'"));
        assert_eq!(left, "hostbeam-notes.txt");
        let names: Vec<&str> = files.iter().map(|(_, n)| n.as_str()).collect();
        println!("landed and cleaned up: {names:?}");
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn the_remote_folder_is_quoted_everywhere_it_is_interpolated() {
        // `valid_folder` refuses quotes and whitespace but permits `;` and
        // `$(…)`, so an unquoted folder would run as a command on the host.
        // These were the only two scripts that interpolated it bare.
        let folder = "/tmp/hostbeam";
        for script in [
            super::mkdir_script(folder),
            super::storage_script(folder),
            super::cleanup_script(folder),
        ] {
            assert!(
                script.contains(&format!("'{folder}'")),
                "folder is not single-quoted: {script}"
            );
        }
    }

    #[test]
    fn the_beam_folder_must_belong_to_the_login() {
        // On a shared host whoever creates /tmp/hostbeam first owns it, and a
        // bare `mkdir -p` would accept their folder without a word.
        let script = super::mkdir_script("/tmp/hostbeam");
        assert!(script.contains("test -O '/tmp/hostbeam'"), "{script}");
        assert!(
            script.contains("-m 700"),
            "a new folder is private: {script}"
        );
    }

    #[test]
    fn only_a_failure_with_nothing_on_stderr_reads_as_the_owner_test() {
        // `mkdir`, `ssh` and the network always explain themselves; `test -O`
        // never does. That difference is the only thing telling them apart.
        use crate::error::Error;
        use crate::services::ssh::ssh_error;

        assert!(super::failed_silently(&ssh_error("")));
        for said in [
            "mkdir: cannot create directory '/root/x': Permission denied",
            "ssh: connect to host box port 22: Operation timed out",
        ] {
            assert!(!super::failed_silently(&ssh_error(said)), "{said}");
        }
        assert!(!super::failed_silently(&Error::InvalidFolder));
    }

    // The retry token is the only thing that lets a beam skip the secret check,
    // so what it refuses is the whole of its correctness.
    #[test]
    fn a_retry_token_is_good_once_and_only_for_its_own_files() {
        let retries = super::Retries::default();
        let failed = vec!["/a.png".to_string(), "/b.png".to_string()];
        let token = retries.issue(&failed);

        // The wrong token, or none, is an ordinary beam and is counted.
        assert!(retries.claim(None, &failed).is_none());
        assert!(retries.claim(Some("not-the-token"), &failed).is_none());

        // A file the partial never left behind cannot ride along on one that it
        // did — otherwise "retry" would skip the secret check for anything.
        assert!(retries
            .claim(
                Some(&token),
                &["/a.png".to_string(), "/elsewhere.png".to_string()]
            )
            .is_none());
        // Nor can an empty set claim it.
        assert!(retries.claim(Some(&token), &[]).is_none());

        // A subset is fine: the user may retry some of what is left.
        let taken = retries.claim(Some(&token), &["/a.png".to_string()]);
        assert!(taken.is_some());

        // And it is taken. A second press would count — unless the beam delivered
        // nothing, which hands the claim back with the same token.
        assert!(retries
            .claim(Some(&token), &["/b.png".to_string()])
            .is_none());
        retries.restore(taken.unwrap());
        assert!(retries
            .claim(Some(&token), &["/b.png".to_string()])
            .is_some());
    }

    #[test]
    fn a_newer_partial_supersedes_the_older_token() {
        // A retry that itself stops part-way issues a fresh token for its own
        // remainder; the superseded one must not still be claimable.
        let retries = super::Retries::default();
        let first = retries.issue(&["/x.png".to_string()]);
        let second = retries.issue(&["/y.png".to_string()]);
        assert!(retries
            .claim(Some(&first), &["/x.png".to_string()])
            .is_none());
        assert!(retries
            .claim(Some(&second), &["/y.png".to_string()])
            .is_some());
    }

    #[test]
    fn a_restore_never_overwrites_a_newer_claim() {
        // The live token is the one the popover is holding; the restored one
        // is history.
        let retries = super::Retries::default();
        let stale = retries.issue(&["/old.png".to_string()]);
        let taken_stale = retries
            .claim(Some(&stale), &["/old.png".to_string()])
            .unwrap();
        let fresh = retries.issue(&["/new.png".to_string()]);
        retries.restore(taken_stale);
        assert!(retries
            .claim(Some(&stale), &["/old.png".to_string()])
            .is_none());
        assert!(retries
            .claim(Some(&fresh), &["/new.png".to_string()])
            .is_some());
        // And nothing is outstanding once the live one is claimed.
        assert!(!retries.outstanding());
    }

    use super::{render_sentence, MAX_BATCH};

    /// The single-path case every existing test describes.
    fn one(template: &str, copy: bool, path: &str) -> String {
        render_sentence(template, copy, &[path.to_string()])
    }

    #[test]
    fn default_template_substitutes_path() {
        assert_eq!(
            one("Use this screenshot: {path}", true, "/tmp/hostbeam/a.png"),
            "Use this screenshot: /tmp/hostbeam/a.png"
        );
    }

    #[test]
    fn custom_template_substitutes_every_token() {
        assert_eq!(
            one("see {path} ({path})", true, "/x/y.png"),
            "see /x/y.png (/x/y.png)"
        );
    }

    #[test]
    fn template_without_token_copies_bare_path() {
        assert_eq!(one("no token here", true, "/x/y.png"), "/x/y.png");
    }

    #[test]
    fn copy_sentence_off_copies_bare_path() {
        assert_eq!(
            one("Use this screenshot: {path}", false, "/x/y.png"),
            "/x/y.png"
        );
    }

    #[test]
    fn several_paths_repeat_the_template_one_per_line() {
        // Not a plural template: no new setting, it keeps working with whatever
        // the user wrote, and an agent cannot misread which path is which.
        let paths = ["/t/a.png".to_string(), "/t/b.png".to_string()];
        assert_eq!(
            render_sentence("Use this screenshot: {path}", true, &paths),
            "Use this screenshot: /t/a.png\nUse this screenshot: /t/b.png"
        );
    }

    #[test]
    fn several_paths_honour_a_custom_template_and_the_copy_toggle() {
        let paths = ["/t/a.png".to_string(), "/t/b.png".to_string()];
        assert_eq!(
            render_sentence("look at {path} now", true, &paths),
            "look at /t/a.png now\nlook at /t/b.png now"
        );
        // The sentence off: bare paths, one line, a space apart.
        assert_eq!(
            render_sentence("Use this screenshot: {path}", false, &paths),
            "/t/a.png /t/b.png"
        );
    }

    #[test]
    fn several_bare_paths_share_one_line_a_space_apart() {
        // Claude Code and Gemini CLI attach every path in a paste that is split
        // at spaces; one per line, they attached one file or none (next.md
        // § 10a). A template with no token is the same bare paths.
        let paths = [
            "/t/a.png".to_string(),
            "/t/b.jpg".to_string(),
            "/t/c.pdf".to_string(),
        ];
        assert_eq!(
            render_sentence(crate::config::DEFAULT_SENTENCE, false, &paths),
            "/t/a.png /t/b.jpg /t/c.pdf"
        );
        assert_eq!(
            render_sentence("no token", true, &paths),
            "/t/a.png /t/b.jpg /t/c.pdf"
        );
        // One path is just the path, with nothing around it.
        assert_eq!(
            render_sentence(crate::config::DEFAULT_SENTENCE, false, &paths[..1]),
            "/t/a.png"
        );
    }

    #[test]
    fn no_paths_render_to_nothing() {
        // Cannot happen — an empty batch is refused before this — but an empty
        // join must not produce a stray template line with the token still in it.
        assert_eq!(
            render_sentence("Use this screenshot: {path}", true, &[]),
            ""
        );
    }

    #[test]
    fn a_file_that_is_not_a_picture_says_file_under_the_default() {
        // "Use this screenshot" in front of a PDF is the one wrong word in the
        // line. Only the untouched default changes, and only for non-pictures.
        assert_eq!(
            one(crate::config::DEFAULT_SENTENCE, true, "/tmp/hostbeam/r.pdf"),
            "Use this file: /tmp/hostbeam/r.pdf"
        );
        assert_eq!(
            one(
                crate::config::DEFAULT_SENTENCE,
                true,
                "/tmp/hostbeam/hostbeam-1-Makefile"
            ),
            "Use this file: /tmp/hostbeam/hostbeam-1-Makefile"
        );
        assert_eq!(
            one(crate::config::DEFAULT_SENTENCE, true, "/tmp/hostbeam/a.PNG"),
            "Use this screenshot: /tmp/hostbeam/a.PNG"
        );
    }

    #[test]
    fn a_template_someone_wrote_is_never_rewritten() {
        assert_eq!(one("Look at {path}", true, "/t/r.pdf"), "Look at /t/r.pdf");
        assert_eq!(
            one("Use this screenshot please: {path}", true, "/t/r.pdf"),
            "Use this screenshot please: /t/r.pdf"
        );
        // And "copy a sentence" off still copies the bare path.
        assert_eq!(
            one(crate::config::DEFAULT_SENTENCE, false, "/t/r.pdf"),
            "/t/r.pdf"
        );
    }

    #[test]
    fn a_mixed_batch_says_what_each_line_is() {
        let paths = vec!["/t/a.png".to_string(), "/t/b.pdf".to_string()];
        assert_eq!(
            render_sentence(crate::config::DEFAULT_SENTENCE, true, &paths),
            "Use this screenshot: /t/a.png\nUse this file: /t/b.pdf"
        );
    }

    #[test]
    fn the_batch_cap_is_a_sane_size() {
        // Small enough that a mis-dragged folder is refused promptly, large
        // enough that no deliberate drop of screenshots hits it.
        assert!((10..=50).contains(&MAX_BATCH), "MAX_BATCH = {MAX_BATCH}");
    }
}

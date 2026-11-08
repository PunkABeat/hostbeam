//! Lightweight diagnostic logger. Appends timestamped lines to a daily file in
//! the app log dir (`~/Library/Logs/com.hostbeam.app/hostbeam-YYYY-MM-DD.log`),
//! keeps the last 7 days, and exposes commands so the user can view / copy /
//! clear them for support. Records beams, every ssh/scp command + exit + timing,
//! reachability probes, diagnostics, and app lifecycle events.
//!
//! It is also the `log` crate's logger, so what Tauri and its plugins log
//! through that facade lands in the same file: the updater at info and above
//! (what support needs to see a failed download or signature), everything
//! else only at warn and above, which keeps the file readable.

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

use tauri::{AppHandle, Manager};

const RETAIN_DAYS: i64 = 7;
const PREFIX: &str = "hostbeam-";
const SUFFIX: &str = ".log";
// Cap what the viewer/copy returns so a long history stays manageable.
const MAX_LINES: usize = 8000;

// The log directory, set once at startup. OnceLock (vs a Mutex<Option<…>>) makes
// the write-once nature explicit and removes lock poisoning + the custom guard.
static LOG_DIR: OnceLock<PathBuf> = OnceLock::new();

/// Forwards `log` records from dependencies into [`write`].
struct Facade;

static FACADE: Facade = Facade;

/// The least severe level worth keeping from a dependency, by its target.
fn threshold(target: &str) -> ::log::LevelFilter {
    if target.starts_with("tauri_plugin_updater") {
        ::log::LevelFilter::Info
    } else {
        ::log::LevelFilter::Warn
    }
}

impl ::log::Log for Facade {
    fn enabled(&self, meta: &::log::Metadata) -> bool {
        meta.level() <= threshold(meta.target())
    }

    fn log(&self, record: &::log::Record) {
        if !self.enabled(record.metadata()) {
            return;
        }
        let level = match record.level() {
            ::log::Level::Error => "ERROR",
            ::log::Level::Warn => "WARN",
            _ => "INFO",
        };
        write(level, &format!("[{}] {}", record.target(), record.args()));
    }

    fn flush(&self) {}
}

/// Resolve the log dir, create it, prune old files, and remember it for `write`.
pub fn init(app: &AppHandle) {
    // Before anything else, so a plugin failing during setup is not lost. A
    // second call (there is none) would find the logger taken and change nothing.
    if ::log::set_logger(&FACADE).is_ok() {
        ::log::set_max_level(::log::LevelFilter::Info);
    }
    let Ok(dir) = app.path().app_log_dir() else {
        eprintln!("[hostbeam] no log directory available; logging to stderr only");
        return;
    };
    // The logger isn't wired up yet (LOG_DIR is set below), so these bootstrap fs
    // ops can't log their own failure; a failed create_dir_all simply means the
    // first `write` below can't open the file and degrades to stderr.
    if let Err(e) = fs::create_dir_all(&dir) {
        eprintln!("[hostbeam] could not create log dir {}: {e}", dir.display());
    }
    prune(&dir);
    if LOG_DIR.set(dir).is_err() {
        eprintln!("[hostbeam] log directory already initialized");
    }
}

fn is_log(name: &str) -> bool {
    name.starts_with(PREFIX) && name.ends_with(SUFFIX)
}

fn prune(dir: &Path) {
    let cutoff = chrono::Local::now().date_naive() - chrono::Duration::days(RETAIN_DAYS);
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for e in entries.flatten() {
        let name = e.file_name().to_string_lossy().to_string();
        if !is_log(&name) {
            continue;
        }
        let date = &name[PREFIX.len()..name.len() - SUFFIX.len()];
        if let Ok(d) = chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d") {
            if d < cutoff {
                // Best-effort retention prune during init (logger not yet ready).
                if let Err(err) = fs::remove_file(e.path()) {
                    eprintln!("[hostbeam] could not prune old log {name}: {err}");
                }
            }
        }
    }
}

fn today_file(dir: &Path) -> PathBuf {
    dir.join(format!(
        "{PREFIX}{}{SUFFIX}",
        chrono::Local::now().format("%Y-%m-%d")
    ))
}

/// Append one log line (and echo to stderr in dev builds).
pub fn write(level: &str, msg: &str) {
    let line = format!(
        "{} {level:<5} {msg}\n",
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f")
    );
    if cfg!(debug_assertions) {
        eprint!("[hostbeam] {line}");
    }
    if let Some(dir) = LOG_DIR.get() {
        // This *is* the logger: a failed open/write can't be logged through itself
        // (that would recurse), so fall back to stderr.
        match OpenOptions::new()
            .create(true)
            .append(true)
            .open(today_file(dir))
        {
            Ok(mut f) => {
                if let Err(e) = f.write_all(line.as_bytes()) {
                    eprintln!("[hostbeam] log write failed: {e}");
                }
            }
            Err(e) => eprintln!("[hostbeam] log open failed: {e}"),
        }
    }
}

pub fn info(msg: impl AsRef<str>) {
    write("INFO", msg.as_ref());
}
pub fn warn(msg: impl AsRef<str>) {
    write("WARN", msg.as_ref());
}
pub fn error(msg: impl AsRef<str>) {
    write("ERROR", msg.as_ref());
}

/// Run a best-effort, fire-and-forget operation, logging (not propagating) any
/// error. For UI/system calls (`window.eval`, window/panel geometry, tray icon
/// and menu updates, notifications) where there is no meaningful recovery but a
/// silent `let _ =` would hide a real failure. Returns whether it succeeded.
pub fn warn_if_err<T, E: std::fmt::Display>(
    context: &str,
    result: std::result::Result<T, E>,
) -> bool {
    match result {
        Ok(_) => true,
        Err(e) => {
            warn(format!("{context} failed: {e}"));
            false
        }
    }
}

/// The log directory path (for display / "open folder").
#[tauri::command]
pub fn log_dir(app: AppHandle) -> String {
    app.path()
        .app_log_dir()
        .map(|d| d.to_string_lossy().into_owned())
        .unwrap_or_default()
}

/// Concatenate the retained logs (oldest→newest), with a small system header,
/// tail-capped to the most recent `MAX_LINES` lines.
#[tauri::command]
pub fn read_logs(app: AppHandle) -> String {
    let Ok(dir) = app.path().app_log_dir() else {
        return String::new();
    };
    let mut files: Vec<PathBuf> = fs::read_dir(&dir)
        .into_iter()
        .flatten()
        .flatten()
        .map(|e| e.path())
        .filter(|p| {
            p.file_name()
                .and_then(|n| n.to_str())
                .map(is_log)
                .unwrap_or(false)
        })
        .collect();
    files.sort();

    let mut body = String::new();
    for f in files {
        if let Ok(s) = fs::read_to_string(&f) {
            body.push_str(&s);
        }
    }
    let lines: Vec<&str> = body.lines().collect();
    let tail = if lines.len() > MAX_LINES {
        format!(
            "…(older entries truncated)…\n{}",
            lines[lines.len() - MAX_LINES..].join("\n")
        )
    } else {
        lines.join("\n")
    };

    format!(
        "Hostbeam {} · {} {}\nLogs: {}\n\n{tail}\n",
        env!("CARGO_PKG_VERSION"),
        std::env::consts::OS,
        std::env::consts::ARCH,
        dir.display(),
    )
}

/// Delete all retained log files.
#[tauri::command]
pub fn clear_logs(app: AppHandle) {
    if let Ok(dir) = app.path().app_log_dir() {
        if let Ok(entries) = fs::read_dir(&dir) {
            for e in entries.flatten() {
                if is_log(&e.file_name().to_string_lossy()) {
                    warn_if_err("clear log file", fs::remove_file(e.path()));
                }
            }
        }
    }
    info("logs cleared by user");
}

/// Reveal the log folder in Finder.
#[tauri::command]
pub fn open_log_dir(app: AppHandle) {
    if let Ok(dir) = app.path().app_log_dir() {
        warn_if_err("create log dir", fs::create_dir_all(&dir));
        warn_if_err(
            "reveal log dir",
            std::process::Command::new("open").arg(&dir).spawn(),
        );
    }
}

#[cfg(test)]
mod tests {
    use super::threshold;
    use ::log::LevelFilter;

    #[test]
    fn the_updater_is_heard_at_info_and_the_rest_at_warn() {
        assert_eq!(
            threshold("tauri_plugin_updater::updater"),
            LevelFilter::Info
        );
        assert_eq!(threshold("tauri_plugin_updater"), LevelFilter::Info);
        assert_eq!(threshold("tao::platform_impl"), LevelFilter::Warn);
        assert_eq!(threshold("reqwest::connect"), LevelFilter::Warn);
    }
}

//! A host's dev server, forwarded to this Mac while the user wants it (ADR 0029).
//!
//! **Open** holds one SSH connection for the forward's whole life — a
//! ControlMaster — and listens on `127.0.0.1`. Each browser connection is one
//! more session over that connection: `ssh -W` where the host allows forwarding,
//! else a relay already on the host (`dev_servers::relay_command`). Nothing is
//! installed or left there.
//!
//! **Nothing outlives Hostbeam.** The connection's remote command is a `cat`
//! into `/dev/null`, fed from a pipe this process holds, and every per-connection
//! `ssh` reads from a pipe too: if Hostbeam dies without cleaning up, the pipes
//! close, `cat` ends, and each connection ends with it. [`stop_all`] runs on a
//! normal quit.
//!
//! This is the first thing in Hostbeam that keeps a connection open; it does so
//! only between a click on Open and Stop, and the popover and the menu-bar menu
//! both say so while it does.

use std::io::Read;
use std::net::{Shutdown, TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::dev_servers::{self, Relay};
use crate::error::{CommandError, Error, Result};
use crate::services::ssh;
use crate::ui_bridge::{self, Target, UiMessage};

/// An open forward, as the popover and the tray show it.
#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OpenForward {
    /// The ssh target the webview named the host by (alias or user@address).
    pub target: String,
    /// The port on the host.
    pub port: u16,
    /// Where it is on this Mac: `http://127.0.0.1:<port>/`.
    pub url: String,
}

/// How a browser connection reaches the host's port.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Via {
    /// `ssh -W`: the host's own forwarding.
    Direct,
    /// A command on the host that pipes one connection (the host refuses `-W`).
    Relay(Relay),
}

struct Forward {
    info: OpenForward,
    control: PathBuf,
    master: Child,
    stop: Arc<AtomicBool>,
    /// Per-connection `ssh` processes still running, by pid.
    conns: Arc<Mutex<Vec<u32>>>,
    /// The updater relaunches only when nothing is in flight; an open page is.
    _transfer: crate::updates::Transfer,
}

/// Every open forward. Managed by Tauri.
#[derive(Default)]
pub struct State(Mutex<Vec<Forward>>);

impl State {
    fn lock(&self) -> std::sync::MutexGuard<'_, Vec<Forward>> {
        self.0.lock().unwrap_or_else(|p| p.into_inner())
    }
}

/// A port the user could be running a dev server on: not a privileged one.
#[must_use]
pub fn valid_port(port: u16) -> bool {
    port >= 1024
}

/// The page's address on this Mac. 127.0.0.1 rather than `localhost`: the
/// listener is IPv4 loopback only, and a browser that tries `::1` first would
/// wait on nothing.
#[must_use]
pub fn local_url(port: u16) -> String {
    format!("http://127.0.0.1:{port}/")
}

/// A control socket path short enough for macOS's 104-byte `sun_path`, with
/// room for the 17 characters ssh appends while it creates it. `$TMPDIR` is
/// per-user and private.
fn control_path() -> PathBuf {
    static N: AtomicU32 = AtomicU32::new(0);
    std::env::temp_dir().join(format!(
        "hb-fwd-{}-{}",
        std::process::id(),
        N.fetch_add(1, Ordering::SeqCst)
    ))
}

/// What `ssh -W` said when it could not open the channel, read from stderr:
/// `Ok(false)` when the host refuses forwarding, `Err(DevServerGone)` when the
/// port is closed, and any other failure as an ssh error.
///
/// Through the held connection (a multiplexing client) OpenSSH does not pass
/// the reason on: a host with `AllowTcpForwarding no` answers "Stdio forwarding
/// request failed: Session open refused by peer" (hostbeam-testhost,
/// 2026-09-28). The port was just seen listening, so that reads as refused.
fn read_direct_refusal(stderr: &str) -> Result<bool> {
    let s = stderr.to_ascii_lowercase();
    if s.contains("administratively prohibited")
        || s.contains("stdio forwarding request failed")
        || s.contains("session open refused")
    {
        Ok(false)
    } else if s.contains("connect failed") || s.contains("connection refused") {
        Err(Error::DevServerGone)
    } else {
        Err(ssh::ssh_error(stderr))
    }
}

fn ssh_command(args: &[&str]) -> Command {
    let mut c = Command::new("ssh");
    c.args(ssh::ssh_args(args));
    c
}

/// Start the connection and wait until its control socket answers.
fn start_master(target: &str, control: &Path) -> Result<Child> {
    let ctl = control.to_string_lossy().into_owned();
    let mut master = ssh_command(&[
        "-M",
        "-S",
        &ctl,
        "-T",
        // Never forward the agent or X11 on this connection, and none of the
        // forwards the user's config may name for the host: a LocalForward
        // already held by their own ssh would fail this one.
        "-a",
        "-x",
        "-o",
        "ClearAllForwardings=yes",
        "-o",
        "ControlPersist=no",
        "-o",
        "ServerAliveInterval=15",
        "-o",
        "ServerAliveCountMax=3",
        target,
        "cat >/dev/null",
    ])
    .stdin(Stdio::piped())
    .stdout(Stdio::null())
    .stderr(Stdio::piped())
    .spawn()?;

    let deadline = Instant::now() + Duration::from_secs(12);
    loop {
        if let Some(_status) = master.try_wait()? {
            let mut err = String::new();
            if let Some(mut e) = master.stderr.take() {
                let _ = e.read_to_string(&mut err);
            }
            crate::log::error(format!("dev forward: connection failed: {}", err.trim()));
            return Err(ssh::ssh_error(&err));
        }
        let up = ssh_command(&["-S", &ctl, "-O", "check", target])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .is_ok_and(|s| s.success());
        if up {
            return Ok(master);
        }
        if Instant::now() > deadline {
            let _ = master.kill();
            let _ = master.wait();
            return Err(ssh::ssh_error("timed out"));
        }
        std::thread::sleep(Duration::from_millis(100));
    }
}

/// Ask the host, over the held connection, what the user is listening on and
/// which relays it has.
fn detect_over(target: &str, control: &Path) -> Result<dev_servers::Detection> {
    let ctl = control.to_string_lossy().into_owned();
    let script = format!("sh -c '{}'", dev_servers::DETECT_SCRIPT);
    let out = ssh_command(&["-S", &ctl, target, &script]).output()?;
    Ok(dev_servers::parse(&String::from_utf8_lossy(&out.stdout)))
}

/// Whether `ssh -W` reaches the port: one channel opened and closed at once.
fn direct_works(target: &str, control: &Path, port: u16) -> Result<bool> {
    let ctl = control.to_string_lossy().into_owned();
    let dest = format!("127.0.0.1:{port}");
    let mut child = ssh_command(&["-S", &ctl, "-W", &dest, target])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()?;
    let deadline = Instant::now() + Duration::from_secs(3);
    loop {
        if let Some(status) = child.try_wait()? {
            if status.success() {
                return Ok(true);
            }
            let mut err = String::new();
            if let Some(mut e) = child.stderr.take() {
                let _ = e.read_to_string(&mut err);
            }
            return read_direct_refusal(&err);
        }
        if Instant::now() > deadline {
            // Still open: the channel was accepted and the server is holding it.
            let _ = child.kill();
            let _ = child.wait();
            return Ok(true);
        }
        std::thread::sleep(Duration::from_millis(50));
    }
}

/// The per-connection `ssh`: its stdin and stdout are the browser connection.
fn connection_command(target: &str, control: &Path, port: u16, via: Via) -> Command {
    let ctl = control.to_string_lossy().into_owned();
    match via {
        Via::Direct => ssh_command(&["-S", &ctl, "-W", &format!("127.0.0.1:{port}"), target]),
        Via::Relay(relay) => ssh_command(&[
            "-S",
            &ctl,
            "-T",
            target,
            &dev_servers::relay_command(relay, port),
        ]),
    }
}

/// Carry one browser connection until either side ends it.
fn carry(stream: TcpStream, mut cmd: Command, conns: &Arc<Mutex<Vec<u32>>>) {
    let child = cmd
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn();
    let mut child = match child {
        Ok(c) => c,
        Err(e) => {
            crate::log::error(format!("dev forward: connection: {e}"));
            return;
        }
    };
    let pid = child.id();
    conns.lock().unwrap_or_else(|p| p.into_inner()).push(pid);
    let (Some(mut to_host), Some(mut from_host)) = (child.stdin.take(), child.stdout.take()) else {
        let _ = child.kill();
        let _ = child.wait();
        return;
    };
    let Ok(mut from_browser) = stream.try_clone() else {
        let _ = child.kill();
        let _ = child.wait();
        return;
    };
    let mut to_browser = stream;
    // Browser → host. Its end closes the pipe, which is the host's EOF. Not
    // joined: a browser keeps its side open after a response, and on macOS
    // shutting the socket down does not wake a read blocked on it, so waiting
    // here would hold every finished connection open (the test host found
    // this). It ends when the browser closes, or on its next write to the
    // ended `ssh`.
    std::thread::spawn(move || {
        let _ = std::io::copy(&mut from_browser, &mut to_host);
        drop(to_host);
    });
    // Host → browser. Its end is the browser's EOF.
    let _ = std::io::copy(&mut from_host, &mut to_browser);
    let _ = to_browser.shutdown(Shutdown::Write);
    let _ = child.kill();
    let _ = child.wait();
    conns
        .lock()
        .unwrap_or_else(|p| p.into_inner())
        .retain(|p| *p != pid);
}

/// Listen on 127.0.0.1 — the same port when free, so a page's links and origin
/// match what the agent said, else any free one.
fn bind_local(port: u16) -> Result<TcpListener> {
    let listener =
        TcpListener::bind(("127.0.0.1", port)).or_else(|_| TcpListener::bind(("127.0.0.1", 0)))?;
    listener.set_nonblocking(true)?;
    Ok(listener)
}

/// What the accept loop needs to carry connections for one forward.
struct Route {
    target: String,
    control: PathBuf,
    port: u16,
    via: Via,
    stop: Arc<AtomicBool>,
    conns: Arc<Mutex<Vec<u32>>>,
}

/// Accept browser connections until stopped, or until the held connection ends.
fn serve(app: &AppHandle, listener: &TcpListener, route: &Route) {
    let Route {
        target,
        control,
        port,
        via,
        stop,
        conns,
    } = route;
    let (port, via) = (*port, *via);
    let mut last_check = Instant::now();
    while !stop.load(Ordering::SeqCst) {
        match listener.accept() {
            Ok((stream, _)) => {
                let _ = stream.set_nonblocking(false);
                let cmd = connection_command(target, control, port, via);
                let conns = Arc::clone(conns);
                std::thread::spawn(move || carry(stream, cmd, &conns));
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(40));
            }
            Err(e) => {
                crate::log::error(format!("dev forward: accept: {e}"));
                std::thread::sleep(Duration::from_millis(200));
            }
        }
        // A dropped connection (sleep, network change) ends the forward rather
        // than leaving a listener that answers with nothing.
        if last_check.elapsed() > Duration::from_secs(2) {
            last_check = Instant::now();
            if master_gone(app, target, port) {
                crate::log::info(format!("dev forward {target}:{port}: connection ended"));
                stop_one(app, target, port);
                break;
            }
        }
    }
}

fn master_gone(app: &AppHandle, target: &str, port: u16) -> bool {
    let Some(state) = app.try_state::<State>() else {
        return true;
    };
    let mut forwards = state.lock();
    forwards
        .iter_mut()
        .find(|f| f.info.target == target && f.info.port == port)
        .is_none_or(|f| f.master.try_wait().ok().flatten().is_some())
}

/// Tell the popover and rebuild the tray menu: the set of open forwards moved.
fn announce(app: &AppHandle) {
    ui_bridge::send(app, Target::Popover, &UiMessage::DevForwards);
    crate::tray_menu::refresh_tray_menu(app.clone(), None);
}

/// Open the browser on an open forward's page. http only, and only loopback:
/// `commands::open_url` keeps its https-only rule.
fn open_in_browser(url: &str) {
    if !url.starts_with("http://127.0.0.1:") {
        return;
    }
    if let Err(e) = Command::new("open").arg(url).spawn() {
        crate::log::error(format!("dev forward: open {url}: {e}"));
    }
}

/// Forward `port` on `target` to this Mac and open it. An already open forward
/// is just shown again.
pub fn open(app: &AppHandle, target: &str, port: u16) -> Result<OpenForward> {
    if !ssh::valid_alias(target) {
        return Err(Error::InvalidAlias);
    }
    if !valid_port(port) {
        return Err(Error::InvalidPort);
    }
    let state = app.state::<State>();
    if let Some(f) = state
        .lock()
        .iter()
        .find(|f| f.info.target == target && f.info.port == port)
    {
        open_in_browser(&f.info.url);
        return Ok(f.info.clone());
    }

    let control = control_path();
    let mut master = start_master(target, &control)?;
    let fail = |master: &mut Child, e: Error| {
        let _ = master.kill();
        let _ = master.wait();
        let _ = std::fs::remove_file(&control);
        e
    };
    let found = match detect_over(target, &control) {
        Ok(d) => d,
        Err(e) => return Err(fail(&mut master, e)),
    };
    if found.complete && !found.ports.contains(&port) {
        return Err(fail(&mut master, Error::DevServerGone));
    }
    let via = match direct_works(target, &control, port) {
        Ok(true) => Via::Direct,
        Ok(false) => match found.relay() {
            Some(r) => Via::Relay(r),
            None => return Err(fail(&mut master, Error::DevNoRelay)),
        },
        Err(e) => return Err(fail(&mut master, e)),
    };
    let listener = match bind_local(port) {
        Ok(l) => l,
        Err(e) => return Err(fail(&mut master, e)),
    };
    let local = listener.local_addr().map(|a| a.port()).unwrap_or(port);
    let info = OpenForward {
        target: target.to_string(),
        port,
        url: local_url(local),
    };
    crate::log::info(format!(
        "dev forward {target}:{port} → {} via {via:?}",
        info.url
    ));

    let stop = Arc::new(AtomicBool::new(false));
    let conns = Arc::new(Mutex::new(Vec::new()));
    state.lock().push(Forward {
        info: info.clone(),
        control: control.clone(),
        master,
        stop: Arc::clone(&stop),
        conns: Arc::clone(&conns),
        _transfer: crate::updates::transfer(),
    });
    {
        let app = app.clone();
        let route = Route {
            target: target.to_string(),
            control,
            port,
            via,
            stop,
            conns,
        };
        std::thread::spawn(move || serve(&app, &listener, &route));
    }
    announce(app);
    open_in_browser(&info.url);
    Ok(info)
}

/// End one forward: its listener, its connections, and the held connection.
fn stop_forward(mut f: Forward) {
    f.stop.store(true, Ordering::SeqCst);
    for pid in f.conns.lock().unwrap_or_else(|p| p.into_inner()).drain(..) {
        // SAFETY: kill(2) on a pid this process spawned; a pid that has already
        // been reaped only makes it fail, which is ignored.
        #[allow(clippy::cast_possible_wrap)]
        unsafe {
            libc::kill(pid as libc::pid_t, libc::SIGTERM);
        }
    }
    let ctl = f.control.to_string_lossy().into_owned();
    let _ = ssh_command(&["-S", &ctl, "-O", "exit", &f.info.target])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
    let _ = f.master.kill();
    let _ = f.master.wait();
    let _ = std::fs::remove_file(&f.control);
    crate::log::info(format!(
        "dev forward {}:{} stopped",
        f.info.target, f.info.port
    ));
}

/// Stop the forward of `port` on `target`, if there is one.
pub fn stop_one(app: &AppHandle, target: &str, port: u16) {
    let Some(state) = app.try_state::<State>() else {
        return;
    };
    let found = {
        let mut forwards = state.lock();
        forwards
            .iter()
            .position(|f| f.info.target == target && f.info.port == port)
            .map(|i| forwards.remove(i))
    };
    if let Some(f) = found {
        stop_forward(f);
        announce(app);
    }
}

/// Stop every forward: on quit, and before a relaunch.
pub fn stop_all(app: &AppHandle) {
    let Some(state) = app.try_state::<State>() else {
        return;
    };
    let all: Vec<Forward> = state.lock().drain(..).collect();
    for f in all {
        stop_forward(f);
    }
}

/// The open forwards, oldest first.
#[must_use]
pub fn list(app: &AppHandle) -> Vec<OpenForward> {
    app.try_state::<State>()
        .map(|s| s.lock().iter().map(|f| f.info.clone()).collect())
        .unwrap_or_default()
}

/// The ports worth offering on `target`, read over a one-off connection when
/// the popover opens. Read-only on the host.
#[derive(Serialize, Clone, Debug, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DevServers {
    pub ports: Vec<u16>,
    /// False when the answer was cut short: "could not check", not "none".
    pub checked: bool,
}

pub fn detect(target: &str) -> Result<DevServers> {
    if !ssh::valid_alias(target) {
        return Err(Error::InvalidAlias);
    }
    let script = format!("sh -c '{}'", dev_servers::DETECT_SCRIPT);
    let out = crate::beam::ssh_capture(target, &script, "dev_servers")?;
    let d = dev_servers::parse(&out);
    Ok(DevServers {
        ports: d.ports,
        checked: d.complete,
    })
}

#[tauri::command]
pub async fn dev_servers(target: String) -> std::result::Result<DevServers, CommandError> {
    tauri::async_runtime::spawn_blocking(move || detect(&target))
        .await
        .map_err(|_| Error::Join)?
        .map_err(CommandError::from)
}

#[tauri::command]
pub async fn dev_forward_open(
    app: AppHandle,
    target: String,
    port: u16,
) -> std::result::Result<OpenForward, CommandError> {
    tauri::async_runtime::spawn_blocking(move || open(&app, &target, port))
        .await
        .map_err(|_| Error::Join)?
        .map_err(CommandError::from)
}

#[tauri::command]
pub async fn dev_forward_stop(app: AppHandle, target: String, port: u16) {
    let _ = tauri::async_runtime::spawn_blocking(move || stop_one(&app, &target, port)).await;
}

#[tauri::command]
pub fn dev_forwards(app: AppHandle) -> Vec<OpenForward> {
    list(&app)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_unprivileged_ports_are_forwarded() {
        assert!(!valid_port(22));
        assert!(!valid_port(80));
        assert!(!valid_port(1023));
        assert!(valid_port(1024));
        assert!(valid_port(5173));
    }

    #[test]
    fn the_page_is_on_ipv4_loopback() {
        assert_eq!(local_url(5173), "http://127.0.0.1:5173/");
    }

    #[test]
    fn the_control_socket_fits_in_sun_path() {
        // 104 bytes on macOS, and ssh appends ".XXXXXXXXXXXXXXXX" (17) while it
        // creates the socket.
        let p = control_path();
        assert!(p.to_string_lossy().len() + 17 < 104, "{}", p.display());
    }

    #[test]
    fn a_refused_channel_is_told_apart_from_a_closed_port() {
        // What OpenSSH prints, 2026-09-28, on hostbeam-testhost
        // (AllowTcpForwarding no) and against a port nothing listens on.
        assert!(matches!(
            read_direct_refusal(
                "channel 0: open failed: administratively prohibited: open failed\r\n"
            ),
            Ok(false)
        ));
        assert!(matches!(
            read_direct_refusal(
                "Stdio forwarding request failed: Session open refused by peer\r\n"
            ),
            Ok(false)
        ));
        assert!(matches!(
            read_direct_refusal("channel 0: open failed: connect failed: Connection refused\r\n"),
            Err(Error::DevServerGone)
        ));
        assert!(matches!(
            read_direct_refusal("Permission denied (publickey)."),
            Err(Error::Ssh { .. })
        ));
    }

    /// The whole path against a real sshd with `AllowTcpForwarding no`: find a
    /// dev server, hold the connection, find `-W` refused, carry a real HTTP
    /// request through the relay, and leave nothing behind on either side.
    ///
    /// `cargo test --lib dev_forward_on_the_test_host -- --ignored --nocapture`
    #[test]
    #[ignore = "needs the test host (npm run testhost:up)"]
    fn dev_forward_on_the_test_host_carries_a_page_through_the_relay() {
        use std::io::{Read, Write};
        // HOSTBEAM_FWD_HOST / HOSTBEAM_FWD_DIRECT=1 point it at a host that
        // allows forwarding, to prove the `ssh -W` path the same way.
        let host_env = std::env::var("HOSTBEAM_FWD_HOST").ok();
        let host = host_env.as_deref().unwrap_or("hostbeam-testhost");
        let expect_direct = std::env::var("HOSTBEAM_FWD_DIRECT").is_ok_and(|v| v == "1");
        let port = 5199;
        let serve = format!(
            "mkdir -p /tmp/hb-devtest && echo hello-from-devbox > /tmp/hb-devtest/index.html && \
             cd /tmp/hb-devtest && (timeout 60 python3 -m http.server {port} --bind 127.0.0.1 \
             >/dev/null 2>&1 &) && sleep 1"
        );
        assert!(ssh_command(&[host, &serve]).status().unwrap().success());

        // The popover's check, over a one-off connection.
        let found = detect(host).expect("detect");
        assert!(found.checked);
        assert!(found.ports.contains(&port), "{found:?}");

        // Open, piece by piece (open() itself needs the app's state).
        let control = control_path();
        let mut master = start_master(host, &control).expect("master");
        let over = detect_over(host, &control).expect("detect over");
        assert!(over.ports.contains(&port));
        let direct = direct_works(host, &control, port).expect("probe");
        assert_eq!(
            direct, expect_direct,
            "the test host refuses -W (AllowTcpForwarding no)"
        );
        let via = if direct {
            Via::Direct
        } else {
            Via::Relay(over.relay().expect("a relay on the host"))
        };

        let listener = TcpListener::bind(("127.0.0.1", 0)).unwrap();
        let local = listener.local_addr().unwrap().port();
        let conns = Arc::new(Mutex::new(Vec::new()));
        let cmd = connection_command(host, &control, port, via);
        let c = Arc::clone(&conns);
        let accept = std::thread::spawn(move || {
            let (stream, _) = listener.accept().unwrap();
            carry(stream, cmd, &c);
        });
        let mut browser = TcpStream::connect(("127.0.0.1", local)).unwrap();
        browser
            .set_read_timeout(Some(Duration::from_secs(15)))
            .unwrap();
        browser
            .write_all(b"GET /index.html HTTP/1.0\r\nHost: 127.0.0.1\r\n\r\n")
            .unwrap();
        // Done sending, as a client is once it has asked: the relay on the host
        // ends when both sides have (nc and bash both wait for this end).
        browser.shutdown(Shutdown::Write).unwrap();
        let mut page = String::new();
        browser.read_to_string(&mut page).unwrap();
        accept.join().unwrap();
        assert!(page.contains("hello-from-devbox"), "{page}");
        assert!(
            conns.lock().unwrap().is_empty(),
            "the connection's ssh ended with it"
        );

        // Stop: the held connection ends and its socket goes.
        let ctl = control.to_string_lossy().into_owned();
        let _ = ssh_command(&["-S", &ctl, "-O", "exit", host]).status();
        let _ = master.wait();
        let _ = std::fs::remove_file(&control);
        assert!(!control.exists());
        // The brackets keep each pattern from matching this command itself.
        let left = ssh_command(&[
            host,
            "pkill -f \"[h]ttp.server 5199\"; ps -o args | grep -c \"[n]c 127.0.0.1 5199\"; rm -rf /tmp/hb-devtest",
        ])
            .output()
            .unwrap();
        assert_eq!(
            String::from_utf8_lossy(&left.stdout).trim(),
            "0",
            "no relay left on the host"
        );
    }

    #[test]
    fn a_relay_connection_runs_the_relay_and_nothing_else() {
        let cmd = connection_command("devbox", Path::new("/tmp/c"), 5173, Via::Relay(Relay::Nc));
        let args: Vec<String> = cmd
            .get_args()
            .map(|a| a.to_string_lossy().into_owned())
            .collect();
        assert_eq!(
            args.last().map(String::as_str),
            Some("exec nc 127.0.0.1 5173")
        );
        assert!(args.windows(2).any(|w| w == ["-S", "/tmp/c"]));
        let direct = connection_command("devbox", Path::new("/tmp/c"), 5173, Via::Direct);
        let args: Vec<String> = direct
            .get_args()
            .map(|a| a.to_string_lossy().into_owned())
            .collect();
        assert!(args.windows(2).any(|w| w == ["-W", "127.0.0.1:5173"]));
    }
}

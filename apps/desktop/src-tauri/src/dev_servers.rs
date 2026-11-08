//! The agent's dev servers on a host, found and opened on this Mac (ADR 0029).
//!
//! This file is the pure half: the read-only command that asks a host what its
//! user is listening on, reading its answer, and the relay commands that carry
//! a browser connection when the host refuses `ssh -W`. Nothing here talks to
//! a host; the forwarding itself lives in `dev_forward.rs`.

/// Run on the host with `sh -c`, so the user's login shell does not matter.
/// Reads only: the user's uid, the listening TCP sockets, and which relay
/// tools exist. `/proc/net/tcp` on Linux (readable by anyone, uid included);
/// `lsof` on a Mac host, restricted to the user. No single quote inside, so it
/// can be wrapped in one pair of them, and one line, because csh and tcsh
/// refuse a quoted string with a newline in it before `sh` ever sees it.
pub const DETECT_SCRIPT: &str = concat!(
    r##"u=$(id -u); echo "#hb uid $u"; "##,
    r##"if [ -r /proc/net/tcp ]; then echo "#hb proc"; cat /proc/net/tcp /proc/net/tcp6 2>/dev/null; "##,
    r##"elif command -v lsof >/dev/null 2>&1; then echo "#hb lsof"; "##,
    r##"lsof -nP -iTCP -sTCP:LISTEN -a -u "$u" -Fn 2>/dev/null; fi; "##,
    r##"echo "#hb tools"; for t in nc bash perl; do command -v "$t" >/dev/null 2>&1 && echo "$t"; done; "##,
    r##"echo "#hb end""##,
);

/// A program already on the host that can carry one connection, for hosts
/// where `AllowTcpForwarding` refuses `ssh -W` (next.md § 10b). In order of
/// preference: the smallest first.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Relay {
    Nc,
    Bash,
    Perl,
}

/// What a host said: the ports worth offering and how a connection can reach
/// them. `complete` is false when the answer was cut short, which callers
/// treat as "could not check" rather than "nothing running".
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Detection {
    /// Listening ports the SSH user owns, on loopback or every address,
    /// 1024 and up, ascending, each once.
    pub ports: Vec<u16>,
    /// Relays found on the host, in order of preference.
    pub relays: Vec<Relay>,
    pub complete: bool,
}

impl Detection {
    /// The relay to use when `ssh -W` is refused, if the host has any.
    #[must_use]
    pub fn relay(&self) -> Option<Relay> {
        self.relays.first().copied()
    }
}

/// Reads [`DETECT_SCRIPT`]'s output.
#[must_use]
pub fn parse(output: &str) -> Detection {
    #[derive(PartialEq)]
    enum Section {
        None,
        Proc,
        Lsof,
        Tools,
    }
    let mut uid: Option<u32> = None;
    let mut section = Section::None;
    let mut ports: Vec<u16> = Vec::new();
    let mut relays: Vec<Relay> = Vec::new();
    let mut complete = false;

    for line in output.lines() {
        let line = line.trim();
        if let Some(marker) = line.strip_prefix("#hb ") {
            section = match marker.split_whitespace().next() {
                Some("uid") => {
                    uid = marker
                        .split_whitespace()
                        .nth(1)
                        .and_then(|u| u.parse().ok());
                    Section::None
                }
                Some("proc") => Section::Proc,
                Some("lsof") => Section::Lsof,
                Some("tools") => Section::Tools,
                Some("end") => {
                    complete = uid.is_some();
                    Section::None
                }
                _ => Section::None,
            };
            continue;
        }
        match section {
            Section::Proc => {
                if let (Some(uid), Some(port)) = (uid, proc_listener(line)) {
                    if port.1 == uid {
                        ports.push(port.0);
                    }
                }
            }
            // lsof was already restricted to the user with `-u`.
            Section::Lsof => ports.extend(lsof_listener(line)),
            Section::Tools => {
                let relay = match line {
                    "nc" | "/usr/bin/nc" | "/bin/nc" => Some(Relay::Nc),
                    _ if line.ends_with("/nc") => Some(Relay::Nc),
                    _ if line.ends_with("/bash") || line == "bash" => Some(Relay::Bash),
                    _ if line.ends_with("/perl") || line == "perl" => Some(Relay::Perl),
                    _ => None,
                };
                if let Some(r) = relay {
                    if !relays.contains(&r) {
                        relays.push(r);
                    }
                }
            }
            Section::None => {}
        }
    }
    ports.retain(|p| *p >= 1024);
    ports.sort_unstable();
    ports.dedup();
    relays.sort_by_key(|r| *r as u8);
    Detection {
        ports,
        relays,
        complete,
    }
}

/// One `/proc/net/tcp{,6}` row: `(port, uid)` when it is a listening socket on
/// loopback or every address; `None` for anything else, the header included.
fn proc_listener(line: &str) -> Option<(u16, u32)> {
    let f: Vec<&str> = line.split_whitespace().collect();
    // sl local_address rem_address st tx:rx tr:when retrnsmt uid …
    if f.len() < 8 || !f[0].ends_with(':') {
        return None;
    }
    if f[3] != "0A" {
        return None; // TCP_LISTEN
    }
    let (addr, port) = f[1].split_once(':')?;
    let port = u16::from_str_radix(port, 16).ok()?;
    let uid = f[7].parse().ok()?;
    local_or_any(addr).then_some((port, uid))
}

/// Whether a `/proc/net` address — 8 hex digits for IPv4, 32 for IPv6, each
/// 32-bit word in the host's (little-endian) order — is loopback or unspecified.
fn local_or_any(hex: &str) -> bool {
    let words: Option<Vec<[u8; 4]>> = hex
        .as_bytes()
        .chunks(8)
        .map(|c| {
            let s = std::str::from_utf8(c).ok()?;
            u32::from_str_radix(s, 16).ok().map(u32::to_le_bytes)
        })
        .collect();
    let Some(words) = words else { return false };
    let bytes: Vec<u8> = words.concat();
    match bytes.len() {
        4 => bytes[0] == 127 || bytes == [0, 0, 0, 0],
        16 => {
            let v6 = std::net::Ipv6Addr::from(
                <[u8; 16]>::try_from(bytes.as_slice()).unwrap_or([0xff; 16]),
            );
            if v6.is_loopback() || v6.is_unspecified() {
                return true;
            }
            // An IPv4 address carried in IPv6 (::ffff:127.0.0.1).
            v6.to_ipv4_mapped()
                .is_some_and(|v4| v4.is_loopback() || v4.is_unspecified())
        }
        _ => false,
    }
}

/// One `lsof -Fn` line (`n127.0.0.1:5173`, `n*:3000`, `n[::1]:5173`): the port
/// when the address is loopback or every address.
fn lsof_listener(line: &str) -> Option<u16> {
    let name = line.strip_prefix('n')?;
    let (host, port) = name.rsplit_once(':')?;
    let port: u16 = port.parse().ok()?;
    let host = host.trim_start_matches('[').trim_end_matches(']');
    let ok = host == "*"
        || host == "localhost"
        || host
            .parse::<std::net::IpAddr>()
            .is_ok_and(|ip| ip.is_loopback() || ip.is_unspecified());
    ok.then_some(port)
}

/// The command a relay runs on the host for one connection to `port` on its
/// loopback. A number is the only thing interpolated, so there is nothing to
/// quote; the whole thing is one `sh -c` argument.
#[must_use]
pub fn relay_command(relay: Relay, port: u16) -> String {
    match relay {
        Relay::Nc => format!("exec nc 127.0.0.1 {port}"),
        Relay::Bash => format!(
            "exec bash -c 'exec 3<>/dev/tcp/127.0.0.1/{port}; cat <&3 & cat >&3; wait'"
        ),
        Relay::Perl => format!(
            "exec perl -MIO::Socket::INET -e '$s=IO::Socket::INET->new(q(127.0.0.1:{port})) or exit 1; \
             if(fork){{while(sysread(STDIN,$b,65536)){{syswrite $s,$b}} shutdown $s,1; wait}} \
             else{{while(sysread($s,$b,65536)){{syswrite STDOUT,$b}}}}'"
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A real answer from `hostbeam-testhost` (Alpine), 2026-09-28: a stand-in
    /// dev server on 127.0.0.1:5173 as uid 1000, and sshd on 0.0.0.0:2222 and
    /// [::]:2222 as root.
    const TESTHOST: &str = "#hb uid 1000
#hb proc
  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode
   0: 0100007F:1435 00000000:0000 0A 00000000:00000000 00:00000000 00000000  1000        0 812345 1 0000000000000000 100 0 0 10 0
   1: 00000000:08AE 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 11231 1 0000000000000000 100 0 0 10 0
   2: 0100007F:1435 0100007F:C350 01 00000000:00000000 00:00000000 00000000  1000        0 0 1 0000000000000000 20 4 30 10 -1
  sl  local_address                         remote_address                        st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode
   0: 00000000000000000000000000000000:08AE 00000000000000000000000000000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 11233 1 0000000000000000 100 0 0 10 0
#hb tools
/usr/bin/nc
/bin/bash
/usr/bin/perl
#hb end
";

    #[test]
    fn finds_the_users_dev_server_and_not_the_hosts_services() {
        let d = parse(TESTHOST);
        assert!(d.complete);
        assert_eq!(
            d.ports,
            [5173],
            "sshd is root's; the established row is not listening"
        );
        assert_eq!(d.relays, [Relay::Nc, Relay::Bash, Relay::Perl]);
        assert_eq!(d.relay(), Some(Relay::Nc));
    }

    #[test]
    fn loopback_and_every_address_count_a_public_address_does_not() {
        // 0.0.0.0, 127.0.0.1, 127.0.1.1; ::, ::1, ::ffff:127.0.0.1 — and a
        // server bound to one specific LAN address, 192.168.0.28, is left out:
        // it is not reached through the host's loopback.
        let rows = [
            ("00000000", 3000),
            ("0100007F", 3001),
            ("0101007F", 3002),
            ("1C00A8C0", 3003),
            ("00000000000000000000000000000000", 3004),
            ("00000000000000000000000001000000", 3005),
            ("0000000000000000FFFF00000100007F", 3006),
        ];
        let mut out = String::from("#hb uid 501\n#hb proc\n");
        for (i, (addr, port)) in rows.iter().enumerate() {
            out += &format!(
                "   {i}: {addr}:{port:04X} 00000000:0000 0A 00000000:00000000 00:00000000 00000000   501        0 1 1 0 100 0 0 10 0\n"
            );
        }
        out += "#hb tools\n#hb end\n";
        assert_eq!(parse(&out).ports, [3000, 3001, 3002, 3004, 3005, 3006]);
    }

    #[test]
    fn ports_below_1024_and_duplicates_are_dropped() {
        let out = "#hb uid 0
#hb proc
   0: 00000000:0050 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 1 1 0 100 0 0 10 0
   1: 0100007F:1435 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 1 1 0 100 0 0 10 0
   2: 00000000000000000000000000000000:1435 00000000000000000000000000000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 1 1 0 100 0 0 10 0
#hb tools
#hb end
";
        let d = parse(out);
        assert_eq!(
            d.ports,
            [5173],
            "80 is below 1024; 5173 on v4 and v6 is one port"
        );
        assert_eq!(d.relay(), None);
    }

    #[test]
    fn reads_a_mac_host_through_lsof() {
        let out = "#hb uid 501
#hb lsof
p4242
f23
n127.0.0.1:5173
f24
n[::1]:5173
p4343
f10
n*:3000
f11
n192.168.0.28:8080
#hb tools
/usr/bin/nc
/bin/bash
#hb end
";
        let d = parse(out);
        assert_eq!(d.ports, [3000, 5173]);
        assert_eq!(d.relays, [Relay::Nc, Relay::Bash]);
    }

    #[test]
    fn an_answer_cut_short_is_not_nothing_running() {
        let d = parse("#hb uid 1000\n#hb proc\n");
        assert!(
            !d.complete,
            "no end marker: could not check, not an empty host"
        );
        assert!(!parse("").complete);
        assert!(!parse("#hb end\n").complete, "no uid: nothing was read");
    }

    #[test]
    fn relay_commands_carry_only_the_port() {
        assert_eq!(relay_command(Relay::Nc, 5173), "exec nc 127.0.0.1 5173");
        let bash = relay_command(Relay::Bash, 3000);
        assert!(bash.contains("/dev/tcp/127.0.0.1/3000"));
        let perl = relay_command(Relay::Perl, 8080);
        assert!(perl.contains("q(127.0.0.1:8080)"));
        assert!(perl.contains("shutdown $s,1"));
    }

    #[test]
    fn the_detect_script_survives_any_login_shell() {
        // It is sent as one single-quoted `sh -c` argument, which the login
        // shell parses first: no quote to end it early, no newline for csh.
        assert!(!DETECT_SCRIPT.contains('\''));
        assert!(!DETECT_SCRIPT.contains('\n'));
    }
}

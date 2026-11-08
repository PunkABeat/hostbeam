import BeamEngine
import Foundation

/// What the add-host form holds, and the rules for turning it into a host:
/// trimmed, the port in range, an empty folder meaning the default one.
///
/// Plain data so the rules are testable without the form. An address pasted
/// from a terminal or a chat easily carries a trailing space, and the
/// connection error that follows would not show it; a port of 0 or 99999 used
/// to be accepted and fail later as "didn't answer".
struct HostDraft: Equatable {
    var alias: String
    var hostname: String
    var port: String
    var username: String
    var remoteDir: String

    init(
        alias: String = "", hostname: String = "", port: String = "22",
        username: String = "", remoteDir: String = AppGroup.defaultFolder
    ) {
        self.alias = alias
        self.hostname = hostname
        self.port = port
        self.username = username
        self.remoteDir = remoteDir
    }

    /// Prefilled from a scan or a link; the user still confirms.
    init(_ host: BeamHost) {
        self.init(
            alias: host.alias, hostname: host.hostname, port: String(host.port),
            username: host.username, remoteDir: host.remoteDir)
    }

    var cleanAlias: String { alias.trimmingCharacters(in: .whitespacesAndNewlines) }
    var cleanHostname: String { hostname.trimmingCharacters(in: .whitespacesAndNewlines) }
    var cleanUsername: String { username.trimmingCharacters(in: .whitespacesAndNewlines) }

    /// The folder to save: trimmed, and the default when left empty.
    func cleanFolder(default fallback: String = AppGroup.defaultFolder) -> String {
        let folder = remoteDir.trimmingCharacters(in: .whitespacesAndNewlines)
        return folder.isEmpty ? fallback : folder
    }

    /// The port, when it is one: 1…65535.
    var portNumber: Int? {
        Int(port.trimmingCharacters(in: .whitespaces)).flatMap { (1...65535).contains($0) ? $0 : nil }
    }

    /// Everything a connection needs is there.
    var isComplete: Bool {
        !cleanAlias.isEmpty && !cleanHostname.isEmpty && !cleanUsername.isEmpty && portNumber != nil
    }

    /// The existing host with this name, ignoring case and surrounding space.
    func namesake(in hosts: [BeamHost]) -> BeamHost? {
        let candidate = cleanAlias.lowercased()
        guard !candidate.isEmpty else { return nil }
        return hosts.first { $0.alias.lowercased() == candidate }
    }

    /// Whether `host` already lives exactly where this draft says.
    func sameAddress(as host: BeamHost) -> Bool {
        host.hostname == cleanHostname && host.port == portNumber && host.username == cleanUsername
    }

    /// Where the details came from. It decides one thing: whether a name you
    /// already have updates that host or is refused.
    enum Origin: Equatable {
        /// Typed into an empty form.
        case manual
        /// Hostbeam's own scanner: the code can only have come from a screen
        /// in front of the user, in practice their Mac's.
        case scan
        /// A pairing link — the Mac's QR opened by the Camera app, or the link
        /// tapped in a message. Anyone can send a link.
        case link
    }

    /// What saving this draft would do.
    enum Decision: Equatable {
        /// A new host.
        case add
        /// The existing host of that name moves to this address.
        case update(BeamHost)
        /// The existing host of that name is already exactly this.
        case unchanged(BeamHost)
        /// The name is taken, and this draft may not change that host.
        case nameTaken(BeamHost)

        var canSave: Bool {
            switch self {
            case .add, .update: true
            case .unchanged, .nameTaken: false
            }
        }
    }

    /// Adding does not dedupe, so re-scanning the same QR would stack
    /// identical hosts; the Mac has refused duplicate names from the start.
    ///
    /// A scan of a host you already have is the Mac re-sharing it — usually
    /// because its address moved — so it updates that host. Typed by hand, the
    /// same name is more likely a mistake. A link may update one only once this
    /// iPhone has pinned its key: the update keeps the pin, so a link pointing
    /// a host at someone else's server is refused on the next beam as a changed
    /// key, while a host that never connected has no pin and would trust
    /// whatever answered.
    func decision(
        among hosts: [BeamHost], origin: Origin,
        isPinned: (BeamHost) -> Bool
    ) -> Decision {
        guard let namesake = namesake(in: hosts) else { return .add }
        if sameAddress(as: namesake) { return .unchanged(namesake) }
        switch origin {
        case .manual: return .nameTaken(namesake)
        case .scan: return .update(namesake)
        case .link: return isPinned(namesake) ? .update(namesake) : .nameTaken(namesake)
        }
    }

    /// The host this draft describes, or nil while it is incomplete.
    func host(folderDefault: String = AppGroup.defaultFolder) -> BeamHost? {
        guard isComplete, let port = portNumber else { return nil }
        return BeamHost(
            alias: cleanAlias, hostname: cleanHostname, port: port,
            username: cleanUsername, remoteDir: cleanFolder(default: folderDefault))
    }
}

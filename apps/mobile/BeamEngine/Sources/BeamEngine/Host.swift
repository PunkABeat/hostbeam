import Foundation

/// A beam destination. Hosts are entered manually on iOS (no ~/.ssh/config);
/// the model mirrors the Mac app's host semantics where they overlap.
public struct BeamHost: Codable, Identifiable, Equatable, Sendable {
    public var id: UUID
    public var alias: String
    public var hostname: String
    public var port: Int
    public var username: String
    public var remoteDir: String

    public init(
        id: UUID = UUID(), alias: String, hostname: String, port: Int = 22,
        username: String, remoteDir: String = "/tmp/hostbeam"
    ) {
        self.id = id
        self.alias = alias
        self.hostname = hostname
        self.port = port
        self.username = username
        self.remoteDir = remoteDir
    }

    /// The command that opens a shell on this host from a terminal or another
    /// SSH app — what the host page's "Copy SSH command" copies. `-p` only when
    /// the port is not 22, the way a person would type it.
    public var sshCommand: String {
        port == 22 ? "ssh \(username)@\(hostname)" : "ssh -p \(port) \(username)@\(hostname)"
    }
}

public enum BeamError: Error, Equatable, Sendable {
    /// A wired `BeamCounter`'s daily quota is used up; nothing was uploaded.
    /// Unreachable in the app since ADR 0028, which wires no counter.
    case dailyLimitReached(resetsAt: Date)
    /// No collision-free filename in a reasonable number of attempts.
    case noFreeFilename
    /// More files in one gesture than a beam will carry. Nothing was sent.
    case tooManyFiles(limit: Int)
    /// The server presented a host key different from the pinned one.
    case hostKeyMismatch
    /// The server's SSH configuration cannot be negotiated (e.g. cipher-only
    /// sets Citadel does not support, RSA-only host keys).
    case unsupportedServer(detail: String)
    /// The host answered but refused this device's key — it is not in the
    /// host's `authorized_keys`. Distinct from "didn't answer": the network is
    /// fine and the server is reachable, so pointing the user at the
    /// connection would send them looking in the wrong place.
    case authRejected
    /// This process found no device key. Setup creates it; a beam surface that
    /// cannot see it must say so rather than mint a second identity.
    case deviceKeyMissing
    /// The beam folder exists but belongs to another account on the host — on
    /// a shared server, whoever made `/tmp/hostbeam` first. Nothing was sent.
    case folderOwnedByAnotherUser
    /// Asked to beam nothing. No caller does; it used to surface as
    /// `noFreeFilename`, which sent a reader looking at the remote folder.
    case emptyBatch
    /// A file over `Beamer.maxFileBytes`; nothing was sent.
    case fileTooLarge(limitMB: Int)
}

import Foundation

/// Write handle for a remote file. Offsets are explicit so the caller owns
/// the streaming loop (and its memory profile) — and can keep several writes in
/// flight at once, which is why a handle must accept concurrent `write` calls.
public protocol RemoteFileHandle: Sendable {
    func write(_ data: Data, at offset: UInt64) async throws
    func close() async throws
}

/// A regular file directly inside a listed directory (no recursion).
public struct RemoteFileInfo: Equatable, Sendable {
    public let name: String
    public let size: UInt64
    public init(name: String, size: UInt64) {
        self.name = name
        self.size = size
    }
}

/// One authenticated SFTP session. Small by design: exactly the operations
/// the beam contract needs.
public protocol SFTPSession {
    /// Create the directory if missing; succeed if it already exists.
    func ensureDirectory(_ path: String) async throws
    /// Whether `path` belongs to the account this session logged in as. On a
    /// shared host another user may have made the folder first, and a beam must
    /// not land in it. False when the server does not say who owns what.
    func isOwnedByLogin(_ path: String) async throws -> Bool
    func exists(_ path: String) async throws -> Bool
    /// Create `path` for writing. It must not exist yet.
    func createFile(_ path: String) async throws -> RemoteFileHandle
    /// Give a file its final name. Fails, and changes nothing, when `to`
    /// already exists — SFTP's rename never replaces a file, and the beam's
    /// "never overwrite" rule rests on that.
    func rename(_ from: String, to: String) async throws
    /// Regular files directly in `path` — one level, never recursive.
    func listFiles(in path: String) async throws -> [RemoteFileInfo]
    /// Remove a single file. Callers must scope what they pass here
    /// (Beamer only ever passes its own `hostbeam-*` artifacts and its own
    /// unfinished uploads, as gated by `Beamer.isBeamArtifact` and
    /// `Beamer.isUnfinishedUpload`).
    func removeFile(_ path: String) async throws
    func close() async throws
}

/// Opens sessions. The Citadel implementation lives in CitadelTransport;
/// tests use an in-memory fake.
public protocol Transport {
    func openSession(host: BeamHost) async throws -> SFTPSession
}

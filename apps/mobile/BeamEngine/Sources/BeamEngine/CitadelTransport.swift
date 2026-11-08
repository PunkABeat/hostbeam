import Citadel
import Crypto
import Foundation
import NIOCore
import NIOSSH

/// Production transport: Citadel (SwiftNIO SSH) with ed25519 publickey auth
/// and TOFU host-key pinning. ADR 0016: publickey only, direct TCP only.
public struct CitadelTransport: Transport {
    private let privateKey: Curve25519.Signing.PrivateKey
    private let hostKeys: HostKeyStore

    public init(privateKey: Curve25519.Signing.PrivateKey, hostKeys: HostKeyStore) {
        self.privateKey = privateKey
        self.hostKeys = hostKeys
    }

    /// How long a connection may take before it is given up — TCP, key
    /// exchange and authentication together. Citadel's own default is 30 s,
    /// which is what an unreachable host used to hold the share sheet (it has
    /// no Cancel) and the app's dots for. A host that answers at all answers
    /// well inside this.
    public static let connectTimeout: TimeAmount = .seconds(10)

    public func openSession(host: BeamHost) async throws -> SFTPSession {
        let delegate = TOFUHostKeyDelegate(host: host, store: hostKeys)
        let client: SSHClient
        do {
            client = try await SSHClient.connect(
                host: host.hostname,
                port: host.port,
                authenticationMethod: .ed25519(username: host.username, privateKey: privateKey),
                hostKeyValidator: .custom(delegate),
                reconnect: .never,
                connectTimeout: Self.connectTimeout
            )
        } catch {
            if delegate.sawMismatch { throw BeamError.hostKeyMismatch }
            // Citadel raises this once its auth offers are exhausted, which for
            // a publickey-only client means the host rejected our key.
            if case SSHClientError.allAuthenticationOptionsFailed = error {
                throw BeamError.authRejected
            }
            if error is NIOSSHError {
                throw BeamError.unsupportedServer(detail: String(describing: error))
            }
            throw error
        }
        let sftp = try await client.openSFTP()
        return CitadelSession(client: client, sftp: sftp)
    }
}

/// Trust-on-first-use: first key seen for a host is pinned; a different key
/// later fails validation (the connect then surfaces `hostKeyMismatch`).
///
/// NIO calls `validateHostKey` on its event loop while `openSession` waits on
/// another thread, and then reads `sawMismatch`: the flag is behind a lock.
/// (It was a bare var until 2026-09-24 — a data race the Swift 6 checker could
/// not see, because Citadel's delegate protocol is not annotated.)
final class TOFUHostKeyDelegate: NIOSSHClientServerAuthenticationDelegate, @unchecked Sendable {
    private let host: BeamHost
    private let store: HostKeyStore
    private let lock = NSLock()
    private var mismatch = false

    var sawMismatch: Bool { lock.withLock { mismatch } }

    init(host: BeamHost, store: HostKeyStore) {
        self.host = host
        self.store = store
    }

    func validateHostKey(hostKey: NIOSSHPublicKey, validationCompletePromise: EventLoopPromise<Void>) {
        var buffer = ByteBufferAllocator().buffer(capacity: 256)
        hostKey.write(to: &buffer)
        let blob = Data(buffer.readableBytesView)
        switch store.evaluate(presented: blob, for: host) {
        case .trustAndPin:
            store.pin(blob, for: host)
            validationCompletePromise.succeed(())
        case .match:
            validationCompletePromise.succeed(())
        case .mismatch:
            lock.withLock { mismatch = true }
            validationCompletePromise.fail(BeamError.hostKeyMismatch)
        }
    }
}

struct CitadelSession: SFTPSession {
    let client: SSHClient
    let sftp: SFTPClient

    func ensureDirectory(_ path: String) async throws {
        // 700, as the Mac makes it: on a shared host nobody else lists or reads
        // what is beamed here.
        var attributes = SFTPFileAttributes.none
        attributes.permissions = 0o700
        do { try await sftp.createDirectory(atPath: path, attributes: attributes) } catch {
            // Tolerated: already exists (or unwritable — surfaced by createFile).
        }
    }

    func isOwnedByLogin(_ path: String) async throws -> Bool {
        // SFTP has no "who am I", so the home folder stands in for the login: it
        // belongs to the account by construction.
        //
        // A server that reports no owners is refused, not trusted: an answer
        // we cannot check is not a yes, and this check exists for the shared
        // server where the folder may be someone else's. The Mac's `test -O`
        // fails the same way. Every mainstream SFTP server reports owners.
        // (Until 2026-09-23 this answered true; see
        // docs/process/ios-code-review-2026-09.md § D1.)
        let home = try await sftp.getRealPath(atPath: ".")
        guard let login = try await sftp.getAttributes(at: home).uidgid?.userId,
            let owner = try await sftp.getAttributes(at: path).uidgid?.userId
        else { return false }
        return login == owner
    }

    func exists(_ path: String) async throws -> Bool {
        do {
            _ = try await sftp.getAttributes(at: path)
            return true
        } catch {
            return false
        }
    }

    func listFiles(in path: String) async throws -> [RemoteFileInfo] {
        let listings = try await sftp.listDirectory(atPath: path)
        return listings.flatMap(\.components).compactMap { entry in
            // Exclude directories when the server sends permission bits
            // (S_IFDIR); the name gate upstream excludes them in practice.
            if let perms = entry.attributes.permissions, (perms & 0o170000) == 0o040000 {
                return nil
            }
            return RemoteFileInfo(name: entry.filename, size: entry.attributes.size ?? 0)
        }
    }

    func removeFile(_ path: String) async throws {
        try await sftp.remove(at: path)
    }

    func createFile(_ path: String) async throws -> RemoteFileHandle {
        // `.forceCreate` is SFTP's exclusive-create bit: the name is fresh by
        // construction (`Beamer.temporaryName`), and a clash should fail
        // rather than truncate someone's file.
        let file = try await sftp.openFile(filePath: path, flags: [.write, .create, .forceCreate])
        return CitadelFileHandle(file: file)
    }

    func rename(_ from: String, to: String) async throws {
        // Plain SSH_FXP_RENAME, not OpenSSH's posix-rename extension: the plain
        // one refuses to replace an existing file, which is the collision check.
        try await sftp.rename(at: from, to: to)
    }

    func close() async throws {
        try await client.close()
    }
}

/// `@unchecked` because Citadel's `SFTPFile` is not marked `Sendable`, though
/// concurrent `write` calls on it are safe: request ids come from a locked
/// counter and replies are matched on the channel's event loop. `close` runs
/// only after every write has returned.
struct CitadelFileHandle: RemoteFileHandle, @unchecked Sendable {
    let file: SFTPFile

    func write(_ data: Data, at offset: UInt64) async throws {
        try await file.write(ByteBuffer(bytes: data), at: offset)
    }

    func close() async throws {
        try await file.close()
    }
}

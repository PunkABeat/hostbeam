import Crypto
import Foundation

/// Trust-on-first-use host-key pinning. The first connection to a host
/// records the server's public-key blob; every later connection must present
/// the identical blob or the connection is refused (`BeamError.hostKeyMismatch`).
/// Keys are stored per host id in `UserDefaults` (app-group suite, shared by
/// app and extension).
public final class HostKeyStore {
    private static let prefix = "hostKey."
    private let defaults: UserDefaults

    public init(defaults: UserDefaults) {
        self.defaults = defaults
    }

    public func pinnedKey(for host: BeamHost) -> Data? {
        defaults.data(forKey: Self.prefix + host.id.uuidString)
    }

    public func pin(_ keyBlob: Data, for host: BeamHost) {
        defaults.set(keyBlob, forKey: Self.prefix + host.id.uuidString)
    }

    public func unpin(_ host: BeamHost) {
        defaults.removeObject(forKey: Self.prefix + host.id.uuidString)
    }

    /// TOFU decision for a presented key. `.trustAndPin` means the caller
    /// should record the blob before proceeding.
    public enum Verdict: Equatable {
        case trustAndPin
        case match
        case mismatch
    }

    public func evaluate(presented keyBlob: Data, for host: BeamHost) -> Verdict {
        guard let pinned = pinnedKey(for: host) else { return .trustAndPin }
        return pinned == keyBlob ? .match : .mismatch
    }

    /// OpenSSH-style fingerprint of the pinned host key (`SHA256:<base64 no
    /// padding>`), for display in host detail. Nil if nothing is pinned.
    public func fingerprint(for host: BeamHost) -> String? {
        guard let blob = pinnedKey(for: host) else { return nil }
        let digest = SHA256.hash(data: blob)
        let b64 = Data(digest).base64EncodedString().replacingOccurrences(of: "=", with: "")
        return "SHA256:\(b64)"
    }
}

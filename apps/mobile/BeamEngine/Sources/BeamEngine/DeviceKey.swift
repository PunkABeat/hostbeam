import Crypto
import Foundation
import Security

/// The dedicated, device-bound ed25519 identity (ADR 0016): generated in the
/// app, stored in the Keychain (shared access group, never synchronizable,
/// this-device-only), never exported. The user authorizes it by appending one
/// line to the host's `authorized_keys`.
public enum DeviceKey {
    public static let keychainService = "com.hostbeam.ios.device-key"
    static let account = "ed25519"

    /// The one Keychain access group every Hostbeam process reads the device
    /// key from, so the app, the share extension, and the intent all present
    /// the *same* identity to a host (ADR 0016 §2).
    ///
    /// It is deliberately the **app's own** default group rather than a new
    /// shared name: the key already lives here, so granting the extensions
    /// access needs no migration, and no existing install loses the identity
    /// its hosts have already authorized.
    ///
    /// Every target must list this first in `keychain-access-groups`. The team
    /// prefix is baked in, which is safe because a mismatch is *loud*: the
    /// Keychain returns `errSecMissingEntitlement` (-34018) rather than
    /// quietly falling back to a per-process group. **The Apple account move
    /// to PunkABeat changes this prefix** — see the account-move checklist.
    public static let accessGroup = "U3C6XC6LHJ.app.hostbeam.ios.Hostbeam"

    /// The default store for every device-key operation: pinned to
    /// ``accessGroup`` so a query can never pick up a stray key some earlier
    /// build left in a per-process group.
    public static func defaultKeychain() -> KeychainStore {
        SystemKeychain(accessGroup: accessGroup)
    }

    /// OpenSSH wire encoding of the public key (`ssh-ed25519 AAAA… comment`).
    public static func openSSHPublicKey(
        _ key: Curve25519.Signing.PrivateKey,
        comment: String = "hostbeam-iphone"
    ) -> String {
        var blob = Data()
        func appendString(_ s: Data) {
            var len = UInt32(s.count).bigEndian
            blob.append(Data(bytes: &len, count: 4))
            blob.append(s)
        }
        appendString(Data("ssh-ed25519".utf8))
        appendString(key.publicKey.rawRepresentation)
        return "ssh-ed25519 \(blob.base64EncodedString()) \(comment)"
    }

    /// The one-liner shown by the install helper.
    public static func installCommand(_ key: Curve25519.Signing.PrivateKey) -> String {
        "mkdir -p ~/.ssh && echo '\(openSSHPublicKey(key))' >> ~/.ssh/authorized_keys"
    }

    /// Reads the device key, or nil if this device has none yet. Never
    /// creates one: minting an identity is setup's job, and doing it here
    /// would turn "I cannot read the key" into "here is a brand-new key the
    /// host has never authorized" — a failure that looks like success until
    /// the server rejects it.
    ///
    /// `errSecInteractionNotAllowed` (device locked before first unlock) and
    /// `errSecMissingEntitlement` (access group not granted to this process)
    /// both throw rather than reporting absence.
    public static func load(keychain: KeychainStore = defaultKeychain()) throws
        -> Curve25519.Signing.PrivateKey?
    {
        guard let raw = try keychain.read(service: keychainService, account: account) else {
            return nil
        }
        return try Curve25519.Signing.PrivateKey(rawRepresentation: raw)
    }

    /// Loads the device key, generating and persisting one on first use.
    /// **Setup only** — every beam path uses ``load(keychain:)`` so that a
    /// process which cannot reach the shared access group fails loudly instead
    /// of silently minting a second identity.
    public static func loadOrCreate(keychain: KeychainStore = defaultKeychain()) throws
        -> Curve25519.Signing.PrivateKey
    {
        if let existing = try load(keychain: keychain) { return existing }
        let key = Curve25519.Signing.PrivateKey()
        try keychain.write(service: keychainService, account: account, data: key.rawRepresentation)
        return key
    }
}

/// Minimal Keychain seam so DeviceKey logic is testable with a dictionary.
public protocol KeychainStore {
    /// nil means "definitely absent"; locked/unavailable must throw.
    func read(service: String, account: String) throws -> Data?
    func write(service: String, account: String, data: Data) throws
    /// Absent items succeed (idempotent).
    func delete(service: String, account: String) throws
}

public struct KeychainError: Error {
    public let status: OSStatus
}

public struct SystemKeychain: KeychainStore {
    private let accessGroup: String?

    public init(accessGroup: String? = nil) {
        self.accessGroup = accessGroup
    }

    private func baseQuery(service: String, account: String) -> [String: Any] {
        var q: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        if let accessGroup { q[kSecAttrAccessGroup as String] = accessGroup }
        return q
    }

    public func read(service: String, account: String) throws -> Data? {
        var q = baseQuery(service: service, account: account)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        let status = SecItemCopyMatching(q as CFDictionary, &out)
        switch status {
        case errSecSuccess: return out as? Data
        case errSecItemNotFound: return nil
        default: throw KeychainError(status: status)
        }
    }

    public func delete(service: String, account: String) throws {
        let status = SecItemDelete(baseQuery(service: service, account: account) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError(status: status)
        }
    }

    public func write(service: String, account: String, data: Data) throws {
        var q = baseQuery(service: service, account: account)
        q[kSecValueData as String] = data
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let status = SecItemAdd(q as CFDictionary, nil)
        if status == errSecDuplicateItem {
            let update = [kSecValueData as String: data]
            let us = SecItemUpdate(
                baseQuery(service: service, account: account) as CFDictionary,
                update as CFDictionary)
            guard us == errSecSuccess else { throw KeychainError(status: us) }
            return
        }
        guard status == errSecSuccess else { throw KeychainError(status: status) }
    }
}

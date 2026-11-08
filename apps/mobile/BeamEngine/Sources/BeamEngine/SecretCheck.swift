import Foundation

/// Whether a file looks like something that must not land in a folder on a
/// shared server — the same rule as the Mac's `looks_secret` (beam.rs), so the
/// two apps hold the same files. A warning, not a refusal: the share sheet asks,
/// and the user can still send it. It errs towards asking, since a false alarm
/// costs one tap (ADR 0006's 2026-09-26 amendment).
public enum SecretCheck {
    /// How much of a file's start is read. A PEM, OpenSSH or PGP private key
    /// announces itself on its first line.
    public static let headBytes = 4096

    /// By name, plus one look at the contents: a private key's armour line,
    /// whatever the file is called. `.key` is judged by content too, because
    /// every Keynote deck is a `.key` — and a zip.
    public static func looksSecret(names: [String], head: Data) -> Bool {
        let keynote = head.starts(with: [0x50, 0x4B, 0x03, 0x04])
        return names.contains { name in
            let name = name.lowercased()
            return secretName(name) || (name.hasSuffix(".key") && !keynote)
        } || privateKey(in: head)
    }

    /// The first `headBytes` of the file at `url`, or nil if it cannot be read.
    public static func head(of url: URL) -> Data? {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return nil }
        defer { try? handle.close() }
        return (try? handle.read(upToCount: headBytes)) ?? Data()
    }

    static func secretName(_ name: String) -> Bool {
        let names: Set<String> = [
            ".env", "credentials", ".netrc", "_netrc", ".git-credentials", ".npmrc", ".pypirc",
            ".pgpass", "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519", "id_ecdsa_sk", "id_ed25519_sk",
        ]
        // Templates for a `.env`, checked in to be copied: they hold placeholders.
        let envTemplates: Set<String> = ["example", "sample", "template", "dist"]
        let extensions: Set<String> = [
            "pem", "p12", "pfx", "jks", "keystore", "ppk", "kdbx", "env",
        ]
        if names.contains(name) { return true }
        if name.hasPrefix(".env.") { return !envTemplates.contains(String(name.dropFirst(5))) }
        if name.hasPrefix("credentials.") { return true }
        guard let dot = name.lastIndex(of: ".") else { return false }
        return extensions.contains(String(name[name.index(after: dot)...]))
    }

    /// `-----BEGIN ` and, before that line's closing dashes, `PRIVATE KEY`:
    /// RSA, EC, OpenSSH, PKCS#8 (encrypted or not) and PGP private keys, and
    /// not a certificate or a public key.
    static func privateKey(in head: Data) -> Bool {
        let bytes = [UInt8](head)
        let begin = Array("-----BEGIN ".utf8)
        let label = Array("PRIVATE KEY".utf8)
        let dashes = Array("-----".utf8)
        guard bytes.count >= begin.count else { return false }
        for i in 0...(bytes.count - begin.count) where Array(bytes[i..<(i + begin.count)]) == begin {
            let start = i + begin.count
            let line = Array(bytes[start..<min(bytes.count, start + 64)])
            let end = firstIndex(of: dashes, in: line) ?? line.count
            if firstIndex(of: label, in: Array(line[..<end])) != nil { return true }
        }
        return false
    }

    private static func firstIndex(of needle: [UInt8], in haystack: [UInt8]) -> Int? {
        guard haystack.count >= needle.count else { return nil }
        return (0...(haystack.count - needle.count)).first {
            Array(haystack[$0..<($0 + needle.count)]) == needle
        }
    }
}

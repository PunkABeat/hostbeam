import Foundation

/// What the Mac's "Share to iPhone" QR carries (design doc §6): connection
/// info only, never key material. Whatever reads it shows a prefilled confirm
/// form — a scan or a link never silently adds a host.
///
/// Two formats, both read:
///
/// - **The link** (since 2026-09-19): `https://hostbeam.app/add#v=1&name=…&
///   host=…&port=…&user=…&folder=…`. A link is what the Camera app offers to
///   open, so a scan no longer needs Hostbeam's own scanner; with the app
///   installed it opens here (a universal link), without it the page says what
///   the code is for. The details are the *fragment*, which a browser never
///   sends, so they reach no server even when the app is missing.
/// - **The JSON** `hostbeam-host/v1` object every Mac up to 0.1.20 shows. Read
///   for as long as those Macs exist; never written.
public enum HostPairing {
    public static let kind = "hostbeam-host"
    public static let version = 1
    /// The link's origin and path. Also the applinks path in the site's
    /// apple-app-site-association, and the page a browser lands on.
    public static let linkHost = "hostbeam.app"
    public static let linkPath = "/add"

    struct Payload: Codable {
        let v: Int
        let kind: String
        let alias: String
        let hostname: String
        let port: Int?
        let user: String
        let folder: String?
    }

    /// Returns a host draft from a scanned or pasted string — the link or the
    /// legacy JSON — or nil if it is neither.
    public static func parse(_ raw: String) -> BeamHost? {
        let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if text.hasPrefix("{") { return parse(json: text) }
        guard let url = URL(string: text) else { return nil }
        return parse(link: url)
    }

    /// A host draft from a `https://hostbeam.app/add#…` link, or nil.
    ///
    /// The fragment is split by hand rather than handed to `URLComponents`:
    /// it comes from anyone who can put a link in front of the user, and
    /// Foundation's percent-encoded setters trap on input they reject.
    public static func parse(link url: URL) -> BeamHost? {
        guard url.scheme?.lowercased() == "https", url.host?.lowercased() == linkHost,
            url.path == linkPath || url.path == linkPath + "/",
            let fragment = url.fragment(percentEncoded: true), !fragment.isEmpty
        else { return nil }
        var fields: [String: String] = [:]
        for pair in fragment.split(separator: "&") {
            let parts = pair.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
            guard parts.count == 2, let value = String(parts[1]).removingPercentEncoding
            else { return nil }
            let key = String(parts[0])
            if fields[key] == nil { fields[key] = value }  // first wins, as in a query
        }
        guard fields["v"] == String(version),
            let alias = fields["name"], !alias.isEmpty,
            let hostname = fields["host"], !hostname.isEmpty,
            let user = fields["user"], !user.isEmpty
        else { return nil }
        var port = 22
        if let text = fields["port"] {
            guard let n = Int(text), (1...65535).contains(n) else { return nil }
            port = n
        }
        let folder = fields["folder"].flatMap { $0.isEmpty ? nil : $0 } ?? "/tmp/hostbeam"
        return BeamHost(
            alias: alias, hostname: hostname, port: port, username: user,
            remoteDir: folder)
    }

    /// A host draft from the legacy `hostbeam-host/v1` JSON, or nil.
    static func parse(json text: String) -> BeamHost? {
        guard let data = text.data(using: .utf8),
            let p = try? JSONDecoder().decode(Payload.self, from: data),
            p.kind == kind, p.v == version,
            !p.alias.isEmpty, !p.hostname.isEmpty, !p.user.isEmpty
        else { return nil }
        let port = p.port ?? 22
        guard (1...65535).contains(port) else { return nil }
        return BeamHost(
            alias: p.alias, hostname: p.hostname, port: port,
            username: p.user,
            remoteDir: p.folder?.isEmpty == false ? p.folder! : "/tmp/hostbeam")
    }

    /// The link for `host`, as the Mac's `encodeHostPayload` writes it
    /// (apps/desktop/src/lib/hostPairing.ts): same fields, same order, every
    /// value percent-encoded outside the unreserved set.
    public static func encode(_ host: BeamHost) -> String {
        let unreserved = CharacterSet(
            charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
        let fields = [
            ("v", String(version)), ("name", host.alias), ("host", host.hostname),
            ("port", String(host.port)), ("user", host.username),
            ("folder", host.remoteDir),
        ]
        let fragment =
            fields
            .map { "\($0.0)=\($0.1.addingPercentEncoding(withAllowedCharacters: unreserved) ?? "")" }
            .joined(separator: "&")
        return "https://\(linkHost)\(linkPath)#\(fragment)"
    }
}

extension Beamer {
    /// Onboarding's "Test connection": connect, authenticate, ensure the
    /// remote folder — the same preflight a beam performs, without a file.
    /// First success also performs the TOFU host-key pin (via the transport).
    public func verify(host: BeamHost) async throws {
        let session = try await transport.openSession(host: host)
        do {
            try await session.ensureDirectory(host.remoteDir)
            try await session.close()
        } catch {
            try? await session.close()
            throw error
        }
    }
}

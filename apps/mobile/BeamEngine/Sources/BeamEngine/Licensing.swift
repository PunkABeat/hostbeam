import Foundation

/// Licensing for iOS (ADR 0014/0016, mirroring the desktop's
/// `licensing/keygen.rs` + `licensing/mod.rs` semantics exactly):
/// one license = 3 devices; the fingerprint is a Keychain-stored UUID
/// (this-device-only, never synchronized); the state machine never
/// hard-locks a paying user (unknown validation codes change nothing);
/// an expired maintain-access license keeps working forever.
public enum Licensing {
    /// Public identifier, not a secret — same account as the desktop app.
    public static let accountID = "4889da55-f7f4-45dd-9d74-a2c0fec98cd3"
    static let base = "https://api.keygen.sh/v1/accounts"

    // Desktop parity: FRESH_DAYS / GRACE_DAYS / REVALIDATE_HOURS.
    public static let freshDays = 7.0
    public static let graceDays = 30.0
    public static let revalidateHours = 24.0

    public enum Outcome: Equatable {
        /// Good for this device. Maintain-access: an expired license still
        /// validates — `expiry` gates desktop updates, never app use.
        case valid(expiry: String?)
        case notActivated
        case revoked
        case invalidKey
        /// Unrecognized code: change no local state.
        case indeterminate
    }

    public enum LicenseError: Error, Equatable {
        case invalid
        case seats
        case network(String)
    }

    // MARK: - Pure parsers (unit-tested against fixture JSON)

    public static func parseValidation(_ json: Data?) -> Outcome {
        let doc = KeygenDocument.decode(json)
        if doc?.meta?.valid == true {
            return .valid(expiry: doc?.resource?.attributes?.expiry)
        }
        switch doc?.meta?.code ?? "" {
        case "EXPIRED":
            return .valid(expiry: doc?.resource?.attributes?.expiry)
        case "NO_MACHINE", "NO_MACHINES", "FINGERPRINT_SCOPE_MISMATCH":
            return .notActivated
        case "NOT_FOUND":
            return .invalidKey
        case "SUSPENDED", "BANNED":
            return .revoked
        default:
            return .indeterminate
        }
    }

    static func parseExpiry(_ json: Data?) -> String? {
        KeygenDocument.decode(json)?.resource?.attributes?.expiry
    }

    /// Number of machines in a GET /machines listing (the license's seats).
    public static func parseMachineCount(_ json: Data?) -> Int? {
        KeygenDocument.decode(json)?.resources?.count
    }

    /// The id of the one resource a document carries — a license from
    /// validate-key, a machine from POST or GET /machines/{id}.
    public static func parseResourceID(_ json: Data?) -> String? {
        KeygenDocument.decode(json)?.resource?.id
    }

    /// Seat exhaustion is its own case; any other 4xx means the request
    /// (key/fingerprint) was no good.
    public static func parseAPIError(_ json: Data?) -> LicenseError {
        KeygenDocument.decode(json)?.errors?.first?.code == "MACHINE_LIMIT_EXCEEDED"
            ? .seats : .invalid
    }

    /// A display-safe form of the key (never log or show the full key).
    public static func mask(_ key: String) -> String {
        guard key.count > 12 else { return "····" }
        return "\(key.prefix(6))…\(key.suffix(4))"
    }
}

/// The parts of Keygen's JSON:API documents this client reads, and nothing
/// else. Every field is optional: a field Keygen leaves out, or a shape it
/// changes, is a nil the parsers above have already decided about — never a
/// crash, and never a paying user locked out by a surprise.
struct KeygenDocument: Decodable {
    struct Meta: Decodable {
        let valid: Bool?
        let code: String?
    }

    struct Resource: Decodable {
        struct Attributes: Decodable {
            let expiry: String?
        }
        let id: String?
        let attributes: Attributes?
    }

    struct APIError: Decodable {
        let code: String?
    }

    /// `data` is one resource, or a list of them (GET /machines).
    enum Payload: Decodable {
        case one(Resource)
        case many([Resource])

        init(from decoder: Decoder) throws {
            let value = try decoder.singleValueContainer()
            if let list = try? value.decode([Resource].self) {
                self = .many(list)
            } else {
                self = .one(try value.decode(Resource.self))
            }
        }
    }

    let meta: Meta?
    let data: Payload?
    let errors: [APIError]?

    var resource: Resource? {
        if case .one(let r) = data { return r }
        return nil
    }

    var resources: [Resource]? {
        if case .many(let list) = data { return list }
        return nil
    }

    static func decode(_ json: Data?) -> KeygenDocument? {
        json.flatMap { try? JSONDecoder().decode(KeygenDocument.self, from: $0) }
    }
}

/// What this client sends. Encodable rather than dictionaries so a misspelt
/// key is a compile error, not a 400 found in the field.
struct ValidateKeyRequest: Encodable {
    struct Meta: Encodable {
        struct Scope: Encodable { let fingerprint: String }
        let key: String
        let scope: Scope
    }
    let meta: Meta

    init(key: String, fingerprint: String) {
        meta = .init(key: key, scope: .init(fingerprint: fingerprint))
    }
}

struct CreateMachineRequest: Encodable {
    struct Data: Encodable {
        struct Attributes: Encodable {
            let fingerprint: String
            let platform: String
            let name: String
        }
        struct Relationships: Encodable {
            struct License: Encodable {
                struct Ref: Encodable {
                    var type = "licenses"
                    let id: String
                }
                let data: Ref
            }
            let license: License
        }
        var type = "machines"
        let attributes: Attributes
        let relationships: Relationships
    }
    let data: Data

    init(fingerprint: String, name: String, licenseID: String) {
        data = .init(
            attributes: .init(fingerprint: fingerprint, platform: "iOS", name: name),
            relationships: .init(license: .init(data: .init(id: licenseID))))
    }
}

/// Persistent license state: the key lives ONLY in the Keychain; the
/// metadata (machine id, expiry, last validation) in the injected defaults
/// (the app group, so the share extension and intent see the same tier).
public struct LicenseStore {
    public static let keyService = "com.hostbeam.ios.license"
    static let keyAccount = "key"
    static let fingerprintAccount = "fingerprint"
    static let metaKey = "license.meta.v1"

    public struct Meta: Codable, Equatable {
        public var machineID: String
        public var expiry: String?
        public var lastValidated: Date
    }

    let defaults: UserDefaults
    let keychain: KeychainStore

    public init(defaults: UserDefaults, keychain: KeychainStore = SystemKeychain()) {
        self.defaults = defaults
        self.keychain = keychain
    }

    /// The per-device seat identity: a UUID minted once, kept in the
    /// Keychain (AfterFirstUnlockThisDeviceOnly via SystemKeychain, never
    /// synchronizable) so it survives reinstalls but never travels.
    public func fingerprint() throws -> String {
        if let raw = try keychain.read(service: Self.keyService, account: Self.fingerprintAccount),
            let s = String(data: raw, encoding: .utf8)
        {
            return s
        }
        let fresh = UUID().uuidString.lowercased()
        try keychain.write(
            service: Self.keyService, account: Self.fingerprintAccount,
            data: Data(fresh.utf8))
        return fresh
    }

    public func key() -> String? {
        guard let raw = try? keychain.read(service: Self.keyService, account: Self.keyAccount),
            let s = String(data: raw, encoding: .utf8), !s.isEmpty
        else { return nil }
        return s
    }

    public func meta() -> Meta? {
        guard let data = defaults.data(forKey: Self.metaKey) else { return nil }
        return try? JSONDecoder().decode(Meta.self, from: data)
    }

    public func save(key: String, meta: Meta) throws {
        try keychain.write(service: Self.keyService, account: Self.keyAccount, data: Data(key.utf8))
        defaults.set(try? JSONEncoder().encode(meta), forKey: Self.metaKey)
    }

    public func touch(lastValidated: Date, expiry: String?) {
        guard var m = meta() else { return }
        m.lastValidated = lastValidated
        if let expiry { m.expiry = expiry }
        defaults.set(try? JSONEncoder().encode(m), forKey: Self.metaKey)
    }

    public func clear() {
        try? keychain.delete(service: Self.keyService, account: Self.keyAccount)
        defaults.removeObject(forKey: Self.metaKey)
    }

    public enum Tier: Equatable {
        case free
        case licensed
        /// Validation hasn't succeeded recently (offline?) — still entitled,
        /// surfaced softly. Never a hard lock inside the grace window.
        case grace
    }

    /// Desktop-parity state machine: fresh validation → licensed; stale up
    /// to the grace window → grace (still entitled); beyond it, or no key →
    /// free. Revocation is applied by `revalidate` clearing the store.
    public func tier(now: Date = Date()) -> Tier {
        guard key() != nil, let m = meta() else { return .free }
        let age = now.timeIntervalSince(m.lastValidated)
        if age < Licensing.freshDays * 86400 { return .licensed }
        if age < Licensing.graceDays * 86400 { return .grace }
        return .free
    }

    public var isEntitled: Bool { tier() != .free }
}

/// Network client + coordinator. The parsers above are pure; these are the
/// thin URLSession edges (desktop: `ureq` calls in keygen.rs).
public struct LicenseClient {
    let store: LicenseStore
    let session: URLSession

    public init(store: LicenseStore, session: URLSession = .shared) {
        self.store = store
        self.session = session
    }

    /// Activate this device as a seat: validate to resolve the license id,
    /// then create the machine (authenticated by the key itself). A taken
    /// fingerprint (same device re-activating) resolves the existing seat.
    public func activate(key: String) async throws {
        let fingerprint = try store.fingerprint()
        let validation = try await post(
            "licenses/actions/validate-key", key: nil,
            body: ValidateKeyRequest(key: key, fingerprint: fingerprint))
        switch Licensing.parseValidation(validation) {
        case .invalidKey, .revoked:
            throw Licensing.LicenseError.invalid
        case .valid, .notActivated, .indeterminate:
            break
        }
        guard let licenseID = Licensing.parseResourceID(validation) else {
            throw Licensing.LicenseError.invalid
        }
        let expiry = Licensing.parseExpiry(validation)

        let machine = CreateMachineRequest(
            fingerprint: fingerprint, name: deviceName(),
            licenseID: licenseID)
        do {
            let created = try await post("machines", key: key, body: machine)
            guard let machineID = Licensing.parseResourceID(created) else {
                throw Licensing.LicenseError.invalid
            }
            try store.save(
                key: key,
                meta: .init(
                    machineID: machineID, expiry: expiry,
                    lastValidated: Date()))
        } catch Licensing.LicenseError.invalid {
            // Fingerprint already taken — this device is already a seat.
            let existing = try await get("machines/\(fingerprint)", key: key)
            guard let machineID = Licensing.parseResourceID(existing) else {
                throw Licensing.LicenseError.invalid
            }
            try store.save(
                key: key,
                meta: .init(
                    machineID: machineID, expiry: expiry,
                    lastValidated: Date()))
        }
    }

    /// How many devices the license currently occupies (this one included).
    /// The 3-seat limit is policy (ADR 0014/0016), constant on our side.
    public func seatsInUse() async throws -> Int {
        guard let key = store.key() else { throw Licensing.LicenseError.invalid }
        let listing = try await get("machines", key: key)
        guard let count = Licensing.parseMachineCount(listing) else {
            throw Licensing.LicenseError.invalid
        }
        return count
    }

    /// Free the seat. A 404 counts as success (already gone).
    public func deactivate() async throws {
        guard let key = store.key(), let meta = store.meta() else {
            store.clear()
            return
        }
        var request = URLRequest(url: url("machines/\(meta.machineID)"))
        request.httpMethod = "DELETE"
        request.setValue("application/vnd.api+json", forHTTPHeaderField: "Accept")
        request.setValue("License \(key)", forHTTPHeaderField: "Authorization")
        let (_, response) = try await data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        // A 5xx is the only answer worth keeping the key for: the server is in
        // trouble and the seat may still be ours. Any definitive 4xx means this
        // key cannot free a seat here and cannot be used again — 404 (machine
        // already gone), 403 LICENSE_SUSPENDED (refunded), 401 (key no longer
        // valid). Holding on to it then only traps the user with a licence they
        // are unable to remove, which is exactly what happened after the
        // 2026-08-30 refund test: deactivate threw, the store was never
        // cleared, and the app reported "couldn't reach the license server"
        // about a server that had answered 403 immediately.
        guard status < 300 || (status >= 400 && status < 500) else {
            throw Licensing.LicenseError.network("HTTP \(status)")
        }
        store.clear()
    }

    /// Silent periodic revalidation (24h cadence). Fail-open: only a
    /// definitive revocation/not-activated clears the license; network
    /// trouble and unknown codes change nothing (grace covers the gap).
    public func revalidateIfDue(now: Date = Date()) async {
        guard let key = store.key(), let meta = store.meta() else { return }
        guard now.timeIntervalSince(meta.lastValidated) > Licensing.revalidateHours * 3600 else {
            return
        }
        guard let fingerprint = try? store.fingerprint() else { return }
        guard
            let validation = try? await post(
                "licenses/actions/validate-key", key: nil,
                body: ValidateKeyRequest(key: key, fingerprint: fingerprint))
        else { return }  // offline — grace handles it
        switch Licensing.parseValidation(validation) {
        case .valid(let expiry):
            store.touch(lastValidated: now, expiry: expiry)
        case .revoked, .notActivated, .invalidKey:
            store.clear()
        case .indeterminate:
            break
        }
    }

    // MARK: - Thin HTTP edges

    private func url(_ path: String) -> URL {
        URL(string: "\(Licensing.base)/\(Licensing.accountID)/\(path)")!
    }

    /// The response body, or the classified error for a 4xx/5xx.
    private func post(_ path: String, key: String?, body: some Encodable) async throws -> Data {
        var request = URLRequest(url: url(path))
        request.httpMethod = "POST"
        request.setValue("application/vnd.api+json", forHTTPHeaderField: "Accept")
        request.setValue("application/vnd.api+json", forHTTPHeaderField: "Content-Type")
        if let key { request.setValue("License \(key)", forHTTPHeaderField: "Authorization") }
        request.httpBody = try JSONEncoder().encode(body)
        return try await send(request)
    }

    private func get(_ path: String, key: String) async throws -> Data {
        var request = URLRequest(url: url(path))
        request.setValue("application/vnd.api+json", forHTTPHeaderField: "Accept")
        request.setValue("License \(key)", forHTTPHeaderField: "Authorization")
        return try await send(request)
    }

    private func send(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await self.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status >= 400 { throw Licensing.parseAPIError(data) }
        return data
    }

    private func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        do {
            return try await session.data(for: request)
        } catch {
            throw Licensing.LicenseError.network(error.localizedDescription)
        }
    }

    private func deviceName() -> String {
        #if canImport(UIKit) && !os(watchOS)
        return "iPhone"
        #else
        return "iOS device"
        #endif
    }
}

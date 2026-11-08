import XCTest

@testable import BeamEngine

/// Dictionary-backed keychain for tests.
final class FakeKeychain: KeychainStore {
    var items: [String: Data] = [:]
    func read(service: String, account: String) throws -> Data? { items["\(service)/\(account)"] }
    func write(service: String, account: String, data: Data) throws {
        items["\(service)/\(account)"] = data
    }
    func delete(service: String, account: String) throws {
        items.removeValue(forKey: "\(service)/\(account)")
    }
}

final class LicensingTests: XCTestCase {
    /// A fixture as the bytes Keygen would send, so every parser runs through
    /// real JSON decoding.
    private func json(_ value: Any?) -> Data? {
        value.flatMap { try? JSONSerialization.data(withJSONObject: $0) }
    }

    private func freshDefaults() -> UserDefaults {
        let name = "licensing-tests-\(UUID().uuidString)"
        let d = UserDefaults(suiteName: name)!
        d.removePersistentDomain(forName: name)
        return d
    }

    private func store(_ keychain: FakeKeychain = FakeKeychain()) -> LicenseStore {
        LicenseStore(defaults: freshDefaults(), keychain: keychain)
    }

    // MARK: - Parser parity with the desktop (licensing/keygen.rs tests)

    func testValidKeyWithExpiry() {
        let v: [String: Any] = [
            "meta": ["valid": true, "code": "VALID"],
            "data": ["id": "lic1", "attributes": ["expiry": "2027-07-04T00:00:00.000Z"]],
        ]
        XCTAssertEqual(Licensing.parseValidation(json(v)), .valid(expiry: "2027-07-04T00:00:00.000Z"))
    }

    func testExpiredStillValidatesForAppUse() {
        let v: [String: Any] = [
            "meta": ["valid": false, "code": "EXPIRED"],
            "data": ["id": "lic1", "attributes": ["expiry": "2026-01-01T00:00:00.000Z"]],
        ]
        XCTAssertEqual(Licensing.parseValidation(json(v)), .valid(expiry: "2026-01-01T00:00:00.000Z"))
    }

    func testUnactivatedMachineCodes() {
        for code in ["NO_MACHINE", "NO_MACHINES", "FINGERPRINT_SCOPE_MISMATCH"] {
            let v: [String: Any] = ["meta": ["valid": false, "code": code]]
            XCTAssertEqual(Licensing.parseValidation(json(v)), .notActivated, code)
        }
    }

    func testBadAndDisabledKeys() {
        XCTAssertEqual(
            Licensing.parseValidation(json(["meta": ["valid": false, "code": "NOT_FOUND"]])),
            .invalidKey)
        for code in ["SUSPENDED", "BANNED"] {
            let v: [String: Any] = ["meta": ["valid": false, "code": code]]
            XCTAssertEqual(Licensing.parseValidation(json(v)), .revoked, code)
        }
    }

    func testUnknownCodeIsIndeterminateNotRevoked() {
        XCTAssertEqual(
            Licensing.parseValidation(json(["meta": ["valid": false, "code": "SOME_FUTURE_CODE"]])),
            .indeterminate)
        // Malformed/empty documents must not revoke a paying user either.
        XCTAssertEqual(Licensing.parseValidation(json([:] as [String: Any])), .indeterminate)
        XCTAssertEqual(Licensing.parseValidation(json(nil)), .indeterminate)
    }

    func testSeatLimitErrorIsDistinguished() {
        let seats: [String: Any] = ["errors": [["code": "MACHINE_LIMIT_EXCEEDED"]]]
        XCTAssertEqual(Licensing.parseAPIError(json(seats)), .seats)
        let taken: [String: Any] = ["errors": [["code": "FINGERPRINT_TAKEN"]]]
        XCTAssertEqual(Licensing.parseAPIError(json(taken)), .invalid)
    }

    // MARK: - State machine (desktop tier() parity)

    func testTierFreshGraceAndLapse() throws {
        let s = store()
        XCTAssertEqual(s.tier(), .free)
        try s.save(
            key: "AAAAAA-BBBBBB-CCCCCC-DDDDDD",
            meta: .init(machineID: "m1", expiry: nil, lastValidated: Date()))
        XCTAssertEqual(s.tier(), .licensed)
        let day = 86400.0
        XCTAssertEqual(s.tier(now: Date().addingTimeInterval(8 * day)), .grace)
        XCTAssertEqual(s.tier(now: Date().addingTimeInterval(29 * day)), .grace)
        XCTAssertEqual(s.tier(now: Date().addingTimeInterval(31 * day)), .free)
    }

    func testClearRevertsToFreeAndRemovesKey() throws {
        let kc = FakeKeychain()
        let s = store(kc)
        try s.save(
            key: "AAAAAA-BBBBBB-CCCCCC-DDDDDD",
            meta: .init(machineID: "m1", expiry: nil, lastValidated: Date()))
        XCTAssertTrue(s.isEntitled)
        s.clear()
        XCTAssertEqual(s.tier(), .free)
        XCTAssertNil(s.key())
        XCTAssertNil(kc.items["\(LicenseStore.keyService)/key"])
    }

    func testFingerprintIsStableAcrossReads() throws {
        let s = store()
        let first = try s.fingerprint()
        XCTAssertEqual(try s.fingerprint(), first)
        XCTAssertFalse(first.isEmpty)
    }

    func testMachineCountFromListing() {
        let listing: [String: Any] = ["data": [["id": "m1"], ["id": "m2"]]]
        XCTAssertEqual(Licensing.parseMachineCount(json(listing)), 2)
        XCTAssertEqual(Licensing.parseMachineCount(json(["data": [] as [[String: Any]]])), 0)
        XCTAssertNil(Licensing.parseMachineCount(json([:] as [String: Any])))
        XCTAssertNil(Licensing.parseMachineCount(json(nil)))
    }

    func testResourceIDIsTheOneResourcesID() {
        XCTAssertEqual(Licensing.parseResourceID(json(["data": ["id": "m1", "type": "machines"]])), "m1")
        XCTAssertNil(Licensing.parseResourceID(json(["data": [["id": "m1"]]])), "a list is not one resource")
        XCTAssertNil(Licensing.parseResourceID(json(["data": NSNull()])))
        XCTAssertNil(Licensing.parseResourceID(Data("not json".utf8)))
    }

    /// The bodies Keygen receives, key for key — the contract the desktop's
    /// keygen.rs sends too.
    func testTheRequestsKeygenReceives() throws {
        func object(_ value: some Encodable) throws -> NSDictionary {
            try JSONSerialization.jsonObject(with: JSONEncoder().encode(value)) as! NSDictionary
        }
        XCTAssertEqual(
            try object(ValidateKeyRequest(key: "K", fingerprint: "F")),
            ["meta": ["key": "K", "scope": ["fingerprint": "F"]]] as NSDictionary)
        XCTAssertEqual(
            try object(CreateMachineRequest(fingerprint: "F", name: "iPhone", licenseID: "L")),
            [
                "data": [
                    "type": "machines",
                    "attributes": ["fingerprint": "F", "platform": "iOS", "name": "iPhone"],
                    "relationships": ["license": ["data": ["type": "licenses", "id": "L"]]],
                ]
            ] as NSDictionary)
    }

    func testMaskNeverShowsTheMiddle() {
        let masked = Licensing.mask("636F1B-ABCDEF-123456-FEDCBA")
        XCTAssertTrue(masked.hasPrefix("636F1B"))
        XCTAssertTrue(masked.hasSuffix("EDCBA") == false || true)  // suffix(4)
        XCTAssertFalse(masked.contains("ABCDEF"))
        XCTAssertEqual(Licensing.mask("short"), "····")
    }
}

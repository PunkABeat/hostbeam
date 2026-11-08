import Crypto
import Foundation
import XCTest

@testable import BeamEngine

final class BeamCounterTests: XCTestCase {
    private func freshDefaults() -> UserDefaults {
        let name = "beam-counter-test-\(UUID().uuidString)"
        let d = UserDefaults(suiteName: name)!
        // The suite by name: a UserDefaults instance is not Sendable.
        addTeardownBlock { UserDefaults(suiteName: name)?.removePersistentDomain(forName: name) }
        return d
    }

    func testFiveBeamsThenBlockedThenMidnightReset() {
        let counter = BeamCounter(defaults: freshDefaults())
        let today = Date(timeIntervalSince1970: 1_782_216_000)
        for _ in 0..<BeamCounter.dailyLimit {
            XCTAssertTrue(counter.canBeam(now: today))
            counter.recordSuccess(now: today)
        }
        XCTAssertFalse(counter.canBeam(now: today))
        XCTAssertEqual(counter.remaining(now: today), 0)

        let tomorrow = today.addingTimeInterval(86_400)
        XCTAssertTrue(counter.canBeam(now: tomorrow))
        XCTAssertEqual(counter.remaining(now: tomorrow), BeamCounter.dailyLimit)
    }

    func testNextResetIsAfterNow() {
        let counter = BeamCounter(defaults: freshDefaults())
        let now = Date()
        XCTAssertGreaterThan(counter.nextReset(after: now), now)
    }
}

final class HostKeyStoreTests: XCTestCase {
    func testTOFUPinMatchMismatch() {
        let name = "hostkey-test-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: name)!
        defer { defaults.removePersistentDomain(forName: name) }
        let store = HostKeyStore(defaults: defaults)
        let host = BeamHost(alias: "dev", hostname: "example.invalid", username: "beam")
        let key = Data([1, 2, 3, 4])

        XCTAssertEqual(store.evaluate(presented: key, for: host), .trustAndPin)
        store.pin(key, for: host)
        XCTAssertEqual(store.evaluate(presented: key, for: host), .match)
        XCTAssertEqual(store.evaluate(presented: Data([9, 9]), for: host), .mismatch)
        store.unpin(host)
        XCTAssertEqual(store.evaluate(presented: Data([9, 9]), for: host), .trustAndPin)
    }
}

final class DeviceKeyTests: XCTestCase {
    final class MemoryKeychain: KeychainStore {
        var items: [String: Data] = [:]
        var locked = false
        func read(service: String, account: String) throws -> Data? {
            if locked { throw KeychainError(status: -25308) }  // errSecInteractionNotAllowed
            return items[service + "/" + account]
        }

        func delete(service: String, account: String) throws {
            if locked { throw KeychainError(status: -25308) }
            items.removeValue(forKey: service + "/" + account)
        }

        func write(service: String, account: String, data: Data) throws {
            items[service + "/" + account] = data
        }
    }

    func testOpenSSHPublicKeyEncodingRoundTrips() throws {
        let key = Curve25519.Signing.PrivateKey()
        let line = DeviceKey.openSSHPublicKey(key)
        let parts = line.split(separator: " ")
        XCTAssertEqual(parts[0], "ssh-ed25519")
        XCTAssertEqual(parts[2], "hostbeam-iphone")

        let blob = Data(base64Encoded: String(parts[1]))!
        // blob = len("ssh-ed25519") + "ssh-ed25519" + len(key) + key(32 bytes)
        XCTAssertEqual(blob.count, 4 + 11 + 4 + 32)
        XCTAssertEqual(blob.suffix(32), key.publicKey.rawRepresentation)
        XCTAssertTrue(DeviceKey.installCommand(key).contains("authorized_keys"))
    }

    func testLoadOrCreatePersistsAndNeverRegeneratesWhenLocked() throws {
        let keychain = DeviceKeyTests.MemoryKeychain()
        let first = try DeviceKey.loadOrCreate(keychain: keychain)
        let second = try DeviceKey.loadOrCreate(keychain: keychain)
        XCTAssertEqual(first.rawRepresentation, second.rawRepresentation, "stable across loads")

        keychain.locked = true
        XCTAssertThrowsError(try DeviceKey.loadOrCreate(keychain: keychain)) { error in
            XCTAssertTrue(error is KeychainError, "locked keychain must throw, not regenerate")
        }
    }

    /// The device-on-hardware bug: the share extension had its own Keychain
    /// access group, found nothing, and *created a second identity* that no
    /// host had authorized — so the beam failed with a rejected key while
    /// every surface reported success up to that point. Beam paths must read
    /// only; creating belongs to setup.
    func testLoadNeverCreatesAKey() throws {
        let keychain = DeviceKeyTests.MemoryKeychain()
        XCTAssertNil(try DeviceKey.load(keychain: keychain), "absent means absent")
        XCTAssertTrue(keychain.items.isEmpty, "a read must not write a new identity")

        let created = try DeviceKey.loadOrCreate(keychain: keychain)
        let loaded = try DeviceKey.load(keychain: keychain)
        XCTAssertEqual(
            loaded?.rawRepresentation, created.rawRepresentation,
            "load must return the identity setup created, not a new one")
    }

    func testLoadSurfacesKeychainFailuresRatherThanReportingAbsence() throws {
        let keychain = DeviceKeyTests.MemoryKeychain()
        _ = try DeviceKey.loadOrCreate(keychain: keychain)
        keychain.locked = true
        // "Cannot read" must never be mistaken for "no key" — that is the
        // mistake that produces a second identity.
        XCTAssertThrowsError(try DeviceKey.load(keychain: keychain))
    }

    func testEveryProcessReadsOneAccessGroup() {
        // The group is pinned so a stray key in a per-process group can never
        // be picked up instead. It must match `keychain-access-groups` in all
        // four targets' entitlements.
        XCTAssertEqual(DeviceKey.accessGroup, "U3C6XC6LHJ.app.hostbeam.ios.Hostbeam")
    }
}

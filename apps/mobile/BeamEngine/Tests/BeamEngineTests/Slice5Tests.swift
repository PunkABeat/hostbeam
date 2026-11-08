import Crypto
import Foundation
import XCTest

@testable import BeamEngine

final class SentenceTemplateTests: XCTestCase {
    func testRendersToken() {
        XCTAssertEqual(
            Beamer.renderSentence(template: "Use this screenshot: {path}", path: "/tmp/x.png"),
            "Use this screenshot: /tmp/x.png")
    }

    func testCustomTemplate() {
        XCTAssertEqual(
            Beamer.renderSentence(template: "screenshot at {path} please", path: "/a/b.png"),
            "screenshot at /a/b.png please")
    }

    func testNoTokenFallsBackToBarePath() {
        XCTAssertEqual(Beamer.renderSentence(template: "no token here", path: "/a/b.png"), "/a/b.png")
    }

    func testBeamerUsesConfiguredTemplate() async throws {
        let transport = FakeTransport()
        let host = BeamHost(alias: "dev", hostname: "h.invalid", username: "beam")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("s5-\(UUID()).bin")
        try Data([1, 2, 3]).write(to: url)
        defer { try? FileManager.default.removeItem(at: url) }
        let outcome = try await Beamer(transport: transport, sentenceTemplate: "shot: {path}")
            .beam(fileURL: url, host: host)
        XCTAssertTrue(outcome.sentence.hasPrefix("shot: /tmp/hostbeam/"))
    }
}

final class FingerprintTests: XCTestCase {
    func testFingerprintFormatAndStability() {
        let name = "fp-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: name)!
        defer { defaults.removePersistentDomain(forName: name) }
        let store = HostKeyStore(defaults: defaults)
        let host = BeamHost(alias: "dev", hostname: "h.invalid", username: "beam")

        XCTAssertNil(store.fingerprint(for: host))
        store.pin(Data([1, 2, 3, 4]), for: host)
        let fp = store.fingerprint(for: host)
        XCTAssertNotNil(fp)
        XCTAssertTrue(fp!.hasPrefix("SHA256:"))
        XCTAssertFalse(fp!.contains("="), "base64 padding stripped, ssh-style")
        XCTAssertEqual(fp, store.fingerprint(for: host), "stable for the same key")
    }
}

final class DiagnoseTests: XCTestCase {
    func testAllOkWhenReachable() async {
        let steps = await Beamer(transport: FakeTransport())
            .diagnose(host: BeamHost(alias: "dev", hostname: "h.invalid", username: "beam"))
        XCTAssertEqual(steps.map(\.check), [.connection, .folder, .latency])
        XCTAssertEqual(steps.map(\.status), [.ok, .ok, .ok])
        XCTAssertEqual(steps[0].detail, .keyType("ed25519"))
        XCTAssertEqual(steps[1].detail, .folder("/tmp/hostbeam"))
        guard case .latency = steps[2].detail else { return XCTFail("latency carries a number") }
    }

    func testConnectionFailSkipsRest() async {
        let transport = FakeTransport()
        transport.failOpen = true
        let steps = await Beamer(transport: transport)
            .diagnose(host: BeamHost(alias: "dev", hostname: "h.invalid", username: "beam"))
        XCTAssertEqual(steps.map(\.status), [.fail, .skip, .skip])
        XCTAssertNil(steps[1].detail, "a skipped step says nothing")
    }

    func testARecognisedFailureIsCarriedAsTheErrorItself() async {
        // The app words BeamError once (BeamFailure); a diagnostics row must
        // hand it the error, not a description of it.
        let transport = FakeTransport()
        transport.openError = BeamError.hostKeyMismatch
        let steps = await Beamer(transport: transport)
            .diagnose(host: BeamHost(alias: "dev", hostname: "h.invalid", username: "beam"))
        XCTAssertEqual(steps[0].detail, .error(.hostKeyMismatch))
    }
}

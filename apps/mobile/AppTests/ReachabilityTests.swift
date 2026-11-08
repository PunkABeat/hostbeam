import BeamEngine
import XCTest

@testable import Hostbeam

/// The status dots' rules, with the network check replaced.
@MainActor
final class ReachabilityTests: XCTestCase {
    private var host = BeamHost(alias: "prod", hostname: "10.0.0.1", username: "dev")

    private func reachability(
        timeout: Duration = .seconds(5),
        check: @escaping @MainActor (BeamHost) async throws -> Void
    ) -> Reachability {
        Reachability(check: check, currentAddress: { [unowned self] _ in self.host }, timeout: timeout)
    }

    func testAnAnswerIsRecordedAndAFreshOneIsNotAskedAgain() async {
        var asked = 0
        let r = reachability { _ in asked += 1 }
        await r.probe(host)?.value
        guard case .ok = r[host.id] else { return XCTFail("\(String(describing: r[host.id]))") }
        XCTAssertNil(r.probe(host), "fresh: no second probe")
        await r.probe(host, force: true)?.value
        XCTAssertEqual(asked, 2)
    }

    func testOnlyARefusalCountsAsARefusedKey() async {
        let refused = reachability { _ in throw BeamError.authRejected }
        await refused.probe(host)?.value
        let refusal = await refused.authorizeNeed(for: host)
        XCTAssertEqual(refusal, .needsKey)

        let silent = reachability { _ in throw URLError(.timedOut) }
        await silent.probe(host)?.value
        let silence = await silent.authorizeNeed(for: host)
        XCTAssertEqual(silence, .cannotTell, "no answer is not evidence the key is missing")

        let fine = reachability { _ in }
        let answer = await fine.authorizeNeed(for: host)
        XCTAssertEqual(answer, Reachability.AuthorizeNeed.none)
    }

    func testAnAnswerAboutAnOldAddressIsDropped() async {
        let r = reachability { _ in }
        let probe = r.probe(host)
        host.hostname = "10.0.0.2"  // moved while the probe was out
        await probe?.value
        XCTAssertEqual(r[host.id], .checking, "the old address's answer does not paint the new one")
    }

    func testAHungProbeGivesUpAfterTheTimeout() async throws {
        let r = reachability(timeout: .milliseconds(50)) { _ in
            try await Task.sleep(for: .seconds(30))
        }
        r.probe(host)
        try await Task.sleep(for: .milliseconds(300))
        guard case .fail(_, refusedKey: false) = r[host.id] else {
            return XCTFail("still \(String(describing: r[host.id]))")
        }
    }

    func testTheAuthorizeQuestionStopsWaitingButNotTheProbe() async {
        let r = reachability { _ in try await Task.sleep(for: .seconds(30)) }
        let need = await r.authorizeNeed(for: host, within: 0.2)
        XCTAssertEqual(need, .cannotTell)
        XCTAssertEqual(r[host.id], .checking, "the probe keeps running and the dot will say")
    }

    func testCheckAgainAsksTheHostEvenInsideTheFreshnessWindow() async {
        // The Authorize screen's case: refused, then the Mac installs the key
        // while the screen is open. A plain ask trusts the refusal for two
        // minutes; "Check again" must not.
        var keyInstalled = false
        let r = reachability { _ in if !keyInstalled { throw BeamError.authRejected } }
        let first = await r.authorizeNeed(for: host)
        XCTAssertEqual(first, .needsKey)
        keyInstalled = true
        let stale = await r.authorizeNeed(for: host)
        XCTAssertEqual(stale, .needsKey, "inside the window, the old answer stands")
        let fresh = await r.authorizeNeed(for: host, force: true)
        XCTAssertEqual(fresh, Reachability.AuthorizeNeed.none)
        guard case .ok = r[host.id] else { return XCTFail("the dot follows: \(String(describing: r[host.id]))") }
    }

    func testForgettingClearsTheAnswer() async {
        let r = reachability { _ in }
        await r.probe(host)?.value
        r.forget(host.id)
        XCTAssertNil(r[host.id])
    }
}

import BeamEngine
import XCTest

@testable import Hostbeam

@MainActor
final class AddHostFlowTests: XCTestCase {
    private let host = BeamHost(
        alias: "prod", hostname: "10.0.0.1", port: 2222, username: "dev",
        remoteDir: "/srv/shots")

    func testAScannedPairingCodeReplacesTheScannerWithTheConfirmForm() {
        let flow = AddHostFlow()
        flow.scan()
        XCTAssertEqual(flow.sheet, .scanner)
        XCTAssertTrue(flow.scanned(HostPairing.encode(host)))
        guard case .confirm(let draft, .scan) = flow.sheet else {
            return XCTFail("expected the confirm form, got \(String(describing: flow.sheet))")
        }
        XCTAssertEqual(draft.hostname, "10.0.0.1")
        XCTAssertEqual(draft.port, 2222)
    }

    func testAnyOtherCodeLeavesTheScannerOpenAndSaysNo() {
        let flow = AddHostFlow()
        flow.scan()
        XCTAssertFalse(flow.scanned("https://example.com/menu"))
        XCTAssertFalse(flow.scanned(""))
        XCTAssertEqual(flow.sheet, .scanner)
    }

    func testALinkIsConfirmedAsALink() {
        // The origin matters: a link may only move a host whose key is pinned.
        let flow = AddHostFlow()
        flow.addManually()
        flow.receive(link: host)
        XCTAssertEqual(flow.sheet, .confirm(host, .link))
    }

    func testTheDefaultIsOfferedOnlyForASecondHostThatIsNotAlreadyIt() async throws {
        let other = BeamHost(alias: "other", hostname: "h", username: "u")
        let flow = AddHostFlow()
        flow.offerDefault(host, hosts: [host], defaultID: host.id)
        flow.offerDefault(host, hosts: [other, host], defaultID: host.id)
        try await Task.sleep(for: .milliseconds(500))
        XCTAssertNil(flow.offeringDefault, "one host, or already the default: nothing to ask")

        flow.saved = host
        flow.offerDefault(host, hosts: [other, host], defaultID: other.id)
        XCTAssertNil(flow.saved, "the follow-up is over once the question is asked")
        try await Task.sleep(for: .milliseconds(500))
        XCTAssertEqual(flow.offeringDefault, host)
    }
}

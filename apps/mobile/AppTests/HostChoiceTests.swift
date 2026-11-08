import BeamEngine
import XCTest

@testable import Hostbeam

/// Which host a beam from Shortcuts goes to.
final class HostChoiceTests: XCTestCase {
    private let a = BeamHost(alias: "a", hostname: "a", username: "u")
    private let b = BeamHost(alias: "b", hostname: "b", username: "u")

    func testNothingNamedGoesToTheDefaultElseTheFirst() {
        XCTAssertEqual(SharedHosts.choose(nil, among: [a, b], defaultID: b.id), .host(b))
        XCTAssertEqual(SharedHosts.choose(nil, among: [a, b], defaultID: UUID()), .host(a))
        XCTAssertEqual(SharedHosts.choose(nil, among: [a, b], defaultID: nil), .host(a))
    }

    func testANamedHostIsUsedEvenWhenItIsNotTheDefault() {
        XCTAssertEqual(SharedHosts.choose(a.id, among: [a, b], defaultID: b.id), .host(a))
    }

    func testANamedHostThatIsGoneIsMissingNotTheDefault() {
        // It used to fall back to the default and beam there: a screenshot on
        // a server the shortcut never named.
        XCTAssertEqual(SharedHosts.choose(UUID(), among: [a, b], defaultID: b.id), .missing)
    }

    func testNoHostsAtAll() {
        XCTAssertEqual(SharedHosts.choose(nil, among: [], defaultID: nil), .none)
    }
}

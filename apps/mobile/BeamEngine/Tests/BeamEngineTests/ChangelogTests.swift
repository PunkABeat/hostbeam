import XCTest

@testable import BeamEngine

final class ChangelogTests: XCTestCase {
    func testWhatsNewOpensTheIPhoneReleasesAtTheRunningVersion() {
        // The exact anchor the site gives an iPhone release (releaseAnchor in
        // scripts/changelog-parse.mjs); a different shape lands at the top.
        XCTAssertEqual(
            Changelog.iPhoneURL(version: "1.0").absoluteString,
            "https://hostbeam.app/changelog/iphone/#iphone-1.0")
        XCTAssertEqual(
            Changelog.iPhoneURL(version: nil).absoluteString,
            "https://hostbeam.app/changelog/iphone/")
        XCTAssertEqual(
            Changelog.iPhoneURL(version: "").absoluteString,
            "https://hostbeam.app/changelog/iphone/")
    }
}

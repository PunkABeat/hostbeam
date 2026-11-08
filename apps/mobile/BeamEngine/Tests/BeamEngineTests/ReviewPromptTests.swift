import Foundation
import XCTest

@testable import BeamEngine

final class ReviewPromptTests: XCTestCase {
    private func freshDefaults() -> UserDefaults {
        let name = "review-prompt-test-\(UUID().uuidString)"
        let d = UserDefaults(suiteName: name)!
        // The suite by name: a UserDefaults instance is not Sendable.
        addTeardownBlock { UserDefaults(suiteName: name)?.removePersistentDomain(forName: name) }
        return d
    }

    func testNotAskedBeforeEnoughBeams() {
        let prompt = ReviewPrompt(defaults: freshDefaults())
        for _ in 1..<ReviewPrompt.successesBeforeAsking {
            prompt.recordSuccess()
            XCTAssertFalse(prompt.shouldAsk(version: "1.0"))
        }
        prompt.recordSuccess()
        XCTAssertTrue(prompt.shouldAsk(version: "1.0"))
    }

    func testAskedOncePerVersion() {
        let prompt = ReviewPrompt(defaults: freshDefaults())
        for _ in 0..<ReviewPrompt.successesBeforeAsking { prompt.recordSuccess() }
        prompt.markAsked(version: "1.0")
        prompt.recordSuccess()
        XCTAssertFalse(prompt.shouldAsk(version: "1.0"))
        // Something new to rate: the next version may ask once more.
        XCTAssertTrue(prompt.shouldAsk(version: "1.1"))
    }

    func testBeamsFromEveryProcessAddToOneCount() {
        // The app and the share extension each make their own ReviewPrompt on
        // the shared app-group defaults; their beams must add up.
        let shared = freshDefaults()
        let app = ReviewPrompt(defaults: shared)
        let shareExtension = ReviewPrompt(defaults: shared)
        app.recordSuccess()
        shareExtension.recordSuccess()
        shareExtension.recordSuccess()
        XCTAssertEqual(app.successes, 3)
        XCTAssertTrue(app.shouldAsk(version: "1.0"))
    }
}

import BeamEngine
import XCTest

@testable import Hostbeam

/// The one wording of a failed beam. Every surface renders this, so a gap here
/// is a gap everywhere.
final class BeamFailureTests: XCTestCase {
    private let host = BeamHost(
        alias: "prod", hostname: "10.0.0.1", username: "dev",
        remoteDir: "/srv/shots")

    private let every: [BeamError] = [
        .dailyLimitReached(resetsAt: Date(timeIntervalSince1970: 1_800_000_000)),
        .noFreeFilename, .tooManyFiles(limit: 25), .hostKeyMismatch,
        .unsupportedServer(detail: "no ed25519"), .authRejected, .deviceKeyMissing,
        .folderOwnedByAnotherUser, .emptyBatch, .fileTooLarge(limitMB: 100),
    ]

    func testEveryEngineErrorHasItsOwnTitleAndNoneBlamesTheNetwork() {
        let didntAnswer = BeamFailure.from(CocoaError(.fileReadUnknown), host: host).title
        var titles = Set<String>()
        for error in every {
            let failure = BeamFailure.from(error, host: host)
            XCTAssertFalse(failure.title.isEmpty, "\(error)")
            XCTAssertNotEqual(
                failure.title, didntAnswer,
                "\(error) is a known failure, not an unanswered host")
            titles.insert(failure.title)
        }
        XCTAssertEqual(titles.count, every.count, "no two errors share a title")
    }

    func testAnUnknownErrorIsTheHostNotAnsweringWithTheCauseAsDetail() {
        let failure = BeamFailure.from(URLError(.timedOut), host: host)
        XCTAssertTrue(failure.title.contains("prod"), failure.title)
        XCTAssertEqual(failure.detail, URLError(.timedOut).localizedDescription)
    }

    func testDetailsAreDataNotEnglish() {
        // A detail says what the title cannot — a path, a count — and never
        // restates the title in English (review § B3).
        for error in every {
            let detail = BeamFailure.from(error, host: host).detail
            XCTAssertFalse(detail?.contains("rejected") ?? false, "\(error)")
            XCTAssertFalse(detail?.contains("mismatch") ?? false, "\(error)")
            XCTAssertFalse(detail?.contains("unavailable") ?? false, "\(error)")
        }
        XCTAssertEqual(
            BeamFailure.from(BeamError.folderOwnedByAnotherUser, host: host).detail,
            "/srv/shots")
    }

    func testTheOneLineFormJoinsTitleAndHint() {
        let failure = BeamFailure.from(BeamError.authRejected, host: host)
        XCTAssertEqual(failure.sentence, "\(failure.title) \(failure.hint!)")
        let noHint = BeamFailure.from(BeamError.unsupportedServer(detail: "x"), host: host)
        XCTAssertEqual(noHint.sentence, noHint.title)
    }
}

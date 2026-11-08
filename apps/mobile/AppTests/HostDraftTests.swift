import BeamEngine
import XCTest

@testable import Hostbeam

final class HostDraftTests: XCTestCase {
    func testWhatIsSavedIsTrimmedAndTheFolderDefaults() {
        let draft = HostDraft(
            alias: " dev box ", hostname: "10.0.0.5 \n", port: " 2222",
            username: "\tme ", remoteDir: "  ")
        let host = draft.host(folderDefault: "/srv/default")
        XCTAssertEqual(host?.alias, "dev box")
        XCTAssertEqual(host?.hostname, "10.0.0.5")
        XCTAssertEqual(host?.port, 2222)
        XCTAssertEqual(host?.username, "me")
        XCTAssertEqual(host?.remoteDir, "/srv/default")
    }

    func testAPortOutsideOneTo65535IsNotAPort() {
        for bad in ["0", "65536", "99999", "-1", "22a", ""] {
            XCTAssertNil(HostDraft(port: bad).portNumber, bad)
        }
        XCTAssertEqual(HostDraft(port: "65535").portNumber, 65535)
    }

    func testIncompleteDraftsDoNotMakeAHost() {
        XCTAssertNil(HostDraft(alias: "a", hostname: " ", username: "u").host())
        XCTAssertNil(HostDraft(alias: "a", hostname: "h", port: "0", username: "u").host())
        XCTAssertNotNil(HostDraft(alias: "a", hostname: "h", username: "u").host())
    }

    // MARK: A name you already have

    private let existing = BeamHost(alias: "Prod", hostname: "10.0.0.1", port: 22, username: "dev")

    private func draft(_ hostname: String) -> HostDraft {
        HostDraft(alias: " prod ", hostname: hostname, port: "22", username: "dev")
    }

    func testANewNameIsAnAdd() {
        let d = HostDraft(alias: "staging", hostname: "h", username: "u")
        XCTAssertEqual(d.decision(among: [existing], origin: .manual) { _ in false }, .add)
    }

    func testTheSameHostAgainChangesNothing() {
        for origin: HostDraft.Origin in [.manual, .scan, .link] {
            XCTAssertEqual(
                draft("10.0.0.1").decision(among: [existing], origin: origin) { _ in true },
                .unchanged(existing))
        }
    }

    func testTypedByHandANameInUseIsRefused() {
        XCTAssertEqual(
            draft("10.0.0.9").decision(among: [existing], origin: .manual) { _ in true },
            .nameTaken(existing))
    }

    func testAScanMovesTheHostItNames() {
        XCTAssertEqual(
            draft("10.0.0.9").decision(among: [existing], origin: .scan) { _ in false },
            .update(existing))
    }

    func testALinkMovesAHostOnlyOnceItsKeyIsPinned() {
        // Unpinned, the moved host would trust whatever answered at the new
        // address; pinned, a different server is refused as a changed key.
        XCTAssertEqual(
            draft("10.0.0.9").decision(among: [existing], origin: .link) { _ in false },
            .nameTaken(existing))
        XCTAssertEqual(
            draft("10.0.0.9").decision(among: [existing], origin: .link) { _ in true },
            .update(existing))
    }

    func testOnlyAnAddOrAnUpdateCanBeSaved() {
        XCTAssertTrue(HostDraft.Decision.add.canSave)
        XCTAssertTrue(HostDraft.Decision.update(existing).canSave)
        XCTAssertFalse(HostDraft.Decision.unchanged(existing).canSave)
        XCTAssertFalse(HostDraft.Decision.nameTaken(existing).canSave)
    }
}

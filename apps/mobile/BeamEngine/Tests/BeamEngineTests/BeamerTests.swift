import Foundation
import XCTest

@testable import BeamEngine

/// In-memory transport: a dictionary of remote paths → bytes. Locked, because
/// the beamer keeps several writes in flight at once.
final class FakeTransport: Transport, SFTPSession, @unchecked Sendable {
    private let lock = NSLock()
    private var _files: [String: Data] = [:]
    var files: [String: Data] {
        get { lock.withLock { _files } }
        set { lock.withLock { _files = newValue } }
    }
    var directories: Set<String> = []
    var failCreateFile = false
    var failOpen = false
    /// Thrown by `openSession` when set, ahead of `failOpen`.
    var openError: Error?
    /// Folders another account owns, as on a shared host.
    var foreignFolders: Set<String> = []
    /// Fail once this many files have been created — for the partial-batch path,
    /// where the link dies part-way through a drop rather than before it.
    var failCreateFileAfter: Int?
    /// A write at or past this offset fails — the link dying mid-file.
    var failWriteAt: UInt64?
    /// Every rename fails, for a reason other than a clash.
    var failRename = false
    /// How long each write takes, so overlapping writes can be observed.
    var writeDelay: Duration?
    private(set) var closed = false
    /// Every path `createFile` was asked for, in order.
    private(set) var created: [String] = []
    private var inFlight = 0
    /// The most writes that were ever awaiting their reply at once.
    private(set) var maxInFlight = 0

    func openSession(host: BeamHost) async throws -> SFTPSession {
        if let openError { throw openError }
        if failOpen { throw CocoaError(.fileReadUnknown) }
        return self
    }
    func ensureDirectory(_ path: String) async throws { directories.insert(path) }
    func isOwnedByLogin(_ path: String) async throws -> Bool { !foreignFolders.contains(path) }
    func exists(_ path: String) async throws -> Bool { files[path] != nil }

    func createFile(_ path: String) async throws -> RemoteFileHandle {
        if failCreateFile { throw CocoaError(.fileWriteNoPermission) }
        return try lock.withLock {
            if let n = failCreateFileAfter, _files.count >= n {
                throw CocoaError(.fileWriteNoPermission)
            }
            guard _files[path] == nil else { throw CocoaError(.fileWriteFileExists) }
            _files[path] = Data()
            created.append(path)
            return FakeHandle(path: path, transport: self)
        }
    }

    func rename(_ from: String, to: String) async throws {
        if failRename { throw CocoaError(.fileWriteNoPermission) }
        try lock.withLock {
            guard let data = _files[from] else { throw CocoaError(.fileNoSuchFile) }
            // SFTP's rename never replaces a file; the beamer relies on it.
            guard _files[to] == nil else { throw CocoaError(.fileWriteFileExists) }
            _files[from] = nil
            _files[to] = data
        }
    }

    func listFiles(in path: String) async throws -> [RemoteFileInfo] {
        let prefix = path.hasSuffix("/") ? path : path + "/"
        return files.compactMap { key, data in
            guard key.hasPrefix(prefix) else { return nil }
            let name = String(key.dropFirst(prefix.count))
            guard !name.contains("/") else { return nil }  // one level only
            return RemoteFileInfo(name: name, size: UInt64(data.count))
        }
    }

    func removeFile(_ path: String) async throws {
        try lock.withLock {
            guard _files.removeValue(forKey: path) != nil else {
                throw CocoaError(.fileNoSuchFile)
            }
        }
    }

    func close() async throws { closed = true }

    fileprivate func write(_ data: Data, at offset: UInt64, to path: String) async throws {
        lock.withLock {
            inFlight += 1
            maxInFlight = max(maxInFlight, inFlight)
        }
        defer { lock.withLock { inFlight -= 1 } }
        if let writeDelay { try await Task.sleep(for: writeDelay) }
        if let failWriteAt, offset >= failWriteAt { throw CocoaError(.fileWriteUnknown) }
        lock.withLock {
            // At its own offset, whatever order the writes arrive in.
            var bytes = _files[path] ?? Data()
            let end = Int(offset) + data.count
            if bytes.count < end { bytes.append(Data(count: end - bytes.count)) }
            bytes.replaceSubrange(Int(offset)..<end, with: data)
            _files[path] = bytes
        }
    }

    final class FakeHandle: RemoteFileHandle, @unchecked Sendable {
        let path: String
        unowned let transport: FakeTransport
        init(path: String, transport: FakeTransport) {
            self.path = path
            self.transport = transport
        }

        func write(_ data: Data, at offset: UInt64) async throws {
            try await transport.write(data, at: offset, to: path)
        }

        func close() async throws {}
    }
}

final class MemoryCounter: BeamCounting {
    var count = 0
    var limit = BeamCounter.dailyLimit
    func canBeam(now: Date) -> Bool { count < limit }
    func recordSuccess(now: Date) { count += 1 }
    func remaining(now: Date) -> Int { max(0, limit - count) }
    func nextReset(after date: Date) -> Date { date.addingTimeInterval(3600) }
}

final class BeamerTests: XCTestCase {
    let host = BeamHost(alias: "dev", hostname: "example.invalid", username: "beam")
    let noon = Date(timeIntervalSince1970: 1_782_216_000)  // fixed instant

    private func tempFile(bytes: Int) throws -> URL {
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("beamer-test-\(UUID().uuidString).bin")
        var data = Data(capacity: bytes)
        var state: UInt64 = 42
        for _ in 0..<bytes {
            state = state &* 6_364_136_223_846_793_005 &+ 1_442_695_040_888_963_407
            data.append(UInt8(truncatingIfNeeded: state >> 33))
        }
        try data.write(to: url)
        addTeardownBlock { try? FileManager.default.removeItem(at: url) }
        return url
    }

    func testUploadsByteIdenticallyAndStreamsInChunks() async throws {
        let transport = FakeTransport()
        let size = Beamer.chunkSize * 2 + 12345  // force a partial final chunk
        let url = try tempFile(bytes: size)
        let outcome = try await Beamer(transport: transport).beam(fileURL: url, host: host, now: noon)

        XCTAssertEqual(outcome.bytesSent, size)
        XCTAssertEqual(transport.files[outcome.remotePath], try Data(contentsOf: url))
        XCTAssertTrue(transport.directories.contains("/tmp/hostbeam"))
        XCTAssertTrue(transport.closed)
        XCTAssertEqual(outcome.sentence, outcome.remotePath, "just the path, by default")
        XCTAssertTrue(outcome.remotePath.hasPrefix("/tmp/hostbeam/hostbeam-"))
        // Not a picture, so it keeps its own extension rather than being
        // called `.png` (ADR 0006's 2026-09-26 amendment).
        XCTAssertTrue(outcome.remotePath.hasSuffix(".bin"))
    }

    // MARK: - Several files in one gesture (next.md § 6)

    func testBatchUploadsEveryFileByteIdentically() async throws {
        let transport = FakeTransport()
        // Different sizes, and one spanning several chunks, because the bug this
        // guards against is writing file two at the end of file one: with a
        // shared running offset every file after the first is corrupt.
        let a = try tempFile(bytes: 1000)
        let b = try tempFile(bytes: Beamer.chunkSize + 7)
        let c = try tempFile(bytes: 3)
        let outcome = try await Beamer(transport: transport)
            .beam(fileURLs: [a, b, c], host: host, now: noon)

        XCTAssertEqual(outcome.remotePaths.count, 3)
        for (url, path) in zip([a, b, c], outcome.remotePaths) {
            XCTAssertEqual(transport.files[path], try Data(contentsOf: url), path)
        }
        XCTAssertEqual(outcome.bytesSent, 1000 + Beamer.chunkSize + 7 + 3)
    }

    func testBatchNamesDoNotCollideWithinTheSameSecond() async throws {
        let transport = FakeTransport()
        let files = try (0..<4).map { _ in try tempFile(bytes: 5) }
        let outcome = try await Beamer(transport: transport)
            .beam(fileURLs: files, host: host, now: noon)

        // Names are second-granular, so a batch collides with itself unless each
        // file resumes probing after the last one.
        XCTAssertEqual(Set(outcome.remotePaths).count, 4, "every name distinct")
        XCTAssertEqual(transport.files.count, 4)
    }

    func testBatchCountsAsOneBeam() async throws {
        // The whole point of § 6: one gesture is one beam however many files it
        // carries. Five files must not spend a free user's whole day.
        let counter = MemoryCounter()
        let transport = FakeTransport()
        let files = try (0..<5).map { _ in try tempFile(bytes: 5) }
        _ = try await Beamer(transport: transport, counter: counter)
            .beam(fileURLs: files, host: host, now: noon)
        XCTAssertEqual(counter.count, 1, "one beam recorded, not five")
        XCTAssertEqual(counter.remaining(now: noon), BeamCounter.dailyLimit - 1)
    }

    func testBatchCopiesJustThePathsASpaceApart() async throws {
        // Claude Code and Gemini CLI attach every path of a paste split at
        // spaces; one per line they attached one or none (next.md § 10a).
        let files = try (0..<2).map { _ in try tempFile(bytes: 5) }
        let outcome = try await Beamer(transport: FakeTransport())
            .beam(fileURLs: files, host: host, now: noon)
        XCTAssertEqual(outcome.sentence, outcome.remotePaths.joined(separator: " "))
        XCTAssertEqual(outcome.sentences, outcome.remotePaths)
    }

    func testBatchSentenceRepeatsTheTemplatePerPath() async throws {
        let transport = FakeTransport()
        let files = try (0..<2).map { _ in try tempFile(bytes: 5) }
        let outcome = try await Beamer(transport: transport, sentenceTemplate: Beamer.suggestedSentence)
            .beam(fileURLs: files, host: host, now: noon)

        XCTAssertEqual(
            outcome.sentence,
            // The fixtures are not pictures, so the suggested sentence says "file".
            outcome.remotePaths.map { "Use this file: \($0)" }.joined(separator: "\n")
        )
        // remotePath stays meaningful for single-file callers.
        XCTAssertEqual(outcome.remotePath, outcome.remotePaths[0])
    }

    func testSentencesAreIndexAlignedWithPaths() async throws {
        // The Recent list pairs sentences[i] with the i-th file it beamed to
        // build that row's thumbnail. Drift here would caption a screenshot
        // with another one's path — wrong, and wrong in a way nothing throws.
        let transport = FakeTransport()
        let files = try (0..<3).map { _ in try tempFile(bytes: 5) }
        let outcome = try await Beamer(transport: transport, sentenceTemplate: Beamer.suggestedSentence)
            .beam(fileURLs: files, host: host, now: noon)

        XCTAssertEqual(outcome.sentences.count, outcome.remotePaths.count)
        for (sentence, path) in zip(outcome.sentences, outcome.remotePaths) {
            XCTAssertEqual(sentence, "Use this file: \(path)")
        }
    }

    // MARK: - A batch that stops part-way (next.md § 6, full size)

    func testBatchThatStopsPartWayReportsWhatLandedAndWhatDidNot() async throws {
        let transport = FakeTransport()
        transport.failCreateFileAfter = 2
        let counter = MemoryCounter()
        let files = try (0..<5).map { _ in try tempFile(bytes: 5) }
        let outcome = try await Beamer(transport: transport, counter: counter)
            .beam(fileURLs: files, host: host, now: noon)

        // The two that landed are real, and say so.
        XCTAssertEqual(outcome.remotePaths.count, 2)
        XCTAssertEqual(transport.files.count, 2)
        XCTAssertEqual(outcome.sentences.count, 2, "a sentence per file that arrived")

        // And the three that did not are named, in order, so the caller can say
        // which — and, on a platform where it can, offer to send them.
        XCTAssertEqual(outcome.unsent, Array(files[2...]))

        // The gesture was spent. Charging again for the rest would charge twice
        // for one drop.
        XCTAssertEqual(counter.count, 1)
    }

    func testNothingLandingIsStillAnOrdinaryFailure() async throws {
        // A partial is only a partial once something is on the host. With the
        // very first file refused there is nothing to report and nothing to
        // paste, so this must throw exactly as it always did.
        let transport = FakeTransport()
        transport.failCreateFile = true
        let counter = MemoryCounter()
        let files = try (0..<3).map { _ in try tempFile(bytes: 5) }
        do {
            _ = try await Beamer(transport: transport, counter: counter)
                .beam(fileURLs: files, host: host, now: noon)
            XCTFail("expected the beam to throw")
        } catch {
            XCTAssertTrue(transport.files.isEmpty)
            XCTAssertEqual(counter.count, 0, "a beam that delivered nothing costs nothing")
        }
    }

    func testAFolderAnotherUserOwnsIsRefusedBeforeAnythingIsSent() async throws {
        // On a shared host whoever made the folder first owns it. Beaming into it
        // would hand them the screenshots, so nothing is sent and nothing charged.
        let transport = FakeTransport()
        transport.foreignFolders = [host.remoteDir]
        let counter = MemoryCounter()
        do {
            _ = try await Beamer(transport: transport, counter: counter)
                .beam(fileURLs: [try tempFile(bytes: 5)], host: host, now: noon)
            XCTFail("expected the beam to be refused")
        } catch BeamError.folderOwnedByAnotherUser {
            XCTAssertTrue(transport.files.isEmpty)
            XCTAssertEqual(counter.count, 0)
            XCTAssertTrue(transport.closed, "the session is closed on the way out")
        }
    }

    func testAWholeBatchReportsNothingUnsent() async throws {
        let transport = FakeTransport()
        let files = try (0..<3).map { _ in try tempFile(bytes: 5) }
        let outcome = try await Beamer(transport: transport)
            .beam(fileURLs: files, host: host, now: noon)
        XCTAssertTrue(outcome.unsent.isEmpty)
    }

    func testTooManyFilesIsRefusedWholeBeforeAnyNetworkWork() async throws {
        let transport = FakeTransport()
        let files = try (0...Beamer.maxBatch).map { _ in try tempFile(bytes: 1) }
        do {
            _ = try await Beamer(transport: transport).beam(fileURLs: files, host: host, now: noon)
            XCTFail("expected tooManyFiles")
        } catch BeamError.tooManyFiles(let limit) {
            XCTAssertEqual(limit, Beamer.maxBatch)
        }
        // Refused whole: nothing sent, and no session opened to send it with.
        XCTAssertTrue(transport.files.isEmpty)
    }

    func testAnEmptyBatchIsRefused() async throws {
        let transport = FakeTransport()
        do {
            _ = try await Beamer(transport: transport).beam(fileURLs: [], host: host, now: noon)
            XCTFail("expected a throw")
        } catch {
            XCTAssertEqual(error as? BeamError, .emptyBatch)
        }
        XCTAssertTrue(transport.files.isEmpty)
    }

    // MARK: - Pipelined, and named only when whole (review § C1, C2, D3)

    func testWritesOverlapButNeverExceedTheWindowAndTheBytesAreExact() async throws {
        let transport = FakeTransport()
        transport.writeDelay = .milliseconds(2)
        let url = try tempFile(bytes: Beamer.chunkSize * 40 + 17)
        let outcome = try await Beamer(transport: transport).beam(fileURL: url, host: host, now: noon)
        XCTAssertEqual(transport.files[outcome.remotePath], try Data(contentsOf: url))
        XCTAssertGreaterThan(transport.maxInFlight, 1, "one write at a time is the old, slow path")
        XCTAssertLessThanOrEqual(transport.maxInFlight, Beamer.writesInFlight)
    }

    func testAFileIsWrittenUnderAHiddenNameAndNamedOnlyWhenWhole() async throws {
        let transport = FakeTransport()
        let files = try (0..<3).map { _ in try tempFile(bytes: Beamer.chunkSize + 5) }
        let outcome = try await Beamer(transport: transport).beam(fileURLs: files, host: host, now: noon)
        XCTAssertEqual(transport.created.count, 3)
        for path in transport.created {
            let name = (path as NSString).lastPathComponent
            XCTAssertTrue(Beamer.isUnfinishedUpload(name), "written under \(name)")
            XCTAssertFalse(Beamer.isBeamArtifact(name), "invisible to the agent tools while it arrives")
        }
        XCTAssertEqual(Set(transport.files.keys), Set(outcome.remotePaths), "no temporary file is left")
    }

    func testAFileThatFailsMidwayLeavesNothingBehind() async throws {
        let transport = FakeTransport()
        transport.failWriteAt = UInt64(Beamer.chunkSize * 2)
        do {
            _ = try await Beamer(transport: transport)
                .beam(fileURL: try tempFile(bytes: Beamer.chunkSize * 5), host: host, now: noon)
            XCTFail("expected the beam to throw")
        } catch {
            XCTAssertTrue(transport.files.isEmpty, "neither a half file nor its temporary name")
        }
    }

    func testARenameThatFailsForItsOwnReasonIsAnErrorNotAClash() async throws {
        // Only a name that exists moves on to the next suffix; anything else
        // (permissions, a dropped link) is the error it is.
        let transport = FakeTransport()
        transport.failRename = true
        do {
            _ = try await Beamer(transport: transport)
                .beam(fileURL: try tempFile(bytes: 10), host: host, now: noon)
            XCTFail("expected the beam to throw")
        } catch {
            XCTAssertNotEqual(error as? BeamError, .noFreeFilename)
            XCTAssertTrue(transport.files.isEmpty, "the temporary file is removed")
        }
    }

    func testCleanupAlsoRemovesUnfinishedUploadsAndNothingElse() async throws {
        let transport = FakeTransport()
        transport.files = [
            "/tmp/hostbeam/hostbeam-1788875278869.png": Data([1]),
            "/tmp/hostbeam/.hostbeam-0f3a.part": Data([2, 3]),
            "/tmp/hostbeam/notes.txt": Data([4]),
            "/tmp/hostbeam/.hostbeam-config": Data([5]),
        ]
        let storage = try await Beamer(transport: transport).storage(host: host)
        XCTAssertEqual(storage, .init(count: 2, bytes: 3))
        let removed = try await Beamer(transport: transport).cleanup(host: host)
        XCTAssertEqual(removed, 2)
        XCTAssertEqual(
            Set(transport.files.keys),
            ["/tmp/hostbeam/notes.txt", "/tmp/hostbeam/.hostbeam-config"])
    }

    func testCollisionAddsSuffixAndNeverOverwrites() async throws {
        let transport = FakeTransport()
        let first = "/tmp/hostbeam/" + Beamer.filename(for: noon, attempt: 0, ext: "bin")
        transport.files[first] = Data([1, 2, 3])

        let url = try tempFile(bytes: 10)
        let outcome = try await Beamer(transport: transport).beam(fileURL: url, host: host, now: noon)

        XCTAssertEqual(
            outcome.remotePath, "/tmp/hostbeam/" + Beamer.filename(for: noon, attempt: 1, ext: "bin"))
        XCTAssertTrue(outcome.remotePath.contains("-2.bin"))
        XCTAssertEqual(transport.files[first], Data([1, 2, 3]), "existing file untouched")
    }

    func testDailyLimitBlocksBeforeAnyNetworkWork() async throws {
        let transport = FakeTransport()
        let counter = MemoryCounter()
        counter.count = counter.limit  // exhausted
        let url = try tempFile(bytes: 10)

        do {
            _ = try await Beamer(transport: transport, counter: counter)
                .beam(fileURL: url, host: host, now: noon)
            XCTFail("expected dailyLimitReached")
        } catch let BeamError.dailyLimitReached(resetsAt) {
            XCTAssertGreaterThan(resetsAt, noon)
        }
        XCTAssertTrue(transport.files.isEmpty, "no upload attempted at the limit")
    }

    func testOnlySuccessConsumesQuota() async throws {
        let transport = FakeTransport()
        transport.failCreateFile = true
        let counter = MemoryCounter()
        let url = try tempFile(bytes: 10)

        _ = try? await Beamer(transport: transport, counter: counter)
            .beam(fileURL: url, host: host, now: noon)
        XCTAssertEqual(counter.count, 0, "failure must not consume quota")

        transport.failCreateFile = false
        _ = try await Beamer(transport: transport, counter: counter)
            .beam(fileURL: url, host: host, now: noon)
        XCTAssertEqual(counter.count, 1)
    }

    func testFilenameFormat() {
        // Epoch milliseconds, the same shape as the Mac's `remote_name`. The
        // fraction is exactly representable so the stamp cannot round either way.
        let date = Date(timeIntervalSince1970: 1_789_274_900.5)
        XCTAssertEqual(Beamer.filename(for: date, attempt: 0), "hostbeam-1789274900500.png")
        XCTAssertEqual(Beamer.filename(for: date, attempt: 1), "hostbeam-1789274900500-2.png")
        // A file with no extension gets none, as on the Mac.
        XCTAssertEqual(Beamer.filename(for: date, attempt: 0, ext: nil), "hostbeam-1789274900500")
        XCTAssertEqual(Beamer.filename(for: date, attempt: 1, ext: nil), "hostbeam-1789274900500-2")
    }

    func testFilenameCarriesAStampTheAgentToolsRead() {
        // apps/agent groups a beam by the stamp directly after the prefix and
        // only reads 13 or more digits as a time (`stampOf` in hostbeam-mcp.mjs).
        // Moving it, shortening it, or going back to a date string breaks that
        // without failing anything else.
        let name = Beamer.filename(for: Date(), attempt: 2)
        let stamp = name.dropFirst("hostbeam-".count).prefix { $0.isNumber }
        XCTAssertGreaterThanOrEqual(stamp.count, 13, name)
        // And exactly 13 — what Clean up now matches on (`isBeamArtifact`).
        XCTAssertEqual(stamp.count, Beamer.stampDigits, name)
    }

    // MARK: - Any file you hand over (ADR 0006's 2026-09-26 amendment)

    func testTheOriginalNameRidesBehindTheStamp() {
        let date = Date(timeIntervalSince1970: 1_789_274_900.5)
        XCTAssertEqual(
            Beamer.filename(for: date, attempt: 0, ext: "pdf", slug: "report"),
            "hostbeam-1789274900500-report.pdf")
        XCTAssertEqual(
            Beamer.filename(for: date, attempt: 1, ext: "pdf", slug: "report"),
            "hostbeam-1789274900500-report-2.pdf")
        XCTAssertEqual(
            Beamer.filename(for: date, attempt: 0, ext: nil, slug: "env"), "hostbeam-1789274900500-env")
    }

    func testTheSlugIsTheMacsRule() {
        // The name reaches someone's host, so these are mostly about what it
        // refuses to carry — the same cases as beam.rs's slug tests.
        XCTAssertEqual(Beamer.slug("shot-2.png"), "shot-2")
        XCTAssertEqual(
            Beamer.slug("Screenshot 2026-09-09 at 11.04.21.png"), "Screenshot-2026-09-09-at-11.04.21")
        XCTAssertEqual(Beamer.slug("my_design_v2.PNG"), "my_design_v2")
        XCTAssertEqual(Beamer.slug(".env"), "env")
        XCTAssertEqual(Beamer.slug("Makefile"), "Makefile")
        XCTAssertEqual(Beamer.slug("archive.tar.gz"), "archive.tar")
        for name in ["a b;rm -rf ~.png", "sh'ot\"x.png", "$(whoami).png", "back\\slash.png", "a/../b.png"] {
            let got = Beamer.slug(name) ?? ""
            for bad: Character in ["/", "\\", "'", "\"", ";", "$", "(", ")", " ", "~"] {
                XCTAssertFalse(got.contains(bad), "\(name) → \(got) still contains \(bad)")
            }
            XCTAssertFalse(got.contains("--"), got)
        }
        for name in ["🎉.png", "---.png", "....png", " .png"] {
            XCTAssertNil(Beamer.slug(name), name)
        }
        XCTAssertLessThanOrEqual(Beamer.slug(String(repeating: "a b", count: 200))!.count, 48)
    }

    func testFilesWithDifferentNamesInOneShareAreNotSuffixedForEachOther() async throws {
        let transport = FakeTransport()
        let a = try tempFile(bytes: 10)
        let b = try tempFile(bytes: 10)
        let outcome = try await Beamer(transport: transport)
            .beam(fileURLs: [a, b], names: ["report.pdf", "data.csv"], host: host, now: noon)
        XCTAssertEqual(
            outcome.remotePaths.map { ($0 as NSString).lastPathComponent },
            [
                Beamer.filename(for: noon, attempt: 0, ext: "bin", slug: "report"),
                Beamer.filename(for: noon, attempt: 0, ext: "bin", slug: "data"),
            ])
    }

    func testAFileOverTheCapIsRefusedBeforeAnythingIsSent() async throws {
        let transport = FakeTransport()
        let url = try tempFile(bytes: 1)
        // Sparse: the size is all the check reads.
        let handle = try FileHandle(forWritingTo: url)
        try handle.truncate(atOffset: UInt64(Beamer.maxFileBytes) + 1)
        try handle.close()
        do {
            _ = try await Beamer(transport: transport).beam(fileURL: url, host: host, now: noon)
            XCTFail("expected fileTooLarge")
        } catch let error as BeamError {
            XCTAssertEqual(error, .fileTooLarge(limitMB: 100))
        }
        XCTAssertTrue(transport.files.isEmpty)
        XCTAssertFalse(transport.closed, "no session was opened")
        XCTAssertEqual(Beamer.maxFileBytes, 100 * 1024 * 1024, "the Mac's FILE_MAX_BYTES")
    }

    func testANonPictureSaysFileUnderTheSuggestedSentence() async throws {
        XCTAssertEqual(
            Beamer.template(Beamer.suggestedSentence, for: "/t/r.pdf"), Beamer.fileSentenceTemplate)
        XCTAssertEqual(
            Beamer.template(Beamer.suggestedSentence, for: "/t/a.PNG"), Beamer.suggestedSentence)
        XCTAssertEqual(Beamer.template("look at {path}", for: "/t/r.pdf"), "look at {path}")
        // The default is just the path, whatever the file is.
        XCTAssertEqual(Beamer.template(Beamer.defaultSentenceTemplate, for: "/t/r.pdf"), "")
        // End to end: the outcome's line says "file" for a non-picture.
        let outcome = try await Beamer(transport: FakeTransport(), sentenceTemplate: Beamer.suggestedSentence)
            .beam(fileURL: try tempFile(bytes: 10), host: host, now: noon)
        XCTAssertEqual(outcome.sentence, "Use this file: \(outcome.remotePath)")
    }

    func testASuggestedSentenceSavedBeforeTheChangeReadsAsJustThePath() {
        // Nothing saved: the default.
        XCTAssertEqual(Beamer.template(saved: nil, chosenSince: false), "")
        // The old default, saved by a Settings visit before 2026-09-28: nobody chose it.
        XCTAssertEqual(Beamer.template(saved: Beamer.suggestedSentence, chosenSince: false), "")
        // Saved since the change: chosen, and kept.
        XCTAssertEqual(
            Beamer.template(saved: Beamer.suggestedSentence, chosenSince: true), Beamer.suggestedSentence)
        // A sentence someone wrote is theirs, whenever it was saved.
        XCTAssertEqual(Beamer.template(saved: "look at {path}", chosenSince: false), "look at {path}")
        XCTAssertEqual(Beamer.template(saved: "", chosenSince: false), "")
    }

    func testTheDefaultCopiesJustThePath() {
        XCTAssertEqual(Beamer.defaultSentenceTemplate, "")
        XCTAssertEqual(Beamer.suggestedSentence, "Use this screenshot: {path}", "config.rs DEFAULT_SENTENCE")
        XCTAssertEqual(Beamer.renderSentence(template: Beamer.defaultSentenceTemplate, path: "/t/a.png"), "/t/a.png")
    }
}

final class StorageTests: XCTestCase {
    private let host = BeamHost(
        alias: "box", hostname: "example.invalid",
        port: 22, username: "u", remoteDir: "/tmp/hostbeam")

    private func seeded() -> FakeTransport {
        let t = FakeTransport()
        t.files["/tmp/hostbeam/hostbeam-1788875278869.png"] = Data(count: 1000)
        t.files["/tmp/hostbeam/hostbeam-1788875278869-report.pdf"] = Data(count: 2000)
        t.files["/tmp/hostbeam/keepme.txt"] = Data(count: 10)  // not ours
        // The iPhone's names before 2026-09-13: no longer counted or removed
        // (owner's call, 2026-09-26 — only test builds ever wrote them).
        t.files["/tmp/hostbeam/hostbeam-2026-08-23-090000.png"] = Data(count: 10)
        t.files["/tmp/hostbeam/hostbeam-notes.txt"] = Data(count: 10)  // wrong suffix
        t.files["/tmp/hostbeam/shot.png"] = Data(count: 10)  // wrong prefix
        t.files["/tmp/hostbeam/nested/hostbeam-x.png"] = Data(count: 10)  // below top level
        return t
    }

    func testArtifactGateMatchesOnlyOurNames() {
        // The same fixture as the Mac's `CLEANUP_FIXTURE` (beam.rs): this gate
        // decides what cleanup deletes, and both apps clean the same folder.
        let ours = [
            "hostbeam-1788875278869.png",
            "hostbeam-1788875278869-2.png",
            "hostbeam-1788875278869-report.pdf",
            "hostbeam-1788875278869-Makefile",
            "hostbeam-1788875278869",
            "hostbeam-1788875278869-archive.tar.gz",
            Beamer.filename(for: Date(), attempt: 3),
            Beamer.filename(for: Date(), attempt: 0, ext: nil, slug: "env"),
        ]
        for name in ours { XCTAssertTrue(Beamer.isBeamArtifact(name), name) }
        let notOurs = [
            "hostbeam-notes.txt",
            "hostbeam-diagram.png",
            "hostbeam-2026-08-28-153012.png",  // the iPhone before 2026-09-13
            "hostbeam-178887527886.png",  // 12 digits
            "hostbeam-17888752788690.png",  // 14 digits
            "hostbeam-1788875278869x.png",  // a letter after the stamp
            "HOSTBEAM-1788875278869.png",
            "xhostbeam-1788875278869.png",
            "keepme.txt",
            "shot.png",
            "../hostbeam-1788875278869.png",
            "hostbeam-1.png",
        ]
        for name in notOurs { XCTAssertFalse(Beamer.isBeamArtifact(name), name) }
    }

    func testStorageCountsOnlyArtifacts() async throws {
        let t = seeded()
        let info = try await Beamer(transport: t).storage(host: host)
        XCTAssertEqual(info.count, 2)
        XCTAssertEqual(info.bytes, 3000)
    }

    func testCleanupDeletesOnlyArtifactsAndReportsCount() async throws {
        let t = seeded()
        let removed = try await Beamer(transport: t).cleanup(host: host)
        XCTAssertEqual(removed, 2)
        // Everything that isn't ours survives, including the nested artifact.
        XCTAssertNotNil(t.files["/tmp/hostbeam/keepme.txt"])
        XCTAssertNotNil(t.files["/tmp/hostbeam/hostbeam-notes.txt"])
        XCTAssertNotNil(t.files["/tmp/hostbeam/shot.png"])
        XCTAssertNotNil(t.files["/tmp/hostbeam/nested/hostbeam-x.png"])
        XCTAssertNotNil(t.files["/tmp/hostbeam/hostbeam-2026-08-23-090000.png"], "pre-stamp names stay")
        XCTAssertNil(t.files["/tmp/hostbeam/hostbeam-1788875278869.png"])
        XCTAssertNil(t.files["/tmp/hostbeam/hostbeam-1788875278869-report.pdf"])
    }
}

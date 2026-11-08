import Foundation

public struct BeamOutcome: Equatable, Sendable {
    /// Every remote path this gesture delivered, in the order sent. Usually one;
    /// sharing several photos at once is still a single beam.
    public let remotePaths: [String]
    /// One rendered sentence per path, index-aligned with `remotePaths`. Kept
    /// apart rather than only joined so a caller that shows the files
    /// separately — the Recent list gives each its own row and thumbnail —
    /// never has to split the joined text back up and hope the split matches.
    public let sentences: [String]
    /// Files this gesture did **not** deliver, in order — empty unless the batch
    /// stopped part-way. Non-empty means a partial: `remotePaths` really are on
    /// the host and really are on the clipboard, and these are what is missing.
    /// Reported rather than thrown away, because the alternative was an error
    /// screen and files nobody knew had arrived.
    public let unsent: [URL]
    public let bytesSent: Int
    public let seconds: Double

    /// What goes on the clipboard. Just the paths (the default) go on one line
    /// a space apart: a lone path is the one form every agent tested attaches
    /// as the picture itself, and Claude Code and Gemini CLI split a paste at
    /// spaces, not line breaks, so several attach there too (next.md § 10a).
    /// Sentences go one per line. beam.rs `render_sentence`.
    public var sentence: String {
        sentences == remotePaths
            ? remotePaths.joined(separator: " ") : sentences.joined(separator: "\n")
    }

    /// The first path — what a single-file caller means by "the" path.
    public var remotePath: String { remotePaths.first ?? "" }
}

/// The upload contract, shared with the Mac app: timestamped name under the
/// host's remote folder, collision suffix (never overwrite), and the
/// paste-ready sentence. Pure orchestration over `Transport` — unit-tested
/// with a fake; memory-safe by streaming fixed-size chunks.
///
/// A file is written under a hidden temporary name and renamed into place
/// once complete, so a `hostbeam-*` name never points at half an image — the
/// agent tools read exactly those names, and the prompt hook attaches any that
/// is recent, including one still arriving. The rename is also the collision
/// check: SFTP's rename refuses to replace a file, so claiming a name costs no
/// separate `stat`.
public struct Beamer {
    /// One SFTP write request. Citadel slices anything larger into 32,000-byte
    /// requests and waits for each in turn, so this is the unit of pipelining.
    public static let chunkSize = 32_000
    /// Writes awaiting their reply at once. One at a time capped a beam at one
    /// chunk per round trip. Measured against the test host with 50 ms added
    /// (2026-09-24, 2.5 MB files): one screenshot took 6.9 s before and 1.3 s
    /// now, most of that the connection itself; five took 3.1 s at 16 in
    /// flight, 2.5 s at 32, 2.4 s at 64. Thirty-two holds at most 1 MB, well
    /// inside a share extension's memory — measured on an iPhone 13 on
    /// 2026-09-27: a 99 MB file peaked at 20 MB in the share extension, the same
    /// as a 70-byte PDF, against a ceiling of about 120 MB.
    public static let writesInFlight = 32
    private static let maxCollisionAttempts = 10

    /// Most files one gesture will carry, matching MAX_BATCH in the Mac app's
    /// `beam.rs`. Refused whole rather than trimmed: quietly sending the first
    /// few would be the silent loss this replaced.
    public static let maxBatch = 25

    /// Largest file one beam carries, matching FILE_MAX_BYTES in `beam.rs`.
    /// Refused before anything is sent: an upload has no cancel.
    public static let maxFileBytes: Int64 = 100 * 1024 * 1024

    /// Empty, which copies just the path: since 2026-09-28, the form every
    /// agent tested attaches as the picture itself, where a sentence around it
    /// is left as text by all but Claude Code (next.md § 10a). A template is
    /// stored only once someone edits it, so everyone who never did moves over
    /// with this. The Mac's copySentence off.
    public static let defaultSentenceTemplate = ""

    /// The sentence Settings suggests, and what the default was until
    /// 2026-09-28 — config.rs `DEFAULT_SENTENCE`.
    public static let suggestedSentence = "Use this screenshot: {path}"

    /// The template to use, from what Settings saved. Until 2026-09-28 the
    /// default was the suggested sentence, and a visit to Settings could write
    /// it back unchanged — SwiftUI's text field saves on an ordinary visit — so
    /// a saved suggested sentence from before then was nobody's choice and reads
    /// as the new default. `chosenSince` is set with every save since, so a
    /// sentence written back in after the change is kept. A sentence someone
    /// wrote is always kept. config.rs `settle_copy_sentence`.
    public static func template(saved: String?, chosenSince: Bool) -> String {
        guard let saved else { return defaultSentenceTemplate }
        return saved == suggestedSentence && !chosenSince ? defaultSentenceTemplate : saved
    }

    /// What the suggested sentence says for a file that is not a picture —
    /// beam.rs `FILE_SENTENCE`. "Use this screenshot" in front of a PDF would
    /// be the one wrong word in the line.
    public static let fileSentenceTemplate = "Use this file: {path}"

    let transport: Transport
    private let counter: BeamCounting?
    private let sentenceTemplate: String

    public init(
        transport: Transport, counter: BeamCounting? = nil,
        sentenceTemplate: String = defaultSentenceTemplate
    ) {
        self.transport = transport
        self.counter = counter
        self.sentenceTemplate = sentenceTemplate
    }

    /// Epoch milliseconds — the stamp the Mac composes in `remote_name`
    /// (beam.rs) — so a host's folder holds one naming scheme whichever device
    /// beamed: `ls` sorts by time, and the agent tools read one stamp to know
    /// which files arrived together. This was `yyyy-MM-dd-HHmmss` in local time
    /// until 2026-09-13, which sorted after every Mac file and grouped nothing.
    ///
    /// `ext` is the file's real type, from `ImagePrep` — never assumed — and nil
    /// for a file with no extension, which then gets none (as on the Mac).
    /// `slug` is the original name, made safe by `slug(_:)`, riding behind the
    /// stamp as the Mac's `remote_name` carries it: `hostbeam-<stamp>-report.pdf`.
    public static func filename(
        for date: Date, attempt: Int, ext: String? = "png", slug: String? = nil
    ) -> String {
        let stamp = Int64((date.timeIntervalSince1970 * 1000).rounded(.down))
        let named = slug.map { "-\($0)" } ?? ""
        let suffix = attempt == 0 ? "" : "-\(attempt + 1)"
        let dotExt = ext.map { ".\($0)" } ?? ""
        return "hostbeam-\(stamp)\(named)\(suffix)\(dotExt)"
    }

    /// Longest slice of an original name carried into a remote one — beam.rs
    /// `SLUG_MAX`.
    static let slugMax = 48

    /// The recognisable part of a file's original name, safe to put in a remote
    /// path — beam.rs `slug`, rule for rule, since the name reaches someone's
    /// host. Everything outside `[A-Za-z0-9._-]` becomes `-`, runs collapse, the
    /// edges are trimmed of `-` and `.`, 48 characters at most. With a plain
    /// extension the stem is used (the extension is carried on its own); without
    /// one, the whole name (`.env` gives `env`). Nil when nothing usable
    /// survives — a wrong name is worse than no name.
    public static func slug(_ name: String) -> String? {
        let ext = (name as NSString).pathExtension
        let plainExt = ImagePrep.carriedExtension(of: URL(fileURLWithPath: "/" + name)) != nil
        let stem = plainExt && !ext.isEmpty ? (name as NSString).deletingPathExtension : name
        var out = ""
        for ch in stem.unicodeScalars {
            if ch.isASCII && (CharacterSet.alphanumerics.contains(ch) || ch == "." || ch == "_") {
                out.unicodeScalars.append(ch)
            } else if !out.hasSuffix("-") {
                out.append("-")
            }
            if out.count >= slugMax { break }
        }
        let trimmed = out.trimmingCharacters(in: CharacterSet(charactersIn: "-."))
        return trimmed.isEmpty ? nil : trimmed
    }

    /// Extensions that are pictures — beam.rs `IMAGE_EXTENSIONS`. They decide
    /// only the pasted sentence here; what is beamed is decided by the gesture.
    public static let imageExtensions = [
        "png", "jpg", "jpeg", "gif", "webp", "heic", "heif", "avif", "tif", "tiff", "bmp",
    ]

    /// The template for one remote path: the file sentence for a non-picture
    /// while the template is the suggested sentence, and the template otherwise
    /// — a template someone wrote is never rewritten. beam.rs `template_for`.
    public static func template(_ template: String, for path: String) -> String {
        let ext = (path as NSString).pathExtension.lowercased()
        return template == suggestedSentence && !imageExtensions.contains(ext)
            ? fileSentenceTemplate : template
    }

    /// Renders a template's `{path}` token; a template with no token falls
    /// back to the bare path (mirrors the desktop's render_sentence).
    public static func renderSentence(template: String, path: String) -> String {
        template.contains("{path}") ? template.replacingOccurrences(of: "{path}", with: path) : path
    }

    /// Size + count of Hostbeam's own screenshots in the host's beam folder.
    public struct StorageInfo: Equatable, Sendable {
        public let count: Int
        public let bytes: UInt64
        public init(count: Int, bytes: UInt64) {
            self.count = count
            self.bytes = bytes
        }
    }

    /// Digits in a beam's stamp: epoch milliseconds, 13 of them until 2286.
    static let stampDigits = 13

    /// The cleanup scope gate: true only for names a beam creates — `hostbeam-`,
    /// then exactly the 13-digit stamp, then the end, a `.` or a `-`. The same
    /// rule as the Mac's `artifact_match` (beam.rs), since both apps read and
    /// clean the same folder.
    ///
    /// It was the prefix plus an image extension. Once any file can be beamed
    /// an extension says nothing about who made a file, and the prefix alone
    /// would match a `hostbeam-notes.txt` someone left there — so the stamp is
    /// what makes a name Hostbeam's own, for every type (owner's call,
    /// 2026-09-26). The same gate decides what `cleanup` deletes.
    public static func isBeamArtifact(_ name: String) -> Bool {
        guard name.hasPrefix("hostbeam-"), !name.contains("/") else { return false }
        let rest = name.dropFirst("hostbeam-".count)
        guard rest.prefix(while: { $0.isASCII && $0.isNumber }).count == stampDigits else {
            return false
        }
        let after = rest.dropFirst(stampDigits).first
        return after == nil || after == "." || after == "-"
    }

    /// The name a file is written under until it is complete. Hidden (a
    /// leading dot) and outside the `hostbeam-*` pattern, so nothing that
    /// reads beams sees it; unique, so no two uploads share one.
    static func temporaryName() -> String {
        ".hostbeam-\(UUID().uuidString.lowercased()).part"
    }

    /// An upload a dropped connection left behind under its temporary name.
    /// Clean up removes these too: they are Hostbeam's, and nothing else
    /// would ever remove them.
    public static func isUnfinishedUpload(_ name: String) -> Bool {
        name.hasPrefix(".hostbeam-") && name.hasSuffix(".part") && !name.contains("/")
    }

    private static func isOurs(_ name: String) -> Bool {
        isBeamArtifact(name) || isUnfinishedUpload(name)
    }

    public func storage(host: BeamHost) async throws -> StorageInfo {
        let session = try await transport.openSession(host: host)
        do {
            let files = try await session.listFiles(in: Self.dir(host))
                .filter { Self.isOurs($0.name) }
            try? await session.close()
            return StorageInfo(count: files.count, bytes: files.reduce(0) { $0 + $1.size })
        } catch {
            try? await session.close()
            throw error
        }
    }

    /// Delete Hostbeam's screenshots — and only those, with any upload a
    /// dropped connection left unfinished — from the beam folder. One
    /// directory level, Hostbeam's names only; returns how many went.
    public func cleanup(host: BeamHost) async throws -> Int {
        let session = try await transport.openSession(host: host)
        do {
            let names = try await session.listFiles(in: Self.dir(host))
                .map(\.name).filter(Self.isOurs)
            for name in names {
                try await session.removeFile(Self.dir(host) + "/" + name)
            }
            try? await session.close()
            return names.count
        } catch {
            try? await session.close()
            throw error
        }
    }

    private static func dir(_ host: BeamHost) -> String {
        host.remoteDir.hasSuffix("/") ? String(host.remoteDir.dropLast()) : host.remoteDir
    }

    /// Uploads `fileURL` to `host`. Convenience over the batch form.
    public func beam(fileURL: URL, host: BeamHost, now: Date = Date()) async throws -> BeamOutcome {
        try await beam(fileURLs: [fileURL], host: host, now: now)
    }

    /// Refused before anything is sent: a batch that is going to be refused
    /// should be refused before it has half-landed on the host.
    static func checkSizes(_ fileURLs: [URL]) throws {
        for url in fileURLs {
            let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
            if Int64(size) > maxFileBytes {
                throw BeamError.fileTooLarge(limitMB: Int(maxFileBytes / 1_048_576))
            }
        }
    }

    /// Uploads every file in `fileURLs` to `host` over one session.
    ///
    /// A counter, when one is wired (none is since ADR 0028 — the iPhone is
    /// free with no limit), is checked *before* any network work, once: one
    /// gesture is one beam however many files it carries. Only a successful
    /// beam would consume quota. On any failure the caller's clipboard is
    /// untouched (the caller only copies on success).
    ///
    /// Files are sent one at a time, each streamed in fixed-size chunks with a
    /// bounded number in flight, and never held together, which is what keeps
    /// this safe inside a share extension's memory budget however many were
    /// selected. Each is readied by `ImagePrep` first:
    /// a format a model cannot read, or a photo over `ImagePrep.maxPixelSize`, becomes a JPEG copy
    /// decoded only at that size, and the copy is gone before the next file.
    ///
    /// `names` are the files' original names, index-aligned with `fileURLs`,
    /// when the caller knows them — the share sheet does; the app's own picker
    /// hands over temporary copies whose names mean nothing. A missing or nil
    /// name gives the plain `hostbeam-<stamp>.<ext>`.
    public func beam(
        fileURLs: [URL], names: [String?] = [], host: BeamHost, now: Date = Date()
    ) async throws -> BeamOutcome {
        guard !fileURLs.isEmpty else { throw BeamError.emptyBatch }
        guard fileURLs.count <= Self.maxBatch else {
            throw BeamError.tooManyFiles(limit: Self.maxBatch)
        }
        if let counter, !counter.canBeam(now: now) {
            throw BeamError.dailyLimitReached(resetsAt: counter.nextReset(after: now))
        }
        try Self.checkSizes(fileURLs)
        let started = Date()
        let session = try await transport.openSession(host: host)
        do {
            try await session.ensureDirectory(host.remoteDir)
            // On a shared host whoever creates /tmp/hostbeam first owns it, and
            // an existing folder is accepted without a word. Beaming into someone
            // else's would let them read, replace or add to what lands there.
            guard try await session.isOwnedByLogin(host.remoteDir) else {
                throw BeamError.folderOwnedByAnotherUser
            }

            var remotePaths: [String] = []
            // Total across the gesture, for the outcome. Each file writes from
            // its own zero — a running total would put file two at the end of
            // file one and corrupt everything after the first.
            var totalBytes: UInt64 = 0
            // Every file in a batch shares one stamp, so files with the same
            // name and type collide with each other by construction. Each such
            // file resumes probing after the last one's name instead of
            // restarting at attempt 0 and re-checking what it just wrote —
            // which would also exhaust the per-file attempt budget. Kept per
            // name and type, so `report.pdf` and `data.csv` in one share are not
            // suffixed for each other.
            var attemptFloors: [String: Int] = [:]
            /// Filled only if the batch stops part-way; see `BeamOutcome.unsent`.
            var unsent: [URL] = []
            for (index, fileURL) in fileURLs.enumerated() {
                do {
                    // The name has to say what the bytes are, and the bytes have
                    // to be something an agent can read. The file's own name is
                    // evidence of neither.
                    let prepared = ImagePrep.prepare(fileURL)
                    defer {
                        if prepared.isTemporary { try? FileManager.default.removeItem(at: prepared.url) }
                    }
                    let slug = (index < names.count ? names[index] : nil).flatMap(Self.slug)
                    let floorKey = "\(slug ?? "")/\(prepared.ext ?? "")"
                    let attemptFloor = attemptFloors[floorKey] ?? 0
                    let dir = Self.dir(host)
                    let temporary = dir + "/" + Self.temporaryName()
                    let fileOffset: UInt64
                    do {
                        fileOffset = try await Self.upload(prepared.url, to: temporary, over: session)
                    } catch {
                        try? await session.removeFile(temporary)
                        throw error
                    }

                    // Now that it is whole, give it its name. A rename onto a
                    // name that exists fails without replacing anything, and
                    // only then is the name checked — so the usual case costs
                    // one request, and a clash moves on to the next suffix.
                    var chosen: String?
                    var attempt = attemptFloor
                    let ceiling = attemptFloor + Self.maxCollisionAttempts
                    while attempt < ceiling {
                        let candidate =
                            dir + "/"
                            + Self.filename(for: now, attempt: attempt, ext: prepared.ext, slug: slug)
                        do {
                            try await session.rename(temporary, to: candidate)
                            chosen = candidate
                            break
                        } catch {
                            // Not a clash: the rename failed for its own reason.
                            guard try await session.exists(candidate) else {
                                try? await session.removeFile(temporary)
                                throw error
                            }
                        }
                        attempt += 1
                    }
                    guard let remotePath = chosen else {
                        try? await session.removeFile(temporary)
                        throw BeamError.noFreeFilename
                    }
                    attemptFloors[floorKey] = attempt + 1
                    totalBytes += fileOffset
                    remotePaths.append(remotePath)
                } catch {
                    // Nothing landed: an ordinary failure, and the caller's error
                    // screen says what went wrong. Only once a file is on the
                    // host does this become a *partial* — a different thing,
                    // which an error screen would hide along with the files.
                    if remotePaths.isEmpty { throw error }
                    // Stop rather than try the rest: what breaks a transfer
                    // mid-batch is the link or the host, not this one photo, and
                    // twenty-four more attempts on a phone radio would drain the
                    // battery to fail anyway.
                    unsent = Array(fileURLs[index...])
                    break
                }
            }
            try? await session.close()

            // Once per gesture, not once per file — and a partial spent the
            // gesture just as a whole one did: files are on the host and their
            // paths are on the clipboard.
            counter?.recordSuccess(now: now)
            return BeamOutcome(
                remotePaths: remotePaths,
                sentences: remotePaths.map {
                    Self.renderSentence(template: Self.template(sentenceTemplate, for: $0), path: $0)
                },
                unsent: unsent,
                bytesSent: Int(totalBytes),
                seconds: Date().timeIntervalSince(started)
            )
        } catch {
            try? await session.close()
            throw error
        }
    }

    /// Streams `url` into a new remote file at `path`, keeping up to
    /// `writesInFlight` chunks awaiting their reply, and returns the bytes
    /// written. Each chunk carries its own offset, so the order replies come
    /// back in does not matter. The first failure cancels the writes still
    /// running and is what this throws.
    private static func upload(
        _ url: URL, to path: String,
        over session: SFTPSession
    ) async throws -> UInt64 {
        let handle = try await session.createFile(path)
        let input = try FileHandle(forReadingFrom: url)
        defer { try? input.close() }
        let written: UInt64
        do {
            written = try await withThrowingTaskGroup(of: Void.self) { group in
                var offset: UInt64 = 0
                var inFlight = 0
                while let data = try input.read(upToCount: chunkSize), !data.isEmpty {
                    if inFlight == writesInFlight {
                        try await group.next()
                        inFlight -= 1
                    }
                    let at = offset
                    group.addTask { try await handle.write(data, at: at) }
                    inFlight += 1
                    offset += UInt64(data.count)
                }
                try await group.waitForAll()
                return offset
            }
        } catch {
            try? await handle.close()
            throw error
        }
        try await handle.close()
        return written
    }
}

import BeamEngine
import Foundation
import ImageIO
import UIKit

struct BeamRecord: Codable, Identifiable {
    let id: UUID
    let sentence: String
    let hostAlias: String
    let date: Date
    /// Thumbnail filename inside the app-group thumbs dir (absent on records
    /// from before previews existed, or when generation failed).
    var thumb: String?
}

/// The recent-beams log in the app group — written by every beam surface
/// (in-app picker, share extension, App Intent) and read by the app, which
/// reloads it on foreground.
enum RecentLog {
    static let key = "recent.v1"
    /// How many beams we keep (the Home list shows the newest five).
    static let cap = 20

    static var thumbsDir: URL? {
        FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: AppGroup.suiteName)?
            .appendingPathComponent("thumbs", isDirectory: true)
    }

    static func load() -> [BeamRecord] {
        guard let data = AppGroup.defaults.data(forKey: key),
            let decoded = try? JSONDecoder().decode([BeamRecord].self, from: data)
        else { return [] }
        return decoded
    }

    static func save(_ records: [BeamRecord]) {
        AppGroup.defaults.set(try? JSONEncoder().encode(records), forKey: key)
    }

    /// Record a finished beam, thumbnailing the just-uploaded file (call
    /// before the temp file is deleted). Prunes to `cap`, removing the
    /// dropped records' thumbnails with them.
    /// One row per file, not one per gesture — sharing three photos is a single
    /// beam, but the Recent list is how you find *a* screenshot again, so each
    /// gets its own thumbnail and its own copyable path. `fileURLs` is aligned
    /// with `outcome.sentences` by index; a mismatch (a caller that could not
    /// hold on to every source file) falls back to the joined sentence on a
    /// single row rather than pairing the wrong path with the wrong picture.
    static func record(_ outcome: BeamOutcome, host: BeamHost, fileURLs: [URL?]) {
        let aligned = fileURLs.count == outcome.sentences.count
        let rows: [(String, URL?)] =
            aligned
            ? Array(zip(outcome.sentences, fileURLs))
            : [(outcome.sentence, fileURLs.first ?? nil)]
        var records = load()
        // Newest first, and within one gesture the order they were sent.
        for (sentence, fileURL) in rows.reversed() {
            records.insert(
                BeamRecord(
                    id: UUID(), sentence: sentence, hostAlias: host.alias,
                    date: Date(), thumb: fileURL.flatMap(makeThumb)), at: 0)
        }
        records.dropFirst(cap).forEach(deleteThumb)
        save(Array(records.prefix(cap)))
    }

    /// Convenience for the single-file callers, which are most of them.
    static func record(_ outcome: BeamOutcome, host: BeamHost, fileURL: URL?) {
        record(outcome, host: host, fileURLs: [fileURL])
    }

    static func remove(_ record: BeamRecord) {
        deleteThumb(record)
        save(load().filter { $0.id != record.id })
    }

    static func clear() {
        save([])
        if let dir = thumbsDir { try? FileManager.default.removeItem(at: dir) }
    }

    static func thumbURL(_ record: BeamRecord) -> URL? {
        guard let name = record.thumb, let dir = thumbsDir else { return nil }
        let url = dir.appendingPathComponent(name)
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }

    private static func deleteThumb(_ record: BeamRecord) {
        guard let name = record.thumb, let dir = thumbsDir else { return }
        try? FileManager.default.removeItem(at: dir.appendingPathComponent(name))
    }

    /// Bounded ImageIO downsample (≤480px → JPEG). This is not a full decode —
    /// ImageIO materializes only the thumbnail-sized bitmap, so it stays well
    /// inside the share extension's memory ceiling (the upload path's
    /// "stream, never decode" rule is about the full-size image).
    private static func makeThumb(_ fileURL: URL) -> String? {
        guard let dir = thumbsDir else { return nil }
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let opts: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: 480,
        ]
        guard let src = CGImageSourceCreateWithURL(fileURL as CFURL, nil),
            let cg = CGImageSourceCreateThumbnailAtIndex(src, 0, opts as CFDictionary),
            let jpeg = UIImage(cgImage: cg).jpegData(compressionQuality: 0.7)
        else { return nil }
        let name = "\(UUID().uuidString).jpg"
        do {
            try jpeg.write(to: dir.appendingPathComponent(name), options: .atomic)
            return name
        } catch {
            return nil
        }
    }
}

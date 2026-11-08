import Photos
import UIKit

enum ScreenshotSourceError: Error, CustomStringConvertible {
    case notAuthorized
    case noScreenshot
    case exportFailed

    var description: String {
        switch self {
        case .notAuthorized: return String(localized: "Open Hostbeam once and allow photo access.")
        case .noScreenshot: return String(localized: "No screenshot found in your library.")
        case .exportFailed: return String(localized: "Couldn't read the screenshot.")
        }
    }
}

/// Finds the newest screenshot in the photo library and exports it to a temp
/// file (streamed by the beamer afterwards — never decoded here). Used by the
/// App Intent's zero-tap "beam last screenshot" path.
enum ScreenshotSource {
    static func latestScreenshotFile() async throws -> URL {
        let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        let authorized: Bool
        switch status {
        case .authorized, .limited:
            authorized = true
        case .notDetermined:
            let asked = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
            authorized = asked == .authorized || asked == .limited
        default:
            authorized = false
        }
        guard authorized else { throw ScreenshotSourceError.notAuthorized }

        // Prefer the most recent screenshot (the Action-Button-after-capture
        // case); fall back to the most recent image if the library has no
        // screenshot yet, so the intent still does something sensible.
        func latest(screenshotsOnly: Bool) -> PHAsset? {
            let opts = PHFetchOptions()
            opts.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
            opts.fetchLimit = 1
            if screenshotsOnly {
                opts.predicate = NSPredicate(
                    format: "(mediaSubtype & %d) != 0",
                    PHAssetMediaSubtype.photoScreenshot.rawValue)
            }
            return PHAsset.fetchAssets(with: .image, options: opts).firstObject
        }
        guard let asset = latest(screenshotsOnly: true) ?? latest(screenshotsOnly: false) else {
            throw ScreenshotSourceError.noScreenshot
        }

        return try await withCheckedThrowingContinuation { cont in
            let o = PHImageRequestOptions()
            o.isNetworkAccessAllowed = true
            o.version = .current
            PHImageManager.default().requestImageDataAndOrientation(for: asset, options: o) { data, _, _, _ in
                guard let data else {
                    cont.resume(throwing: ScreenshotSourceError.exportFailed)
                    return
                }
                let url = FileManager.default.temporaryDirectory
                    .appendingPathComponent("beam-shot-\(UUID().uuidString).png")
                do {
                    try data.write(to: url)
                    cont.resume(returning: url)
                } catch { cont.resume(throwing: ScreenshotSourceError.exportFailed) }
            }
        }
    }
}

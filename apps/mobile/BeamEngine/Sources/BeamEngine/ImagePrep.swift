import Foundation
import ImageIO
import UniformTypeIdentifiers

/// Readies one file for the host: in a format an agent can read, named for what
/// it really is, at a size worth sending.
///
/// The name a file arrives with is not evidence of anything. The share sheet
/// hands over a photo as it is, the shortcut writes Photos data to a `.png`
/// name, and until 2026-09-13 `Beamer` streamed all of it under `.png`
/// regardless — so a camera photo, which is HEIC, reached the host as HEIC
/// inside `.png`, and an agent's image reader rejected it. The type is read
/// from the bytes here, never from the name.
///
/// ImageIO is part of iOS and macOS, so this adds no dependency. Its thumbnail
/// call decodes straight to the target size, which is what keeps a 12-megapixel
/// photo inside a share extension's memory ceiling.
public enum ImagePrep {
    /// Long-edge cap for anything re-encoded, the same as the Mac's default
    /// (config.rs). 2000 rather than 2048: once a conversation holds more than
    /// 20 images, Claude's API refuses any image over 2000 px, and with it the
    /// whole request.
    public static let maxPixelSize = 2000

    public struct Prepared: Sendable {
        /// What to upload: the original file, or a converted copy of it.
        public let url: URL
        /// The extension the remote name must carry: lower-case, no dot. Nil
        /// for a file that has none worth carrying (a `Makefile`).
        public let ext: String?
        /// A converted copy the caller must delete once it is sent.
        public let isTemporary: Bool
    }

    /// Sent in their own format. A vision request reads all three, and PNG is a
    /// screenshot's own format — a lossy pass would only soften its text. Only an
    /// oversized PNG is touched, and then only scaled (see `prepare`).
    static let untouched: [String: String] = [
        UTType.png.identifier: "png",
        UTType.gif.identifier: "gif",
        UTType.webP.identifier: "webp",
    ]

    public static func prepare(_ url: URL) -> Prepared {
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
            let type = CGImageSourceGetType(source) as String?,
            // Only a picture is prepared. ImageIO opens a PDF too, and this
            // would have sent its first page as a JPEG.
            UTType(type)?.conforms(to: .image) == true
        else {
            // Not a picture: sent exactly as it is, under its own extension
            // (ADR 0006's 2026-09-26 amendment). Until then this was named
            // `.png` whatever it was, which only never mattered because the
            // share sheet offered nothing but images.
            return Prepared(url: url, ext: carriedExtension(of: url), isTemporary: false)
        }
        let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any] ?? [:]
        let longEdge = max(
            props[kCGImagePropertyPixelWidth] as? Int ?? 0,
            props[kCGImagePropertyPixelHeight] as? Int ?? 0)

        if let ext = untouched[type] {
            // An iPhone screenshot is up to 2868 px tall, and once a conversation
            // holds more than 20 images Claude refuses any image over 2000 px, and
            // the whole request with it. So an oversized PNG is scaled, still as
            // PNG. A GIF is left alone because it may be animated, and WebP
            // because iOS has no encoder for it.
            if type == UTType.png.identifier, longEdge > maxPixelSize,
                let copy = scaledCopy(of: source, as: .png)
            {
                return Prepared(url: copy, ext: "png", isTemporary: true)
            }
            return Prepared(url: url, ext: ext, isTemporary: false)
        }

        let upright = (props[kCGImagePropertyOrientation] as? Int ?? 1) == 1
        let isJPEG = type == UTType.jpeg.identifier

        // A JPEG a model can already read, the right way up and under the cap,
        // gains nothing from a second lossy pass.
        if isJPEG, upright, longEdge <= maxPixelSize {
            return Prepared(url: url, ext: "jpg", isTemporary: false)
        }
        if let copy = scaledCopy(of: source, as: .jpeg) {
            return Prepared(url: copy, ext: "jpg", isTemporary: true)
        }
        // Conversion failed. Send the original, but name it for what it is, so
        // the agent tools describe it rather than hand it on as a broken image.
        let ext = isJPEG ? "jpg" : (UTType(type)?.preferredFilenameExtension ?? "png")
        return Prepared(url: url, ext: ext, isTemporary: false)
    }

    /// The extension a file that is not a picture keeps: plain ASCII letters
    /// and digits, at most 16, lower-cased — the Mac's `remote_extension`
    /// (beam.rs), since the name ends up in a path on someone's host. Nil when
    /// there is none, or none that plain.
    static func carriedExtension(of url: URL) -> String? {
        let ext = url.pathExtension
        guard !ext.isEmpty, ext.count <= 16,
            ext.unicodeScalars.allSatisfy({ $0.isASCII && CharacterSet.alphanumerics.contains($0) })
        else { return nil }
        return ext.lowercased()
    }

    /// A copy no larger than `maxPixelSize` on its long edge, the right way up,
    /// and carrying no metadata — so no location from a phone's camera either.
    /// JPEG for a photo; PNG for a screenshot, which a lossy pass would soften.
    static func scaledCopy(of source: CGImageSource, as type: UTType) -> URL? {
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceThumbnailMaxPixelSize: maxPixelSize,
            // The copy carries no EXIF, so the rotation a phone stores beside
            // the pixels has to be applied to them, or a portrait lands sideways.
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceShouldCacheImmediately: true,
        ]
        guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
            return nil
        }
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("beam-converted-\(UUID().uuidString).\(type.preferredFilenameExtension ?? "img")")
        guard
            let dest = CGImageDestinationCreateWithURL(
                url as CFURL, type.identifier as CFString, 1, nil)
        else { return nil }
        let encoding: [CFString: Any] =
            type == .jpeg ? [kCGImageDestinationLossyCompressionQuality: 0.85] : [:]
        CGImageDestinationAddImage(dest, image, encoding as CFDictionary)
        guard CGImageDestinationFinalize(dest) else {
            try? FileManager.default.removeItem(at: url)
            return nil
        }
        return url
    }
}

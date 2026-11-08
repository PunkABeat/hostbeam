import ImageIO
import UniformTypeIdentifiers
import XCTest

@testable import BeamEngine

/// A camera photo reached the host as HEIC bytes under a `.png` name, because
/// nothing read the type from the bytes. These are about what arrives: its
/// type, its name, its size, which way up it is, and what it no longer carries.
final class ImagePrepTests: XCTestCase {
    private let host = BeamHost(alias: "dev", hostname: "example.invalid", username: "beam")
    private let noon = Date(timeIntervalSince1970: 1_782_216_000)

    /// A `width` × `height` image encoded as `type`, with optional properties.
    private func imageFile(
        _ type: UTType, width: Int, height: Int,
        properties: [CFString: Any] = [:]
    ) throws -> URL {
        let ctx = try XCTUnwrap(
            CGContext(
                data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
                space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue))
        ctx.setFillColor(red: 0.2, green: 0.4, blue: 0.9, alpha: 1)
        ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
        let image = try XCTUnwrap(ctx.makeImage())
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("imageprep-\(UUID().uuidString).\(type.preferredFilenameExtension ?? "img")")
        guard let dest = CGImageDestinationCreateWithURL(url as CFURL, type.identifier as CFString, 1, nil) else {
            throw XCTSkip("this machine cannot encode \(type.identifier)")
        }
        CGImageDestinationAddImage(dest, image, properties as CFDictionary)
        guard CGImageDestinationFinalize(dest) else {
            throw XCTSkip("this machine cannot finish encoding \(type.identifier)")
        }
        addTeardownBlock { try? FileManager.default.removeItem(at: url) }
        return url
    }

    /// What landed on the host, read back from its bytes.
    private func inspect(_ data: Data) throws -> (type: String, width: Int, height: Int, props: [CFString: Any]) {
        let src = try XCTUnwrap(CGImageSourceCreateWithData(data as CFData, nil))
        let type = try XCTUnwrap(CGImageSourceGetType(src) as String?)
        let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any] ?? [:]
        return (
            type, props[kCGImagePropertyPixelWidth] as? Int ?? 0,
            props[kCGImagePropertyPixelHeight] as? Int ?? 0, props
        )
    }

    private func beamOne(_ url: URL) async throws -> (path: String, data: Data) {
        let transport = FakeTransport()
        let outcome = try await Beamer(transport: transport).beam(fileURL: url, host: host, now: noon)
        return (outcome.remotePath, try XCTUnwrap(transport.files[outcome.remotePath]))
    }

    func testAScreenshotIsBeamedUntouched() async throws {
        // PNG is a screenshot's own format; re-encoding would only soften its text.
        let url = try imageFile(.png, width: 924, height: ImagePrep.maxPixelSize)
        let (path, data) = try await beamOne(url)
        XCTAssertTrue(path.hasSuffix(".png"), path)
        XCTAssertEqual(data, try Data(contentsOf: url), "at the cap: byte for byte")
    }

    func testAnOversizedScreenshotIsScaledAndStaysPNG() async throws {
        // A Pro Max screenshot. Once a conversation holds more than 20 images,
        // Claude refuses anything over 2000 px, so it is scaled, and kept lossless.
        let url = try imageFile(.png, width: 1320, height: 2868)
        let (path, data) = try await beamOne(url)
        XCTAssertTrue(path.hasSuffix(".png"), path)
        let got = try inspect(data)
        XCTAssertEqual(got.type, UTType.png.identifier)
        XCTAssertEqual(got.height, ImagePrep.maxPixelSize)
        XCTAssertLessThan(got.width, got.height, "portrait stays portrait")
    }

    func testALargeGifIsLeftAlone() async throws {
        // It may be animated, and scaling would keep only its first frame.
        let url = try imageFile(.gif, width: 2600, height: 400)
        let (path, data) = try await beamOne(url)
        XCTAssertTrue(path.hasSuffix(".gif"), path)
        XCTAssertEqual(data, try Data(contentsOf: url))
    }

    func testASmallUprightJpegIsBeamedUntouched() async throws {
        let url = try imageFile(.jpeg, width: 1600, height: 1200)
        let (path, data) = try await beamOne(url)
        XCTAssertTrue(path.hasSuffix(".jpg"), path)
        XCTAssertEqual(data, try Data(contentsOf: url), "no second lossy pass")
    }

    func testAHeicPhotoArrivesAsAJpeg() async throws {
        // The reported case. Skipped where this Mac has no HEVC encoder to make
        // the fixture; the TIFF test below runs the same path everywhere.
        let url = try imageFile(.heic, width: 4032, height: 3024)
        let (path, data) = try await beamOne(url)
        XCTAssertTrue(path.hasSuffix(".jpg"), path)
        let got = try inspect(data)
        XCTAssertEqual(got.type, UTType.jpeg.identifier)
        XCTAssertEqual(max(got.width, got.height), ImagePrep.maxPixelSize)
    }

    func testAFormatAModelCannotReadArrivesAsAJpeg() async throws {
        // TIFF stands in for HEIC: every Mac can encode it, and it is equally not
        // one of the four formats a vision request accepts.
        let url = try imageFile(.tiff, width: 1000, height: 800)
        let (path, data) = try await beamOne(url)
        XCTAssertTrue(path.hasSuffix(".jpg"), path)
        let got = try inspect(data)
        XCTAssertEqual(got.type, UTType.jpeg.identifier)
        XCTAssertEqual([got.width, got.height], [1000, 800], "under the cap: never scaled, either way")
    }

    // Any file the user hands over (ADR 0006's 2026-09-26 amendment): only a
    // picture is prepared; everything else goes exactly as it is.

    /// A file named `name` holding `bytes`, in a folder of its own.
    private func namedFile(_ name: String, _ bytes: Data) throws -> URL {
        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("imageprep-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let url = dir.appendingPathComponent(name)
        try bytes.write(to: url)
        return url
    }

    func testAPdfIsSentAsItIsNeverAsAPictureOfItsFirstPage() async throws {
        // ImageIO opens a PDF, so a picture-only check would have made page one
        // a JPEG. A real PDF, so that is what is being ruled out.
        let data = NSMutableData()
        var box = CGRect(x: 0, y: 0, width: 200, height: 100)
        let consumer = try XCTUnwrap(CGDataConsumer(data: data as CFMutableData))
        let ctx = try XCTUnwrap(CGContext(consumer: consumer, mediaBox: &box, nil))
        ctx.beginPDFPage(nil)
        ctx.fill(CGRect(x: 10, y: 10, width: 50, height: 50))
        ctx.endPDFPage()
        ctx.closePDF()
        let url = try namedFile("report.pdf", data as Data)
        let (path, sent) = try await beamOne(url)
        XCTAssertTrue(path.hasSuffix(".pdf"), path)
        XCTAssertEqual(sent, data as Data)
    }

    func testAFileThatIsNotAPictureKeepsItsOwnExtension() async throws {
        let bytes = Data("name,value\nalpha,1\n".utf8)
        let (path, sent) = try await beamOne(try namedFile("Data.CSV", bytes))
        XCTAssertTrue(path.hasSuffix(".csv"), path)
        XCTAssertEqual(sent, bytes)
    }

    func testAFileWithNoExtensionGetsNone() async throws {
        let (path, _) = try await beamOne(try namedFile("Makefile", Data("all:\n".utf8)))
        let name = (path as NSString).lastPathComponent
        XCTAssertTrue(name.hasPrefix("hostbeam-"), name)
        XCTAssertFalse(name.contains("."), "no invented extension: \(name)")
    }

    func testOnlyAPlainExtensionIsCarried() {
        func ext(_ name: String) -> String? {
            ImagePrep.carriedExtension(of: URL(fileURLWithPath: "/tmp/" + name))
        }
        XCTAssertEqual(ext("a.PDF"), "pdf")
        XCTAssertEqual(ext("archive.tar.gz"), "gz")
        XCTAssertNil(ext("Makefile"))
        XCTAssertNil(ext(".env"))
        XCTAssertNil(ext("a.b c"))
        XCTAssertNil(ext("a.ñ"))
        XCTAssertNil(ext("a.abcdefghijklmnopq"), "seventeen is not an extension")
        XCTAssertEqual(ext("a.abcdefghijklmnop"), "abcdefghijklmnop")
    }

    func testALargePhotoIsShrunkToTheMacsCap() async throws {
        let url = try imageFile(.jpeg, width: 3000, height: 2000)
        let got = try inspect(try await beamOne(url).data)
        XCTAssertEqual(got.width, ImagePrep.maxPixelSize, "landscape stays landscape")
        XCTAssertLessThan(got.height, got.width)
    }

    func testARotatedPhotoArrivesTheRightWayUp() async throws {
        // A phone stores a portrait as landscape pixels plus an EXIF rotation.
        // The copy carries no metadata, so the rotation must reach the pixels or
        // the photo lands on its side — silently, and every test on size passes.
        let url = try imageFile(
            .jpeg, width: 3000, height: 1000,
            properties: [kCGImagePropertyOrientation: 6])
        let got = try inspect(try await beamOne(url).data)
        XCTAssertGreaterThan(got.height, got.width, "portrait")
        XCTAssertEqual(got.height, ImagePrep.maxPixelSize)
    }

    func testAConvertedPhotoCarriesNoLocation() async throws {
        let gps: [CFString: Any] = [
            kCGImagePropertyGPSLatitude: 48.8566, kCGImagePropertyGPSLatitudeRef: "N",
            kCGImagePropertyGPSLongitude: 2.3522, kCGImagePropertyGPSLongitudeRef: "E",
        ]
        let url = try imageFile(
            .jpeg, width: 3000, height: 2000,
            properties: [kCGImagePropertyGPSDictionary: gps])
        // A test that proves nothing survives must first have had something to lose.
        XCTAssertNotNil(
            try inspect(try Data(contentsOf: url)).props[kCGImagePropertyGPSDictionary],
            "fixture has no location to strip")
        let got = try inspect(try await beamOne(url).data)
        XCTAssertNil(got.props[kCGImagePropertyGPSDictionary])
    }

    func testTheConvertedCopyIsDeleted() async throws {
        let tmp = FileManager.default.temporaryDirectory.path
        func copies() throws -> Int {
            try FileManager.default.contentsOfDirectory(atPath: tmp)
                .filter { $0.hasPrefix("beam-converted-") }.count
        }
        let before = try copies()
        _ = try await beamOne(try imageFile(.tiff, width: 400, height: 300))
        XCTAssertEqual(try copies(), before, "twenty shared photos must not leave twenty copies")
    }

    func testOneBeamCanMixTypesAndStillShareAStamp() async throws {
        // A screenshot and a photo shared together: each named by its own type,
        // both under the one stamp the agent tools group a beam by.
        let transport = FakeTransport()
        let outcome = try await Beamer(transport: transport).beam(
            fileURLs: [
                try imageFile(.png, width: 300, height: 600),
                try imageFile(.tiff, width: 400, height: 300),
            ],
            host: host, now: noon)
        let names = outcome.remotePaths.map { ($0 as NSString).lastPathComponent }
        XCTAssertEqual(names.map { ($0 as NSString).pathExtension }, ["png", "jpg"])
        let stamps = Set(names.map { String($0.dropFirst("hostbeam-".count).prefix { $0.isNumber }) })
        XCTAssertEqual(stamps.count, 1, "\(names)")
    }
}

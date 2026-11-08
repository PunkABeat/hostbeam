import AppIntents
import Foundation

/// The Control's trigger (iOS 18): the canonical open-the-app-somewhere
/// pattern — return an OpenURLIntent riding the same hostbeam://beam-last
/// deep link the widget uses, one code path for both entry points. Hidden
/// from Shortcuts: the background BeamLastScreenshotIntent in the app is
/// the discoverable one.
///
/// Compiled into BOTH the widget extension and the app (project.yml adds
/// this file to the app target). `openAppWhenRun` means the system opens
/// the app and performs the intent *there*, so the app must know the type;
/// when it lived only in the extension, the app had no such intent in its
/// metadata and a tap on the control did nothing at all — under dev signing
/// and under App Store signing alike (verified on TestFlight, 2026-09-04).
@available(iOS 18.0, *)
struct BeamLastScreenshotInAppIntent: AppIntent {
    static let title: LocalizedStringResource = "Beam last screenshot"
    static let openAppWhenRun: Bool = true
    static let isDiscoverable: Bool = false

    @MainActor
    func perform() async throws -> some IntentResult & OpensIntent {
        .result(opensIntent: OpenURLIntent(URL(string: "hostbeam://beam-last")!))
    }
}

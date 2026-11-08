import AppIntents
import BeamEngine
import UIKit

/// The mobile equivalent of the Mac hotkey: beam the most recent screenshot
/// to the default host and put the paste-ready sentence on the clipboard —
/// with no taps, from the Action Button, a widget, Control Center, or
/// Shortcuts. Runs in the app's process in the background (no UI).
struct BeamLastScreenshotIntent: AppIntent {
    static let title: LocalizedStringResource = "Beam last screenshot"
    static let description = IntentDescription(
        "Sends your most recent screenshot to your default SSH host and copies a paste-ready path for your coding agent."
    )
    static let openAppWhenRun = false

    /// Optional on purpose: left empty this is the gesture it always was, to
    /// whichever host is current. Filled in, one shortcut can send somewhere
    /// specific without changing what the phone does next time — the same
    /// distinction the Mac draws between beaming and switching host.
    @Parameter(title: "Host", description: "Leave empty to use your current host.")
    var host: BeamHostEntity?

    static var parameterSummary: some ParameterSummary {
        Summary("Beam last screenshot to \(\.$host)")
    }

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let host: BeamHost
        switch SharedHosts.choose(self.host?.id) {
        case .host(let chosen):
            host = chosen
        case .none:
            throw AppIntentError.message(String(localized: "Open Hostbeam and add a host first."))
        case .missing:
            // Not a fallback to the default: this used to beam there instead
            // and say so afterwards, but by then the screenshot was on a
            // server the shortcut never named.
            let named = self.host?.alias ?? ""
            throw AppIntentError.message(
                String(
                    localized:
                        "\(named) isn't in Hostbeam any more. Edit the shortcut to choose another host. Nothing was sent."
                ))
        }
        let url: URL
        do {
            url = try await ScreenshotSource.latestScreenshotFile()
        } catch let e as ScreenshotSourceError {
            throw AppIntentError.message(e.description)
        }
        defer { try? FileManager.default.removeItem(at: url) }
        do {
            let outcome = try await BeamService.beam(fileURL: url, host: host)
            UIPasteboard.general.string = outcome.sentence
            RecentLog.record(outcome, host: host, fileURL: url)
            return .result(dialog: "Sent to \(host.alias) — paste it to your agent.")
        } catch {
            // The same sentences the app and the share sheet show.
            throw AppIntentError.message(BeamFailure.from(error, host: host).sentence)
        }
    }
}

/// Small typed wrapper so thrown messages surface cleanly in Shortcuts/Siri.
enum AppIntentError: Error, CustomLocalizedStringResourceConvertible {
    case message(String)
    var localizedStringResource: LocalizedStringResource {
        switch self {
        case .message(let m): return "\(m)"
        }
    }
}

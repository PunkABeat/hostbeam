import BeamEngine
import Foundation

/// How a failed beam reads, wherever it failed: the app's card, the share
/// sheet, Shortcuts, and a Test connection. One mapping, because three copies
/// of it had already drifted — Shortcuts showed three of these errors as the
/// engine's debug text while the app and the share sheet explained them.
///
/// Compiled into every target that beams (it lives in `Shared/`). A new
/// `BeamError` case gets its sentence here and nowhere else.
struct BeamFailure: Equatable {
    let title: String
    /// Data the title does not already say — a path, a count, the library's
    /// own words for an error nobody has named — shown small and monospaced.
    /// Never an English restatement of the title: that read as English in
    /// every other language (docs/process/ios-code-review-2026-09.md § B3).
    let detail: String?
    /// What to do next.
    let hint: String?

    /// One line for surfaces with a single message: Shortcuts and Siri.
    var sentence: String {
        [title, hint].compactMap { $0 }.joined(separator: " ")
    }

    // Exhaustive on purpose: a new BeamError case does not compile here until
    // it has its own wording.
    static func from(_ error: Error, host: BeamHost) -> BeamFailure {
        guard let beamError = error as? BeamError else {
            return BeamFailure(
                title: String(localized: "\(host.alias) didn't answer."),
                detail: error.localizedDescription,
                hint: String(localized: "Check the connection, then beam again."))
        }
        switch beamError {
        // Unreachable on the iPhone: no beam is metered (ADR 0028 §4), so
        // nothing passes the engine a counter. Worded anyway, because the
        // engine still has the case.
        case .dailyLimitReached(let resetsAt):
            return BeamFailure(
                title: String(localized: "Daily beams used."),
                detail: nil,
                hint: String(
                    localized:
                        "Free beams reset \(resetsAt.formatted(date: .omitted, time: .shortened)). Your clipboard is untouched."
                ))
        case .tooManyFiles(let limit):
            return BeamFailure(
                title: String(localized: "That is a lot of files at once."),
                detail: String(localized: "Hostbeam beams up to \(limit) at a time. Nothing was sent."),
                hint: String(localized: "Share them in smaller batches — each batch is still one beam."))
        case .hostKeyMismatch:
            return BeamFailure(
                title: String(localized: "\(host.alias)'s key changed — refused for safety."),
                detail: nil,
                hint: String(localized: "If you rebuilt this server, re-trust it in Hosts."))
        case .unsupportedServer(let detail):
            return BeamFailure(
                title: String(localized: "This server's SSH setup isn't supported yet."),
                detail: detail, hint: nil)
        case .authRejected:
            return BeamFailure(
                title: String(localized: "\(host.alias) refused this iPhone's key."),
                detail: nil,
                hint: String(localized: "Authorize this iPhone on the host, then beam again."))
        case .folderOwnedByAnotherUser:
            return BeamFailure(
                title: String(localized: "The remote folder belongs to another user."),
                detail: host.remoteDir,
                hint: String(localized: "Nothing was sent. Choose a folder of your own for this host."))
        case .deviceKeyMissing:
            return BeamFailure(
                title: String(localized: "This iPhone has no Hostbeam key yet."),
                detail: nil,
                hint: String(localized: "Open Hostbeam and finish setup, then try again."))
        case .emptyBatch:
            return BeamFailure(
                title: String(localized: "Nothing to beam."),
                detail: nil,
                hint: String(localized: "Share an image or a file."))
        case .fileTooLarge(let limitMB):
            return BeamFailure(
                title: String(localized: "That file is too large to beam."),
                detail: nil,
                hint: String(localized: "Hostbeam beams files up to \(limitMB) MB. Nothing was sent."))
        case .noFreeFilename:
            return BeamFailure(
                title: String(localized: "Couldn't find a free file name on \(host.alias)."),
                detail: host.remoteDir,
                hint: String(localized: "Beam again in a moment."))
        }
    }
}

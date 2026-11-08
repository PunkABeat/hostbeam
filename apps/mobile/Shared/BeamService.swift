import BeamEngine
import Foundation

/// Wires the shared device key and host-key store into a Beamer. Used by both
/// the app (picker beam) and — via the same BeamEngine — the share extension.
enum BeamService {
    static func makeBeamer() throws -> Beamer {
        // load, never loadOrCreate: if this process cannot reach the shared
        // access group we must fail, not mint a second identity that no host
        // has authorized (the share extension did exactly that on device).
        guard let key = try DeviceKey.load() else { throw BeamError.deviceKeyMissing }
        let transport = CitadelTransport(privateKey: key, hostKeys: AppGroup.hostKeys())
        // No counter: the iPhone is free with no limit (ADR 0028 §4), so no
        // beam is ever metered — from the app, the extensions or Shortcuts.
        // `Beamer` still takes one; `BeamCounter` stays in the engine, unwired.
        return Beamer(
            transport: transport, counter: nil,
            sentenceTemplate: AppGroup.sentenceTemplate)
    }

    static func beam(fileURL: URL, host: BeamHost) async throws -> BeamOutcome {
        let outcome = try await makeBeamer().beam(fileURL: fileURL, host: host)
        AppGroup.reviewPrompt().recordSuccess()
        return outcome
    }

    /// Several files as one beam — sharing a handful of photos is one gesture
    /// (next.md § 6). `names` are the files'
    /// original names when the caller knows them (the share sheet), carried
    /// into the remote names as the Mac carries them.
    static func beam(fileURLs: [URL], names: [String?] = [], host: BeamHost) async throws
        -> BeamOutcome
    {
        let outcome = try await makeBeamer().beam(fileURLs: fileURLs, names: names, host: host)
        // Counted here, the one path every beam takes (app, extensions,
        // Shortcuts), so the rating prompt sees them all (ADR 0023).
        AppGroup.reviewPrompt().recordSuccess()
        return outcome
    }
}

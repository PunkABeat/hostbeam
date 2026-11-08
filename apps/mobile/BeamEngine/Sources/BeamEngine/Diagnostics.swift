import Foundation

/// One row of a host's diagnostics, as data. The engine says *what* it found;
/// the app says it, in the user's language. (Until 2026-09-23 the engine
/// returned English labels and details, and every locale's diagnostics read
/// in English — docs/process/ios-code-review-2026-09.md § B3.)
public struct DiagnosticStep: Equatable, Sendable, Identifiable {
    public enum Check: String, Equatable, Sendable {
        /// Reachable and authenticated: with publickey auth these resolve
        /// together, so they are one step.
        case connection = "conn"
        case folder
        case latency
    }

    public enum Status: Equatable, Sendable { case ok, fail, skip }

    public enum Detail: Equatable, Sendable {
        /// The key type that authenticated ("ed25519").
        case keyType(String)
        /// The folder that is ready.
        case folder(String)
        /// The folder exists but another account owns it.
        case folderNotOwned(String)
        case latency(milliseconds: Int)
        /// A failure the engine recognises.
        case error(BeamError)
        /// Anything else, as the underlying library described it. Technical;
        /// shown verbatim.
        case unrecognised(String)

        static func from(_ error: Error) -> Detail {
            (error as? BeamError).map(Detail.error) ?? .unrecognised(String(describing: error))
        }
    }

    public let check: Check
    public let status: Status
    public let detail: Detail?

    public var id: String { check.rawValue }

    public init(_ check: Check, _ status: Status, _ detail: Detail? = nil) {
        self.check = check
        self.status = status
        self.detail = detail
    }
}

extension Beamer {
    /// The Hosts-pane diagnostics (design doc §5.3): reachable+auth → folder
    /// writable → round-trip latency. A connection failure skips the rest,
    /// matching the desktop's skip behavior.
    public func diagnose(host: BeamHost) async -> [DiagnosticStep] {
        let start = Date()
        let session: SFTPSession
        do {
            session = try await transport.openSession(host: host)
        } catch {
            return [
                .init(.connection, .fail, .from(error)),
                .init(.folder, .skip),
                .init(.latency, .skip),
            ]
        }
        let connMs = Int(Date().timeIntervalSince(start) * 1000)
        var folderStep: DiagnosticStep
        do {
            try await session.ensureDirectory(host.remoteDir)
            folderStep =
                try await session.isOwnedByLogin(host.remoteDir)
                ? .init(.folder, .ok, .folder(host.remoteDir))
                : .init(.folder, .fail, .folderNotOwned(host.remoteDir))
        } catch {
            folderStep = .init(.folder, .fail, .from(error))
        }
        try? await session.close()
        return [
            .init(.connection, .ok, .keyType("ed25519")),
            folderStep,
            .init(.latency, .ok, .latency(milliseconds: connMs)),
        ]
    }
}

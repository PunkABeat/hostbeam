import BeamEngine
import Foundation
import Observation

/// Passive per-host reachability for the status dots, and the one question
/// the authorize step asks of it. Probes run only from visible surfaces
/// (list/home/detail appear, pull-to-refresh) — never on a background
/// schedule; radios and battery are the phone's, not ours.
///
/// Its own type since 2026-09-24 (it was a quarter of `AppStore`,
/// docs/process/ios-code-review-2026-09.md § B5). `@Observable`, so a view
/// that reads one host's state re-renders when that state changes, through
/// `store.reachability` like anything else.
@MainActor
@Observable
final class Reachability {
    enum Reach: Equatable {
        case checking
        case ok(Date)
        /// `refusedKey` separates "the host answered and rejected this iPhone's
        /// key" from "we never got an answer". The dot is red either way, but
        /// only the first is evidence about authorization — the second is
        /// evidence about nothing, and telling someone to install a key on a
        /// host that never replied sends them to fix the wrong thing.
        case fail(Date, refusedKey: Bool)
    }

    /// What the authorize step has to do for a host — the three answers the
    /// question actually has, rather than a Bool that has to fold "no" and
    /// "cannot tell" together.
    enum AuthorizeNeed { case none, needsKey, cannotTell }

    /// The latest answer for each host.
    private(set) var states: [UUID: Reach] = [:]

    subscript(id: UUID) -> Reach? { states[id] }

    /// Fresh-enough window; within it a probe request is a no-op.
    static let freshFor: TimeInterval = 120

    /// How the check is made: a connection with this iPhone's key that makes
    /// the folder — for the phone, a successful verify *is* the authorization
    /// answer. A test passes its own.
    @ObservationIgnored private let check: @MainActor (BeamHost) async throws -> Void
    /// Where a host lives now, so an answer about an address it no longer has
    /// is dropped. The store passes its own lookup.
    @ObservationIgnored private let currentAddress: @MainActor (UUID) -> BeamHost?
    /// How long a probe may run before the dot stops claiming to be checking.
    /// The transport gives up on a connection after
    /// `CitadelTransport.connectTimeout` (10 s); this is the backstop for
    /// anything that hangs after that, so a dot never keeps promising an
    /// answer it will not produce. Generous: a backstop, not a latency budget.
    @ObservationIgnored private let timeout: Duration

    /// The probe in flight for each host, so a caller that needs the answer
    /// can await one already running instead of being told there is nothing
    /// to wait for.
    @ObservationIgnored private var probes: [UUID: Task<Void, Never>] = [:]

    init(
        check: @escaping @MainActor (BeamHost) async throws -> Void = { host in
            try await BeamService.makeBeamer().verify(host: host)
        },
        currentAddress: @escaping @MainActor (UUID) -> BeamHost?,
        timeout: Duration = .seconds(15)
    ) {
        self.check = check
        self.currentAddress = currentAddress
        self.timeout = timeout
    }

    /// Records an answer something else got — a Test connection, a
    /// diagnostics run, a beam — which is fresher evidence than any probe.
    func record(_ id: UUID, _ reach: Reach) {
        states[id] = reach
    }

    /// Everything known was about an address the host no longer has,
    /// including a probe still in flight to it.
    func forget(_ id: UUID) {
        states[id] = nil
        probes[id] = nil
    }

    @discardableResult
    func probe(_ host: BeamHost, force: Bool = false) -> Task<Void, Never>? {
        switch states[host.id] {
        case .checking:
            return probes[host.id]
        case .ok(let at), .fail(let at, _):
            if !force, Date().timeIntervalSince(at) < Self.freshFor { return nil }
        case nil:
            break
        }
        states[host.id] = .checking
        let task = Task {
            let answer: Reach
            do {
                try await check(host)
                answer = .ok(Date())
            } catch {
                answer = .fail(Date(), refusedKey: (error as? BeamError) == .authRejected)
            }
            // An answer about an address the host no longer has would paint
            // the new one's dot, and clear the probe that is really checking it.
            guard sameAddress(host) else { return }
            states[host.id] = answer
            probes[host.id] = nil
        }
        // Safe before the body can run: the task inherits this main actor, so
        // it cannot start until this synchronous call returns.
        probes[host.id] = task
        // The backstop. It fires only if *this* probe is still the one in
        // flight: a finished probe clears `probes`, and a superseding one
        // replaces it, so neither can be clobbered by an old watchdog.
        Task {
            try? await Task.sleep(for: timeout)
            guard probes[host.id] == task else { return }
            states[host.id] = .fail(Date(), refusedKey: false)
            probes[host.id] = nil
        }
        return task
    }

    func probeAll(_ hosts: [BeamHost], force: Bool = false) {
        for host in hosts { probe(host, force: force) }
    }

    /// Pull-to-refresh: forces every host and waits, so the spinner reflects
    /// real work.
    func probeAllAndWait(_ hosts: [BeamHost]) async {
        let tasks = hosts.compactMap { probe($0, force: true) }
        for task in tasks { await task.value }
    }

    /// What the "authorize this iPhone" step has to do for `host`.
    ///
    /// Asked, not assumed. The Mac can install this iPhone's key on a host from
    /// a device it remembers (ADR 0018), so by the time a host is saved the work
    /// may already be done — and a screen whose entire content is "nothing to do
    /// here" is a step, not an answer. It reuses the probe rather than opening a
    /// second connection: both would ask the same question.
    ///
    /// Bounded, because it decides whether a screen appears and nobody should
    /// wait on it. The wait is a poll rather than a race against a sleep: a
    /// probe cannot be cancelled once started, so the honest thing is to stop
    /// waiting for it rather than pretend it stopped. It keeps running, and
    /// the dot still updates when it lands.
    /// `force` asks again even inside the freshness window — for "Check
    /// again", when the answer may have changed a moment ago on the Mac.
    func authorizeNeed(for host: BeamHost, within seconds: Double = 4, force: Bool = false) async
        -> AuthorizeNeed
    {
        probe(host, force: force)
        let deadline = Date().addingTimeInterval(seconds)
        while case .checking = states[host.id] ?? .checking {
            if Date() >= deadline { return .cannotTell }
            try? await Task.sleep(for: .milliseconds(80))
        }
        switch states[host.id] {
        case .ok:
            return .none
        case .fail(_, let refusedKey):
            // Only a refusal is evidence. Anything else — no answer, a folder
            // it could not make, a host key it would not accept — leaves the
            // question genuinely open, and saying "add the key" would be a
            // guess dressed as an instruction.
            return refusedKey ? .needsKey : .cannotTell
        default:
            return .cannotTell
        }
    }

    /// Whether `host` still points where it did when a probe of it started.
    private func sameAddress(_ host: BeamHost) -> Bool {
        guard let now = currentAddress(host.id) else { return false }
        return now.hostname == host.hostname && now.port == host.port
            && now.username == host.username
    }
}

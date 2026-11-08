import BeamEngine
import Combine
import Crypto
import Foundation
import UIKit
import WidgetKit

/// App-level state: the host list, the recent-beam log, and access to the
/// shared device key. Hosts and history persist in the app-group defaults;
/// the private key lives only in the Keychain.
@MainActor
final class AppStore: ObservableObject {
    @Published var hosts: [BeamHost] = []
    @Published var defaultHostID: UUID?
    @Published var recent: [BeamRecord] = []

    /// A host from a pairing link (`https://hostbeam.app/add#…`, the Mac's QR
    /// opened by the Camera app) waiting for a screen to show it. Set by
    /// `RootView.onOpenURL`; taken by whichever of onboarding, the empty state
    /// or the Hosts list is in front, each in the confirm form a scan uses.
    @Published var incomingLink: BeamHost?

    /// The hosts' status dots and the authorize step's question
    /// (`Reachability`). Observable on its own, so a dot re-renders when its
    /// host's state changes.
    private(set) lazy var reachability = Reachability(currentAddress: { [weak self] id in
        self?.hosts.first { $0.id == id }
    })

    func takeIncomingLink() -> BeamHost? {
        defer { incomingLink = nil }
        return incomingLink
    }

    private let defaults = AppGroup.defaults
    private let hostsKey = SharedHosts.hostsKey
    private let defaultKey = SharedHosts.defaultKey

    init() {
        load()
        // Mint the device identity here, in the app, once — rather than leaving
        // it to whichever screen happens to call `deviceKey()` first.
        //
        // `BeamService.makeBeamer` deliberately uses `DeviceKey.load()`, never
        // `loadOrCreate`: a process that cannot reach the shared access group
        // must fail rather than mint a second identity no host has authorized
        // (the share extension did exactly that on device — milestone 008). But
        // that safety property left a hole at the other end: on a fresh install
        // the key does not exist until the onboarding authorize step or the
        // device-key screen is opened, so anyone who reaches a host without
        // passing through one of them gets `deviceKeyMissing` on every beam —
        // surfaced as "couldn't reach the host", about a host that is answering
        // perfectly.
        //
        // The app is the only process allowed to create the identity; the
        // extensions still only ever load it. Doing it at launch means it
        // exists before anything can want it.
        _ = try? DeviceKey.loadOrCreate()
        // The share extension and the intent append to the shared log while
        // the app is inactive — refresh whenever we come back.
        NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main
        ) { [weak self] _ in
            Task { @MainActor in self?.recent = RecentLog.load() }
        }
        // No license revalidation: the license is Mac-only (ADR 0028 §4).
    }

    var defaultHost: BeamHost? {
        hosts.first { $0.id == defaultHostID } ?? hosts.first
    }

    func addHost(_ host: BeamHost) {
        // Having a host is what onboarding exists to achieve, so reaching one by
        // any route counts as done. Without this a user who added a host mid-
        // onboarding and left was still flagged un-onboarded, and deleting that
        // host dropped them back into first-run.
        AppGroup.defaults.set(true, forKey: "onboarded")
        hosts.append(host)
        if defaultHostID == nil { defaultHostID = host.id }
        save()
        // Find out now rather than leaving an unknown dot until the user thinks
        // to press Test. Adding a host is the moment they most want to know it
        // works, and grey beside a perfectly reachable host reads as a problem.
        reachability.probe(host)
    }

    func removeHost(_ host: BeamHost) {
        hosts.removeAll { $0.id == host.id }
        AppGroup.hostKeys().unpin(host)
        if defaultHostID == host.id { defaultHostID = hosts.first?.id }
        save()
    }

    func setDefault(_ host: BeamHost) {
        defaultHostID = host.id
        // The one fact the widget shows, so the one place that reloads it.
        WidgetCenter.shared.reloadAllTimelines()
        save()
    }

    func updateHost(_ host: BeamHost) {
        guard let i = hosts.firstIndex(where: { $0.id == host.id }) else { return }
        hosts[i] = host
        save()
    }

    /// Points a host at a new address and keeps everything that belongs to the
    /// host rather than to the address: its name, folder, default status and —
    /// on purpose — its pinned host key. The same server at a new address (a
    /// renewed DHCP lease, a moved VM) therefore just works, and a different
    /// server behind it is refused on the next connection as a changed key,
    /// never trusted quietly. The address could not be edited at all before
    /// this; a Mac whose LAN IP moved left its phone with no fix but removing
    /// the host.
    func updateAddress(of host: BeamHost, hostname: String, port: Int, username: String) {
        guard var h = hosts.first(where: { $0.id == host.id }) else { return }
        h.hostname = hostname
        h.port = port
        h.username = username
        updateHost(h)
        // Everything known about reachability was about the old address,
        // including a probe still in flight to it.
        reachability.forget(h.id)
        reachability.probe(h)
    }

    /// Call before the temp files are deleted so the thumbnails can be made.
    /// One row per file: a share of three photos is one beam, but three things
    /// to find again.
    func recordBeam(_ outcome: BeamOutcome, host: BeamHost, fileURLs: [URL?]) {
        RecentLog.record(outcome, host: host, fileURLs: fileURLs)
        recent = RecentLog.load()
    }

    func recordBeam(_ outcome: BeamOutcome, host: BeamHost, fileURL: URL?) {
        recordBeam(outcome, host: host, fileURLs: [fileURL])
    }

    func removeRecent(_ record: BeamRecord) {
        RecentLog.remove(record)
        recent = RecentLog.load()
    }

    func clearRecents() {
        RecentLog.clear()
        recent = []
    }

    /// The dedicated device key (generated on first read).
    func deviceKey() throws -> Curve25519.Signing.PrivateKey {
        try DeviceKey.loadOrCreate()
    }

    private func load() {
        if let data = defaults.data(forKey: hostsKey),
            let decoded = try? JSONDecoder().decode([BeamHost].self, from: data)
        {
            hosts = decoded
        }
        if let s = defaults.string(forKey: defaultKey) { defaultHostID = UUID(uuidString: s) }
        recent = RecentLog.load()
    }

    private func save() {
        defaults.set(try? JSONEncoder().encode(hosts), forKey: hostsKey)
        defaults.set(defaultHostID?.uuidString, forKey: defaultKey)
    }
}

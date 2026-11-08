import BeamEngine
import Foundation

/// Reads the host list the app persisted in the shared app-group defaults
/// (same keys AppStore writes). Used by the share extension and the App
/// Intent, both of which may run without the app's AppStore instantiated.
enum SharedHosts {
    static let hostsKey = "hosts.v1"
    static let defaultKey = "defaultHostID"

    static func all() -> [BeamHost] {
        guard let data = AppGroup.defaults.data(forKey: hostsKey),
            let hosts = try? JSONDecoder().decode([BeamHost].self, from: data)
        else { return [] }
        return hosts
    }

    /// Where a beam that names `requested` (or nothing) should go.
    enum Choice: Equatable {
        case host(BeamHost)
        /// No hosts at all.
        case none
        /// A host was named and is no longer here. Never a fallback to the
        /// default: that put a screenshot on a server nobody chose.
        case missing
    }

    /// Pure, so the rule is tested without the app group.
    static func choose(_ requested: UUID?, among hosts: [BeamHost], defaultID: UUID?) -> Choice {
        if let requested {
            return hosts.first(where: { $0.id == requested }).map(Choice.host) ?? .missing
        }
        guard let first = hosts.first else { return .none }
        return .host(hosts.first(where: { $0.id == defaultID }) ?? first)
    }

    static func choose(_ requested: UUID?) -> Choice {
        choose(
            requested, among: all(),
            defaultID: AppGroup.defaults.string(forKey: defaultKey).flatMap(UUID.init(uuidString:)))
    }

    static func defaultHost() -> BeamHost? {
        let hosts = all()
        guard !hosts.isEmpty else { return nil }
        if let idString = AppGroup.defaults.string(forKey: defaultKey),
            let id = UUID(uuidString: idString),
            let match = hosts.first(where: { $0.id == id })
        {
            return match
        }
        return hosts.first
    }
}

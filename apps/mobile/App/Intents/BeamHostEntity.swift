import AppIntents
import BeamEngine

/// A host, as Shortcuts and Siri see it.
///
/// Without this the only intent could beam to the current host and nowhere
/// else, so "send this to prod" meant opening the app and switching first —
/// and an automation could not target a host at all. The entity reads the
/// same app-group list every other surface reads, so Shortcuts can only ever
/// offer hosts that have actually been added on this phone.
struct BeamHostEntity: AppEntity {
    let id: UUID
    let alias: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation { "Host" }
    var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(alias)") }
    static let defaultQuery = BeamHostQuery()
}

struct BeamHostQuery: EntityQuery {
    func entities(for identifiers: [BeamHostEntity.ID]) async throws -> [BeamHostEntity] {
        SharedHosts.all()
            .filter { identifiers.contains($0.id) }
            .map { BeamHostEntity(id: $0.id, alias: $0.alias) }
    }

    /// What the picker lists. A host removed from the app disappears from
    /// here too, rather than lingering in a shortcut that would fail.
    func suggestedEntities() async throws -> [BeamHostEntity] {
        SharedHosts.all().map { BeamHostEntity(id: $0.id, alias: $0.alias) }
    }
}

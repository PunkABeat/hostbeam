import AppIntents

/// Exposes the beam intent to Shortcuts, Spotlight, and the Action Button
/// with spoken/typed phrases. `\(.applicationName)` lets users say
/// "Beam last screenshot with Hostbeam".
struct HostbeamShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: BeamLastScreenshotIntent(),
            phrases: [
                "Beam last screenshot with \(.applicationName)",
                "Beam my screenshot with \(.applicationName)",
                "\(.applicationName) beam screenshot",
            ],
            shortTitle: "Beam last screenshot",
            systemImageName: "paperplane.fill"
        )
    }
}

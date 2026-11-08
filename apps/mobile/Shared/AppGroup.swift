import BeamEngine
import Foundation

/// Shared identifiers so the app and the share extension use the same
/// Keychain access group and UserDefaults suite (they must read the same
/// device key, pinned host keys and settings).
enum AppGroup {
    // Real app group + Keychain group are set once the Apple Developer team id
    // exists (Milestone 008 / Phase 2). Until then the standard suite works in
    // the simulator so the slice is testable.
    static let suiteName = "group.app.hostbeam"

    /// One shared instance, not a fresh one per access: @AppStorage observes
    /// the instance it was given, so a write through a *different* instance
    /// of the same suite never notifies it (the appearance picker looked like
    /// it needed an app restart). Cross-process freshness is unaffected —
    /// UserDefaults syncs with the backing store either way.
    ///
    /// `nonisolated(unsafe)` because UserDefaults is thread-safe — Apple
    /// documents it so — but not marked `Sendable`, and every process here
    /// reads it from more than one thread.
    nonisolated(unsafe) static let defaults: UserDefaults = UserDefaults(suiteName: suiteName) ?? .standard

    static func counter() -> BeamCounter { BeamCounter(defaults: defaults) }
    static func license() -> LicenseStore { LicenseStore(defaults: defaults) }
    static func hostKeys() -> HostKeyStore { HostKeyStore(defaults: defaults) }
    static func reviewPrompt() -> ReviewPrompt { ReviewPrompt(defaults: defaults) }

    // Settings keys shared with the app's SettingsStore.
    static let sentenceKey = "settings.sentence"
    static let folderKey = "settings.folder"
    /// "system" | "light" | "dark" — mirrors the desktop's appearance setting.
    static let appearanceKey = "settings.appearance"

    /// The folder a new host starts with: Settings → Default remote folder,
    /// else `/tmp/hostbeam`. Each host keeps its own once added.
    static var defaultFolder: String {
        let set = defaults.string(forKey: folderKey)?.trimmingCharacters(in: .whitespaces) ?? ""
        return set.isEmpty ? "/tmp/hostbeam" : set
    }

    /// Written with every save of the sentence since 2026-09-28, when "just
    /// the path" became the default: a sentence saved since was chosen.
    static let pathDefaultKey = "settings.pathDefault"

    static var sentenceTemplate: String {
        Beamer.template(
            saved: defaults.string(forKey: sentenceKey), chosenSince: defaults.bool(forKey: pathDefaultKey))
    }
}

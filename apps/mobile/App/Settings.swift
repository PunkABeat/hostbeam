import BeamEngine
import Combine
import Foundation

/// User settings persisted in the app-group suite (read by the app, share
/// extension, and intent via BeamService / AppGroup). Slice 5: the
/// paste-ready sentence template and the default remote folder.
@MainActor
final class SettingsStore: ObservableObject {
    @Published var sentenceTemplate: String {
        didSet {
            AppGroup.defaults.set(sentenceTemplate, forKey: AppGroup.sentenceKey)
            AppGroup.defaults.set(true, forKey: AppGroup.pathDefaultKey)
        }
    }
    @Published var defaultFolder: String {
        didSet { AppGroup.defaults.set(defaultFolder, forKey: AppGroup.folderKey) }
    }

    init() {
        sentenceTemplate = AppGroup.sentenceTemplate
        defaultFolder = AppGroup.defaultFolder
    }
}

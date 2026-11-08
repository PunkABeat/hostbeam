import BeamEngine
import UIKit

/// The app's own entries in the Home Screen long-press menu (ADR 0023). Beam last
/// screenshot, the everyday action, comes first. Send feedback comes last, next
/// to Apple's Share App, Edit Home Screen and Remove App: the one moment someone
/// about to delete Hostbeam is still looking at it.
///
/// Set in code at launch rather than declared in Info.plist, so the titles come
/// from the same string catalog as the rest of the app. The trade is that they
/// appear after the first launch, which anyone deleting the app has had.
enum QuickAction: String {
    case beamLast = "app.hostbeam.ios.quick.beam-last"
    case feedback = "app.hostbeam.ios.quick.feedback"

    @MainActor static func install() {
        UIApplication.shared.shortcutItems = [
            UIApplicationShortcutItem(
                type: QuickAction.beamLast.rawValue,
                localizedTitle: String(localized: "Beam last screenshot"),
                localizedSubtitle: nil,
                icon: UIApplicationShortcutIcon(systemImageName: "arrow.up.circle"),
                userInfo: nil),
            UIApplicationShortcutItem(
                type: QuickAction.feedback.rawValue,
                localizedTitle: String(localized: "Send feedback"),
                localizedSubtitle: String(localized: "Goes straight to the developer"),
                icon: UIApplicationShortcutIcon(systemImageName: "envelope"),
                userInfo: nil),
        ]
    }

    /// Where the action goes. Beaming opens the app's own `hostbeam://beam-last`
    /// link, the path the widget and the Control already take, so there is one
    /// beam-last flow rather than two. Feedback is the same mail as Settings →
    /// Send feedback, subject and all.
    var url: URL? {
        switch self {
        case .beamLast:
            return URL(string: "hostbeam://beam-last")
        case .feedback:
            let info = Bundle.main.infoDictionary
            let version = info?["CFBundleShortVersionString"] as? String ?? "0.1.0"
            let build = info?["CFBundleVersion"] as? String ?? "1"
            let subject =
                "Hostbeam iOS \(version) (\(build))"
                .addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "Hostbeam%20iOS"
            return URL(string: "mailto:support@hostbeam.app?subject=\(subject)")
        }
    }
}

/// Where the scene delegate leaves a pairing link for SwiftUI, which it cannot
/// reach: the store is the app's `@StateObject`. `RootView` takes it on
/// appear (a cold launch posts before anyone listens) and on `arrived`.
@MainActor enum PairingInbox {
    static let arrived = Notification.Name("app.hostbeam.pairing-link")
    private static var pending: BeamHost?

    static func receive(_ activity: NSUserActivity) {
        guard activity.activityType == NSUserActivityTypeBrowsingWeb,
            let url = activity.webpageURL, let host = HostPairing.parse(link: url)
        else { return }
        pending = host
        NotificationCenter.default.post(name: arrived, object: nil)
    }

    static func take() -> BeamHost? {
        defer { pending = nil }
        return pending
    }
}

/// Exists to install the quick actions and give the scene the delegate below.
/// SwiftUI still owns the window.
final class HostbeamAppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        QuickAction.install()
        return true
    }

    func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: nil, sessionRole: connectingSceneSession.role)
        configuration.delegateClass = HostbeamSceneDelegate.self
        return configuration
    }
}

/// Receives a tapped quick action, whether it launched the app or found it
/// running, and acts once the scene is active: a URL opened before then is not
/// reliably honoured.
final class HostbeamSceneDelegate: NSObject, UIWindowSceneDelegate {
    private var pending: QuickAction?

    /// Launched by the action — or by a pairing link, which a cold launch
    /// hands over here and nowhere else.
    func scene(
        _ scene: UIScene, willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        if let item = connectionOptions.shortcutItem {
            pending = QuickAction(rawValue: item.type)
        }
        for activity in connectionOptions.userActivities { PairingInbox.receive(activity) }
    }

    /// A pairing link (`https://hostbeam.app/add#…`) with the app running.
    ///
    /// Web links arrive as a browsing activity, not a URL: with this delegate
    /// in place SwiftUI's `onOpenURL` never saw them, and a link from the
    /// Camera app opened Hostbeam and did nothing (2026-09-19, on device).
    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        PairingInbox.receive(userActivity)
    }

    /// The app was already running.
    func windowScene(
        _ windowScene: UIWindowScene,
        performActionFor shortcutItem: UIApplicationShortcutItem,
        completionHandler: @escaping (Bool) -> Void
    ) {
        guard let action = QuickAction(rawValue: shortcutItem.type) else {
            completionHandler(false)
            return
        }
        if windowScene.activationState == .foregroundActive {
            run(action)
        } else {
            pending = action
        }
        completionHandler(true)
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        guard let action = pending else { return }
        pending = nil
        run(action)
    }

    private func run(_ action: QuickAction) {
        guard let url = action.url else { return }
        UIApplication.shared.open(url)
    }
}

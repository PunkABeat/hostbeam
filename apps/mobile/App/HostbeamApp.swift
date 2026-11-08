import SwiftUI
import UIKit

@main
struct HostbeamApp: App {
    @StateObject private var store = AppStore()
    // Home Screen quick actions (QuickActions.swift). SwiftUI keeps the window;
    // the delegate only installs the actions and receives a tapped one.
    @UIApplicationDelegateAdaptor(HostbeamAppDelegate.self) private var appDelegate
    // No StoreKit transaction observer: the iPhone app is free with no in-app
    // purchase (ADR 0028 §4), and PurchaseController is kept unwired.

    init() {
        #if DEBUG
        // Seed staged demo data before AppStore first reads the defaults.
        ScreenshotStage.prepare()
        #endif
        // Geist for display roles (design spec §1): nav titles brand-wide.
        if let large = UIFont(name: "Geist-SemiBold", size: 32),
            let inline = UIFont(name: "Geist-SemiBold", size: 17)
        {
            UINavigationBar.appearance().largeTitleTextAttributes = [.font: large]
            UINavigationBar.appearance().titleTextAttributes = [.font: inline]
        }
    }

    var body: some Scene {
        WindowGroup {
            #if DEBUG
            if let staged = ScreenshotStage.stagedView {
                staged
            } else {
                RootView().environmentObject(store)
            }
            #else
            RootView().environmentObject(store)
            #endif
        }
    }
}

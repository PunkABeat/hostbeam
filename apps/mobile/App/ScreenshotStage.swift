#if DEBUG
import BeamEngine
import SwiftUI
import UIKit

/// App Store screenshot rig (milestone 008 submission checklist). Debug-only:
/// a launch argument stages any screen with seeded demo data, so `simctl`
/// can capture the store set non-interactively and per locale:
///
///   xcrun simctl launch booted app.hostbeam.ios.Hostbeam -hb-stage home
///
/// Stages: home | home-done | host | settings | onboarding | share-beaming |
/// share-done. Everything rendered is the app's real UI; only the data
/// under it is seeded.
///
/// `host` is the Hosts sheet with the demo host's detail pushed, showing
/// what a connected host looks like: green dot, a passed connection test,
/// the pinned host key, diagnostics, and a storage readout. Nothing on that
/// screen can be reached live in the simulator (the demo host does not
/// exist), so the detail seeds those states itself when this stage is set.
enum ScreenshotStage {
    static let demoSentence = "/tmp/hostbeam/hostbeam-2026-08-28-153012.png"
    static let demoHost = BeamHost(
        alias: "prod-box", hostname: "prod-box.tail42.ts.net",
        username: "dev")
    /// Shape of a real pinned-key fingerprint (`SHA256:` + 43 base64 chars);
    /// the value is invented.
    static let demoFingerprint = "SHA256:Qm4vT9XkLp2sR7wHc1eNfJ8dZaB3yUo6Gi5tEK0xMVc"
    /// The three rows `Diagnostics.diagnose` produces on success, so the
    /// staged screen matches a real all-green run.
    static let demoDiagnostics: [DiagnosticStep] = [
        .init(.connection, .ok, .keyType("ed25519")),
        .init(.folder, .ok, .folder("/tmp/hostbeam")),
        .init(.latency, .ok, .latency(milliseconds: 38)),
    ]

    static var stage: String? {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: "-hb-stage"), args.indices.contains(i + 1)
        else { return nil }
        return args[i + 1]
    }

    /// Seed (or clear, for onboarding) the app-group state before AppStore
    /// first reads it, so the staged screen has believable data under it.
    static func prepare() {
        guard let stage else { return }
        let d = AppGroup.defaults
        if stage == "onboarding" {
            d.removeObject(forKey: SharedHosts.hostsKey)
            d.removeObject(forKey: RecentLog.key)
            d.set(false, forKey: "onboarded")
            return
        }
        d.set(try? JSONEncoder().encode([demoHost]), forKey: SharedHosts.hostsKey)
        d.set(demoHost.id.uuidString, forKey: SharedHosts.defaultKey)
        d.set(true, forKey: "onboarded")
        let now = Date()
        let beams: [(String, TimeInterval)] = [
            ("hostbeam-2026-08-28-153012.png", -40),
            ("hostbeam-2026-08-28-151244.png", -1_800),
            ("hostbeam-2026-08-28-104506.png", -18_600),
            ("hostbeam-2026-08-27-224131.png", -82_000),
        ]
        RecentLog.save(
            beams.enumerated().map { index, beam in
                BeamRecord(
                    id: UUID(), sentence: "/tmp/hostbeam/\(beam.0)",
                    hostAlias: demoHost.alias, date: now.addingTimeInterval(beam.1),
                    thumb: demoThumb(index))
            })
    }

    /// The share-extension states render directly (their real view, compiled
    /// into the app for staging); the other stages run the normal RootView
    /// over seeded data.
    @MainActor static var stagedView: AnyView? {
        switch stage {
        case "share-beaming":
            return AnyView(shareFrame(ShareStatusView(state: .beaming(host: demoHost.alias))))
        case "share-done":
            return AnyView(shareFrame(ShareStatusView(state: .done(sentence: demoSentence))))
        default:
            return nil
        }
    }

    private static func shareFrame(_ view: ShareStatusView) -> some View {
        view
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(uiColor: .systemBackground))
            .ignoresSafeArea()
    }

    /// A gradient stand-in that reads as "some app screenshot" at list-thumb
    /// size, written into the real thumbs dir like a genuine beam's preview.
    private static func demoThumb(_ index: Int) -> String? {
        guard let dir = RecentLog.thumbsDir else { return nil }
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let palettes: [(UIColor, UIColor)] = [
            (
                UIColor(red: 0.35, green: 0.58, blue: 1.00, alpha: 1),
                UIColor(red: 0.16, green: 0.40, blue: 0.93, alpha: 1)
            ),
            (UIColor(white: 0.13, alpha: 1), UIColor(white: 0.24, alpha: 1)),
            (
                UIColor(red: 0.93, green: 0.94, blue: 0.97, alpha: 1),
                UIColor(red: 0.82, green: 0.86, blue: 0.93, alpha: 1)
            ),
            (
                UIColor(red: 0.12, green: 0.16, blue: 0.22, alpha: 1),
                UIColor(red: 0.22, green: 0.28, blue: 0.36, alpha: 1)
            ),
        ]
        let size = CGSize(width: 320, height: 692)
        let image = UIGraphicsImageRenderer(size: size).image { ctx in
            let (top, bottom) = palettes[index % palettes.count]
            let gradient = CGGradient(
                colorsSpace: nil,
                colors: [top.cgColor, bottom.cgColor] as CFArray,
                locations: nil)!
            ctx.cgContext.drawLinearGradient(
                gradient, start: .zero,
                end: CGPoint(x: 0, y: size.height), options: [])
            let light = index == 2
            UIColor(white: light ? 1.0 : 1.0, alpha: light ? 0.75 : 0.22).setFill()
            for row in 0..<4 {
                ctx.fill(CGRect(x: 24, y: 132 + row * 72, width: row == 3 ? 180 : 272, height: 44))
            }
        }
        guard let jpeg = image.jpegData(compressionQuality: 0.8) else { return nil }
        let name = "demo-\(index).jpg"
        try? jpeg.write(to: dir.appendingPathComponent(name), options: .atomic)
        return name
    }
}
#endif

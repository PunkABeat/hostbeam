import AppIntents
import SwiftUI
import WidgetKit

/// One-tap beam triggers (milestone 008, "fewest taps to beam"): a Home
/// Screen widget button (iOS 17 interactive widgets) and an iOS 18 Control —
/// which the system offers in Control Center, the Lock Screen's bottom
/// slots, and the Action Button picker. All of them fire the same
/// BeamLastScreenshotIntent the Shortcuts action uses.

// The Control's intent, BeamLastScreenshotInAppIntent, lives in
// BeamControlIntent.swift, which is compiled into the app as well — see the
// note there for why a control whose intent exists only in the extension
// does nothing when tapped.

struct BeamEntry: TimelineEntry {
    let date: Date
    /// Where a tap would send it. `nil` before any host is added.
    let host: String?
}

struct BeamProvider: TimelineProvider {
    /// The app group is the single source both the app and this extension
    /// read, so the widget states what is true rather than what it was built
    /// with. The app reloads timelines after a beam or a host switch.
    private static func current() -> BeamEntry {
        BeamEntry(date: .now, host: SharedHosts.defaultHost()?.alias)
    }

    func placeholder(in context: Context) -> BeamEntry {
        BeamEntry(date: .now, host: "prod")
    }

    func getSnapshot(in context: Context, completion: @escaping (BeamEntry) -> Void) {
        completion(Self.current())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BeamEntry>) -> Void) {
        // `.never`: the host changes only when the app changes it, and the
        // app reloads us then. Nothing here is time-based, deliberately —
        // see the note on the view.
        completion(Timeline(entries: [Self.current()], policy: .never))
    }
}

/// The brand mark in plain shapes — widgets archive their view tree and
/// `Canvas` (BeamMark's renderer) isn't reliably supported there. Same
/// 24-unit geometry as Shared/Design/BeamMark.swift.
struct WidgetMark: View {
    var size: CGFloat = 40

    var body: some View {
        let s = size / 24
        ZStack(alignment: .topLeading) {
            Circle()
                .frame(width: 3.16 * s, height: 3.16 * s)
                .offset(x: (12 - 1.58) * s, y: (3.6 - 1.58) * s)
            Capsule()
                .frame(width: (13.65 - 10.35 + 1.95) * s, height: 1.95 * s)
                .offset(x: (10.35 - 0.975) * s, y: (7.5 - 0.975) * s)
            Capsule()
                .frame(width: (15.23 - 8.78 + 1.95) * s, height: 1.95 * s)
                .offset(x: (8.78 - 0.975) * s, y: (11.25 - 0.975) * s)
            RoundedRectangle(cornerRadius: 2.25 * s, style: .continuous)
                .frame(width: 10.2 * s, height: 7.05 * s)
                .offset(x: 6.9 * s, y: 14.4 * s)
        }
        .frame(width: size, height: size, alignment: .topLeading)
        .foregroundStyle(Brand.accent)
    }
}

struct BeamWidgetView: View {
    let entry: BeamEntry

    var body: some View {
        VStack(spacing: 8) {
            WidgetMark(size: 36)
            Text("Beam last screenshot")
                .font(.footnote.weight(.medium))
                .multilineTextAlignment(.center)
                .foregroundStyle(.primary)
            // What a button cannot say: where this would go. That is the
            // whole of it — "when did the last one land" is not a question
            // anyone asks a Home Screen, and the obvious way to answer it,
            // `Text(date, style: .relative)`, is a counter that ticks every
            // second on a screen people glance at. A thumbnail of the last
            // beam was the other idea and is worse: screenshots are exactly
            // the thing not to put on a Home Screen.
            if let host = entry.host {
                Text(host)
                    .font(.caption2.weight(.medium))
                    .lineLimit(1)
                    .truncationMode(.middle)
                    .foregroundStyle(Brand.accent)
            } else {
                Text("Add a host to start")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .widgetURL(URL(string: "hostbeam://beam-last"))
        .containerBackground(for: .widget) { Color(uiColor: .systemBackground) }
    }
}

struct BeamWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "app.hostbeam.ios.widget.beam", provider: BeamProvider()) { entry in
            BeamWidgetView(entry: entry)
        }
        .configurationDisplayName("Beam last screenshot")
        .description("Your latest screenshot lands on your host, path copied.")
        .supportedFamilies([.systemSmall])
    }
}

@available(iOS 18.0, *)
struct BeamControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "app.hostbeam.ios.control.beam") {
            ControlWidgetButton(action: BeamLastScreenshotInAppIntent()) {
                Label("Beam last screenshot", systemImage: "square.and.arrow.up")
            }
        }
        .displayName("Beam last screenshot")
        .description("Your latest screenshot lands on your host, path copied.")
    }
}

@main
struct HostbeamWidgets: WidgetBundle {
    var body: some Widget {
        BeamWidget()
        if #available(iOS 18.0, *) {
            BeamControl()
        }
    }
}

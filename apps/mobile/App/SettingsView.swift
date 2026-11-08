import BeamEngine
import SwiftUI

/// Settings (design doc §5.4): the optional sentence around the path — empty,
/// the default, copies just the path — with a live preview using the real
/// last-beamed path, the default remote folder, and
/// About/privacy. No license section: the iPhone app is free, with nothing to
/// buy or unlock (ADR 0028 §4).
struct SettingsView: View {
    @EnvironmentObject var store: AppStore
    @StateObject private var settings = SettingsStore()
    @Environment(\.dismiss) private var dismiss
    @AppStorage(AppGroup.appearanceKey, store: AppGroup.defaults) private var appearance = "system"

    private var previewPath: String {
        // The real last path if we have one, else a representative sample.
        if let last = store.recent.first,
            let path = last.sentence.split(separator: " ").last(where: { $0.hasPrefix("/") })
        {
            return String(path)
        }
        return "/tmp/hostbeam/hostbeam-1788875278869.png"
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    BrandField(
                        text: $settings.sentenceTemplate,
                        prompt: Beamer.suggestedSentence,
                        mono: true, multiline: true, noAssist: true)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Preview").font(.caption).foregroundStyle(.secondary)
                        Text(Beamer.renderSentence(template: settings.sentenceTemplate, path: previewPath))
                            .font(.footnote.monospaced()).textSelection(.enabled)
                    }
                } header: {
                    Text("Sentence around the path")
                } footer: {
                    Text(
                        "Empty, a beam copies just the path, which coding agents attach as the picture itself. Write a sentence with {path} in it to put words around the path; most agents then see text."
                    )
                }

                Section {
                    BrandField(
                        text: $settings.defaultFolder, prompt: "/tmp/hostbeam",
                        mono: true, noAssist: true)
                } header: {
                    Text("Default remote folder")
                } footer: {
                    // Said, because it only reaches hosts added from now on;
                    // each host's own folder is on its page.
                    Text("New hosts start with this folder. Change an existing host's folder on its page in Hosts.")
                }

                Section("Beam faster") {
                    tipRow(
                        "square.grid.2x2", "Home Screen widget",
                        "One tap beams your latest screenshot.")
                    tipRow(
                        "hand.tap", "Back Tap",
                        "Double-tap the back of your phone: iOS Settings → Accessibility → Touch → Back Tap → the Hostbeam shortcut."
                    )
                    tipRow(
                        "slider.horizontal.3", "Control Center",
                        "Add the \"Shortcut\" control and point it at the Hostbeam shortcut.")
                }

                Section {
                    Picker("Appearance", selection: $appearance) {
                        Text("System").tag("system")
                        Text("Light").tag("light")
                        Text("Dark").tag("dark")
                    }
                    .pickerStyle(.segmented)
                    // iOS owns per-app language (extensions, prompts, and
                    // formatters all follow it) — deep-link to its switcher
                    // rather than half-overriding it in-app.
                    Button {
                        if let url = URL(string: UIApplication.openSettingsURLString) {
                            UIApplication.shared.open(url)
                        }
                    } label: {
                        LabeledContent("Language") {
                            HStack(spacing: 6) {
                                Text(currentLanguage)
                                Image(systemName: "arrow.up.forward.app")
                                    .font(.caption).foregroundStyle(.tertiary)
                            }
                        }
                    }
                    .foregroundStyle(.primary)
                }

                Section("About") {
                    LabeledContent("Version", value: appVersion)
                    VStack(alignment: .leading, spacing: 6) {
                        Text("No account. No cloud relay. No telemetry.").font(.footnote)
                        Text(
                            "The screenshot goes from your phone straight to your host over your own SSH. There's no \"us\" in the path."
                        )
                        .font(.footnote).foregroundStyle(.secondary)
                    }
                    // hostbeam.app must resolve before App Review sees these
                    // (milestone 007: attach the domain at submission, not at
                    // public launch). No plain "Website" row: the landing page
                    // sells the licence through Paddle, and a link from inside
                    // the app to an outside purchase is guideline 3.1.1. Privacy,
                    // terms, changelog and support are the rows Apple expects.
                    linkRow("Privacy policy", url: "https://hostbeam.app/privacy")
                    linkRow("Terms", url: "https://hostbeam.app/terms")
                    // Links out rather than duplicating the list in-app: the App
                    // Store's "What's New" already covers the current release,
                    // and the full history has one home (CHANGELOG.md, rendered
                    // at hostbeam.app/changelog/iphone/) so the two cannot
                    // disagree. It opens at this version's own entry.
                    linkRow("What's new", url: Changelog.iPhoneURL(version: appVersion).absoluteString)
                    // Apple's own review page. The app asks with Apple's prompt
                    // at most once a version, after a beam (ADR 0023); this row is
                    // for anyone who wants to rate it without being asked.
                    linkRow(
                        "Rate Hostbeam",
                        url: "https://apps.apple.com/app/id6804413107?action=write-review")
                    linkRow(
                        "Send feedback",
                        url: "mailto:support@hostbeam.app?subject=" + "Hostbeam iOS \(appVersion)"
                            .addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)
                    // Same inbox as feedback, sorted by subject — no public board
                    // to keep up (ADR 0023).
                    linkRow(
                        "Request a feature",
                        url: "mailto:support@hostbeam.app?subject=" + "Hostbeam iOS feature request \(appVersion)"
                            .addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)
                    // MIT and Apache-2.0 both want the notice and licence text
                    // shipped with the binary. ThirdPartyNotices.json is that
                    // shipment, generated by scripts/third-party-notices.mjs.
                    NavigationLink("Open source licenses") { OpenSourceLicensesView() }
                    // OFL condition 2: the license ships in the bundle
                    // (Fonts/OFL.txt); this line is the human-readable nod.
                    // Verbatim — license and typeface names don't localize.
                    Text(verbatim: "Type set in Geist · SIL Open Font License 1.1")
                        .font(.caption2).foregroundStyle(.tertiary)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } }
            }
        }
        .tint(Brand.accent)
        .brandAppearance()
    }

    /// One-tap-beam tip: icon + title + how-to caption (mirrors onboarding's
    /// "Beam from anywhere" rows).
    private func tipRow(
        _ icon: String, _ title: LocalizedStringKey,
        _ text: LocalizedStringKey
    ) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon).foregroundStyle(Brand.accent).frame(width: 26)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.callout.weight(.medium))
                Text(text).font(.footnote).foregroundStyle(.secondary)
            }
        }
    }

    /// Same affordance as the Language row: primary text, tertiary
    /// leaves-the-app arrow.
    private func linkRow(_ title: LocalizedStringKey, url: String) -> some View {
        Link(destination: URL(string: url)!) {
            HStack {
                Text(title)
                Spacer()
                Image(systemName: "arrow.up.forward")
                    .font(.caption).foregroundStyle(.tertiary)
            }
        }
        .foregroundStyle(.primary)
    }

    /// The language the app is actually running in, named in that language
    /// (e.g. "Français"), so it's recognizable whatever is set.
    private var currentLanguage: String {
        let code = Bundle.main.preferredLocalizations.first ?? "en"
        let name = Locale(identifier: code).localizedString(forIdentifier: code) ?? code
        return name.prefix(1).uppercased() + name.dropFirst()
    }

    private var appVersion: String {
        let v = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.1.0"
        let b = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(v) (\(b))"
    }
}

import BeamEngine
import PhotosUI
import StoreKit
import SwiftUI
import UniformTypeIdentifiers

struct RootView: View {
    @EnvironmentObject var store: AppStore
    @AppStorage("onboarded", store: AppGroup.defaults) private var onboarded = false

    // The add flow lives here, not in EmptyStateView, because adding a host
    // *destroys* EmptyStateView: `store.addHost` flips `hosts.isEmpty` before
    // the edit sheet dismisses, so the empty state is swapped for the home
    // screen and takes its pending sheet — and its onDismiss — with it. The
    // authorize step then had nobody left to present it. RootView survives the
    // swap, so it owns the flow. It also shows a pairing link, but only on the
    // empty state; onboarding and the Hosts list take it everywhere else.
    @StateObject private var addFlow = AddHostFlow()

    var body: some View {
        Group {
            // Gated on the flag alone. With `&& store.hosts.isEmpty` any user who
            // acquired a host without finishing onboarding was thrown back into
            // first-run the moment they deleted their last host — deleting a
            // host is not a reason to be re-onboarded. `addHost` marks the flag,
            // so setting one up by any route counts as having been set up.
            if !onboarded {
                OnboardingView()
            } else {
                NavigationStack {
                    if store.hosts.isEmpty {
                        EmptyStateView(
                            onScan: addFlow.scan,
                            onManual: addFlow.addManually)
                    } else {
                        BeamHomeView()
                    }
                }
                .tint(Brand.accent)
            }
        }
        .brandAppearance()
        .addHostFlow(addFlow)
        // The Mac's pairing QR, opened by the Camera app, or the same link
        // tapped in Messages or Mail. Here rather than on the home screen,
        // which is not on screen during onboarding or with no host at all.
        .onOpenURL { url in
            if let host = HostPairing.parse(link: url) { store.incomingLink = host }
        }
        // How a web link actually arrives: as a browsing activity, through the
        // scene delegate (PairingInbox). The two handlers above and below are
        // for whichever way the system chooses to deliver it; a repeat of the
        // same host changes nothing.
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
            if let url = activity.webpageURL, let host = HostPairing.parse(link: url) {
                store.incomingLink = host
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: PairingInbox.arrived)) { _ in
            if let host = PairingInbox.take() { store.incomingLink = host }
        }
        .onChange(of: store.incomingLink) { takeLinkIfEmpty() }
        .onAppear {
            if let host = PairingInbox.take() { store.incomingLink = host }
            takeLinkIfEmpty()
        }
    }

    /// The empty state has no Hosts list to hand a pairing link to, so the
    /// root shows it — at once, unless a sheet of its own is up.
    private func takeLinkIfEmpty() {
        guard onboarded, store.hosts.isEmpty else { return }
        addFlow.takeLink(from: store, settle: addFlow.sheet != nil)
    }
}

private struct EmptyStateView: View {
    let onScan: () -> Void
    let onManual: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            BeamMark(phase: .idle, size: 56)
            Text("No host yet.")
                .font(Brand.display(24))
            Text("Point me at a host and I'll beam your screenshots there.")
                .font(.callout).foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            // Both routes, as onboarding §4.2 and the Hosts toolbar offer them.
            // A single "Add a host" opening the manual form hid pairing from the
            // one screen most likely to need it.
            Button(action: onScan) {
                Label("Scan from Mac", systemImage: "qrcode.viewfinder")
            }
            .buttonStyle(.borderedProminent)
            Button("Enter manually", action: onManual)
                .buttonStyle(.bordered)
        }
        .padding(32)
        .navigationTitle("Hostbeam")
    }
}

/// Home mirrors the desktop popover's order: beam action → result →
/// Recent → Beam-to footer (docs/design/ios-companion.md §5.1).
private struct BeamHomeView: View {
    @EnvironmentObject var store: AppStore
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.requestReview) private var requestReview
    /// Several at once: picking three screenshots is one beam, the same as
    /// sharing three from Photos (next.md § 6).
    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var beamState: BeamState = .idle
    @State private var showHosts = false
    @State private var showSettings = false
    @State private var previewRecord: BeamRecord?
    // `hasImages` is a silent check (no iOS paste banner) — safe to poll on
    // foreground so the clipboard row only exists while it would work.
    @State private var clipboardHasImage = false

    enum BeamState: Equatable {
        case idle
        case beaming
        case done(sentence: String)
        /// Some of the batch is on the host and some is not. Its own case, not a
        /// shade of done or failed: both halves are true, and either label alone
        /// would be a lie the user only finds out about on the host.
        case partial(sent: Int, total: Int, sentence: String)
        case failed(title: String, detail: String?, hint: String?, openSettings: Bool = false)
    }

    private var isDone: Bool {
        if case .done = beamState { return true }
        return false
    }

    var body: some View {
        List {
            Section {
                actionZone
            }

            if !store.recent.isEmpty {
                Section {
                    ForEach(store.recent.prefix(5)) { r in
                        RecentRow(record: r) { previewRecord = $0 }
                    }
                    .onDelete { idx in
                        let shown = Array(store.recent.prefix(5))
                        idx.map { shown[$0] }.forEach(store.removeRecent)
                    }
                } header: {
                    HStack {
                        Text("Recent")
                        Spacer()
                        Button("Clear") { store.clearRecents() }
                            .font(.caption).textCase(nil)
                    }
                }
            }

            if let host = store.defaultHost {
                Section("Beam to") {
                    // A picker, like the Mac popover's: switching where the next
                    // beam goes is one tap here, where beams start. Managing
                    // hosts is the last item.
                    Menu {
                        ForEach(store.hosts) { choice in
                            Button {
                                store.setDefault(choice)
                                store.reachability.probe(choice)
                            } label: {
                                if choice.id == store.defaultHostID {
                                    Label(choice.alias, systemImage: "checkmark")
                                } else {
                                    Text(choice.alias)
                                }
                            }
                        }
                        Divider()
                        Button {
                            showHosts = true
                        } label: {
                            Label("Manage hosts…", systemImage: "server.rack")
                        }
                    } label: {
                        HStack(spacing: 10) {
                            ReachDot(state: store.reachability[host.id])
                            VStack(alignment: .leading, spacing: 2) {
                                Text(host.alias).foregroundStyle(.primary)
                                Text(verbatim: "\(host.username)@\(host.hostname)")
                                    .font(.footnote.monospaced()).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.caption).foregroundStyle(.tertiary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Hostbeam")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    showSettings = true
                } label: {
                    Image(systemName: "gearshape")
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showHosts = true
                } label: {
                    Image(systemName: "server.rack")
                }
            }
        }
        .sheet(isPresented: $showHosts) { HostListView() }
        .sheet(isPresented: $showSettings) { SettingsView() }
        .sheet(item: $previewRecord) { RecentPreviewSheet(record: $0) }
        // A pairing link is shown by the Hosts list, which already runs the
        // whole add → authorize → default sequence. Anything else up here
        // closes first: a second sheet presented over it would silently not
        // appear, and the link would look like it did nothing.
        .onChange(of: store.incomingLink) { routeLinkToHosts() }
        .onAppear { routeLinkToHosts() }
        .onAppear {
            #if DEBUG
            if let stage = ScreenshotStage.stage {
                // Staged capture: green reach dot, no live probe of the demo
                // host; route straight to the staged screen state.
                if let host = store.defaultHost { store.reachability.record(host.id, .ok(Date())) }
                if stage == "home-done" { beamState = .done(sentence: ScreenshotStage.demoSentence) }
                if stage == "settings" { showSettings = true }
                if stage == "host" { showHosts = true }
                return
            }
            #endif
            if let host = store.defaultHost { store.reachability.probe(host) }
            clipboardHasImage = UIPasteboard.general.hasImages
        }
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active else { return }
            #if DEBUG
            // The simulator mirrors the Mac's clipboard, so a staged capture
            // would grow a "Beam clipboard image" row whenever the Mac happens
            // to hold an image. Staged screens must not depend on that.
            if ScreenshotStage.stage != nil { return }
            #endif
            clipboardHasImage = UIPasteboard.general.hasImages
        }
        .onChange(of: pickerItems) { _, items in
            guard !items.isEmpty else { return }
            Task { await beam(items) }
        }
        // The phone's own way of saying it landed. Every outcome passes
        // through `beamState`, so one hook covers the picker, the clipboard
        // row and the widget's deep link — and a beam is usually the last
        // thing you do before the phone goes back in your pocket, where a
        // bloom on screen says nothing.
        .sensoryFeedback(trigger: beamState) { _, state in
            switch state {
            case .done: return .success
            // Not the same tap as done: some of the batch is still not there.
            case .partial: return .warning
            case .failed: return .error
            case .idle, .beaming: return nil
            }
        }
        // Both one-tap entry points land here: the widget's widgetURL and
        // the Control's OpenURLIntent (WidgetKit ignores openAppWhenRun on
        // widget buttons, so deep-linking is the shared mechanism).
        .onOpenURL { url in
            guard url.scheme == "hostbeam", url.host == "beam-last" else { return }
            runAutoBeam()
        }
        // The done card is a transient confirmation (the beam is already the
        // top Recent row and the sentence is on the clipboard) — fade it out.
        // Errors persist until the next attempt.
        .task(id: beamState) {
            guard case .done = beamState else { return }
            #if DEBUG
            // The screenshot rig stages this card and captures it once the
            // screen settles. A fade on a timer races that capture: a slow first
            // launch in a new language outlived the six seconds on 2026-09-13
            // and the store shot came out as the plain home screen.
            if ScreenshotStage.stage != nil { return }
            #endif
            try? await Task.sleep(for: .seconds(6))
            guard !Task.isCancelled else { return }
            withAnimation(.easeOut(duration: 0.3)) { beamState = .idle }
        }
    }

    @ViewBuilder private var actionZone: some View {
        switch beamState {
        case .idle, .done, .partial, .failed:
            // Read here, on the main actor: the picker's label closure is not
            // isolated to it.
            let landing = isDone
            PhotosPicker(
                selection: $pickerItems,
                maxSelectionCount: Beamer.maxBatch,
                matching: .images
            ) {
                HStack(spacing: 10) {
                    // One-shot landing bloom right after a successful beam.
                    BeamMark(phase: landing ? .landing : .idle, size: 22)
                    Text("Beam screenshot").fontWeight(.medium)
                }
            }
            if clipboardHasImage {
                Button {
                    Task { await beamClipboard() }
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "doc.on.clipboard")
                            .foregroundStyle(Brand.accent)
                            .frame(width: 22)
                        Text("Beam clipboard image").fontWeight(.medium)
                    }
                }
            }
        case .beaming:
            // Same stage presence as the share extension: the mark front and
            // center, doing its thing.
            VStack(spacing: 12) {
                BeamMark(phase: .uploading, size: 44)
                Text("Beaming to \(store.defaultHost?.alias ?? "host")…")
                    .font(.callout).foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
        }

        // Result rows live inside the same section card as the button —
        // tinted row background, not a floating card between sections.
        switch beamState {
        case .done(let sentence):
            VStack(alignment: .leading, spacing: 6) {
                Label("Copied — paste it to your agent.", systemImage: "checkmark")
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(Brand.accent)
                Text(sentence)
                    .font(.footnote.monospaced())
                    .textSelection(.enabled)
            }
            .listRowBackground(Brand.accentTint)
        case .partial(let sent, let total, let sentence):
            VStack(alignment: .leading, spacing: 6) {
                Label("\(sent) of \(total) beamed", systemImage: "exclamationmark.triangle")
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(Brand.warning)
                Text(
                    "These are on \(store.defaultHost?.alias ?? "the host") and copied. The rest are still on this iPhone."
                )
                .font(.caption).foregroundStyle(.secondary)
                Text(sentence)
                    .font(.footnote.monospaced())
                    .textSelection(.enabled)
            }
            .listRowBackground(Brand.warningTint)
        case .failed(let title, let detail, let hint, let openSettings):
            VStack(alignment: .leading, spacing: 6) {
                Text(title).font(.footnote.weight(.semibold)).foregroundStyle(Brand.danger)
                if let detail {
                    Text(detail).font(.caption.monospaced()).foregroundStyle(.secondary)
                }
                if let hint {
                    Text(hint).font(.caption).foregroundStyle(.secondary)
                }
                if openSettings {
                    Button {
                        if let url = URL(string: UIApplication.openSettingsURLString) {
                            UIApplication.shared.open(url)
                        }
                    } label: {
                        Text("Open Settings").font(.caption.weight(.semibold))
                    }
                }
            }
            .listRowBackground(Brand.dangerTint)
        default:
            EmptyView()
        }
    }

    private func routeLinkToHosts() {
        guard store.incomingLink != nil, !showHosts else { return }
        let busy = showSettings || previewRecord != nil
        showSettings = false
        previewRecord = nil
        Task {
            if busy { try? await Task.sleep(for: .milliseconds(600)) }
            showHosts = true
        }
    }

    /// Run the last-screenshot beam through the normal state machine so the
    /// one-tap entry points get real, visible feedback (and Photos can
    /// prompt in a legitimate UI context).
    private func runAutoBeam() {
        if case .beaming = beamState { return }
        Task {
            beamState = .beaming
            do {
                let url = try await ScreenshotSource.latestScreenshotFile()
                // Genuinely one file: "beam last screenshot" means the latest.
                // Already a temp file, so it is beamed as it is — reading it
                // back into memory to write another copy bought nothing.
                await beam(files: [url])
            } catch ScreenshotSourceError.notAuthorized {
                // The intent's wording ("open Hostbeam once…") is for Shortcuts;
                // in here the user has just said no, and needs the way back.
                beamState = .failed(
                    title: String(localized: "Photos access is off for Hostbeam."),
                    detail: nil,
                    hint: String(
                        localized: "Allow it in Settings, or share the screenshot to Hostbeam from Photos instead."),
                    openSettings: true)
            } catch let e as ScreenshotSourceError {
                beamState = .failed(title: e.description, detail: nil, hint: nil)
            } catch {
                beamState = .failed(
                    title: String(localized: "Couldn't read the screenshot."),
                    detail: nil, hint: nil)
            }
        }
    }

    /// Apple's rating prompt, after one of the app's own beams lands in full
    /// (ADR 0023): never over another sheet, never in a staged screenshot, and a
    /// beat after the done card, so the beam is seen to work before anything
    /// asks about it. Whether the prompt actually appears is Apple's call.
    private func askForReviewIfDue() {
        #if DEBUG
        if ScreenshotStage.stage != nil { return }
        #endif
        let prompt = AppGroup.reviewPrompt()
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?"
        guard prompt.shouldAsk(version: version) else { return }
        Task {
            try? await Task.sleep(for: .seconds(1.5))
            guard case .done = beamState, !showSettings, !showHosts, previewRecord == nil else { return }
            prompt.markAsked(version: version)
            requestReview()
        }
    }

    private func beam(_ items: [PhotosPickerItem]) async {
        beamState = .beaming
        defer { pickerItems = [] }
        // Loaded and written out one at a time, so at most one image is in
        // memory: the picker will hand over twenty-five, and holding
        // twenty-five full-size images is how an app gets killed for memory
        // even outside an extension. (This used to collect every `Data` in an
        // array first, under this same comment.)
        var urls: [URL] = []
        for item in items {
            guard let data = try? await item.loadTransferable(type: Data.self),
                let url = try? Self.tempFile(data)
            else {
                for url in urls { try? FileManager.default.removeItem(at: url) }
                beamState = .failed(
                    title: String(localized: "Couldn't read that image."), detail: nil,
                    hint: String(localized: "Pick it again from Photos."))
                return
            }
            urls.append(url)
        }
        await beam(files: urls)
    }

    /// A temp copy for the beamer to stream. Named `.png` whatever it holds:
    /// `ImagePrep` reads the type from the bytes, not the name.
    private static func tempFile(_ data: Data) throws -> URL {
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("beam-\(UUID().uuidString).png")
        try data.write(to: url)
        return url
    }

    private func beamClipboard() async {
        beamState = .beaming
        // Reading (unlike the hasImages check) triggers iOS's one-time
        // "Allow paste?" prompt per source app — expected, user-initiated.
        guard
            let data = UIPasteboard.general.data(forPasteboardType: UTType.png.identifier)
                ?? UIPasteboard.general.image?.pngData(),
            let url = try? Self.tempFile(data)
        else {
            beamState = .failed(
                title: String(localized: "Couldn't read the clipboard image."), detail: nil,
                hint: String(localized: "Copy the image again."))
            clipboardHasImage = UIPasteboard.general.hasImages
            return
        }
        await beam(files: [url])
    }

    /// Beams `files` to the default host and deletes them afterwards, however
    /// it went: the caller hands over temp copies it no longer needs.
    private func beam(files urls: [URL]) async {
        defer { for url in urls { try? FileManager.default.removeItem(at: url) } }
        guard let host = store.defaultHost, !urls.isEmpty else { return }
        beamState = .beaming
        do {
            let outcome = try await BeamService.beam(fileURLs: urls, host: host)
            UIPasteboard.general.string = outcome.sentence
            // Only the files that landed get a row. `unsent` is the tail the
            // batch stopped at, so what arrived is the matching prefix.
            store.recordBeam(
                outcome, host: host,
                fileURLs: Array(urls.prefix(outcome.remotePaths.count)))
            beamState =
                outcome.unsent.isEmpty
                ? .done(sentence: outcome.sentence)
                : .partial(
                    sent: outcome.remotePaths.count,
                    total: urls.count,
                    sentence: outcome.sentence)
            // The sentence just replaced whatever was on the clipboard.
            clipboardHasImage = UIPasteboard.general.hasImages
            if outcome.unsent.isEmpty { askForReviewIfDue() }
        } catch {
            // The same sentences the share sheet and Shortcuts show.
            let failure = BeamFailure.from(error, host: host)
            beamState = .failed(title: failure.title, detail: failure.detail, hint: failure.hint)
        }
    }
}

private struct RecentRow: View {
    let record: BeamRecord
    let onPreview: (BeamRecord) -> Void
    @State private var copied = false

    var body: some View {
        HStack(spacing: 10) {
            if let url = RecentLog.thumbURL(record), let img = UIImage(contentsOfFile: url.path) {
                Image(uiImage: img)
                    .resizable().scaledToFill()
                    .frame(width: 44, height: 44)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .contentShape(Rectangle())
                    .onTapGesture { onPreview(record) }
            } else if !Beamer.imageExtensions.contains(
                (record.sentence as NSString).pathExtension.lowercased())
            {
                // A file that is not a picture shows as one, not as a gap.
                Image(systemName: "doc")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .frame(width: 44, height: 44)
                    .background(Color(.secondarySystemFill), in: RoundedRectangle(cornerRadius: 8))
            }
            VStack(alignment: .leading, spacing: 2) {
                Text((record.sentence as NSString).lastPathComponent)
                    .font(.footnote.monospaced()).lineLimit(1)
                Text("\(record.hostAlias) · \(record.date.formatted(.relative(presentation: .named)))")
                    .font(.caption2).foregroundStyle(.secondary)
            }
            Spacer()
            Button {
                UIPasteboard.general.string = record.sentence
                copied = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { copied = false }
            } label: {
                Image(systemName: copied ? "checkmark" : "doc.on.doc")
                    .font(.footnote)
                    .foregroundStyle(copied ? Brand.success : Brand.accent)
            }
            .buttonStyle(.borderless)
        }
    }
}

/// Tap-to-enlarge for a recent beam: the stored thumbnail (≤480px) plus the
/// sentence with a copy affordance.
private struct RecentPreviewSheet: View {
    let record: BeamRecord
    @Environment(\.dismiss) private var dismiss
    @State private var copied = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    if let url = RecentLog.thumbURL(record),
                        let img = UIImage(contentsOfFile: url.path)
                    {
                        Image(uiImage: img)
                            .resizable().scaledToFit()
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    } else {
                        Text("No preview for this beam.")
                            .font(.callout).foregroundStyle(.secondary)
                            .padding(.vertical, 40)
                    }
                    Button {
                        UIPasteboard.general.string = record.sentence
                        copied = true
                    } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            Label(
                                copied ? "Copied" : "Copy again",
                                systemImage: copied ? "checkmark" : "doc.on.doc"
                            )
                            .font(.footnote.weight(.medium)).foregroundStyle(Brand.accent)
                            Text(record.sentence)
                                .font(.footnote.monospaced()).foregroundStyle(.primary)
                                .multilineTextAlignment(.leading)
                        }
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Brand.accentTint, in: RoundedRectangle(cornerRadius: 9))
                    }
                    .buttonStyle(.plain)
                }
                .padding()
            }
            .navigationTitle("\(record.hostAlias) · \(record.date.formatted(date: .omitted, time: .shortened))")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } }
            }
        }
        .brandAppearance()
    }
}

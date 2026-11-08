import BeamEngine
import SwiftUI

/// First-run guided flow (design doc §4): Welcome → Add host → Authorize
/// this iPhone → Beam something. Every step skippable — setup must never
/// feel like paperwork. Skipping lands on the empty-state Home.
struct OnboardingView: View {
    @EnvironmentObject var store: AppStore
    @AppStorage("onboarded", store: AppGroup.defaults) private var onboarded = false
    @State private var step = 0

    var body: some View {
        VStack(spacing: 0) {
            TabView(selection: $step) {
                WelcomeStep(next: { step = 1 }, skip: finish).tag(0)
                AddHostStep(next: { step = 2 }).tag(1)
                AuthorizeStep(next: { step = 3 }).tag(2)
                SurfacesStep(done: finish).tag(3)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .animation(Brand.easeOut, value: step)

            HStack(spacing: 6) {
                ForEach(0..<4) { i in
                    Circle().fill(i == step ? Brand.accent : Color(.systemFill))
                        .frame(width: 7, height: 7)
                }
            }
            .padding(.bottom, 10)

            if step > 0 {
                Button("Set up later", action: finish)
                    .font(.footnote).foregroundStyle(.secondary)
                    .padding(.bottom, 16)
            }
        }
        .tint(Brand.accent)
        // A pairing link during first run is the add-host step done from the
        // Camera app: go to that step, which shows it.
        .onChange(of: store.incomingLink) { if store.incomingLink != nil { step = 1 } }
        .onAppear { if store.incomingLink != nil { step = 1 } }
    }

    private func finish() { onboarded = true }
}

private struct WelcomeStep: View {
    let next: () -> Void
    let skip: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Spacer()
            BeamMark(phase: .landing, size: 64)
            Text("Beam screenshots to your dev box.")
                .font(Brand.display(26)).multilineTextAlignment(.center)
            Text(
                "A screenshot on your phone becomes a paste-ready path for the coding agent on your host. Straight over your own SSH — there's no \"us\" in the path."
            )
            .font(.callout).foregroundStyle(.secondary).multilineTextAlignment(.center)
            Spacer()
            Button("Get started", action: next)
                .buttonStyle(.borderedProminent).controlSize(.large)
            Button("Skip for now", action: skip)
                .font(.callout).foregroundStyle(.secondary)
        }
        .padding(28)
    }
}

private struct AddHostStep: View {
    @EnvironmentObject var store: AppStore
    let next: () -> Void
    /// The same add flow as everywhere else, minus its authorize step:
    /// onboarding's own comes next.
    @StateObject private var addFlow = AddHostFlow()

    var body: some View {
        VStack(spacing: 18) {
            Spacer()
            Text("Add your host").font(Brand.display(24))
            Text("The dev box you already reach from your SSH client.")
                .font(.callout).foregroundStyle(.secondary).multilineTextAlignment(.center)
            VStack(spacing: 10) {
                Button {
                    addFlow.scan()
                } label: {
                    Label("Scan from your Mac", systemImage: "qrcode.viewfinder")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent).controlSize(.large)
                Button {
                    addFlow.addManually()
                } label: {
                    Label("Enter manually", systemImage: "keyboard")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered).controlSize(.large)
            }
            Spacer()
            if !store.hosts.isEmpty {
                Button("Continue", action: next)
                    .buttonStyle(.borderedProminent).controlSize(.large)
            }
        }
        .padding(28)
        .addHostFlow(addFlow, then: advanceIfAdded)
        .onChange(of: store.incomingLink) { takeLink() }
        .onAppear { takeLink() }
    }

    /// After a beat: the page may still be sliding in from the welcome step.
    private func takeLink() {
        addFlow.takeLink(from: store)
    }

    private func advanceIfAdded() {
        if !store.hosts.isEmpty { next() }
    }
}

private struct AuthorizeStep: View {
    @EnvironmentObject var store: AppStore
    let next: () -> Void
    @State private var command = ""
    @State private var copied = false
    @State private var testState: TestState = .idle

    enum TestState: Equatable {
        case idle, testing, ok
        case failed(String)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Authorize this iPhone").font(Brand.display(24))
                Text(
                    "Paste this once into the SSH session you already have open. It adds this phone's public key — the private key never leaves the phone."
                )
                .font(.callout).foregroundStyle(.secondary)
                Text(command.isEmpty ? "…" : command)
                    .font(.footnote.monospaced())
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 9))
                Button {
                    UIPasteboard.general.string = command
                    copied = true
                } label: {
                    Label(
                        copied ? "Copied" : "Copy command",
                        systemImage: copied ? "checkmark" : "doc.on.doc")
                }
                .buttonStyle(.borderedProminent)

                Divider().padding(.vertical, 4)

                switch testState {
                case .idle, .failed:
                    Button {
                        Task { await test() }
                    } label: {
                        Label("Test connection", systemImage: "bolt.horizontal")
                    }
                    .buttonStyle(.bordered)
                case .testing:
                    HStack(spacing: 8) {
                        ProgressView()
                        Text("Testing…").font(.callout).foregroundStyle(.secondary)
                    }
                case .ok:
                    Label(
                        "ed25519 · \(store.defaultHost?.remoteDir ?? "/tmp/hostbeam") writable",
                        systemImage: "checkmark.circle.fill"
                    )
                    .font(.callout).foregroundStyle(Brand.success)
                }
                if case .failed(let msg) = testState {
                    Text(msg).font(.caption).foregroundStyle(Brand.danger)
                }

                Button(testState == .ok ? "Continue" : "Continue anyway", action: next)
                    .buttonStyle(testState == .ok ? .borderedProminent : .borderedProminent)
                    .controlSize(.large)
                    .padding(.top, 8)
            }
            .padding(28)
        }
        .task {
            if let key = try? store.deviceKey() { command = DeviceKey.installCommand(key) }
        }
    }

    private func test() async {
        guard let host = store.defaultHost else { return }
        testState = .testing
        do {
            try await BeamService.makeBeamer().verify(host: host)
            testState = .ok
        } catch {
            testState = .failed(BeamFailure.from(error, host: host).title)
        }
    }
}

private struct SurfacesStep: View {
    let done: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Spacer()
            Text("Beam from anywhere").font(Brand.display(24))
            surface(
                "square.and.arrow.up", "Share sheet",
                "Screenshot → Share → Hostbeam.")
            surface(
                "square.grid.2x2", "Home Screen widget",
                "One tap beams your latest screenshot.")
            surface(
                "bolt.circle", "Back Tap, Control Center, Action Button",
                "The Hostbeam shortcut beams without opening the app.")
            surface(
                "photo.on.rectangle", "In the app",
                "Pick any image and beam it.")
            Spacer()
            Button("Start beaming", action: done)
                .buttonStyle(.borderedProminent).controlSize(.large)
                .frame(maxWidth: .infinity)
        }
        .padding(28)
    }

    private func surface(_ icon: String, _ title: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon).foregroundStyle(Brand.accent).frame(width: 26)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.callout.weight(.medium))
                Text(text).font(.footnote).foregroundStyle(.secondary)
            }
        }
    }
}

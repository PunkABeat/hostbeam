import BeamEngine
import SwiftUI

/// The small reachability dot shown wherever a host appears. Deliberately
/// still — the beam is the product's only animation — so "checking" is just a
/// dimmer neutral, not a spinner.
struct ReachDot: View {
    let state: Reachability.Reach?

    var body: some View {
        Circle().fill(color).frame(width: 8, height: 8)
    }

    private var color: Color {
        switch state {
        case .ok: Brand.success
        case .fail: Brand.danger
        case .checking: Color.secondary.opacity(0.45)
        case nil: Color.secondary.opacity(0.25)
        }
    }
}

struct HostListView: View {
    @EnvironmentObject var store: AppStore
    @Environment(\.dismiss) private var dismiss
    @State private var showKey = false
    /// Adding a host, including the authorize step that follows: a new host is
    /// useless until this iPhone's key is in *its* authorized_keys, and
    /// authorization is per host, not per device.
    @StateObject private var addFlow = AddHostFlow()
    #if DEBUG
    /// Screenshot rig (`-hb-stage host`): push the demo host's detail on appear.
    @State private var stagedDetail = false
    #endif

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(store.hosts) { host in
                        NavigationLink {
                            HostDetailView(hostID: host.id)
                        } label: {
                            HStack(spacing: 10) {
                                ReachDot(state: store.reachability[host.id])
                                VStack(alignment: .leading) {
                                    Text(host.alias).foregroundStyle(.primary)
                                    Text(verbatim: "\(host.username)@\(host.hostname):\(host.port)")
                                        .font(.caption.monospaced()).foregroundStyle(.secondary)
                                }
                                Spacer()
                                if host.id == store.defaultHostID {
                                    Image(systemName: "checkmark").foregroundStyle(.tint)
                                }
                            }
                        }
                        // Making a host the default without opening it: a
                        // swipe from the left, or a long-press.
                        .swipeActions(edge: .leading) {
                            if host.id != store.defaultHostID {
                                Button {
                                    store.setDefault(host)
                                } label: {
                                    Label("Make default", systemImage: "checkmark.circle")
                                }
                                .tint(Brand.accent)
                            }
                        }
                        // Delete is its own swipe here, not `.onDelete` on the
                        // ForEach: with that present, the leading "Make default"
                        // swipe never appeared on the device (2026-09-28).
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                store.removeHost(host)
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                        .contextMenu {
                            if host.id != store.defaultHostID {
                                Button {
                                    store.setDefault(host)
                                } label: {
                                    Label("Make default", systemImage: "checkmark.circle")
                                }
                            }
                            Button {
                                UIPasteboard.general.string = host.sshCommand
                            } label: {
                                Label("Copy SSH command", systemImage: "doc.on.doc")
                            }
                        }
                    }
                }

                Section {
                    Button {
                        showKey = true
                    } label: {
                        Label("This device's SSH key", systemImage: "key")
                    }
                }
            }
            .navigationTitle("Hosts")
            #if DEBUG
            .navigationDestination(isPresented: $stagedDetail) {
                if let host = store.defaultHost { HostDetailView(hostID: host.id) }
            }
            #endif
            .onAppear {
                #if DEBUG
                if ScreenshotStage.stage == "host" {
                    // The demo host is not real; probing it would turn the
                    // staged green dot red. A beat later so the push lands
                    // after the sheet has finished presenting.
                    Task { @MainActor in
                        try? await Task.sleep(for: .milliseconds(150))
                        stagedDetail = true
                    }
                    return
                }
                #endif
                store.reachability.probeAll(store.hosts)
            }
            .refreshable { await store.reachability.probeAllAndWait(store.hosts) }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    // Same two add paths as onboarding: scan the Mac's QR, or type.
                    Menu {
                        Button {
                            addFlow.scan()
                        } label: {
                            Label("Scan from Mac", systemImage: "qrcode.viewfinder")
                        }
                        Button {
                            addFlow.addManually()
                        } label: {
                            Label("Enter manually", systemImage: "keyboard")
                        }
                    } label: {
                        Image(systemName: "plus")
                    }
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showKey) { DeviceKeyView() }
            .addHostFlow(addFlow)
            .onChange(of: store.incomingLink) { takeLink() }
            .onAppear { takeLink() }
        }
        .brandAppearance()
    }

    /// Shows a pairing link's host, closing the key sheet first. After a beat
    /// (`AddHostFlow.takeLink`): this list may have just been presented for it,
    /// or be closing a host detail's Address sheet.
    private func takeLink() {
        guard store.incomingLink != nil else { return }
        showKey = false
        addFlow.takeLink(from: store)
    }
}

struct HostEditView: View {
    @EnvironmentObject var store: AppStore
    @Environment(\.dismiss) private var dismiss

    /// The form's fields and the rules for saving them (`Shared/HostDraft`).
    @State private var draft: HostDraft

    /// Called with the saved host so the caller can follow up — adding a host
    /// is only half of setting one up. Not called when a scan updated a host
    /// that was already set up.
    private let onSaved: ((BeamHost) -> Void)?

    typealias Origin = HostDraft.Origin
    private let origin: Origin

    /// `draft` prefills the form (a scan or a link) — the user always confirms.
    init(draft: BeamHost? = nil, origin: Origin? = nil, onSaved: ((BeamHost) -> Void)? = nil) {
        self.onSaved = onSaved
        self.origin = origin ?? (draft == nil ? .manual : .scan)
        _draft = State(initialValue: draft.map(HostDraft.init) ?? HostDraft())
    }

    private var decision: HostDraft.Decision {
        draft.decision(among: store.hosts, origin: origin) {
            AppGroup.hostKeys().fingerprint(for: $0) != nil
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    BrandField(label: "Name", text: $draft.alias, prompt: "dev box", onFocus: SelectAll.now)
                    BrandField(
                        label: "Hostname or IP", text: $draft.hostname,
                        prompt: "example.com", mono: true, noAssist: true, onFocus: SelectAll.now)
                    BrandField(
                        label: "Port", text: $draft.port, prompt: "22",
                        mono: true, keyboard: .numberPad, onFocus: SelectAll.now)
                    BrandField(
                        label: "Username", text: $draft.username,
                        prompt: "ubuntu", mono: true, noAssist: true, onFocus: SelectAll.now)
                    switch decision {
                    case .add:
                        EmptyView()
                    case .update(let namesake):
                        Text("You already have a host called \(draft.cleanAlias). Saving updates its address.")
                            .font(.footnote).foregroundStyle(.secondary)
                        // What changes, so an update is never taken on trust.
                        Text(
                            verbatim:
                                "\(namesake.username)@\(namesake.hostname):\(namesake.port) → \(draft.cleanUsername)@\(draft.cleanHostname):\(draft.port)"
                        )
                        .font(.footnote.monospaced()).foregroundStyle(.secondary)
                    case .unchanged:
                        Text("You already have a host called \(draft.cleanAlias).")
                            .font(.footnote).foregroundStyle(.secondary)
                    case .nameTaken:
                        Text("You already have a host called \(draft.cleanAlias).")
                            .font(.footnote).foregroundStyle(Brand.danger)
                    }
                }
                .listRowSeparator(.hidden)
                Section("Remote folder") {
                    BrandField(
                        text: $draft.remoteDir, prompt: "/tmp/hostbeam",
                        mono: true, noAssist: true)
                }
            }
            .navigationTitle("Add host")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save", action: save)
                        .disabled(!draft.isComplete || !decision.canSave)
                }
            }
        }
        .brandAppearance()
    }

    private func save() {
        guard let host = draft.host() else { return }
        switch decision {
        case .update(let existing):
            // Its key, folder and default status stay: only where it lives
            // changed.
            store.updateAddress(
                of: existing, hostname: host.hostname,
                port: host.port, username: host.username)
        case .add:
            store.addHost(host)
            onSaved?(host)
        case .unchanged, .nameTaken:
            return
        }
        dismiss()
    }
}

/// Edits where a host lives — hostname, port, username — and nothing else.
/// Opened from the Address row of the host detail; the name and folder are
/// edited in place there. Saving keeps the pinned host key (see
/// `AppStore.updateAddress`), which the footnote says in so many words.
struct AddressEditView: View {
    @EnvironmentObject var store: AppStore
    @Environment(\.dismiss) private var dismiss
    let host: BeamHost

    @State private var hostname: String
    @State private var port: String
    @State private var username: String

    init(host: BeamHost) {
        self.host = host
        _hostname = State(initialValue: host.hostname)
        _port = State(initialValue: String(host.port))
        _username = State(initialValue: host.username)
    }

    /// Trimmed, because an address pasted from a terminal or a chat easily
    /// carries a trailing space, and the connection error that follows would
    /// not show it.
    private var cleanHostname: String { hostname.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var cleanUsername: String { username.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var portNumber: Int? {
        Int(port.trimmingCharacters(in: .whitespaces)).flatMap { (1...65535).contains($0) ? $0 : nil }
    }

    private var changed: Bool {
        cleanHostname != host.hostname || portNumber != host.port || cleanUsername != host.username
    }

    private var valid: Bool {
        !cleanHostname.isEmpty && !cleanUsername.isEmpty && portNumber != nil && changed
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    BrandField(
                        label: "Hostname or IP", text: $hostname,
                        prompt: "example.com", mono: true, noAssist: true, onFocus: SelectAll.now)
                    BrandField(
                        label: "Port", text: $port, prompt: "22",
                        mono: true, keyboard: .numberPad, onFocus: SelectAll.now)
                    BrandField(
                        label: "Username", text: $username,
                        prompt: "ubuntu", mono: true, noAssist: true, onFocus: SelectAll.now)
                } footer: {
                    Text(
                        "The pinned host key stays. If this address now leads to a different server, the next beam is refused until you re-trust it."
                    )
                }
                .listRowSeparator(.hidden)
            }
            .navigationTitle("Address")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        guard let port = portNumber else { return }
                        store.updateAddress(
                            of: host, hostname: cleanHostname,
                            port: port, username: cleanUsername)
                        dismiss()
                    }.disabled(!valid)
                }
            }
        }
        .brandAppearance()
    }
}

/// Renders a long unbreakable token so the layout can wrap it **without
/// hyphenating**. SwiftUI adds a hyphen when it must break a long word, which
/// in a key or a command reads as a character that is genuinely in the string —
/// a base64 blob shown as `…OEE1-cy53…` contains no hyphen at all, and this is
/// text people are asked to compare or run. Zero-width spaces give the layout
/// legal break points instead, so it breaks without inventing anything.
///
/// Display only. The Copy button and ShareLink use the untouched string, and
/// this block has no text selection, so no copy path can pick up the padding.
func softWrapped(_ text: String, every chunk: Int = 8) -> String {
    text.split(separator: " ", omittingEmptySubsequences: false).map { token -> String in
        guard token.count > chunk * 2 else { return String(token) }
        return stride(from: 0, to: token.count, by: chunk).map { offset -> String in
            let start = token.index(token.startIndex, offsetBy: offset)
            let end = token.index(start, offsetBy: chunk, limitedBy: token.endIndex) ?? token.endIndex
            return String(token[start..<end])
        }.joined(separator: "\u{200B}")
    }.joined(separator: " ")
}

struct DeviceKeyView: View {
    /// The host this key is being authorized on, when shown right after adding
    /// one. Naming it is the point: the same key must be installed on *every*
    /// host, and "Authorize this iPhone" alone reads like a one-time device
    /// setup that a second host would inherit. It does not.
    var host: BeamHost?
    /// Shown straight after the host was added — the only time "Added — …"
    /// is the right way to start. From a host's page it is just the host.
    var justAdded = false

    @EnvironmentObject var store: AppStore
    @Environment(\.dismiss) private var dismiss
    @State private var command = ""
    @State private var keyLine = ""
    @State private var copied: String?  // which button just copied ("cmd"/"key")
    @State private var error: String?

    /// Whether this host already accepts this iPhone. Asked, not assumed: the
    /// Mac can authorize a host from a remembered device (ADR 0018), so by the
    /// time this screen appears the work may already be done — and telling
    /// someone to copy a key they do not need to copy is its own kind of wrong
    /// answer. Connecting is the only authoritative check; no amount of
    /// coordination between the two apps beats asking the host.
    ///
    /// `unknown` is the state this screen used to lack. A host that never
    /// answered is not evidence that a key is missing, but the screen said
    /// "it can't accept a beam until this iPhone's key is on it" anyway —
    /// naming a cause it had not established, and pointing someone at
    /// `authorized_keys` when the real problem was the address or the network.
    enum AuthState: Equatable { case checking, authorized, needsKey, unknown }
    @State private var authState: AuthState = .checking

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text(
                        host.map { "Authorize this iPhone on \($0.alias)" }
                            ?? String(localized: "Authorize this iPhone")
                    )
                    .font(.title3.bold())
                    if host != nil {
                        switch authState {
                        case .checking:
                            HStack(spacing: 8) {
                                ProgressView()
                                Text("Checking whether it already accepts this iPhone…")
                                    .font(.callout).foregroundStyle(.secondary)
                            }
                        case .authorized:
                            Label(
                                "Already authorized — nothing to do here.",
                                systemImage: "checkmark.circle.fill"
                            )
                            .font(.callout).foregroundStyle(Brand.success)
                            Text(
                                justAdded
                                    ? String(
                                        localized:
                                            "Your Mac had already installed this iPhone's key on it. You can beam to it now."
                                    )
                                    : String(localized: "It accepts this iPhone's key. You can beam to it now.")
                            )
                            .font(.callout).foregroundStyle(.secondary)
                        case .needsKey:
                            if justAdded {
                                Text(
                                    "Added — but it can't accept a beam until this iPhone's key is on it. Every host needs the key added once."
                                )
                                .font(.callout).foregroundStyle(.secondary)
                            } else {
                                Text(
                                    "It can't accept a beam until this iPhone's key is on it. Every host needs the key added once."
                                )
                                .font(.callout).foregroundStyle(.secondary)
                            }
                        case .unknown:
                            Label(
                                "Couldn't reach \(host?.alias ?? "this host").",
                                systemImage: "exclamationmark.triangle.fill"
                            )
                            .font(.callout).foregroundStyle(Brand.danger)
                            Text(
                                "So I can't tell whether it already accepts this iPhone. If it should be reachable, check the address, port and username, and that you're on the right network — then pull down to refresh in Hosts, and the dot will say."
                            )
                            .font(.callout).foregroundStyle(.secondary)
                            Text(
                                "If it does still need this iPhone's key, here's how to add it — it does no harm to do this now and sort the connection out after."
                            )
                            .font(.callout).foregroundStyle(.secondary)
                        }
                        // The answer can change while this screen is open —
                        // the Mac installs the key in a click — so it can be
                        // asked again without leaving.
                        if authState == .needsKey || authState == .unknown {
                            Button {
                                Task { await check(force: true) }
                            } label: {
                                Label("Check again", systemImage: "arrow.clockwise")
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                    if let error {
                        Text(error).font(.footnote).foregroundStyle(.red)
                    } else if host != nil && authState != .needsKey && authState != .unknown {
                        // Nothing to copy, so nothing to show. The key is always
                        // available from Hosts → This device's SSH key.
                        EmptyView()
                    } else {
                        // Easiest: the Mac installs it (its SSH already works).
                        Text(
                            host.map {
                                String(
                                    localized:
                                        "Easiest: copy the key, then on your Mac open Hostbeam → Hosts → \($0.alias) → Share to iPhone and paste it — the copy syncs over via Universal Clipboard, and your Mac installs it over its own SSH access."
                                )
                            }
                                ?? String(
                                    localized:
                                        "Easiest: copy the key, then on your Mac open Hostbeam → Hosts → Share to iPhone and paste it — the copy syncs over via Universal Clipboard, and your Mac installs it over its own SSH access."
                                )
                        )
                        .font(.callout).foregroundStyle(.secondary)
                        HStack {
                            Button {
                                UIPasteboard.general.string = keyLine
                                copied = "key"
                            } label: {
                                Label(
                                    copied == "key" ? "Copied" : "Copy public key",
                                    systemImage: copied == "key" ? "checkmark" : "key")
                            }.buttonStyle(.borderedProminent)
                            // One button, every transport: AirDrop (best when
                            // Universal Clipboard won't cooperate), Mail,
                            // Messages, Save to Files… The key is public
                            // material, so any channel is fine.
                            ShareLink(item: keyLine) {
                                Label("Share…", systemImage: "square.and.arrow.up")
                            }.buttonStyle(.bordered)
                        }

                        // Manual: any shell that can reach the host.
                        Text(
                            "Or run this once on each host yourself — in your Mac's terminal, or right here in an SSH app you already use. It appends the public key to authorized_keys; your private key never leaves the phone."
                        )
                        .font(.callout).foregroundStyle(.secondary)
                        Text(softWrapped(command))
                            .font(.footnote.monospaced())
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        Button {
                            UIPasteboard.general.string = command
                            copied = "cmd"
                        } label: {
                            Label(
                                copied == "cmd" ? "Copied" : "Copy command",
                                systemImage: copied == "cmd" ? "checkmark" : "doc.on.doc")
                        }.buttonStyle(.bordered)
                    }
                }.padding()
            }
            .navigationTitle(host == nil ? "Device key" : "Authorize")
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } } }
            .task {
                do {
                    let key = try store.deviceKey()
                    command = DeviceKey.installCommand(key)
                    keyLine = DeviceKey.openSSHPublicKey(key)
                } catch { self.error = String(localized: "Couldn't access the device key (is the phone locked?).") }

                // Ask the host — through the same probe that decides whether
                // this screen appears at all, so the answer is arrived at once
                // rather than over a second connection asking the same
                // question. A refusal and a silence are different answers: the
                // first is evidence the key is missing, the second is evidence
                // of nothing, and only the first has earned the instructions.
                await check(force: false)
            }
            // Leaving is the other moment the answer may have changed: the key
            // was added from the Mac while this was open. Ask the host again
            // now, so its dot does not stay red for the two minutes an answer
            // otherwise counts as fresh.
            .onDisappear {
                if let host, authState != .authorized {
                    store.reachability.probe(host, force: true)
                }
            }
        }
        .brandAppearance()
    }

    private func check(force: Bool) async {
        guard let host else { return }
        authState = .checking
        switch await store.reachability.authorizeNeed(for: host, force: force) {
        case .none: authState = .authorized
        case .needsKey: authState = .needsKey
        case .cannotTell: authState = .unknown
        }
    }
}

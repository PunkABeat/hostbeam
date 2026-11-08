import BeamEngine
import SwiftUI

/// Host detail (design doc §5.3): rename, edit the address, per-host remote
/// folder, set default, Test connection, diagnostics, pinned-key status +
/// re-trust, and remove (which also unpins the key).
struct HostDetailView: View {
    @EnvironmentObject var store: AppStore
    @Environment(\.dismiss) private var dismiss
    let hostID: UUID

    @State private var alias = ""
    @State private var remoteDir = ""
    @State private var testState: TestState = .idle
    @State private var diag: [DiagnosticStep]?
    @State private var diagnosing = false
    @State private var confirmRemove = false
    /// Mirrors the pinned key into view state. Read inline from the store it is
    /// invisible to SwiftUI, so un-pinning re-rendered nothing and the button
    /// appeared to do nothing at all.
    @State private var pinnedFingerprint: String?
    @State private var justUnpinned = false
    @State private var editingAddress = false
    /// The Authorize screen for this host — reachable here at any time, not
    /// only in the moment after the host was added.
    @State private var authorizing = false
    @State private var addressBeforeEdit: String?

    private static func address(_ host: BeamHost) -> String {
        "\(host.username)@\(host.hostname):\(host.port)"
    }

    enum TestState: Equatable {
        case idle, testing, ok
        case failed(String)
    }

    private var host: BeamHost? { store.hosts.first { $0.id == hostID } }

    var body: some View {
        Form {
            if let host {
                Section {
                    // A name is replaced whole, so focusing it selects it; a
                    // folder is usually tweaked, so it does not.
                    BrandField(
                        label: "Name", text: $alias, copyLabel: "Copy name",
                        onFocus: SelectAll.now, onSubmit: saveAlias)
                    BrandField(
                        label: "Remote folder", text: $remoteDir,
                        prompt: "/tmp/hostbeam", mono: true, noAssist: true,
                        copyLabel: "Copy remote folder", onSubmit: saveFolder)
                }

                // Each part of the address on its own row with its own copy,
                // for setting the host up in another SSH app; editing stays
                // one sheet, which carries the pinned-key footnote.
                Section("Address") {
                    copyRow("Hostname or IP", host.hostname, copy: "Copy hostname", dot: true)
                    copyRow("Port", String(host.port), copy: "Copy port")
                    copyRow("Username", host.username, copy: "Copy username")
                    copyRow("SSH command", host.sshCommand, copy: "Copy SSH command")
                    Button {
                        addressBeforeEdit = Self.address(host)
                        editingAddress = true
                    } label: {
                        Label("Edit address…", systemImage: "pencil")
                    }
                }

                Section {
                    Button {
                        store.setDefault(host)
                    } label: {
                        HStack {
                            Text("Default host")
                            Spacer()
                            if host.id == store.defaultHostID {
                                Image(systemName: "checkmark").foregroundStyle(Brand.accent)
                            }
                        }
                    }
                    .disabled(host.id == store.defaultHostID)
                }

                Section("Connection") {
                    testRow
                    Button {
                        Task { await runDiagnostics() }
                    } label: {
                        Label("Run diagnostics", systemImage: "stethoscope")
                    }
                    .disabled(diagnosing)
                    if let diag {
                        ForEach(diag) { step in DiagRow(step: step, host: host) }
                    }
                    Button {
                        authorizing = true
                    } label: {
                        Label("Authorize this iPhone…", systemImage: "key")
                    }
                    // Said where the fix is: a refusal is the one answer that
                    // means this iPhone's key is missing.
                    if case .fail(_, refusedKey: true) = store.reachability[host.id] {
                        Text("\(host.alias) refused this iPhone's key.")
                            .font(.caption).foregroundStyle(Brand.danger)
                    }
                }

                Section("This iPhone's trust of the host") {
                    if let fp = pinnedFingerprint {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Pinned host key").font(.footnote)
                            // One line, scaled to fit: wrapping let SwiftUI
                            // hyphenate, and a fingerprint that renders as
                            // "…5SVP-DoBdL5R3Y" invites the reader to compare a
                            // hyphen that isn't in the key. Kept as one Text so
                            // selection still copies the exact string.
                            Text(fp).font(.caption.monospaced()).foregroundStyle(.secondary)
                                .lineLimit(1)
                                .minimumScaleFactor(0.5)
                                .textSelection(.enabled)
                        }
                        Button(role: .destructive) {
                            AppGroup.hostKeys().unpin(host)
                            pinnedFingerprint = nil
                            justUnpinned = true
                            testState = .idle
                            diag = nil
                        } label: {
                            Label("Re-trust on next beam", systemImage: "arrow.triangle.2.circlepath")
                        }
                    } else if justUnpinned {
                        // Saying what changed, because the fingerprint simply
                        // vanishing is not obviously a success.
                        Label(
                            "Trust cleared — the next beam pins this host's current key.",
                            systemImage: "checkmark.circle.fill"
                        )
                        .font(.footnote).foregroundStyle(Brand.success)
                    } else {
                        Text("Not connected yet — the host key is pinned on the first successful beam.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }

                Section("Storage") {
                    storageRow(host)
                }

                Section {
                    Button(role: .destructive) {
                        confirmRemove = true
                    } label: {
                        Label("Remove host", systemImage: "trash")
                    }
                }
            }
        }
        .navigationTitle(host?.alias ?? "Host")
        .onAppear { if let host { store.reachability.probe(host) } }
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            alias = host?.alias ?? ""
            remoteDir = host?.remoteDir ?? AppGroup.defaultFolder
            if let host { pinnedFingerprint = AppGroup.hostKeys().fingerprint(for: host) }
            #if DEBUG
            if ScreenshotStage.stage == "host" {
                // Screenshot rig: everything a connected host shows, seeded,
                // because none of it can be produced live against a host
                // that does not exist. The `store.reachability.probe` above is a no-op
                // here — RootView staged a fresh `.ok`, inside the TTL.
                testState = .ok
                pinnedFingerprint = ScreenshotStage.demoFingerprint
                diag = ScreenshotStage.demoDiagnostics
                stor = .ready(count: 4, bytes: 1_840_000)
            }
            #endif
        }
        .sheet(
            isPresented: $editingAddress,
            onDismiss: {
                // A test, diagnostics or storage readout on screen is about the
                // address the host had when it ran; after a change it would vouch
                // for the old one. The dot is re-probed by the store. A Cancel
                // changed nothing, so it clears nothing.
                if host.map(Self.address) != addressBeforeEdit {
                    testState = .idle
                    diag = nil
                    stor = .idle
                }
            }
        ) {
            if let host { AddressEditView(host: host) }
        }
        .sheet(isPresented: $authorizing) {
            if let host { DeviceKeyView(host: host) }
        }
        // The Hosts list behind this screen shows a pairing link's host, and
        // cannot while a sheet is up.
        .onChange(of: store.incomingLink) {
            if store.incomingLink != nil {
                editingAddress = false
                authorizing = false
            }
        }
        .confirmationDialog("Remove this host?", isPresented: $confirmRemove, titleVisibility: .visible) {
            Button("Remove", role: .destructive) {
                if let host { store.removeHost(host) }  // also unpins the key
                dismiss()
            }
        } message: {
            Text("Its pinned key is forgotten too. Your server is untouched.")
        }
    }

    enum StorState: Equatable {
        case idle, loading, cleaning, error
        case ready(count: Int, bytes: UInt64)
        case done(Int)
    }
    @State private var stor: StorState = .idle
    @State private var confirmCleanup = false

    /// On-demand storage readout + the gated cleanup. The engine's
    /// `isBeamArtifact` gate means only names carrying Hostbeam's 13-digit
    /// stamp can ever be deleted; this UI adds the count-first confirmation.
    @ViewBuilder private func storageRow(_ host: BeamHost) -> some View {
        switch stor {
        case .idle, .error:
            Button {
                Task { await checkStorage(host) }
            } label: {
                Label("Check storage", systemImage: "externaldrive")
            }
            if case .error = stor {
                Text("Couldn't check — is the host reachable?")
                    .font(.caption).foregroundStyle(.secondary)
            }
        case .loading, .cleaning:
            HStack(spacing: 8) {
                ProgressView()
                (stor == .cleaning ? Text("Cleaning up…") : Text("Checking…"))
                    .foregroundStyle(.secondary)
            }
        case .done(let n):
            Label {
                Text("Removed \(n).")
            } icon: {
                Image(systemName: "checkmark.circle.fill").foregroundStyle(Brand.success)
            }
        case .ready(let count, let bytes):
            if count == 0 {
                Text("No beamed files on this host.")
                    .font(.footnote).foregroundStyle(.secondary)
            } else {
                Text(
                    "\(count) files · \(ByteCountFormatter.string(fromByteCount: Int64(bytes), countStyle: .file))"
                )
                .font(.footnote)
                Button(role: .destructive) {
                    confirmCleanup = true
                } label: {
                    Label("Clean up…", systemImage: "paintbrush")
                }
                .confirmationDialog(
                    Text("Delete \(count) beamed files?"),
                    isPresented: $confirmCleanup, titleVisibility: .visible
                ) {
                    Button("Delete", role: .destructive) {
                        Task { await runCleanup(host) }
                    }
                } message: {
                    Text("Only files Hostbeam named (hostbeam-…) are deleted. Nothing else is touched.")
                }
            }
        }
    }

    private func checkStorage(_ host: BeamHost) async {
        stor = .loading
        do {
            let info = try await BeamService.makeBeamer().storage(host: host)
            stor = .ready(count: info.count, bytes: info.bytes)
        } catch { stor = .error }
    }

    private func runCleanup(_ host: BeamHost) async {
        stor = .cleaning
        do { stor = .done(try await BeamService.makeBeamer().cleanup(host: host)) } catch { stor = .error }
    }

    @ViewBuilder private var testRow: some View {
        switch testState {
        case .idle, .failed:
            Button {
                Task { await test() }
            } label: {
                Label("Test connection", systemImage: "bolt.horizontal")
            }
        case .testing:
            HStack(spacing: 8) {
                ProgressView()
                Text("Testing…").foregroundStyle(.secondary)
            }
        case .ok:
            Label("Reachable · \(remoteDir) writable", systemImage: "checkmark.circle.fill")
                .foregroundStyle(Brand.success).font(.callout)
        }
        if case .failed(let msg) = testState {
            Text(msg).font(.caption).foregroundStyle(Brand.danger)
        }
    }

    /// One read-only value with a copy icon. The value is selectable too, for
    /// copying part of it.
    private func copyRow(
        _ title: LocalizedStringKey, _ value: String, copy: LocalizedStringKey, dot: Bool = false
    ) -> some View {
        LabeledContent {
            HStack(spacing: 6) {
                Text(verbatim: value)
                    .font(.footnote.monospaced()).foregroundStyle(.secondary)
                    .lineLimit(1).truncationMode(.middle)
                    .textSelection(.enabled)
                if dot, let host { ReachDot(state: store.reachability[host.id]) }
                CopyButton(value: value, label: copy)
            }
        } label: {
            Text(title)
        }
    }

    private func saveAlias() {
        guard var h = host, !alias.isEmpty else { return }
        h.alias = alias
        store.updateHost(h)
    }

    private func saveFolder() {
        guard var h = host else { return }
        let folder = remoteDir.trimmingCharacters(in: .whitespacesAndNewlines)
        h.remoteDir = folder.isEmpty ? AppGroup.defaultFolder : folder
        store.updateHost(h)
    }

    private func test() async {
        guard let host else { return }
        testState = .testing
        // A user-initiated test is the freshest reachability evidence there is,
        // so it must update the dot too. Without this the row could read
        // "Reachable" beside a red dot: the dot kept a stale `.fail` from an
        // earlier probe, and `probe`'s 120s TTL plus its .onAppear-only trigger
        // meant nothing would correct it. Mirrors the post-beam refresh in
        // RootView.
        do {
            try await BeamService.makeBeamer().verify(host: host)
            testState = .ok
            store.reachability.record(host.id, .ok(Date()))
            pinnedFingerprint = AppGroup.hostKeys().fingerprint(for: host)
            justUnpinned = false
        } catch {
            testState = .failed(BeamFailure.from(error, host: host).title)
            store.reachability.record(
                host.id,
                .fail(
                    Date(), refusedKey: (error as? BeamError) == .authRejected))
        }
    }

    private func runDiagnostics() async {
        guard let host else { return }
        diagnosing = true
        diag = nil
        if let beamer = try? BeamService.makeBeamer() {
            diag = await beamer.diagnose(host: host)
        } else {
            diag = [.init(.connection, .fail, .error(.deviceKeyMissing))]
        }
        // Same reasoning as `test()`: diagnostics just connected (or failed to),
        // so the dot should not keep contradicting what the rows below it say.
        pinnedFingerprint = AppGroup.hostKeys().fingerprint(for: host)
        if pinnedFingerprint != nil { justUnpinned = false }
        if let conn = diag?.first(where: { $0.check == .connection }) {
            // The row carries the error itself, so a refusal is known as one.
            store.reachability.record(
                host.id,
                conn.status == .ok
                    ? .ok(Date())
                    : .fail(Date(), refusedKey: conn.detail == .error(.authRejected)))
        }
        diagnosing = false
    }
}

private struct DiagRow: View {
    let step: DiagnosticStep
    let host: BeamHost

    /// The engine reports what it found as data; every word here is the
    /// app's, so the rows follow the user's language.
    private var label: Text {
        switch step.check {
        case .connection: Text("SSH connection")
        case .folder: Text("Remote folder writable")
        case .latency: Text("Round-trip")
        }
    }

    private var detail: Text? {
        switch step.detail {
        case nil: nil
        case .keyType(let type): Text(verbatim: type)
        case .folder(let path): Text(verbatim: path)
        case .folderNotOwned(let path): Text("\(path) belongs to another user")
        case .latency(let ms): Text("\(ms) ms")
        // The same sentence a beam that failed this way would show.
        case .error(let error): Text(verbatim: BeamFailure.from(error, host: host).title)
        case .unrecognised(let description): Text(verbatim: description)
        }
    }

    var body: some View {
        HStack(spacing: 10) {
            switch step.status {
            case .ok: Image(systemName: "checkmark.circle.fill").foregroundStyle(Brand.success)
            case .fail: Image(systemName: "xmark.circle.fill").foregroundStyle(Brand.danger)
            case .skip: Image(systemName: "minus.circle").foregroundStyle(.tertiary)
            }
            label
            Spacer()
            if let detail {
                detail.font(.caption.monospaced()).foregroundStyle(.secondary).lineLimit(1)
            }
        }
    }
}

import BeamEngine
import SwiftUI

/// Adding a host, the same way from every screen that can: the empty state,
/// the Hosts list and onboarding. Enter it by hand, scan the Mac's code, or
/// confirm a pairing link — then, unless the caller has its own next step,
/// authorize this iPhone on the host if it needs it, and offer to make the new
/// host the default.
///
/// It used to be written out three times, each with its own sheets and its
/// own pauses, and every fix to the sequence had to be made three times
/// (docs/process/ios-code-review-2026-09.md § B2). Now a screen owns one
/// `AddHostFlow` and applies `.addHostFlow(_:)`.
///
/// One sheet slot holds the form, the scanner, or the confirm form. A scan
/// that finds a code *replaces* the scanner with the confirm form in that
/// slot, which SwiftUI animates as a dismissal and a presentation — no pause
/// needed to let one sheet finish closing before the next appears.
@MainActor
final class AddHostFlow: ObservableObject {
    enum Sheet: Identifiable, Equatable {
        case manual
        case scanner
        /// Details from a scan or a link, for the user to confirm.
        case confirm(BeamHost, HostDraft.Origin)

        var id: String {
            switch self {
            case .manual: "manual"
            case .scanner: "scanner"
            case .confirm(let host, _): "confirm-\(host.id)"
            }
        }
    }

    @Published var sheet: Sheet?
    /// The host whose authorize step is showing.
    @Published var authorizing: BeamHost?
    /// The host being offered as the new default.
    @Published var offeringDefault: BeamHost?
    /// Set by Save, read when the form closes; nil means it was cancelled.
    var saved: BeamHost?

    func addManually() { sheet = .manual }
    func scan() { sheet = .scanner }

    /// A code the scanner read or the user pasted. Answers whether it was a
    /// Hostbeam pairing code, which the scanner says on screen when it is not.
    func scanned(_ code: String) -> Bool {
        guard let host = HostPairing.parse(code) else { return false }
        sheet = .confirm(host, .scan)
        return true
    }

    /// A pairing link's host, shown in the confirm form.
    func receive(link host: BeamHost) {
        sheet = .confirm(host, .link)
    }

    /// Takes the pairing link waiting in the store, if any. `settle` waits a
    /// beat first: the screen may have just been presented for the link, or be
    /// closing something of its own, and a sheet presented mid-transition
    /// never appears.
    func takeLink(from store: AppStore, settle: Bool = true) {
        guard store.incomingLink != nil else { return }
        Task {
            if settle { try? await Task.sleep(for: .milliseconds(600)) }
            if let host = store.takeIncomingLink() { receive(link: host) }
        }
    }

    /// Adding a host is usually the prelude to beaming to it — but the widget,
    /// the Beam shortcut and the share sheet all beam to the *default*, with no
    /// UI at all. A new host that is not the default therefore means the next
    /// zero-tap beam lands somewhere the user did not choose.
    ///
    /// Asked, never switched: where a beam lands is not a decision to take on
    /// someone's behalf — the same reason authorizing is offered (ADR 0018).
    func offerDefault(_ host: BeamHost, hosts: [BeamHost], defaultID: UUID?) {
        saved = nil
        guard hosts.count > 1, host.id != defaultID else { return }
        Task {
            // Let whatever is on screen finish dismissing before the dialog.
            try? await Task.sleep(for: .milliseconds(350))
            offeringDefault = host
        }
    }
}

private struct AddHostFlowSheets: ViewModifier {
    @ObservedObject var flow: AddHostFlow
    @EnvironmentObject var store: AppStore
    /// What happens when the form closes, instead of authorize-then-default.
    /// Onboarding has an authorize step of its own.
    let then: (() -> Void)?

    func body(content: Content) -> some View {
        content
            .sheet(item: $flow.sheet, onDismiss: formClosed) { sheet in
                switch sheet {
                case .manual:
                    HostEditView(onSaved: { flow.saved = $0 })
                case .scanner:
                    QRScannerView(onCode: flow.scanned)
                case .confirm(let host, let origin):
                    HostEditView(draft: host, origin: origin, onSaved: { flow.saved = $0 })
                }
            }
            .sheet(item: $flow.authorizing, onDismiss: authorizeClosed) { host in
                DeviceKeyView(host: host, justAdded: true)
            }
            .confirmationDialog(
                flow.offeringDefault.map { "Beam to \($0.alias) by default?" } ?? "",
                isPresented: Binding(
                    get: { flow.offeringDefault != nil },
                    set: { if !$0 { flow.offeringDefault = nil } }),
                titleVisibility: .visible,
                presenting: flow.offeringDefault
            ) { host in
                Button("Make \(host.alias) the default") { store.setDefault(host) }
                Button("Keep \(store.defaultHost?.alias ?? "the current one")", role: .cancel) {}
            } message: { _ in
                Text(
                    "Your widget, the Beam shortcut and the share sheet all beam to \(store.defaultHost?.alias ?? "your default host")."
                )
            }
    }

    /// Runs when a sheet in the slot closes — but only the last one: a sheet
    /// replaced by the next (the scanner by the confirm form) is not the end.
    ///
    /// The authorize step is presented from here, not straight after Save, so
    /// one sheet's dismissal never races the next one's presentation. And only
    /// when the host says it does not already accept this iPhone: the Mac may
    /// have installed the key already (ADR 0018), and a screen that exists only
    /// to say so is one more thing to dismiss.
    private func formClosed() {
        guard flow.sheet == nil else { return }
        if let then {
            flow.saved = nil
            then()
            return
        }
        guard let host = flow.saved else { return }  // cancelled, not saved
        Task {
            if await store.reachability.authorizeNeed(for: host) != .none {
                flow.authorizing = host
            } else {
                flow.offerDefault(host, hosts: store.hosts, defaultID: store.defaultHostID)
            }
        }
    }

    /// Ask about the default only once the key step is out of the way — two
    /// questions at once is one too many.
    private func authorizeClosed() {
        guard let host = flow.saved else { return }
        flow.offerDefault(host, hosts: store.hosts, defaultID: store.defaultHostID)
    }
}

extension View {
    /// The add-host sheets, driven by `flow`. `then` replaces the usual
    /// authorize-then-default follow-up.
    func addHostFlow(_ flow: AddHostFlow, then: (() -> Void)? = nil) -> some View {
        modifier(AddHostFlowSheets(flow: flow, then: then))
    }
}

import BeamEngine
import SwiftUI
import UIKit
import UniformTypeIdentifiers

/// Share extension: receive shared images or files, stream them to the default
/// host, write the sentence to the pasteboard, then complete. A screenshot
/// streams as it is; a picture a model cannot read, or larger than 2000 px, is
/// converted by `ImagePrep` first, which decodes only at that size; any other
/// file is streamed exactly as it is (ADR 0006's 2026-09-26 amendment). Either
/// way nothing is ever held whole in memory, so the extension's memory ceiling
/// holds. UI is the SwiftUI ShareStatusView (brand layer shared with the app).
final class ShareViewController: UIViewController {
    private var hosting: UIHostingController<ShareStatusView>?
    /// The held card's pending answer: true is "Send anyway".
    private var decision: CheckedContinuation<Bool, Never>?

    override func viewDidLoad() {
        super.viewDidLoad()
        // Honor the app's appearance override (system/light/dark) here too.
        switch AppGroup.defaults.string(forKey: AppGroup.appearanceKey) {
        case "light": overrideUserInterfaceStyle = .light
        case "dark": overrideUserInterfaceStyle = .dark
        default: break
        }
        view.backgroundColor = .systemBackground
        show(.beaming(host: SharedHosts.defaultHost()?.alias ?? "host"))
        Task { await run() }
    }

    private func show(_ state: ShareStatusView.State) {
        let view = ShareStatusView(
            state: state,
            onSendAnyway: { [weak self] in self?.decide(true) },
            onDontSend: { [weak self] in self?.decide(false) })
        if let hosting {
            hosting.rootView = view
            return
        }
        let hc = UIHostingController(rootView: view)
        addChild(hc)
        hc.view.frame = self.view.bounds
        hc.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        hc.view.backgroundColor = .clear
        self.view.addSubview(hc.view)
        hc.didMove(toParent: self)
        hosting = hc
    }

    private func run() async {
        guard let host = SharedHosts.defaultHost() else {
            finish(
                .failed(
                    title: String(localized: "No host yet."), detail: nil,
                    hint: String(localized: "Open Hostbeam and add a host first.")))
            return
        }
        // Every image or file across every input item, not just the first.
        // Selecting several photos and sharing them is an ordinary thing to do,
        // and taking `.first` silently dropped the rest (next.md § 6).
        let attachments = (extensionContext?.inputItems.compactMap { $0 as? NSExtensionItem } ?? [])
            .flatMap { $0.attachments ?? [] }
        #if DEBUG
        // What iOS called each item — the first thing to read when a share
        // finds nothing to beam.
        Self.debugLog(
            "types "
                + attachments.map { $0.registeredTypeIdentifiers.joined(separator: ",") }
                .joined(separator: " | "))
        #endif
        let providers = attachments.compactMap { provider in
            Self.source(of: provider).map { (provider, $0) }
        }
        guard !providers.isEmpty else {
            finish(
                .failed(
                    title: String(localized: "Nothing to beam."), detail: nil,
                    hint: String(localized: "Share an image or a file.")))
            return
        }
        // Copied one at a time and never held together: `copyOut` is
        // file-to-file, so a share of twenty photos costs the same memory as
        // one, which is what keeps this inside an extension's budget.
        var urls: [URL] = []
        // What each file was called where it came from — carried into its
        // remote name, and what the secret check reads.
        var names: [String?] = []
        var aliases: [[String]] = []
        defer { for url in urls { try? FileManager.default.removeItem(at: url) } }
        do {
            for (provider, source) in providers {
                let shared = try await copyOut(provider, from: source)
                urls.append(shared.url)
                names.append(shared.name)
                aliases.append(shared.aliases)
            }
            // Anything that looks like a secret waits for a yes, before anything
            // is sent or counted.
            let flagged = zip(urls, aliases).compactMap { url, aliases -> String? in
                guard let head = SecretCheck.head(of: url) else { return nil }
                return SecretCheck.looksSecret(names: aliases, head: head) ? aliases.first : nil
            }
            if !flagged.isEmpty {
                guard await ask(flagged: flagged, host: host.alias) else {
                    // Nothing sent, nothing spent, clipboard untouched.
                    extensionContext?.completeRequest(returningItems: nil)
                    return
                }
                show(.beaming(host: host.alias))
            }
            let outcome = try await BeamService.beam(fileURLs: urls, names: names, host: host)
            #if DEBUG
            Self.recordPeakMemory(files: urls, outcome: "ok")
            #endif
            UIPasteboard.general.string = outcome.sentence
            // Shared log (thumbnail from the still-existing temp copy); the
            // app reloads it on foreground.
            // Only what landed gets a row. `unsent` is the tail the batch
            // stopped at, so what arrived is the matching prefix.
            RecentLog.record(
                outcome, host: host,
                fileURLs: Array(urls.prefix(outcome.remotePaths.count)))
            if outcome.unsent.isEmpty {
                finish(.done(sentence: outcome.sentence), delay: 2.5)
            } else {
                finish(
                    .partial(
                        sent: outcome.remotePaths.count,
                        total: urls.count,
                        sentence: outcome.sentence), delay: 4.5)
            }
        } catch {
            #if DEBUG
            Self.recordPeakMemory(files: urls, outcome: "failed \(error)")
            #endif
            // The same sentences the app and Shortcuts show (BeamFailure).
            let failure = BeamFailure.from(error, host: host)
            finish(.failed(title: failure.title, detail: failure.detail, hint: failure.hint))
        }
    }

    /// How to read one shared item.
    enum Source: Equatable {
        /// Its file representation, as this type.
        case representation(String)
        /// A file it offers only by location.
        case fileURL
    }

    /// How to read a shared item, or nil if it is not something to beam.
    ///
    /// A picture is loaded as an image, as it always was — `ImagePrep` reads its
    /// bytes. Anything else by the first type it offers that is not merely a
    /// link. That has to include the vague types iOS gives a file it does not
    /// know — `.env` and `id_ed25519` — which do not all declare themselves
    /// data: requiring `public.data` turned both away with "Nothing to beam" on
    /// the first device test (2026-09-27). A link is not a file, so a type that
    /// is only a URL does not count — except a file URL, read as the file it
    /// points at.
    static func source(of provider: NSItemProvider) -> Source? {
        if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
            return .representation(UTType.image.identifier)
        }
        let ids = provider.registeredTypeIdentifiers
        if let id = ids.first(where: { UTType($0)?.conforms(to: .url) != true }) {
            return .representation(id)
        }
        return ids.contains(UTType.fileURL.identifier) ? .fileURL : nil
    }

    /// Ask about the files that look like secrets; true is "Send anyway".
    private func ask(flagged: [String], host: String) async -> Bool {
        await withCheckedContinuation { cont in
            decision = cont
            show(.held(flagged: flagged, host: host))
        }
    }

    private func decide(_ send: Bool) {
        decision?.resume(returning: send)
        decision = nil
    }

    /// One shared file, copied out: where the copy is, the name to carry into
    /// the remote one, and every name it answers to (the share sheet's and the
    /// file's own) for the secret check.
    private struct SharedFile: Sendable {
        let url: URL
        let name: String?
        let aliases: [String]
    }

    /// The provider's URL is deleted when the handler returns — copy first.
    private func copyOut(_ provider: NSItemProvider, from source: Source) async throws -> SharedFile {
        let suggested = provider.suggestedName
        return try await withCheckedThrowingContinuation { cont in
            switch source {
            case .representation(let type):
                provider.loadFileRepresentation(forTypeIdentifier: type) { url, err in
                    guard let url else {
                        cont.resume(throwing: err ?? CocoaError(.fileNoSuchFile))
                        return
                    }
                    cont.resume(with: Result { try Self.copy(url, suggested: suggested) })
                }
            case .fileURL:
                provider.loadItem(forTypeIdentifier: UTType.fileURL.identifier) { item, err in
                    let url =
                        (item as? URL)
                        ?? (item as? Data).flatMap { URL(dataRepresentation: $0, relativeTo: nil) }
                    guard let url, url.isFileURL else {
                        cont.resume(throwing: err ?? CocoaError(.fileNoSuchFile))
                        return
                    }
                    let scoped = url.startAccessingSecurityScopedResource()
                    defer { if scoped { url.stopAccessingSecurityScopedResource() } }
                    cont.resume(with: Result { try Self.copy(url, suggested: suggested) })
                }
            }
        }
    }

    /// Copy one shared file out of the provider's hands. A file over the cap is
    /// refused here, before a copy of it is made: copying a 2 GB recording only
    /// to say no would be the slow half of the answer.
    ///
    /// `nonisolated` is load-bearing: this runs inside the provider's completion
    /// handler, on its queue, and a static method of this view controller is
    /// otherwise main-actor isolated — Swift 6 traps on that at run time. The
    /// first build with this helper closed every share sheet the moment it
    /// opened (device test, 2026-09-27).
    nonisolated private static func copy(_ url: URL, suggested: String?) throws -> SharedFile {
        let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
        if Int64(size) > Beamer.maxFileBytes {
            throw BeamError.fileTooLarge(limitMB: Int(Beamer.maxFileBytes / 1_048_576))
        }
        let dst = FileManager.default.temporaryDirectory
            .appendingPathComponent("share-\(UUID().uuidString)-" + url.lastPathComponent)
        try FileManager.default.copyItem(at: url, to: dst)
        let own = url.lastPathComponent
        let aliases = [suggested, own].compactMap { $0 }.reduce(into: [String]()) {
            if !$0.contains($1) { $0.append($1) }
        }
        return SharedFile(url: dst, name: suggested ?? own, aliases: aliases)
    }

    private func finish(_ state: ShareStatusView.State, delay: Double = 2.2) {
        DispatchQueue.main.async {
            // This sheet shows its answer for two seconds and closes itself,
            // over a photo the user is still looking at. The tap is what
            // actually tells them, and it is the same vocabulary the app
            // uses: landed, partly landed, refused.
            let generator = UINotificationFeedbackGenerator()
            generator.prepare()
            switch state {
            case .done: generator.notificationOccurred(.success)
            case .partial: generator.notificationOccurred(.warning)
            case .failed: generator.notificationOccurred(.error)
            default: break
            }
            self.show(state)
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                self.extensionContext?.completeRequest(returningItems: nil)
            }
        }
    }

    #if DEBUG
    /// Test builds only: this process's peak memory for the share, appended
    /// to `share-memory.log` in the app group so a device test can read it
    /// off the phone (`devicectl device copy from`). The share extension is
    /// killed at about 120 MB, and nothing else says how close a big file
    /// came. A share that was killed leaves no line at all.
    static func recordPeakMemory(files: [URL], outcome: String) {
        var info = task_vm_info_data_t()
        var count = mach_msg_type_number_t(
            MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<natural_t>.size)
        let kr = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
            }
        }
        guard kr == KERN_SUCCESS else { return }
        let bytes = files.compactMap {
            try? $0.resourceValues(forKeys: [.fileSizeKey]).fileSize
        }.reduce(0, +)
        let mb = { (b: Int64) in String(format: "%.1f", Double(b) / 1_048_576) }
        let line =
            "\(ISO8601DateFormatter().string(from: Date())) \(outcome)"
            + " files=\(files.count) MB=\(mb(Int64(bytes)))"
            + " peakMB=\(mb(info.ledger_phys_footprint_peak))"
            + " nowMB=\(mb(Int64(info.phys_footprint)))\n"
        debugLog(line.trimmingCharacters(in: .newlines))
    }

    /// Test builds only: one line in `share-memory.log` in the app group.
    static func debugLog(_ text: String) {
        let line = text + "\n"
        guard
            let dir = FileManager.default.containerURL(
                forSecurityApplicationGroupIdentifier: AppGroup.suiteName)
        else { return }
        let url = dir.appendingPathComponent("share-memory.log")
        if let handle = try? FileHandle(forWritingTo: url) {
            _ = try? handle.seekToEnd()
            try? handle.write(contentsOf: Data(line.utf8))
            try? handle.close()
        } else {
            try? Data(line.utf8).write(to: url)
        }
    }
    #endif
}

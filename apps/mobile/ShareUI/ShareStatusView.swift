import SwiftUI

/// The animated app icon: the same tile the user just tapped in the share
/// sheet, now doing the work — white mark on the icon's blue gradient.
private struct AppIconBeam: View {
    var phase: BeamMark.Phase
    var size: CGFloat = 76

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.2237, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.353, green: 0.584, blue: 1.0),
                            Color(red: 0.165, green: 0.4, blue: 0.925),
                        ],
                        startPoint: .top, endPoint: .bottom)
                )
                .shadow(color: .black.opacity(0.25), radius: 10, y: 6)
            BeamMark(phase: phase, size: size * 0.62, tint: .white)
        }
        .frame(width: size, height: size)
    }
}

/// The share extension's single surface, centered in the sheet the system
/// presents (full-height on iPhone — a faked bottom card floats mid-air).
/// The beam is the only animation.
struct ShareStatusView: View {
    enum State: Equatable {
        case beaming(host: String)
        case done(sentence: String)
        /// Some landed and some did not. There is no retry here on purpose: the
        /// extension is dismissed the moment it finishes, so an offer it cannot
        /// keep would be worse than saying plainly what is still on the phone.
        case partial(sent: Int, total: Int, sentence: String)
        case failed(title: String, detail: String?, hint: String?)
        /// Nothing was sent: a file looks like a secret, and only the user can
        /// say send it (ADR 0006's 2026-09-26 amendment). Not a failure.
        case held(flagged: [String], host: String)
    }

    let state: State
    /// The held card's two answers; unused by every other state.
    var onSendAnyway: (() -> Void)? = nil
    var onDontSend: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: 16) {
            switch state {
            case .beaming(let host):
                AppIconBeam(phase: .uploading)
                Text("Beaming to \(host)…")
                    .font(.callout)
                    .foregroundStyle(.secondary)
            case .done(let sentence):
                AppIconBeam(phase: .landing)
                VStack(alignment: .leading, spacing: 6) {
                    Label("Copied — paste it to your agent.", systemImage: "checkmark")
                        .font(.footnote.weight(.medium))
                        .foregroundStyle(Brand.accent)
                    Text(sentence)
                        .font(.footnote.monospaced())
                        .textSelection(.enabled)
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Brand.accentTint, in: RoundedRectangle(cornerRadius: 9))
                Label {
                    Text("Paste it wherever your agent runs.")
                } icon: {
                    Image(systemName: "terminal")
                }
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
            case .partial(let sent, let total, let sentence):
                AppIconBeam(phase: .landing)
                VStack(alignment: .leading, spacing: 6) {
                    Label("\(sent) of \(total) beamed", systemImage: "exclamationmark.triangle")
                        .font(.footnote.weight(.medium))
                        .foregroundStyle(Brand.warning)
                    Text("These are on the host and copied. The rest are still on this iPhone — share them again.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(sentence)
                        .font(.footnote.monospaced())
                        .textSelection(.enabled)
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Brand.warningTint, in: RoundedRectangle(cornerRadius: 9))
            case .held(let flagged, let host):
                AppIconBeam(phase: .idle)
                VStack(alignment: .leading, spacing: 6) {
                    Label {
                        if flagged.count == 1, let name = flagged.first {
                            Text("\(name) looks like a secret.")
                        } else {
                            Text("\(flagged.count) files look like secrets.")
                        }
                    } icon: {
                        Image(systemName: "exclamationmark.shield")
                    }
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Brand.warning)
                    Text("Nothing was sent. Send to \(host) anyway?")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Brand.warningTint, in: RoundedRectangle(cornerRadius: 9))
                // "Don't send" is the prominent, default answer: the safe one
                // is the one a hurried tap — or Return on a keyboard — gives.
                HStack(spacing: 10) {
                    Button {
                        onDontSend?()
                    } label: {
                        Text("Don't send").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .keyboardShortcut(.defaultAction)
                    Button(role: .destructive) {
                        onSendAnyway?()
                    } label: {
                        Text("Send anyway").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
            case .failed(let title, let detail, let hint):
                AppIconBeam(phase: .idle)
                VStack(alignment: .leading, spacing: 6) {
                    Text(title)
                        .font(.footnote.weight(.semibold))
                    if let detail {
                        Text(detail)
                            .font(.caption.monospaced())
                            .foregroundStyle(.secondary)
                    }
                    if let hint {
                        Text(hint)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Brand.dangerTint, in: RoundedRectangle(cornerRadius: 9))
            }
        }
        .frame(maxWidth: 340)
        .padding(20)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview("Beaming") {
    ShareStatusView(state: .beaming(host: "prod-box"))
}

#Preview("Done") {
    ShareStatusView(state: .done(sentence: "/tmp/hostbeam/hostbeam-2026-08-27-233241.png"))
}

#Preview("Held") {
    ShareStatusView(state: .held(flagged: [".env"], host: "prod-box"))
}

#Preview("Failed") {
    ShareStatusView(
        state: .failed(
            title: "prod-box didn't answer.",
            detail: "connection timed out",
            hint: "Check the connection, then beam again."))
}

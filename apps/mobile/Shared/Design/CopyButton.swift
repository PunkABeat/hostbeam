import SwiftUI
import UIKit

/// A small copy icon that puts `value` on the clipboard and says so: the icon
/// turns into a checkmark for a moment, with a light haptic tap. Borderless,
/// so inside a Form row only the icon is the button, not the whole row.
struct CopyButton: View {
    let value: String
    /// What VoiceOver reads for it, e.g. "Copy port".
    let label: LocalizedStringKey
    @State private var copied = false

    var body: some View {
        Button {
            UIPasteboard.general.string = value
            copied = true
            Task { @MainActor in
                try? await Task.sleep(for: .seconds(1.2))
                copied = false
            }
        } label: {
            Image(systemName: copied ? "checkmark" : "doc.on.doc")
                .font(.footnote.weight(.medium))
                .foregroundStyle(copied ? Brand.success : Brand.accent)
                .frame(width: 30, height: 30)
                .contentShape(Rectangle())
        }
        .buttonStyle(.borderless)
        .sensoryFeedback(.success, trigger: copied) { _, now in now }
        .accessibilityLabel(Text(label))
        .disabled(value.isEmpty)
    }
}

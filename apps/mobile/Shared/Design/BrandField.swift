import SwiftUI
import UIKit

/// A text input that *reads* as one (ADR 0017 brand layer): caption label
/// above a recessed, rounded field with the accent ring on focus. Exists
/// because a bare `TextField` in a Form is indistinguishable from a static
/// row — especially next to `LabeledContent`.
struct BrandField: View {
    var label: LocalizedStringKey?
    @Binding var text: String
    var prompt: String = ""
    var mono = false
    var multiline = false
    var keyboard: UIKeyboardType = .default
    var noAssist = false  // hostnames, usernames, paths: no autocap/correct
    /// Shows a copy icon beside the field; this is what VoiceOver reads for it.
    var copyLabel: LocalizedStringKey? = nil
    /// Called when the field gains focus. The app passes `SelectAll.now` for
    /// values that are replaced whole (a name, a port); it lives in the app
    /// because extensions, which compile this file too, cannot reach
    /// `UIApplication.shared`.
    var onFocus: (() -> Void)? = nil
    var onSubmit: (() -> Void)? = nil

    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            if let label {
                Text(label).font(.caption).foregroundStyle(.secondary)
            }
            HStack(spacing: 4) {
                styledField
                if let copyLabel {
                    CopyButton(value: text, label: copyLabel)
                }
            }
        }
        .padding(.vertical, 2)
    }

    private var styledField: some View {
        field
            .font(mono ? .footnote.monospaced() : .body)
            .keyboardType(keyboard)
            .textInputAutocapitalization(noAssist ? .never : nil)
            .autocorrectionDisabled(noAssist)
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(Color(.tertiarySystemFill), in: RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(focused ? Brand.accent : .clear, lineWidth: 1.5)
            )
            .focused($focused)
            .onChange(of: focused) { _, isFocused in
                if isFocused { onFocus?() }
            }
            .onSubmit { onSubmit?() }
    }

    @ViewBuilder private var field: some View {
        if multiline {
            TextField(prompt, text: $text, axis: .vertical)
        } else {
            TextField(prompt, text: $text)
        }
    }
}

import SwiftUI

/// Applies the user's appearance override (system/light/dark, mirroring the
/// desktop switcher). Sheets are separate presentations in SwiftUI — the
/// root's `preferredColorScheme` does not reach them — so apply this on the
/// root AND on every sheet-root view.
struct BrandAppearance: ViewModifier {
    @AppStorage(AppGroup.appearanceKey, store: AppGroup.defaults) private var appearance = "system"

    func body(content: Content) -> some View {
        content.preferredColorScheme(
            appearance == "light" ? .light : appearance == "dark" ? .dark : nil)
    }
}

extension View {
    func brandAppearance() -> some View { modifier(BrandAppearance()) }
}

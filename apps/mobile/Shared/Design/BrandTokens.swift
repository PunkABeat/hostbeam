import SwiftUI
import UIKit

/// Hostbeam brand layer (ADR 0017; values from docs/design/hostbeam-handoff/
/// 02_design_tokens.md). Structure is iOS; identity is Hostbeam. Surfaces use
/// system backgrounds by design — only brand/semantic colors live here.
enum Brand {
    // Beam blue — the accent. Light beam-500 #2D6CF6, dark #4C8DFF.
    static let accent = Color(light: 0x2D6CF6, dark: 0x4C8DFF)
    static let accentPressed = Color(light: 0x1B5AE0, dark: 0x6EA1FF)
    /// Accent-tint fill (result blocks, selected rows).
    static let accentTint = Color(light: 0xEAF1FE, dark: 0x4C8DFF, darkAlpha: 0.16)

    static let success = Color(light: 0x28A745, dark: 0x32D74B)
    static let warning = Color(light: 0xE08600, dark: 0xFF9F0A)
    /// Warning-tint fill — the partial-beam row, which is neither a success nor
    /// a failure and must not borrow either one's colour.
    static let warningTint = Color(light: 0xE08600, lightAlpha: 0.10, dark: 0xFF9F0A, darkAlpha: 0.16)
    static let danger = Color(light: 0xE5484D, dark: 0xFF6961)
    static let dangerTint = Color(light: 0xE5484D, lightAlpha: 0.10, dark: 0xFF6961, darkAlpha: 0.16)

    // Motion (doc 02): the beam is the only expressive animation.
    static let durFast = 0.14
    static let durBase = 0.20
    static let durSlow = 0.32
    static let easeOut = Animation.timingCurve(0.22, 1, 0.36, 1, duration: durBase)
    static let pressScale = 0.97

    /// Geist for display roles only (nav/hero/onboarding titles); system SF
    /// everywhere else; mono for the literal.
    static func display(_ size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        let name =
            switch weight {
            case .bold: "Geist-Bold"
            case .semibold: "Geist-SemiBold"
            case .medium: "Geist-Medium"
            default: "Geist-Regular"
            }
        return .custom(name, size: size)
    }
}

extension Color {
    /// Light/dark pair from hex values (with optional per-scheme alpha).
    fileprivate init(light: UInt32, lightAlpha: Double = 1, dark: UInt32, darkAlpha: Double = 1) {
        self.init(
            uiColor: UIColor { traits in
                let hex = traits.userInterfaceStyle == .dark ? dark : light
                let alpha = traits.userInterfaceStyle == .dark ? darkAlpha : lightAlpha
                return UIColor(
                    red: CGFloat((hex >> 16) & 0xFF) / 255,
                    green: CGFloat((hex >> 8) & 0xFF) / 255,
                    blue: CGFloat(hex & 0xFF) / 255,
                    alpha: alpha
                )
            })
    }
}

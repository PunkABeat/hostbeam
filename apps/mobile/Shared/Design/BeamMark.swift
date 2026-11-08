import SwiftUI

/// The Hostbeam mark (assets/hostbeam-mark.svg geometry) with its two-phase
/// animation: while `.uploading`, the signal bars pulse upward toward the
/// node; on `.landing`, the node pops once and a ring blooms once. This is
/// the product's ONLY expressive animation (design doc 01); everything else
/// holds still. Reduced Motion shows end states.
///
/// The pulse is driven by `TimelineView(.animation)` — a `Canvas` closure
/// does not interpolate `@State` changes, so a `withAnimation`-toggled Bool
/// renders as a single still frame (the original bug: the beaming pane
/// looked frozen on device).
struct BeamMark: View {
    enum Phase { case idle, uploading, landing }
    var phase: Phase = .idle
    var size: CGFloat = 24
    /// Mark color — Brand.accent normally, white when drawn on the icon tile.
    var tint: Color = Brand.accent

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var bloom = false

    private var animating: Bool { phase == .uploading && !reduceMotion }

    var body: some View {
        ZStack {
            if animating {
                TimelineView(.animation) { timeline in
                    mark(pulse: pulseValue(at: timeline.date))
                }
            } else {
                mark(pulse: nil)
            }
            // one-time ring bloom on landing (animatable modifiers, so
            // withAnimation works here — unlike inside the Canvas)
            if phase == .landing && !reduceMotion {
                Circle()
                    .stroke(tint.opacity(bloom ? 0 : 0.5), lineWidth: 1.5)
                    .frame(width: size * 0.36, height: size * 0.36)
                    .scaleEffect(bloom ? 2.4 : 0.8)
                    .position(x: size / 2, y: size * 3.6 / 24)
            }
        }
        .frame(width: size, height: size)
        .onAppear { startIfNeeded() }
        .onChange(of: phase) { _, _ in startIfNeeded() }
    }

    /// 0…1 sinusoid (~0.9s period): the two bars trade emphasis, reading as
    /// signal flowing upward from the host toward the node.
    private func pulseValue(at date: Date) -> Double {
        (sin(date.timeIntervalSinceReferenceDate * .pi * 2 / 0.9) + 1) / 2
    }

    /// `pulse` nil → steady mark; 0…1 → uploading emphasis split across bars.
    private func mark(pulse: Double?) -> some View {
        Canvas { ctx, cgSize in
            let s = cgSize.width / 24
            func bar(_ y: CGFloat, _ x1: CGFloat, _ x2: CGFloat, _ opacity: Double) {
                var p = Path()
                p.move(to: CGPoint(x: x1 * s, y: y * s))
                p.addLine(to: CGPoint(x: x2 * s, y: y * s))
                ctx.stroke(
                    p, with: .color(tint.opacity(opacity)),
                    style: StrokeStyle(lineWidth: 1.95 * s, lineCap: .round))
            }
            // node
            let nodeScale: CGFloat = (phase == .landing && !reduceMotion && bloom) ? 1.25 : 1.0
            let r = 1.58 * s * nodeScale
            ctx.fill(
                Path(ellipseIn: CGRect(x: 12 * s - r, y: 3.6 * s - r, width: r * 2, height: r * 2)),
                with: .color(tint))
            // signal bars (emphasis travels upward while uploading)
            let top = pulse.map { 0.35 + 0.65 * $0 } ?? 1.0
            let bottom = pulse.map { 0.35 + 0.65 * (1 - $0) } ?? 1.0
            bar(7.5, 10.35, 13.65, top)
            bar(11.25, 8.78, 15.23, bottom)
            // host
            ctx.fill(
                Path(
                    roundedRect: CGRect(x: 6.9 * s, y: 14.4 * s, width: 10.2 * s, height: 7.05 * s),
                    cornerRadius: 2.25 * s),
                with: .color(tint))
        }
        .frame(width: size, height: size)
    }

    private func startIfNeeded() {
        switch phase {
        case .landing where !reduceMotion:
            bloom = false
            withAnimation(.timingCurve(0.34, 1.4, 0.5, 1, duration: 0.6)) { bloom = true }
        default:
            bloom = false
        }
    }
}

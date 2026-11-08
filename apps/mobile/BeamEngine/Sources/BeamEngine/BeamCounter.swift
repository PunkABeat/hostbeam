import Foundation

public protocol BeamCounting {
    func canBeam(now: Date) -> Bool
    func recordSuccess(now: Date)
    func remaining(now: Date) -> Int
    func nextReset(after: Date) -> Date
}

/// A daily beam quota — **unwired since ADR 0028**: the iPhone app is free with
/// no limit, and `BeamService` gives `Beamer` no counter. Kept, with its tests,
/// for a paid layer that may come later (ADR 0028 §4). When wired it counts
/// successful beams per calendar day (ADR 0014 semantics — failures never
/// consume quota; resets at local midnight), in `UserDefaults` pointed at the
/// app-group suite so the app and the share extension count the same day.
/// Fully local; no network.
public final class BeamCounter: BeamCounting {
    public static let dailyLimit = 5
    private static let dayKey = "beamCounter.day"
    private static let countKey = "beamCounter.count"

    private let defaults: UserDefaults
    private let calendar: Calendar

    public init(defaults: UserDefaults, calendar: Calendar = .current) {
        self.defaults = defaults
        self.calendar = calendar
    }

    private func dayString(_ date: Date) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return "\(c.year!)-\(c.month!)-\(c.day!)"
    }

    private func count(now: Date) -> Int {
        guard defaults.string(forKey: Self.dayKey) == dayString(now) else { return 0 }
        return defaults.integer(forKey: Self.countKey)
    }

    public func canBeam(now: Date) -> Bool { count(now: now) < Self.dailyLimit }

    public func remaining(now: Date) -> Int { max(0, Self.dailyLimit - count(now: now)) }

    public func recordSuccess(now: Date) {
        let day = dayString(now)
        let current = defaults.string(forKey: Self.dayKey) == day ? defaults.integer(forKey: Self.countKey) : 0
        defaults.set(day, forKey: Self.dayKey)
        defaults.set(current + 1, forKey: Self.countKey)
    }

    public func nextReset(after date: Date) -> Date {
        calendar.nextDate(
            after: date, matching: DateComponents(hour: 0, minute: 0, second: 0),
            matchingPolicy: .nextTime) ?? date.addingTimeInterval(86400)
    }
}

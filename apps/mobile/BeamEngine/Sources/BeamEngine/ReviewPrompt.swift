import Foundation

/// When the app may ask for an App Store rating (ADR 0023).
///
/// Every successful beam counts — the app's, the share and action extensions',
/// the Shortcuts action's — because most beams never happen inside the app. The
/// count lives in the app group so all of them add to the same number. Only the
/// app itself ever asks, right after one of its own beams lands: Apple does not
/// allow the prompt in an extension, and a question belongs next to the thing
/// that just worked. Apple then decides whether the prompt actually appears (at
/// most three times a year).
public final class ReviewPrompt {
    /// Enough beams to have seen Hostbeam do its job; not so many that only the
    /// most devoted are ever asked.
    public static let successesBeforeAsking = 3
    private static let successesKey = "reviewPrompt.successes"
    private static let askedVersionKey = "reviewPrompt.askedVersion"

    private let defaults: UserDefaults

    public init(defaults: UserDefaults) {
        self.defaults = defaults
    }

    public var successes: Int { defaults.integer(forKey: Self.successesKey) }

    /// One per gesture that delivered at least a file, whichever process ran it.
    /// Two processes finishing at the same instant can lose one — harmless for
    /// a threshold of three.
    public func recordSuccess() {
        defaults.set(successes + 1, forKey: Self.successesKey)
    }

    /// Whether the app at `version` may ask now: after enough beams, and at most
    /// once per version, so a person who let the prompt pass is not asked again
    /// until there is something new to rate.
    public func shouldAsk(version: String) -> Bool {
        successes >= Self.successesBeforeAsking
            && defaults.string(forKey: Self.askedVersionKey) != version
    }

    public func markAsked(version: String) {
        defaults.set(version, forKey: Self.askedVersionKey)
    }
}

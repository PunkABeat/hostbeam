import UIKit

/// Selects everything in the field that has just been focused, so typing
/// replaces it. For values changed whole — a name, a hostname, a port — not
/// ones people tweak, like a folder path. App-only: `UIApplication.shared` is
/// unavailable to the extensions that share `BrandField`.
enum SelectAll {
    static func now() {
        // A beat later: the field must have become first responder first.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
            UIApplication.shared.sendAction(#selector(UIResponder.selectAll(_:)), to: nil, from: nil, for: nil)
        }
    }
}

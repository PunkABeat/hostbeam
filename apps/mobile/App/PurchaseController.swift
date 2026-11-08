// UNWIRED since ADR 0028 §4 (docs/adr/0028-free-to-use-with-a-reminder.md):
// the iPhone app is free, with no in-app purchase. Nothing creates this
// controller or starts its transaction observer; it is kept for a paid layer
// that may come later, and no in-app purchase is submitted until then.

import BeamEngine
import Foundation
import StoreKit

/// StoreKit 2 side of licensing (slice 6 step 2, milestone 008). The purchase
/// itself never licenses anything: the worker exchanges a finished, verified
/// transaction for a Keygen key (idempotent by original transaction id), and
/// that key activates through the same `LicenseClient` path as manual entry —
/// one licensing brain, two doors in.
///
/// Failure discipline: a transaction is only `finish()`ed after the key is
/// activated. If the worker or network is down post-purchase, the transaction
/// stays open and `Transaction.updates` / Restore redeems it later — a paid
/// user is never stranded.
@MainActor
final class PurchaseController: ObservableObject {
    nonisolated static let productID = "app.hostbeam.ios.license"
    static let exchangeURL = URL(string: "https://license.hostbeam.app/appstore/key")!

    enum Phase: Equatable {
        case idle
        case busy
        case error(String)
        /// Purchase went through but redemption is pending (worker/network).
        case pendingRedeem(String)
    }

    @Published var product: Product?
    @Published var phase: Phase = .idle

    /// Redeems transactions that finish outside a foreground purchase call:
    /// Ask to Buy approvals, cross-device purchases, retries of an exchange
    /// that failed post-purchase. Started once at app launch.
    static func observeTransactionUpdates() -> Task<Void, Never> {
        Task.detached {
            for await update in Transaction.updates {
                guard case .verified(let transaction) = update,
                    transaction.productID == productID
                else { continue }
                try? await PurchaseController.redeem(transaction, signed: update.jwsRepresentation)
            }
        }
    }

    /// True after a fetch came back without the product — the store could
    /// not be reached, or the product does not exist yet on this account.
    @Published var storeUnavailable = false

    func load() async {
        guard product == nil else { return }
        product = try? await Product.products(for: [Self.productID]).first
        storeUnavailable = product == nil
    }

    func purchase() async {
        guard let product, phase != .busy else { return }
        phase = .busy
        do {
            switch try await product.purchase() {
            case .success(let verification):
                guard case .verified(let transaction) = verification else {
                    phase = .error(String(localized: "The App Store receipt didn't verify."))
                    break
                }
                do {
                    try await Self.redeem(transaction, signed: verification.jwsRepresentation)
                    phase = .idle
                } catch {
                    // Paid but not yet licensed — the transaction stays
                    // unfinished; updates/Restore will redeem it.
                    phase = .pendingRedeem(
                        String(
                            localized:
                                "Purchased — but the license server couldn't be reached. Your purchase is safe; it retries automatically, or tap Restore Purchases."
                        ))
                }
            case .pending:
                // Ask to Buy: the updates observer redeems on approval.
                phase = .idle
            case .userCancelled:
                phase = .idle
            @unknown default:
                phase = .idle
            }
        } catch {
            phase = .error(String(localized: "The purchase couldn't be completed."))
        }
    }

    func restore() async {
        guard phase != .busy else { return }
        phase = .busy
        // Re-syncs with the App Store (may prompt for the Apple Account).
        // Fully qualified: the app's own `AppStore` class shadows StoreKit's.
        try? await StoreKit.AppStore.sync()
        var found = false
        for await entitlement in Transaction.currentEntitlements {
            guard case .verified(let transaction) = entitlement,
                transaction.productID == Self.productID
            else { continue }
            found = true
            do {
                try await Self.redeem(transaction, signed: entitlement.jwsRepresentation)
                phase = .idle
            } catch {
                phase = .error(String(localized: "Couldn't reach the license server."))
            }
        }
        if !found {
            phase = .error(String(localized: "No purchase to restore on this Apple Account."))
        }
    }

    /// Exchange with the worker, activate the key, then finish the
    /// transaction. Order matters: finish only after activation succeeds.
    ///
    /// `signed` is the transaction as StoreKit signed it on this device. The
    /// worker verifies it against Apple's certificate chain, which proves the
    /// request comes from the buyer's Apple Account — the id alone appears on
    /// every emailed receipt (docs/process/ios-code-review-2026-09.md § D2).
    private static func redeem(_ transaction: Transaction, signed: String) async throws {
        let store = AppGroup.license()
        // Already licensed (e.g. key entered manually, or a re-delivered
        // update after redemption): nothing to exchange, just settle.
        if store.key() != nil {
            await transaction.finish()
            return
        }
        var request = URLRequest(url: exchangeURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(
            ["transactionId": String(transaction.originalID), "signedTransaction": signed])
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200,
            let body = try? JSONDecoder().decode([String: String].self, from: data),
            let key = body["key"]
        else { throw Licensing.LicenseError.network("exchange failed") }
        try await LicenseClient(store: store).activate(key: key)
        await transaction.finish()
    }
}

# ADR 0014: Licensing and Monetization

**Retired by ADR 0031 (2026-11-08):** licences are no longer sold and the
reminder is gone; Hostbeam is free with nothing to buy. The code stays in the
tree as a record. What follows is the decision as it stood.

Status: Accepted. Amended by ADR 0016 (2026-07-05): "3 Macs" becomes
"3 devices" (the same license covers the iOS companion as one seat), and the
iOS app adds a second entitlement source (a $29 App Store IAP minting a
Keygen license via the webhook worker).
**Amended by ADR 0028 (2026-09-27):** the free tier has no daily limit — the Mac
asks now and then instead — the license covers every Hostbeam 1 update with no
time limit (the 12-month window and half-price renewal are gone; a Hostbeam 2
would be a discounted upgrade), and the iPhone app is free with no in-app
purchase, so the license is "3 Macs" again.

Date: 2026-07-04.

## Context

Hostbeam needs a revenue model before public distribution. The product principles
(no cloud accounts, no hosted infrastructure by default, local-first privacy) constrain
the design: a free user should never be forced online, and the paid path should add the
smallest possible amount of infrastructure. The app is distributed directly (ADR 0008),
so the Mac App Store's IAP machinery is not available and a license-key model is the
natural fit for a developer utility.

## Decision

### Model

- **Free tier: 5 successful beams per calendar day**, metered entirely locally. The free
  tier makes zero network calls — no account, no telemetry, no phone-home.
- **Paid: one-time $29 license with 12 months of updates.** The app keeps working
  forever on versions released within the update window; renewing at half price extends the
  window (the Sketch/Dash model). (Price and renewal discount decided 2026-07-04.
**Reconfirmed 2026-08-24** after the iPhone app made the license a two-platform
product: $29 holds as launch pricing — sits on the CleanShot X anchor, impulse
range for the target buyer — with the stated intent to raise (e.g. toward $39,
renewals rounding to $19) as the product evolves; raising later is cheap,
lowering is not. No iOS-only tier: "one license, three devices, any mix" is a
feature and stays unfragmented.)
- **One license activates up to 3 Macs** (per-person framing).

### Infrastructure

- **Paddle (Billing) is the merchant of record**: hosted checkout from the marketing
  site, global VAT/sales-tax handling, receipts, refunds.
- **Keygen handles licensing**: license creation, key validation, machine activation
  with a 3-device limit, and a 1-year-expiry policy using an *expiration strategy that
  maintains access* — an expired license still validates for existing versions; expiry
  only gates update eligibility (release date must precede license expiry).
- **One small glue function** (serverless webhook endpoint) connects them: Paddle
  `transaction.completed` → create Keygen license → deliver the key on the checkout
  success page and by email. This is the only piece of hosted code Hostbeam runs.
- The desktop app talks only to the Keygen API (activate, validate, deactivate).

### License state machine (in-app)

```
Free ──(activate key)──► Licensed ──(daily silent revalidation ok)──► Licensed
                            │
                            ├─(offline / API unreachable)──► Grace: still unlimited, 30 days
                            │                                  └─(grace expires)──► Free + gentle banner
                            └─(key refunded / disabled / deactivated)──► Free
```

- Activation: paste key in Preferences → License; the app registers this Mac as a Keygen
  machine (hardware-UUID fingerprint) and stores the key in the Keychain.
- Revalidation is silent, on launch, at most once per day. Failures never downgrade
  immediately; only 30 consecutive offline days revert to the free tier, with a calm,
  non-scary message. A paid user is never hard-locked.
- A Deactivate button frees a seat for moving to a new Mac.

### Free-tier metering

- Counts only *successful* uploads; failures never consume quota. Resets at local
  midnight ("5 free beams a day").
- Nothing is shown while under the limit; a subtle remaining-count appears at ≤2 left.
  At the limit, the beam is blocked *before* upload, the clipboard is untouched, and a
  quiet state offers **Buy license** / **Enter key** and states when the count resets.
- **Honest-user stance**: the counter lives in local app config (optionally mirrored in
  the Keychain so deleting config does not reset it). No DRM, no clock-tamper detection,
  no server-side metering — the cost of real enforcement exceeds the piracy it prevents
  for an indie developer tool, and server metering would violate the free tier's
  offline guarantee.

## Consequences

- This narrowly amends "no hosted infrastructure": the paid path adds one webhook
  function and dependencies on Paddle and Keygen. The free tier remains fully local.
- Two vendor dashboards (Paddle, Keygen) plus one deployed function to operate.
- The update-window check only becomes enforceable once an updater/packaging pipeline
  exists (ADR 0008 scope); until then the expiry date is recorded but not yet gating.
- Preferences needs a License tab; the popover needs limit-reached and low-count states.
- Refund handling is automatic: Paddle webhook → glue disables the Keygen license →
  next revalidation reverts the app to free.
- Open items (Keygen Cloud vs self-host, key-delivery email mechanics, webhook
  hosting) are tracked in `docs/research/questions.md`.

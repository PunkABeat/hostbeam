# The site's checkout, as it ran

Hostbeam sold a $29 licence through Paddle from 2026-08-29 until licensing was
retired on 2026-11-08 ([ADR 0031](../../adr/0031-licensing-retired.md)). The
public repository's history is a single commit, so the files the retirement
removed or rewrote in `apps/web/` are kept here, verbatim, with a `.txt`
extension so nothing builds or lints them:

| File | What it did |
|---|---|
| `buy.astro.txt` | Opened the Paddle checkout overlay; also the Paddle payment-link target. Refused to open a sandbox checkout off localhost. |
| `thanks.astro.txt` | Polled the licensing Worker for the key the webhook had just minted and showed it. |
| `refunds.astro.txt` | The refund policy Paddle's domain review asked for. |
| `pricing.astro.txt`, `Pricing.tsx.txt` | The two-column free/licence plate and the /pricing page. |
| `checkout.ts.txt`, `env.d.ts.txt`, `env.example.txt` | Build-time configuration: Paddle environment, client token, price id, the Worker's URL. Public identifiers only. |
| `assert-live-build.mjs.txt` | Refused to deploy a build not configured for live Paddle; it now checks the opposite. |

The Rust client, the licensing Worker and the support scripts were not removed
and are still in place in the tree.

# Hostbeam license webhook

> **Retired 2026-11-08 ([ADR 0031](../../docs/adr/0031-licensing-retired.md)).**
> Hostbeam no longer sells licences. This Worker stays in the tree as the record
> of how the Paddle → Keygen loop worked, and stays deployed, idle, on both
> environments: the Paddle, Keygen and Resend accounts are PunkABeat's and are
> kept for the owner's next projects. Nothing below is exercised any more.

The one piece of hosted code Hostbeam runs (ADR 0014): a Cloudflare Worker
gluing Paddle (merchant of record) to Keygen (license API).

- `POST /webhooks/paddle` — verifies the Paddle signature, then:
  - `transaction.completed` → creates a Keygen license (idempotent on the
    Paddle transaction id) and emails the key (Resend free tier; the code
    auto-prefers the Cloudflare `EMAIL` binding if Workers Paid ever enables it).
  - `adjustment.created/updated` with a refund/chargeback action → suspends
    the license; the app is unlicensed again (the reminder returns) on its
    next revalidation.
- `GET /key?transaction_id=txn_…` — lets the checkout success page show the
  key immediately (404 until the webhook lands; the page should poll briefly).

The desktop app never calls this worker — it talks only to the Keygen API.

## Account setup checklist (one-time)

**Keygen** (keygen.sh — Cloud, or self-hosted CE):

1. Create the account → note the **account id** (also goes in
   `apps/desktop/src-tauri/src/licensing/keygen.rs` `ACCOUNT_ID`).
2. Create a **policy** for the product: expiry **1 year**, expiration
   strategy **MAINTAIN_ACCESS** (expired licenses keep validating; expiry
   only gates updates), machine limit **3**, machine uniqueness per license.
   Note the **policy id**.
3. Create a **product token** (can create/suspend licenses) → secret.
   **Done 2026-08-30.** Both workers now hold a token scoped to the *Hostbeam*
   product (`prod-…`, 1Password → Keygen → "PRODUCT TOKEN (Hostbeam)"), not the
   account admin token they previously used. It matters more than it sounds:
   this Keygen account also hosts an unrelated product, so an admin token gave
   the licensing worker reach over someone else's licences and customers.
   Verified before the swap by exercising exactly the calls the worker makes —
   create, find-by-metadata, suspend, delete — and confirming the other
   product's policy returns 404. Verified after by `GET /key` on both
   deployments, which is the worker's own Keygen lookup.

**Paddle** (paddle.com — start in sandbox):

1. Create the product "Hostbeam License" with a one-time **$29** price.
2. Developer tools → Notifications → add a **destination** pointing at
   `https://<worker-domain>/webhooks/paddle`, subscribed to
   `transaction.completed`, `adjustment.created`, `adjustment.updated`.
   Note the destination's **secret key**.
3. Create an **API key** (read customers) → secret.
4. Checkout settings: set the success redirect to the site's thank-you page
   with `?transaction_id={transaction_id}` so it can call `/key`.
5. Payouts: give Paddle the business's receiving bank details (live account
   only; the specifics are the operator's own and not in this repository).

**The key email is plain text on purpose, and stays that way.** mail-tester
scores it 10/10 (re-confirmed 2026-08-30 after the rewrite) with two amber notes
that are both correct-as-is: *no HTML version* is the deliberate choice — a
licence key must survive every client — and *no List-Unsubscribe header* is right
because this is transactional mail, not a mailing list. Adding an unsubscribe to
a receipt would be wrong, and a buyer must not be able to opt out of the email
carrying the thing they bought.

**Email** (the key email): **Resend** free tier (Cloudflare Email Sending
needs Workers Paid — deliberately skipped). Setup: resend.com account → add
domain `hostbeam.app` (add its SPF/DKIM DNS records to the Cloudflare zone) →
create an API key → `npx wrangler secret put RESEND_API_KEY`. Replies go to
`support@hostbeam.app` — set up (free) Cloudflare **Email Routing** on the
zone to forward support@/license@ (or catch-all) to a personal inbox.

## Alerts and the daily reconciliation

Two guardrails, added 2026-08-30 after a real sale silently sent no key email.

**1. Immediate — a buyer got no licence email.** Fires from the webhook when the
buyer's address cannot be resolved. Not fatal (the key is still on `/thanks`),
but if they closed that tab their only route is a support mail, and we should
know first.

**2. Daily at 09:00 UTC — a paid transaction with no licence.** `reconcile()`
lists completed Paddle transactions from the last 4 days and checks each has a
Keygen licence. The window is wider than Paddle's ~3 day retry period on purpose,
so a delivery that exhausted its retries is still caught the next morning.

The second one is the important one, and it exists because of a limit in the
first: **the webhook can only report failures it observes.** A delivery that
never arrived produces no log, no error and no alert — the worker cannot report
an event it never received. Reconciliation checks the *outcome* instead, so it
catches causes nobody predicted.

It is also a credential canary. If `PADDLE_API_KEY` is wrong — the 2026-08-29
bug — the reconciliation call itself 403s and alerts, instead of quietly
degrading one field of every future sale.

Alerts go to `ALERT_TO` (`support@hostbeam.app`, forwarded by Cloudflare Email
Routing), so no personal address is committed. Cron is declared at the top level
only; named environments do not inherit `[triggers]`, so the sandbox deployment
stays quiet rather than alerting about refunded test purchases.

Channel verified 2026-08-30 with a live send through the same from/to the worker
uses. **Re-test it if the Resend key is rotated or Email Routing changes** — a
silent alert channel is worse than none, because it looks like everything is
fine.

## ⚠ Moving the Apple account to PunkABeat will break iOS licensing

**Resolved 2026-09-15: no move happened.** The personal account was converted
to the PunkABeat organization in place, and Team ID `U3C6XC6LHJ` is unchanged,
so `APPSTORE_*` credentials issued by it are unaffected. The steps below still
apply if the app ever moves to a different account.

**Unused since ADR 0028 (2026-09-27).** The iPhone app is free, with no in-app
purchase and no license, so nothing calls `/appstore/key`. The route stays
deployed for a paid layer that may come later; if one does, this section
applies again.

**Read this before swapping the App Store account from the personal Apple ID to
the PunkABeat business account** (blocked on D-U-N-S at the time of writing).

iOS purchases do not go through Paddle. They mint via StoreKit: the app sends a
transaction id to `POST /appstore/key`, and `src/appstore.ts` verifies it against
Apple's App Store Server API before creating the Keygen licence. The app also
sends `signedTransaction` — the transaction as StoreKit signed it on the
buyer's device — and the worker requires it: `src/appstore-jws.ts` checks it
against Apple's certificate chain (root pinned by fingerprint), and a request
without it, one it does not verify, or one naming another purchase gets a 403.
An id alone is on every emailed receipt, so it proves nothing about who asks.
The API call is signed with a JWT built from three worker secrets:

| Secret | What it is |
| --- | --- |
| `APPSTORE_ISSUER_ID` | the **issuer** — belongs to the App Store Connect *account* |
| `APPSTORE_KEY_ID` | the In-App Purchase key's id |
| `APPSTORE_PRIVATE_KEY` | that key's `.p8` PEM content |

**All three are tied to the App Store Connect account that issued them.** Move
the app to a different account and they stop authenticating — the issuer no
longer owns the app. `BUNDLE_ID` (`app.hostbeam.ios.Hostbeam`) is also asserted
in the JWT and checked against the receipt, so a bundle-id change breaks it too.

**Why this is worse than it sounds.** The buyer pays Apple successfully — Apple
takes the money whatever our worker thinks — and then the verification call
fails, so no licence is minted and no key is sent. From the buyer's side they
have paid and received nothing.

**The daily job now notices.** `reconcile()` asks Apple about a transaction that
cannot exist and expects a 404, because only an authenticated caller is told "no
such transaction". A 401 or 403 emails you instead — *before* a buyer finds out,
which is the whole reason it runs on a schedule rather than on a sale. It cannot
tell you a specific purchase went unminted (see below); it tells you the till is
broken, which during an account move is the thing you actually need to hear.

**It stays quiet until the secrets exist.** None of the three are set today —
iOS sells nothing yet — and a daily "it is broken" would be a false alarm that
teaches you to ignore the real one. Setting them arms it, which has to happen
for iOS to sell at all, so there is no switch to forget. Two of three is not
absence but a misconfiguration, and it says so.

**When you swap the account:**

1. In the new account: **Users and Access → Integrations → In-App Purchase**,
   create a key. Note the issuer id and key id; download the `.p8` **once**.
2. `npx wrangler secret put APPSTORE_ISSUER_ID` (and `APPSTORE_KEY_ID`), then
   `npx wrangler secret put APPSTORE_PRIVATE_KEY < AuthKey_XXXX.p8`.
3. Repeat with `--env sandbox`.
4. Store all three in 1Password. The `.p8` cannot be downloaded twice.
5. **Verify with a real sandbox StoreKit purchase before trusting it** — a
   deploy proves nothing on its own.
6. Then either wait for the next daily run or trigger the cron: a healthy check
   logs `app store ok`, and a broken one emails "iOS purchases may not be
   minting licences". Two independent confirmations beat one.

**What is still not covered, and cannot easily be.** The Paddle leg checks
*outcomes* — for every completed transaction, does a licence exist — because
Paddle can be asked what it sold. Apple has no equivalent endpoint, and the iOS
mint is client-driven: the app brings us a transaction id, so a purchase we
never heard about leaves nothing to reconcile against. If a buyer's exchange
call fails for a reason other than our credentials — their network, a Keygen
outage — the daily job will not see it. That gap closes with a per-exchange
alert or Apple's notification history, and neither is built.

## Granting a free licence

For open-source maintainers, reviewers, a good bug report — whoever earns one.

```sh
node scripts/grant-license.mjs "github.com/someone/their-project"
node scripts/grant-license.mjs "conference giveaway" --sandbox --days=14
```

It prints a one-time checkout link. The recipient opens it, enters an email and
clicks **Complete checkout** — Paddle shows *"There is nothing to pay!"* with no
card step — and the **ordinary purchase pipeline** does the rest: webhook →
Keygen licence → key email. Grants are not special-cased anywhere in the worker,
which is the point: the recipient's path is the one that is already tested.

**There is no discount code.** A `mode: custom` discount never appears in the
catalog and has `code: null`, so there is nothing to leak, guess, or post on a
deals site. It is single-use and expires (30 days by default), so a forwarded
link is worth little.

**It needs its own API key.** Granting requires `discount:write` and
`transaction:write`; the worker's live key deliberately has neither, and
widening it would give write access to a credential that lives in a
public-facing Worker. Create a second key (Paddle → Authentication → New API
key, e.g. `hostbeam-ops`) and store it in 1Password on the **Paddle** item as
`PADDLE_API_KEY (live ops)`.

Verified end to end in sandbox on 2026-08-30, including the part worth
doubting — a $0 transaction really does fire `transaction.completed` and mint a
licence (`4059f5ad`).

**Why grants rather than a student/OSS discount code:** at $29 one-time, a
public code is worse than useless. Paddle's `usage_limit` is an *overall* cap,
not per-customer, so a code that leaks cannot be contained; verification
services cost more than the ~$15 a discount saves; and regional pricing already
covers the buyers with the least money. A handful of manual grants a year costs
nothing and cannot leak.

## Support: "I lost my licence key"

```sh
node scripts/find-license.mjs someone@example.com
node scripts/find-license.mjs txn_01xxxxxxxxxxxxxxxxxxxxxxxx
```

Prints the key, status, expiry and seats used. Secrets come from 1Password at
call time (or `PADDLE_API_KEY` / `KEYGEN_TOKEN` env vars); nothing is stored.

**It pivots through Paddle on purpose.** Keygen's `metadata[email]` filter is
exact and **case-sensitive** — verified 2026-08-30, `Some.Buyer@…` returns
nothing when the stored value is lowercase — and a support request is precisely
where casing varies. Paddle's customer search *is* case-insensitive, so the
script resolves the address there, takes the machine-generated transaction id,
and looks Keygen up by that instead. Neither system does partial matches, so the
full address is required either way.

**No customer database, deliberately.** `privacy.astro` tells the world there are
"no accounts and no data collection", and a local copy of buyer records would
contradict that, create a data-protection obligation, and add a third store that
can drift from the two that are already authoritative. This is an operational
problem, not a data problem: Paddle owns the customer, Keygen owns the licence,
and a 90-line script joins them on demand.

**Self-service first.** The buyer's Paddle receipt carries the transaction id,
and `https://hostbeam.app/thanks?transaction_id=<id>` re-displays the key — no
human needed. Point people there before running anything.

**Gaps worth knowing.** A licence minted before its metadata was populated is not
findable by email (the July test licence has empty metadata, and the first live
sale had an empty email until it was patched — see "First live sale"). App Store
purchases are keyed by `appleTransactionId` and have no Paddle customer at all,
so the email path finds nothing for them.

## Payouts, support mailbox and mail hosting

*Not in the public repository.* The original README carried the operator's
payout configuration (bank, currency routing, the zero-rated VAT reasoning and
its history), how support@ is answered, and the mailbox-hosting plan. Those
are specific to the person and the business running Hostbeam. The lessons that
transfer: Paddle pays the verified identity, so the account-holder name on the
payout must match the bank's record character for character; a sole
proprietor's business name is often *not* that name; and payout currency and
conversion margins are worth measuring with one real sale before choosing a
route.
## Two environments (live and sandbox side by side)

One source, two Worker deployments, so the sandbox purchase loop stays testable
after go-live instead of being traded away for it:

| | production | sandbox |
| --- | --- | --- |
| Worker | `hostbeam-license-webhook` | `hostbeam-license-webhook-sandbox` |
| URL | `license.hostbeam.app` | `*.workers.dev` |
| `PADDLE_API_URL` | `api.paddle.com` | `sandbox-api.paddle.com` |
| `PADDLE_IPS_URL` | `api.paddle.com/ips` | `sandbox-api.paddle.com/ips` |
| Deploy | `npx wrangler deploy` | `npx wrangler deploy --env sandbox` |
| Secrets | `secret put X` | `secret put X --env sandbox` |

Vars live in `wrangler.toml`; named environments do **not** inherit `[vars]`, so
every key is repeated under `[env.sandbox.vars]`. Secrets are stored separately
per environment, so neither can shadow the other.

Two things do **not** need a sandbox twin:

- **The desktop app** talks only to Keygen (ADR 0014), never to Paddle. There is
  no "sandbox build" — any build accepts whichever key you paste in.
- **The iOS app.** It sells nothing since ADR 0028. The dormant IAP path uses
  Apple, not Paddle, and `src/appstore.ts` tries Apple's production API then
  falls back to the sandbox one, so a TestFlight build would work against
  either deployment with no configuration.

**Use a separate Keygen policy for sandbox.** Both deployments mint into the
same Keygen account, so test purchases otherwise consume the Dev-tier active
license allowance under the real policy and have to be hand-cleaned. Clone the
production policy in Keygen and put its id in `[env.sandbox.vars]`. Done
2026-08-29: "Hostbeam License (sandbox)",
`bbbfe7a2-575a-4049-91d8-bb670453e5cd`, with settings mirroring production so a
test behaves like the real thing and test licenses can be bulk-deleted by
filtering on the policy.

## Webhook IP allowlist

`POST /webhooks/paddle` rejects anything that did not come from Paddle's
published egress addresses, ahead of the signature check. The list is fetched
from `PADDLE_IPS_URL` and cached for an hour per isolate — never pinned in
source, because Paddle changes it and live and sandbox differ entirely.

Three deliberate behaviours (`src/paddle.ts`):

- **Any prefix length matches**, not just `/32`. Paddle publishes `/32`s today;
  code that assumed so would silently reject real deliveries if a range widened.
- **Stale-on-error.** If the endpoint is unreachable, the last known good list
  is served rather than dropping purchase webhooks during a Paddle blip.
- **503, never 403, when no list has ever been fetched.** That is our failure,
  not a bad caller, and 503 makes Paddle retry (it retries for ~3 days) so a
  purchase cannot be lost. A genuine non-Paddle IP still gets 403.

- **An IPv6 delivery skips the gate rather than being refused.** Paddle
  publishes `ipv4_cidrs` only, so an IPv6 source address is *unmatchable*, not
  *unauthorized*. Refusing it would return 403, burn Paddle's ~3 days of
  retries, and lose the purchase in silence — no licence, no email, no signal to
  anyone. So the check is skipped for a non-IPv4 address and the signature
  decides, which is the real security boundary anyway: a forged request cannot
  produce a valid signature whatever its source address. `isIpv4()` exists to
  make that distinction explicit rather than letting a parse failure quietly
  mean "reject".

Only the Paddle route is filtered. `/webhooks/appstore` comes from Apple and
`/key` from browsers.

## Deploy

```sh
cd apps/license-webhook
# KEYGEN_ACCOUNT_ID / KEYGEN_POLICY_ID are already set in wrangler.toml

# production (live Paddle)
npx wrangler secret put PADDLE_WEBHOOK_SECRET
npx wrangler secret put PADDLE_API_KEY
npx wrangler secret put KEYGEN_TOKEN
npx wrangler secret put RESEND_API_KEY
npx wrangler deploy

# sandbox (same secrets, sandbox values)
npx wrangler secret put PADDLE_WEBHOOK_SECRET --env sandbox
npx wrangler secret put PADDLE_API_KEY --env sandbox
npx wrangler secret put KEYGEN_TOKEN --env sandbox
npx wrangler secret put RESEND_API_KEY --env sandbox
npx wrangler deploy --env sandbox
```

The Paddle API key only ever does `GET /customers/{id}` to look up the buyer's
email (`src/keygen.ts`), so grant it `customer.read` and nothing else.

Verify end-to-end in the Paddle sandbox: test checkout → webhook fires →
license appears in Keygen → `/key?transaction_id=…` returns it → activate in
the app (with the real `ACCOUNT_ID` compiled in) → refund the test
transaction → next `license_status` in the app is unlicensed again (the
reminder returns).

## Develop

- `npm run test -w @hostbeam/license-webhook` — signature + payload tests.
- `npm run typecheck -w @hostbeam/license-webhook`
- `npx wrangler dev` — local worker with `.dev.vars` for secrets.

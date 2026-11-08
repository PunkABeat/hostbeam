/** Daily reconciliation: does every paid transaction actually have a licence?
 *
 * The webhook path can only report failures it observes. It cannot report a
 * delivery that never arrived — Paddle retries for ~3 days and then gives up,
 * and the first anyone hears of it is a confused buyer. This job checks the
 * OUTCOME instead: for every completed Paddle transaction in the window, is
 * there a Keygen licence, and does it carry the buyer's email?
 *
 * It also works as a credential canary. If PADDLE_API_KEY is wrong — exactly the
 * 2026-08-29 bug — this call fails and alerts, rather than silently degrading
 * one field of every future sale.
 */
import { alertOwner, type AlertEnv } from "./alerts";
import { credentialProblem, type AppStoreEnv } from "./appstore";
import { findLicenseByTransaction } from "./keygen";

/** How far back to look. Comfortably wider than Paddle's ~3 day retry window,
 * so a delivery that exhausted its retries is still caught the next morning. */
const WINDOW_DAYS = 4;

interface PaddleTxn {
  id: string;
  status: string;
  created_at: string;
}

/** The App Store leg, and it is a different shape from the Paddle one on
 * purpose. Paddle can be asked what it sold, so that leg checks outcomes: every
 * completed transaction, does a licence exist. Apple cannot — there is no
 * endpoint that lists sales, and the iOS mint is client-driven, so a purchase
 * we never heard about leaves no trace to reconcile against.
 *
 * What can be checked is whether we could still mint if someone bought right
 * now. That is the failure worth catching: when these credentials stop working
 * every purchase fails at the till, and the buyer is the only one who finds out.
 *
 * Runs before the Paddle leg because that one throws when Paddle is unreachable,
 * and an outage at Paddle must not be what stops us noticing Apple.
 *
 * **Silent until the secrets exist.** iOS has not shipped, so `APPSTORE_*` is
 * unset and there is nothing to guard yet; a daily "it is broken" would be a
 * false alarm that teaches you to ignore the real one. It arms itself the
 * moment the secrets are set, which has to happen for iOS to sell at all — so
 * there is no flag anyone can forget to turn on. A *partial* set is not the
 * same thing: that is a misconfiguration, and it says so. */
async function checkAppStore(
  env: AlertEnv & Partial<AppStoreEnv>,
): Promise<{ status: "ok" | "unconfigured" | "problem"; detail?: string }> {
  const present = [env.APPSTORE_ISSUER_ID, env.APPSTORE_KEY_ID, env.APPSTORE_PRIVATE_KEY].filter(
    (v) => !!v,
  ).length;
  if (present === 0) return { status: "unconfigured" };

  let problem: string | null;
  if (present < 3) {
    problem = `only ${present} of the 3 APPSTORE_* secrets are set on this worker.`;
  } else {
    try {
      problem = await credentialProblem(env as AppStoreEnv);
    } catch (e) {
      problem = `the check itself failed (${e})`;
    }
  }
  if (!problem) return { status: "ok" };

  await alertOwner(env, "Hostbeam: iOS purchases may not be minting licences", [
    problem,
    "",
    "While this is true, an iOS buyer pays Apple, the exchange fails, and the",
    "app shows an error. Nothing else reports it: an App Store purchase has no",
    "Paddle transaction, so the reconciliation below cannot see it either.",
    "",
    "If the App Store Connect account has just moved, this is expected — reissue",
    "the in-app-purchase key in the new account and set APPSTORE_ISSUER_ID,",
    "APPSTORE_KEY_ID and APPSTORE_PRIVATE_KEY on *both* worker environments.",
    "Then verify with a real sandbox StoreKit purchase: deploying proves nothing",
    "when the failure is silent. Steps in apps/license-webhook/README.md.",
  ]);
  return { status: "problem", detail: problem };
}

export async function reconcile(
  env: AlertEnv & Partial<AppStoreEnv>,
): Promise<{ checked: number; problems: string[]; appstore: string }> {
  const { status, detail } = await checkAppStore(env);
  const appstore = detail ? `${status}: ${detail}` : status;

  const since = new Date(Date.now() - WINDOW_DAYS * 86400_000).toISOString();
  const url =
    `${env.PADDLE_API_URL}/transactions` +
    `?status=completed&per_page=100&created_at[GTE]=${encodeURIComponent(since)}`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${env.PADDLE_API_KEY}` } });
  if (!res.ok) {
    // Failing to check is itself the alert — this is how a bad API key surfaces.
    await alertOwner(env, "Hostbeam: reconciliation could not run", [
      `Paddle returned ${res.status} listing completed transactions.`,
      "",
      "Most likely PADDLE_API_KEY is missing, wrong, or lacks transaction:read.",
      "Until this is fixed, nothing is checking that buyers receive licences.",
    ]);
    throw new Error(`paddle transactions list failed: ${res.status}`);
  }

  const body = (await res.json()) as { data?: PaddleTxn[] };
  const txns = body.data ?? [];
  const problems: string[] = [];

  for (const t of txns) {
    let license = null;
    try {
      license = await findLicenseByTransaction(env, t.id);
    } catch (e) {
      problems.push(`${t.id} (${t.created_at}) — Keygen lookup failed: ${e}`);
      continue;
    }
    if (!license) {
      problems.push(`${t.id} (${t.created_at}) — PAID BUT NO LICENCE`);
    }
  }

  if (problems.length) {
    await alertOwner(env, `Hostbeam: ${problems.length} paid transaction(s) without a licence`, [
      `Checked ${txns.length} completed transaction(s) from the last ${WINDOW_DAYS} days.`,
      "",
      ...problems,
      "",
      "Each of these is someone who paid and may have nothing to show for it.",
      "Look at the Paddle notification log for a failed delivery, then either",
      "replay it from the dashboard or mint the licence by hand.",
    ]);
  }

  return { checked: txns.length, problems, appstore };
}

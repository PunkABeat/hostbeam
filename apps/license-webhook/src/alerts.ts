/** Operator alerts.
 *
 * The failure this exists for is not "something threw" — it is a step that
 * succeeds loudly while failing quietly. On 2026-08-29 a real purchase completed,
 * minted a licence, and showed the key on /thanks while the key EMAIL silently
 * never sent, because PADDLE_API_KEY was unset and a `.catch` swallowed the 403.
 * Nothing errored from the buyer's side or ours. Only an empty metadata field
 * recorded it, and nobody looks at those.
 *
 * So alerts here are about outcomes, not exceptions.
 *
 * Sends to ALERT_TO (support@hostbeam.app, which Cloudflare Email Routing
 * forwards to the owner) so no personal address lives in the repo.
 */
import type { Env } from "./keygen";

export interface AlertEnv extends Env {
  ALERT_TO?: string;
}

/** Best-effort and never throws: an alert that breaks the purchase it is
 * reporting on would be worse than no alert. */
export async function alertOwner(env: AlertEnv, subject: string, lines: string[]): Promise<void> {
  const to = env.ALERT_TO;
  if (!to) return;
  const text = [...lines, "", "— Hostbeam licensing worker"].join("\n");
  try {
    if (env.EMAIL) {
      await env.EMAIL.send({
        to,
        from: { email: "license@hostbeam.app", name: "Hostbeam alerts" },
        replyTo: "support@hostbeam.app",
        subject,
        text,
      });
      return;
    }
    if (env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM ?? "Hostbeam <license@hostbeam.app>",
          to,
          subject,
          text,
        }),
      });
      if (!res.ok) console.warn(`alert email failed: ${res.status}`);
    }
  } catch (e) {
    console.warn(`alert email threw: ${e}`);
  }
}

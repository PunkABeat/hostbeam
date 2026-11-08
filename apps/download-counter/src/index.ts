// The download counter (ADR 0030). It sits on the download URLs of
// download.hostbeam.app and on latest.json, hands every request to R2
// unchanged, and when the answer was a whole file or an answered update check,
// adds one to that day's count in D1.
//
// The download always wins. R2 answers first and its response goes back
// as-is: the body is streamed, never read; the count is written after the
// response is on its way; and if anything here throws, the request goes
// straight to R2 as though the Worker were not there.

import { agentOf, counts, countryOf, fileOf, platformOf, type File } from "./classify";

export interface Env {
  DB: D1Database;
}

const COUNT = `INSERT INTO downloads (day, kind, version, agent, platform, country, count)
VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)
ON CONFLICT (day, kind, version, agent, platform, country) DO UPDATE SET count = count + 1`;

export async function count(db: D1Database, request: Request, file: File, now: Date): Promise<void> {
  const ua = request.headers.get("User-Agent");
  const agent = agentOf(ua);
  await db
    .prepare(COUNT)
    .bind(
      now.toISOString().slice(0, 10),
      file.kind,
      file.version,
      agent,
      platformOf(ua, agent),
      countryOf(request.cf as { country?: unknown } | undefined),
    )
    .run();
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    ctx.passThroughOnException();
    const response = await fetch(request);
    const file = fileOf(new URL(request.url).pathname);
    if (file && counts(file, request.method, response.status, request.headers.get("Range"))) {
      ctx.waitUntil(
        count(env.DB, request, file, new Date()).catch((e) =>
          // Seen in `wrangler tail` and the dashboard's logs; the download
          // already went out, so a lost count is all this costs.
          console.error("download not counted:", e instanceof Error ? e.message : e),
        ),
      );
    }
    return response;
  },
} satisfies ExportedHandler<Env>;

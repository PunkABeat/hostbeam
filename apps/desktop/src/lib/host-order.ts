// The hosts you added and the one beams go to; and for the popover's switcher,
// in what order, with what dot.
import type { Host, RecentBeam } from "../types/config";

export type Reach = Record<string, { ok: boolean; at?: number }>;
export type DotStatus = "online" | "offline" | "unknown";

/** The added hosts, in added order, each found in `pool` — or, when it is not
 *  there any more (deleted from `~/.ssh/config`, or an `Include` that is not
 *  there right now), kept as a `missing` stand-in under its own id.
 *
 *  These used to be dropped at launch, and a dropped default made beams go to
 *  the first host in the list without a word — on 2026-10-06, a real one. */
export function addedHosts<H extends Host>(addedIds: string[] | undefined, pool: H[]): H[] {
  return (addedIds || []).map(
    (id) => pool.find((h) => h.id === id) ?? ({ id, name: id, missing: true } as H),
  );
}

/** The host beams go to: the default, even when it is missing — a missing
 *  default refuses, it never hands the beam to another host. The first added
 *  host only when no default is set, or the default is no longer added. */
export function currentHost<H extends Host>(
  added: H[],
  defaultId: string | null | undefined,
): H | null {
  return added.find((h) => h.id === defaultId) ?? added[0] ?? null;
}

/** The added hosts in switcher order: the default first, then the ones
 *  recently beamed to (newest first), then the rest in added order. Each once. */
export function orderForSwitcher(
  added: Host[],
  defaultId: string | null | undefined,
  recent: RecentBeam[],
): Host[] {
  const recentIds = [...new Set(recent.map((r) => r.hostId))];
  const ordered: Host[] = [];
  const seen = new Set<string>();
  const push = (h: Host | undefined) => {
    if (h && !seen.has(h.id)) {
      ordered.push(h);
      seen.add(h.id);
    }
  };
  push(added.find((h) => h.id === defaultId));
  recentIds.forEach((id) => push(added.find((h) => h.id === id)));
  added.forEach(push);
  return ordered;
}

/** The dot beside a host: the last probe's answer when there is one, else
 *  what the host record itself claims, else unknown. */
export function dotFor(reach: Reach | undefined, h: Host): DotStatus {
  const r = reach?.[h.id];
  if (r) return r.ok ? "online" : "offline";
  return h.online === false ? "offline" : "unknown";
}

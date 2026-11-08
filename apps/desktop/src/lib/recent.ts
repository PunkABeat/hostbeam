// Folding the Recent list back into the gestures that made it.
//
// Each beamed file gets its own row — that is what makes a screenshot findable
// again. But the popover shows three rows, and one drop of ten files used to
// fill all three, pushing the nine beams before it out of a list whose entire
// job is the last few. So the popover groups; Preferences, which is where you
// go to hunt for one particular file, still lists them one by one.
import type { RecentBeam } from "../types/config";

export interface RecentGroup {
  /** The first row's id — stable, and what the copy affordance keys on. */
  key: string;
  /** Every row of one gesture, newest gesture first, in send order within it. */
  rows: RecentBeam[];
}

/**
 * Groups *adjacent* rows sharing a `group`, never rows scattered through the
 * list. Recent is chronological and one gesture writes its rows together, so
 * adjacency is the same answer as a lookup — and it cannot merge two separate
 * drops that happen to collide on an id, which a lookup could.
 *
 * Rows written before 0.1.19 carry no `group` and each stand alone, so an
 * existing list keeps rendering exactly as it did.
 */
export function groupRecent(recent: RecentBeam[]): RecentGroup[] {
  const out: RecentGroup[] = [];
  for (const row of recent) {
    const last = out[out.length - 1];
    if (last && row.group && last.rows[0].group === row.group) last.rows.push(row);
    else out.push({ key: row.id, rows: [row] });
  }
  return out;
}

/** Total files across groups — what "and N more" should count, since a reader
 *  means files by it, not gestures. */
export function countFiles(groups: RecentGroup[]): number {
  return groups.reduce((sum, g) => sum + g.rows.length, 0);
}

/**
 * Total thumbnail bytes Recent will carry in the config.
 *
 * The config is mirrored into localStorage, which holds about 5MB. A config
 * that outgrew that threw `QuotaExceededError` out of the hydration path and
 * took the whole window down with it — a blank Preferences you could not even
 * use to clear the thing that broke it. Two guards now stand between those, and
 * this is the one that keeps the config small in the first place.
 *
 * 2MB is roughly a hundred screenshot thumbnails and leaves the quota plenty of
 * headroom for a config that is otherwise a couple of kilobytes.
 */
export const THUMB_BUDGET = 2_000_000;

/**
 * Keeps the newest thumbnails and drops the rest, oldest first.
 *
 * Rows are never removed — only their picture. A Recent entry without a
 * thumbnail still names its file, still copies its path, and still says which
 * host it went to; that is most of what the list is for. Losing the row would
 * lose the beam.
 */
export function trimThumbs<T extends { thumb?: string | null }>(
  rows: T[],
  budget: number = THUMB_BUDGET,
): T[] {
  let used = 0;
  return rows.map((row) => {
    const size = row.thumb?.length ?? 0;
    if (!size) return row;
    if (used + size > budget) return { ...row, thumb: null };
    used += size;
    return row;
  });
}

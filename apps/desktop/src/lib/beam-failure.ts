// What a rejected beam command means for the popover, from the stable code
// Rust rejects with (error.rs `to_code`).
import type { RecentBeam } from "../types/config";

/** The failure cards the popover has, by Rust's code; anything else is the
 *  generic one. Kept in step with `BEAM_ERRORS` (lib/beam-errors.ts). */
const CARDS = ["auth", "perm", "owner", "timeout", "many"] as const;
export type BeamFailureKind = (typeof CARDS)[number];

export type BeamFailure =
  /** The file itself was refused before anything reached the host: not a
   *  failure card — that would blame the connection — but a passing note. */
  { kind: "refused" } | { kind: "failed"; error: BeamFailureKind };

export function classifyBeamFailure(rejection: unknown): BeamFailure {
  const code = String(rejection || "");
  if (code === "file") return { kind: "refused" };
  return {
    kind: "failed",
    error: (CARDS as readonly string[]).includes(code) ? (code as BeamFailureKind) : "timeout",
  };
}

/** The Recent rows one landed gesture adds, newest first within it. The index
 *  is part of the id because a batch lands inside the same millisecond, and
 *  the gesture id keys the rows *and* marks them as one drop. */
export function rowsForGesture(
  gesture: string,
  host: { id: string; name?: string } | null,
  paths: string[],
  previews: (string | null)[] | undefined,
  at: number,
  sources?: (string | null)[],
): RecentBeam[] {
  return paths.map((path, i) => {
    const row: RecentBeam = {
      id: `r${gesture}-${i}`,
      hostId: host?.id ?? "",
      hostName: host?.name,
      path,
      at,
      thumb: previews?.[i] ?? null,
      group: gesture,
    };
    // Only a file has somewhere to be shown: a clipboard picture has no key at all.
    const local = sources?.[i];
    return local ? { ...row, local } : row;
  });
}

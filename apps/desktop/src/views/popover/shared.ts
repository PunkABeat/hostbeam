import type { ClipFile } from "../../lib/ipc";
export type { BeamPhase as Phase } from "../../lib/beam-state";
export interface ClipState {
  /** A picture — never Finder's icon for a copied file. */
  present: boolean;
  width?: number;
  height?: number;
  thumb?: string | null;
  /** Files a copy in Finder named, which a beam sends instead of a picture. */
  files?: ClipFile[];
}
/** One row of the diagnostics, as the command answers it. */
export type { DiagRow } from "../../lib/ipc";

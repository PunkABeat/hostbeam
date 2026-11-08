// The beam error taxonomy — the single source of truth for how a failed beam is
// presented (icon, localized title/detail/hint, and the offered recovery
// actions). Keyed by the stable code the Rust core returns at the command edge
// (timeout / auth / perm / owner / many; any other code falls back to the timeout
// card). Consumed by the popover and preferences error UIs, and the HUD.

import { t } from "../i18n";

/** Mirrors MAX_BATCH in src-tauri/src/beam.rs — the most files one gesture
 *  carries. Shown in a message only; the refusal itself happens in Rust. */
export const MAX_BATCH = 25;

type ErrorHost = { name?: string };

export type RecoverAction = "retry" | "diag" | "switch" | "folder";

export interface BeamErrorDef {
  icon: string;
  /* Card tint: "danger" (default) for real failures; "accent" for a calm
     state where nothing went wrong (too many files at once). */
  tone?: "danger" | "accent";
  title: (host: ErrorHost) => string;
  detail: (host?: ErrorHost, folder?: string) => string;
  hint: (() => string) | null;
  recover: RecoverAction[];
}

export const BEAM_ERRORS: Record<string, BeamErrorDef> = {
  timeout: {
    icon: "x",
    title: (h) => t("err.timeout.title", { host: h.name ?? "" }),
    detail: () => t("err.timeout.detail"),
    hint: null,
    recover: ["retry", "diag", "switch"],
  },
  // Nothing was sent and nothing is wrong with the host, so this is a calm
  // state rather than a failure: the drop was fine, there were simply too many
  // at once.
  many: {
    icon: "info",
    tone: "accent",
    title: () => t("err.many.title"),
    detail: () => t("err.many.detail", { n: MAX_BATCH }),
    hint: () => t("err.many.hint"),
    recover: ["retry"],
  },
  auth: {
    icon: "lock",
    title: (h) => t("err.auth.title", { host: h.name ?? "" }),
    detail: () => t("err.auth.detail"),
    hint: () => t("err.auth.hint"),
    recover: ["retry", "diag"],
  },
  perm: {
    icon: "folder",
    title: () => t("err.perm.title"),
    detail: (_h, folder) => t("err.perm.detail", { folder: folder ?? "" }),
    hint: () => t("err.perm.hint"),
    recover: ["retry", "diag", "folder"],
  },
  // The folder is someone else's: on a shared host, another user made it first.
  // Nothing was sent, and retrying cannot change who owns it, so the way out is
  // choosing a folder.
  owner: {
    icon: "folder",
    title: () => t("err.owner.title"),
    detail: (_h, folder) => t("err.owner.detail", { folder: folder ?? "" }),
    hint: () => t("err.owner.hint"),
    recover: ["diag", "folder"],
  },
  // A file handed over that Hostbeam will not send — a folder, one it cannot
  // read, one over the size cap. The popover shows a passing note for it
  // (`classifyBeamFailure` → refused); this entry is for the HUD, which has
  // only cards, and without it said "{host} didn't answer" about a file that
  // never left the Mac.
  file: {
    icon: "info",
    tone: "accent",
    title: () => t("err.file.title"),
    detail: () => t("pop.dropRefused"),
    hint: null,
    recover: [],
  },
};

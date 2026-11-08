import { Ic } from "@hostbeam/ui";

/** The outcome of a reachability test beside its button: a green check or a
 *  red cross with a word, nothing while idle or testing. */
export function ReachBadge({
  state,
  okLabel,
  failLabel,
  nowrap,
}: {
  state: string;
  okLabel: string;
  failLabel: string;
  /** Keep the label on one line, for a row that must not grow. */
  nowrap?: boolean;
}) {
  if (state !== "ok" && state !== "fail") return null;
  const ok = state === "ok";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 12,
        color: ok ? "var(--success)" : "var(--danger)",
        fontWeight: 500,
        whiteSpace: nowrap ? "nowrap" : undefined,
      }}
    >
      <Ic name={ok ? "check" : "x"} size={14} stroke={2.4} /> {ok ? okLabel : failLabel}
    </span>
  );
}

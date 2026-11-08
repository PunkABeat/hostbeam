import type { ReactNode } from "react";

import { Ic } from "@hostbeam/ui";

export interface WarningNoteProps {
  title: string;
  detail: string;
  /** The note's actions, under the text. */
  children?: ReactNode;
}

/** A note that asks the user to decide something, not a failure: the partial
 *  beam's "some of them reached…" and the held beam's "looks like a secret".
 *  One component, so the two cannot drift apart. */
export function WarningNote({ title, detail, children }: WarningNoteProps) {
  return (
    <div
      style={{
        background: "var(--warning-tint)",
        boxShadow: "inset 0 0 0 1px var(--separator)",
        borderRadius: "var(--radius-md)",
        padding: "10px 11px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
        <Ic
          name="alert-triangle"
          size={13}
          stroke={2.1}
          style={{ color: "var(--warning)", flex: "none", marginTop: 1 }}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: "var(--label)",
              wordBreak: "break-word",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 11, color: "var(--label-secondary)", marginTop: 2 }}>
            {detail}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

import React from "react";
import type { ReactNode } from "react";

/* --- macOS settings group + row -------------------------------------- */
export function Group({
  title,
  children,
  footnote,
  action,
}: {
  title?: ReactNode;
  children?: ReactNode;
  footnote?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      {title || action ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 2px 7px" }}>
          {title ? (
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".05em",
                color: "var(--label-tertiary)",
              }}
            >
              {title}
            </div>
          ) : null}
          {action ? <span className="hb-push">{action}</span> : null}
        </div>
      ) : null}
      <div
        style={{
          background: "var(--surface-content)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "inset 0 0 0 0.5px var(--separator)",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
      {footnote ? (
        <div
          style={{
            fontSize: 11,
            color: "var(--label-tertiary)",
            margin: "7px 2px 0",
            lineHeight: 1.45,
          }}
        >
          {footnote}
        </div>
      ) : null}
    </div>
  );
}
export function Row({
  children,
  first,
  align = "center",
}: {
  children?: ReactNode;
  first?: boolean;
  align?: React.CSSProperties["alignItems"];
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: align,
        gap: 12,
        padding: "11px 14px",
        borderTop: first ? 0 : "1px solid var(--separator)",
      }}
    >
      {children}
    </div>
  );
}
export function Label({ title, sub }: { title?: ReactNode; sub?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
      <span
        style={{
          fontSize: 13,
          color: "var(--label)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </span>
      {sub ? (
        <span
          style={{
            fontSize: 11,
            color: "var(--label-tertiary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {sub}
        </span>
      ) : null}
    </div>
  );
}

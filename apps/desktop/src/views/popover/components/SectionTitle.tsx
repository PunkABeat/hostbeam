import type { CSSProperties, ReactNode } from "react";

/** The small uppercase heading over a popover section. */
export function SectionTitle({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: ".05em",
        color: "var(--label-tertiary)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

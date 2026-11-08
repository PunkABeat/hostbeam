import type { ReactNode } from "react";

import type { BeakSpec } from "../shared";
import { Beak } from "./Beak";

export function PopoverFrame({ children, beak }: { children: ReactNode; beak?: BeakSpec }) {
  const b = beak || { style: "notch", size: 8, offset: 31 };
  return (
    <div style={{ position: "relative", width: 340 }}>
      <Beak {...b} />
      <div
        className="hb-step"
        style={{
          position: "relative",
          zIndex: 1,
          width: 340,
          background: "var(--surface-popover)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-popover)",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

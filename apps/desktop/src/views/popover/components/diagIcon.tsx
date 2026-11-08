import type { ReactNode } from "react";

import { Ic } from "@hostbeam/ui";

export function diagIcon(status: string): ReactNode {
  if (status === "ok") return <Ic name="check" size={14} stroke={2.5} className="hb-fg-success" />;
  if (status === "fail") return <Ic name="x" size={14} stroke={2.5} className="hb-fg-danger" />;
  if (status === "warn")
    return <Ic name="alert-triangle" size={14} stroke={2.1} className="hb-fg-warning" />;
  return <Ic name="minus" size={14} stroke={2.2} className="hb-fg-quaternary" />;
}

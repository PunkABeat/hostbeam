import { Ic } from "@hostbeam/ui";

import { t } from "../../../i18n";
import type { Host } from "../../../types/config";

/** The host beams go to is not in `~/.ssh/config` any more, so nothing beams
 *  until it is back or another host is chosen below. Said in place of the
 *  clipboard card: a beam started from anywhere — the shortcut, the tray, a
 *  link, auto-beam — opens the popover onto this rather than going to some
 *  other host. */
export function MissingHostCard({ host }: { host: Host }) {
  return (
    <div
      style={{
        background: "var(--danger-tint)",
        boxShadow: "inset 0 0 0 1px var(--separator)",
        borderRadius: "var(--radius-md)",
        padding: "10px 11px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <Ic name="info" size={14} stroke={2.4} style={{ color: "var(--danger)", flex: "none" }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--label)" }}>
          {t("pop.missingTitle", { host: host.name ?? host.id })}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--label-secondary)", lineHeight: 1.45 }}>
        {t("pop.missingBody")}
      </div>
    </div>
  );
}

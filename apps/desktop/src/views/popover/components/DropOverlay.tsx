import { Ic } from "@hostbeam/ui";

import { t } from "../../../i18n";

/** A file is over the popover. Covers the card so the target is the whole
 *  thing, not some strip of it, and says where it will land. */
export function DropOverlay({ hostName }: { hostName: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 3,
        borderRadius: "var(--radius-xl)",
        background: "var(--accent-tint)",
        boxShadow: "inset 0 0 0 2px var(--accent)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "0 28px",
        textAlign: "center",
      }}
    >
      <Ic name="upload" size={22} stroke={2} />
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--label)" }}>
        {t("pop.dropHere", { host: hostName })}
      </span>
    </div>
  );
}

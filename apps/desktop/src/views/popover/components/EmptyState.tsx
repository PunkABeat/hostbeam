import { Button, Ic } from "@hostbeam/ui";

import { t } from "../../../i18n";

/** No hosts added yet: the way to the first one. */
export function EmptyState({ onAddHost }: { onAddHost: () => void }) {
  return (
    <div
      style={{
        padding: "28px 22px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 11,
      }}
    >
      <span
        style={{
          width: 46,
          height: 46,
          borderRadius: "50%",
          background: "var(--fill-secondary)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ic name="server" size={22} className="hb-fg-tertiary" />
      </span>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--label)" }}>
        {t("pop.noHostYet")}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--label-secondary)",
          maxWidth: 224,
          lineHeight: 1.5,
        }}
      >
        {t("pop.noHostBody")}
      </div>
      <div style={{ marginTop: 4 }}>
        <Button variant="primary" size="md" icon={<Ic name="plus" size={14} />} onClick={onAddHost}>
          {t("pop.addHost")}
        </Button>
      </div>
    </div>
  );
}

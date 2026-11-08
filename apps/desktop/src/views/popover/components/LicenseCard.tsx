import { Button, Ic } from "@hostbeam/ui";

import { t } from "../../../i18n";
import { openPurchasePage, PRICE } from "../../../lib/license";

export interface LicenseCardProps {
  onDismiss: () => void;
}

/** The ask (ADR 0028), reached from the reminder or the header's
 *  "Unlicensed". Calm and accent-toned like any card where nothing went
 *  wrong: Hostbeam works the same whichever button is pressed. */
export function LicenseCard({ onDismiss }: LicenseCardProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          background: "var(--accent-tint)",
          boxShadow: "inset 0 0 0 1px var(--separator)",
          borderRadius: "var(--radius-md)",
          padding: "10px 11px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
          <Ic name="zap" size={14} stroke={2.4} style={{ color: "var(--accent)", flex: "none" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--label)" }}>
            {t("pop.licenseTitle")}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--label-secondary)", lineHeight: 1.45 }}>
          {t("pop.licenseBody", { price: PRICE })}
        </div>
      </div>
      <div style={{ display: "flex", gap: 9 }}>
        <Button
          variant="primary"
          size="md"
          block
          data-primary
          icon={<Ic name="zap" size={14} />}
          onClick={() => openPurchasePage()}
        >
          {t("pop.buyLicense")}
        </Button>
        <Button
          variant="secondary"
          size="md"
          block
          icon={<Ic name="key" size={14} />}
          onClick={() => window.openPreferences?.("license")}
        >
          {t("pop.enterKey")}
        </Button>
      </div>
      <button
        onClick={onDismiss}
        style={{
          height: 26,
          border: 0,
          cursor: "pointer",
          borderRadius: "var(--radius-md)",
          background: "transparent",
          color: "var(--label-tertiary)",
          fontSize: 12,
        }}
      >
        {t("prefs.notNow")}
      </button>
    </div>
  );
}

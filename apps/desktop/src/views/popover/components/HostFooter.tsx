import { HostSelect, Switch } from "@hostbeam/ui";

import { t } from "../../../i18n";
import type { DotStatus } from "../../../lib/host-order";
import { SectionTitle } from "./SectionTitle";

export interface HostOption {
  id: string;
  name: string;
  address: string;
  /** "error" for a host that is no longer in ~/.ssh/config. */
  status: DotStatus | "error";
  isDefault: boolean;
}

export interface HostFooterProps {
  hosts: HostOption[];
  value: string | undefined;
  onChange: (id: string) => void;
  onAddHost: () => void;
  autoBeam: boolean;
  onAutoBeam: (on: boolean) => void;
}

/** The host switcher — choosing one *is* setting the default — and the
 *  auto-beam switch. Here rather than in Preferences because auto-beam is a
 *  mode you turn on for a session and off after, not a setting you configure
 *  once, and this is where you already are when you decide to start showing
 *  an agent things. How long it lasts is the setting. */
export function HostFooter({
  hosts,
  value,
  onChange,
  onAddHost,
  autoBeam,
  onAutoBeam,
}: HostFooterProps) {
  return (
    <div style={{ padding: "10px 14px 14px", borderTop: "1px solid var(--separator)" }}>
      <SectionTitle style={{ display: "block", margin: "0 2px 6px" }}>
        {t("pop.beamTo")}
      </SectionTitle>
      <HostSelect
        className="pv-upward"
        hosts={hosts}
        value={value}
        onChange={onChange}
        onAddHost={onAddHost}
        t={(key, fallback) => {
          const s = t(key);
          return s === key ? fallback : s;
        }}
      />
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 10,
          padding: "2px 2px 0",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 11.5, color: "var(--label-secondary)", flex: 1 }}>
          {t("pop.autoBeam")}
        </span>
        <Switch checked={autoBeam} onChange={onAutoBeam} />
      </label>
    </div>
  );
}

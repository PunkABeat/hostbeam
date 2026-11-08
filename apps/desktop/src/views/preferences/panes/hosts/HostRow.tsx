import type { ReactNode } from "react";

import { Badge, Ic, StatusDot } from "@hostbeam/ui";

import { Label } from "../../components/SettingsGroup";
import { t } from "../../../../i18n";
import { type PrefHost } from "../../shared";

export interface HostRowProps {
  host: PrefHost;
  index: number;
  count: number;
  isOpen: boolean;
  isDefault: boolean;
  /** "online" | "offline" | "pending" | "unknown" */
  dot: string;
  address: string;
  /** "checked … ago", when a probe has answered. */
  checkedLabel: string | null;
  onToggle: () => void;
  onMove: (dir: number) => void;
  onRemove: () => void;
  /** The details drawer, always mounted so it can animate open and closed. */
  children: ReactNode;
}

/** One host in the "In Hostbeam" list: the row, its reorder and remove
 *  buttons, and the drawer its details open into. */
export function HostRow({
  host: h,
  index: i,
  count,
  isOpen,
  isDefault,
  dot,
  address,
  checkedLabel,
  onToggle,
  onMove,
  onRemove,
  children,
}: HostRowProps) {
  return (
    <div
      className="pf-row"
      style={{
        borderTop: i ? "1px solid var(--separator)" : 0,
        background: isOpen ? "var(--accent-tint)" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? t("prefs.collapse") : t("prefs.expand")} ${h.name}`}
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
            border: 0,
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
            padding: "11px 4px 11px 12px",
          }}
        >
          <Ic
            name="chevron-right"
            size={14}
            stroke={2.3}
            style={{
              flex: "none",
              color: "var(--label-tertiary)",
              transform: isOpen ? "rotate(90deg)" : "none",
              transition: "transform var(--dur-fast) var(--ease-standard)",
            }}
          />
          <StatusDot status={dot as "online" | "pending" | "offline"} />
          <Label title={h.name} sub={address} />
          <span
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {checkedLabel ? (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--label-tertiary)",
                  whiteSpace: "nowrap",
                  flex: "none",
                }}
              >
                {checkedLabel}
              </span>
            ) : null}
            {h.manual ? (
              <span
                style={{
                  fontSize: 9.5,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                  color: "var(--label-tertiary)",
                  border: "1px solid var(--separator)",
                  borderRadius: "var(--radius-xs)",
                  padding: "1px 5px",
                }}
              >
                {t("prefs.manual")}
              </span>
            ) : null}
            {isDefault ? <Badge tone="accent">{t("host.default")}</Badge> : null}
          </span>
        </button>
        {count > 1 ? (
          <span
            style={{
              display: "inline-flex",
              flexDirection: "column",
              flex: "none",
              marginRight: 2,
            }}
          >
            <button
              onClick={() => onMove(-1)}
              disabled={i === 0}
              title={t("prefs.moveUp")}
              aria-label={t("prefs.moveUpAria", { host: h.name ?? "" })}
              className="pf-reorder"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 16,
                border: 0,
                background: "transparent",
                cursor: i === 0 ? "default" : "pointer",
                color: i === 0 ? "var(--label-quaternary)" : "var(--label-tertiary)",
                opacity: i === 0 ? 0.4 : 1,
                padding: 0,
              }}
            >
              <Ic name="chevron-up" size={13} stroke={2.4} />
            </button>
            <button
              onClick={() => onMove(1)}
              disabled={i === count - 1}
              title={t("prefs.moveDown")}
              aria-label={t("prefs.moveDownAria", { host: h.name ?? "" })}
              className="pf-reorder"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 16,
                border: 0,
                background: "transparent",
                cursor: i === count - 1 ? "default" : "pointer",
                color: i === count - 1 ? "var(--label-quaternary)" : "var(--label-tertiary)",
                opacity: i === count - 1 ? 0.4 : 1,
                padding: 0,
              }}
            >
              <Ic name="chevron-down" size={13} stroke={2.4} />
            </button>
          </span>
        ) : null}
        <button
          onClick={onRemove}
          title={t("prefs.removeAria", { host: h.name ?? "" })}
          aria-label={t("prefs.removeAria", { host: h.name ?? "" })}
          style={{
            flex: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            marginRight: 8,
            border: 0,
            cursor: "pointer",
            borderRadius: "var(--radius-md)",
            background: "transparent",
            color: "var(--label-tertiary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--fill-tertiary)";
            e.currentTarget.style.color = "var(--danger)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--label-tertiary)";
          }}
        >
          <Ic name="trash" size={15} stroke={2} />
        </button>
      </div>
      {/* Always mounted so it can animate open/closed; 0fr→1fr grows to
          the content's natural height. `inert` (set via ref) keeps the
          collapsed drawer out of the tab order and off screen readers. */}
      <div
        className="pf-host-drawer"
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: "grid-template-rows 200ms var(--ease-standard)",
        }}
      >
        <div
          ref={(el) => {
            if (el) el.inert = !isOpen;
          }}
          style={{ overflow: "hidden", minHeight: 0 }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

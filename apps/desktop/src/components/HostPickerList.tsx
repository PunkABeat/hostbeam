// Browse-and-pick a host from a pool. Shared by onboarding (Choose a host) and
// Preferences (Add a host): a filter field (shown once the pool exceeds
// `filterThreshold`) over a scrollable, keyboard-navigable listbox — roving
// tabindex, ↑/↓/Home/End within the list, Tab/Shift+Tab in and out.
// Two row behaviours: pass `onPick(host)` for click-to-act, or `renderExpanded(host)`
// to make rows disclosures with an inline drawer.
import { useEffect, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

import { t } from "../i18n";
import { Ic } from "@hostbeam/ui";

export interface PickerHost {
  id: string;
  name?: string;
  address?: string;
  user?: string;
}

export interface HostPickerListProps {
  hosts: PickerHost[];
  onPick?: (host: PickerHost) => void;
  renderExpanded?: ((host: PickerHost) => ReactNode) | null;
  filterThreshold?: number;
  autoFocus?: boolean;
  actionIcon?: string;
  showUser?: boolean;
  emptyText?: ReactNode;
  /** Hosts already added, so an empty result can say *why* it is empty. Adding
   *  the only host you searched for removes it from `hosts`, and without this
   *  the picker answers a successful add with "no matching hosts". */
  addedHosts?: PickerHost[];
  maxHeight?: number;
}

export function HostPickerList({
  hosts,
  onPick,
  renderExpanded = null,
  filterThreshold = 6,
  autoFocus = false,
  actionIcon = "chevron-right",
  showUser = true,
  emptyText,
  addedHosts,
  maxHeight = 240,
}: HostPickerListProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expandable = !!renderExpanded;
  const showFilter = hosts.length > filterThreshold;
  const q = query.trim().toLowerCase();
  const matches = (h: PickerHost) =>
    [h.name, h.address, h.user].some((v) => (v || "").toLowerCase().includes(q));
  const shown = q ? hosts.filter(matches) : hosts;
  // Everything this search matched is already added — the common way to reach
  // an empty list, and the one that must not be reported as "no matches".
  const searchedOnesAdded = q && (addedHosts ?? []).some(matches);
  // Keep the roving tab stop valid as the filtered list changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [query, hosts.length]);
  // Collapse the open drawer if its host leaves the pool (e.g. got added).
  useEffect(() => {
    if (expandedId && !hosts.some((h) => h.id === expandedId)) setExpandedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hosts]);
  const onListKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const ae = document.activeElement;
    if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;
    e.preventDefault();
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(".obA-host"));
    if (!items.length) return;
    const cur = items.indexOf(document.activeElement as HTMLElement);
    let next: number;
    if (e.key === "ArrowDown") next = cur < 0 ? 0 : Math.min(cur + 1, items.length - 1);
    else if (e.key === "ArrowUp") next = cur < 0 ? 0 : Math.max(cur - 1, 0);
    else if (e.key === "Home") next = 0;
    else next = items.length - 1;
    items[next].focus();
  };
  return (
    <>
      {showFilter ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "0 10px",
            height: 30,
            marginBottom: 8,
            background: "var(--surface-content)",
            boxShadow: "inset 0 0 0 0.5px var(--separator)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <Ic name="search" size={14} style={{ color: "var(--label-tertiary)", flex: "none" }} />
          <input
            autoFocus={autoFocus}
            data-autofocus={autoFocus ? "" : undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("host.filter")}
            style={{
              flex: 1,
              minWidth: 0,
              border: 0,
              outline: "none",
              background: "transparent",
              color: "var(--label)",
              fontSize: 12.5,
              fontFamily: "var(--font-system)",
            }}
          />
        </div>
      ) : null}
      <div
        role="listbox"
        aria-label={t("nav.hosts")}
        onKeyDown={onListKey}
        style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight, overflowY: "auto" }}
      >
        {shown.length === 0 ? (
          <div
            style={{
              padding: "12px 4px",
              fontSize: 12,
              color: "var(--label-tertiary)",
              textAlign: "center",
            }}
          >
            {searchedOnesAdded ? t("host.allMatchingAdded") : (emptyText ?? t("host.noMatching"))}
            {q ? (
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => setQuery("")}
                  style={{
                    border: 0,
                    background: "transparent",
                    padding: 0,
                    font: "inherit",
                    color: "var(--accent)",
                    cursor: "pointer",
                  }}
                >
                  {t("host.clearSearch")}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          shown.map((h, i) => {
            const open = expandable && h.id === expandedId;
            return (
              <div
                key={h.id}
                style={{
                  background: "var(--surface-content)",
                  boxShadow: "inset 0 0 0 0.5px var(--separator)",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                  flex: "none",
                }}
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={i === activeIndex}
                  aria-expanded={expandable ? open : undefined}
                  tabIndex={i === activeIndex ? 0 : -1}
                  onFocus={() => setActiveIndex(i)}
                  data-autofocus={autoFocus && !showFilter && i === 0 ? "" : undefined}
                  className="obA-host"
                  onClick={() => (expandable ? setExpandedId(open ? null : h.id) : onPick?.(h))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: expandable ? 10 : 12,
                    width: "100%",
                    textAlign: "left",
                    border: 0,
                    cursor: "pointer",
                    font: "inherit",
                    background: open ? "var(--accent-tint)" : "transparent",
                    padding: "11px 13px",
                  }}
                >
                  {expandable ? (
                    <Ic
                      name="chevron-right"
                      size={14}
                      stroke={2.3}
                      style={{
                        flex: "none",
                        color: "var(--label-tertiary)",
                        transform: open ? "rotate(90deg)" : "none",
                        transition: "transform var(--dur-fast) var(--ease-standard)",
                      }}
                    />
                  ) : null}
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--label)" }}>
                      {h.name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--label-tertiary)",
                        fontFamily: "var(--font-mono)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {showUser && h.user ? h.user + "@" + h.address : h.address}
                    </span>
                  </span>
                  {!expandable ? (
                    <Ic
                      name={actionIcon}
                      size={actionIcon === "plus" ? 15 : 16}
                      stroke={actionIcon === "plus" ? 2.4 : 2}
                      style={{ color: "var(--label-tertiary)", marginLeft: "auto", flex: "none" }}
                    />
                  ) : null}
                </button>
                {expandable ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateRows: open ? "1fr" : "0fr",
                      transition: "grid-template-rows 200ms var(--ease-standard)",
                    }}
                  >
                    <div
                      ref={(el) => {
                        if (el) el.inert = !open;
                      }}
                      style={{ overflow: "hidden", minHeight: 0 }}
                    >
                      <div style={{ borderTop: "1px solid var(--separator)" }}>
                        {renderExpanded?.(h)}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

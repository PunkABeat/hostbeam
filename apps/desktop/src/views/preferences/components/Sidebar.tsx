import React from "react";

import { Ic } from "@hostbeam/ui";
import { t } from "../../../i18n";
import { NAV, type NavItem } from "../shared";
import { NavTile } from "./NavTile";

export function Sidebar({
  tab,
  setTab,
  updateDot = false,
}: {
  tab: string;
  setTab: (id: string) => void;
  updateDot?: boolean;
}) {
  const [q, setQ] = React.useState("");
  const navLabel = (n: NavItem) => t("nav." + n.id);
  const items = NAV.filter((n) => navLabel(n).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <aside
      style={{
        width: 218,
        flex: "none",
        display: "flex",
        flexDirection: "column",
        background: "var(--surface-sunken)",
        borderRight: "1px solid var(--separator)",
      }}
    >
      {/* the real macOS traffic lights (Overlay title bar) float here over the
          sidebar; this is just a draggable spacer that reserves their height. */}
      <div data-tauri-drag-region style={{ height: 38, flex: "none" }} />
      {/* search */}
      <div style={{ padding: "2px 12px 10px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            height: 26,
            padding: "0 8px",
            borderRadius: "var(--radius-md)",
            background: "var(--fill-secondary)",
          }}
        >
          <Ic name="search" size={13} stroke={2.1} className="hb-fg-tertiary" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("prefs.search")}
            aria-label={t("prefs.searchSettings")}
            style={{
              flex: 1,
              minWidth: 0,
              border: 0,
              outline: 0,
              background: "transparent",
              fontFamily: "inherit",
              fontSize: 12.5,
              color: "var(--label)",
            }}
          />
        </div>
      </div>
      {/* nav list */}
      <nav
        aria-label={t("prefs.sections")}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "0 10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {items.map((n, i) => {
          const sel = n.id === tab;
          const onNavKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            e.preventDefault();
            const ni =
              e.key === "ArrowDown" ? Math.min(i + 1, items.length - 1) : Math.max(i - 1, 0);
            setTab(items[ni].id);
            const btns =
              e.currentTarget.parentElement?.querySelectorAll<HTMLElement>("[data-navitem]");
            if (btns?.[ni]) btns[ni].focus();
          };
          return (
            <button
              key={n.id}
              data-navitem
              onClick={() => setTab(n.id)}
              onKeyDown={onNavKey}
              aria-current={sel ? "page" : undefined}
              className={"pf-nav-item" + (sel ? " is-sel" : "")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                width: "100%",
                textAlign: "left",
                border: 0,
                cursor: "pointer",
                padding: "5px 8px",
                borderRadius: "var(--radius-md)",
                background: sel ? "var(--accent)" : "transparent",
              }}
            >
              <NavTile item={n} />
              <span style={{ fontSize: 13, fontWeight: 400, color: sel ? "#fff" : "var(--label)" }}>
                {navLabel(n)}
              </span>
              {updateDot && n.id === "about" ? (
                <span
                  aria-hidden
                  style={{
                    marginLeft: "auto",
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    flex: "none",
                    background: sel ? "#fff" : "var(--accent)",
                  }}
                />
              ) : null}
            </button>
          );
        })}
        {items.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--label-tertiary)", padding: "8px 9px" }}>
            {t("prefs.noResults")}
          </div>
        ) : null}
      </nav>
    </aside>
  );
}

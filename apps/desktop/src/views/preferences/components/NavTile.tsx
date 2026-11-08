import { Ic } from "@hostbeam/ui";
import type { NavItem } from "../shared";

/* Rounded colored icon tile, white glyph — the Ventura signature. */
export function NavTile({ item }: { item: NavItem }) {
  if (item.appIcon) {
    return (
      <img
        src="/assets/hostbeam-icon.svg"
        width="22"
        height="22"
        alt=""
        style={{ borderRadius: 5, flex: "none", boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.12)" }}
      />
    );
  }
  return (
    <span
      style={{
        width: 22,
        height: 22,
        borderRadius: 5,
        flex: "none",
        background: item.tile,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.10), 0 0.5px 1px rgba(0,0,0,.10)",
      }}
    >
      <Ic name={item.icon} size={13.5} stroke={2.1} className="hb-fg-white" />
    </span>
  );
}

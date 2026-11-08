import React from "react";

import { NAV } from "../shared";

/** The active pane, driven by the URL hash so the popover's "Add a host…"
 *  can open this window — already running or not — at #hosts. */
export function useTab(): [string, (tab: string) => void] {
  const [tab, setTab] = React.useState(() => {
    const h = (window.location.hash || "").replace("#", "");
    return NAV.some((n) => n.id === h) ? h : "general";
  });
  React.useEffect(() => {
    const onHash = () => {
      const h = (window.location.hash || "").replace("#", "");
      if (NAV.some((n) => n.id === h)) setTab(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return [tab, setTab];
}

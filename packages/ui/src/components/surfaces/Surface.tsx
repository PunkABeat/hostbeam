import type { CSSProperties, ElementType, ReactNode } from "react";

/**
 * Container primitive carrying Hostbeam's shadow + hairline-ring system.
 * `popover` is the 340px menu-bar shell; `card`/`raised`/`well` are inner
 * groupings; `sheet` is the first-run surface.
 */
export interface SurfaceProps {
  children?: ReactNode;
  variant?: "popover" | "card" | "raised" | "well" | "sheet";
  /** Apply standard popover padding. */
  padded?: boolean;
  /** Render as a different element. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  [key: string]: unknown;
}

/**
 * This component's stylesheet, exported so a server-rendered page can put it
 * in <head> before the island hydrates — otherwise the markup ships with
 * class names nothing has defined yet and paints as an unstyled control.
 * `ensureStyle()` still covers client-only rendering (the Mac app), and
 * stands down when the page already emitted the sheet.
 */
export const surfaceCss = `
  .hb-surface{font-family:var(--font-system);color:var(--label);box-sizing:border-box;}
  .hb-surface--popover{width:var(--popover-width);background:var(--surface-popover);
    border-radius:var(--radius-xl);box-shadow:var(--shadow-popover);overflow:hidden;}
  .hb-surface--card{background:var(--surface-content);border-radius:var(--radius-lg);
    box-shadow:inset 0 0 0 0.5px var(--separator);}
  .hb-surface--raised{background:var(--surface-raised);border-radius:var(--radius-lg);
    box-shadow:var(--shadow-control),inset 0 0 0 0.5px var(--separator);}
  .hb-surface--well{background:var(--surface-sunken);border-radius:var(--radius-md);
    box-shadow:var(--shadow-inset);}
  .hb-surface--sheet{background:var(--surface-popover);border-radius:var(--radius-2xl);
    box-shadow:var(--shadow-popover);overflow:hidden;}
  .hb-surface--pad{padding:var(--popover-pad);}
`;

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  if (document.getElementById("hb-surface")) return;
  const el = document.createElement("style");
  el.id = "hb-surface";
  el.textContent = surfaceCss;
  document.head.appendChild(el);
}

export function Surface({
  children,
  variant = "card",
  padded = false,
  className = "",
  style = {},
  as: Tag = "div",
  ...rest
}: SurfaceProps) {
  ensureStyle();
  const cls = ["hb-surface", `hb-surface--${variant}`, padded ? "hb-surface--pad" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={cls} style={style} {...rest}>
      {children}
    </Tag>
  );
}

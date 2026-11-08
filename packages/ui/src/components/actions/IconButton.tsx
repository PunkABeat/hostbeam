import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Compact icon-only button for row and toolbar affordances (copy, settings,
 * close, retry). Always pass `label` for accessibility.
 */
export interface IconButtonProps extends ComponentPropsWithoutRef<"button"> {
  /** Icon node (Lucide / SF Symbol element). */
  icon: ReactNode;
  /** Accessible label, also used as the tooltip title. */
  label: string;
  size?: "sm" | "md" | "lg";
  /** `plain` (transparent), `solid` (neutral fill), `accent` (beam tint on hover). */
  variant?: "plain" | "solid" | "accent";
}

/**
 * This component's stylesheet, exported so a server-rendered page can put it
 * in <head> before the island hydrates — otherwise the markup ships with
 * class names nothing has defined yet and paints as an unstyled control.
 * `ensureStyle()` still covers client-only rendering (the Mac app), and
 * stands down when the page already emitted the sheet.
 */
export const iconButtonCss = `
  .hb-iconbtn{
    -webkit-appearance:none;appearance:none;border:0;cursor:pointer;padding:0;
    display:inline-flex;align-items:center;justify-content:center;
    color:var(--label-secondary);background:transparent;
    border-radius:var(--radius-md);transition:var(--transition-control);
  }
  .hb-iconbtn:hover{background:var(--fill-hover);color:var(--label);}
  .hb-iconbtn:active{background:var(--fill-active);transform:scale(var(--press-scale));}
  .hb-iconbtn:focus-visible{outline:none;box-shadow:var(--ring-focus);}
  .hb-iconbtn:disabled{opacity:.4;pointer-events:none;}
  .hb-iconbtn--sm{width:22px;height:22px;}
  .hb-iconbtn--md{width:28px;height:28px;}
  .hb-iconbtn--lg{width:32px;height:32px;}
  .hb-iconbtn--solid{background:var(--fill-secondary);color:var(--label);box-shadow:inset 0 0 0 0.5px var(--separator);}
  .hb-iconbtn--solid:hover{background:var(--fill-tertiary);}
  .hb-iconbtn--accent{color:var(--accent);}
  .hb-iconbtn--accent:hover{background:var(--accent-tint);}
  .hb-iconbtn__g{display:inline-flex;}
`;

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  if (document.getElementById("hb-iconbutton")) return;
  const el = document.createElement("style");
  el.id = "hb-iconbutton";
  el.textContent = iconButtonCss;
  document.head.appendChild(el);
}

export function IconButton({
  icon,
  label,
  size = "md",
  variant = "plain",
  disabled = false,
  onClick,
  className = "",
  ...rest
}: IconButtonProps) {
  ensureStyle();
  const cls = [
    "hb-iconbtn",
    `hb-iconbtn--${size}`,
    variant !== "plain" ? `hb-iconbtn--${variant}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type="button"
      className={cls}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      {...rest}
    >
      <span className="hb-iconbtn__g">{icon}</span>
    </button>
  );
}

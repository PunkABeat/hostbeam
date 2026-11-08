import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Lightweight hover tooltip for icon buttons and truncated paths. Dark
 * capsule above the trigger; quick fade.
 */
export interface TooltipProps extends ComponentPropsWithoutRef<"span"> {
  /** Tooltip text. */
  label: ReactNode;
  /** Monospace + wrapping — use when showing a full remote path. */
  mono?: boolean;
}

/**
 * This component's stylesheet, exported so a server-rendered page can put it
 * in <head> before the island hydrates — otherwise the markup ships with
 * class names nothing has defined yet and paints as an unstyled control.
 * `ensureStyle()` still covers client-only rendering (the Mac app), and
 * stands down when the page already emitted the sheet.
 */
export const tooltipCss = `
  .hb-tip{position:relative;display:inline-flex;}
  .hb-tip__bubble{
    position:absolute;z-index:60;left:50%;transform:translateX(-50%) translateY(2px);
    bottom:calc(100% + 6px);pointer-events:none;
    background:#1d1d1f;color:#fff;font-family:var(--font-system);
    font-size:var(--text-footnote);font-weight:var(--weight-medium);line-height:1.3;
    padding:5px 8px;border-radius:var(--radius-sm);white-space:nowrap;max-width:220px;
    box-shadow:var(--shadow-menu);opacity:0;transition:opacity var(--dur-fast) var(--ease-out),transform var(--dur-fast) var(--ease-out);
  }
  .hb-tip__bubble--mono{font-family:var(--font-mono);font-size:var(--text-caption);white-space:normal;word-break:break-all;}
  .hb-tip:hover .hb-tip__bubble,.hb-tip:focus-within .hb-tip__bubble{opacity:1;transform:translateX(-50%) translateY(0);}
  .hb-tip__bubble::after{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);
    border:4px solid transparent;border-top-color:#1d1d1f;}
`;

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  if (document.getElementById("hb-tooltip")) return;
  const el = document.createElement("style");
  el.id = "hb-tooltip";
  el.textContent = tooltipCss;
  document.head.appendChild(el);
}

export function Tooltip({ children, label, mono = false, className = "", ...rest }: TooltipProps) {
  ensureStyle();
  return (
    <span className={["hb-tip", className].filter(Boolean).join(" ")} {...rest}>
      {children}
      <span
        className={["hb-tip__bubble", mono ? "hb-tip__bubble--mono" : ""].join(" ")}
        role="tooltip"
      >
        {label}
      </span>
    </span>
  );
}

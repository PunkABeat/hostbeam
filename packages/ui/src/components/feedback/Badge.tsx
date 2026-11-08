import type { ComponentPropsWithoutRef } from "react";

/**
 * Small status pill for upload / host states (Uploaded, Connecting,
 * Unreachable). Tone maps to the semantic palette.
 */
export interface BadgeProps extends ComponentPropsWithoutRef<"span"> {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  /** Filled style (white text on solid color) vs. default tinted style. */
  solid?: boolean;
  /** Show a leading dot in the current color. */
  dot?: boolean;
}

/**
 * This component's stylesheet, exported so a server-rendered page can put it
 * in <head> before the island hydrates — otherwise the markup ships with
 * class names nothing has defined yet and paints as an unstyled control.
 * `ensureStyle()` still covers client-only rendering (the Mac app), and
 * stands down when the page already emitted the sheet.
 */
export const badgeCss = `
  .hb-badge{display:inline-flex;align-items:center;gap:var(--space-2);
    font-family:var(--font-system);font-size:var(--text-footnote);font-weight:var(--weight-semibold);
    line-height:1;padding:3px 8px;border-radius:var(--radius-full);white-space:nowrap;letter-spacing:var(--tracking-snug);}
  .hb-badge--neutral{background:var(--fill-secondary);color:var(--label-secondary);}
  .hb-badge--accent{background:var(--accent-tint);color:var(--accent);}
  .hb-badge--success{background:var(--success-tint);color:var(--success);}
  .hb-badge--warning{background:var(--warning-tint);color:var(--warning);}
  .hb-badge--danger{background:var(--danger-tint);color:var(--danger);}
  .hb-badge__dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex:none;}
  .hb-badge--solid{color:#fff;}
  .hb-badge--solid.hb-badge--accent{background:var(--accent);}
  .hb-badge--solid.hb-badge--success{background:var(--success);}
  .hb-badge--solid.hb-badge--warning{background:var(--warning);}
  .hb-badge--solid.hb-badge--danger{background:var(--danger);}
`;

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  if (document.getElementById("hb-badge")) return;
  const el = document.createElement("style");
  el.id = "hb-badge";
  el.textContent = badgeCss;
  document.head.appendChild(el);
}

export function Badge({
  children,
  tone = "neutral",
  solid = false,
  dot = false,
  className = "",
  ...rest
}: BadgeProps) {
  ensureStyle();
  const cls = ["hb-badge", `hb-badge--${tone}`, solid ? "hb-badge--solid" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      {dot ? <span className="hb-badge__dot" /> : null}
      {children}
    </span>
  );
}

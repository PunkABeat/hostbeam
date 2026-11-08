import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Hostbeam primary action button. Use exactly one `primary` button per surface —
 * it carries the single upload action; everything else is `secondary` or `ghost`.
 */
export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  /** Visual emphasis. Only one `primary` per surface. */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** Control height. `lg` is reserved for the main upload action. */
  size?: "sm" | "md" | "lg";
  /** Stretch to container width (full-width popover button). */
  block?: boolean;
  /** Leading icon node (e.g. a Lucide / SF Symbol element, 1em sized). */
  icon?: ReactNode;
  /** Trailing icon node. */
  iconRight?: ReactNode;
}

/**
 * This component's stylesheet, exported so a server-rendered page can put it
 * in <head> before the island hydrates — otherwise the markup ships with
 * class names nothing has defined yet and paints as an unstyled control.
 * `ensureStyle()` still covers client-only rendering (the Mac app), and
 * stands down when the page already emitted the sheet.
 */
export const buttonCss = `
  .hb-btn{
    -webkit-appearance:none;appearance:none;border:0;cursor:pointer;
    font-family:var(--font-system);font-weight:var(--weight-semibold);
    display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);
    border-radius:var(--radius-md);white-space:nowrap;user-select:none;
    transition:var(--transition-control);position:relative;
  }
  .hb-btn:focus-visible{outline:none;box-shadow:var(--ring-focus);}
  .hb-btn:disabled{opacity:.4;cursor:default;pointer-events:none;}
  .hb-btn--block{width:100%;}
  .hb-btn--sm{height:var(--control-height-sm);padding:0 var(--space-4);font-size:var(--text-callout);}
  .hb-btn--md{height:var(--control-height);padding:0 var(--space-6);font-size:var(--text-body);}
  .hb-btn--lg{height:var(--control-height-lg);padding:0 var(--space-7);font-size:var(--text-body);}
  .hb-btn--primary{background:var(--accent);color:var(--label-on-accent);box-shadow:var(--shadow-accent);}
  .hb-btn--primary:hover{background:var(--accent-hover);}
  .hb-btn--primary:active{background:var(--accent-active);transform:scale(var(--press-scale));}
  .hb-btn--secondary{background:var(--fill-secondary);color:var(--label);box-shadow:inset 0 0 0 0.5px var(--separator);}
  .hb-btn--secondary:hover{background:var(--fill-tertiary);}
  .hb-btn--secondary:active{background:var(--fill-tertiary);transform:scale(var(--press-scale));}
  .hb-btn--ghost{background:transparent;color:var(--label);}
  .hb-btn--ghost:hover{background:var(--fill-hover);}
  .hb-btn--ghost:active{background:var(--fill-active);transform:scale(var(--press-scale));}
  .hb-btn--danger{background:transparent;color:var(--danger);box-shadow:inset 0 0 0 0.5px color-mix(in srgb, var(--danger) 40%, transparent);}
  .hb-btn--danger:hover{background:var(--danger-tint);}
  .hb-btn--danger:active{transform:scale(var(--press-scale));}
  .hb-btn__icon{display:inline-flex;width:1em;height:1em;margin-top:-1px;}
`;

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  if (document.getElementById("hb-button")) return;
  const el = document.createElement("style");
  el.id = "hb-button";
  el.textContent = buttonCss;
  document.head.appendChild(el);
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  block = false,
  icon = null,
  iconRight = null,
  disabled = false,
  type = "button",
  onClick,
  className = "",
  ...rest
}: ButtonProps) {
  ensureStyle();
  const cls = [
    "hb-btn",
    `hb-btn--${variant}`,
    `hb-btn--${size}`,
    block ? "hb-btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={cls} disabled={disabled} onClick={onClick} {...rest}>
      {icon ? <span className="hb-btn__icon">{icon}</span> : null}
      {children}
      {iconRight ? <span className="hb-btn__icon">{iconRight}</span> : null}
    </button>
  );
}

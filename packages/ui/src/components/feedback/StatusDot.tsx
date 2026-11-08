import type { ComponentPropsWithoutRef } from "react";

/**
 * Tiny host-health / beam-status dot. Pair with a label for hosts and
 * recent beams; enable `pulse` for a host that is warming up.
 */
export interface StatusDotProps extends ComponentPropsWithoutRef<"span"> {
  status?: "online" | "pending" | "offline" | "error";
  size?: "sm" | "md" | "lg";
  /** Soft expanding pulse — only applies to `pending`. */
  pulse?: boolean;
}

/**
 * This component's stylesheet, exported so a server-rendered page can put it
 * in <head> before the island hydrates — otherwise the markup ships with
 * class names nothing has defined yet and paints as an unstyled control.
 * `ensureStyle()` still covers client-only rendering (the Mac app), and
 * stands down when the page already emitted the sheet.
 */
export const statusDotCss = `
  .hb-dot{display:inline-block;border-radius:50%;flex:none;position:relative;}
  .hb-dot--sm{width:6px;height:6px;}
  .hb-dot--md{width:8px;height:8px;}
  .hb-dot--lg{width:10px;height:10px;}
  .hb-dot--online{background:var(--dot-online);}
  .hb-dot--pending{background:var(--dot-pending);}
  .hb-dot--offline{background:var(--dot-offline);}
  .hb-dot--error{background:var(--dot-error);}
  .hb-dot--ring{box-shadow:0 0 0 3px color-mix(in srgb, currentColor 18%, transparent);}
  @keyframes hb-dot-pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb, var(--dot-pending) 50%, transparent);}70%{box-shadow:0 0 0 5px transparent;}100%{box-shadow:0 0 0 0 transparent;}}
  .hb-dot--pulse{animation:hb-dot-pulse 1.6s var(--ease-out) infinite;}
  @media (prefers-reduced-motion: reduce){.hb-dot--pulse{animation:none;}}
`;

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  if (document.getElementById("hb-statusdot")) return;
  const el = document.createElement("style");
  el.id = "hb-statusdot";
  el.textContent = statusDotCss;
  document.head.appendChild(el);
}

export function StatusDot({
  status = "offline",
  size = "md",
  pulse = false,
  className = "",
  ...rest
}: StatusDotProps) {
  ensureStyle();
  const cls = [
    "hb-dot",
    `hb-dot--${size}`,
    `hb-dot--${status}`,
    pulse && status === "pending" ? "hb-dot--pulse" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <span className={cls} {...rest} />;
}

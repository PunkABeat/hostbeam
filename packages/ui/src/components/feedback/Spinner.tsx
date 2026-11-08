import type { ComponentPropsWithoutRef } from "react";

/**
 * Quiet indeterminate spinner for the beaming state. Thin ring, no color
 * flash. Use `onaccent` on the primary button mid-beam.
 */
export interface SpinnerProps extends ComponentPropsWithoutRef<"span"> {
  /** Diameter in px. */
  size?: number;
  /** Ring thickness in px. */
  thickness?: number;
  tone?: "accent" | "neutral" | "onaccent";
}

/**
 * This component's stylesheet, exported so a server-rendered page can put it
 * in <head> before the island hydrates — otherwise the markup ships with
 * class names nothing has defined yet and paints as an unstyled control.
 * `ensureStyle()` still covers client-only rendering (the Mac app), and
 * stands down when the page already emitted the sheet.
 */
export const spinnerCss = `
  @keyframes hb-spin{to{transform:rotate(360deg);}}
  .hb-spinner{display:inline-block;border-radius:50%;
    border-style:solid;border-color:var(--fill-tertiary);
    border-top-color:var(--accent);animation:hb-spin .7s linear infinite;flex:none;}
  .hb-spinner--neutral{border-top-color:var(--label-secondary);}
  .hb-spinner--onaccent{border-color:rgba(255,255,255,.35);border-top-color:#fff;}
  @media (prefers-reduced-motion: reduce){.hb-spinner{animation-duration:1.4s;}}
`;

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  if (document.getElementById("hb-spinner")) return;
  const el = document.createElement("style");
  el.id = "hb-spinner";
  el.textContent = spinnerCss;
  document.head.appendChild(el);
}

export function Spinner({
  size = 16,
  thickness = 2,
  tone = "accent",
  className = "",
  style = {},
  ...rest
}: SpinnerProps) {
  ensureStyle();
  const cls = ["hb-spinner", tone !== "accent" ? `hb-spinner--${tone}` : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <span
      className={cls}
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size, borderWidth: thickness, ...style }}
      {...rest}
    />
  );
}

import { useState } from "react";
import type { ChangeEvent, ReactNode } from "react";

/**
 * macOS-style toggle for binary settings (e.g. "Beam immediately",
 * "Launch at login"). Controlled or uncontrolled.
 */
export interface SwitchProps {
  /** Controlled on/off. */
  checked?: boolean;
  /** Initial state when uncontrolled. */
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  /** Optional trailing label. */
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
  [key: string]: unknown;
}

/**
 * This component's stylesheet, exported so a server-rendered page can put it
 * in <head> before the island hydrates — otherwise the markup ships with
 * class names nothing has defined yet and paints as an unstyled control.
 * `ensureStyle()` still covers client-only rendering (the Mac app), and
 * stands down when the page already emitted the sheet.
 */
export const switchCss = `
  .hb-switch{display:inline-flex;align-items:center;gap:var(--space-3);cursor:pointer;user-select:none;}
  .hb-switch--disabled{opacity:.4;pointer-events:none;}
  .hb-switch__track{
    position:relative;width:34px;height:20px;border-radius:var(--radius-full);
    background:var(--fill-tertiary);box-shadow:inset 0 0 0 0.5px var(--separator);
    transition:background var(--dur-fast) var(--ease-standard);flex:none;
  }
  .hb-switch__track--on{background:var(--accent);box-shadow:none;}
  .hb-switch__knob{
    position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.3),0 0 0 0.5px rgba(0,0,0,.06);
    transition:transform var(--dur-fast) var(--ease-out);
  }
  .hb-switch__track--on .hb-switch__knob{transform:translateX(14px);}
  .hb-switch__label{font-size:var(--text-body);color:var(--label);}
  .hb-switch input{position:absolute;opacity:0;width:0;height:0;}
  .hb-switch__track:focus-within{box-shadow:inset 0 0 0 0.5px var(--separator),var(--ring-focus);}
`;

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  if (document.getElementById("hb-switch")) return;
  const el = document.createElement("style");
  el.id = "hb-switch";
  el.textContent = switchCss;
  document.head.appendChild(el);
}

export function Switch({
  checked,
  defaultChecked,
  onChange,
  label,
  disabled = false,
  className = "",
  ...rest
}: SwitchProps) {
  ensureStyle();
  const controlled = checked !== undefined;
  const [internal, setInternal] = useState(!!defaultChecked);
  const on = controlled ? checked : internal;
  const toggle = (e: ChangeEvent<HTMLInputElement>) => {
    if (!controlled) setInternal(e.target.checked);
    onChange?.(e.target.checked);
  };
  return (
    <label
      className={["hb-switch", disabled ? "hb-switch--disabled" : "", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      <span className={["hb-switch__track", on ? "hb-switch__track--on" : ""].join(" ")}>
        <input type="checkbox" checked={on} onChange={toggle} disabled={disabled} />
        <span className="hb-switch__knob" />
      </span>
      {label ? <span className="hb-switch__label">{label}</span> : null}
    </label>
  );
}

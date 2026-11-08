import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react";

/**
 * Labeled text input for setup surfaces (host alias, remote folder, hotkey).
 * Use `mono` for paths and anything echoing literal remote values.
 */
export interface FieldProps {
  /** Small uppercase label above the box. */
  label?: ReactNode;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  /** Leading icon node. */
  icon?: ReactNode;
  /** Trailing mono suffix (e.g. a unit or hint). */
  suffix?: ReactNode;
  /** Render the input in monospace — use for paths/hosts. */
  mono?: boolean;
  /** Error state: red ring + red help text. */
  invalid?: boolean;
  /** Helper or error message below the box. */
  help?: ReactNode;
  type?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  [key: string]: unknown;
}

/**
 * This component's stylesheet, exported so a server-rendered page can put it
 * in <head> before the island hydrates — otherwise the markup ships with
 * class names nothing has defined yet and paints as an unstyled control.
 * `ensureStyle()` still covers client-only rendering (the Mac app), and
 * stands down when the page already emitted the sheet.
 */
export const fieldCss = `
  .hb-field{display:flex;flex-direction:column;gap:var(--space-2);}
  .hb-field__label{font-size:var(--text-subhead);font-weight:var(--weight-semibold);
    color:var(--label-secondary);letter-spacing:var(--tracking-snug);}
  .hb-field__box{display:flex;align-items:center;gap:var(--space-3);
    background:var(--surface-content);border-radius:var(--radius-md);
    box-shadow:inset 0 0 0 1px var(--border-field);
    padding:0 var(--space-4);height:var(--control-height);
    transition:var(--transition-control);}
  .hb-field__box:focus-within{box-shadow:inset 0 0 0 1px var(--accent), var(--ring-focus);}
  .hb-field--invalid .hb-field__box{box-shadow:inset 0 0 0 1px var(--danger);}
  .hb-field--invalid .hb-field__box:focus-within{box-shadow:inset 0 0 0 1px var(--danger),0 0 0 3px var(--danger-tint);}
  .hb-field__icon{display:inline-flex;color:var(--label-tertiary);flex:none;}
  .hb-field__input{flex:1;min-width:0;border:0;outline:none;background:transparent;
    font-family:var(--font-system);font-size:var(--text-body);color:var(--label);padding:0;}
  .hb-field__input::placeholder{color:var(--label-tertiary);}
  .hb-field--mono .hb-field__input{font-family:var(--font-mono);font-size:var(--role-mono-size);}
  .hb-field__suffix{font-family:var(--font-mono);font-size:var(--text-caption);color:var(--label-tertiary);flex:none;}
  .hb-field__help{font-size:var(--text-footnote);color:var(--label-tertiary);}
  .hb-field--invalid .hb-field__help{color:var(--danger);}
`;

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  if (document.getElementById("hb-field")) return;
  const el = document.createElement("style");
  el.id = "hb-field";
  el.textContent = fieldCss;
  document.head.appendChild(el);
}

export function Field({
  label,
  value,
  defaultValue,
  placeholder,
  icon = null,
  suffix = null,
  mono = false,
  invalid = false,
  help,
  type = "text",
  onChange,
  className = "",
  inputProps = {},
  ...rest
}: FieldProps) {
  ensureStyle();
  const cls = [
    "hb-field",
    mono ? "hb-field--mono" : "",
    invalid ? "hb-field--invalid" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <label className={cls} {...rest}>
      {label ? <span className="hb-field__label">{label}</span> : null}
      <span className="hb-field__box">
        {icon ? <span className="hb-field__icon">{icon}</span> : null}
        <input
          className="hb-field__input"
          type={type}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          onChange={onChange}
          {...inputProps}
        />
        {suffix ? <span className="hb-field__suffix">{suffix}</span> : null}
      </span>
      {help ? <span className="hb-field__help">{help}</span> : null}
    </label>
  );
}

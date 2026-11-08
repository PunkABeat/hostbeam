import type { ComponentPropsWithoutRef } from "react";

/**
 * Renders a keyboard shortcut as macOS keycaps (⌘⇧7). The one place
 * Hostbeam uses unicode glyphs as icons — for the global hotkey display.
 */
export interface KeycapProps extends ComponentPropsWithoutRef<"span"> {
  /** Combo string like "cmd shift 7" or "ctrl opt return". */
  combo?: string;
  /** Or pass already-split tokens. */
  keys?: string[];
  size?: "md" | "lg";
  /** Render filled in the beam accent (e.g. an active hotkey). */
  accent?: boolean;
}

/**
 * This component's stylesheet, exported so a server-rendered page can put it
 * in <head> before the island hydrates — otherwise the markup ships with
 * class names nothing has defined yet and paints as an unstyled control.
 * `ensureStyle()` still covers client-only rendering (the Mac app), and
 * stands down when the page already emitted the sheet.
 */
export const keycapCss = `
  .hb-keys{display:inline-flex;align-items:center;gap:3px;}
  .hb-key{display:inline-flex;align-items:center;justify-content:center;
    min-width:18px;height:18px;padding:0 4px;box-sizing:border-box;
    font-family:var(--font-system);font-size:11px;font-weight:var(--weight-medium);line-height:1;
    color:var(--label-secondary);background:var(--surface-content);
    border-radius:var(--radius-xs);box-shadow:inset 0 0 0 0.5px var(--border-field),0 1px 0 var(--separator);}
  .hb-key--lg{min-width:24px;height:24px;font-size:13px;}
  .hb-key--accent{color:#fff;background:var(--accent);box-shadow:none;}
`;

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  if (document.getElementById("hb-keycap")) return;
  const el = document.createElement("style");
  el.id = "hb-keycap";
  el.textContent = keycapCss;
  document.head.appendChild(el);
}

const SYM: Record<string, string> = {
  cmd: "⌘",
  command: "⌘",
  meta: "⌘",
  shift: "⇧",
  alt: "⌥",
  option: "⌥",
  opt: "⌥",
  ctrl: "⌃",
  control: "⌃",
  enter: "↩",
  return: "↩",
  esc: "⎋",
  escape: "⎋",
  tab: "⇥",
  space: "␣",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  del: "⌫",
  backspace: "⌫",
};

export function Keycap({
  combo,
  keys,
  size = "md",
  accent = false,
  className = "",
  ...rest
}: KeycapProps) {
  ensureStyle();
  const parts = keys
    ? keys
    : String(combo || "")
        .trim()
        .split(/[\s+]+/)
        .filter(Boolean);
  const cls = ["hb-key", size === "lg" ? "hb-key--lg" : "", accent ? "hb-key--accent" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={["hb-keys", className].filter(Boolean).join(" ")} {...rest}>
      {parts.map((p, i) => {
        const key = String(p).toLowerCase();
        const label = SYM[key] || (p.length === 1 ? p.toUpperCase() : p);
        return (
          <kbd key={i} className={cls}>
            {label}
          </kbd>
        );
      })}
    </span>
  );
}

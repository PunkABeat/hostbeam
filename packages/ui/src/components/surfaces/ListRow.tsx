import type { ElementType, MouseEvent, ReactNode } from "react";

/**
 * The workhorse list row for host lists and recent beams: leading slot
 * (thumbnail / icon / dot), title + subtitle, trailing slot (badge / action).
 * Separators auto-inset to the content edge.
 */
export interface ListRowProps {
  /** Leading node — a thumbnail, icon, or StatusDot. */
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Trailing node — a Badge, IconButton, or timestamp. */
  trailing?: ReactNode;
  /** Render the title in monospace (recent-beam filenames). */
  monoTitle?: boolean;
  /** Render the subtitle in monospace (paths). */
  monoSub?: boolean;
  /** Selected style (beam tint). */
  selected?: boolean;
  /** Hover/press affordance; also set automatically when `onClick` is given. */
  interactive?: boolean;
  onClick?: (e: MouseEvent) => void;
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
export const listRowCss = `
  .hb-row{display:flex;align-items:center;gap:var(--space-4);width:100%;text-align:left;
    font-family:var(--font-system);color:var(--label);background:transparent;border:0;
    padding:var(--row-pad-y) var(--row-pad-x);min-height:var(--row-height);
    transition:background var(--dur-instant) var(--ease-standard);position:relative;box-sizing:border-box;}
  button.hb-row{cursor:pointer;}
  .hb-row + .hb-row::before{content:"";position:absolute;top:0;left:var(--row-pad-x);right:0;height:1px;background:var(--separator);}
  .hb-row--interactive:hover{background:var(--fill-hover);}
  .hb-row--interactive:active{background:var(--fill-active);}
  .hb-row--selected{background:var(--accent-tint);}
  .hb-row--selected.hb-row--interactive:hover{background:var(--accent-tint);}
  .hb-row__lead{flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--label-secondary);}
  .hb-row__thumb{width:40px;height:28px;border-radius:var(--radius-sm);object-fit:cover;
    background:var(--fill-tertiary);box-shadow:inset 0 0 0 0.5px var(--separator);flex:none;}
  .hb-row__body{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;}
  .hb-row__title{font-size:var(--text-body);font-weight:var(--weight-medium);color:var(--label);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .hb-row__title--mono{font-family:var(--font-mono);font-size:var(--role-mono-size);font-weight:var(--weight-regular);}
  .hb-row__sub{font-size:var(--text-caption);color:var(--label-tertiary);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .hb-row__sub--mono{font-family:var(--font-mono);}
  .hb-row__trail{flex:none;display:inline-flex;align-items:center;gap:var(--space-2);margin-left:auto;}
`;

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  if (document.getElementById("hb-listrow")) return;
  const el = document.createElement("style");
  el.id = "hb-listrow";
  el.textContent = listRowCss;
  document.head.appendChild(el);
}

export function ListRow({
  leading = null,
  title,
  subtitle,
  trailing = null,
  monoTitle = false,
  monoSub = false,
  selected = false,
  interactive = false,
  onClick,
  className = "",
  ...rest
}: ListRowProps) {
  ensureStyle();
  const Tag: ElementType = interactive || onClick ? "button" : "div";
  const cls = [
    "hb-row",
    interactive || onClick ? "hb-row--interactive" : "",
    selected ? "hb-row--selected" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={cls} onClick={onClick} type={Tag === "button" ? "button" : undefined} {...rest}>
      {leading ? <span className="hb-row__lead">{leading}</span> : null}
      <span className="hb-row__body">
        <span className={["hb-row__title", monoTitle ? "hb-row__title--mono" : ""].join(" ")}>
          {title}
        </span>
        {subtitle ? (
          <span className={["hb-row__sub", monoSub ? "hb-row__sub--mono" : ""].join(" ")}>
            {subtitle}
          </span>
        ) : null}
      </span>
      {trailing ? <span className="hb-row__trail">{trailing}</span> : null}
    </Tag>
  );
}

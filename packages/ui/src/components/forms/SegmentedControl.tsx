import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export interface SegmentOption {
  value: string;
  label?: ReactNode;
}

/**
 * macOS segmented control for 2–4 short, mutually-exclusive options
 * (e.g. a Diagnostics "Summary / Log" switch). Selected segment rides a
 * sliding white pill.
 */
export interface SegmentedControlProps {
  /** Options as `{value,label}` objects or plain strings. */
  options: Array<SegmentOption | string>;
  value: string;
  onChange?: (value: string) => void;
  className?: string;
  [key: string]: unknown;
}

const valueOf = (o: SegmentOption | string): string => (typeof o === "string" ? o : o.value);
const labelOf = (o: SegmentOption | string): ReactNode =>
  typeof o === "string" ? o : (o.label ?? o.value);

/**
 * This component's stylesheet, exported so a server-rendered page can put it
 * in <head> before the island hydrates — otherwise the markup ships with
 * class names nothing has defined yet and paints as an unstyled control.
 * `ensureStyle()` still covers client-only rendering (the Mac app), and
 * stands down when the page already emitted the sheet.
 */
export const segmentedControlCss = `
  .hb-seg{display:inline-flex;position:relative;background:var(--fill-secondary);
    border-radius:var(--radius-md);padding:2px;box-shadow:inset 0 0 0 0.5px var(--separator);
    font-family:var(--font-system);}
  .hb-seg__opt{
    -webkit-appearance:none;appearance:none;border:0;background:transparent;cursor:pointer;
    position:relative;z-index:1;flex:1;white-space:nowrap;
    font-size:var(--text-callout);font-weight:var(--weight-medium);color:var(--label-secondary);
    height:24px;padding:0 var(--space-5);border-radius:calc(var(--radius-md) - 2px);
    transition:color var(--dur-fast) var(--ease-standard);
  }
  .hb-seg__opt--on{color:var(--label);font-weight:var(--weight-semibold);}
  .hb-seg__opt:focus-visible{outline:none;box-shadow:var(--ring-focus);}
  .hb-seg__thumb{
    position:absolute;top:2px;bottom:2px;z-index:0;background:var(--surface-content);
    border-radius:calc(var(--radius-md) - 2px);box-shadow:var(--shadow-control);
    transition:transform var(--dur-fast) var(--ease-out),width var(--dur-fast) var(--ease-out);
  }
`;

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  if (document.getElementById("hb-segmented")) return;
  const el = document.createElement("style");
  el.id = "hb-segmented";
  el.textContent = segmentedControlCss;
  document.head.appendChild(el);
}

export function SegmentedControl({
  options = [],
  value,
  onChange,
  className = "",
  ...rest
}: SegmentedControlProps) {
  ensureStyle();
  const idx = Math.max(
    0,
    options.findIndex((o) => valueOf(o) === value),
  );
  const ref = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const btns = root.querySelectorAll(".hb-seg__opt");
    const el = btns[idx] as HTMLElement | undefined;
    if (el) setThumb({ left: el.offsetLeft, width: el.offsetWidth });
  }, [idx, options.length]);

  return (
    <div
      className={["hb-seg", className].filter(Boolean).join(" ")}
      ref={ref}
      role="tablist"
      {...rest}
    >
      <span
        className="hb-seg__thumb"
        style={{ transform: `translateX(${thumb.left - 2}px)`, width: thumb.width }}
      />
      {options.map((o) => {
        const v = valueOf(o);
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={v === value}
            className={["hb-seg__opt", v === value ? "hb-seg__opt--on" : ""].join(" ")}
            onClick={() => onChange && onChange(v)}
          >
            {labelOf(o)}
          </button>
        );
      })}
    </div>
  );
}

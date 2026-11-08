import { useEffect, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";

export interface HostSelectHost {
  id: string;
  /** SSH alias / display name, e.g. "prod-box". */
  name: string;
  /** Secondary address shown in mono, e.g. "10.4.0.12". */
  address?: string;
  /** Health dot color. */
  status?: "online" | "pending" | "offline" | "error" | "unknown";
  /** Marks the default beam target. */
  isDefault?: boolean;
}

/**
 * macOS-style host picker — the just-in-time control that keeps host selection
 * supporting (not competing with) the beam action.
 */
export interface HostSelectProps {
  hosts: HostSelectHost[];
  /** Selected host id. */
  value?: string;
  onChange?: (id: string) => void;
  onAddHost?: () => void;
  /**
   * Show an inline type-to-filter field with keyboard nav (↑/↓/Return) inside
   * the menu. Defaults to auto — on when there are 6 or more hosts.
   */
  searchable?: boolean;
  className?: string;
  /**
   * The app's translator, given a key and the English fallback. The design
   * system has no dictionary of its own; without this the fallbacks show.
   */
  t?: (key: string, fallback: string) => string;
  [key: string]: unknown;
}

/**
 * This component's stylesheet, exported so a server-rendered page can put it
 * in <head> before the island hydrates — otherwise the markup ships with
 * class names nothing has defined yet and paints as an unstyled control.
 * `ensureStyle()` still covers client-only rendering (the Mac app), and
 * stands down when the page already emitted the sheet.
 */
export const hostSelectCss = `
  .hb-hostsel{position:relative;font-family:var(--font-system);}
  .hb-hostsel__btn{
    -webkit-appearance:none;appearance:none;cursor:pointer;width:100%;
    display:flex;align-items:center;gap:var(--space-3);
    height:var(--control-height);padding:0 var(--space-3) 0 var(--space-4);
    background:var(--surface-content);border:0;border-radius:var(--radius-md);
    box-shadow:inset 0 0 0 1px var(--border-field);
    transition:var(--transition-control);text-align:left;color:var(--label);
  }
  .hb-hostsel__btn:hover{background:var(--fill-hover);}
  .hb-hostsel__btn:focus-visible{outline:none;box-shadow:inset 0 0 0 1px var(--accent),var(--ring-focus);}
  .hb-hostsel__dot{width:7px;height:7px;border-radius:50%;flex:none;}
  /* The name keeps its width (an absurd one is cut at 65% of the control);
     the address takes whatever is left, right-aligned and cut with an
     ellipsis like the menu rows. A long EC2 hostname used to wrap onto three
     lines inside the 28px control. */
  .hb-hostsel__name{font-size:var(--text-body);font-weight:var(--weight-medium);white-space:nowrap;flex:0 0 auto;max-width:65%;overflow:hidden;text-overflow:ellipsis;}
  .hb-hostsel__meta{font-family:var(--font-mono);font-size:var(--text-caption);color:var(--label-tertiary);
    flex:1 1 0;min-width:0;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .hb-hostsel__chev{display:inline-flex;color:var(--label-tertiary);flex:none;margin-left:var(--space-2);}
  .hb-hostsel__menu{
    position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:40;
    background:var(--surface-overlay);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
    border-radius:var(--radius-lg);box-shadow:var(--shadow-menu);
    padding:var(--space-2);max-height:240px;overflow:auto;
  }
  .hb-hostsel__opt{
    display:flex;align-items:center;gap:var(--space-3);width:100%;
    padding:var(--space-3) var(--space-3);border-radius:var(--radius-sm);
    cursor:pointer;border:0;background:transparent;text-align:left;color:var(--label);
    font-family:var(--font-system);transition:background var(--dur-instant) var(--ease-standard);
  }
  .hb-hostsel__opt:hover{background:var(--accent);color:#fff;}
  .hb-hostsel__opt:hover .hb-hostsel__omETA,.hb-hostsel__opt:hover .hb-hostsel__obadge{color:rgba(255,255,255,.85);}
  .hb-hostsel__oname{font-size:var(--text-body);font-weight:var(--weight-medium);white-space:nowrap;}
  .hb-hostsel__obadge{font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:var(--label-tertiary);
    border:1px solid var(--separator);border-radius:var(--radius-xs);padding:1px 4px;margin-left:var(--space-2);}
  .hb-hostsel__ometa{font-family:var(--font-mono);font-size:var(--text-caption);color:var(--label-tertiary);margin-left:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-left:var(--space-3);}
  .hb-hostsel__check{margin-left:auto;display:inline-flex;}
  .hb-hostsel__opt:hover .hb-hostsel__ometa,.hb-hostsel__opt:hover .hb-hostsel__obadge{color:rgba(255,255,255,.85);border-color:rgba(255,255,255,.4);}
  .hb-hostsel__opt.is-active{background:var(--accent);color:#fff;}
  .hb-hostsel__opt.is-active .hb-hostsel__ometa,.hb-hostsel__opt.is-active .hb-hostsel__obadge{color:rgba(255,255,255,.85);border-color:rgba(255,255,255,.4);}
  .hb-hostsel__search{position:sticky;top:calc(var(--space-2) * -1);margin:calc(var(--space-2) * -1) calc(var(--space-2) * -1) var(--space-2);
    padding:var(--space-3);background:var(--surface-popover);display:flex;align-items:center;gap:var(--space-2);
    box-shadow:0 0.5px 0 var(--separator);z-index:1;}
  .hb-hostsel__search svg{color:var(--label-tertiary);flex:none;}
  .hb-hostsel__search input{flex:1;min-width:0;border:0;outline:none;background:transparent;font-family:var(--font-system);font-size:var(--text-body);color:var(--label);}
  .hb-hostsel__empty{padding:var(--space-4) var(--space-3);text-align:center;font-size:var(--text-callout);color:var(--label-tertiary);}
  .hb-hostsel__add{color:var(--accent);margin-top:var(--space-2);box-shadow:0 -0.5px 0 var(--separator);}
  .hb-hostsel__add:hover{background:var(--accent);color:#fff;}
  .hb-hostsel__add svg{flex:none;}
`;

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  if (document.getElementById("hb-hostselect")) return;
  const el = document.createElement("style");
  el.id = "hb-hostselect";
  el.textContent = hostSelectCss;
  document.head.appendChild(el);
}

/** On hover, give a text span a native tooltip with its full text — but only
 * when the text is actually cut (ellipsis), so a value that fits gets no
 * redundant popup. Decided at hover time, so it tracks the current width. */
function tooltipIfCut(e: ReactMouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.title = el.scrollWidth > el.clientWidth ? el.textContent || "" : "";
}

const DOT: Record<string, string> = {
  online: "var(--dot-online)",
  pending: "var(--dot-pending)",
  offline: "var(--dot-offline)",
  error: "var(--dot-error)",
  unknown: "var(--label-quaternary)", // not probed yet (neutral)
};

export function HostSelect({
  hosts = [],
  value,
  onChange,
  onAddHost,
  className = "",
  searchable,
  t,
  ...rest
}: HostSelectProps) {
  ensureStyle();
  const T = (key: string, fallback: string): string =>
    t ? t(key, fallback) : fallback;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const activeHost = hosts.find((h) => h.id === value) || hosts[0];
  const useSearch = searchable != null ? searchable : hosts.length > 5;
  const norm = q.trim().toLowerCase();
  const filtered =
    useSearch && norm
      ? hosts.filter((h) =>
          `${h.name} ${h.address || ""}`.toLowerCase().includes(norm),
        )
      : hosts;

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  useEffect(() => {
    setActive(0);
  }, [q]);
  useEffect(() => {
    if (open && !useSearch && listRef.current) listRef.current.focus();
  }, [open, useSearch]);
  useEffect(() => {
    const el =
      listRef.current &&
      listRef.current.querySelector(".hb-hostsel__opt.is-active");
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (h: HostSelectHost | undefined) => {
    if (h) {
      onChange?.(h.id);
      setOpen(false);
      if (btnRef.current) btnRef.current.focus();
    }
  };
  const onKey = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(filtered[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      if (btnRef.current) btnRef.current.focus();
    }
  };

  return (
    <div
      className={["hb-hostsel", className].filter(Boolean).join(" ")}
      ref={ref}
      {...rest}
    >
      <button
        type="button"
        className="hb-hostsel__btn"
        ref={btnRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {activeHost ? (
          <>
            <span
              className="hb-hostsel__dot"
              style={{
                background: DOT[activeHost.status ?? "offline"] || DOT.offline,
              }}
            />
            <span className="hb-hostsel__name" onMouseEnter={tooltipIfCut}>
              {activeHost.name}
            </span>
            {activeHost.address ? (
              <span className="hb-hostsel__meta" onMouseEnter={tooltipIfCut}>
                {activeHost.address}
              </span>
            ) : null}
          </>
        ) : (
          <span
            className="hb-hostsel__name"
            style={{ color: "var(--label-tertiary)" }}
          >
            {T("host.noHostSelected", "No host selected")}
          </span>
        )}
        <span className="hb-hostsel__chev">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>
      {open ? (
        <div
          className="hb-hostsel__menu"
          role="listbox"
          ref={listRef}
          tabIndex={-1}
          style={{ outline: "none" }}
          onKeyDown={useSearch ? undefined : onKey}
        >
          {useSearch ? (
            <div className="hb-hostsel__search">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder={T("host.filter", "Filter hosts…")}
                aria-label={T("host.filter", "Filter hosts…")}
              />
            </div>
          ) : null}
          {filtered.length === 0 ? (
            <div className="hb-hostsel__empty">
              {T("host.noMatching", "No matching hosts")}
            </div>
          ) : (
            filtered.map((h, i) => (
              <button
                key={h.id}
                type="button"
                className={
                  "hb-hostsel__opt" + (i === active ? " is-active" : "")
                }
                role="option"
                aria-selected={h.id === value}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(h)}
              >
                <span
                  className="hb-hostsel__dot"
                  style={{
                    background: DOT[h.status ?? "offline"] || DOT.offline,
                  }}
                />
                <span className="hb-hostsel__oname">{h.name}</span>
                {h.isDefault ? (
                  <span className="hb-hostsel__obadge">
                    {T("host.default", "Default")}
                  </span>
                ) : null}
                {h.id === value ? (
                  <span className="hb-hostsel__check">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                ) : (
                  <span
                    className="hb-hostsel__ometa"
                    onMouseEnter={tooltipIfCut}
                  >
                    {h.address}
                  </span>
                )}
              </button>
            ))
          )}
          {onAddHost ? (
            <button
              type="button"
              className="hb-hostsel__opt hb-hostsel__add"
              onMouseEnter={() => setActive(-1)}
              onClick={() => {
                setOpen(false);
                onAddHost();
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="hb-hostsel__oname">
                {T("host.addEllipsis", "Add a host…")}
              </span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

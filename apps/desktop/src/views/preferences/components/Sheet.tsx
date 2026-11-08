import React from "react";
import type { ReactNode } from "react";

import { Ic } from "@hostbeam/ui";

import { t } from "../../../i18n";

/* --- Modal sheet shell ----------------------------------------------- */
export function Sheet({
  title,
  onClose,
  children,
  footer,
  width = 384,
}: {
  title?: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const card = cardRef.current;
    // autofocus the first field (or the dialog itself for read-only sheets)
    const first = (card && (card.querySelector("input, textarea") || card)) as HTMLElement | null;
    if (first && first.focus) first.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && card) {
        const els = [
          ...card.querySelectorAll<HTMLElement>(
            'input, textarea, button, a[href], [tabindex]:not([tabindex="-1"])',
          ),
        ].filter((el) => !(el as HTMLButtonElement).disabled && el.offsetParent !== null);
        if (!els.length) return;
        const firstEl = els[0],
          lastEl = els[els.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      if (opener && opener.focus) opener.focus(); // restore focus to the trigger
    };
    // Mount-once focus trap + Esc + opener-restore: onClose is captured at mount
    // on purpose — rebinding the global keydown listener on every onClose identity
    // change would thrash it and lose the captured opener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 44,
        background: "rgba(0,0,0,0.18)",
      }}
    >
      <div
        ref={cardRef}
        className="pf-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          // Never wider than the window it sits in — the prefs window can be
          // dragged down to 560px, and a fixed px width would clip there.
          width: `min(${width}px, calc(100% - 48px))`,
          background: "var(--surface-popover)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-popover)",
          overflow: "hidden",
          maxHeight: "calc(100% - 76px)",
          display: "flex",
          flexDirection: "column",
          outline: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "13px 14px",
            borderBottom: "1px solid var(--separator)",
            flex: "none",
          }}
        >
          <span
            style={{ fontSize: 13, fontWeight: 600, color: "var(--label)", whiteSpace: "nowrap" }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            aria-label={t("prefs.close")}
            style={{
              marginLeft: "auto",
              border: 0,
              background: "transparent",
              cursor: "pointer",
              color: "var(--label-tertiary)",
              display: "inline-flex",
              padding: 3,
              borderRadius: "var(--radius-sm)",
            }}
          >
            <Ic name="x" size={15} stroke={2.2} />
          </button>
        </div>
        <div style={{ padding: 16, overflow: "auto" }}>{children}</div>
        {footer ? (
          <div
            style={{
              display: "flex",
              gap: 9,
              justifyContent: "flex-end",
              padding: "12px 14px",
              borderTop: "1px solid var(--separator)",
              background: "var(--surface-sunken)",
              flex: "none",
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

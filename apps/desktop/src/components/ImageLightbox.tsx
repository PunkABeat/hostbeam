// Tap-to-enlarge preview overlay. Covers its positioned parent; dismisses on Esc
// or a click outside the image. `src` may be a data URL, "loading", or null.
import { useEffect, useRef, useState } from "react";

import { t } from "../i18n";

import { Spinner } from "@hostbeam/ui";
import { Ic } from "@hostbeam/ui";

export interface ImageLightboxProps {
  src: string | null;
  caption?: string;
  onClose: () => void;
  radius?: number | string;
  /** Every picture of one gesture, when the row that opened this carried
   *  several. With two or more the lightbox grows arrows, a counter and
   *  left/right keys — the popover collapses a drop into a single row, so this
   *  is the only place the other four are reachable. */
  gallery?: { src: string; caption?: string }[];
}

export function ImageLightbox({ src, caption, onClose, radius = 0, gallery }: ImageLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const many = (gallery?.length ?? 0) > 1;
  const [at, setAt] = useState(0);
  // A different gallery means a different beam; never open it half-way through.
  useEffect(() => setAt(0), [gallery]);

  const last = (gallery?.length ?? 1) - 1;
  // A gallery of one still comes from the gallery — a drop where only some rows
  // kept a thumbnail collapses to that, and falling back to `src` would show an
  // empty frame. Only the arrows care whether there is more than one.
  const shown = gallery?.length ? (gallery[at]?.src ?? null) : src;
  const shownCaption = gallery?.length ? gallery[at]?.caption : caption;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (!many) return;
      // Clamped rather than wrapping, so the counter never jumps 5 → 1 under you.
      if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        setAt((i) => Math.min(i + 1, last));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        setAt((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey, true);
    const id = setTimeout(() => {
      try {
        closeRef.current?.focus();
      } catch {
        /* focus can throw on a detached node — ignore */
      }
    }, 0);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      clearTimeout(id);
    };
    // `onClose` only calls setters, so a stale capture is harmless; `many` and
    // `last` are not — they decide what the arrow keys clamp to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [many, last]);
  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("common.imagePreview")}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.62)",
        borderRadius: radius,
      }}
    >
      {shown === "loading" ? (
        <Spinner size={20} />
      ) : shown ? (
        <img
          src={shown}
          alt="Preview"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            borderRadius: 8,
            objectFit: "contain",
            boxShadow: "0 10px 34px rgba(0,0,0,0.45)",
          }}
        />
      ) : (
        <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>Couldn’t load preview</span>
      )}
      <button
        ref={closeRef}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label={t("common.closePreview")}
        title={t("prefs.close")}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 26,
          height: 26,
          border: 0,
          cursor: "pointer",
          borderRadius: "50%",
          background: "rgba(0,0,0,0.5)",
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ic name="x" size={15} stroke={2.3} />
      </button>
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "rgba(255,255,255,0.8)",
          fontSize: 10.5,
          fontFamily: "var(--font-mono)",
        }}
      >
        {shownCaption ? shownCaption + " · " : ""}
        {many ? `${at + 1} of ${gallery?.length} · ` : ""}Esc to close
      </div>
      {many ? (
        <>
          <StepButton
            side="left"
            disabled={at === 0}
            onClick={() => setAt((i) => Math.max(i - 1, 0))}
          />
          <StepButton
            side="right"
            disabled={at === last}
            onClick={() => setAt((i) => Math.min(i + 1, last))}
          />
        </>
      ) : null}
    </div>
  );
}

/** One of the two step arrows. Kept off the image itself — a 38x26 thumbnail
 *  blown up is small, and an arrow sitting on it would cover the thing you
 *  opened it to look at. */
function StepButton({
  side,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      aria-label={side === "left" ? "Previous screenshot" : "Next screenshot"}
      title={side === "left" ? "Previous" : "Next"}
      style={{
        position: "absolute",
        [side]: 4,
        top: "50%",
        transform: "translateY(-50%)",
        width: 28,
        height: 28,
        border: 0,
        borderRadius: "50%",
        cursor: disabled ? "default" : "pointer",
        background: "rgba(0,0,0,0.5)",
        color: "#fff",
        opacity: disabled ? 0.25 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ic name={side === "left" ? "chevron-left" : "chevron-right"} size={16} stroke={2.3} />
    </button>
  );
}

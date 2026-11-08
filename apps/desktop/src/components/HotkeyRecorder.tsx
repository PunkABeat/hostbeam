import { useEffect, useState } from "react";

import { Button, Keycap } from "@hostbeam/ui";
import { t } from "../i18n";
import { hotkeyKeyFrom } from "../lib/hotkey-keys";

export interface HotkeyRecorderProps {
  value: string[];
  onChange: (keys: string[]) => void;
  /** For optional shortcuts: an empty `value` reads "Not set", and a Clear
   * button appears next to Record while one is set. */
  onClear?: () => void;
}

export function HotkeyRecorder({ value, onChange, onClear }: HotkeyRecorderProps) {
  const [rec, setRec] = useState(false);
  useEffect(() => {
    if (!rec) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setRec(false);
        return;
      }
      const key = hotkeyKeyFrom(e);
      if (!key) return; // a modifier on its own: keep waiting for the key
      const mods: string[] = [];
      if (e.metaKey) mods.push("cmd");
      if (e.ctrlKey) mods.push("ctrl");
      if (e.altKey) mods.push("opt");
      if (e.shiftKey) mods.push("shift");
      onChange([...mods, key]);
      setRec(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [rec, onChange]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 96,
          height: 28,
          padding: "0 10px",
          borderRadius: "var(--radius-md)",
          background: rec ? "var(--accent-tint)" : "var(--surface-sunken)",
          boxShadow: rec ? "inset 0 0 0 1px var(--accent)" : "inset 0 0 0 1px var(--border-field)",
        }}
      >
        {rec ? (
          <span
            style={{
              fontSize: 11.5,
              color: "var(--accent)",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            {t("hotkey.press")}
          </span>
        ) : value.length ? (
          <Keycap keys={value} />
        ) : (
          <span style={{ fontSize: 11.5, color: "var(--label-secondary)", whiteSpace: "nowrap" }}>
            {t("hotkey.none")}
          </span>
        )}
      </div>
      <Button variant="secondary" size="sm" onClick={() => setRec((r) => !r)}>
        {rec ? t("hotkey.cancel") : t("hotkey.record")}
      </Button>
      {onClear && value.length && !rec ? (
        <Button variant="secondary" size="sm" onClick={onClear}>
          {t("hotkey.clear")}
        </Button>
      ) : null}
    </div>
  );
}

import type { ConfigPatch } from "../../../lib/config";
import type { Config } from "../../../types/config";

/** The three shortcuts: written to the config and registered in Rust in the
 *  same breath, through the appliers config-bridge publishes. */
export function useHotkeySettings(cfg: Config, update: (patch: ConfigPatch) => void) {
  const setHotkey = (keys: string[]) => {
    update({ hotkey: keys });
    if (window.applyHotkey) window.applyHotkey(keys);
  };
  const setToggleHotkey = (keys: string[] | null) => {
    update({ toggleHotkey: keys });
    window.applyToggleHotkey?.(keys);
  };
  const setAutoHotkey = (keys: string[] | null) => {
    update({ autoHotkey: keys });
    window.applyAutoHotkey?.(keys);
  };
  return {
    hotkey: cfg.hotkey,
    setHotkey,
    toggleHotkey: cfg.toggleHotkey ?? null,
    setToggleHotkey,
    autoHotkey: cfg.autoHotkey ?? null,
    setAutoHotkey,
  };
}

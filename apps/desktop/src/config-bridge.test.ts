// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

// The transport, mocked: `inside` decides what isTauri() answers and `answer`
// is what Rust says back to a command.
const transport = vi.hoisted(() => ({
  inside: false,
  answer: (() => null) as (cmd: string, args?: unknown) => unknown,
}));
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => transport.inside,
  invoke: (cmd: string, args?: unknown) => Promise.resolve(transport.answer(cmd, args)),
}));

import { refreshConfig, toAccelerator, toToggleAccelerator } from "./config-bridge";
import { HB } from "./lib/config";

// toAccelerator translates the design's hotkey token array into a Tauri
// accelerator string. Modifiers come first in a fixed order; the non-modifier key
// is mapped (special names) or upper-cased.
describe("toAccelerator", () => {
  it("orders modifiers and upper-cases the key", () => {
    expect(toAccelerator(["cmd", "shift", "7"])).toBe("Cmd+Shift+7");
    expect(toAccelerator(["shift", "cmd", "a"])).toBe("Cmd+Shift+A");
  });

  it("maps opt to Alt and keeps the canonical modifier order", () => {
    expect(toAccelerator(["opt", "ctrl", "k"])).toBe("Ctrl+Alt+K");
    expect(toAccelerator(["cmd", "ctrl", "opt", "shift", "p"])).toBe("Cmd+Ctrl+Alt+Shift+P");
  });

  it("translates special keys", () => {
    expect(toAccelerator(["cmd", "up"])).toBe("Cmd+Up");
    expect(toAccelerator(["ctrl", "space"])).toBe("Ctrl+Space");
    expect(toAccelerator(["enter"])).toBe("Enter");
  });

  it("handles a bare key and a modifiers-only array", () => {
    expect(toAccelerator(["7"])).toBe("7");
    expect(toAccelerator(["cmd", "shift"])).toBe("Cmd+Shift");
  });
});

// refreshConfig re-pulls the durable config from Rust into localStorage and
// broadcasts it (so a window re-hydrates on show). It is a no-op without Tauri
// and skips the broadcast when nothing changed.
describe("toToggleAccelerator", () => {
  it("is null for an unset show/hide shortcut, so Rust clears it", () => {
    expect(toToggleAccelerator(null)).toBeNull();
    expect(toToggleAccelerator(undefined)).toBeNull();
    expect(toToggleAccelerator([])).toBeNull();
  });

  it("is the accelerator once one is recorded", () => {
    expect(toToggleAccelerator(["opt", "space"])).toBe("Alt+Space");
  });
});

describe("refreshConfig", () => {
  const cfg = {
    ...(JSON.parse(JSON.stringify(HB.DEFAULTS)) as typeof HB.DEFAULTS),
    settings: { ...HB.DEFAULTS.settings, appearance: "dark" as const },
  };

  function mockTauri(getConfigResult: unknown) {
    transport.inside = true;
    transport.answer = (cmd: string) => (cmd === "get_config" ? getConfigResult : null);
  }

  afterEach(() => {
    transport.inside = false;
    transport.answer = () => null;
    localStorage.clear();
  });

  it("re-hydrates from Rust and broadcasts hb:config when the config differs", async () => {
    localStorage.setItem(HB.KEY, "{}");
    mockTauri(cfg);
    let detail: unknown = null;
    const onCfg = (e: Event) => {
      detail = (e as CustomEvent).detail;
    };
    window.addEventListener("hb:config", onCfg);
    await refreshConfig();
    window.removeEventListener("hb:config", onCfg);
    expect(localStorage.getItem(HB.KEY)).toBe(JSON.stringify(cfg));
    expect((detail as typeof cfg | null)?.settings.appearance).toBe("dark");
  });

  it("does nothing when the persisted config already matches localStorage", async () => {
    localStorage.setItem(HB.KEY, JSON.stringify(cfg));
    mockTauri(cfg);
    let fired = false;
    const onCfg = () => {
      fired = true;
    };
    window.addEventListener("hb:config", onCfg);
    await refreshConfig();
    window.removeEventListener("hb:config", onCfg);
    expect(fired).toBe(false);
  });

  it("no-ops without Tauri (dev browser syncs via storage/hb:config already)", async () => {
    localStorage.setItem(HB.KEY, "{}");
    await refreshConfig();
    expect(localStorage.getItem(HB.KEY)).toBe("{}");
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Appearance } from "../types/config";
import { HB } from "./config";
import { applyTheme, setupTheme } from "./theme";

type MqListener = (e: { matches: boolean }) => void;

/** Install a controllable matchMedia reporting `initialDark`, able to emit changes. */
function mockMatchMedia(initialDark: boolean) {
  let listener: MqListener | null = null;
  const mq = {
    matches: initialDark,
    addEventListener: (_: string, cb: MqListener) => {
      listener = cb;
    },
  };
  window.matchMedia = vi.fn().mockReturnValue(mq) as unknown as typeof window.matchMedia;
  return {
    emit(dark: boolean) {
      mq.matches = dark;
      listener?.({ matches: dark });
    },
  };
}

function setAppearance(appearance: Appearance) {
  const cfg = HB.load();
  HB.save({ ...cfg, settings: { ...cfg.settings, appearance } });
}

const isDark = () => document.documentElement.classList.contains("theme-dark");

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  document.documentElement.classList.remove("theme-dark");
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("applyTheme — resolves the appearance setting", () => {
  it("forces dark when appearance is 'dark', regardless of the OS", () => {
    mockMatchMedia(false); // OS is light
    setAppearance("dark");
    applyTheme();
    expect(isDark()).toBe(true);
  });

  it("forces light when appearance is 'light', regardless of the OS", () => {
    mockMatchMedia(true); // OS is dark
    setAppearance("light");
    applyTheme();
    expect(isDark()).toBe(false);
  });

  it("follows the OS when appearance is 'system'", () => {
    const mq = mockMatchMedia(true);
    setAppearance("system");
    applyTheme();
    expect(isDark()).toBe(true);
    mq.emit(false);
    applyTheme();
    expect(isDark()).toBe(false);
  });

  it("defaults to 'system' when the setting is absent", () => {
    mockMatchMedia(true);
    // no config written → HB.load() defaults appearance to "system"
    applyTheme();
    expect(isDark()).toBe(true);
  });

  it("no-ops safely when matchMedia is unavailable (treated as light system)", () => {
    // @ts-expect-error — simulate an environment without matchMedia
    window.matchMedia = undefined;
    setAppearance("system");
    expect(() => applyTheme()).not.toThrow();
    expect(isDark()).toBe(false);
  });
});

describe("setupTheme — live updates", () => {
  it("re-applies when the appearance setting changes (hb:config)", () => {
    mockMatchMedia(false); // OS light
    setAppearance("system");
    setupTheme();
    expect(isDark()).toBe(false);
    setAppearance("dark"); // fires hb:config → setupTheme's listener re-applies
    expect(isDark()).toBe(true);
    setAppearance("light");
    expect(isDark()).toBe(false);
  });
});

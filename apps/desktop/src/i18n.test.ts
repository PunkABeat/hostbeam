// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { localeReady, setLocaleFromSetting, t } from "./i18n";
import { HB } from "./lib/config";

const i18nLocale = () => (window as unknown as { i18nLocale?: string }).i18nLocale;

function storeLocale(locale: string) {
  const cfg = HB.load();
  localStorage.setItem(HB.KEY, JSON.stringify({ ...cfg, settings: { ...cfg.settings, locale } }));
}

beforeEach(() => {
  localStorage.clear();
  setLocaleFromSetting("en");
});
afterEach(() => {
  localStorage.clear();
  setLocaleFromSetting("en");
});

describe("t", () => {
  it("substitutes every occurrence of a variable and leaves the rest alone", () => {
    expect(t("prefs.previewFromLast", { host: "prod" })).toBe("from your last beam to prod");
    expect(t("prefs.diagTitle", { host: "a.b" })).toBe("Diagnostics — a.b");
    // A missing variable stays visible rather than vanishing.
    expect(t("prefs.diagTitle")).toBe("Diagnostics — {host}");
    // Variables are literal names, not patterns.
    expect(t("prefs.diagTitle", { "h.st": "x" })).toBe("Diagnostics — {host}");
  });

  it("falls back to English, then to the key", async () => {
    await setLocaleFromSetting("fr");
    expect(t("common.ready")).not.toBe("Ready");
    expect(t("no.such.key")).toBe("no.such.key");
    setLocaleFromSetting("en");
  });
});

describe("dictionaries on demand", () => {
  it("shows English until a switched-to dictionary lands, then announces it", async () => {
    let announced = 0;
    const onLocale = () => announced++;
    window.addEventListener("hb:locale", onLocale);
    try {
      const loading = setLocaleFromSetting("ja");
      // The switch itself is immediate; the strings follow the chunk.
      expect(document.documentElement.lang).toBe("ja");
      await loading;
      expect(t("common.ready")).not.toBe("Ready");
      // Switching back to a dictionary already in memory is synchronous.
      void setLocaleFromSetting("en");
      expect(t("common.ready")).toBe("Ready");
      await setLocaleFromSetting("ja");
      expect(t("common.ready")).not.toBe("Ready");
    } finally {
      window.removeEventListener("hb:locale", onLocale);
    }
    expect(announced).toBeGreaterThanOrEqual(1);
  });
});

describe("i18n live locale switching", () => {
  it("re-resolves on a cross-window storage event (regression: window.HB was removed)", async () => {
    expect(t("common.ready")).toBe("Ready");
    // Another window changed the persisted locale; a storage event fires here.
    storeLocale("fr");
    window.dispatchEvent(new Event("storage"));
    await localeReady();
    // Before the fix this handler read the deleted window.HB and reset to system.
    expect(i18nLocale()).toBe("fr");
    expect(t("common.ready")).not.toBe("Ready");
  });

  it("re-resolves on the same-window hb:config event", () => {
    window.dispatchEvent(new CustomEvent("hb:config", { detail: { settings: { locale: "de" } } }));
    expect(i18nLocale()).toBe("de");
  });
});

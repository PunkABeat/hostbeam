// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => false, invoke: () => Promise.resolve() }));

import { act } from "react";

import { localeReady, t } from "../../i18n";
import { HB } from "../../lib/config";
import { cleanup, mount, prepare, type Screen, type } from "../../test/screen";
import { PrefsApp } from "./PreferencesApp";

let screen: Screen | null = null;
beforeEach(prepare);
afterEach(async () => {
  await cleanup(screen);
  screen = null;
});

const heading = (s: Screen) => s.el.querySelector("h1")?.textContent;

describe("PrefsApp", () => {
  it("opens on General, or on the pane the hash names", async () => {
    screen = await mount(<PrefsApp />);
    expect(heading(screen)).toBe(t("nav.general"));
    expect(screen.el.querySelector("[aria-current='page']")?.textContent).toBe(t("nav.general"));
    await screen.unmount();

    window.location.hash = "#hosts";
    screen = await mount(<PrefsApp />);
    expect(heading(screen)).toBe(t("nav.hosts"));
  });

  it("moves between panes from the sidebar, and the search narrows it", async () => {
    screen = await mount(<PrefsApp />);
    await screen.click(screen.button(t("nav.hotkey")));
    expect(heading(screen)).toBe(t("nav.hotkey"));

    const search = screen.el.querySelector<HTMLInputElement>(
      `input[aria-label="${t("prefs.searchSettings")}"]`,
    );
    await type(search!, t("nav.hosts").slice(0, 3));
    const items = Array.from(screen.el.querySelectorAll("[data-navitem]")).map(
      (b) => b.textContent,
    );
    expect(items).toEqual([t("nav.hosts")]);
    await type(search!, "zzz");
    expect(screen.text()).toContain(t("prefs.noResults"));
  });

  it("writes a General setting to the config, and the language change is live", async () => {
    screen = await mount(<PrefsApp />);
    await screen.click(screen.button(t("prefs.appearanceDark")));
    expect(HB.load().settings.appearance).toBe("dark");

    const select = screen.el.querySelector<HTMLSelectElement>("select");
    await type(select!, "fr");
    expect(HB.load().settings.locale).toBe("fr");
    // The store's broadcast re-resolves the locale; the screen follows once
    // the French chunk is in, re-rendered by its hb:locale.
    await act(() => localeReady());
    expect(heading(screen)).toBe("Général");
  });

  it("removing the default host hands the default to the next one", async () => {
    window.location.hash = "#hosts";
    screen = await mount(<PrefsApp />, { addedIds: ["prod", "stg"], defaultId: "prod" });
    expect(screen.text()).toContain("prod-box");
    await screen.click(screen.button(t("prefs.removeAria", { host: "prod-box" })));
    expect(HB.load().addedIds).toEqual(["stg"]);
    expect(HB.load().defaultId).toBe("stg");
    expect(screen.text()).not.toContain(t("prefs.removeAria", { host: "prod-box" }));
  });

  it("resets to the defaults from About without seeding rows", async () => {
    window.location.hash = "#about";
    screen = await mount(<PrefsApp />, {
      addedIds: ["prod"],
      defaultId: "prod",
      recent: [{ id: "r1", hostId: "prod", path: "/tmp/a.png", at: 1, thumb: null, group: "1" }],
    });
    // Two presses: the first arms the button, the second resets.
    await screen.click(screen.button(t("prefs.resetToDefaults")));
    expect(HB.load().addedIds).toEqual(["prod"]);
    await screen.click(screen.button(t("prefs.resetConfirm")));
    const cfg = HB.load();
    expect(cfg.addedIds).toEqual([]);
    expect(cfg.recent ?? []).toEqual([]);
  });
});

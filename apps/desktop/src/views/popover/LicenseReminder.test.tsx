// @vitest-environment jsdom
// The reminder in the popover (ADR 0028): "Unlicensed" beside the name while
// no license covers this version, the license card it opens, the HUD's click
// that opens it by way of Rust, and the line a landed beam carries when Rust
// says it is a reminder beam. Nothing here ever stops a beam.
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rust = vi.hoisted(() => ({
  calls: [] as { cmd: string; args: Record<string, unknown> }[],
  license: { tier: "free" } as Record<string, unknown>,
  remind: false,
}));

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  convertFileSrc: (p: string) => p,
  invoke: (cmd: string, args: Record<string, unknown> = {}) => {
    rust.calls.push({ cmd, args });
    switch (cmd) {
      case "license_status":
        return Promise.resolve(rust.license);
      case "take_pending_open":
        return Promise.resolve([]);
      case "clipboard_image":
        return Promise.resolve({ present: true, width: 10, height: 10, thumb: null, files: [] });
      case "test_host":
        return Promise.resolve({ ok: true, detail: "", keysPresent: [] });
      case "beam":
        return Promise.resolve({
          paths: ["/tmp/hostbeam/hostbeam-1788875278869.png"],
          sentence: "Look at this screenshot: /tmp/hostbeam/hostbeam-1788875278869.png",
          previews: [null],
          failed: [],
          retryToken: null,
          held: null,
          remind: rust.remind,
        });
      default:
        return Promise.resolve(null);
    }
  },
}));
vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({ onDragDropEvent: () => Promise.resolve(() => {}) }),
}));

import { t } from "../../i18n";
import { PRICE } from "../../lib/license";
import { receive } from "../../lib/rust-bridge";
import { cleanup, mount, prepare, type Screen } from "../../test/screen";
import { PopoverApp } from "./PopoverApp";

let screen: Screen | null = null;
beforeEach(() => {
  prepare();
  rust.calls = [];
  rust.license = { tier: "free" };
  rust.remind = false;
});
afterEach(async () => {
  await cleanup(screen);
  screen = null;
});

const host = { addedIds: ["prod"], defaultId: "prod" };

async function settle(s: Screen) {
  for (let i = 0; i < 6; i++) {
    await act(async () => {
      await Promise.resolve();
    });
    await s.tick(0);
  }
}

function link(s: Screen, text: string): HTMLAnchorElement | null {
  return (
    Array.from(s.el.querySelectorAll<HTMLAnchorElement>("a")).find(
      (a) => a.textContent?.trim() === text,
    ) ?? null
  );
}

async function open(): Promise<Screen> {
  const s = await mount(<PopoverApp />, host);
  await settle(s);
  return s;
}

describe("the reminder in the popover", () => {
  it("says Unlicensed beside the name, and it opens the license card", async () => {
    screen = await open();
    expect(link(screen, t("pop.unlicensed"))).not.toBeNull();
    expect(screen.text()).not.toContain(t("pop.licenseTitle"));
    await screen.click(link(screen, t("pop.unlicensed")));
    expect(screen.text()).toContain(t("pop.licenseTitle"));
    expect(screen.text()).toContain(t("pop.licenseBody", { price: PRICE }));
    // The card stands in for the Beam button, and Not now brings it back.
    expect(() => screen!.button(t("pop.beam"))).toThrow();
    await screen.click(screen.button(t("prefs.notNow")));
    expect(screen.text()).not.toContain(t("pop.licenseTitle"));
    expect(screen.button(t("pop.beam"))).toBeTruthy();
  });

  it("says nothing at all once licensing is retired (ADR 0031)", async () => {
    rust.license = { tier: "free", retired: true };
    screen = await open();
    expect(link(screen, t("pop.unlicensed"))).toBeNull();
    expect(screen.text()).not.toContain(t("pop.licenseTitle"));
  });

  it("says nothing at all once licensed", async () => {
    rust.license = { tier: "licensed", keyMasked: "HB-T…1234" };
    screen = await open();
    expect(link(screen, t("pop.unlicensed"))).toBeNull();
    expect(screen.text()).not.toContain(t("pop.licenseTitle"));
  });

  it("opens on the card when the HUD's reminder was clicked", async () => {
    screen = await open();
    await act(async () => {
      receive({ kind: "showLicense" });
      // The panel's own "shown" follows at once, and must not undo it.
      receive({ kind: "shown" });
    });
    await settle(screen);
    expect(screen.text()).toContain(t("pop.licenseTitle"));
    // A later opening starts without it.
    await screen.tick(5000);
    await act(async () => receive({ kind: "shown" }));
    await settle(screen);
    expect(screen.text()).not.toContain(t("pop.licenseTitle"));
  });

  it("puts the reminder under a beam that landed as a reminder beam", async () => {
    rust.remind = true;
    screen = await open();
    await screen.click(screen.button(t("pop.beam")));
    await settle(screen);
    await screen.tick(760);
    // The beam landed like any other: the sentence is on the card.
    expect(screen.text()).toContain(t("pop.copiedToClipboard"));
    const line = Array.from(screen.el.querySelectorAll("a")).find((a) =>
      a.textContent?.includes(t("pop.remind")),
    );
    expect(line).toBeTruthy();
    await screen.click(line ?? null);
    expect(screen.text()).toContain(t("pop.licenseTitle"));
  });

  it("puts nothing under an ordinary beam", async () => {
    screen = await open();
    await screen.click(screen.button(t("pop.beam")));
    await settle(screen);
    await screen.tick(760);
    expect(screen.text()).toContain(t("pop.copiedToClipboard"));
    expect(screen.text()).not.toContain(t("pop.remind"));
  });
});

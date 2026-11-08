// @vitest-environment jsdom
// The held beam, end to end in the popover: a file that looks like a secret is
// answered with `held`, not a failure, and nothing a landing does happens
// until the user says "Send anyway". Runs as if inside the app, with the Rust
// commands answered here — a file macOS "opened" is the trigger, since that is
// the silent path the Dock, Open With and `open -a` all take.
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rust = vi.hoisted(() => ({
  calls: [] as { cmd: string; args: Record<string, unknown> }[],
  opened: [] as string[],
  beamFiles: ((): unknown => null) as (args: Record<string, unknown>) => unknown,
}));

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  convertFileSrc: (p: string) => p,
  invoke: (cmd: string, args: Record<string, unknown> = {}) => {
    rust.calls.push({ cmd, args });
    switch (cmd) {
      case "take_pending_open": {
        const files = rust.opened;
        rust.opened = [];
        return Promise.resolve(files);
      }
      case "clipboard_image":
        return Promise.resolve({ present: false, files: [] });
      case "test_host":
        return Promise.resolve({ ok: true, detail: "", keysPresent: [] });
      case "beam_files":
        return Promise.resolve(rust.beamFiles(args));
      default:
        return Promise.resolve(null);
    }
  },
}));
vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({ onDragDropEvent: () => Promise.resolve(() => {}) }),
}));

import { t } from "../../i18n";
import { HB } from "../../lib/config";
import { cleanup, mount, prepare, type Screen } from "../../test/screen";
import { PopoverApp } from "./PopoverApp";

let screen: Screen | null = null;
beforeEach(() => {
  prepare();
  rust.calls = [];
  rust.opened = [];
});
afterEach(async () => {
  await cleanup(screen);
  screen = null;
});

const host = { addedIds: ["prod"], defaultId: "prod" };
const KEY = "/Users/me/.ssh/id_ed25519";
const held = {
  paths: [],
  sentence: "",
  previews: [],
  failed: [],
  retryToken: null,
  held: { paths: [KEY], flagged: ["id_ed25519"] },
};
const landed = {
  paths: ["/tmp/hostbeam/hostbeam-1788875278869-id_ed25519"],
  sentence: "Use this file: /tmp/hostbeam/hostbeam-1788875278869-id_ed25519",
  previews: [null],
  failed: [],
  retryToken: null,
  held: null,
};
const beamCalls = () => rust.calls.filter((c) => c.cmd === "beam_files").map((c) => c.args);

/** Let the command promises and the renders they cause settle. */
async function settle(s: Screen) {
  for (let i = 0; i < 6; i++) {
    await act(async () => {
      await Promise.resolve();
    });
    await s.tick(0);
  }
}

async function openHeldKey(): Promise<Screen> {
  rust.opened = [KEY];
  rust.beamFiles = (args) => (args.allowSecrets ? landed : held);
  const s = await mount(<PopoverApp />, host);
  await settle(s);
  return s;
}

describe("a held beam", () => {
  it("asks before sending, and a held result lands nothing", async () => {
    screen = await openHeldKey();
    expect(screen.text()).toContain(t("pop.heldTitle", { name: "id_ed25519" }));
    expect(screen.text()).toContain(t("pop.heldDetail", { host: "prod-box" }));
    expect(beamCalls()).toHaveLength(1);
    expect(beamCalls()[0]).toMatchObject({ paths: [KEY], allowSecrets: false });
    // No Recent row, no confirmation: nothing was sent.
    expect(HB.load().recent ?? []).toHaveLength(0);
    expect(screen.text()).not.toContain(t("pop.copiedToClipboard"));
  });

  it("makes Don't send the focused default, so a stray Return cannot send", async () => {
    screen = await openHeldKey();
    const primary = screen.el.querySelector("[data-primary]");
    expect(primary?.textContent?.trim()).toBe(t("pop.dontSend"));
  });

  it("sends exactly the named files once the user says so, as one beam", async () => {
    screen = await openHeldKey();
    await screen.click(screen.button(t("pop.sendAnyway")));
    await settle(screen);
    expect(beamCalls()).toHaveLength(2);
    expect(beamCalls()[1]).toMatchObject({ paths: [KEY], allowSecrets: true, hud: false });
    await screen.tick(760);
    expect(HB.load().recent ?? []).toHaveLength(1);
    // The card shows what the clipboard got: just the path, by default.
    expect(screen.text()).not.toContain("Use this");
    expect(screen.text()).toContain("hostbeam-1788875278869-id_ed25519");
  });

  it("Don't send drops the question and sends nothing", async () => {
    screen = await openHeldKey();
    await screen.click(screen.button(t("pop.dontSend")));
    await settle(screen);
    expect(screen.text()).not.toContain(t("pop.heldTitle", { name: "id_ed25519" }));
    expect(beamCalls()).toHaveLength(1);
    expect(HB.load().recent ?? []).toHaveLength(0);
  });

  it("Esc declines too", async () => {
    screen = await openHeldKey();
    expect(screen.text()).toContain(t("pop.heldTitle", { name: "id_ed25519" }));
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    await settle(screen);
    expect(screen.text()).not.toContain(t("pop.heldTitle", { name: "id_ed25519" }));
    expect(beamCalls()).toHaveLength(1);
  });
});

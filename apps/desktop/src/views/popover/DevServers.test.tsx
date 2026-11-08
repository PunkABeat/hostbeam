// @vitest-environment jsdom
// The agent's dev servers in the popover (ADR 0029): asked when the popover
// opens, one click forwards a port, an open one can stop, a refusal says why,
// and a forward whose server has gone is ended on the next check. Runs as if
// inside the app, with the Rust commands answered here.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rust = vi.hoisted(() => ({
  calls: [] as { cmd: string; args: Record<string, unknown> }[],
  ports: [5173] as number[],
  open: [] as { target: string; port: number; url: string }[],
  openError: null as string | null,
}));

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  convertFileSrc: (p: string) => p,
  invoke: (cmd: string, args: Record<string, unknown> = {}) => {
    rust.calls.push({ cmd, args });
    switch (cmd) {
      case "take_pending_open":
        return Promise.resolve([]);
      case "clipboard_image":
        return Promise.resolve({ present: false, files: [] });
      case "test_host":
        return Promise.resolve({ ok: true, detail: "", keysPresent: [] });
      case "dev_servers":
        return Promise.resolve({ ports: rust.ports, checked: true });
      case "dev_forwards":
        return Promise.resolve(rust.open);
      case "dev_forward_open": {
        if (rust.openError) return Promise.reject(rust.openError);
        const port = args.port as number;
        const f = { target: args.target as string, port, url: `http://127.0.0.1:${port}/` };
        rust.open = [...rust.open, f];
        return Promise.resolve(f);
      }
      case "dev_forward_stop":
        rust.open = rust.open.filter((f) => f.port !== args.port);
        return Promise.resolve(null);
      default:
        return Promise.resolve(null);
    }
  },
}));
vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({ onDragDropEvent: () => Promise.resolve(() => {}) }),
}));

import { act } from "react";

import { t } from "../../i18n";
import { cleanup, mount, prepare, type Screen } from "../../test/screen";
import { PopoverApp } from "./PopoverApp";

let screen: Screen | null = null;
beforeEach(() => {
  prepare();
  rust.calls = [];
  rust.ports = [5173];
  rust.open = [];
  rust.openError = null;
});
afterEach(async () => {
  await cleanup(screen);
  screen = null;
});

const host = { addedIds: ["prod"], defaultId: "prod" };
const calls = (cmd: string) => rust.calls.filter((c) => c.cmd === cmd).map((c) => c.args);
const openLabel = (port: number) => t("pop.devOpenAria", { port: String(port), host: "prod-box" });

async function settle(s: Screen) {
  for (let i = 0; i < 6; i++) {
    await act(async () => {
      await Promise.resolve();
    });
    await s.tick(0);
  }
}

async function open(): Promise<Screen> {
  const s = await mount(<PopoverApp />, host);
  await settle(s);
  return s;
}

describe("the agent's dev servers", () => {
  it("asks the current host when the popover opens, and lists what it runs", async () => {
    screen = await open();
    expect(calls("dev_servers")).toEqual([{ target: "prod" }]);
    expect(screen.text()).toContain(t("pop.devTitle", { host: "prod-box" }));
    expect(screen.text()).toContain(":5173");
    expect(calls("dev_forward_open")).toHaveLength(0);
  });

  it("shows nothing at all when the host runs none", async () => {
    rust.ports = [];
    screen = await open();
    expect(screen.text()).not.toContain(t("pop.devTitle", { host: "prod-box" }));
  });

  it("forwards a port on Open, says where, and stops it", async () => {
    screen = await open();
    await screen.click(screen.button(openLabel(5173)));
    await settle(screen);
    expect(calls("dev_forward_open")).toEqual([{ target: "prod", port: 5173 }]);
    expect(screen.text()).toContain(t("pop.devHere", { addr: "127.0.0.1:5173" }));

    await screen.click(screen.button(t("pop.devStop")));
    await settle(screen);
    expect(calls("dev_forward_stop")).toEqual([{ target: "prod", port: 5173 }]);
    expect(screen.text()).not.toContain(t("pop.devHere", { addr: "127.0.0.1:5173" }));
  });

  it("says why when a host allows no way through", async () => {
    rust.openError = "dev_blocked";
    screen = await open();
    await screen.click(screen.button(openLabel(5173)));
    await settle(screen);
    expect(screen.text()).toContain(t("pop.devBlocked"));
  });

  it("ends a forward whose dev server has gone, on the next check", async () => {
    rust.open = [{ target: "prod", port: 3000, url: "http://127.0.0.1:3000/" }];
    screen = await open();
    expect(calls("dev_forward_stop")).toEqual([{ target: "prod", port: 3000 }]);
  });
});

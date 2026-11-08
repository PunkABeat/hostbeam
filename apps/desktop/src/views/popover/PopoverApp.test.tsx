// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => false, invoke: () => Promise.resolve() }));
vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({ onDragDropEvent: () => Promise.resolve(() => {}) }),
}));

import { t } from "../../i18n";
import { HB } from "../../lib/config";
import { receive } from "../../lib/rust-bridge";
import { cleanup, mount, prepare, type Screen } from "../../test/screen";
import { PopoverApp } from "./PopoverApp";

let screen: Screen | null = null;
beforeEach(prepare);
afterEach(async () => {
  await cleanup(screen);
  screen = null;
  delete (window as { openPreferences?: unknown }).openPreferences;
});

const twoHosts = { addedIds: ["prod", "stg"], defaultId: "prod" };
const reach = () => (HB.load().reach ?? {}) as Record<string, { ok: boolean }>;

describe("PopoverApp", () => {
  it("with no host added, shows the way to the first one", async () => {
    const openPreferences = vi.fn();
    window.openPreferences = openPreferences;
    screen = await mount(<PopoverApp />);
    expect(screen.text()).toContain(t("pop.noHostYet"));
    expect(screen.el.querySelector("[data-primary]")).toBeNull();
    await screen.click(screen.button(t("pop.addHost")));
    expect(openPreferences).toHaveBeenCalledWith("hosts");
  });

  it("beams the clipboard to the default host and lands the path in Recent", async () => {
    screen = await mount(<PopoverApp />, twoHosts);
    expect(screen.text()).toContain(t("pop.beamTo"));
    expect(screen.text()).toContain("prod-box");
    expect(screen.text()).not.toContain(t("pop.recent"));
    const beam = screen.el.querySelector<HTMLButtonElement>("[data-primary]");
    expect(beam?.disabled).toBe(false);

    await screen.click(beam);
    expect(screen.text()).toContain(t("pop.beamingTo", { host: "prod-box" }));
    expect(screen.el.querySelector("[data-primary]")).toBeNull();

    // The simulated transfer lands after 1.3s, settles after the animation.
    await screen.tick(1300);
    expect(screen.text()).toContain(t("pop.beamedTo", { host: "prod-box" }));
    await screen.tick(760);
    expect(screen.text()).toContain(t("pop.copiedToClipboard"));
    expect(screen.text()).toContain("/tmp/hostbeam/2025-06-14-15.");
    const recent = HB.load().recent ?? [];
    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({ hostId: "prod", hostName: "prod-box" });
    expect(reach().prod).toMatchObject({ ok: true });
    expect(screen.text()).toContain(t("pop.recent"));

    // The confirmation fades; the Recent row stays.
    await screen.tick(2500);
    expect(screen.el.querySelector("[data-primary]")).not.toBeNull();
    expect(screen.text()).toContain(t("pop.recent"));
  });

  it("puts an unreachable host's failure on its card and marks the dot", async () => {
    screen = await mount(<PopoverApp />, { addedIds: ["edge"], defaultId: "edge" });
    await screen.click(screen.el.querySelector("[data-primary]"));
    await screen.tick(1300);
    expect(screen.text()).toContain(t("pop.tryAgain"));
    expect(reach().edge).toMatchObject({ ok: false });
    expect(HB.load().recent ?? []).toHaveLength(0);

    await screen.click(screen.button(t("pop.runDiagnostics")));
    await screen.tick(1400);
    expect(screen.text()).toContain("Operation timed out");

    // Try again is the same beam, and fails the same way.
    await screen.click(screen.button(t("pop.tryAgain")));
    expect(screen.text()).toContain(t("pop.beamingTo", { host: "edge-eu" }));
    await screen.tick(1300);
    expect(screen.text()).toContain(t("pop.tryAgain"));
  });

  // 2026-10-06: the default host's alias left ~/.ssh/config (the test host was
  // down), and beams went to the first host in the list — a real server.
  it("keeps a default that left ~/.ssh/config and refuses to beam anywhere else", async () => {
    screen = await mount(<PopoverApp />, { addedIds: ["prod", "gone"], defaultId: "gone" });
    expect(screen.text()).toContain(t("pop.missingTitle", { host: "gone" }));
    expect(screen.text()).toContain(t("host.missing"));
    expect(screen.el.querySelector("[data-primary]")).toBeNull();

    // The shortcut, the tray, a link, auto-beam: all arrive as this.
    await act(async () => receive({ kind: "beam" }));
    await screen.tick(2500);
    expect(HB.load().recent ?? []).toHaveLength(0);
    expect(HB.load().defaultId).toBe("gone");
    expect(HB.load().addedIds).toEqual(["prod", "gone"]);
    expect(screen.text()).not.toContain(t("pop.beamingTo", { host: "prod-box" }));
  });

  it("switches the host when Rust asks, and ignores a host that is not added", async () => {
    screen = await mount(<PopoverApp />, twoHosts);
    await act(async () => receive({ kind: "setHost", id: "stg" }));
    expect(HB.load().defaultId).toBe("stg");
    expect(screen.text()).toContain("staging");
    await act(async () => receive({ kind: "setHost", id: "gpu" }));
    expect(HB.load().defaultId).toBe("stg");
  });

  it("hiding from the Dock keeps the menu-bar icon", async () => {
    screen = await mount(<PopoverApp />, {
      ...twoHosts,
      settings: { ...HB.load().settings, dock: true, menubar: false },
    });
    await act(async () => receive({ kind: "setDock", on: false }));
    expect(HB.load().settings).toMatchObject({ dock: false, menubar: true });
  });

  // One drop of two files, as the tray's Recent ▸ copies it.
  const twoFileDrop = [
    {
      id: "r1-0",
      hostId: "prod",
      hostName: "prod-box",
      path: "/tmp/a.png",
      at: 1,
      thumb: null,
      group: "1",
    },
    {
      id: "r1-1",
      hostId: "prod",
      hostName: "prod-box",
      path: "/tmp/b.png",
      at: 1,
      thumb: null,
      group: "1",
    },
  ];

  it("copies a Recent row when the tray asks for it", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    screen = await mount(<PopoverApp />, {
      ...twoHosts,
      recent: twoFileDrop,
    });
    await act(async () => receive({ kind: "copyRecent", key: "r1-0" }));
    expect(writeText).toHaveBeenCalledTimes(1);
    // What the beam put there: just the paths, a space apart — what Claude
    // Code and Gemini CLI attach as pictures (next.md § 10a).
    expect(writeText.mock.calls[0][0]).toBe("/tmp/a.png /tmp/b.png");
  });

  it("copies a Recent row as sentences when the sentence is on", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    screen = await mount(<PopoverApp />, {
      ...twoHosts,
      settings: { ...HB.load().settings, copySentence: true },
      recent: twoFileDrop,
    });
    await act(async () => receive({ kind: "copyRecent", key: "r1-0" }));
    expect(writeText).toHaveBeenCalledTimes(1);
    const [text] = writeText.mock.calls[0];
    expect(text.split("\n")).toEqual([
      "Use this screenshot: /tmp/a.png",
      "Use this screenshot: /tmp/b.png",
    ]);
  });

  it("offers Show in Finder only for a beam that came from a file, and says when it is gone", async () => {
    const now = Date.now();
    screen = await mount(<PopoverApp />, {
      ...twoHosts,
      recent: [
        {
          id: "r1-0",
          hostId: "prod",
          hostName: "prod-box",
          path: "/tmp/hostbeam/hostbeam-1788875278869-report.pdf",
          at: now,
          group: "1",
          local: "/Users/me/report.pdf",
        },
        {
          id: "r2-0",
          hostId: "prod",
          hostName: "prod-box",
          path: "/tmp/hostbeam/hostbeam-1788875278870.png",
          at: now - 1000,
          group: "2",
        },
      ],
    });
    const reveal = Array.from(screen.el.querySelectorAll("button")).filter((b) =>
      b.getAttribute("aria-label")?.startsWith(t("pop.showInFinder")),
    );
    expect(reveal).toHaveLength(1);
    expect(reveal[0].getAttribute("aria-label")).toContain("report.pdf");
    // Outside the app nothing can be revealed, which is the gone case.
    await screen.click(reveal[0]);
    await screen.tick(0);
    expect(screen.text()).toContain(t("pop.fileGone"));
    await screen.tick(2200);
    expect(screen.text()).not.toContain(t("pop.fileGone"));
  });
});

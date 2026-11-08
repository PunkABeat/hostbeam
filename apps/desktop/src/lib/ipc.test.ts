// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

// The transport, mocked: `inside` decides what isTauri() answers, `calls`
// records what reached Rust and `answer` is what Rust says back.
const transport = vi.hoisted(() => ({
  inside: false,
  calls: [] as Array<[string, unknown]>,
  answer: (() => undefined) as (cmd: string, args?: unknown) => unknown,
}));
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => transport.inside,
  invoke: (cmd: string, args?: unknown) => {
    transport.calls.push([cmd, args]);
    return Promise.resolve(transport.answer(cmd, args));
  },
}));

import {
  beamFiles,
  copyText,
  diagnose,
  isTauri,
  manualTarget,
  openUrl,
  sshTarget,
  takePendingOpen,
  testHost,
} from "./ipc";

afterEach(() => {
  transport.inside = false;
  transport.calls = [];
  transport.answer = () => undefined;
});

describe("sshTarget", () => {
  it("addresses a ~/.ssh/config host by its alias", () => {
    expect(sshTarget({ id: "prod-box", user: "dev", address: "10.4.0.12" })).toBe("prod-box");
  });

  it("addresses a typed-in host by user@address, never by its slug", () => {
    // The slug is what the config keys the host by; ssh cannot resolve it.
    expect(sshTarget({ id: "my-box", user: "dev", address: "10.4.0.12", manual: true })).toBe(
      "dev@10.4.0.12",
    );
  });

  it("composes a target for a host that is still being typed", () => {
    expect(manualTarget("dev", "box.example")).toBe("dev@box.example");
    expect(manualTarget("", " box.example ")).toBe("box.example");
    expect(manualTarget(undefined, undefined)).toBe("");
  });
});

describe("commands", () => {
  it("call Rust with the shapes the #[tauri::command] signatures expect", async () => {
    transport.inside = true;
    transport.answer = (cmd) =>
      cmd === "test_host"
        ? { ok: true, detail: "Reachable", keysPresent: [0] }
        : cmd === "diagnose"
          ? [{ label: "SSH reachable", status: "ok", detail: "prod" }]
          : { paths: ["/tmp/hostbeam/a.png"], sentence: "", previews: [null], failed: [] };
    expect(isTauri()).toBe(true);
    const probe = await testHost("dev@box", ["ssh-ed25519 AAAA key"]);
    expect(probe.keysPresent).toEqual([0]);
    const rows = await diagnose("prod", "/tmp/hostbeam");
    expect(rows[0].status).toBe("ok");
    const sent = await beamFiles({
      alias: "prod",
      folder: "/tmp/hostbeam",
      paths: ["/a.png"],
      hud: true,
      retryToken: null,
    });
    expect(sent.paths).toEqual(["/tmp/hostbeam/a.png"]);
    expect(transport.calls).toEqual([
      ["test_host", { target: "dev@box", keys: ["ssh-ed25519 AAAA key"] }],
      ["diagnose", { alias: "prod", folder: "/tmp/hostbeam" }],
      [
        "beam_files",
        { alias: "prod", folder: "/tmp/hostbeam", paths: ["/a.png"], hud: true, retryToken: null },
      ],
    ]);
  });

  it("normalise what a nullable command hands back", async () => {
    transport.inside = true;
    transport.answer = () => null;
    expect(await takePendingOpen()).toEqual([]);
  });

  it("answer from the mocks outside Tauri, so the browser render still works", async () => {
    expect(isTauri()).toBe(false);
    const [probe, rows] = await Promise.all([testHost("nope.example"), diagnose("prod", "/tmp")]);
    expect(probe.ok).toBe(false);
    expect(rows).toHaveLength(4);
    expect(transport.calls).toEqual([]);
  }, 5000);

  it("open a link in a new tab outside Tauri, and through Rust inside it", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    openUrl("https://hostbeam.app");
    expect(open).toHaveBeenCalledWith("https://hostbeam.app", "_blank", "noreferrer");
    transport.inside = true;
    openUrl("https://hostbeam.app/changelog");
    expect(transport.calls).toEqual([["open_url", { url: "https://hostbeam.app/changelog" }]]);
    expect(open).toHaveBeenCalledTimes(1);
    open.mockRestore();
  });
});

describe("copyText", () => {
  it("has Rust write the clipboard inside the app, never WebKit", async () => {
    // WebKit writing while a beam reads is the overlap clipboard.rs exists to
    // prevent; Rust queues the write behind the read instead.
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    transport.inside = true;
    await copyText("Use this screenshot: /tmp/a.png");
    expect(transport.calls).toEqual([["copy_text", { text: "Use this screenshot: /tmp/a.png" }]]);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("uses the browser's clipboard in a plain browser", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await copyText("hello");
    expect(writeText).toHaveBeenCalledWith("hello");
    expect(transport.calls).toEqual([]);
  });

  it("rejects, rather than pretending, when there is no clipboard at all", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    await expect(copyText("hello")).rejects.toThrow("no clipboard");
  });
});

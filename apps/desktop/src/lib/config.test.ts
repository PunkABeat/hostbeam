// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { HB } from "./config";
import { OB_MOCK } from "./hosts";

const originalSshConfig = OB_MOCK.sshConfig;
beforeEach(() => {
  localStorage.clear();
  OB_MOCK.sshConfig = originalSshConfig;
});

describe("HB config store", () => {
  it("returns the defaults when nothing is persisted", () => {
    const cfg = HB.load();
    // A Mac nobody has touched: no hosts, nothing beamed. The prototype's seed
    // hosts and Recent rows are browser-only (config-bridge), never defaults —
    // "Reset to defaults" writes exactly this.
    expect(cfg.addedIds).toEqual([]);
    expect(cfg.defaultId).toBeNull();
    expect(cfg.recent).toEqual([]);
    expect(HB.defaults()).toEqual(cfg);
    expect(cfg.settings.folder).toBe("/tmp/hostbeam");
    expect(cfg.hotkey).toEqual(["cmd", "shift", "7"]);
    expect(cfg.toggleHotkey).toBeNull();
    expect(cfg.autoHotkey).toBeNull();
    // Off by default: three global combos claimed without asking would be
    // greedy on a machine that also runs CleanShot and Raycast.
    expect(cfg.settings.autoBeamMinutes).toBe(60);
    // Checking on, installing off (ADR 0022).
    expect(cfg.settings.checkUpdates).toBe(true);
    expect(cfg.settings.installUpdates).toBe(false);
    // hostbeam:// links work out of the box (ADR 0025, amended 2026-09-22).
    expect(cfg.settings.allowUrlBeam).toBe(true);
  });

  it("copies just the path by default, and moves an untouched sentence over once", () => {
    expect(HB.load().settings.copySentence).toBe(false);

    // What nearly every install saved before 2026-09-28: the switch on, the
    // sentence as it came, no pathDefault. Nobody chose it.
    const old = (settings: Record<string, unknown>) => {
      const s: Record<string, unknown> = { ...HB.load().settings, ...settings };
      delete s.pathDefault;
      localStorage.setItem(HB.KEY, JSON.stringify({ ...HB.load(), settings: s }));
      return HB.load().settings;
    };
    expect(old({ copySentence: true }).copySentence).toBe(false);
    // A sentence someone wrote stays on; off stays off.
    expect(old({ copySentence: true, sentence: "look at {path}" }).copySentence).toBe(true);
    expect(old({ copySentence: false }).copySentence).toBe(false);

    // Switched on after the change, it stays on — the default text included.
    HB.save({ ...HB.load(), settings: { ...HB.load().settings, copySentence: true } });
    expect(HB.load().settings.copySentence).toBe(true);
  });

  it("keeps a saved off for hostbeam:// links", () => {
    // Every install that ran 0.1.23–0.1.25 has `false` written down, and a
    // false the app wrote is indistinguishable from one the user chose — so
    // the new default reaches fresh installs only, and never overrides a save.
    HB.save({ ...HB.load(), settings: { ...HB.load().settings, allowUrlBeam: false } });
    expect(HB.load().settings.allowUrlBeam).toBe(false);
  });

  it("gives a config saved before the update switches checking on and installing off", () => {
    const old = HB.load();
    // JSON.stringify drops undefined keys, leaving settings without the fields.
    localStorage.setItem(
      HB.KEY,
      JSON.stringify({
        ...old,
        settings: { ...old.settings, checkUpdates: undefined, installUpdates: undefined },
      }),
    );
    const cfg = HB.load();
    expect(cfg.settings.checkUpdates).toBe(true);
    expect(cfg.settings.installUpdates).toBe(false);
  });

  it("gives a config saved before the optional shortcuts existed null ones", () => {
    // JSON.stringify drops undefined keys, leaving a config without the field.
    localStorage.setItem(
      HB.KEY,
      JSON.stringify({ ...HB.load(), toggleHotkey: undefined, autoHotkey: undefined }),
    );
    expect(HB.load().toggleHotkey).toBeNull();
    expect(HB.load().autoHotkey).toBeNull();
  });

  it("gives a config saved before automatic beaming existed the default window", () => {
    // An upgrade must land on the hour default, not on 0 — which would mean
    // "never expires", the one value it must not inherit by accident.
    const settings: Record<string, unknown> = { ...HB.load().settings };
    delete settings.autoBeamMinutes;
    localStorage.setItem(HB.KEY, JSON.stringify({ ...HB.load(), settings }));
    expect(HB.load().settings.autoBeamMinutes).toBe(60);
  });

  it("round-trips a saved config and deep-merges settings over defaults", () => {
    HB.save({ ...HB.load(), defaultId: "stg", settings: { ...HB.load().settings, flash: false } });
    const cfg = HB.load();
    expect(cfg.defaultId).toBe("stg");
    expect(cfg.settings.flash).toBe(false);
    expect(cfg.settings.folder).toBe("/tmp/hostbeam"); // untouched default survives the merge
  });

  it("folderFor prefers a per-host override, else the global folder", () => {
    HB.save({ ...HB.load(), folders: { stg: "/srv/shots" } });
    expect(HB.folderFor("stg")).toBe("/srv/shots");
    expect(HB.folderFor("prod")).toBe("/tmp/hostbeam");
    // What a beam sends: trailing slashes go, and nothing is never a folder.
    HB.save({ ...HB.load(), folders: { stg: "/srv/shots///" } });
    expect(HB.beamFolder("stg")).toBe("/srv/shots");
    expect(HB.beamFolder("prod")).toBe("/tmp/hostbeam");
  });

  it("allHosts merges OB_MOCK.sshConfig with the user's manual hosts", () => {
    OB_MOCK.sshConfig = [{ id: "prod" }];
    HB.save({ ...HB.load(), manualHosts: [{ id: "laptop" }] });
    expect(HB.allHosts().map((h) => h.id)).toEqual(["prod", "laptop"]);
    expect(HB.hostById("laptop")?.id).toBe("laptop");
    expect(HB.hostById("nope")).toBeNull();
  });
});

import type { ReactNode } from "react";

import { HotkeyRecorder } from "../../../components/HotkeyRecorder";
import { Ic } from "@hostbeam/ui";
import { Switch } from "@hostbeam/ui";
import type { Settings } from "../../../types/config";
import { t } from "../../../i18n";
import { OB, type SetSetting } from "../shared";
import { Group, Label, Row } from "../components/SettingsGroup";

/** Order- and case-insensitive identity of a key combo, for "same as" checks. */
const norm = (keys: string[]) =>
  keys
    .map((k) => k.toLowerCase())
    .sort()
    .join("+");

function Warning({ children }: { children: ReactNode }) {
  return (
    <Row>
      <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--warning)" }}>
        <Ic name="alert-triangle" size={15} stroke={2.1} style={{ flex: "none" }} />
        <span style={{ fontSize: 12, color: "var(--label)" }}>{children}</span>
      </span>
    </Row>
  );
}

/** The `prefs.conflict` sentence with the conflicting shortcut's name in bold. */
function SystemConflict({ name }: { name: string }) {
  const p = t("prefs.conflict").split("{name}");
  return (
    <>
      {p[0]}
      <b style={{ fontWeight: 600 }}>{name}</b>
      {p[1] || ""}
    </>
  );
}

export function HotkeyPane({
  hotkey,
  setHotkey,
  toggleHotkey,
  setToggleHotkey,
  autoHotkey,
  setAutoHotkey,
  s,
  set,
}: {
  hotkey: string[];
  setHotkey: (keys: string[]) => void;
  /** The show/hide shortcut; null (or empty) means none is set. */
  toggleHotkey: string[] | null;
  setToggleHotkey: (keys: string[] | null) => void;
  /** The automatic-beaming shortcut; null (or empty) means none is set. */
  autoHotkey: string[] | null;
  setAutoHotkey: (keys: string[] | null) => void;
  s: Settings;
  set: SetSetting;
}) {
  const conflict = OB.hotkeyConflict(hotkey);
  const toggle = toggleHotkey && toggleHotkey.length ? toggleHotkey : null;
  const auto = autoHotkey && autoHotkey.length ? autoHotkey : null;
  const toggleConflict = toggle ? OB.hotkeyConflict(toggle) : null;
  const autoConflict = auto ? OB.hotkeyConflict(auto) : null;
  // Rust refuses to register the same combo twice and drops the loser silently,
  // so with three shortcuts the UI has to name *which* two collide rather than
  // just that something did.
  const clash = (a: string[] | null, b: string[] | null) => !!a && !!b && norm(a) === norm(b);
  const toggleVsBeam = clash(toggle, hotkey);
  const autoVsBeam = clash(auto, hotkey);
  const autoVsToggle = clash(auto, toggle);
  return (
    <div>
      <Group
        title={t("ob.globalHotkey")}
        footnote={conflict || toggleVsBeam || autoVsBeam ? undefined : t("prefs.hotkeyFoot")}
      >
        <Row first>
          <Ic name="keyboard" size={16} className="hb-fg-tertiary" />
          <Label title={t("prefs.beamShortcut")} />
          <div className="hb-push">
            <HotkeyRecorder value={hotkey} onChange={setHotkey} />
          </div>
        </Row>
        {conflict ? (
          <Warning>
            <SystemConflict name={conflict} />
          </Warning>
        ) : null}
        {toggleVsBeam ? <Warning>{t("prefs.conflictToggle")}</Warning> : null}
        {autoVsBeam ? <Warning>{t("prefs.conflictAuto")}</Warning> : null}
      </Group>
      <Group
        title={t("prefs.toggleTitle")}
        footnote={
          toggleConflict || toggleVsBeam || autoVsToggle ? undefined : t("prefs.toggleFoot")
        }
      >
        <Row first>
          <Ic name="keyboard" size={16} className="hb-fg-tertiary" />
          <Label title={t("prefs.toggleShortcut")} />
          <div className="hb-push">
            <HotkeyRecorder
              value={toggle || []}
              onChange={setToggleHotkey}
              onClear={() => setToggleHotkey(null)}
            />
          </div>
        </Row>
        {toggleConflict ? (
          <Warning>
            <SystemConflict name={toggleConflict} />
          </Warning>
        ) : null}
        {toggleVsBeam ? <Warning>{t("prefs.conflictBeam")}</Warning> : null}
        {autoVsToggle ? <Warning>{t("prefs.conflictAuto")}</Warning> : null}
      </Group>
      <Group
        title={t("prefs.autoTitle")}
        footnote={autoConflict || autoVsBeam || autoVsToggle ? undefined : t("prefs.autoFoot")}
      >
        <Row first>
          <Ic name="keyboard" size={16} className="hb-fg-tertiary" />
          <Label title={t("prefs.autoShortcut")} />
          <div className="hb-push">
            <HotkeyRecorder
              value={auto || []}
              onChange={setAutoHotkey}
              onClear={() => setAutoHotkey(null)}
            />
          </div>
        </Row>
        {autoConflict ? (
          <Warning>
            <SystemConflict name={autoConflict} />
          </Warning>
        ) : null}
        {autoVsBeam ? <Warning>{t("prefs.conflictBeam")}</Warning> : null}
        {autoVsToggle ? <Warning>{t("prefs.conflictToggle")}</Warning> : null}
      </Group>
      <Group title={t("prefs.feedback")}>
        <Row first>
          <Label title={t("prefs.playSound")} />
          <span className="hb-push">
            <Switch checked={s.sound} onChange={(v) => set("sound", v)} />
          </span>
        </Row>
        <Row>
          <Label title={t("prefs.flashIcon")} />
          <span className="hb-push">
            <Switch checked={s.flash} onChange={(v) => set("flash", v)} />
          </span>
        </Row>
      </Group>
    </div>
  );
}

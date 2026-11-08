import { Ic } from "@hostbeam/ui";
import { Field, SegmentedControl, Switch } from "@hostbeam/ui";
import type { RecentBeam, Settings } from "../../../types/config";
import type { SetSetting } from "../shared";
import { Group, Label, Row } from "../components/SettingsGroup";
import { SentenceEditor } from "../components/SentenceEditor";
import { t } from "../../../i18n";

export function GeneralPane({
  s,
  set,
  recent,
}: {
  s: Settings;
  set: SetSetting;
  recent?: RecentBeam[];
}) {
  return (
    <div>
      <Group title={t("prefs.appearance")}>
        <Row first>
          <Label title={t("prefs.appearance")} />
          <span className="hb-push">
            <SegmentedControl
              options={[
                { value: "system", label: t("prefs.appearanceSystem") },
                { value: "light", label: t("prefs.appearanceLight") },
                { value: "dark", label: t("prefs.appearanceDark") },
              ]}
              value={s.appearance || "system"}
              onChange={(v) => set("appearance", v)}
            />
          </span>
        </Row>
      </Group>
      <Group title={t("settings.language")}>
        <Row first>
          <Label title={t("settings.language")} />
          <span className="hb-push">
            <select
              value={s.locale || "system"}
              onChange={(e) => set("locale", e.target.value)}
              style={{
                appearance: "auto",
                fontFamily: "inherit",
                fontSize: 13,
                color: "var(--label)",
                background: "var(--surface-sunken)",
                border: 0,
                boxShadow: "inset 0 0 0 1px var(--border-field)",
                borderRadius: "var(--radius-md)",
                padding: "5px 26px 5px 9px",
                cursor: "pointer",
              }}
            >
              <option value="system">{t("settings.languageSystem")}</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="ja">日本語</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="zh">中文（简体）</option>
              <option value="pt">Português (Brasil)</option>
              <option value="ko">한국어</option>
            </select>
          </span>
        </Row>
      </Group>
      {/* One of the two icons must stay: the switch that would remove the
          last one is disabled (Rust enforces the same rule, startup.rs). */}
      <Group title={t("prefs.startup")} footnote={t("prefs.startupFoot")}>
        <Row first>
          <Label title={t("ob.launchAtLogin")} />
          <span className="hb-push">
            <Switch checked={s.launch} onChange={(v) => set("launch", v)} />
          </span>
        </Row>
        <Row>
          <Label title={t("prefs.showMenubar")} />
          <span className="hb-push">
            <Switch checked={s.menubar} disabled={!s.dock} onChange={(v) => set("menubar", v)} />
          </span>
        </Row>
        <Row>
          <Label title={t("prefs.showDock")} />
          <span className="hb-push">
            <Switch checked={s.dock} disabled={!s.menubar} onChange={(v) => set("dock", v)} />
          </span>
        </Row>
      </Group>
      {/* Checking on and installing off by default (ADR 0022). Installing is
          greyed out, and shown off, while checking is off: there would be
          nothing to install, and Rust requires both anyway. */}
      <Group title={t("prefs.updates")} footnote={t("prefs.updatesFoot")}>
        <Row first>
          <Label title={t("prefs.checkUpdatesAuto")} />
          <span className="hb-push">
            <Switch checked={s.checkUpdates} onChange={(v) => set("checkUpdates", v)} />
          </span>
        </Row>
        <Row>
          <Label title={t("prefs.installUpdatesAuto")} sub={t("prefs.installUpdatesAutoSub")} />
          <span className="hb-push">
            <Switch
              checked={s.checkUpdates && s.installUpdates}
              disabled={!s.checkUpdates}
              onChange={(v) => set("installUpdates", v)}
            />
          </span>
        </Row>
      </Group>
      <Group title={t("prefs.beaming")} footnote={t("prefs.beamingFoot")}>
        <Row first>
          <Label title={t("prefs.beamImmediately")} sub={t("prefs.beamImmediatelySub")} />
          <span className="hb-push">
            <Switch checked={s.immediate} onChange={(v) => set("immediate", v)} />
          </span>
        </Row>
        <Row>
          <Label title={t("prefs.showPopover")} sub={t("prefs.showPopoverSub")} />
          <span className="hb-push">
            <Switch checked={s.showOnBeam} onChange={(v) => set("showOnBeam", v)} />
          </span>
        </Row>
        {/* Off by default. Anything that can open a URL can open this one,
            a web page included, so the switch is the consent — not the
            scheme being registered. */}
        <Row>
          <Label title={t("prefs.allowUrlBeam")} sub={t("prefs.allowUrlBeamSub")} />
          <span className="hb-push">
            <Switch checked={!!s.allowUrlBeam} onChange={(v) => set("allowUrlBeam", v)} />
          </span>
        </Row>
        {/* Only how long it lasts. The switch itself is in the popover, because
            it is a mode for a session rather than a setting you configure once —
            and it is never persisted, so a launch cannot resume sending. */}
        <Row>
          <Label title={t("prefs.autoBeamFor")} sub={t("prefs.autoBeamForSub")} />
          <span className="hb-push">
            <SegmentedControl
              options={[
                { value: "15", label: t("prefs.mins", { n: 15 }) },
                { value: "60", label: t("prefs.hour1") },
                { value: "240", label: t("prefs.hours", { n: 4 }) },
                { value: "0", label: t("prefs.untilOff") },
              ]}
              value={String(s.autoBeamMinutes ?? 60)}
              onChange={(v) => set("autoBeamMinutes", Number(v))}
            />
          </span>
        </Row>
      </Group>
      {/* Off by default, and deliberately phrased as what it does rather than
          as a capability: Hostbeam is a screenshot bridge, and whether it also
          brings things back is a product decision that has not been made. */}
      <Group title={t("prefs.fromHost")} footnote={t("prefs.fromHostFoot")}>
        <Row first>
          <Label title={t("prefs.pullIncoming")} sub={t("prefs.pullIncomingSub")} />
          <span className="hb-push">
            <Switch checked={!!s.pullIncoming} onChange={(v) => set("pullIncoming", v)} />
          </span>
        </Row>
      </Group>
      {/* One control, not a switch plus a size: "Full size" is the off state, so
          there is no way to reach the contradictory "capping is on, at no cap".
          The values are pixels because this audience thinks in them, and because
          the voice doc keeps mono for values you could type. */}
      <Group title={t("prefs.imageSize")} footnote={t("prefs.imageSizeFoot")}>
        <Row first>
          <Label title={t("prefs.longestEdge")} sub={t("prefs.longestEdgeSub")} />
          <span className="hb-push">
            <SegmentedControl
              options={[
                { value: "1568", label: "1568" },
                { value: "2000", label: "2000" },
                { value: "3200", label: "3200" },
                { value: "0", label: t("prefs.fullSize") },
              ]}
              value={String(s.imageMaxEdge ?? 2000)}
              onChange={(v) => set("imageMaxEdge", Number(v))}
            />
          </span>
        </Row>
      </Group>
      <SentenceEditor s={s} set={set} recent={recent} />
      <Group title={t("prefs.defaultFolder")} footnote={t("prefs.defaultFolderFoot")}>
        <Row first>
          <Ic name="folder" size={16} className="hb-fg-tertiary" />
          <div style={{ flex: 1, marginLeft: -2 }}>
            <Field mono value={s.folder} onChange={(e) => set("folder", e.target.value)} />
          </div>
        </Row>
      </Group>
    </div>
  );
}

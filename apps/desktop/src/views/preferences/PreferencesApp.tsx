/* Hostbeam — Preferences window: General / Hosts / Hotkey / Recent / License /
   About. This file is the composition: the active tab, the config, the hooks
   each pane needs, and the sheets that open over them. The rules live in
   hooks/ beside it; the panes only render. */
import React from "react";

import { ImageLightbox } from "../../components/ImageLightbox";
import { HB, useHBConfig } from "../../lib/config";
import { t } from "../../i18n";
import { OB, type Lightbox, type PrefHost, type ReachMap, type SetSetting } from "./shared";
import { Sidebar } from "./components/Sidebar";
import { useHostManager } from "./hooks/useHostManager";
import { useHotkeySettings } from "./hooks/useHotkeySettings";
import { usePairedDevices } from "./hooks/usePairedDevices";
import { useReachability } from "./hooks/useReachability";
import { useTab } from "./hooks/useTab";
import { useUpdateDot } from "./hooks/useUpdateDot";
import { AboutPane } from "./panes/AboutPane";
import { GeneralPane } from "./panes/GeneralPane";
import { HostsPane } from "./panes/HostsPane";
import { HotkeyPane } from "./panes/HotkeyPane";
import { LicensePane } from "./panes/LicensePane";
import { RecentPane } from "./panes/RecentPane";
import { AddHostSheet } from "./sheets/AddHostSheet";
import { DiagnosticsSheet } from "./sheets/DiagnosticsSheet";
import { PairSheet } from "./sheets/PairSheet";

export function PrefsApp() {
  const [tab, setTab] = useTab();
  const [cfg, update] = useHBConfig();
  const s = cfg.settings;
  const set: SetSetting = (k, v) => update((p) => ({ ...p, settings: { ...p.settings, [k]: v } }));
  const pool: PrefHost[] = HB.allHosts();
  const configCount = (OB.sshConfig || []).length;

  const devices = usePairedDevices(cfg, update);
  // The two are wired together: adding a host probes it, and a probe learns
  // which devices the host holds. `reach.runTest` is read through a ref so the
  // host manager can call it before it exists in this render.
  const runTestRef = React.useRef<(id: string) => Promise<void>>(() => Promise.resolve());
  const hosts = useHostManager(cfg, update, pool, (id) => void runTestRef.current(id));
  const reach = useReachability(
    pool,
    // Not the ones missing from ~/.ssh/config: there is nothing to ask.
    hosts.addedIds.filter((id) => pool.some((h) => h.id === id)),
    devices.pairedDevices,
    devices.remember,
    update,
  );
  runTestRef.current = reach.runTest;
  const keys = useHotkeySettings(cfg, update);
  const updAvailable = useUpdateDot(cfg);

  // {type:'add'} | {type:'diag', hostId} | {type:'pair', hostId}
  const [sheet, setSheet] = React.useState<{ type: string; hostId?: string } | null>(null);
  // Tap-to-enlarge for Recent thumbnails (ImageLightbox over the window).
  const [lightbox, setLightbox] = React.useState<Lightbox | null>(null);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        background: "var(--surface-content)",
        overflow: "hidden",
        display: "flex",
      }}
    >
      <Sidebar tab={tab} setTab={setTab} updateDot={updAvailable} />
      {/* content column */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          background: "var(--window)",
        }}
      >
        {/* draggable toolbar region, mirrors traffic-light height */}
        <div data-tauri-drag-region style={{ height: 38, flex: "none" }} />
        <div
          key={tab}
          className="pf-pane"
          style={{ flex: 1, overflow: "auto", padding: "0 30px 28px" }}
        >
          {tab !== "about" ? (
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--label)",
                margin: "0 0 20px",
                letterSpacing: "-0.01em",
              }}
            >
              {t("nav." + tab)}
            </h1>
          ) : null}
          {tab === "general" && <GeneralPane s={s} set={set} recent={cfg.recent} />}
          {tab === "hosts" && (
            <HostsPane
              pairedDevices={devices.pairedDevices}
              forgetPairedDevice={devices.forget}
              deviceHosts={reach.deviceHosts}
              authorizeDevice={reach.authorizeDevice}
              justAdded={hosts.justAdded}
              dismissJustAdded={hosts.dismissJustAdded}
              pool={pool}
              configCount={configCount}
              addedIds={hosts.addedIds}
              addHost={hosts.addHost}
              removeHost={hosts.removeHost}
              addManual={() => setSheet({ type: "add" })}
              onDiagnose={(id) => setSheet({ type: "diag", hostId: id })}
              onPair={(id) => setSheet({ type: "pair", hostId: id })}
              selectedId={hosts.selectedId}
              setSelected={hosts.setSelectedId}
              defaultId={hosts.defaultId}
              setDefault={hosts.setDefault}
              tests={reach.tests}
              testedAt={reach.testedAt}
              reach={(cfg.reach as ReachMap) || {}}
              runTest={reach.runTest}
              recheck={reach.recheck}
              onCheckAll={reach.checkAll}
              folders={hosts.folders}
              defaultFolder={s.folder}
              setFolder={hosts.setFolder}
              clearFolder={hosts.clearFolder}
              moveHost={hosts.moveHost}
              renameHost={hosts.renameHost}
              recent={cfg.recent}
            />
          )}
          {tab === "hotkey" && (
            <HotkeyPane
              hotkey={keys.hotkey}
              setHotkey={keys.setHotkey}
              toggleHotkey={keys.toggleHotkey}
              autoHotkey={keys.autoHotkey}
              setAutoHotkey={keys.setAutoHotkey}
              setToggleHotkey={keys.setToggleHotkey}
              s={s}
              set={set}
            />
          )}
          {tab === "license" && <LicensePane />}
          {tab === "recent" && (
            <RecentPane
              recent={cfg.recent}
              sentence={s.sentence}
              copySentence={s.copySentence}
              onRemove={(id) =>
                update((p) => ({ ...p, recent: (p.recent || []).filter((r) => r.id !== id) }))
              }
              onClear={() => update((p) => ({ ...p, recent: [] }))}
              onEnlarge={setLightbox}
            />
          )}
          {tab === "about" && (
            <AboutPane
              onReset={() => {
                update(HB.defaults());
                hosts.setSelectedId(null);
                setSheet(null);
              }}
              skippedVersion={cfg.updateDismissed}
              onSkipUpdate={(version) => update((p) => ({ ...p, updateDismissed: version }))}
            />
          )}
        </div>
      </main>

      {sheet && sheet.type === "add" ? (
        <AddHostSheet
          existing={pool}
          defaultFolder={s.folder}
          onClose={() => setSheet(null)}
          onSave={(input) => {
            hosts.addManualHost(input);
            setSheet(null);
          }}
        />
      ) : null}
      {sheet && sheet.type === "diag" ? (
        <DiagnosticsSheet
          host={pool.find((h) => h.id === sheet.hostId) || null}
          onClose={() => setSheet(null)}
        />
      ) : null}
      {sheet && sheet.type === "pair"
        ? (() => {
            const h = pool.find((x) => x.id === sheet.hostId);
            return h ? (
              <PairSheet
                host={h}
                devices={devices.pairedDevices}
                present={reach.deviceHosts[h.id]}
                onAuthorized={(device) => reach.recordAuthorized(h.id, device)}
                onClose={() => setSheet(null)}
              />
            ) : null;
          })()
        : null}
      {lightbox ? (
        <ImageLightbox
          src={lightbox.src ?? null}
          caption={lightbox.caption}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </div>
  );
}

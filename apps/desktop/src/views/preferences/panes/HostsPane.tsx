// Preferences → Hosts: the hosts in Hostbeam, the devices this Mac has
// authorized, and the ~/.ssh/config picker to add more. The rows and their
// detail drawer are components under hosts/; the per-pane state (ports, the
// expanded host's storage readout and device authorization) is in hooks there.
import React from "react";

import { Ic, Spinner } from "@hostbeam/ui";

import { HostPickerList } from "../../../components/HostPickerList";
import { relTime } from "../../../lib/format";
import { addedHosts } from "../../../lib/host-order";
import { sshTarget } from "../../../lib/ipc";
import type { PairedDevice, RecentBeam } from "../../../types/config";
import { Group, Label, Row } from "../components/SettingsGroup";
import { t } from "../../../i18n";
import { type PrefHost, type ReachMap } from "../shared";
import { HostDetail } from "./hosts/HostDetail";
import { HostRow } from "./hosts/HostRow";
import { PickerAddPanel } from "./hosts/PickerAddPanel";
import { useDeviceAuthorize } from "./hosts/useDeviceAuthorize";
import { useHostStorage } from "./hosts/useHostStorage";
import { usePorts } from "./hosts/usePorts";

interface HostsPaneProps {
  pool: PrefHost[];
  configCount: number;
  addedIds: string[];
  addHost: (id: string, opts?: { folder?: string }) => void;
  removeHost: (id: string) => void;
  addManual: () => void;
  onDiagnose: (id: string) => void;
  onPair: (id: string) => void;
  selectedId: string | null;
  setSelected: (id: string | null) => void;
  defaultId: string | null;
  setDefault: (id: string) => void;
  tests: Record<string, string>;
  testedAt: Record<string, number>;
  reach: ReachMap;
  runTest: (id: string) => Promise<void> | void;
  /** Probe `id` again unless it was probed a moment ago (useReachability). */
  recheck: (id: string) => void;
  onCheckAll: () => void;
  folders: Record<string, string>;
  defaultFolder?: string;
  setFolder: (id: string, val: string) => void;
  clearFolder: (id: string) => void;
  moveHost: (id: string, dir: number) => void;
  renameHost: (id: string, name: string) => void;
  recent?: RecentBeam[];
  /** Devices authorized from this Mac (ADR 0018). */
  pairedDevices: PairedDevice[];
  forgetPairedDevice: (id: string) => void;
  /** Device ids each host already accepts, learned from the probe. A host that
   *  is absent is UNKNOWN — not "none": a failed probe is not evidence. */
  deviceHosts: Record<string, string[]>;
  authorizeDevice: (hostId: string, device: PairedDevice) => Promise<void>;
  /** A host added in this sitting, so the "make it the default?" question can
   *  be asked once, next to the host it is about. */
  justAdded: string | null;
  dismissJustAdded: () => void;
}

export function HostsPane({
  pool,
  configCount,
  addedIds,
  addHost,
  removeHost,
  addManual,
  onDiagnose,
  onPair,
  selectedId,
  setSelected,
  defaultId,
  setDefault,
  tests,
  testedAt,
  reach,
  runTest,
  recheck,
  onCheckAll,
  folders,
  defaultFolder,
  setFolder,
  clearFolder,
  moveHost,
  renameHost,
  recent,
  pairedDevices,
  forgetPairedDevice,
  deviceHosts,
  authorizeDevice,
  justAdded,
  dismissJustAdded,
}: HostsPaneProps) {
  // A host that left ~/.ssh/config stays listed, marked missing, so it can be
  // seen and removed — and so beams refuse rather than move elsewhere.
  const added = addedHosts(addedIds, pool);
  const available = pool.filter((h) => !addedIds.includes(h.id));

  const ports = usePorts(added.filter((h) => !h.missing));
  // `user@host`, with `:port` only when it isn't the default — 22 on every row
  // is noise, while a non-standard port is exactly the thing worth seeing.
  const addrOf = (h: PrefHost) => {
    if (h.missing) return t("host.missing");
    const port = ports[sshTarget(h)];
    return `${h.user}@${h.address}${port && port !== 22 ? `:${port}` : ""}`;
  };

  const manualCount = added.filter((h) => h.manual).length;
  const anyTesting = added.some((h) => tests[h.id] === "testing");

  // Opening a host's row asks it again: what it holds — whether this Mac's
  // remembered device is authorized there — may have changed behind the
  // Mac's back since the last probe.
  // Not one missing from ~/.ssh/config: there is nothing there to ask.
  const selectedMissing = !!added.find((h) => h.id === selectedId)?.missing;
  React.useEffect(() => {
    if (selectedId && !selectedMissing) recheck(selectedId);
  }, [selectedId, selectedMissing, recheck]);

  const storage = useHostStorage(selectedId, folders, defaultFolder);
  const device = useDeviceAuthorize(selectedId, authorizeDevice);
  /* Offered inline only when exactly one device is remembered. With two or
     more, one button cannot say whose key it would install, so those keep
     falling through to the sheet, where each device has its own row. */
  const soleDevice = pairedDevices.length === 1 ? pairedDevices[0] : null;
  /* "on" | "off" | null, where null means we do not know — the host has not
     answered yet, or answered that it is unreachable. Silence is the honest
     rendering: offering to authorize a host we cannot reach would fail, and
     claiming it is authorized would be a guess. */
  const deviceOn = (h: PrefHost): "on" | "off" | null => {
    if (!soleDevice) return null;
    const present = deviceHosts[h.id];
    if (!present) return null;
    return present.includes(soleDevice.id) ? "on" : "off";
  };

  // Re-render every 30s so the "checked … ago" labels stay current while idle.
  const [, forceTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);
  const checkedLabel = (h: PrefHost) =>
    testedAt && testedAt[h.id] ? t("prefs.checked", { time: relTime(testedAt[h.id]) }) : null;

  // The row dot reflects the last reachability test (probed on open + on demand);
  // grey "unknown" until a result lands.
  const dotStatus = (h: PrefHost) => {
    if (h.missing) return "offline";
    const t = tests[h.id];
    if (t === "testing") return "pending";
    if (t === "ok") return "online";
    if (t === "fail") return "offline";
    const r = reach && reach[h.id]; // last-known (persisted) before this session's probe lands
    if (r) return r.ok ? "online" : "offline";
    return h.online === false ? "offline" : "unknown";
  };

  return (
    <div>
      <Group
        title={t("prefs.inHostbeam")}
        footnote={t("prefs.inHostbeamFoot")}
        action={
          added.length ? (
            <button
              onClick={onCheckAll}
              disabled={anyTesting}
              aria-label={t("prefs.checkAllAria")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                border: 0,
                background: "transparent",
                cursor: anyTesting ? "default" : "pointer",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 500,
                padding: 2,
                opacity: anyTesting ? 0.6 : 1,
              }}
            >
              {anyTesting ? (
                <>
                  <Spinner size={11} /> {t("prefs.checking")}
                </>
              ) : (
                <>
                  <Ic name="rotate-cw" size={12} stroke={2.3} /> {t("prefs.checkAll")}
                </>
              )}
            </button>
          ) : null
        }
      >
        {added.length === 0 ? (
          <div style={{ padding: "22px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--label-secondary)" }}>
              {t("prefs.noHostYet")}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--label-tertiary)", marginTop: 3 }}>
              {t("prefs.searchOrManual")}
            </div>
          </div>
        ) : (
          added.map((h, i) => {
            const isOpen = h.id === selectedId;
            const overridden = !!(folders && Object.prototype.hasOwnProperty.call(folders, h.id));
            return (
              <HostRow
                key={h.id}
                host={h}
                index={i}
                count={added.length}
                isOpen={isOpen}
                isDefault={h.id === defaultId}
                dot={dotStatus(h)}
                address={addrOf(h)}
                checkedLabel={checkedLabel(h)}
                onToggle={() => setSelected(isOpen ? null : h.id)}
                onMove={(dir) => moveHost(h.id, dir)}
                onRemove={() => removeHost(h.id)}
              >
                {h.missing ? (
                  <div
                    style={{
                      borderTop: "1px solid var(--separator)",
                      background: "var(--surface-sunken)",
                      padding: "12px 14px",
                      fontSize: 12,
                      lineHeight: 1.45,
                      color: "var(--label-secondary)",
                    }}
                  >
                    {t("prefs.missingBody")}
                  </div>
                ) : (
                  <HostDetail
                    host={h}
                    address={addrOf(h)}
                    test={tests[h.id] || "idle"}
                    checkedLabel={checkedLabel(h)}
                    isDefault={h.id === defaultId}
                    defaultName={added.find((x) => x.id === defaultId)?.name || defaultId || ""}
                    askDefault={justAdded === h.id && h.id !== defaultId && added.length > 1}
                    onDismissAsk={dismissJustAdded}
                    onSetDefault={() => setDefault(h.id)}
                    folder={{
                      value: overridden ? folders[h.id] : defaultFolder,
                      overridden,
                      placeholder: defaultFolder,
                    }}
                    onFolderChange={(v) => setFolder(h.id, v)}
                    onFolderClear={() => clearFolder(h.id)}
                    lastBeam={recent ? (recent.find((r) => r.hostId === h.id) ?? null) : null}
                    onRename={(name) => renameHost(h.id, name)}
                    onTest={() => runTest(h.id)}
                    onDiagnose={() => onDiagnose(h.id)}
                    onPair={() => onPair(h.id)}
                    soleDevice={soleDevice}
                    deviceOn={deviceOn(h)}
                    auth={device.auth}
                    onAuthorize={(d) => device.authorize(h.id, d)}
                    storage={storage.stor}
                    onStorageCheck={() => storage.check(h)}
                    onStorageClean={() => storage.clean(h)}
                  />
                )}
              </HostRow>
            );
          })
        )}
      </Group>

      {/* Devices authorized from this Mac (ADR 0018). Visible on purpose: which
       * devices can reach your servers should be answerable here, not only by
       * reading authorized_keys on each host. A replaced phone gets a new key,
       * so without this the old one would keep being offered indefinitely. */}
      {pairedDevices.length > 0 ? (
        <Group title={t("prefs.devicesTitle")} footnote={t("prefs.devicesSub")}>
          {pairedDevices.map((d, i) => (
            <Row key={d.id} first={i === 0}>
              <Label title={d.name} sub={d.lastUsedAt ? relTime(d.lastUsedAt) : undefined} />
              <span
                className="hb-mono hb-fg-secondary"
                style={{
                  marginLeft: "auto",
                  fontSize: 10.5,
                  maxWidth: 150,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={d.id}
              >
                {d.id}
              </span>
              <button
                onClick={() => forgetPairedDevice(d.id)}
                aria-label={t("prefs.devicesForget")}
                title={t("prefs.devicesForget")}
                style={{
                  marginLeft: 8,
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--label-tertiary)",
                  padding: 2,
                }}
              >
                <Ic name="trash" size={13} stroke={2} />
              </button>
            </Row>
          ))}
        </Group>
      ) : null}

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", margin: "0 2px 7px" }}>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: ".05em",
              color: "var(--label-tertiary)",
            }}
          >
            {t("prefs.addAHost")}
          </span>
          <button
            onClick={addManual}
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              border: 0,
              background: "transparent",
              cursor: "pointer",
              color: "var(--accent)",
              fontSize: 12,
              fontWeight: 500,
              padding: 2,
            }}
          >
            <Ic name="plus" size={13} stroke={2.4} /> {t("prefs.addManually")}
          </button>
        </div>
        <HostPickerList
          hosts={available}
          addedHosts={added}
          renderExpanded={(h) => (
            <PickerAddPanel
              defaultFolder={defaultFolder}
              test={tests[h.id]}
              onTest={() => runTest(h.id)}
              onAdd={(folder) => addHost(h.id, { folder })}
            />
          )}
          emptyText={
            available.length === 0 ? t("prefs.everyHostAdded") : t("prefs.noMatchingConfig")
          }
        />
        <div
          style={{
            fontSize: 11,
            color: "var(--label-tertiary)",
            margin: "7px 2px 0",
            lineHeight: 1.45,
          }}
        >
          {t("prefs.hostsInPre", { count: configCount })}{" "}
          <span className="hb-mono">~/.ssh/config</span> ·{" "}
          {t("prefs.hostsAdded", { added: added.length })}
          {manualCount ? ` · ${t("prefs.hostsManual", { manual: manualCount })}` : ""}
          {available.length === 0 ? ` · ${t("prefs.hostsAllAdded")}` : ""}.
        </div>
      </div>
    </div>
  );
}

import { Button, Field, Ic, Spinner } from "@hostbeam/ui";

import { ReachBadge } from "../../../../components/ReachBadge";
import { relTime } from "../../../../lib/format";
import { openTerminal, sshTarget } from "../../../../lib/ipc";
import type { PairedDevice, RecentBeam } from "../../../../types/config";
import { Label, Row } from "../../components/SettingsGroup";
import { t } from "../../../../i18n";
import { type PrefHost } from "../../shared";
import { storageSize, type StorageState } from "./useHostStorage";

export interface HostDetailProps {
  host: PrefHost;
  address: string;
  /** "idle" | "testing" | "ok" | "fail" */
  test: string;
  checkedLabel: string | null;
  isDefault: boolean;
  /** The current default's name, for the "make it the default?" question. */
  defaultName: string;
  /** Asked once, on the host just added, when there is more than one. */
  askDefault: boolean;
  onDismissAsk: () => void;
  onSetDefault: () => void;
  folder: { value: string | undefined; overridden: boolean; placeholder?: string };
  onFolderChange: (value: string) => void;
  onFolderClear: () => void;
  lastBeam: RecentBeam | null;
  onRename: (name: string) => void;
  onTest: () => void;
  onDiagnose: () => void;
  onPair: () => void;
  /** The one remembered device, and whether this host holds its key:
   *  "on" | "off" | null for unknown. */
  soleDevice: PairedDevice | null;
  deviceOn: "on" | "off" | null;
  auth: "idle" | "busy" | "err";
  onAuthorize: (device: PairedDevice) => void;
  storage: StorageState;
  onStorageCheck: () => void;
  onStorageClean: () => void;
}

/** Per-host details, rendered inline under the expanded row (a disclosure
 *  drawer) so they sit right next to the host instead of far below the list. */
export function HostDetail({
  host: h,
  address,
  test: outcome,
  checkedLabel,
  isDefault,
  defaultName,
  askDefault,
  onDismissAsk,
  onSetDefault,
  folder,
  onFolderChange,
  onFolderClear,
  lastBeam,
  onRename,
  onTest,
  onDiagnose,
  onPair,
  soleDevice,
  deviceOn,
  auth,
  onAuthorize,
  storage: stor,
  onStorageCheck,
  onStorageClean,
}: HostDetailProps) {
  return (
    <div
      className="pf-host-detail"
      style={{ borderTop: "1px solid var(--separator)", background: "var(--surface-sunken)" }}
    >
      {/* Asked once, on the host it is about. Adding a host is usually the
          prelude to beaming to it, but the hotkey and the HUD keep going to
          the old default in silence — the kind of thing you discover by
          finding a screenshot on the wrong server. Never switched for you:
          where a beam lands is not a decision to take on someone's behalf. */}
      {askDefault ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderBottom: "1px solid var(--separator)",
            background: "var(--fill-secondary)",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--label)", minWidth: 0 }}>
            {t("prefs.makeDefaultAsk", { host: defaultName })}
          </span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 7, flex: "none" }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onSetDefault();
                onDismissAsk();
              }}
            >
              {t("prefs.setAsDefault")}
            </Button>
            <Button variant="ghost" size="sm" onClick={onDismissAsk}>
              {t("prefs.notNow")}
            </Button>
          </span>
        </div>
      ) : null}
      <Row first>
        <Label
          title={t("field.name")}
          sub={h.manual ? t("prefs.editableManual") : t("prefs.fromConfig")}
        />
        {h.manual ? (
          <span style={{ marginLeft: "auto", width: 190 }}>
            <Field value={h.name} onChange={(e) => onRename(e.target.value)} />
          </span>
        ) : (
          <span
            style={{ marginLeft: "auto", fontSize: 13, color: "var(--label)", fontWeight: 500 }}
          >
            {h.name}
          </span>
        )}
      </Row>
      <Row>
        <Label title={t("field.address")} />
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--label)",
          }}
        >
          {address}
        </span>
      </Row>
      <Row>
        <Label title={t("prefs.lastBeamed")} />
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12.5,
            color: lastBeam ? "var(--label)" : "var(--label-tertiary)",
          }}
        >
          {lastBeam ? relTime(lastBeam.at) : t("prefs.never")}
        </span>
      </Row>
      <div
        style={{
          padding: "11px 14px",
          borderTop: "1px solid var(--separator)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <Label
            title={t("field.remoteFolder")}
            sub={folder.overridden ? t("prefs.setForHost") : t("prefs.usingDefault")}
          />
          {folder.overridden ? (
            <span className="hb-push">
              <Button variant="ghost" size="sm" onClick={onFolderClear}>
                {t("prefs.useDefault")}
              </Button>
            </span>
          ) : null}
        </div>
        <Field
          mono
          value={folder.value}
          placeholder={folder.placeholder}
          onChange={(e) => onFolderChange(e.target.value)}
        />
      </div>
      <Row>
        <Label title={t("prefs.connection")} sub={checkedLabel} />
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 9 }}>
          {outcome === "testing" && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "var(--label-secondary)",
              }}
            >
              <Spinner size={13} /> {t("ob.testing")}
            </span>
          )}
          <ReachBadge
            state={outcome}
            okLabel={t("ob.reachable")}
            failLabel={t("prefs.unreachable")}
          />
          <Button variant="secondary" size="sm" onClick={onTest} disabled={outcome === "testing"}>
            {outcome === "idle" ? t("ob.test") : t("prefs.retest")}
          </Button>
        </span>
      </Row>
      <div
        style={{
          display: "flex",
          gap: 9,
          flexWrap: "wrap",
          padding: "12px 14px",
          borderTop: "1px solid var(--separator)",
        }}
      >
        <Button variant="primary" size="sm" disabled={isDefault} onClick={onSetDefault}>
          {isDefault ? t("prefs.defaultHost") : t("prefs.setAsDefault")}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Ic name="activity" size={14} />}
          onClick={onDiagnose}
        >
          {t("prefs.diagnostics")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Ic name="terminal" size={14} />}
          onClick={() => {
            // Same target shape as the reachability probe: config hosts by
            // ssh alias, manual hosts as user@address. No-op in browser dev.
            openTerminal(sshTarget(h));
          }}
        >
          {t("prefs.openTerminal")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Ic name="smartphone" size={14} />}
          onClick={onPair}
        >
          {t("prefs.pairAction")}
        </Button>
        {/* The remembered device, offered here so host 2..n never needs the
            pairing sheet opened just to click one button. Shown only once
            the host itself has said it does not hold the key — the probe
            already asked, on the connection it was making anyway. */}
        {deviceOn === "off" ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={auth === "busy"}
            icon={
              auth === "busy" ? <Spinner size={12} /> : <Ic name="key" size={14} stroke={2.2} />
            }
            onClick={() => {
              if (!soleDevice || auth === "busy") return;
              onAuthorize(soleDevice);
            }}
          >
            {t("prefs.authorizeDevice", { device: soleDevice?.name || "" })}
          </Button>
        ) : deviceOn === "on" ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11.5,
              color: "var(--label-tertiary)",
            }}
            title={soleDevice?.id}
          >
            <Ic name="check" size={13} stroke={2.4} />
            {t("prefs.deviceAuthorized", { device: soleDevice?.name || "" })}
          </span>
        ) : null}
        {auth === "err" ? (
          <span style={{ fontSize: 11.5, color: "var(--danger)" }}>{t("prefs.pairAuthFail")}</span>
        ) : null}
      </div>
      {/* remote storage: what Hostbeam left on the host, and a scoped cleanup */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "10px 14px",
          borderTop: "1px solid var(--separator)",
          fontSize: 12,
        }}
      >
        {stor.phase === "idle" || stor.phase === "error" ? (
          <>
            <Button variant="ghost" size="sm" onClick={onStorageCheck}>
              {t("prefs.storage")}
            </Button>
            {stor.phase === "error" ? (
              <span className="hb-fg-tertiary">{t("prefs.storageFailed")}</span>
            ) : null}
          </>
        ) : stor.phase === "loading" || stor.phase === "cleaning" ? (
          <span className="hb-fg-secondary">…</span>
        ) : stor.phase === "done" ? (
          <span style={{ color: "var(--success)", fontWeight: 500 }}>
            {t("prefs.cleanupDone", { n: String(stor.deleted) })}
          </span>
        ) : stor.phase === "ready" && stor.count === 0 ? (
          <span className="hb-fg-secondary">{t("prefs.storageEmpty")}</span>
        ) : stor.phase === "ready" ? (
          <>
            <span className="hb-fg-secondary">
              {t("prefs.storageLine", { n: String(stor.count), size: storageSize(stor.kb) })}
            </span>
            <button
              onClick={onStorageClean}
              style={{
                border: 0,
                background: "transparent",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                padding: "3px 8px",
                borderRadius: "var(--radius-sm)",
                color: "var(--danger)",
              }}
            >
              {stor.confirm
                ? t("prefs.cleanupConfirm", { n: String(stor.count) })
                : t("prefs.cleanup")}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

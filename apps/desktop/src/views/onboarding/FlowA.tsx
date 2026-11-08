// Flow A — popover-native micro-onboarding (app-owned screen, ported from the
// design prototype src/design/flowA.jsx). Three calm steps inside the menu-bar
// popover, then a hand-off to the real Ready state. Behavior-preserving.
import { useEffect, useLayoutEffect, useState } from "react";

import { HostPickerList } from "../../components/HostPickerList";
import { HotkeyRecorder } from "../../components/HotkeyRecorder";
import { Ic } from "@hostbeam/ui";
import { StepDots } from "../../components/StepDots";
import { Badge, Button, Spinner, StatusDot, Switch } from "@hostbeam/ui";
import { t } from "../../i18n";
import { HB } from "../../lib/config";
import { slugId } from "../../lib/host-id";
import { fitPopover } from "../../lib/fit-popover";
import { OB_MOCK } from "../../lib/hosts";
import { sshTarget, testHost } from "../../lib/ipc";
import { InnerHead } from "./components/InnerHead";
import { PopoverFrame } from "./components/PopoverFrame";
import { WelcomeBeam } from "./components/WelcomeBeam";
import type { BeakSpec, ManualSpec, OnbHost, TestState } from "./shared";
import { ManualAdd } from "./steps/ManualAdd";

export function FlowA({
  onDone,
  beak,
  emptyConfig,
}: {
  onDone: () => void;
  beak?: BeakSpec;
  emptyConfig?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [hostId, setHostId] = useState<string | null>(null);
  const [manualHost, setManualHost] = useState<OnbHost | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [launch, setLaunch] = useState(true);
  const [hotkey, setHotkey] = useState<string[]>(() => {
    try {
      return HB.load().hotkey || ["cmd", "shift", "7"];
    } catch {
      return ["cmd", "shift", "7"];
    }
  });
  const onHotkeyChange = (keys: string[]) => {
    setHotkey(keys);
    try {
      const c = HB.load();
      HB.save({ ...c, hotkey: keys });
    } catch {
      /* ignore */
    }
    window.applyHotkey?.(keys);
  };
  useLayoutEffect(() => {
    fitPopover();
  });
  useEffect(() => {
    const id = requestAnimationFrame(() => window.focusPrimary?.());
    return () => cancelAnimationFrame(id);
  }, [step, manualOpen]);
  const [test, setTest] = useState<TestState>("idle");
  const detected = (emptyConfig ? [] : OB_MOCK.detected) as OnbHost[];
  const host = manualHost || detected.find((h) => h.id === hostId) || null;
  const runTest = () => {
    setTest("testing");
    testHost(host ? sshTarget(host) : (hostId ?? ""))
      .then((r) => setTest(r.ok ? "ok" : "fail"))
      .catch(() => setTest("fail"));
  };

  const buildManual = ({ name, user, address, folder, online }: ManualSpec): OnbHost => {
    const id = slugId(
      name,
      HB.allHosts().map((h) => h.id),
    );
    return { id, name, user, address, folder: folder || "/tmp/hostbeam", online, manual: true };
  };

  const finish = () => {
    if (host) {
      const cfg = HB.load();
      const isManual = !!manualHost;
      const manualHosts =
        isManual && manualHost && !(cfg.manualHosts || []).some((h) => h.id === host.id)
          ? [...(cfg.manualHosts || []), manualHost]
          : cfg.manualHosts;
      const folders = { ...(cfg.folders || {}) };
      if (isManual && manualHost?.folder && manualHost.folder !== cfg.settings.folder)
        folders[host.id] = manualHost.folder;
      const addedIds = cfg.addedIds.includes(host.id) ? cfg.addedIds : [...cfg.addedIds, host.id];
      HB.save({
        ...cfg,
        manualHosts,
        folders,
        addedIds,
        defaultId: host.id,
        settings: { ...cfg.settings, launch },
      });
    }
    onDone();
  };

  if (step === 0) {
    return (
      <PopoverFrame key={0} beak={beak}>
        <div
          style={{
            padding: "34px 24px 18px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 12,
          }}
        >
          <WelcomeBeam />
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--label)", marginTop: 4 }}>
            {t("ob.welcomeTitle")}
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--label-secondary)",
              maxWidth: 232,
              lineHeight: 1.5,
            }}
          >
            {t("ob.welcomeBody")}
          </div>
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 9,
              marginTop: 18,
            }}
          >
            <Button
              variant="primary"
              size="lg"
              block
              data-primary
              iconRight={<Ic name="arrow-right" size={15} />}
              onClick={() => setStep(1)}
            >
              {t("ob.getStarted")}
            </Button>
            <Button variant="ghost" size="md" block onClick={onDone}>
              {t("ob.skipSetup")}
            </Button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 18px" }}>
          <StepDots count={3} active={0} />
        </div>
      </PopoverFrame>
    );
  }

  if (step === 1) {
    const showForm = detected.length === 0 || manualOpen;
    return (
      <PopoverFrame key={1} beak={beak}>
        <InnerHead
          title={showForm ? t("ob.addHostTitle") : t("ob.chooseHost")}
          onBack={() => {
            if (manualOpen && detected.length) setManualOpen(false);
            else setStep(0);
          }}
          step={1}
        />
        {showForm ? (
          <ManualAdd
            emptyConfig={detected.length === 0}
            onAdd={(spec) => {
              const h = buildManual(spec);
              setManualHost(h);
              setHostId(h.id);
              setTest("idle");
              setStep(2);
            }}
            onSkip={onDone}
          />
        ) : (
          <>
            <div
              style={{
                padding: "14px 16px 6px",
                fontSize: 12,
                color: "var(--label-secondary)",
                lineHeight: 1.45,
              }}
            >
              <div>{t("ob.whereBeams")}</div>
              <div className="hb-fg-tertiary">
                {(() => {
                  const p = t("ob.fromSshConfig").split("{config}");
                  return (
                    <>
                      {p[0]}
                      <span className="hb-mono">~/.ssh/config</span>
                      {p[1] || ""}
                    </>
                  );
                })()}
              </div>
            </div>
            <div style={{ padding: "4px 14px 6px" }}>
              <HostPickerList
                hosts={detected}
                autoFocus
                showUser={false}
                onPick={(h) => {
                  setManualHost(null);
                  setHostId(h.id);
                  setTest("idle");
                  setStep(2);
                }}
              />
            </div>
            <div style={{ padding: "4px 16px 2px" }}>
              <button
                onClick={() => setManualOpen(true)}
                className="obA-addlink"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--accent)",
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: "var(--font-system)",
                  padding: "4px 2px",
                }}
              >
                <Ic name="plus" size={13} stroke={2.4} /> {t("ob.addNotListed")}
              </button>
            </div>
            <div style={{ padding: "4px 16px 16px" }}>
              <Button variant="ghost" size="sm" block onClick={onDone}>
                {t("ob.skipChooseLater")}
              </Button>
            </div>
          </>
        )}
      </PopoverFrame>
    );
  }

  if (step === 2 && host) {
    return (
      <PopoverFrame key={2} beak={beak}>
        <InnerHead title={t("ob.almostDone")} onBack={() => setStep(1)} step={2} />
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: "var(--surface-content)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "inset 0 0 0 0.5px var(--separator)",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => setStep(1)}
              className="ob-changehost"
              aria-label={`${t("ob.changeHost")} (${host.name})`}
              title={t("ob.changeHost")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                width: "100%",
                textAlign: "left",
                border: 0,
                cursor: "pointer",
                font: "inherit",
                background: "transparent",
                padding: "12px 13px",
              }}
            >
              <StatusDot
                status={
                  test === "ok"
                    ? "online"
                    : test === "fail"
                      ? "offline"
                      : test === "testing"
                        ? "pending"
                        : "offline"
                }
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--label)" }}>
                  {host.name}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--label-tertiary)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {host.folder}
                </span>
              </div>
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                <Badge tone="accent">{t("host.default")}</Badge>
                <Ic name="chevron-down" size={16} className="hb-fg-tertiary" />
              </span>
            </button>
            <div style={{ height: 1, background: "var(--separator)" }} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                minHeight: 24,
                padding: "10px 13px",
                background:
                  test === "ok"
                    ? "var(--success-tint)"
                    : test === "fail"
                      ? "var(--danger-tint)"
                      : "transparent",
                transition: "background var(--dur-fast) var(--ease-standard)",
              }}
            >
              {test === "idle" && (
                <>
                  <Ic name="zap" size={15} className="hb-fg-tertiary" />
                  <span style={{ fontSize: 12, color: "var(--label-secondary)" }}>
                    {t("ob.testTheConnection")}
                  </span>
                  <span className="hb-push">
                    <Button variant="secondary" size="sm" data-autofocus onClick={runTest}>
                      {t("ob.test")}
                    </Button>
                  </span>
                </>
              )}
              {test === "testing" && (
                <>
                  <Spinner size={14} />
                  <span style={{ fontSize: 12, color: "var(--label-secondary)" }}>
                    {t("ob.connectingTo", { host: host.name ?? "" })}
                  </span>
                </>
              )}
              {test === "ok" && (
                <>
                  <Ic name="check" size={15} stroke={2.4} className="hb-fg-success" />
                  <span style={{ fontSize: 12, color: "var(--label)" }}>
                    {t("ob.reachableWritable")}
                  </span>
                </>
              )}
              {test === "fail" && (
                <>
                  <Ic name="x" size={15} stroke={2.4} className="hb-fg-danger" />
                  <span style={{ fontSize: 12, color: "var(--label)" }}>
                    {t("ob.didntAnswer", { host: host.name ?? "" })}
                  </span>
                  <span className="hb-push">
                    <Button variant="secondary" size="sm" data-autofocus onClick={runTest}>
                      {t("ob.retry")}
                    </Button>
                  </span>
                </>
              )}
            </div>
          </div>
          <div
            style={{
              background: "var(--surface-content)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "inset 0 0 0 0.5px var(--separator)",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 13px" }}>
              <Ic name="keyboard" size={16} className="hb-fg-tertiary" />
              <span style={{ fontSize: 12.5, color: "var(--label)" }}>{t("ob.globalHotkey")}</span>
              <span className="hb-push">
                <HotkeyRecorder value={hotkey} onChange={onHotkeyChange} />
              </span>
            </div>
            <div style={{ height: 1, background: "var(--separator)", marginLeft: 13 }} />
            <div style={{ display: "flex", alignItems: "center", padding: "12px 13px" }}>
              <Switch checked={launch} onChange={setLaunch} label={t("ob.launchAtLogin")} />
            </div>
          </div>
          <Button
            variant="primary"
            size="lg"
            block
            data-primary
            icon={<Ic name="check" size={15} />}
            onClick={finish}
          >
            {test === "fail" ? t("ob.startAnyway") : t("ob.startUsing")}
          </Button>
        </div>
      </PopoverFrame>
    );
  }

  // Unreachable: every caller passes onDone, and finish() hands off through it.
  return null;
}

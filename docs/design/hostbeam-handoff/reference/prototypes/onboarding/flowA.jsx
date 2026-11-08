/* Flow A — Popover-native micro-onboarding (refined: less dense).
   Onboarding happens right inside the menu-bar popover: 3 calm steps, then the
   real Ready state. More breathing room — generous padding, airy host rows. */
const A = window.HostbeamDesignSystem_23dc0f;
const { Button: ButtonA, StatusDot: DotA, Keycap: KeycapA, Switch: SwitchA, Badge: BadgeA, Spinner: SpinnerA, Field: FieldA } = A;

function Beak({ style = "notch", size = 8, offset = 31 }) {
  if (style === "none") return null;
  if (style === "diamond") {
    const w = size * 1.7;
    return (
      <div style={{ position: "absolute", top: -(w * 0.5), right: offset - w / 2, width: w, height: w,
        background: "var(--surface-popover)", transform: "rotate(45deg)", borderRadius: 2,
        boxShadow: "-0.5px -0.5px 0 0 var(--separator)", zIndex: 0 }} />
    );
  }
  /* notch — a clean triangle that merges into the popover top edge */
  return (
    <div style={{ position: "absolute", top: -(size - 1), right: offset - size, width: 0, height: 0,
      borderLeft: `${size}px solid transparent`, borderRight: `${size}px solid transparent`,
      borderBottom: `${size}px solid var(--surface-popover)`,
      filter: "drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.10))", zIndex: 2 }} />
  );
}

function PopoverFrame({ children, beak }) {
  const b = beak || { style: "notch", size: 8, offset: 31 };
  return (
    <div style={{ position: "relative", width: 340 }}>
      <Beak {...b} />
      <div className="hb-step" style={{ position: "relative", zIndex: 1, width: 340, background: "var(--surface-popover)",
        borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-popover)", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

function InnerHead({ title, onBack, step }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 16px", borderBottom: "1px solid var(--separator)" }}>
      {onBack ? (
        <button onClick={onBack} aria-label="Back" style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--label-secondary)", display: "inline-flex", padding: 2, marginLeft: -4, borderRadius: 5 }}>
          <window.Ic name="chevron-left" size={18} />
        </button>
      ) : <img src="../../assets/hostbeam-mark.svg" width="18" height="18" alt="" />}
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--label)" }}>{title}</span>
      <span style={{ marginLeft: "auto" }}><window.StepDots count={3} active={step} /></span>
    </div>
  );
}

/* Welcome hero: the first thing a new user sees is the signature beam —
   it pulses up once, lands (node pop + ring), then rests as the static mark. */
function WelcomeBeam() {
  const [st, setSt] = React.useState("uploading");
  React.useEffect(() => {
    const t1 = setTimeout(() => setSt("landing"), 1350);
    const t2 = setTimeout(() => setSt("idle"), 2050);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return <window.BeamMark size={64} state={st} />;
}

/* Inline manual-add — shown when ~/.ssh/config is empty, or on demand over a
   non-empty list. Mirrors the Preferences Add-host sheet, sized for the popover. */
function ManualAdd({ emptyConfig, onAdd, onSkip }) {
  const [name, setName] = React.useState("");
  const [user, setUser] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [folder, setFolder] = React.useState("/tmp/hostbeam");
  const [test, setTest] = React.useState("idle"); // idle | testing | ok | fail
  const valid = name.trim() && user.trim() && address.trim();
  React.useEffect(() => { setTest("idle"); }, [address, user]);
  const runTest = () => { if (!address.trim() || test === "testing") return; setTest("testing"); window.OB.testHost({ address: address.trim() }).then((r) => setTest(r.ok ? "ok" : "fail")); };
  const add = () => { if (valid) onAdd({ name: name.trim(), user: user.trim(), address: address.trim(), folder: folder.trim() || "/tmp/hostbeam", online: test !== "fail" }); };
  const onKey = (e) => { if (e.key === "Enter" && valid) add(); };
  return (
    <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 13 }} onKeyDown={onKey}>
      {emptyConfig ? (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ flex: "none", width: 30, height: 30, borderRadius: "var(--radius-md)", background: "var(--fill-tertiary)", color: "var(--label-tertiary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><window.Ic name="server" size={16} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--label)" }}>No hosts in your SSH config</div>
            <div style={{ fontSize: 11.5, color: "var(--label-secondary)", lineHeight: 1.45, marginTop: 2 }}>Add one by hand to start beaming — you can change it later.</div>
          </div>
        </div>
      ) : null}
      <FieldA label="Name" placeholder="prod-box" value={name} onChange={(e) => setName(e.target.value)} />
      <div style={{ display: "flex", gap: 9 }}>
        <div style={{ flex: 1, minWidth: 0 }}><FieldA label="User" mono placeholder="dev" value={user} onChange={(e) => setUser(e.target.value)} /></div>
        <div style={{ flex: 1.7, minWidth: 0 }}><FieldA label="Address" mono placeholder="10.4.0.12" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
      </div>
      <FieldA label="Remote folder" mono value={folder} onChange={(e) => setFolder(e.target.value)} />
      <div style={{ display: "flex", alignItems: "center", gap: 9, minHeight: 24 }}>
        <ButtonA variant="secondary" size="sm" disabled={!address.trim() || test === "testing"} onClick={runTest}>
          {test === "testing" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><SpinnerA size={12} /> Testing…</span> : "Test connection"}
        </ButtonA>
        {test === "ok" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--success)", fontWeight: 500 }}><window.Ic name="check" size={14} stroke={2.4} /> Reachable</span> : null}
        {test === "fail" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--danger)", fontWeight: 500 }}><window.Ic name="x" size={14} stroke={2.4} /> Couldn’t connect</span> : null}
        {test === "idle" ? <span style={{ fontSize: 11, color: "var(--label-tertiary)" }}>Optional</span> : null}
      </div>
      <ButtonA variant="primary" size="lg" block disabled={!valid} icon={<window.Ic name="plus" size={15} stroke={2.4} />} onClick={add}>{test === "fail" ? "Add anyway" : "Add host"}</ButtonA>
      <ButtonA variant="ghost" size="sm" block onClick={onSkip}>Skip — choose later</ButtonA>
    </div>
  );
}

function FlowA({ onDone, beak, emptyConfig }) {
  const [step, setStep] = React.useState(0);
  const [hostId, setHostId] = React.useState(null);
  const [manualHost, setManualHost] = React.useState(null); // host typed by hand (no ~/.ssh/config entry)
  const [manualOpen, setManualOpen] = React.useState(false); // "Add manually" form open over a non-empty list
  const [launch, setLaunch] = React.useState(true);
  const [beaming, setBeaming] = React.useState("idle"); // idle | uploading | landing | done (Ready-state beam)
  const doBeam = () => {
    if (window.HBSound) window.HBSound.unlock();
    setBeaming("uploading");
    setTimeout(() => {
      setBeaming("landing");
      try { window.dispatchEvent(new CustomEvent("hb:beamed")); } catch (e) {}
      const cfgNow = window.HB && window.HB.load();
      if (cfgNow && cfgNow.settings && cfgNow.settings.sound && window.HBSound) window.HBSound.beamLanded();
      setTimeout(() => setBeaming("done"), 760);
    }, 1100);
  };
  const [test, setTest] = React.useState("idle"); // idle | testing | ok | fail
  const detected = emptyConfig ? [] : window.OB.detected; // empty when ~/.ssh/config has no hosts
  const host = manualHost || detected.find((h) => h.id === hostId) || null;
  const runTest = () => { setTest("testing"); window.OB.testConnection(hostId).then((r) => setTest(r.ok ? "ok" : "fail")); };

  /* Build a manual host with a unique id (mirrors Preferences' Add-host sheet). */
  const buildManual = ({ name, user, address, folder, online }) => {
    const base = (name || "host").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "host";
    const taken = new Set((window.HB ? window.HB.allHosts() : []).map((h) => h.id));
    let id = base, n = 2; while (taken.has(id)) id = base + "-" + (n++);
    return { id, name, user, address, folder: folder || "/tmp/hostbeam", online, manual: true };
  };

  /* On completion, write the picked host into the shared config so Preferences
     and the menu-bar popover both reflect it (added + set as default). A manual
     host is also persisted into manualHosts + any per-host folder override. */
  const finish = () => {
    if (window.HB && host) {
      const cfg = window.HB.load();
      const isManual = !!manualHost;
      const manualHosts = isManual && !(cfg.manualHosts || []).some((h) => h.id === host.id)
        ? [...(cfg.manualHosts || []), manualHost] : cfg.manualHosts;
      const folders = { ...(cfg.folders || {}) };
      if (isManual && manualHost.folder && manualHost.folder !== cfg.settings.folder) folders[host.id] = manualHost.folder;
      const addedIds = cfg.addedIds.includes(host.id) ? cfg.addedIds : [...cfg.addedIds, host.id];
      window.HB.save({ ...cfg, manualHosts, folders, addedIds, defaultId: host.id, settings: { ...cfg.settings, launch } });
    }
    setStep(3);
  };

  if (step === 0) {
    return (
      <PopoverFrame key={0} beak={beak}>
        <div style={{ padding: "34px 24px 18px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
          <WelcomeBeam />
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--label)", marginTop: 4 }}>Welcome to Hostbeam</div>
          <div style={{ fontSize: 12.5, color: "var(--label-secondary)", maxWidth: 232, lineHeight: 1.5 }}>Beam a clipboard screenshot to a remote host and get a paste-ready path back.</div>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 9, marginTop: 18 }}>
            <ButtonA variant="primary" size="lg" block iconRight={<window.Ic name="arrow-right" size={15} />} onClick={() => setStep(1)}>Get started</ButtonA>
            <ButtonA variant="ghost" size="md" block onClick={onDone}>Skip setup</ButtonA>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 18px" }}><window.StepDots count={3} active={0} /></div>
      </PopoverFrame>
    );
  }

  if (step === 1) {
    const showForm = detected.length === 0 || manualOpen;
    return (
      <PopoverFrame key={1} beak={beak}>
        <InnerHead title={showForm ? "Add a host" : "Choose a host"}
          onBack={() => { if (manualOpen && detected.length) { setManualOpen(false); } else { setStep(0); } }} step={1} />
        {showForm ? (
          <ManualAdd emptyConfig={detected.length === 0}
            onAdd={(spec) => { const h = buildManual(spec); setManualHost(h); setHostId(h.id); setTest("idle"); setStep(2); }}
            onSkip={onDone} />
        ) : (
          <>
            <div style={{ padding: "14px 16px 6px", fontSize: 12, color: "var(--label-secondary)", lineHeight: 1.45 }}>
              Where should screenshots go? <span style={{ color: "var(--label-tertiary)" }}>From your <span style={{ fontFamily: "var(--font-mono)" }}>~/.ssh/config</span>.</span>
            </div>
            <div style={{ padding: "8px 14px 6px", display: "flex", flexDirection: "column", gap: 7 }}>
              {detected.map((h) => (
              <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", border: 0, cursor: "pointer",
                    background: "var(--surface-content)", boxShadow: "inset 0 0 0 0.5px var(--separator)", borderRadius: "var(--radius-lg)", padding: "11px 13px" }} className="obA-host" onClick={() => { setManualHost(null); setHostId(h.id); setTest("idle"); setStep(2); }} key={h.id}>
                  <DotA status={h.id === "edge" ? "offline" : "online"} />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--label)" }}>{h.name}</span>
                    <span style={{ fontSize: 11, color: "var(--label-tertiary)", fontFamily: "var(--font-mono)" }}>{h.address}</span>
                  </span>
                  <window.Ic name="chevron-right" size={16} style={{ color: "var(--label-tertiary)", marginLeft: "auto" }} />
                </div>
              ))}
            </div>
            <div style={{ padding: "4px 16px 2px" }}>
              <button onClick={() => setManualOpen(true)} className="obA-addlink" style={{ display: "inline-flex", alignItems: "center", gap: 5, border: 0, background: "transparent", cursor: "pointer", color: "var(--accent)", fontSize: 12, fontWeight: 500, fontFamily: "var(--font-system)", padding: "4px 2px" }}>
                <window.Ic name="plus" size={13} stroke={2.4} /> Add a host that isn’t listed
              </button>
            </div>
            <div style={{ padding: "4px 16px 16px" }}>
              <ButtonA variant="ghost" size="sm" block onClick={onDone}>Skip — choose later</ButtonA>
            </div>
          </>
        )}
      </PopoverFrame>
    );
  }

  if (step === 2) {
    return (
      <PopoverFrame key={2} beak={beak}>
        <InnerHead title="Almost done" onBack={() => setStep(1)} step={2} />
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "var(--surface-content)", borderRadius: "var(--radius-lg)", boxShadow: "inset 0 0 0 0.5px var(--separator)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 13px" }}>
              <DotA status={host.online === false ? "offline" : "online"} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--label)" }}>{host.name}</span>
                <span style={{ fontSize: 11, color: "var(--label-tertiary)", fontFamily: "var(--font-mono)" }}>{host.folder}</span>
              </div>
              <span style={{ marginLeft: "auto" }}><BadgeA tone="accent">Default</BadgeA></span>
            </div>
            <div style={{ height: 1, background: "var(--separator)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 9, minHeight: 24, padding: "10px 13px",
              background: test === "ok" ? "var(--success-tint)" : test === "fail" ? "var(--danger-tint)" : "transparent",
              transition: "background var(--dur-fast) var(--ease-standard)" }}>
              {test === "idle" && (<>
                <window.Ic name="zap" size={15} style={{ color: "var(--label-tertiary)" }} />
                <span style={{ fontSize: 12, color: "var(--label-secondary)" }}>Test the connection</span>
                <span style={{ marginLeft: "auto" }}><ButtonA variant="secondary" size="sm" onClick={runTest}>Test</ButtonA></span>
              </>)}
              {test === "testing" && (<>
                <SpinnerA size={14} />
                <span style={{ fontSize: 12, color: "var(--label-secondary)" }}>Connecting to {host.name}…</span>
              </>)}
              {test === "ok" && (<>
                <window.Ic name="check" size={15} stroke={2.4} style={{ color: "var(--success)" }} />
                <span style={{ fontSize: 12, color: "var(--label)" }}>Reachable · folder is writable</span>
              </>)}
              {test === "fail" && (<>
                <window.Ic name="x" size={15} stroke={2.4} style={{ color: "var(--danger)" }} />
                <span style={{ fontSize: 12, color: "var(--label)" }}>{host.name} didn’t answer.</span>
                <span style={{ marginLeft: "auto" }}><ButtonA variant="secondary" size="sm" onClick={runTest}>Retry</ButtonA></span>
              </>)}
            </div>
          </div>
          <div style={{ background: "var(--surface-content)", borderRadius: "var(--radius-lg)", boxShadow: "inset 0 0 0 0.5px var(--separator)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 13px" }}>
              <window.Ic name="keyboard" size={16} style={{ color: "var(--label-tertiary)" }} />
              <span style={{ fontSize: 12.5, color: "var(--label)" }}>Global hotkey</span>
              <span style={{ marginLeft: "auto" }}><KeycapA combo={window.OB.hotkey} /></span>
            </div>
            <div style={{ height: 1, background: "var(--separator)", marginLeft: 13 }} />
            <div style={{ display: "flex", alignItems: "center", padding: "12px 13px" }}>
              <SwitchA checked={launch} onChange={setLaunch} label="Launch Hostbeam at login" />
            </div>
          </div>
          <ButtonA variant="primary" size="lg" block icon={<window.Ic name="check" size={15} />} onClick={finish}>Start using Hostbeam</ButtonA>
        </div>
      </PopoverFrame>
    );
  }

  /* step 3 — the real Ready state, with a brief "set up" confirmation */
  return (
    <PopoverFrame key={3} beak={beak}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 16px", borderBottom: "1px solid var(--separator)" }}>
        <img src="../../assets/hostbeam-mark.svg" width="18" height="18" alt="" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--label)" }}>Hostbeam</span>
        <span style={{ marginLeft: "auto" }}><BadgeA tone="success" dot>Set up</BadgeA></span>
      </div>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 13 }}>
        {beaming === "idle" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 13px", background: "var(--surface-content)", borderRadius: "var(--radius-lg)", boxShadow: "inset 0 0 0 0.5px var(--separator)" }}>
              <window.ShotThumb />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--label)" }}>Screenshot on clipboard</span>
                <span style={{ fontSize: 11, color: "var(--label-tertiary)", fontFamily: "var(--font-mono)" }}>PNG · 2560 × 1440</span>
              </div>
              <span style={{ marginLeft: "auto" }}><BadgeA tone="success" dot>Ready</BadgeA></span>
            </div>
            <ButtonA variant="primary" size="lg" block icon={<window.Ic name="upload" size={15} />} onClick={doBeam}>Beam screenshot</ButtonA>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--label-tertiary)", fontSize: 11 }}>
              <span>or press</span><KeycapA combo={window.OB.hotkey} />
            </div>
          </>
        ) : beaming === "done" ? (
          <>
            <div style={{ background: "var(--accent-tint)", boxShadow: "inset 0 0 0 1px var(--separator)", borderRadius: "var(--radius-md)", padding: "10px 11px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <window.Ic name="clipboard" size={13} stroke={2.1} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--label-secondary)" }}>Copied to clipboard</span>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, lineHeight: 1.55, color: "var(--label)", wordBreak: "break-word" }}>
                Use this screenshot: <span style={{ color: "var(--accent)", fontWeight: 600 }}>{host.folder}/2025-06-14-15.30.22.png</span>
              </div>
            </div>
            <ButtonA variant="secondary" size="md" block icon={<window.Ic name="rotate-cw" size={14} />} onClick={() => setBeaming("idle")}>Beam again</ButtonA>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "6px 0 8px" }}>
            <window.BeamMark size={52} state={beaming} />
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--label)", whiteSpace: "nowrap" }}>
              {beaming === "uploading" ? `Beaming to ${host.name}…` : `Beamed to ${host.name}`}
            </div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 16px", borderTop: "1px solid var(--separator)" }}>
        <DotA status="online" />
        <span style={{ fontSize: 12, color: "var(--label)", fontWeight: 500 }}>{host.name}</span>
        <span style={{ fontSize: 11, color: "var(--label-tertiary)", fontFamily: "var(--font-mono)" }}>{host.folder}</span>
      </div>
    </PopoverFrame>
  );
}

Object.assign(window, { FlowA, PopoverFrameA: PopoverFrame });

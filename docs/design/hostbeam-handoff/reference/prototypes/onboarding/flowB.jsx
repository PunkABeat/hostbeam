/* Flow B — Guided "Welcome to Hostbeam" window.
   A proper ~480px first-run window with a left step rail and a live connection
   test. Philosophy: do setup thoroughly once, with confidence it works. */
const B = window.HostbeamDesignSystem_23dc0f;
const { Button: ButtonB, ListRow: ListRowB, StatusDot: DotB, Keycap: KeycapB, Switch: SwitchB, Badge: BadgeB, Spinner: SpinnerB } = B;

const B_STEPS = ["Welcome", "Host", "Test", "Finish"];

function WindowFrame({ children, onSkip }) {
  return (
    <div style={{ width: 480, background: "var(--surface-popover)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-popover)", overflow: "hidden" }}>
      <div style={{ height: 38, display: "flex", alignItems: "center", padding: "0 12px", borderBottom: "1px solid var(--separator)", position: "relative" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c, boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.12)" }} />)}
        </div>
        <span style={{ position: "absolute", left: 0, right: 0, textAlign: "center", fontSize: 12.5, fontWeight: 600, color: "var(--label-secondary)", pointerEvents: "none" }}>Hostbeam Setup</span>
        {onSkip ? <button onClick={onSkip} style={{ marginLeft: "auto", border: 0, background: "transparent", color: "var(--label-tertiary)", fontSize: 11.5, fontWeight: 500, cursor: "pointer", zIndex: 1 }}>Skip</button> : null}
      </div>
      <div style={{ display: "flex", height: 372 }}>{children}</div>
    </div>
  );
}

function StepRail({ step }) {
  return (
    <div style={{ width: 152, flex: "none", background: "var(--surface-sunken)", borderRight: "1px solid var(--separator)", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px 14px" }}>
        <img src="../../assets/hostbeam-mark.svg" width="18" height="18" alt="" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--label)" }}>Hostbeam</span>
      </div>
      {B_STEPS.map((s, i) => {
        const done = i < step, cur = i === step;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 6px", borderRadius: "var(--radius-md)", background: cur ? "var(--accent-tint)" : "transparent" }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600,
              background: done ? "var(--accent)" : cur ? "var(--accent)" : "var(--fill-tertiary)",
              color: (done || cur) ? "#fff" : "var(--label-tertiary)" }}>
              {done ? <window.Ic name="check" size={12} stroke={2.6} /> : i + 1}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: cur ? 600 : 500, color: cur ? "var(--label)" : done ? "var(--label-secondary)" : "var(--label-tertiary)" }}>{s}</span>
          </div>
        );
      })}
    </div>
  );
}

function FlowB({ onDone }) {
  const [step, setStep] = React.useState(0);
  const [hostId, setHostId] = React.useState(null);
  const [test, setTest] = React.useState("idle"); // idle | testing | ok | fail
  const [launch, setLaunch] = React.useState(true);
  const host = window.OB.detected.find((h) => h.id === hostId);

  const runTest = React.useCallback(() => {
    if (!host) return;
    setTest("testing");
    window.OB.testConnection(host.id).then((r) => setTest(r.ok ? "ok" : "fail"));
  }, [host]);

  // Auto-run the test when the Test step opens.
  React.useEffect(() => { if (step === 2 && test === "idle") runTest(); }, [step]); // eslint-disable-line

  const next = () => setStep((s) => Math.min(3, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  let content, canContinue = true, continueLabel = "Continue", onContinue = next;

  if (step === 0) {
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <img src="../../assets/hostbeam-icon.svg" width="56" height="56" alt="" />
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "var(--label)", letterSpacing: "-0.01em" }}>Welcome to Hostbeam</div>
          <div style={{ fontSize: 13, color: "var(--label-secondary)", marginTop: 5, maxWidth: 270, lineHeight: 1.5 }}>Show a remote coding agent a local screenshot without breaking flow. Three things to set up:</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {[["server", "Pick a host", "From your existing SSH config"], ["zap", "Test it", "Confirm we can reach it"], ["keyboard", "Set a hotkey", "Beam from anywhere"]].map(([ic, t, d]) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ width: 32, height: 32, borderRadius: "var(--radius-md)", background: "var(--accent-tint)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}><window.Ic name={ic} size={16} /></span>
              <div><div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--label)" }}>{t}</div><div style={{ fontSize: 11, color: "var(--label-tertiary)" }}>{d}</div></div>
            </div>
          ))}
        </div>
      </div>
    );
    continueLabel = "Get started";
  } else if (step === 1) {
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--label)" }}>Choose your default host</div>
          <div style={{ fontSize: 12, color: "var(--label-secondary)", marginTop: 3 }}>Detected in <span style={{ fontFamily: "var(--font-mono)" }}>~/.ssh/config</span>. You can change it later.</div>
        </div>
        <div style={{ flex: 1, overflow: "auto", border: "1px solid var(--separator)", borderRadius: "var(--radius-lg)", background: "var(--surface-content)" }}>
          {window.OB.detected.map((h) => (
            <ListRowB key={h.id} interactive selected={h.id === hostId} onClick={() => { setHostId(h.id); setTest("idle"); }}
              leading={<DotB status={h.id === "edge" ? "offline" : "online"} />}
              title={h.name} subtitle={`${h.user}@${h.address}`} monoSub
              trailing={h.id === hostId ? <window.Ic name="check" size={16} style={{ color: "var(--accent)" }} stroke={2.4} /> : null} />
          ))}
        </div>
      </div>
    );
    canContinue = !!hostId;
  } else if (step === 2) {
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--label)" }}>Test the connection</div>
          <div style={{ fontSize: 12, color: "var(--label-secondary)", marginTop: 3 }}>Make sure we can reach <b style={{ color: "var(--label)" }}>{host.name}</b> over SSH.</div>
        </div>
        <div style={{ border: "1px solid var(--separator)", borderRadius: "var(--radius-lg)", background: "var(--surface-content)", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          {test === "testing" && (<>
            <SpinnerB size={26} />
            <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--label)" }}>Connecting to {host.name}…</div>
              <div style={{ fontSize: 11, color: "var(--label-tertiary)", fontFamily: "var(--font-mono)", marginTop: 3 }}>{host.user}@{host.address}</div></div>
          </>)}
          {test === "ok" && (<>
            <span style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--success-tint)", color: "var(--success)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><window.Ic name="check" size={24} stroke={2.4} /></span>
            <div><div style={{ fontSize: 14, fontWeight: 600, color: "var(--label)" }}>Connected to {host.name}</div>
              <div style={{ fontSize: 11, color: "var(--label-secondary)", fontFamily: "var(--font-mono)", marginTop: 4 }}>ssh-agent · ed25519</div>
              <div style={{ fontSize: 11, color: "var(--label-tertiary)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{host.folder} is writable</div></div>
          </>)}
          {test === "fail" && (<>
            <span style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--danger-tint)", color: "var(--danger)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><window.Ic name="x" size={24} stroke={2.4} /></span>
            <div><div style={{ fontSize: 14, fontWeight: 600, color: "var(--label)" }}>Couldn't reach {host.name}</div>
              <div style={{ fontSize: 11, color: "var(--danger)", fontFamily: "var(--font-mono)", marginTop: 4 }}>Operation timed out after 10s</div></div>
            <div style={{ display: "flex", gap: 8 }}>
              <ButtonB variant="secondary" size="md" onClick={() => setStep(1)}>Choose another</ButtonB>
              <ButtonB variant="primary" size="md" icon={<window.Ic name="rotate-cw" size={14} />} onClick={runTest}>Retry</ButtonB>
            </div>
          </>)}
        </div>
      </div>
    );
    canContinue = test === "ok";
  } else {
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--label)" }}>You're all set</div>
          <div style={{ fontSize: 12, color: "var(--label-secondary)", marginTop: 3 }}>Copy a screenshot and press your hotkey to beam it.</div>
        </div>
        <div style={{ border: "1px solid var(--separator)", borderRadius: "var(--radius-lg)", background: "var(--surface-content)", overflow: "hidden" }}>
          {[["Host", host.name], ["Remote folder", host.folder], ["Connection", "Verified"]].map(([k, v], i) => (
            <div key={k} style={{ display: "flex", alignItems: "center", padding: "10px 13px", borderTop: i ? "1px solid var(--separator)" : 0 }}>
              <span style={{ fontSize: 12, color: "var(--label-secondary)" }}>{k}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, fontFamily: v === "Verified" ? "var(--font-system)" : "var(--font-mono)", color: "var(--label)", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                {v === "Verified" ? <DotB status="online" /> : null}{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", padding: "10px 13px", borderTop: "1px solid var(--separator)" }}>
            <span style={{ fontSize: 12, color: "var(--label-secondary)" }}>Global hotkey</span>
            <span style={{ marginLeft: "auto" }}><KeycapB combo={window.OB.hotkey} /></span>
          </div>
        </div>
        <SwitchB checked={launch} onChange={setLaunch} label="Launch Hostbeam at login" />
      </div>
    );
    continueLabel = "Start using Hostbeam";
    onContinue = onDone;
  }

  return (
    <WindowFrame onSkip={step < 3 ? onDone : null}>
      <StepRail step={step} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ flex: 1, padding: "20px 22px", overflow: "hidden" }}>{content}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderTop: "1px solid var(--separator)" }}>
          {step > 0 && step < 3 ? <ButtonB variant="ghost" size="md" icon={<window.Ic name="arrow-left" size={14} />} onClick={back}>Back</ButtonB> : <span />}
          <span style={{ marginLeft: "auto" }} />
          <ButtonB variant="primary" size="md" disabled={!canContinue} iconRight={step < 3 ? <window.Ic name="arrow-right" size={14} /> : null} onClick={onContinue}>{continueLabel}</ButtonB>
        </div>
      </div>
    </WindowFrame>
  );
}

window.FlowB = FlowB;

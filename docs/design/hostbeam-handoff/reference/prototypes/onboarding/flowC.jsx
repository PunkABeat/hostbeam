/* Flow C — Single-card, zero-friction onboarding.
   Everything on one calm card: auto-detect hosts, pick one, optional test,
   finish. Philosophy: collapse setup into a single decision, no steps. */
const C = window.HostbeamDesignSystem_23dc0f;
const { Button: ButtonC, ListRow: ListRowC, StatusDot: DotC, Keycap: KeycapC, Switch: SwitchC, Badge: BadgeC, Spinner: SpinnerC } = C;

function CardFrame({ children }) {
  return (
    <div style={{ width: 380, background: "var(--surface-popover)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-popover)", overflow: "hidden" }}>
      {children}
    </div>
  );
}

function FlowC({ onDone }) {
  const [scanning, setScanning] = React.useState(true);
  const [hostId, setHostId] = React.useState(null);
  const [test, setTest] = React.useState("idle"); // idle | testing | ok | fail
  const [launch, setLaunch] = React.useState(true);
  const [done, setDone] = React.useState(false);
  const host = window.OB.detected.find((h) => h.id === hostId);

  React.useEffect(() => { const t = setTimeout(() => setScanning(false), 1100); return () => clearTimeout(t); }, []);

  const sendTest = () => {
    setTest("testing");
    window.OB.testConnection(hostId).then((r) => setTest(r.ok ? "ok" : "fail"));
  };

  if (done) {
    return (
      <CardFrame>
        <div style={{ padding: "26px 22px 22px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 11 }}>
          <span className="ob-pop" style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--success-tint)", color: "var(--success)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><window.Ic name="check" size={26} stroke={2.4} /></span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: "var(--label)" }}>Hostbeam is ready</div>
            <div style={{ fontSize: 12.5, color: "var(--label-secondary)", marginTop: 4 }}>Copy a screenshot and press <span style={{ display: "inline-flex", verticalAlign: "middle" }}><KeycapC combo={window.OB.hotkey} /></span> to beam it to <b style={{ color: "var(--label)" }}>{host.name}</b>.</div>
          </div>
          <ButtonC variant="primary" size="lg" block icon={<window.Ic name="upload" size={15} />} style={{ marginTop: 4 }}>Beam screenshot</ButtonC>
        </div>
      </CardFrame>
    );
  }

  return (
    <CardFrame>
      {/* header */}
      <div style={{ padding: "16px 18px 12px", display: "flex", alignItems: "center", gap: 10 }}>
        <img src="../../assets/hostbeam-icon.svg" width="38" height="38" alt="" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--label)" }}>Set up Hostbeam</div>
          <div style={{ fontSize: 11.5, color: "var(--label-tertiary)" }}>One screen · no account · uses your SSH config</div>
        </div>
        <button onClick={onDone} style={{ border: 0, background: "transparent", color: "var(--label-tertiary)", fontSize: 11.5, fontWeight: 500, cursor: "pointer" }}>Skip</button>
      </div>

      {/* host section */}
      <div style={{ padding: "0 18px" }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--label-tertiary)", marginBottom: 7, display: "flex", alignItems: "center", gap: 6 }}>
          <window.Ic name="server" size={12} />
          {scanning ? "Scanning ~/.ssh/config…" : `Found ${window.OB.detected.length} hosts · pick one`}
        </div>
        <div style={{ border: "1px solid var(--separator)", borderRadius: "var(--radius-lg)", background: "var(--surface-content)", overflow: "hidden" }}>
          {scanning
            ? [0, 1, 2].map((i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderTop: i ? "1px solid var(--separator)" : 0 }}>
                  <span className="ob-shimmer" style={{ width: 8, height: 8, borderRadius: "50%" }} />
                  <span className="ob-shimmer" style={{ width: 90 + i * 20, height: 9, borderRadius: 4 }} />
                  <span className="ob-shimmer" style={{ width: 54, height: 8, borderRadius: 4, marginLeft: "auto" }} />
                </div>
              ))
            : window.OB.detected.map((h) => (
                <ListRowC key={h.id} interactive selected={h.id === hostId} onClick={() => { setHostId(h.id); setTest("idle"); }}
                  leading={
                    <span style={{ width: 16, height: 16, borderRadius: "50%", flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center",
                      boxShadow: h.id === hostId ? "none" : "inset 0 0 0 1.5px var(--border-field)", background: h.id === hostId ? "var(--accent)" : "transparent" }}>
                      {h.id === hostId ? <window.Ic name="check" size={11} stroke={3} style={{ color: "#fff" }} /> : null}
                    </span>}
                  title={h.name} subtitle={`${h.user}@${h.address}`} monoSub
                  trailing={<DotC status={h.id === "edge" ? "offline" : "online"} />} />
              ))}
        </div>
      </div>

      {/* progressive: revealed once a host is chosen */}
      {host ? (
        <div className="ob-reveal" key={hostId} style={{ padding: "12px 18px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* test beam */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: "var(--radius-md)", background: test === "fail" ? "var(--danger-tint)" : test === "ok" ? "var(--success-tint)" : "var(--surface-sunken)" }}>
            {test === "idle" && (<>
              <window.Ic name="zap" size={15} style={{ color: "var(--label-secondary)" }} />
              <span style={{ fontSize: 12, color: "var(--label)" }}>Send a test beam to be sure</span>
              <ButtonC variant="secondary" size="sm" style={{ marginLeft: "auto" }} onClick={sendTest}>Test</ButtonC>
            </>)}
            {test === "testing" && (<>
              <SpinnerC size={14} />
              <span style={{ fontSize: 12, color: "var(--label-secondary)" }}>Beaming a test image to {host.name}…</span>
            </>)}
            {test === "ok" && (<>
              <window.Ic name="check" size={15} stroke={2.4} style={{ color: "var(--success)" }} />
              <span style={{ fontSize: 12, color: "var(--label)" }}>Reached {host.name} — <span style={{ fontFamily: "var(--font-mono)", color: "var(--label-secondary)" }}>{host.folder}</span></span>
            </>)}
            {test === "fail" && (<>
              <window.Ic name="x" size={15} stroke={2.4} style={{ color: "var(--danger)" }} />
              <span style={{ fontSize: 12, color: "var(--label)" }}>{host.name} didn't answer.</span>
              <ButtonC variant="secondary" size="sm" style={{ marginLeft: "auto" }} onClick={sendTest}>Retry</ButtonC>
            </>)}
          </div>
          {/* hotkey + launch */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 1px" }}>
            <window.Ic name="keyboard" size={15} style={{ color: "var(--label-tertiary)" }} />
            <span style={{ fontSize: 12.5, color: "var(--label)" }}>Global hotkey</span>
            <span style={{ marginLeft: "auto" }}><KeycapC combo={window.OB.hotkey} /></span>
          </div>
          <SwitchC checked={launch} onChange={setLaunch} label="Launch Hostbeam at login" />
        </div>
      ) : null}

      {/* footer */}
      <div style={{ padding: "14px 18px 16px" }}>
        <ButtonC variant="primary" size="lg" block disabled={!host} icon={<window.Ic name="check" size={15} />} onClick={() => setDone(true)}>
          {host ? `Finish — beam to ${host.name}` : "Pick a host to continue"}
        </ButtonC>
      </div>
    </CardFrame>
  );
}

window.FlowC = FlowC;

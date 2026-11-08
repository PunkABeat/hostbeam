/* Hostbeam — steady-state menu-bar popover prototype.
   Reads & writes the SAME shared config as Preferences (window.HB / useHBConfig),
   so the default host, hotkey, remote folder, and paste-ready sentence all stay
   in sync across both surfaces. Switching the host here writes it back.
   Handles the empty (no hosts) and failed-upload states, not just the happy path. */
const PV = window.HostbeamDesignSystem_23dc0f;
const { Button: ButtonP, StatusDot: DotP, Badge: BadgeP, Keycap: KeycapP, Spinner: SpinnerP, HostSelect: HostSelectP } = PV;
const IcP = window.Ic;

function baseName(p) { const x = String(p || "").split("/"); return x[x.length - 1] || p; }
function diagIcon(status) {
  if (status === "ok") return <IcP name="check" size={14} stroke={2.5} style={{ color: "var(--success)" }} />;
  if (status === "fail") return <IcP name="x" size={14} stroke={2.5} style={{ color: "var(--danger)" }} />;
  if (status === "warn") return <IcP name="alert-triangle" size={14} stroke={2.1} style={{ color: "var(--warning)" }} />;
  return <IcP name="minus" size={14} stroke={2.2} style={{ color: "var(--label-quaternary)" }} />;
}
function relTime(at) {
  const s = Math.max(0, Math.round((Date.now() - (at || Date.now())) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function Beak() {
  return (
    <div style={{ position: "absolute", top: -7, right: 23, width: 0, height: 0,
      borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
      borderBottom: "8px solid var(--surface-popover)",
      filter: "drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.10))", zIndex: 2 }} />
  );
}

function Frame({ children }) {
  return (
    <div style={{ position: "relative", width: 340 }}>
      <Beak />
      <div className="hb-step" style={{ position: "relative", zIndex: 1, width: 340, background: "var(--surface-popover)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-popover)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 16px", borderBottom: "1px solid var(--separator)" }}>
          <img src="../../assets/hostbeam-mark.svg" width="18" height="18" alt="" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--label)" }}>Hostbeam</span>
          <a href="../preferences/index.html" className="pv-gear" title="Preferences" aria-label="Open Preferences" style={{ marginLeft: "auto", display: "inline-flex", color: "var(--label-tertiary)", padding: 4, borderRadius: "var(--radius-sm)" }}>
            <IcP name="sliders" size={16} />
          </a>
        </div>
        {children}
      </div>
    </div>
  );
}

function Popover({ simResult }) {
  const [cfg, update] = window.useHBConfig();
  const pool = window.HB.allHosts();
  const added = (cfg.addedIds || []).map((id) => pool.find((h) => h.id === id)).filter(Boolean);
  const host = pool.find((h) => h.id === cfg.defaultId) || added[0] || null;
  const s = cfg.settings;

  const [phase, setPhase] = React.useState("idle"); // idle | uploading | landing | done | failed
  const [err, setErr] = React.useState("timeout"); // which BEAM_ERRORS kind, when phase === failed
  const [diag, setDiag] = React.useState(null); // null | "running" | rows[] — inline diagnostics on failure
  const [path, setPath] = React.useState("");
  const [copiedId, setCopiedId] = React.useState(null);
  const recent = cfg.recent || [];

  // reset transient state if the active host changes
  React.useEffect(() => { setPhase("idle"); setPath(""); setDiag(null); }, [host && host.id]);

  // Keyboard path: focus the primary action whenever the beam state changes, so a
  // hotkey-opened popover is fully operable from the keyboard (Enter beams, etc.).
  const contentRef = React.useRef(null);
  React.useEffect(() => {
    const el = contentRef.current && contentRef.current.querySelector("[data-primary]");
    if (!el) return;
    // Defer past the page-load focus reset so the primary action reliably holds focus.
    const id = setTimeout(() => { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }, 60);
    return () => clearTimeout(id);
  }, [phase]);

  // The global hotkey beams the clipboard screenshot from anywhere (idle/done/failed).
  const matchHotkey = (e, keys) => {
    if (!keys || !keys.length) return false;
    const mod = (k) => keys.includes(k);
    if (e.metaKey !== mod("cmd") || e.shiftKey !== mod("shift") || e.altKey !== mod("alt") || e.ctrlKey !== mod("ctrl")) return false;
    const main = keys.find((k) => !["cmd", "shift", "alt", "ctrl"].includes(k));
    return main ? String(e.key).toLowerCase() === String(main).toLowerCase() : true;
  };
  React.useEffect(() => {
    const onKey = (e) => {
      if (!matchHotkey(e, cfg.hotkey)) return;
      e.preventDefault();
      if (host && phase !== "uploading" && phase !== "landing") upload();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cfg.hotkey, phase, host && host.id]);

  const upload = () => {
    if (!host) return;
    setPhase("uploading");
    setDiag(null);
    if (window.HBSound) window.HBSound.unlock();
    // Outcome: a forced simulation (Tweak) wins; otherwise an offline host times out.
    const outcome = (simResult && simResult !== "auto")
      ? (simResult === "permission" ? "perm" : simResult)
      : (host.online === false ? "timeout" : "success");
    setTimeout(() => {
      if (outcome === "success") {
        const folder = (window.HB.folderFor(host.id) || "/tmp/hostbeam").replace(/\/+$/, "");
        const mm = String(10 + Math.floor(Math.random() * 49)).padStart(2, "0");
        const ss = String(Math.floor(Math.random() * 60)).padStart(2, "0");
        const p2 = `${folder}/2025-06-14-15.${mm}.${ss}.png`;
        setPath(p2); setPhase("landing");
        try { window.dispatchEvent(new CustomEvent("hb:beamed")); } catch (e) {}
        if (s.notify) { try { window.dispatchEvent(new CustomEvent("hb:notify", { detail: { hostName: host.name, path: p2 } })); } catch (e) {} }
        if (s.sound && window.HBSound) window.HBSound.beamLanded();
        update((prev) => ({ ...prev, recent: [{ id: "r" + Date.now(), hostId: host.id, hostName: host.name, path: p2, at: Date.now() }, ...(prev.recent || [])].slice(0, 24) }));
        setTimeout(() => setPhase((ph) => (ph === "landing" ? "done" : ph)), 760);
      } else {
        setErr(outcome); setPhase("failed");
      }
    }, 1300);
  };

  const copyEntry = (entry) => {
    const text = (s.sentence || "").includes("{path}") ? (s.sentence || "").split("{path}").join(entry.path) : entry.path;
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {}); } catch (e) {}
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId((c) => (c === entry.id ? null : c)), 1400);
  };
  const clearRecent = () => update((p) => ({ ...p, recent: [] }));

  // copied sentence with the path highlighted
  const tpl = s.sentence || "";
  const parts = tpl.split("{path}");
  const sentenceNodes = parts.flatMap((p, i) =>
    i < parts.length - 1 ? [p, <span key={"x" + i} style={{ color: "var(--accent)", fontWeight: 600 }}>{path}</span>] : [p]);

  // Order for the switcher: default first, then recently-used, then the rest.
  const recentIds = [...new Set((cfg.recent || []).map((r) => r.hostId))];
  const ordered = [];
  const seen = new Set();
  const push = (h) => { if (h && !seen.has(h.id)) { ordered.push(h); seen.add(h.id); } };
  push(added.find((h) => h.id === cfg.defaultId));
  recentIds.forEach((id) => push(added.find((h) => h.id === id)));
  added.forEach(push);
  const opts = ordered.map((h) => ({ id: h.id, name: h.name, address: `${h.user}@${h.address}`, status: h.online === false ? "offline" : "online", isDefault: h.id === cfg.defaultId }));

  /* ---- Empty: no hosts added ---- */
  if (!host) {
    return (
      <Frame>
        <div style={{ padding: "28px 22px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 11 }}>
          <span style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--fill-secondary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <IcP name="server" size={22} style={{ color: "var(--label-tertiary)" }} />
          </span>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--label)" }}>No host yet</div>
          <div style={{ fontSize: 12, color: "var(--label-secondary)", maxWidth: 224, lineHeight: 1.5 }}>Point me at a host and I’ll beam your screenshots there.</div>
          <div style={{ marginTop: 4 }}>
            <ButtonP variant="primary" size="md" icon={<IcP name="plus" size={14} />} onClick={() => { window.location.href = "../preferences/index.html"; }}>Add a host</ButtonP>
          </div>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <div ref={contentRef} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 13px", background: "var(--surface-content)", borderRadius: "var(--radius-lg)", boxShadow: "inset 0 0 0 0.5px var(--separator)" }}>
          <window.ShotThumb />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--label)", whiteSpace: "nowrap" }}>Screenshot on clipboard</span>
            <span style={{ fontSize: 11, color: "var(--label-tertiary)", fontFamily: "var(--font-mono)" }}>PNG · 2560 × 1440</span>
          </div>
          <span style={{ marginLeft: "auto" }}><BadgeP tone={(phase === "done" || phase === "landing") ? "accent" : "success"} dot>{(phase === "done" || phase === "landing") ? "Beamed" : "Ready"}</BadgeP></span>
        </div>

        {phase === "idle" ? (
          <>
            <ButtonP variant="primary" size="lg" block data-primary icon={<IcP name="upload" size={15} />} onClick={upload}>Beam screenshot</ButtonP>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "nowrap", color: "var(--label-tertiary)", fontSize: 11 }}>
              <span style={{ whiteSpace: "nowrap" }}>or press</span><KeycapP keys={cfg.hotkey} />
            </div>
          </>
        ) : null}

        {phase === "uploading" || phase === "landing" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "4px 0 2px" }}>
            <window.BeamMark size={58} state={phase} />
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--label)", whiteSpace: "nowrap" }}>
              {phase === "uploading" ? `Beaming to ${host.name}…` : `Beamed to ${host.name}`}
            </div>
            <div style={{ width: "100%", height: 4, borderRadius: 3, background: "var(--fill-tertiary)", overflow: "hidden" }}>
              <div className={"bm-bar" + (phase === "landing" ? " done" : "")} />
            </div>
          </div>
        ) : null}

        {phase === "done" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "var(--accent-tint)", boxShadow: "inset 0 0 0 1px var(--separator)", borderRadius: "var(--radius-md)", padding: "10px 11px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <IcP name="clipboard" size={13} stroke={2.1} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--label-secondary)" }}>{s.copySentence ? "Copied to clipboard" : "Uploaded — remote path"}</span>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, lineHeight: 1.55, color: "var(--label)", wordBreak: "break-word" }}>
                {s.copySentence ? sentenceNodes : <span style={{ color: "var(--accent)", fontWeight: 600 }}>{path}</span>}
              </div>
            </div>
            <ButtonP variant="secondary" size="md" block data-primary icon={<IcP name="rotate-cw" size={14} />} onClick={() => { setPhase("idle"); setPath(""); }}>Beam again</ButtonP>
          </div>
        ) : null}

        {phase === "failed" ? (() => {
          const e = window.OB.BEAM_ERRORS[err] || window.OB.BEAM_ERRORS.timeout;
          const folder = (window.HB.folderFor(host.id) || "/tmp/hostbeam").replace(/\/+$/, "");
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ background: "var(--danger-tint)", boxShadow: "inset 0 0 0 1px var(--separator)", borderRadius: "var(--radius-md)", padding: "10px 11px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <IcP name={e.icon} size={14} stroke={2.4} style={{ color: "var(--danger)", flex: "none" }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--label)" }}>{e.title(host)}</span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--label-secondary)", wordBreak: "break-word" }}>{e.detail(host, folder)}</div>
                {e.hint ? <div style={{ fontSize: 11.5, color: "var(--label-tertiary)", marginTop: 6, lineHeight: 1.45 }}>{e.hint}</div> : null}
              </div>
              <div style={{ display: "flex", gap: 9 }}>
                {e.recover.includes("retry") ? <ButtonP variant="primary" size="md" block data-primary icon={<IcP name="rotate-cw" size={14} />} onClick={upload}>Try again</ButtonP> : null}
                {e.recover.includes("folder") ? <ButtonP variant="secondary" size="md" block icon={<IcP name="folder" size={14} />} onClick={() => { window.location.href = "../preferences/index.html"; }}>Change folder</ButtonP> : null}
              </div>
              {e.recover.includes("diag") ? (
                diag === null ? (
                  <button onClick={() => { setDiag("running"); window.OB.runDiagnostics(host.id).then(setDiag); }}
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", height: 30, border: 0, cursor: "pointer", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--label-secondary)", fontSize: 12, fontWeight: 500, fontFamily: "var(--font-system)", boxShadow: "inset 0 0 0 0.5px var(--separator)" }}>
                    <IcP name="activity" size={14} /> Run diagnostics
                  </button>
                ) : (
                  <div style={{ background: "var(--surface-content)", boxShadow: "inset 0 0 0 0.5px var(--separator)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                    {diag === "running" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 12px" }}>
                        <SpinnerP size={14} /><span style={{ fontSize: 12, color: "var(--label-secondary)" }}>Running checks…</span>
                      </div>
                    ) : diag.map((r, i) => (
                      <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderTop: i ? "1px solid var(--separator)" : 0 }}>
                        <span style={{ flex: "none", display: "inline-flex", width: 14 }}>{diagIcon(r.status)}</span>
                        <span style={{ fontSize: 12, color: r.status === "skip" ? "var(--label-tertiary)" : "var(--label)" }}>{r.label}</span>
                        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--label-tertiary)", textAlign: "right", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.detail}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : null}
              {e.recover.includes("switch") ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, whiteSpace: "nowrap", color: "var(--label-tertiary)", fontSize: 11 }}>
                  <IcP name="arrow-down" size={12} stroke={2.2} /> or switch host below
                </div>
              ) : null}
            </div>
          );
        })() : null}
      </div>

      {/* recent beams */}
      {recent.length ? (
        <div style={{ padding: "4px 10px 8px", borderTop: "1px solid var(--separator)" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "6px 4px 4px" }}>
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--label-tertiary)" }}>Recent</span>
            <button onClick={clearRecent} style={{ marginLeft: "auto", border: 0, background: "transparent", cursor: "pointer", fontSize: 11, color: "var(--label-tertiary)", padding: "2px 4px", borderRadius: "var(--radius-xs)" }}>Clear</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {recent.slice(0, 3).map((e) => {
              const copied = copiedId === e.id;
              return (
                <div key={e.id} className="pv-recent" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 6px", borderRadius: "var(--radius-md)" }}>
                  <window.ShotThumb w={38} h={26} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flex: 1 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--label)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{baseName(e.path)}</span>
                    <span style={{ fontSize: 10.5, color: "var(--label-tertiary)" }}>{e.hostName} · {relTime(e.at)}</span>
                  </div>
                  <button onClick={() => copyEntry(e)} title="Copy paste-ready sentence" aria-label={`Copy paste-ready sentence for ${baseName(e.path)}`}
                    style={{ flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, border: 0, cursor: "pointer", borderRadius: "var(--radius-sm)", background: "transparent", color: copied ? "var(--success)" : "var(--label-tertiary)" }}>
                    <IcP name={copied ? "check" : "clipboard"} size={14} stroke={copied ? 2.6 : 2} />
                  </button>
                </div>
              );
            })}
          </div>
          {recent.length > 3 ? (
            <a href="../preferences/index.html#recent" className="pv-morelink" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, textDecoration: "none", padding: "7px 4px 3px", fontSize: 11, color: "var(--label-tertiary)" }}>
              +{recent.length - 3} more in Preferences
            </a>
          ) : null}
        </div>
      ) : null}

      {/* footer — host switcher, writes the default back to the shared store */}
      <div style={{ padding: "10px 14px 14px", borderTop: "1px solid var(--separator)" }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--label-tertiary)", margin: "0 2px 6px" }}>Beam to</div>
        <HostSelectP className="pv-upward" hosts={opts} value={cfg.defaultId} onChange={(id) => update({ defaultId: id })} />
      </div>
    </Frame>
  );
}

window.Popover = Popover;

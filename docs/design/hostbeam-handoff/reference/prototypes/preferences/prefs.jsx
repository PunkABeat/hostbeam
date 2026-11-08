/* Hostbeam — Preferences window prototype.
   Compact macOS settings window: General / Hosts / Hotkey / About.
   Reuses the design system + ../onboarding/shared.jsx (Ic, OB data). */
const P = window.HostbeamDesignSystem_23dc0f;
const { Button, Switch, Field, StatusDot, Badge, Keycap, Spinner } = P;
const Ic = window.Ic;
const OB = window.OB;

/* Relative time ("just now", "6m ago", …) — shared across panes. */
function relTime(at) {
  const s = Math.max(0, Math.round((Date.now() - (at || Date.now())) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
const baseName = (p) => { const x = String(p || "").split("/"); return x[x.length - 1] || p; };

/* --- macOS settings group + row -------------------------------------- */
function Group({ title, children, footnote }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {title ? <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--label-tertiary)", margin: "0 0 7px 2px" }}>{title}</div> : null}
      <div style={{ background: "var(--surface-content)", borderRadius: "var(--radius-lg)", boxShadow: "inset 0 0 0 0.5px var(--separator)", overflow: "hidden" }}>{children}</div>
      {footnote ? <div style={{ fontSize: 11, color: "var(--label-tertiary)", margin: "7px 2px 0", lineHeight: 1.45 }}>{footnote}</div> : null}
    </div>
  );
}
function Row({ children, first, align = "center" }) {
  return <div style={{ display: "flex", alignItems: align, gap: 12, padding: "11px 14px", borderTop: first ? 0 : "1px solid var(--separator)" }}>{children}</div>;
}
function Label({ title, sub }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
      <span style={{ fontSize: 13, color: "var(--label)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
      {sub ? <span style={{ fontSize: 11, color: "var(--label-tertiary)" }}>{sub}</span> : null}
    </div>
  );
}

/* --- Live hotkey recorder (captures real keystrokes) ----------------- */
function HotkeyRecorder({ value, onChange }) {
  const [rec, setRec] = React.useState(false);
  React.useEffect(() => {
    if (!rec) return;
    const onKey = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (e.key === "Escape") { setRec(false); return; }
      if (["Meta", "Control", "Alt", "Shift"].includes(e.key)) return;
      const mods = [];
      if (e.metaKey) mods.push("cmd");
      if (e.ctrlKey) mods.push("ctrl");
      if (e.altKey) mods.push("opt");
      if (e.shiftKey) mods.push("shift");
      const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", Enter: "enter", " ": "space", Tab: "tab" };
      const key = map[e.key] || (e.key.length === 1 ? e.key.toUpperCase() : e.key);
      onChange([...mods, key]);
      setRec(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [rec]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginLeft: "auto" }}>
      <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 96, height: 28, padding: "0 10px",
        borderRadius: "var(--radius-md)", background: rec ? "var(--accent-tint)" : "var(--surface-sunken)",
        boxShadow: rec ? "inset 0 0 0 1px var(--accent)" : "inset 0 0 0 1px var(--border-field)",
        transition: "box-shadow var(--dur-fast) var(--ease-standard), background var(--dur-fast) var(--ease-standard)" }}>
        {rec ? <span style={{ fontSize: 11.5, color: "var(--accent)", fontWeight: 500 }}>Press a shortcut…</span> : <Keycap keys={value} />}
      </div>
      <Button variant={rec ? "secondary" : "secondary"} size="sm" onClick={() => setRec((r) => !r)}>{rec ? "Cancel" : "Record"}</Button>
    </div>
  );
}

/* --- Panes ----------------------------------------------------------- */
/* --- Paste-ready sentence editor (live preview) ---------------------- */
function SentenceEditor({ s, set, recent }) {
  const taRef = React.useRef(null);
  const tpl = s.sentence || "";
  const folder = (s.folder || "/tmp/hostbeam").replace(/\/+$/, "");
  // Prefer the path from the most recent real beam so the preview is concrete;
  // fall back to a representative example when nothing has been beamed yet.
  const last = (recent && recent[0]) || null;
  const example = last ? last.path : `${folder}/2025-06-14-15.30.22.png`;
  const hasPath = tpl.includes("{path}");
  const disabled = !s.copySentence;

  const insertPath = () => {
    const el = taRef.current;
    if (!el) { set("sentence", (tpl + (tpl && !/\s$/.test(tpl) ? " " : "") + "{path}")); return; }
    const a = el.selectionStart, b = el.selectionEnd;
    const next = tpl.slice(0, a) + "{path}" + tpl.slice(b);
    set("sentence", next);
    requestAnimationFrame(() => { el.focus(); const p = a + 6; el.setSelectionRange(p, p); });
  };

  // preview: substitute {path} with the example path, highlighted
  const parts = tpl.split("{path}");
  const preview = parts.flatMap((p, i) =>
    i < parts.length - 1
      ? [p, <span key={"p" + i} style={{ color: "var(--accent)", fontWeight: 600 }}>{example}</span>]
      : [p]);

  return (
    <Group title="Paste-ready sentence"
      footnote={<>The text copied to your clipboard after each beam. <span style={{ fontFamily: "var(--font-mono)" }}>{"{path}"}</span> is replaced with the screenshot’s remote path.</>}>
      <Row first>
        <Label title="Copy a sentence after beaming" sub="Ready to paste into your remote coding agent" />
        <span style={{ marginLeft: "auto" }}><Switch checked={s.copySentence} onChange={(v) => set("copySentence", v)} /></span>
      </Row>
      <div style={{ borderTop: "1px solid var(--separator)", padding: "12px 14px", opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto", transition: "opacity var(--dur-fast) var(--ease-standard)" }}>
        <textarea ref={taRef} value={tpl} onChange={(e) => set("sentence", e.target.value)} rows={2} spellCheck={false}
          placeholder="Use this screenshot: {path}"
          style={{ width: "100%", boxSizing: "border-box", resize: "none", border: 0, outline: "none", borderRadius: "var(--radius-md)",
            background: "var(--surface-sunken)", boxShadow: "inset 0 0 0 1px var(--border-field)",
            padding: "8px 10px", fontFamily: "var(--font-mono)", fontSize: 12.5, lineHeight: 1.55, color: "var(--label)" }}
          onFocus={(e) => { e.target.style.boxShadow = "inset 0 0 0 1px var(--accent), var(--ring-focus)"; }}
          onBlur={(e) => { e.target.style.boxShadow = "inset 0 0 0 1px var(--border-field)"; }} />

        <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 9 }}>
          <button onClick={insertPath}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 24, padding: "0 9px 0 7px", border: 0, cursor: "pointer",
              borderRadius: "var(--radius-sm)", background: "var(--fill-secondary)", color: "var(--label-secondary)", fontSize: 11.5, fontWeight: 500 }}>
            <Ic name="plus" size={12} stroke={2.4} /><span style={{ fontFamily: "var(--font-mono)" }}>{"{path}"}</span>
          </button>
          {!hasPath ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--warning)" }}>
              <Ic name="info" size={12} stroke={2.2} /> Add {"{path}"} so the location is included
            </span>
          ) : null}
          <span style={{ marginLeft: "auto" }}>
            <Button variant="ghost" size="sm" onClick={() => set("sentence", "Use this screenshot: {path}")}>Reset</Button>
          </span>
        </div>

        <div style={{ marginTop: 13 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--label-tertiary)", marginBottom: 5, display: "flex", alignItems: "center", gap: 6 }}>
            <span>Preview</span>
            {last ? <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500, color: "var(--label-quaternary)" }}>from your last beam to {last.hostName}</span> : null}
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 9, background: "var(--accent-tint)", boxShadow: "inset 0 0 0 1px var(--separator)", borderRadius: "var(--radius-md)", padding: "10px 11px" }}>
            <Ic name="clipboard" size={14} stroke={2} style={{ color: "var(--accent)", flex: "none", marginTop: 1 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.55, color: "var(--label)", wordBreak: "break-word" }}>
              {tpl.trim() ? preview : <span style={{ color: "var(--label-tertiary)" }}>Nothing will be copied.</span>}
            </span>
          </div>
        </div>
      </div>
    </Group>
  );
}

function GeneralPane({ s, set, recent }) {
  return (
    <div>
      <Group title="Startup">
        <Row first><Label title="Launch Hostbeam at login" /><span style={{ marginLeft: "auto" }}><Switch checked={s.launch} onChange={(v) => set("launch", v)} /></span></Row>
        <Row><Label title="Show icon in the menu bar" /><span style={{ marginLeft: "auto" }}><Switch checked={s.menubar} onChange={(v) => set("menubar", v)} /></span></Row>
      </Group>
      <Group title="Beaming" footnote="When on, triggering Hostbeam with a default host set beams immediately — no picker.">
        <Row first><Label title="Beam immediately when triggered" sub="Skip the host picker if a default exists" /><span style={{ marginLeft: "auto" }}><Switch checked={s.immediate} onChange={(v) => set("immediate", v)} /></span></Row>
        <Row><Label title="Notify on success" /><span style={{ marginLeft: "auto" }}><Switch checked={s.notify} onChange={(v) => set("notify", v)} /></span></Row>
      </Group>
      <SentenceEditor s={s} set={set} recent={recent} />
      <Group title="Default remote folder" footnote="Where screenshots land on each host. You can override it per host under Hosts.">
        <Row first><Ic name="folder" size={16} style={{ color: "var(--label-tertiary)" }} /><div style={{ flex: 1, marginLeft: -2 }}><Field mono value={s.folder} onChange={(e) => set("folder", e.target.value)} /></div></Row>
      </Group>
    </div>
  );
}

/* --- Autocomplete: search & add a host from ~/.ssh/config ------------ */
function HostSearch({ pool, onAdd }) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const ref = React.useRef(null);
  const listRef = React.useRef(null);

  const norm = q.trim().toLowerCase();
  const results = pool.filter((h) => `${h.name} ${h.user}@${h.address}`.toLowerCase().includes(norm));

  React.useEffect(() => { setActive(0); }, [q, open]);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  React.useEffect(() => {
    const el = listRef.current?.children[active];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [active]);

  const add = (h) => { if (!h) return; onAdd(h.id); setQ(""); setOpen(false); };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); add(results[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, height: 32, padding: "0 10px",
        borderRadius: "var(--radius-md)", background: "var(--surface-content)",
        boxShadow: open ? "inset 0 0 0 1px var(--accent), var(--ring-focus)" : "inset 0 0 0 1px var(--border-field)",
        transition: "box-shadow var(--dur-fast) var(--ease-standard)" }}>
        <Ic name="search" size={14} stroke={2.1} style={{ color: "var(--label-tertiary)" }} />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
          role="combobox" aria-expanded={open} aria-autocomplete="list" aria-label="Search SSH config to add a host"
          placeholder="Search ~/.ssh/config to add a host…"
          style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: "transparent", fontFamily: "inherit", fontSize: 13, color: "var(--label)" }} />
        {q ? (
          <button onClick={() => { setQ(""); }} title="Clear" aria-label="Clear search" style={{ border: 0, background: "transparent", cursor: "pointer", display: "inline-flex", padding: 2, color: "var(--label-tertiary)" }}>
            <Ic name="x" size={13} stroke={2.3} />
          </button>
        ) : null}
      </div>

      {open ? (
        <div role="listbox" aria-label="Matching hosts" style={{ position: "absolute", top: "calc(100% + 5px)", left: 0, right: 0, zIndex: 50,
          background: "var(--surface-raised)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-menu)",
          padding: 4, maxHeight: 232, overflow: "auto" }} ref={listRef}>
          {results.length === 0 ? (
            <div style={{ padding: "11px 10px", fontSize: 12.5, color: "var(--label-tertiary)", textAlign: "center" }}>
              {pool.length === 0 ? "Every host in your config is already added." : "No matching hosts in ~/.ssh/config."}
            </div>
          ) : results.map((h, i) => {
            const on = i === active;
            return (
              <button key={h.id} role="option" aria-selected={on} onMouseEnter={() => setActive(i)} onClick={() => add(h)}
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left", border: 0, cursor: "pointer",
                  padding: "8px 9px", borderRadius: "var(--radius-sm)", background: on ? "var(--accent)" : "transparent", color: on ? "#fff" : "var(--label)" }}>
                <StatusDot status={h.online ? "online" : "offline"} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{h.name}</span>
                <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11.5, color: on ? "rgba(255,255,255,.8)" : "var(--label-tertiary)" }}>{h.user}@{h.address}</span>
                <Ic name="plus" size={14} stroke={2.3} style={{ color: on ? "#fff" : "var(--label-quaternary)" }} />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function HostsPane({ pool, configCount, addedIds, addHost, removeHost, addManual, onDiagnose, selectedId, setSelected, defaultId, setDefault, tests, runTest, folders, defaultFolder, setFolder, clearFolder, moveHost, renameHost, recent }) {
  const added = addedIds.map((id) => pool.find((h) => h.id === id)).filter(Boolean);
  const available = pool.filter((h) => !addedIds.includes(h.id));
  const sel = added.find((h) => h.id === selectedId) || added[0] || null;
  const t = sel ? (tests[sel.id] || "idle") : "idle";
  const manualCount = added.filter((h) => h.manual).length;
  const overridden = !!(sel && folders && Object.prototype.hasOwnProperty.call(folders, sel.id));
  const effFolder = sel ? (overridden ? folders[sel.id] : defaultFolder) : defaultFolder;
  const lastBeam = sel && recent ? recent.find((r) => r.hostId === sel.id) : null;

  return (
    <div>
      <Group title="In Hostbeam" footnote="These hosts appear in the menu-bar popover. Keys and passphrases are never stored.">
        {added.length === 0 ? (
          <div style={{ padding: "22px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--label-secondary)" }}>No host yet</div>
            <div style={{ fontSize: 11.5, color: "var(--label-tertiary)", marginTop: 3 }}>Search your SSH config below, or add one manually.</div>
          </div>
        ) : added.map((h, i) => {
          const isSel = sel && h.id === sel.id;
          return (
            <div key={h.id} className="pf-row" style={{ display: "flex", alignItems: "center", borderTop: i ? "1px solid var(--separator)" : 0, background: isSel ? "var(--accent-tint)" : undefined }}>
              <button onClick={() => setSelected(h.id)} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, border: 0, background: "transparent", cursor: "pointer", textAlign: "left", padding: "11px 4px 11px 14px" }}>
                <StatusDot status={h.online === false ? "offline" : "online"} />
                <Label title={h.name} sub={`${h.user}@${h.address}`} />
                <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {h.manual ? <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--label-tertiary)", border: "1px solid var(--separator)", borderRadius: "var(--radius-xs)", padding: "1px 5px" }}>Manual</span> : null}
                  {h.id === defaultId ? <Badge tone="accent">Default</Badge> : null}
                </span>
              </button>
              {added.length > 1 ? (
                <span style={{ display: "inline-flex", flexDirection: "column", flex: "none", marginRight: 2 }}>
                  <button onClick={() => moveHost(h.id, -1)} disabled={i === 0} title="Move up" aria-label={`Move ${h.name} up`}
                    className="pf-reorder" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 16, border: 0, background: "transparent", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "var(--label-quaternary)" : "var(--label-tertiary)", opacity: i === 0 ? 0.4 : 1, padding: 0 }}>
                    <Ic name="chevron-up" size={13} stroke={2.4} />
                  </button>
                  <button onClick={() => moveHost(h.id, 1)} disabled={i === added.length - 1} title="Move down" aria-label={`Move ${h.name} down`}
                    className="pf-reorder" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 16, border: 0, background: "transparent", cursor: i === added.length - 1 ? "default" : "pointer", color: i === added.length - 1 ? "var(--label-quaternary)" : "var(--label-tertiary)", opacity: i === added.length - 1 ? 0.4 : 1, padding: 0 }}>
                    <Ic name="chevron-down" size={13} stroke={2.4} />
                  </button>
                </span>
              ) : null}
              <button onClick={() => removeHost(h.id)} title={`Remove ${h.name}`} aria-label={`Remove ${h.name}`}
                style={{ flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, marginRight: 8, border: 0, cursor: "pointer",
                  borderRadius: "var(--radius-md)", background: "transparent", color: "var(--label-tertiary)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--fill-tertiary)"; e.currentTarget.style.color = "var(--danger)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--label-tertiary)"; }}>
                <Ic name="minus" size={15} stroke={2.4} />
              </button>
            </div>
          );
        })}
      </Group>

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", margin: "0 2px 7px" }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--label-tertiary)" }}>Add a host</span>
          <button onClick={addManual} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, border: 0, background: "transparent", cursor: "pointer", color: "var(--accent)", fontSize: 12, fontWeight: 500, padding: 2 }}>
            <Ic name="plus" size={13} stroke={2.4} /> Add manually
          </button>
        </div>
        <HostSearch pool={available} onAdd={addHost} />
        <div style={{ fontSize: 11, color: "var(--label-tertiary)", margin: "7px 2px 0", lineHeight: 1.45 }}>
          {configCount} in <span style={{ fontFamily: "var(--font-mono)" }}>~/.ssh/config</span> · {added.length} added{manualCount ? ` · ${manualCount} manual` : ""}{available.length === 0 ? " · all added" : ""}.
        </div>
      </div>

      {sel ? (
        <>
          <Group title={`${sel.name} — details`}>
            <Row first>
              <Label title="Name" sub={sel.manual ? "Editable — added manually" : "From your ~/.ssh/config"} />
              {sel.manual ? (
                <span style={{ marginLeft: "auto", width: 190 }}><Field value={sel.name} onChange={(e) => renameHost(sel.id, e.target.value)} /></span>
              ) : (
                <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--label)", fontWeight: 500 }}>{sel.name}</span>
              )}
            </Row>
            <Row><Label title="Address" /><span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--label)" }}>{sel.user}@{sel.address}</span></Row>
            <Row><Label title="Last beamed" /><span style={{ marginLeft: "auto", fontSize: 12.5, color: lastBeam ? "var(--label)" : "var(--label-tertiary)" }}>{lastBeam ? relTime(lastBeam.at) : "Never"}</span></Row>
            <div style={{ padding: "11px 14px", borderTop: "1px solid var(--separator)", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <Label title="Remote folder" sub={overridden ? "Set just for this host" : "Using the default"} />
                {overridden ? <span style={{ marginLeft: "auto" }}><Button variant="ghost" size="sm" onClick={() => clearFolder(sel.id)}>Use default</Button></span> : null}
              </div>
              <Field mono value={effFolder} placeholder={defaultFolder} onChange={(e) => setFolder(sel.id, e.target.value)} />
            </div>
            <Row>
              <Label title="Connection" />
              <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 9 }}>
                {t === "testing" && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--label-secondary)" }}><Spinner size={13} /> Testing…</span>}
                {t === "ok" && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--success)", fontWeight: 500 }}><Ic name="check" size={14} stroke={2.4} /> Reachable</span>}
                {t === "fail" && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--danger)", fontWeight: 500 }}><Ic name="x" size={14} stroke={2.4} /> Unreachable</span>}
                <Button variant="secondary" size="sm" onClick={() => runTest(sel.id)} disabled={t === "testing"}>{t === "idle" ? "Test" : "Re-test"}</Button>
              </span>
            </Row>
          </Group>

          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <Button variant="primary" size="md" disabled={sel.id === defaultId} onClick={() => setDefault(sel.id)}>
              {sel.id === defaultId ? "Default host" : "Set as default"}
            </Button>
            <Button variant="secondary" size="md" icon={<Ic name="activity" size={14} />} onClick={() => onDiagnose(sel.id)}>Diagnostics</Button>
            <Button variant="ghost" size="md" icon={<Ic name="terminal" size={14} />}>Open in Terminal</Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function HotkeyPane({ hotkey, setHotkey, s, set }) {
  const conflict = OB.hotkeyConflict(hotkey);
  return (
    <div>
      <Group title="Global hotkey" footnote={conflict ? undefined : "Press this shortcut from any app to beam the clipboard screenshot."}>
        <Row first><Ic name="keyboard" size={16} style={{ color: "var(--label-tertiary)" }} /><Label title="Beam shortcut" /><HotkeyRecorder value={hotkey} onChange={setHotkey} /></Row>
        {conflict ? (
          <Row>
            <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--warning)" }}>
              <Ic name="alert-triangle" size={15} stroke={2.1} style={{ flex: "none" }} />
              <span style={{ fontSize: 12, color: "var(--label)" }}>This conflicts with <b style={{ fontWeight: 600 }}>{conflict}</b>. Pick another shortcut.</span>
            </span>
          </Row>
        ) : null}
      </Group>
      <Group title="Feedback">
        <Row first><Label title="Play a sound when a beam lands" /><span style={{ marginLeft: "auto" }}><Switch checked={s.sound} onChange={(v) => set("sound", v)} /></span></Row>
        <Row><Label title="Flash the menu-bar icon" /><span style={{ marginLeft: "auto" }}><Switch checked={s.flash} onChange={(v) => set("flash", v)} /></span></Row>
      </Group>
    </div>
  );
}

function AboutPane({ onReset }) {
  const [confirm, setConfirm] = React.useState(false);
  const [upd, setUpd] = React.useState("idle"); // idle | checking | latest
  React.useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 3000);
    return () => clearTimeout(t);
  }, [confirm]);
  const checkUpdate = () => { if (upd === "checking") return; setUpd("checking"); setTimeout(() => setUpd("latest"), 1400); };
  const Link = ({ children }) => (
    <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "var(--accent)", textDecoration: "none", fontSize: 12 }}
      onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}>{children}</a>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "18px 0 8px", gap: 9 }}>
      <img src="../../assets/hostbeam-icon.svg" width="72" height="72" alt="" />
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "var(--label)" }}>Hostbeam</div>
        <div style={{ fontSize: 12, color: "var(--label-secondary)", marginTop: 2, fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>Version 0.1.0 (build 47)</div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--label-secondary)", maxWidth: 320, lineHeight: 1.5 }}>A small menu-bar utility for beaming a clipboard screenshot to a remote SSH host and getting a paste-ready path back.</div>

      {/* update check */}
      <div style={{ minHeight: 30, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
        {upd === "idle" ? (
          <Button variant="secondary" size="sm" icon={<Ic name="rotate-cw" size={13} />} onClick={checkUpdate}>Check for updates</Button>
        ) : upd === "checking" ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--label-secondary)" }}><Spinner size={13} /> Checking…</span>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--success)", fontWeight: 500 }}><Ic name="check" size={14} stroke={2.4} /> You’re on the latest version</span>
        )}
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--label-secondary)" }}>
        <Ic name="lock" size={12.5} stroke={2} style={{ color: "var(--label-tertiary)", flex: "none" }} />
        <span>Nothing leaves your Mac except the screenshot you beam.</span>
      </div>

      {/* links */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 4, color: "var(--label-quaternary)", fontSize: 12 }}>
        <Link>Website</Link><span>·</span><Link>Source</Link><span>·</span><Link>Privacy</Link><span>·</span><Link>Licenses</Link>
      </div>
      <div style={{ marginTop: 4 }}><Button variant="ghost" size="sm" icon={<Ic name="bell" size={13} />}>Send feedback</Button></div>

      <div style={{ fontSize: 11, color: "var(--label-tertiary)", marginTop: 8 }}>“Hostbeam” is a provisional name, pending clearance.</div>
      <button
        onClick={() => { if (confirm) { onReset(); setConfirm(false); } else { setConfirm(true); } }}
        style={{ marginTop: 4, border: 0, background: "transparent", cursor: "pointer", fontSize: 11.5, fontWeight: 500, padding: "4px 8px", borderRadius: "var(--radius-sm)", color: confirm ? "var(--danger)" : "var(--label-tertiary)" }}>
        {confirm ? "Click again to reset everything" : "Reset to defaults…"}
      </button>
    </div>
  );
}

/* --- Modal sheet shell ----------------------------------------------- */
function Sheet({ title, onClose, children, footer, width = 384 }) {
  const cardRef = React.useRef(null);
  React.useEffect(() => {
    const opener = document.activeElement;
    const card = cardRef.current;
    // autofocus the first field (or the dialog itself for read-only sheets)
    const first = card && (card.querySelector("input, textarea") || card);
    if (first && first.focus) first.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "Tab" && card) {
        const els = [...card.querySelectorAll('input, textarea, button, a[href], [tabindex]:not([tabindex="-1"])')]
          .filter((el) => !el.disabled && el.offsetParent !== null);
        if (!els.length) return;
        const firstEl = els[0], lastEl = els[els.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      if (opener && opener.focus) opener.focus(); // restore focus to the trigger
    };
  }, []);
  return (
    <div onMouseDown={onClose} style={{ position: "absolute", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 70, background: "rgba(0,0,0,0.18)" }}>
      <div ref={cardRef} className="pf-sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onMouseDown={(e) => e.stopPropagation()} style={{ width, background: "var(--surface-popover)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-popover)", overflow: "hidden", maxHeight: "calc(100% - 110px)", display: "flex", flexDirection: "column", outline: "none" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "13px 14px", borderBottom: "1px solid var(--separator)", flex: "none" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--label)", whiteSpace: "nowrap" }}>{title}</span>
          <button onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", border: 0, background: "transparent", cursor: "pointer", color: "var(--label-tertiary)", display: "inline-flex", padding: 3, borderRadius: "var(--radius-sm)" }}>
            <Ic name="x" size={15} stroke={2.2} />
          </button>
        </div>
        <div style={{ padding: 16, overflow: "auto" }}>{children}</div>
        {footer ? <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", padding: "12px 14px", borderTop: "1px solid var(--separator)", background: "var(--surface-sunken)", flex: "none" }}>{footer}</div> : null}
      </div>
    </div>
  );
}

/* --- Add a host manually --------------------------------------------- */
function AddHostSheet({ existing, defaultFolder, onClose, onSave }) {
  const [name, setName] = React.useState("");
  const [user, setUser] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [folder, setFolder] = React.useState(defaultFolder || "/tmp/hostbeam");
  const [test, setTest] = React.useState("idle"); // idle | testing | ok | fail
  const nameTaken = existing.some((h) => h.name.toLowerCase() === name.trim().toLowerCase());
  const valid = name.trim() && user.trim() && address.trim() && !nameTaken;

  // a fresh address invalidates a prior test result
  React.useEffect(() => { setTest("idle"); }, [address, user]);

  const runTest = () => {
    if (!address.trim() || test === "testing") return;
    setTest("testing");
    window.OB.testHost({ address: address.trim() }).then((r) => setTest(r.ok ? "ok" : "fail"));
  };
  const save = () => { if (valid) onSave({ name: name.trim(), user: user.trim(), address: address.trim(), folder: folder.trim() || "/tmp/hostbeam", online: test !== "fail" }); };
  const onKey = (e) => { if (e.key === "Enter" && valid) save(); };

  return (
    <Sheet title="Add a host" onClose={onClose}
      footer={<><Button variant="ghost" size="md" onClick={onClose}>Cancel</Button><Button variant="primary" size="md" disabled={!valid} onClick={save}>{test === "fail" ? "Add anyway" : "Add host"}</Button></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }} onKeyDown={onKey}>
        <Field label="Name" placeholder="prod-box" value={name} onChange={(e) => setName(e.target.value)} invalid={!!nameTaken} help={nameTaken ? "A host with this name already exists." : undefined} />
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}><Field label="User" mono placeholder="dev" value={user} onChange={(e) => setUser(e.target.value)} /></div>
          <div style={{ flex: 2, minWidth: 0 }}><Field label="Address" mono placeholder="10.4.0.12 or host.example.com" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        </div>
        <Field label="Remote folder" mono value={folder} onChange={(e) => setFolder(e.target.value)} />

        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 2 }}>
          <Button variant="secondary" size="sm" disabled={!address.trim() || test === "testing"} onClick={runTest}>
            {test === "testing" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Spinner size={12} /> Testing…</span> : "Test connection"}
          </Button>
          {test === "ok" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--success)", fontWeight: 500, whiteSpace: "nowrap" }}><Ic name="check" size={14} stroke={2.4} /> Reachable</span> : null}
          {test === "fail" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--danger)", fontWeight: 500, whiteSpace: "nowrap" }}><Ic name="x" size={14} stroke={2.4} /> Couldn’t connect</span> : null}
          {test === "idle" ? <span style={{ fontSize: 11.5, color: "var(--label-tertiary)" }}>Optional — check before adding</span> : null}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--label-tertiary)" }}>Connects as <span style={{ fontFamily: "var(--font-mono)", color: "var(--label-secondary)" }}>{(user.trim() || "user")}@{(address.trim() || "address")}</span></div>
      </div>
    </Sheet>
  );
}

/* --- Host diagnostics ------------------------------------------------ */
function DiagRow({ label, status, detail, first }) {
  const icon = status === "ok" ? <Ic name="check" size={15} stroke={2.5} style={{ color: "var(--success)" }} />
    : status === "fail" ? <Ic name="x" size={15} stroke={2.5} style={{ color: "var(--danger)" }} />
    : status === "warn" ? <Ic name="alert-triangle" size={15} stroke={2.1} style={{ color: "var(--warning)" }} />
    : <Ic name="minus" size={15} stroke={2.2} style={{ color: "var(--label-quaternary)" }} />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderTop: first ? 0 : "1px solid var(--separator)" }}>
      <span style={{ flex: "none", display: "inline-flex", width: 16 }}>{icon}</span>
      <span style={{ fontSize: 12.5, color: status === "skip" ? "var(--label-tertiary)" : "var(--label)" }}>{label}</span>
      <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--label-tertiary)", textAlign: "right" }}>{detail}</span>
    </div>
  );
}
function DiagnosticsSheet({ host, onClose }) {
  const [rows, setRows] = React.useState(null);
  const run = React.useCallback(() => { setRows(null); OB.runDiagnostics(host && host.id).then(setRows); }, [host && host.id]);
  React.useEffect(() => { run(); }, [run]);
  const overall = rows ? (rows.some((r) => r.status === "fail") ? "fail" : rows.some((r) => r.status === "warn") ? "warn" : "ok") : "run";
  const summary = { run: { c: "var(--label-secondary)", t: "Running checks…" }, ok: { c: "var(--success)", t: "All checks passed" }, warn: { c: "var(--warning)", t: "Reachable with warnings" }, fail: { c: "var(--danger)", t: "Host unreachable" } }[overall];
  return (
    <Sheet title={`Diagnostics — ${host ? host.name : ""}`} onClose={onClose} width={400}
      footer={<><Button variant="ghost" size="md" onClick={onClose}>Close</Button><Button variant="secondary" size="md" icon={<Ic name="rotate-cw" size={13} />} disabled={!rows} onClick={run}>Run again</Button></>}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}>
        {overall === "run" ? <Spinner size={16} /> : <Ic name={overall === "ok" ? "check-circle" : overall === "warn" ? "alert-triangle" : "x"} size={18} stroke={2.2} style={{ color: summary.c }} />}
        <span style={{ fontSize: 13.5, fontWeight: 600, color: summary.c }}>{summary.t}</span>
        {host ? <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--label-tertiary)" }}>{host.user}@{host.address}</span> : null}
      </div>
      <div style={{ background: "var(--surface-content)", borderRadius: "var(--radius-lg)", boxShadow: "inset 0 0 0 0.5px var(--separator)", overflow: "hidden" }}>
        {(rows || [{ label: "SSH reachable" }, { label: "Authentication" }, { label: "Remote folder writable" }, { label: "Round-trip latency" }]).map((r, i) => (
          <DiagRow key={r.label} first={i === 0} label={r.label} status={rows ? r.status : "run"} detail={rows ? r.detail : <Spinner size={12} />} />
        ))}
      </div>
    </Sheet>
  );
}

/* --- Recent beams: full history (the popover shows only the last few) --- */
function RecentPane({ recent, sentence, onRemove, onClear }) {
  const [copiedId, setCopiedId] = React.useState(null);
  const list = recent || [];
  const copy = (e) => {
    const text = (sentence || "").includes("{path}") ? (sentence || "").split("{path}").join(e.path) : e.path;
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {}); } catch (err) {}
    setCopiedId(e.id); setTimeout(() => setCopiedId((c) => (c === e.id ? null : c)), 1400);
  };

  if (!list.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "64px 20px", gap: 9 }}>
        <span style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--fill-secondary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Ic name="clock" size={22} style={{ color: "var(--label-tertiary)" }} />
        </span>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--label)" }}>Nothing beamed yet</div>
        <div style={{ fontSize: 12, color: "var(--label-secondary)", maxWidth: 260, lineHeight: 1.5 }}>Beams you send show up here, ready to copy again.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", margin: "0 2px 7px" }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--label-tertiary)", whiteSpace: "nowrap" }}>{list.length} beam{list.length === 1 ? "" : "s"}</span>
        <button onClick={onClear} style={{ marginLeft: "auto", border: 0, background: "transparent", cursor: "pointer", color: "var(--accent)", fontSize: 12, fontWeight: 500, padding: 2 }}>Clear all</button>
      </div>
      <div style={{ background: "var(--surface-content)", borderRadius: "var(--radius-lg)", boxShadow: "inset 0 0 0 0.5px var(--separator)", overflow: "hidden" }}>
        {list.map((e, i) => {
          const copied = copiedId === e.id;
          return (
            <div key={e.id} className="pf-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px 10px 14px", borderTop: i ? "1px solid var(--separator)" : 0 }}>
              <window.ShotThumb w={42} h={28} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--label)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{baseName(e.path)}</span>
                <span style={{ fontSize: 11, color: "var(--label-tertiary)" }}>{e.hostName} · {relTime(e.at)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: "auto", flex: "none" }}>
                <button onClick={() => copy(e)} title="Copy paste-ready sentence" aria-label={`Copy sentence for ${baseName(e.path)}`}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: 0, cursor: "pointer", borderRadius: "var(--radius-md)", background: "transparent", color: copied ? "var(--success)" : "var(--label-tertiary)" }}>
                  <Ic name={copied ? "check" : "clipboard"} size={15} stroke={copied ? 2.6 : 2} />
                </button>
                <button onClick={() => onRemove(e.id)} title="Remove from history" aria-label={`Remove ${baseName(e.path)}`}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: 0, cursor: "pointer", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--label-tertiary)" }}>
                  <Ic name="x" size={14} stroke={2.2} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "var(--label-tertiary)", margin: "7px 2px 0", lineHeight: 1.45 }}>The last {list.length} screenshot{list.length === 1 ? "" : "s"} you beamed. Copy re-uses your paste-ready sentence; nothing is re-sent.</div>
    </div>
  );
}

/* --- Ventura-style sidebar nav --------------------------------------- */
const NAV = [
  { id: "general", label: "General", icon: "sliders",  tile: "#8E8E93" },
  { id: "hosts",   label: "Hosts",   icon: "server",   tile: "var(--accent)" },
  { id: "hotkey",  label: "Hotkey",  icon: "keyboard", tile: "#5E5CE6" },
  { id: "recent",  label: "Recent",  icon: "clock",    tile: "#34C759" },
  { id: "about",   label: "About",   icon: "info",     tile: "#30B0C7", appIcon: true },
];

/* Rounded colored icon tile, white glyph — the Ventura signature. */
function NavTile({ item }) {
  if (item.appIcon) {
    return <img src="../../assets/hostbeam-icon.svg" width="22" height="22" alt="" style={{ borderRadius: 5, flex: "none", boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.12)" }} />;
  }
  return (
    <span style={{ width: 22, height: 22, borderRadius: 5, flex: "none", background: item.tile,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.10), 0 0.5px 1px rgba(0,0,0,.10)" }}>
      <Ic name={item.icon} size={13.5} stroke={2.1} style={{ color: "#fff" }} />
    </span>
  );
}

function Sidebar({ tab, setTab }) {
  const [q, setQ] = React.useState("");
  const items = NAV.filter((n) => n.label.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <aside style={{ width: 218, flex: "none", display: "flex", flexDirection: "column", background: "var(--surface-sunken)", borderRight: "1px solid var(--separator)" }}>
      {/* traffic lights live over the sidebar in Ventura */}
      <div style={{ height: 38, flex: "none", display: "flex", alignItems: "center", padding: "0 13px" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c, boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.12)" }} />)}
        </div>
      </div>
      {/* search */}
      <div style={{ padding: "2px 12px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, height: 26, padding: "0 8px", borderRadius: "var(--radius-md)", background: "var(--fill-secondary)" }}>
          <Ic name="search" size={13} stroke={2.1} style={{ color: "var(--label-tertiary)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search settings"
            style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: "transparent", fontFamily: "inherit", fontSize: 12.5, color: "var(--label)" }} />
        </div>
      </div>
      {/* nav list */}
      <nav aria-label="Settings sections" style={{ flex: 1, overflow: "auto", padding: "0 10px 12px", display: "flex", flexDirection: "column", gap: 1 }}>
        {items.map((n, i) => {
          const sel = n.id === tab;
          const onNavKey = (e) => {
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            e.preventDefault();
            const ni = e.key === "ArrowDown" ? Math.min(i + 1, items.length - 1) : Math.max(i - 1, 0);
            setTab(items[ni].id);
            const btns = e.currentTarget.parentElement.querySelectorAll("[data-navitem]");
            if (btns[ni]) btns[ni].focus();
          };
          return (
            <button key={n.id} data-navitem onClick={() => setTab(n.id)} onKeyDown={onNavKey} aria-current={sel ? "page" : undefined} className={"pf-nav-item" + (sel ? " is-sel" : "")}
              style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left", border: 0, cursor: "pointer",
                padding: "5px 8px", borderRadius: "var(--radius-md)", background: sel ? "var(--accent)" : "transparent" }}>
              <NavTile item={n} />
              <span style={{ fontSize: 13, fontWeight: 400, color: sel ? "#fff" : "var(--label)" }}>{n.label}</span>
            </button>
          );
        })}
        {items.length === 0 ? <div style={{ fontSize: 12, color: "var(--label-tertiary)", padding: "8px 9px" }}>No results</div> : null}
      </nav>
    </aside>
  );
}

/* --- Window ----------------------------------------------------------- */
function PrefsApp() {
  const [tab, setTab] = React.useState(() => {
    const h = (window.location.hash || "").replace("#", "");
    return NAV.some((n) => n.id === h) ? h : "general";
  });
  const [cfg, update] = useHBConfig();
  const s = cfg.settings;
  const set = (k, v) => update((p) => ({ ...p, settings: { ...p.settings, [k]: v } }));
  const addedIds = cfg.addedIds || [];
  const defaultId = cfg.defaultId;
  const hotkey = cfg.hotkey;
  const setDefault = (id) => update({ defaultId: id });
  const setHotkey = (keys) => update({ hotkey: keys });

  const pool = window.HB.allHosts();
  const configCount = (OB.sshConfig || []).length;
  const folders = cfg.folders || {};
  const setFolder = (id, val) => update((p) => ({ ...p, folders: { ...(p.folders || {}), [id]: val } }));
  const clearFolder = (id) => update((p) => { const f = { ...(p.folders || {}) }; delete f[id]; return { ...p, folders: f }; });
  const [selectedId, setSelectedId] = React.useState(addedIds[0] || null);
  const [tests, setTests] = React.useState({});
  const [sheet, setSheet] = React.useState(null); // {type:'add'} | {type:'diag', hostId}

  // keep selection valid as the added list changes
  React.useEffect(() => {
    if (!addedIds.includes(selectedId)) setSelectedId(addedIds[0] || null);
  }, [addedIds.join(",")]);

  const addHost = (id) => { update((p) => ({ ...p, addedIds: p.addedIds.includes(id) ? p.addedIds : [...p.addedIds, id] })); setSelectedId(id); };
  const moveHost = (id, dir) => update((p) => {
    const ids = [...p.addedIds];
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return p;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    return { ...p, addedIds: ids };
  });
  const renameHost = (id, name) => update((p) => ({
    ...p,
    manualHosts: (p.manualHosts || []).map((h) => (h.id === id ? { ...h, name } : h)),
  }));
  const removeHost = (id) => update((p) => {
    const next = p.addedIds.filter((x) => x !== id);
    const isManual = (p.manualHosts || []).some((h) => h.id === id);
    const folders = { ...(p.folders || {}) };
    delete folders[id]; // drop any per-host folder override so a later re-add starts clean
    return {
      ...p,
      addedIds: next,
      // a manually-added host is forgotten entirely — it isn't in ~/.ssh/config to re-find,
      // so leaving it in the pool would wrongly resurface it in the config autocomplete.
      manualHosts: isManual ? (p.manualHosts || []).filter((h) => h.id !== id) : p.manualHosts,
      folders,
      defaultId: p.defaultId === id ? (next[0] || null) : p.defaultId,
    };
  });
  const addManualHost = ({ name, user, address, folder, online }) => {
    const base = (name || "host").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "host";
    const taken = new Set(pool.map((h) => h.id));
    let id = base, n = 2;
    while (taken.has(id)) id = `${base}-${n++}`;
    const host = { id, name, user, address, online: online !== false, manual: true };
    update((p) => {
      const nextFolders = { ...(p.folders || {}) };
      if (folder && folder !== p.settings.folder) nextFolders[id] = folder;
      return { ...p, manualHosts: [...(p.manualHosts || []), host], addedIds: [...p.addedIds, id], folders: nextFolders };
    });
    setSelectedId(id); setSheet(null);
  };

  const runTest = (id) => {
    setTests((p) => ({ ...p, [id]: "testing" }));
    OB.testConnection(id).then((r) => setTests((p) => ({ ...p, [id]: r.ok ? "ok" : "fail" })));
  };

  const current = NAV.find((n) => n.id === tab);

  return (
    <div style={{ position: "relative", width: 720, height: 552, background: "var(--surface-content)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-popover)", overflow: "hidden", display: "flex" }}>
      <Sidebar tab={tab} setTab={setTab} />
      {/* content column */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--window)" }}>
        {/* draggable toolbar region, mirrors traffic-light height */}
        <div style={{ height: 38, flex: "none" }} />
        <div key={tab} className="pf-pane" style={{ flex: 1, overflow: "auto", padding: "0 30px 28px" }}>
          {tab !== "about" ? (
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--label)", margin: "0 0 20px", letterSpacing: "-0.01em" }}>{current.label}</h1>
          ) : null}
          {tab === "general" && <GeneralPane s={s} set={set} recent={cfg.recent} />}
          {tab === "hosts" && <HostsPane pool={pool} configCount={configCount} addedIds={addedIds} addHost={addHost} removeHost={removeHost} addManual={() => setSheet({ type: "add" })} onDiagnose={(id) => setSheet({ type: "diag", hostId: id })} selectedId={selectedId} setSelected={setSelectedId} defaultId={defaultId} setDefault={setDefault} tests={tests} runTest={runTest} folders={folders} defaultFolder={s.folder} setFolder={setFolder} clearFolder={clearFolder} moveHost={moveHost} renameHost={renameHost} recent={cfg.recent} />}
          {tab === "hotkey" && <HotkeyPane hotkey={hotkey} setHotkey={setHotkey} s={s} set={set} />}
          {tab === "recent" && <RecentPane recent={cfg.recent} sentence={s.sentence} onRemove={(id) => update((p) => ({ ...p, recent: (p.recent || []).filter((r) => r.id !== id) }))} onClear={() => update((p) => ({ ...p, recent: [] }))} />}
          {tab === "about" && <AboutPane onReset={() => { update(JSON.parse(JSON.stringify(window.HB.DEFAULTS))); setSelectedId(window.HB.DEFAULTS.addedIds[0] || null); setSheet(null); }} />}
        </div>
      </main>

      {sheet && sheet.type === "add" ? <AddHostSheet existing={pool} defaultFolder={s.folder} onClose={() => setSheet(null)} onSave={addManualHost} /> : null}
      {sheet && sheet.type === "diag" ? <DiagnosticsSheet host={pool.find((h) => h.id === sheet.hostId) || null} onClose={() => setSheet(null)} /> : null}
    </div>
  );
}

window.PrefsApp = PrefsApp;

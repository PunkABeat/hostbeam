/* Hostbeam onboarding prototype — shared data, helpers, inline icons, chrome.
   Consumes the design system via window.HostbeamDesignSystem_23dc0f. */

/* --- Mock data: hosts "found in ~/.ssh/config" -------------------------- */
window.OB = {
  detected: [
    { id: "prod",  name: "prod-box",  address: "10.4.0.12", user: "dev",   folder: "/tmp/hostbeam" },
    { id: "stg",   name: "staging",   address: "10.4.0.30", user: "deploy", folder: "/tmp/hostbeam" },
    { id: "dev",   name: "dev-box",   address: "10.4.0.88", user: "dev",   folder: "/tmp/hostbeam" },
    { id: "edge",  name: "edge-eu",   address: "fra1.dev",  user: "ci",    folder: "/tmp/hostbeam" },
  ],
  /* Fuller ~/.ssh/config pool — the universe Preferences searches to add hosts.
     `detected` (above) stays as the onboarding subset; do not change it. */
  sshConfig: [
    { id: "prod",      name: "prod-box",    address: "10.4.0.12",  user: "dev",    folder: "/tmp/hostbeam", online: true },
    { id: "stg",       name: "staging",     address: "10.4.0.30",  user: "deploy", folder: "/tmp/hostbeam", online: true },
    { id: "dev",       name: "dev-box",     address: "10.4.0.88",  user: "dev",    folder: "/tmp/hostbeam", online: true },
    { id: "edge",      name: "edge-eu",     address: "fra1.dev",   user: "ci",     folder: "/tmp/hostbeam", online: false },
    { id: "gpu",       name: "gpu-trainer", address: "10.8.1.5",   user: "ml",     folder: "/tmp/hostbeam", online: true },
    { id: "db",        name: "db-replica",  address: "10.4.2.7",   user: "admin",  folder: "/tmp/hostbeam", online: true },
    { id: "bastion",   name: "bastion",     address: "bastion.corp", user: "ops",  folder: "/tmp/hostbeam", online: true },
    { id: "sandbox",   name: "sandbox",     address: "10.9.0.3",   user: "dev",    folder: "/tmp/hostbeam", online: true },
    { id: "ci-runner", name: "ci-runner",   address: "10.4.0.51",  user: "ci",     folder: "/tmp/hostbeam", online: true },
    { id: "old-vps",   name: "old-vps",     address: "vps.legacy", user: "root",   folder: "/tmp/hostbeam", online: false },
  ],
  hotkey: "cmd shift 7",
  /* Mock async connection test. A host is reachable unless its `online` flag is
     explicitly false (edge-eu / old-vps fail); manual hosts default to online.
     Looks across the ssh-config pool + any manually-added hosts. */
  testConnection(hostId) {
    const pool = (window.HB ? window.HB.allHosts() : (this.sshConfig || []));
    const host = pool.find((h) => h.id === hostId);
    const ok = host ? host.online !== false : hostId !== "edge";
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(ok
          ? { ok: true, detail: "ssh-agent · ed25519 · /tmp/hostbeam writable" }
          : { ok: false, error: "Operation timed out after 10s" });
      }, 1300);
    });
  },
  /* Multi-step diagnostics for the host details + About sheet. */
  runDiagnostics(hostId) {
    const host = window.HB ? window.HB.hostById(hostId) : (this.sshConfig || []).find((h) => h.id === hostId);
    const reachable = host ? host.online !== false : true;
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!reachable) {
          resolve([
            { label: "SSH reachable", status: "fail", detail: "Operation timed out after 10s" },
            { label: "Authentication", status: "skip", detail: "Skipped" },
            { label: "Remote folder writable", status: "skip", detail: "Skipped" },
            { label: "Round-trip latency", status: "skip", detail: "Skipped" },
          ]);
          return;
        }
        const ms = 28 + Math.floor(Math.random() * 70);
        resolve([
          { label: "SSH reachable", status: "ok", detail: host ? `${host.user}@${host.address}` : "connected" },
          { label: "Authentication", status: "ok", detail: "ssh-agent · ed25519" },
          { label: "Remote folder writable", status: "ok", detail: (window.HB ? window.HB.folderFor(hostId) : (host ? host.folder : "/tmp/hostbeam")) },
          { label: "Round-trip latency", status: ms > 75 ? "warn" : "ok", detail: `${ms} ms` },
        ]);
      }, 1400);
    });
  },
  /* Shortcuts macOS reserves — used to warn during hotkey recording. */
  SYSTEM_SHORTCUTS: [
    { keys: ["cmd", "shift", "3"], name: "Screenshot (whole screen)" },
    { keys: ["cmd", "shift", "4"], name: "Screenshot (selection)" },
    { keys: ["cmd", "shift", "5"], name: "Screenshot toolbar" },
    { keys: ["cmd", "space"], name: "Spotlight" },
    { keys: ["cmd", "tab"], name: "App switcher" },
    { keys: ["cmd", "q"], name: "Quit app" },
    { keys: ["cmd", "w"], name: "Close window" },
    { keys: ["ctrl", "up"], name: "Mission Control" },
  ],
  hotkeyConflict(keys) {
    const norm = (a) => (a || []).map((x) => String(x).toLowerCase()).sort().join("+");
    const t = norm(keys);
    const hit = this.SYSTEM_SHORTCUTS.find((sc) => norm(sc.keys) === t);
    return hit ? hit.name : null;
  },
  /* Reachability test for a host spec that isn't saved yet (Add-host sheet).
     Fails on empty/invalid-looking addresses so typos are caught up front. */
  testHost(spec) {
    const a = String((spec && spec.address) || "").trim().toLowerCase();
    const bad = !a || /\s/.test(a) || /(invalid|unknown|nope|timeout|\.example$|192\.0\.2\.)/.test(a);
    return new Promise((resolve) => {
      setTimeout(() => resolve(bad
        ? { ok: false, error: "Operation timed out after 10s" }
        : { ok: true, detail: "ssh-agent · ed25519 · reachable" }), 1200);
    });
  },
};

/* --- Beam error taxonomy — each failure has its own calm one-line message
   (Beam voice), a technical detail line (mono), an optional recovery hint, and
   which recovery actions the surface should offer. Shared so Preferences and
   the popover speak the same language. --------------------------------------- */
window.OB.BEAM_ERRORS = {
  timeout: {
    icon: "x",
    title: (h) => `${h.name} didn’t answer.`,
    detail: () => "Operation timed out after 10s",
    hint: null,
    recover: ["retry", "diag", "switch"],
  },
  auth: {
    icon: "lock",
    title: (h) => `${h.name} refused the key.`,
    detail: () => "Permission denied (publickey)",
    hint: "Add your key with ssh-add, then beam again.",
    recover: ["retry", "diag"],
  },
  perm: {
    icon: "folder",
    title: () => "Remote folder isn’t writable.",
    detail: (h, folder) => `mkdir ${folder}: permission denied`,
    hint: "Pick another folder in Preferences.",
    recover: ["retry", "diag", "folder"],
  },
};

/* --- Shared, persisted config: the one source of truth that both the
   Preferences window and the menu-bar popover read & write. ---------------- */
window.HB = (function () {
  const KEY = "hostbeam.config.v1";
  const DEFAULTS = {
    addedIds: ["prod", "stg", "dev"],
    defaultId: "prod",
    manualHosts: [],   // hosts the user typed in (not from ~/.ssh/config)
    folders: {},       // per-host remote-folder overrides, keyed by host id
    recent: [          // last few beamed screenshots (most-recent first)
      { id: "r-seed-1", hostId: "prod", hostName: "prod-box", path: "/tmp/hostbeam/2025-06-14-15.12.04.png", at: Date.now() - 1000 * 60 * 6 },
      { id: "r-seed-2", hostId: "stg", hostName: "staging", path: "/tmp/hostbeam/2025-06-14-14.48.51.png", at: Date.now() - 1000 * 60 * 52 },
    ],
    settings: {
      launch: true, menubar: true, immediate: true, copySentence: true, notify: true,
      folder: "/tmp/hostbeam", sentence: "Use this screenshot: {path}", sound: false, flash: true,
    },
    hotkey: ["cmd", "shift", "7"],
  };
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULTS));
      const p = JSON.parse(raw);
      return { ...DEFAULTS, ...p, settings: { ...DEFAULTS.settings, ...(p.settings || {}) } };
    } catch (e) { return JSON.parse(JSON.stringify(DEFAULTS)); }
  }
  function save(cfg) {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("hb:config", { detail: cfg })); } catch (e) {}
  }
  function allHosts() {
    const cfg = load();
    const config = (window.OB && window.OB.sshConfig) || [];
    return [...config, ...(cfg.manualHosts || [])];
  }
  function hostById(id) { return allHosts().find((h) => h.id === id) || null; }
  /* Effective remote folder for a host: its override, else the global default. */
  function folderFor(id) {
    const cfg = load();
    return (cfg.folders && cfg.folders[id]) || cfg.settings.folder;
  }
  return { KEY, DEFAULTS, load, save, allHosts, hostById, folderFor };
})();

/* React hook: live-subscribed config + an updater that persists & broadcasts.
   Same-tab updates arrive via the 'hb:config' event; cross-tab via 'storage'. */
function useHBConfig() {
  const [cfg, setCfg] = React.useState(window.HB.load);
  React.useEffect(() => {
    const onLocal = (e) => setCfg(e.detail);
    const onStorage = (e) => { if (e.key === window.HB.KEY) setCfg(window.HB.load()); };
    window.addEventListener("hb:config", onLocal);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener("hb:config", onLocal); window.removeEventListener("storage", onStorage); };
  }, []);
  const update = React.useCallback((patch) => {
    setCfg((prev) => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      window.HB.save(next);
      return next;
    });
  }, []);
  return [cfg, update];
}
window.useHBConfig = useHBConfig;

/* --- Inline SVG icons (avoids Lucide/React re-render conflicts) ---------- */
const OB_ICONS = {
  "arrow-right": <><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>,
  "arrow-left": <><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></>,
  "arrow-down": <><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></>,
  "chevron-right": <path d="m9 18 6-6-6-6"/>,
  "chevron-left": <path d="m15 18-6-6 6-6"/>,
  "chevron-up": <path d="m18 15-6-6-6 6"/>,
  "chevron-down": <path d="m6 9 6 6 6-6"/>,
  check: <path d="M20 6 9 17l-5-5"/>,
  "check-circle": <><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></>,
  x: <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
  plus: <><path d="M5 12h14"/><path d="M12 5v14"/></>,
  minus: <path d="M5 12h14"/>,
  server: <><rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h0"/><path d="M7 16.5h0"/></>,
  keyboard: <><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h0M10 10h0M14 10h0M18 10h0M8 14h8"/></>,
  folder: <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>,
  upload: <><path d="M12 19V6"/><path d="m6 12 6-6 6 6"/></>,
  zap: <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/>,
  "rotate-cw": <><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
  terminal: <><path d="m4 17 6-6-6-6"/><path d="M12 19h8"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h0"/></>,
  sliders: <><path d="M4 6h8"/><path d="M16 6h4"/><circle cx="14" cy="6" r="2"/><path d="M4 12h4"/><path d="M12 12h8"/><circle cx="10" cy="12" r="2"/><path d="M4 18h10"/><path d="M18 18h2"/><circle cx="16" cy="18" r="2"/></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></>,
  clipboard: <><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></>,
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 1.6"/></>,
  "alert-triangle": <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
};
function Ic({ name, size = 16, stroke = 2, style, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={{ display: "inline-block", verticalAlign: "middle", flex: "none", ...style }}>
      {OB_ICONS[name] || null}
    </svg>
  );
}

/* --- Screenshot thumbnail placeholder ----------------------------------- */
function ShotThumb({ tint = "#cdd6e6", w = 44, h = 30 }) {
  return (
    <span style={{ width: w, height: h, borderRadius: "var(--radius-sm)", flex: "none", background: tint,
      boxShadow: "inset 0 0 0 0.5px var(--separator)", position: "relative", overflow: "hidden", display: "inline-block" }}>
      <span style={{ position: "absolute", top: 4, left: 4, display: "flex", gap: 2 }}>
        {[0.18, 0.12, 0.12].map((o, i) => <span key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: `rgba(0,0,0,${o})` }} />)}
      </span>
      <span style={{ position: "absolute", left: 4, right: 4, bottom: 4, height: h * 0.42, borderRadius: 2, background: "rgba(0,0,0,.07)" }} />
    </span>
  );
}

/* --- Animated brand mark (the beam) — the product's one expressive motion.
   state: "uploading" (slices pulse up the beam), "landing" (node pops + ring
   blooms once), or "idle" (static logo). CSS keyframes live in each shell's
   index.html, gated behind prefers-reduced-motion. --------------------------- */
function BeamMark({ size = 58, state = "uploading" }) {
  const cls = "bm" + (state === "uploading" ? " bm-uploading" : state === "landing" ? " bm-landing" : "");
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" fill="none" className={cls}
      style={{ filter: "drop-shadow(0 6px 14px rgba(25,48,110,.28))" }} aria-hidden="true">
      <defs><linearGradient id="bm-g" x1="512" y1="64" x2="512" y2="960" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#5A95FF" /><stop offset="1" stopColor="#2A66EC" /></linearGradient></defs>
      <rect width="1024" height="1024" rx="232" fill="url(#bm-g)" />
      <rect width="1024" height="512" rx="232" fill="#fff" opacity="0.07" />
      <circle className="bm-ring" cx="512" cy="250" r="56" fill="none" stroke="#fff" strokeWidth="16" />
      <circle className="bm-el bm-node" cx="512" cy="250" r="50" fill="#fff" style={{ animationDelay: ".36s" }} />
      <path className="bm-el" d="M462 362 H562" stroke="#fff" strokeWidth="46" strokeLinecap="round" style={{ animationDelay: ".24s" }} />
      <path className="bm-el" d="M430 454 H594" stroke="#fff" strokeWidth="46" strokeLinecap="round" style={{ animationDelay: ".12s" }} />
      <path className="bm-el" d="M392 546 H632" stroke="#fff" strokeWidth="46" strokeLinecap="round" style={{ animationDelay: "0s" }} />
      <rect x="360" y="616" width="304" height="226" rx="48" fill="#fff" />
      <rect x="404" y="664" width="216" height="130" rx="22" fill="url(#bm-g)" opacity="0.26" />
    </svg>
  );
}
window.BeamMark = BeamMark;

/* --- Beam-landed sound (the product's one designed cue) — "Soft chime".
   Synthesized with Web Audio so there's no asset to ship. Off by default;
   gated by the "Play a sound when a beam lands" preference. Call unlock() on
   the triggering click (so the AudioContext starts inside a user gesture),
   then beamLanded() the moment the beam lands. ---------------------------- */
window.HBSound = (function () {
  let ctx;
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }
  function reverb(c, seconds, decay) {
    const len = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    const cv = c.createConvolver(); cv.buffer = buf; return cv;
  }
  function pluck(c, dest, o) {
    const osc = c.createOscillator(); osc.type = o.type || "sine"; osc.frequency.value = o.freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, o.t);
    g.gain.exponentialRampToValueAtTime(o.gain, o.t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, o.t + o.dur);
    osc.connect(g); g.connect(dest); osc.start(o.t); osc.stop(o.t + o.dur + 0.05);
  }
  return {
    unlock() { ac(); },
    beamLanded() {
      const c = ac(); if (!c) return;
      const t = c.currentTime + 0.02;
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4400; lp.connect(c.destination);
      const rv = reverb(c, 0.7, 3), wg = c.createGain(); wg.gain.value = 0.24; lp.connect(rv); rv.connect(wg); wg.connect(c.destination);
      pluck(c, lp, { freq: 587.33,  t,        dur: 0.18, gain: 0.16 }); // D5 — rise
      pluck(c, lp, { freq: 880.00,  t: t+0.08, dur: 0.20, gain: 0.18 }); // A5 — rise
      pluck(c, lp, { freq: 1174.66, t: t+0.17, dur: 0.55, gain: 0.26 }); // D6 — land
      pluck(c, lp, { freq: 587.33,  t: t+0.17, dur: 0.60, gain: 0.09 }); // sub warmth
    },
  };
})();

/* --- Step dots ---------------------------------------------------------- */
function StepDots({ count, active }) {
  return (
    <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{
          width: i === active ? 16 : 6, height: 6, borderRadius: 999,
          background: i === active ? "var(--accent)" : "var(--fill-tertiary)",
          transition: "width var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)",
        }} />
      ))}
    </span>
  );
}

Object.assign(window, { Ic, ShotThumb, StepDots });

/* Step transition used by the popover-native flow (injected once). */
(function () {
  if (typeof document !== "undefined" && !document.getElementById("ob-step-style")) {
    const el = document.createElement("style");
    el.id = "ob-step-style";
    el.textContent = ".hb-step{animation:hb-step-in 260ms var(--ease-out)}@keyframes hb-step-in{from{opacity:0;transform:translateY(5px) scale(.99)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.hb-step{animation:none}}";
    document.head.appendChild(el);
  }
})();

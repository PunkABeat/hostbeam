/* Hostbeam — product landing one-pager.
   Plain React/Babel marketing page on the design system (../styles.css, ../_ds_bundle.js).
   Reuses window.Ic + BeamMark from ../prototypes/onboarding/shared.jsx and the
   Tweaks shell from ../prototypes/onboarding/tweaks-panel.jsx.
   Voice: Beam — calm, plain, one warm line per surface. The beam is the only motion. */

/* Resolved in boot() once all dependency scripts (DS bundle, shared.jsx,
   tweaks-panel.jsx) have run — in the standalone bundle these load as racing
   blob URLs, so reading them at module-eval time is unsafe. */
let DS, Button, Badge, Keycap, StatusDot, Ic, BeamMark;

/* ---------- accent helper (so the Tweak can recolor the whole page) -------- */
function accentVars(c) {
  return {
    "--accent": c,
    "--accent-hover": `color-mix(in srgb, ${c} 86%, #000)`,
    "--accent-active": `color-mix(in srgb, ${c} 74%, #000)`,
    "--accent-tint": `color-mix(in srgb, ${c} 13%, transparent)`,
    "--beam-500": c,
    "--focus-ring": `color-mix(in srgb, ${c} 40%, transparent)`,
  };
}

/* ====================================================================== */
/*  Hero scene — a macOS desktop with the live menu-bar popover            */
/* ====================================================================== */

function Beak() {
  return (
    <div style={{ position: "absolute", top: -7, right: 23, width: 0, height: 0,
      borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
      borderBottom: "8px solid var(--surface-popover)",
      filter: "drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.10))", zIndex: 2 }} />
  );
}

/* A self-contained popover that plays the one signature motion on demand.
   idle → uploading → landing → done → (beam again). */
function HeroPopover({ onBeamed }) {
  const [phase, setPhase] = React.useState("idle"); // idle | uploading | landing | done
  const [path, setPath] = React.useState("");
  const hostName = "prod-box";

  const beam = () => {
    if (phase === "uploading" || phase === "landing") return;
    setPhase("uploading");
    setTimeout(() => {
      const mm = String(10 + Math.floor(Math.random() * 49)).padStart(2, "0");
      const ss = String(Math.floor(Math.random() * 60)).padStart(2, "0");
      setPath(`/tmp/hostbeam/2026-06-16-15.${mm}.${ss}.png`);
      setPhase("landing");
      if (onBeamed) onBeamed();
      setTimeout(() => setPhase((p) => (p === "landing" ? "done" : p)), 760);
    }, 1300);
  };

  const sentenceNodes = ["Use this screenshot: ",
    <span key="p" style={{ color: "var(--accent)", fontWeight: 600 }}>{path}</span>];

  return (
    <div style={{ position: "relative", width: 340 }}>
      <Beak />
      <div style={{ position: "relative", zIndex: 1, width: 340, background: "var(--surface-popover)",
        borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-popover)" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 16px", borderBottom: "1px solid var(--separator)" }}>
          <img src="../assets/hostbeam-mark.svg" width="18" height="18" alt="" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--label)" }}>Hostbeam</span>
          <span style={{ marginLeft: "auto", display: "inline-flex", color: "var(--label-tertiary)", padding: 4 }}>
            <Ic name="sliders" size={16} />
          </span>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 13 }}>
          {/* clipboard row */}
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 13px", background: "var(--surface-content)", borderRadius: "var(--radius-lg)", boxShadow: "inset 0 0 0 0.5px var(--separator)" }}>
            <window.ShotThumb />
            <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--label)", whiteSpace: "nowrap" }}>Screenshot on clipboard</span>
              <span style={{ fontSize: 11, color: "var(--label-tertiary)", fontFamily: "var(--font-mono)" }}>PNG · 2560 × 1440</span>
            </div>
            <span style={{ marginLeft: "auto" }}>
              <Badge tone={(phase === "done" || phase === "landing") ? "accent" : "success"} dot>
                {(phase === "done" || phase === "landing") ? "Beamed" : "Ready"}
              </Badge>
            </span>
          </div>

          {phase === "idle" ? (
            <>
              <Button variant="primary" size="lg" block icon={<Ic name="upload" size={15} />} onClick={beam}>Beam screenshot</Button>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--label-tertiary)", fontSize: 11 }}>
                <span style={{ whiteSpace: "nowrap" }}>or press</span><Keycap keys={["cmd", "shift", "7"]} />
              </div>
            </>
          ) : null}

          {phase === "uploading" || phase === "landing" ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "4px 0 2px" }}>
              <BeamMark size={58} state={phase} />
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--label)", whiteSpace: "nowrap" }}>
                {phase === "uploading" ? `Beaming to ${hostName}…` : `Beamed to ${hostName}`}
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
                  <Ic name="clipboard" size={13} stroke={2.1} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--label-secondary)" }}>Copied to clipboard</span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, lineHeight: 1.55, color: "var(--label)", wordBreak: "break-word" }}>
                  {sentenceNodes}
                </div>
              </div>
              <Button variant="secondary" size="md" block icon={<Ic name="rotate-cw" size={14} />} onClick={() => { setPhase("idle"); setPath(""); }}>Beam again</Button>
            </div>
          ) : null}
        </div>

        {/* recent */}
        <div style={{ padding: "4px 10px 10px", borderTop: "1px solid var(--separator)" }}>
          <div style={{ padding: "8px 6px 4px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--label-tertiary)" }}>Recent</div>
          {[
            { f: "2026-06-16-15.12.04.png", h: "prod-box", t: "6m ago" },
            { f: "2026-06-16-14.48.51.png", h: "staging", t: "52m ago" },
          ].map((r) => (
            <div key={r.f} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 6px", borderRadius: "var(--radius-md)" }}>
              <window.ShotThumb w={38} h={26} />
              <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flex: 1 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--label)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.f}</span>
                <span style={{ fontSize: 10.5, color: "var(--label-tertiary)" }}>{r.h} · {r.t}</span>
              </div>
              <span style={{ flex: "none", display: "inline-flex", color: "var(--label-tertiary)" }}><Ic name="clipboard" size={14} /></span>
            </div>
          ))}
        </div>

        {/* footer host */}
        <div style={{ padding: "10px 14px 14px", borderTop: "1px solid var(--separator)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--label-tertiary)", margin: "0 2px 6px" }}>Beam to</div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", background: "var(--surface-content)", borderRadius: "var(--radius-md)", boxShadow: "inset 0 0 0 0.5px var(--separator)" }}>
            <StatusDot status="online" />
            <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--label)" }}>prod-box</span>
              <span style={{ fontSize: 10.5, color: "var(--label-tertiary)", fontFamily: "var(--font-mono)" }}>dev@10.4.0.12</span>
            </div>
            <span style={{ marginLeft: "auto", color: "var(--label-tertiary)" }}><Ic name="chevron-down" size={15} /></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopScene({ dark }) {
  const mbRef = React.useRef(null);
  const blip = () => {
    const el = mbRef.current; if (!el) return;
    el.classList.remove("blip"); void el.offsetWidth; el.classList.add("blip");
    setTimeout(() => el && el.classList.remove("blip"), 700);
  };
  return (
    <div className={"scene" + (dark ? " theme-dark" : "")} aria-hidden="true">
      <div className="scene-mb">
        <span style={{ fontSize: 13, fontWeight: 600, opacity: .92 }}>Terminal</span>
        <span style={{ fontSize: 13, opacity: .7 }}>Shell</span>
        <span style={{ fontSize: 13, opacity: .7 }}>View</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span className="mb-app" ref={mbRef}><img src="../assets/hostbeam-menubar.svg" width="17" height="17" alt="" /></span>
          <span style={{ fontSize: 12.5, opacity: .85, fontVariantNumeric: "tabular-nums" }}>Mon 15:30</span>
        </div>
      </div>
      <div className="scene-anchor">
        <HeroPopover onBeamed={blip} />
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  Sections                                                              */
/* ====================================================================== */

function Nav({ dark }) {
  return (
    <nav className="nav">
      <div className="wrap nav-in">
        <a href="#top" style={{ display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <img src="../assets/hostbeam-mark.svg" width="22" height="22" alt="" />
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--label)" }}>Hostbeam</span>
        </a>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <a className="nav-link nav-hide-sm" href="#how">How it works</a>
          <a className="nav-link nav-hide-sm" href="#features">Features</a>
          <a className="nav-link nav-hide-sm" href="#privacy">Privacy</a>
          <a className="nav-link nav-hide-sm" href="#faq">FAQ</a>
          <a className="btn btn-primary btn-sm" href="#download" style={{ marginLeft: 8 }}>
            <Ic name="upload" size={15} /> Download
          </a>
        </div>
      </div>
    </nav>
  );
}

function Hero({ dark }) {
  return (
    <header id="top" style={{ paddingTop: 64, paddingBottom: 64 }}>
      <div className="wrap hero-grid">
        <div>
          <p className="eyebrow">macOS menu-bar utility</p>
          <h1 className="display">Beam a screenshot<br />straight to your server.</h1>
          <p className="lede">
            Copy a screenshot, press one hotkey, and Hostbeam drops it on the host you choose —
            then hands your clipboard a paste-ready line for your coding agent. It lives in the
            menu bar and gets out of the way.
          </p>
          <div className="hero-cta" style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32, alignItems: "center" }}>
            <a className="btn btn-primary" href="#download"><Ic name="upload" size={17} /> Download for macOS</a>
            <a className="btn btn-ghost" href="#how">See how it works</a>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--label-tertiary)", marginTop: 16 }}>
            Free · macOS 13+ · Apple silicon &amp; Intel
          </p>
        </div>
        <div>
          <DesktopScene dark={dark} />
          <p style={{ textAlign: "center", fontSize: 12, color: "var(--label-tertiary)", marginTop: 14 }}>
            Live demo — press <span style={{ fontWeight: 600, color: "var(--label-secondary)" }}>Beam screenshot</span> above.
          </p>
        </div>
      </div>
    </header>
  );
}

function HowItWorks() {
  const steps = [
    { icon: "clipboard", title: "Copy a screenshot", body: "Cmd-Shift-4, a snip from any tool — anything that lands a PNG on your clipboard." },
    { icon: "zap", title: "Beam it", body: "One hotkey from any app. Hostbeam uploads it to your chosen host over your own SSH." },
    { icon: "terminal", title: "Paste the line", body: "Your clipboard now holds a ready sentence with the remote path. Paste it into your agent." },
  ];
  return (
    <section id="how" style={{ background: "var(--page-bg-alt)", padding: "84px 0" }}>
      <div className="wrap">
        <p className="eyebrow" style={{ textAlign: "center" }}>How it works</p>
        <h2 className="h2" style={{ textAlign: "center" }}>Clipboard to remote path in one keystroke.</h2>
        <p className="sub" style={{ textAlign: "center", margin: "16px auto 0" }}>
          No window to find, no file to drag, no upload dialog. The whole loop is muscle memory.
        </p>
        <div className="grid-3" style={{ marginTop: 52 }}>
          {steps.map((s, i) => (
            <div key={s.title} className="card" style={{ padding: "26px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <span className="step-num">{i + 1}</span>
                <span style={{ display: "inline-flex", color: "var(--accent)" }}><Ic name={s.icon} size={20} /></span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0, letterSpacing: "-0.01em", color: "var(--label)" }}>{s.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--label-secondary)", margin: "8px 0 0", textWrap: "pretty" }}>{s.body}</p>
            </div>
          ))}
        </div>

        {/* the paste-ready line, called out */}
        <div className="card" style={{ marginTop: 24, padding: "22px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", color: "var(--accent)", flex: "none" }}><Ic name="clipboard" size={18} /></span>
          <code className="mono" style={{ fontSize: 14, color: "var(--label)", flex: 1, minWidth: 240 }}>
            Use this screenshot: <span style={{ color: "var(--accent)", fontWeight: 600 }}>/tmp/hostbeam/2026-06-16-15.12.04.png</span>
          </code>
          <span style={{ fontSize: 12.5, color: "var(--label-tertiary)" }}>copied for you — paste &amp; go</span>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const feats = [
    { icon: "zap", title: "A hotkey from anywhere", body: "Cmd-Shift-7 from any app, full-screen or not. No window to surface, no menu to open — just beam." },
    { icon: "terminal", title: "Lives in your menu bar", body: "A quiet glyph up top, blips once when a beam lands. Click for the popover, or never look at it at all." },
    { icon: "clipboard", title: "Paste-ready for agents", body: "It doesn’t just upload — it writes the exact sentence your coding agent needs and copies it. Edit the template to taste." },
    { icon: "server", title: "Knows your ~/.ssh/config", body: "Every host you already have, searchable and ready. Pick a default, switch in a click, beam to any of them." },
  ];
  return (
    <section id="features" style={{ padding: "84px 0" }}>
      <div className="wrap">
        <p className="eyebrow">Features</p>
        <h2 className="h2" style={{ maxWidth: "16em" }}>Small on screen. Out of your way. Exactly where you need it.</h2>
        <div className="grid-2" style={{ marginTop: 48 }}>
          {feats.map((f) => (
            <div key={f.title} className="card" style={{ padding: "28px 28px", display: "flex", gap: 18 }}>
              <span style={{ width: 44, height: 44, flex: "none", borderRadius: "var(--radius-lg)", background: "var(--accent-tint)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                <Ic name={f.icon} size={22} />
              </span>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0, letterSpacing: "-0.01em", color: "var(--label)" }}>{f.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--label-secondary)", margin: "7px 0 0", textWrap: "pretty" }}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Privacy() {
  return (
    <section id="privacy" style={{ background: "var(--page-bg-alt)", padding: "84px 0" }}>
      <div className="wrap split">
        <div>
          <span style={{ width: 52, height: 52, borderRadius: "var(--radius-xl)", background: "var(--accent-tint)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", marginBottom: 22 }}>
            <Ic name="lock" size={26} />
          </span>
          <p className="eyebrow">Privacy</p>
          <h2 className="h2">Nothing in the middle.</h2>
          <p className="sub">
            Your screenshot goes from your clipboard to your server over your own SSH — the same
            connection you already trust. No Hostbeam account, no cloud bucket, no telemetry.
            We never see the file, and there’s no “us” in the path.
          </p>
        </div>
        <div className="card" style={{ padding: "10px 14px" }}>
          {[
            { k: "No account", v: "Your machine, your SSH config. Nothing to sign up for." },
            { k: "No cloud relay", v: "The file never touches a Hostbeam server. It goes straight to your host." },
            { k: "No telemetry", v: "We don’t phone home. What you beam is your business." },
            { k: "Your folder, your rules", v: "Defaults to /tmp/hostbeam — change it per host any time." },
          ].map((r, i) => (
            <div key={r.k} style={{ display: "flex", gap: 13, padding: "16px 12px", borderTop: i ? "1px solid var(--separator)" : 0 }}>
              <span style={{ flex: "none", color: "var(--success)", marginTop: 1 }}><Ic name="check" size={18} stroke={2.5} /></span>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--label)" }}>{r.k}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--label-secondary)", marginTop: 3 }}>{r.v}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const qs = [
    { q: "Where do my screenshots end up?", a: "In /tmp/hostbeam on the host you pick, by default. You can set a different folder per host in Preferences." },
    { q: "Do I need a Hostbeam account?", a: "No. Hostbeam uses the hosts already in your ~/.ssh/config and your existing keys. There’s nothing to sign up for." },
    { q: "Which hosts work?", a: "Anything you can ssh into — entries from your ~/.ssh/config, or a host you type in by hand. If ssh works, Hostbeam works." },
    { q: "Can I change the pasted sentence?", a: "Yes. The template lives in Preferences — keep the default “Use this screenshot: {path}”, or write your own around the {path} token." },
    { q: "What if a beam fails?", a: "Hostbeam tells you why in plain language — host unreachable, key refused, folder not writable — and offers a one-click retry or inline diagnostics." },
    { q: "Is it macOS only?", a: "Yes, for now. Hostbeam is built to feel native to the Mac menu bar." },
  ];
  return (
    <section id="faq" style={{ padding: "84px 0" }}>
      <div className="wrap">
        <p className="eyebrow" style={{ textAlign: "center" }}>FAQ</p>
        <h2 className="h2" style={{ textAlign: "center", marginBottom: 48 }}>Good questions.</h2>
        <div className="faq-grid">
          {qs.map((item) => (
            <div key={item.q} style={{ padding: "20px 0", borderTop: "1px solid var(--separator)" }}>
              <h3 className="faq-q">{item.q}</h3>
              <p className="faq-a">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Download() {
  return (
    <section id="download" style={{ padding: "20px 0 96px" }}>
      <div className="wrap">
        <div style={{ position: "relative", overflow: "hidden", borderRadius: "var(--radius-2xl)", padding: "64px 48px", textAlign: "center",
          background: "linear-gradient(160deg, var(--beam-400, #5183F7), var(--accent))", color: "#fff",
          boxShadow: "0 24px 60px -24px color-mix(in srgb, var(--accent) 60%, transparent)" }}>
          <img src="../assets/hostbeam-icon.svg" width="72" height="72" alt="" style={{ borderRadius: 18, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }} />
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 600, letterSpacing: "-0.025em", margin: "24px 0 0", textWrap: "balance" }}>
            Put your screenshots where your code lives.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.5, opacity: 0.92, margin: "16px auto 0", maxWidth: "28em" }}>
            Download Hostbeam, point it at a host, and beam your first screenshot in under a minute.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
            <a className="btn" href="#top" style={{ background: "#fff", color: "var(--accent)", boxShadow: "0 6px 18px rgba(0,0,0,0.18)" }}>
              <Ic name="upload" size={17} /> Download for macOS
            </a>
            <a className="btn" href="../prototypes/onboarding/index.html" style={{ background: "rgba(255,255,255,0.16)", color: "#fff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.4)" }}>
              Try the walkthrough
            </a>
          </div>
          <p style={{ fontSize: 12.5, opacity: 0.8, marginTop: 18 }}>Free · macOS 13+ · Apple silicon &amp; Intel</p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--separator)", padding: "36px 0" }}>
      <div className="wrap" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
          <img src="../assets/hostbeam-mark.svg" width="20" height="20" alt="" />
          <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--label)" }}>Hostbeam</span>
        </div>
        <span style={{ fontSize: 12.5, color: "var(--label-tertiary)" }}>Screenshots, beamed.</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 18, fontSize: 13 }}>
          <a className="nav-link" href="#how" style={{ padding: 0 }}>How it works</a>
          <a className="nav-link" href="#privacy" style={{ padding: 0 }}>Privacy</a>
          <a className="nav-link" href="#faq" style={{ padding: 0 }}>FAQ</a>
          <a className="nav-link" href="#top" style={{ padding: 0 }}>Back to top</a>
        </div>
      </div>
    </footer>
  );
}

/* ====================================================================== */
/*  App                                                                   */
/* ====================================================================== */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#2D6CF6",
  "dark": false
}/*EDITMODE-END*/;

function App() {
  // Resolve dependencies from window at render time. In the standalone bundle
  // the babel modules can be evaluated in more than one scope / order, so
  // binding here (before any child renders) is the only safe place.
  DS = window.HostbeamDesignSystem_23dc0f;
  ({ Button, Badge, Keycap, StatusDot } = DS);
  Ic = window.Ic; BeamMark = window.BeamMark;

  // Tweaks are optional: present in the normal prototype, but in a shared
  // standalone file they can't persist and may not have loaded. Fall back to
  // plain local state so the page renders regardless.
  const useTweaksFn = window.useTweaks || ((d) => {
    const [v, setV] = React.useState(d);
    const set = React.useCallback(
      (k, val) => setV((p) => (typeof k === "object" ? { ...p, ...k } : { ...p, [k]: val })), []);
    return [v, set];
  });
  const [t, setTweak] = useTweaksFn(TWEAK_DEFAULTS);

  const TweaksPanel = window.TweaksPanel, TweakSection = window.TweakSection,
        TweakColor = window.TweakColor, TweakRadio = window.TweakRadio;
  const tweaksUI = TweaksPanel ? (
    <TweaksPanel>
      <TweakSection label="Appearance" />
      <TweakColor label="Accent" value={t.accent} options={["#2D6CF6", "#0E84C2", "#1F8A5B", "#7A5AE0"]} onChange={(v) => setTweak("accent", v)} />
      <TweakRadio label="Theme" value={t.dark ? "dark" : "light"} options={["light", "dark"]} onChange={(v) => setTweak("dark", v === "dark")} />
    </TweaksPanel>
  ) : null;

  return (
    <div className={"site" + (t.dark ? " theme-dark" : "")} style={accentVars(t.accent)}>
      <Nav dark={t.dark} />
      <Hero dark={t.dark} />
      <HowItWorks />
      <Features />
      <Privacy />
      <FAQ />
      <Download />
      <Footer />

      {tweaksUI}
    </div>
  );
}

function boot() {
  const W = window;
  if (!(W.HostbeamDesignSystem_23dc0f && W.Ic && W.BeamMark && W.ShotThumb)) {
    return setTimeout(boot, 30);
  }
  if (W.__hbLandingRoot) return;            // guard against a duplicated module scope
  W.__hbLandingRoot = ReactDOM.createRoot(document.getElementById("root"));
  W.__hbLandingRoot.render(React.createElement(App));
}
boot();

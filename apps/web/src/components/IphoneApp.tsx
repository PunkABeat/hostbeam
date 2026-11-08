import { useState } from "react";
import { BeamMark, Ic } from "@hostbeam/ui";

import { APP_STORE_URL } from "../lib/links";
import StoreQr from "./StoreQr";

// The iPhone half of the product (Milestone 008): share-sheet beam, the
// zero-tap shortcut, and QR pairing from the Mac. Static mock — the hero
// already carries the one interactive demo.

// "pasted" is the half of the story the share sheet cannot show: the path goes
// into an SSH app on the same phone, where the agent is driven from. Without
// it, readers took the agent's terminal for a Mac and asked why the phone
// didn't just send the screenshot.
type DemoPhase = "share" | "beaming" | "done" | "pasted";

/// The frame + screen. `live` starts at the share sheet (tap the Hostbeam
/// icon, exactly like the real flow); the hero miniature renders the
/// done-state statically. The extension states mirror ShareStatusView:
/// status only — no header, no buttons — then the copied card. The live demo
/// then switches to an SSH app, where the path is pasted.
export function PhoneMock({
  live = false,
  onPhase,
}: {
  live?: boolean;
  onPhase?: (phase: DemoPhase) => void;
}) {
  const [phase, setPhaseState] = useState<DemoPhase>(live ? "share" : "done");
  const setPhase = (p: DemoPhase) => {
    setPhaseState(p);
    onPhase?.(p);
  };

  const beam = () => {
    if (phase !== "share") return;
    setPhase("beaming");
    setTimeout(() => {
      setPhase("done");
      setTimeout(() => setPhase("pasted"), 2600);
    }, 1700);
  };

  const ghostApp = (bg: string) => (
    <span style={{ width: 44, height: 44, borderRadius: 11, background: bg, flex: "none" }} />
  );

  return (
    <div className="iphone" aria-hidden={live ? undefined : true}>
      <span className="iphone-btn ib-action" />
      <span className="iphone-btn ib-volup" />
      <span className="iphone-btn ib-voldn" />
      <span className="iphone-btn ib-power" />
      <div className="iphone-screen">
        <div className="iphone-island" />
        <div className="iphone-status">
          <span className="ist-time">15:30</span>
          <span className="ist-icons">
            <svg width="15" height="10" viewBox="0 0 15 10" fill="currentColor"><rect x="0" y="6" width="2.5" height="4" rx="0.8"/><rect x="4" y="4" width="2.5" height="6" rx="0.8"/><rect x="8" y="2" width="2.5" height="8" rx="0.8"/><rect x="12" y="0" width="2.5" height="10" rx="0.8"/></svg>
            <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor"><path d="M7.5 9.5 5.2 7.2a3.4 3.4 0 0 1 4.6 0Z"/><path d="M3.4 5.4a6 6 0 0 1 8.2 0l-1.3 1.3a4.2 4.2 0 0 0-5.6 0Z" opacity="0.85"/><path d="M1.2 3.2a9 9 0 0 1 12.6 0l-1.3 1.3a7.2 7.2 0 0 0-10 0Z" opacity="0.7"/></svg>
            <svg width="23" height="11" viewBox="0 0 23 11"><rect x="0.5" y="0.5" width="19" height="10" rx="3" fill="none" stroke="currentColor" opacity="0.5"/><rect x="2" y="2" width="13" height="7" rx="1.8" fill="currentColor"/><rect x="20.7" y="3.4" width="1.8" height="4.2" rx="0.9" fill="currentColor" opacity="0.5"/></svg>
          </span>
        </div>
        {/* the screenshot being shared, dimmed under the sheet */}
        <div className="iphone-shot">
          <div className="iphone-shot-ui" aria-hidden="true">
            <div style={{ height: 10, width: "42%", borderRadius: 5, background: "rgba(255,255,255,0.5)" }} />
            <div style={{ height: 7, width: "70%", borderRadius: 4, background: "rgba(255,255,255,0.3)", marginTop: 9 }} />
            <div style={{ height: 7, width: "58%", borderRadius: 4, background: "rgba(255,255,255,0.3)", marginTop: 6 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <div style={{ height: 44, flex: 1, borderRadius: 8, background: "rgba(255,255,255,0.22)" }} />
              <div style={{ height: 44, flex: 1, borderRadius: 8, background: "rgba(255,255,255,0.14)" }} />
            </div>
            <div style={{ height: 7, width: "64%", borderRadius: 4, background: "rgba(255,255,255,0.25)", marginTop: 14 }} />
            <div style={{ height: 7, width: "48%", borderRadius: 4, background: "rgba(255,255,255,0.25)", marginTop: 6 }} />
          </div>
        </div>

        {phase === "pasted" ? (
          <SshApp />
        ) : phase === "share" ? (
          /* the iOS share sheet: tap the Hostbeam icon, like the real thing */
          <div className="iphone-sheet">
            <div className="iphone-grabber" />
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, borderBottom: "1px solid var(--hairline)" }}>
              <span style={{ width: 34, height: 34, borderRadius: 7, background: "linear-gradient(160deg, #6a94dd, #2c5cb8)", flex: "none" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>IMG_4127</span>
                <span style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>Screenshot · 2,1 MB</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, padding: "13px 2px 4px", alignItems: "flex-start" }}>
              {ghostApp("var(--beam-tint)")}
              {ghostApp("color-mix(in srgb, var(--ink-faint) 22%, transparent)")}
              <button
                type="button"
                onClick={beam}
                style={{ border: 0, background: "transparent", cursor: "pointer", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, width: 58, flex: "none" }}
              >
                <img src="/assets/hostbeam-icon.svg" width="44" height="44" alt="Beam to host" style={{ borderRadius: 11, boxShadow: "0 0 0 2px var(--beam)" }} />
                <span style={{ fontSize: 9.5, color: "var(--ink-soft)", lineHeight: 1.2, textAlign: "center" }}>Beam to host</span>
              </button>
              {ghostApp("color-mix(in srgb, var(--ink-faint) 16%, transparent)")}
            </div>
            <div style={{ borderTop: "1px solid var(--hairline)", marginTop: 8, paddingTop: 10, display: "flex", flexDirection: "column", gap: 9 }}>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Copy</span>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Save to Files</span>
            </div>
            <div className="iphone-home" />
          </div>
        ) : (
          /* the Hostbeam extension: status only, like ShareStatusView */
          <div className="iphone-sheet">
            <div className="iphone-grabber" />
            {phase === "beaming" ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "18px 0 26px" }}>
                <BeamMark size={40} state="uploading" />
                <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>Beaming to prod-box…</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "10px 0 8px" }}>
                <BeamMark size={40} state="landing" />
                <div style={{ background: "var(--beam-tint)", border: "1px solid var(--hairline)", borderRadius: 10, padding: "10px 12px", width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ color: "var(--land)", display: "inline-flex" }}><Ic name="check" size={13} stroke={2.6} /></span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)" }}>Copied. Paste it to your agent.</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono-site)", fontSize: 10.5, lineHeight: 1.6, color: "var(--ink)", wordBreak: "break-all" }}>
                    <span style={{ color: "var(--beam)", fontWeight: 500 }}>/tmp/hostbeam/hostbeam-1788875278869.png</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--ink-faint)", alignSelf: "flex-start", paddingBottom: 14 }}>
                  <Ic name="terminal" size={13} />
                  <span>paste it wherever your agent runs</span>
                </div>
              </div>
            )}
            <div className="iphone-home" />
          </div>
        )}
      </div>
    </div>
  );
}

// An SSH app in general, not any one of them: the host's bar, then the agent's
// session, where the pasted path has already become the image. It covers the
// screenshot rather than replacing it, the way switching apps looks.
function SshApp() {
  return (
    <div className="iphone-term">
      <div className="iphone-term-bar">
        <span className="iphone-term-dot" />
        <span>prod-box</span>
        <span className="t-dim" style={{ fontWeight: 400 }}>ssh</span>
      </div>
      <div className="iphone-term-body">
        <div><span className="t-dim">dev@prod-box:~/app$</span> claude</div>
        <div className="t-in" style={{ animationDelay: "0.35s" }}>
          <span className="t-dim">›</span> <span className="t-beam">[Image #1]</span> the nav, on my phone
        </div>
        <div className="t-in" style={{ animationDelay: "1.1s" }}>
          <span className="t-land">✓</span> I see it. The nav wraps under 390px. Fixing.
        </div>
      </div>
      <div className="iphone-term-keys">
        {["esc", "ctrl", "tab", "↑", "↓"].map((k) => (
          <span key={k}>{k}</span>
        ))}
      </div>
      <div className="iphone-home" />
    </div>
  );
}

function PhoneDemo() {
  const [phase, setPhase] = useState<DemoPhase>("share");
  const [run, setRun] = useState(0);
  return (
    <div>
      <PhoneMock key={run} live onPhase={setPhase} />
      <p className="note" style={{ textAlign: "center", marginTop: 14 }}>
        {phase === "done" ? (
          <>Copied. Now paste it in your SSH app…</>
        ) : phase === "pasted" ? (
          <button
            type="button"
            onClick={() => { setRun((n) => n + 1); setPhase("share"); }}
            style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--beam)", font: "inherit", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5, padding: 0 }}
          >
            <Ic name="rotate-cw" size={11} /> replay the beam
          </button>
        ) : (
          <>Live demo — tap <span style={{ color: "var(--ink)", fontWeight: 500 }}>Beam to host</span> in the share sheet.</>
        )}
      </p>
    </div>
  );
}

export default function IphoneApp() {
  const points = [
    {
      icon: "upload",
      title: "Share sheet, done",
      body: "Screenshot, PDF or recording → Share → Beam to host. The file lands on your server and its path is on your phone's clipboard: paste it into your SSH app, or a terminal on your Mac, and your agent sees the picture.",
    },
    {
      icon: "zap",
      title: "Zero taps, if you want",
      body: "A “Beam last screenshot” shortcut for the Action Button or Back Tap: capture, tap the back of your phone, paste.",
    },
    {
      icon: "smartphone",
      title: "Paired from your Mac in one scan",
      body: "Hostbeam on the Mac shows a QR for any host; the phone scans it and gets its own SSH key, which never leaves the phone.",
    },
  ];
  return (
    <section id="iphone" style={{ background: "color-mix(in srgb, var(--beam-tint) 45%, var(--paper))", borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)", padding: "84px 0" }}>
      <div className="wrap split">
        <div>
          <h2 className="h2">The agent runs on your server. You're on your phone. Beam anyway.</h2>
          <p className="sub">
            Driving a coding agent from an SSH client on your iPhone is real work now, right up until
            you need to show it something. Hostbeam for iPhone beams any screenshot, photo or file to
            your host, straight from the share sheet.
          </p>
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 22 }}>
            {points.map((p) => (
              <div key={p.title} style={{ display: "flex", gap: 14 }}>
                <span style={{ flex: "none", width: 34, height: 34, borderRadius: 9, background: "var(--paper-raised)", border: "1px solid var(--hairline)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--beam)" }}>
                  <Ic name={p.icon} size={16} />
                </span>
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 600, color: "var(--ink)" }}>{p.title}</div>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-soft)", margin: "5px 0 0", maxWidth: "36em", textWrap: "pretty" }}>{p.body}</p>
                </div>
              </div>
            ))}
          </div>
          {/* The QR is for a reader on a Mac, whose phone is in their hand; on a
              phone it would be a code to scan with itself, so the CSS hides it
              there and the button does the job. */}
          <div style={{ marginTop: 30, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
              <a className="btn btn-primary" href={APP_STORE_URL}>
                <Ic name="smartphone" size={15} /> Get it on the App Store
              </a>
              <span className="note" style={{ maxWidth: "24em", lineHeight: 1.6 }}>
                Pairing starts on{" "}
                <a href="#download" style={{ color: "var(--beam)", fontWeight: 500 }}>the Mac app</a>,
                and it is free, with nothing to buy inside it.
              </span>
            </div>
            <StoreQr />
          </div>
        </div>
        <PhoneDemo />
      </div>
    </section>
  );
}

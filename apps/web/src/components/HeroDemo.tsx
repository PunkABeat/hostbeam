// The hero's live demo — a macOS desktop scene with a self-contained popover
// that plays the one signature motion on demand: idle → uploading → landing →
// done → (beam again). Ported from the landing design (reference/landing/);
// the only island on the page.
import { useState } from "react";
import { Badge, BeamMark, Button, Ic, Keycap, ShotThumb, StatusDot } from "@hostbeam/ui";

function Beak() {
  return (
    <div style={{ position: "absolute", top: -7, right: 23, width: 0, height: 0,
      borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
      borderBottom: "8px solid var(--surface-popover)",
      filter: "drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.10))", zIndex: 2 }} />
  );
}

type Phase = "idle" | "uploading" | "landing" | "done";

function HeroPopover({ onPhase }: { onPhase?: (phase: Phase) => void }) {
  const [phase, setPhaseState] = useState<Phase>("idle");
  const setPhase = (p: Phase | ((prev: Phase) => Phase)) => {
    setPhaseState((prev) => {
      const next = typeof p === "function" ? p(prev) : p;
      if (next !== prev) onPhase?.(next);
      return next;
    });
  };
  const [path, setPath] = useState("");
  const hostName = "prod-box";

  const beam = () => {
    if (phase === "uploading" || phase === "landing") return;
    setPhase("uploading");
    setTimeout(() => {
      // Same filename shape as the app: {folder}/hostbeam-{millis}.png.
      const millis = 1781653200000 + Math.floor(Math.random() * 9_000_000);
      setPath(`/tmp/hostbeam/hostbeam-${millis}.png`);
      setPhase("landing");
      setTimeout(() => setPhase((p) => (p === "landing" ? "done" : p)), 760);
    }, 1300);
  };

  // Just the path, as the app copies it: pasted, the agent attaches the picture.
  const copied = <span style={{ color: "var(--accent)", fontWeight: 600 }}>{path}</span>;

  return (
    <div style={{ position: "relative", width: 340 }}>
      <Beak />
      <div style={{ position: "relative", zIndex: 1, width: 340, background: "var(--surface-popover)",
        borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-popover)" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 16px", borderBottom: "1px solid var(--separator)" }}>
          <img src="/assets/hostbeam-mark.svg" width="18" height="18" alt="" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--label)" }}>Hostbeam</span>
          <span style={{ marginLeft: "auto", display: "inline-flex", color: "var(--label-tertiary)", padding: 4 }}>
            <Ic name="sliders" size={16} />
          </span>
          <span style={{ display: "inline-flex", color: "var(--label-tertiary)", padding: 4 }}>
            <Ic name="power" size={15} />
          </span>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 13 }}>
          {/* clipboard row */}
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 13px", background: "var(--surface-content)", borderRadius: "var(--radius-lg)", boxShadow: "inset 0 0 0 0.5px var(--separator)" }}>
            <ShotThumb />
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
                  {copied}
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
            { f: "hostbeam-1781652844021.png", h: "prod-box", t: "6m ago" },
            { f: "hostbeam-1781649912473.png", h: "staging", t: "52m ago" },
          ].map((r) => (
            <div key={r.f} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 6px", borderRadius: "var(--radius-md)" }}>
              <ShotThumb w={38} h={26} />
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

export default function HeroDemo() {
  // Like the app's tray (tray.rs animate_during): the menu-bar glyph animates
  // while a beam is in flight, and is otherwise static.
  const [beaming, setBeaming] = useState(false);
  const onPhase = (p: Phase) => setBeaming(p === "uploading" || p === "landing");
  return (
    <div className="scene" aria-hidden="true">
      <div className="scene-mb">
        <span style={{ fontSize: 13, fontWeight: 600, opacity: .92 }}>Terminal</span>
        <span style={{ fontSize: 13, opacity: .7 }}>Shell</span>
        <span style={{ fontSize: 13, opacity: .7 }}>View</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span className={"mb-app" + (beaming ? " beaming" : "")}><img src="/assets/hostbeam-menubar.svg" width="17" height="17" alt="" /></span>
          <span style={{ fontSize: 12.5, opacity: .85, fontVariantNumeric: "tabular-nums" }}>Mon 15:30</span>
        </div>
      </div>
      <div className="scene-anchor">
        <HeroPopover onPhase={onPhase} />
      </div>
    </div>
  );
}

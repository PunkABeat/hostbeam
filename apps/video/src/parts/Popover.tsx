// Hostbeam's popover, built from the same @hostbeam/ui components as the app
// and the site's hero demo, with the app's own English strings ("Beaming to
// {host}…", "Running on {host}", "open at {addr}"). Only the motion differs:
// the beam mark here is driven by frame number instead of CSS keyframes.
import type { ReactNode } from "react";
import { Img, interpolate, staticFile } from "remotion";
import { Badge, Button, Ic, Keycap, ShotThumb, StatusDot } from "@hostbeam/ui";
import { progress } from "../lib";

const HOST = "prod-box";

/** The beam mark, animated by `t` (frames since the state began). */
export function BeamMarkFrame({
  size,
  mode,
  t,
}: {
  size: number;
  mode: "idle" | "uploading" | "landing";
  t: number;
}) {
  // Uploading: the three bars and the node light up from the bottom, in turn.
  const slice = (i: number) =>
    mode === "uploading" ? 0.35 + 0.65 * Math.max(0, Math.sin(((t - i * 4) / 18) * Math.PI)) : 1;
  const pop = mode === "landing" ? 1 + 0.25 * Math.sin(progress(t, 0, 10) * Math.PI) : 1;
  const ring = mode === "landing" ? progress(t, 2, 18) : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" fill="none" style={{ filter: "drop-shadow(0 6px 14px rgba(25,48,110,.28))" }}>
      <defs>
        <linearGradient id="bmf-g" x1="512" y1="64" x2="512" y2="960" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5A95FF" />
          <stop offset="1" stopColor="#2A66EC" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="232" fill="url(#bmf-g)" />
      <rect width="1024" height="512" rx="232" fill="#fff" opacity="0.07" />
      {ring > 0 && ring < 1 ? (
        <circle cx="512" cy="250" r={56 + ring * 150} fill="none" stroke="#fff" strokeWidth={16 * (1 - ring)} opacity={1 - ring} />
      ) : null}
      <circle cx="512" cy="250" r={50 * pop} fill="#fff" opacity={slice(3)} />
      <path d="M462 362 H562" stroke="#fff" strokeWidth="46" strokeLinecap="round" opacity={slice(2)} />
      <path d="M430 454 H594" stroke="#fff" strokeWidth="46" strokeLinecap="round" opacity={slice(1)} />
      <path d="M392 546 H632" stroke="#fff" strokeWidth="46" strokeLinecap="round" opacity={slice(0)} />
      <rect x="360" y="616" width="304" height="226" rx="48" fill="#fff" />
      <rect x="404" y="664" width="216" height="130" rx="22" fill="url(#bmf-g)" opacity="0.26" />
    </svg>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: "relative", width: 340 }}>
      <div
        style={{
          position: "absolute",
          top: -7,
          right: 23,
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderBottom: "8px solid var(--surface-popover)",
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: 340,
          background: "var(--surface-popover)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-popover)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 16px", borderBottom: "1px solid var(--separator)" }}>
          <Img src={staticFile("hostbeam-mark.svg")} style={{ width: 18, height: 18 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--label)" }}>Hostbeam</span>
          <span style={{ marginLeft: "auto", display: "inline-flex", color: "var(--label-tertiary)", padding: 4 }}>
            <Ic name="sliders" size={16} />
          </span>
        </div>
        {children}
        <div style={{ padding: "10px 14px 14px", borderTop: "1px solid var(--separator)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--label-tertiary)", margin: "0 2px 6px" }}>
            Beam to
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", background: "var(--surface-content)", borderRadius: "var(--radius-md)", boxShadow: "inset 0 0 0 0.5px var(--separator)" }}>
            <StatusDot status="online" />
            <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1 }}>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--label)" }}>{HOST}</span>
              <span style={{ fontSize: 10.5, color: "var(--label-tertiary)", fontFamily: "var(--font-mono)" }}>dev@10.4.0.12</span>
            </div>
            <span style={{ marginLeft: "auto", color: "var(--label-tertiary)" }}>
              <Ic name="chevron-down" size={15} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export type BeamPhase = "ready" | "uploading" | "landing" | "done";

/** The popover while a screenshot is beamed. `t` is frames into the phase. */
export function BeamPopover({ phase, t, path }: { phase: BeamPhase; t: number; path: string }) {
  const landed = phase === "landing" || phase === "done";
  const bar = phase === "uploading" ? interpolate(t, [0, 60], [0.08, 0.82], { extrapolateRight: "clamp" }) : 1;
  return (
    <Shell>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 13px", background: "var(--surface-content)", borderRadius: "var(--radius-lg)", boxShadow: "inset 0 0 0 0.5px var(--separator)" }}>
          <ShotThumb />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--label)", whiteSpace: "nowrap" }}>Screenshot on clipboard</span>
            <span style={{ fontSize: 11, color: "var(--label-tertiary)", fontFamily: "var(--font-mono)" }}>PNG · 2560 × 1440</span>
          </div>
          <span style={{ marginLeft: "auto" }}>
            <Badge tone={landed ? "accent" : "success"} dot>
              {landed ? "Beamed" : "Ready"}
            </Badge>
          </span>
        </div>

        {phase === "ready" ? (
          <>
            <Button variant="primary" size="lg" block icon={<Ic name="upload" size={15} />}>
              Beam screenshot
            </Button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--label-tertiary)", fontSize: 11 }}>
              <span>or press</span>
              <Keycap keys={["cmd", "shift", "7"]} />
            </div>
          </>
        ) : null}

        {phase === "uploading" || phase === "landing" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "4px 0 2px" }}>
            <BeamMarkFrame size={58} mode={phase} t={t} />
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--label)" }}>
              {phase === "uploading" ? `Beaming to ${HOST}…` : `Beamed to ${HOST}`}
            </div>
            <div style={{ width: "100%", height: 4, borderRadius: 3, background: "var(--fill-tertiary)", overflow: "hidden" }}>
              <div style={{ width: `${bar * 100}%`, height: "100%", background: "var(--accent)", borderRadius: 3 }} />
            </div>
          </div>
        ) : null}

        {phase === "done" ? (
          <div style={{ background: "var(--accent-tint)", boxShadow: "inset 0 0 0 1px var(--separator)", borderRadius: "var(--radius-md)", padding: "10px 11px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Ic name="clipboard" size={13} stroke={2.1} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--label-secondary)" }}>Copied to clipboard</span>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, lineHeight: 1.55, color: "var(--accent)", fontWeight: 600, wordBreak: "break-all" }}>
              {path}
            </div>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}

export type DevState = "listed" | "opening" | "open";

/** The popover's "Running on prod-box" section, as DevServerList draws it. */
export function DevPopover({ state, port = 5173 }: { state: DevState; port?: number }) {
  const open = state === "open";
  return (
    <Shell>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, color: "var(--label-tertiary)", fontSize: 12 }}>
        <Ic name="clipboard" size={14} />
        <span>Nothing to beam yet</span>
      </div>
      <div style={{ padding: "4px 10px 8px", borderTop: "1px solid var(--separator)" }}>
        <div style={{ padding: "8px 4px 4px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--label-tertiary)" }}>
          Running on {HOST}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px" }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: open ? "var(--accent)" : "var(--label-quaternary)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--label)" }}>:{port}</span>
          {open ? <span style={{ fontSize: 11, color: "var(--label-tertiary)" }}>open at 127.0.0.1:{port}</span> : null}
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 2 }}>
            {open ? (
              <Button variant="ghost" size="sm">
                Stop
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" disabled={state === "opening"}>
              {state === "opening" ? "Opening…" : "Open"}
            </Button>
          </span>
        </div>
      </div>
    </Shell>
  );
}

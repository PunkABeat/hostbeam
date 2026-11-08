// Decorative screenshot-thumbnail placeholder (a tiny faux window) shown in the
// clipboard card and recent rows when there's no real preview to display.
export interface ShotThumbProps {
  tint?: string;
  w?: number;
  h?: number;
}

export function ShotThumb({ tint = "#cdd6e6", w = 44, h = 30 }: ShotThumbProps) {
  return (
    <span
      style={{
        width: w,
        height: h,
        borderRadius: "var(--radius-sm)",
        flex: "none",
        background: tint,
        boxShadow: "inset 0 0 0 0.5px var(--separator)",
        position: "relative",
        overflow: "hidden",
        display: "inline-block",
      }}
    >
      <span style={{ position: "absolute", top: 4, left: 4, display: "flex", gap: 2 }}>
        {[0.18, 0.12, 0.12].map((o, i) => (
          <span
            key={i}
            style={{ width: 3, height: 3, borderRadius: "50%", background: `rgba(0,0,0,${o})` }}
          />
        ))}
      </span>
      <span
        style={{
          position: "absolute",
          left: 4,
          right: 4,
          bottom: 4,
          height: h * 0.42,
          borderRadius: 2,
          background: "rgba(0,0,0,.07)",
        }}
      />
    </span>
  );
}

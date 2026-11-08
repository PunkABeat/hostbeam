import type { BeakSpec } from "../shared";

export function Beak({ style = "notch", size = 8, offset = 31 }: BeakSpec) {
  if (style === "none") return null;
  if (style === "diamond") {
    const w = size * 1.7;
    return (
      <div
        style={{
          position: "absolute",
          top: -(w * 0.5),
          right: offset - w / 2,
          width: w,
          height: w,
          background: "var(--surface-popover)",
          transform: "rotate(45deg)",
          borderRadius: 2,
          boxShadow: "-0.5px -0.5px 0 0 var(--separator)",
          zIndex: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        top: -(size - 1),
        right: offset - size,
        width: 0,
        height: 0,
        borderLeft: `${size}px solid transparent`,
        borderRight: `${size}px solid transparent`,
        borderBottom: `${size}px solid var(--surface-popover)`,
        filter: "drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.10))",
        zIndex: 2,
      }}
    />
  );
}

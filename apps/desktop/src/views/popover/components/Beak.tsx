export function Beak() {
  return (
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
        filter: "drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.10))",
        zIndex: 2,
      }}
    />
  );
}

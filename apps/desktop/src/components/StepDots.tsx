// Onboarding progress dots — the active step is a wider pill.
export interface StepDotsProps {
  count: number;
  active: number;
}

export function StepDots({ count, active }: StepDotsProps) {
  return (
    <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          style={{
            width: i === active ? 16 : 6,
            height: 6,
            borderRadius: 999,
            background: i === active ? "var(--accent)" : "var(--fill-tertiary)",
            transition:
              "width var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)",
          }}
        />
      ))}
    </span>
  );
}

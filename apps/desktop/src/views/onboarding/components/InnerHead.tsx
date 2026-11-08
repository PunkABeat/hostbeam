import { t } from "../../../i18n";
import { Ic } from "@hostbeam/ui";
import { StepDots } from "../../../components/StepDots";

export function InnerHead({
  title,
  onBack,
  step,
}: {
  title: string;
  onBack?: () => void;
  step: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "12px 16px",
        borderBottom: "1px solid var(--separator)",
      }}
    >
      {onBack ? (
        <button
          onClick={onBack}
          aria-label={t("common.back")}
          data-back
          style={{
            border: 0,
            background: "transparent",
            cursor: "pointer",
            color: "var(--label-secondary)",
            display: "inline-flex",
            padding: 2,
            marginLeft: -4,
            borderRadius: 5,
          }}
        >
          <Ic name="chevron-left" size={18} />
        </button>
      ) : (
        <img src="/assets/hostbeam-mark.svg" width="18" height="18" alt="" />
      )}
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--label)" }}>{title}</span>
      <span className="hb-push">
        <StepDots count={3} active={step} />
      </span>
    </div>
  );
}

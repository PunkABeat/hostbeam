// Animated brand mark (the beam) — the product's one expressive motion.
// state: "uploading" (slices pulse up the beam), "landing" (node pops + ring
// blooms once), or "idle" (static logo). CSS keyframes live in each shell's
// index.html, gated behind prefers-reduced-motion.
export interface BeamMarkProps {
  size?: number;
  state?: "uploading" | "landing" | "idle";
  /** The drop shadow lifts the mark off a page; inside a QR code it would
   * smudge the modules around it, so QrCode turns it off. */
  shadow?: boolean;
}

export function BeamMark({ size = 58, state = "uploading", shadow = true }: BeamMarkProps) {
  const cls =
    "bm" + (state === "uploading" ? " bm-uploading" : state === "landing" ? " bm-landing" : "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      className={cls}
      style={shadow ? { filter: "drop-shadow(0 6px 14px rgba(25,48,110,.28))" } : undefined}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bm-g" x1="512" y1="64" x2="512" y2="960" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5A95FF" />
          <stop offset="1" stopColor="#2A66EC" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="232" fill="url(#bm-g)" />
      <rect width="1024" height="512" rx="232" fill="#fff" opacity="0.07" />
      <circle
        className="bm-ring"
        cx="512"
        cy="250"
        r="56"
        fill="none"
        stroke="#fff"
        strokeWidth="16"
      />
      <circle
        className="bm-el bm-node"
        cx="512"
        cy="250"
        r="50"
        fill="#fff"
        style={{ animationDelay: ".36s" }}
      />
      <path
        className="bm-el"
        d="M462 362 H562"
        stroke="#fff"
        strokeWidth="46"
        strokeLinecap="round"
        style={{ animationDelay: ".24s" }}
      />
      <path
        className="bm-el"
        d="M430 454 H594"
        stroke="#fff"
        strokeWidth="46"
        strokeLinecap="round"
        style={{ animationDelay: ".12s" }}
      />
      <path
        className="bm-el"
        d="M392 546 H632"
        stroke="#fff"
        strokeWidth="46"
        strokeLinecap="round"
        style={{ animationDelay: "0s" }}
      />
      <rect x="360" y="616" width="304" height="226" rx="48" fill="#fff" />
      <rect x="404" y="664" width="216" height="130" rx="22" fill="url(#bm-g)" opacity="0.26" />
    </svg>
  );
}

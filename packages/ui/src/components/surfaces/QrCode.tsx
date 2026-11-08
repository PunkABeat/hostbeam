import qrcode from "qrcode-generator";

import { BeamMark } from "../BeamMark";

/**
 * A QR code with the app icon in the middle.
 *
 * The icon is not decoration the scanner has to survive by luck: the modules
 * underneath it are cleared, and the code is generated at error-correction
 * level Q, which recovers a quarter of the data. The icon covers about a
 * quarter of the width, so roughly 6% of the area — a quarter of what Q
 * tolerates — and sits far enough from the three corner finder patterns to
 * leave them alone.
 *
 * Not level H, which is the usual advice for logo codes: H is for logos that
 * cover a fifth of the *area*, and it buys that tolerance with more, smaller
 * modules. For the worst payload the app produces — a host with a long AWS
 * hostname — H needs 73 modules where Q needs 65, which at the size the
 * pairing sheet shows is 2.7px per module against 3.1px. Bigger modules are
 * worth more than unused headroom to a phone camera pointed at a screen.
 *
 * Nothing is painted behind the icon: the cleared modules are simply
 * transparent, so whatever the code sits on shows through as its margin, in
 * light and dark alike.
 */
export interface QrCodeProps {
  /** What the code encodes. */
  value: string;
  /** Rendered width and height, in px. */
  size?: number;
  /** Module colour. */
  fill?: string;
  /** Accessible name. Without one the code is hidden from assistive tech, which
   * is right when the same information is on the page as text. */
  label?: string;
}

/** How much of the code the icon takes, as a fraction of its width. */
const ICON_SHARE = 0.24;

/**
 * Where the icon sits, in module units. Exported for tests: these numbers are
 * what keep the code scannable, so they are worth asserting rather than
 * eyeballing.
 *
 * Module counts are always odd, so an odd `hole` puts the icon dead centre; an
 * even one would leave a lopsided half-module margin. The hole is also kept
 * nine modules clear of every edge, because the three corner finder patterns
 * are seven modules plus a separator and a scanner locks onto those before it
 * reads a single bit. On the smallest codes that leaves no room worth having,
 * and a `hole` of 0 means: draw no icon.
 */
export function qrIconLayout(count: number) {
  let hole = Math.min(Math.round(count * ICON_SHARE), count - 18);
  if (hole % 2 === 0) hole -= 1;
  if (hole < 5) return { hole: 0, start: 0, icon: 0 };
  return { hole, start: (count - hole) / 2, icon: hole - 2 };
}

export function QrCode({ value, size = 200, fill = "#000", label }: QrCodeProps) {
  const qr = qrcode(0, "Q");
  qr.addData(value);
  qr.make();
  const count = qr.getModuleCount();
  const { hole, start, icon } = qrIconLayout(count);
  const end = start + hole;

  const cells: string[] = [];
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      const underIcon = hole > 0 && r >= start && r < end && c >= start && c < end;
      if (qr.isDark(r, c) && !underIcon) cells.push(`M${c},${r}h1v1h-1z`);
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${count} ${count}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* crispEdges on the modules only — it would jag the icon's curves. */}
      <path className="hb-qr-modules" d={cells.join("")} fill={fill} shapeRendering="crispEdges" />
      {hole > 0 && (
        <g transform={`translate(${start + 1} ${start + 1}) scale(${icon / 1024})`}>
          <BeamMark size={1024} state="idle" shadow={false} />
        </g>
      )}
    </svg>
  );
}

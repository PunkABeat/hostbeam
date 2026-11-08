import { Ic } from "@hostbeam/ui";
import { DMG_URL } from "../lib/links";

// Pricing (ADR 0031, which retires the license of ADR 0014 / 0028): every
// feature is free with no limit, on the Mac and the iPhone, and there is
// nothing to buy. The section keeps its id — /#pricing is linked from the nav,
// the 404 page and older posts — and says plainly that licenses are no longer
// sold, because a reader who met the $29 license elsewhere deserves the answer
// here rather than a page that pretends it never existed.
export default function Pricing() {
  const points = [
    "Every feature, no limit, on the Mac and the iPhone",
    "No account, fully offline, all your SSH hosts",
    "No reminder, no license, nothing to buy",
  ];
  return (
    <section
      id="pricing"
      style={{
        padding: "84px 0",
        background: "color-mix(in srgb, var(--paper-raised) 55%, var(--paper))",
        borderTop: "1px solid var(--hairline)",
      }}
    >
      <div className="wrap">
        <h2 className="h2" style={{ textAlign: "center" }}>Free. That is the pricing.</h2>
        <p className="sub" style={{ textAlign: "center", margin: "16px auto 0" }}>
          Hostbeam is free to use, for good. It used to offer a $29 license that hid a
          reminder; the reminder is gone and licenses are no longer sold.
        </p>

        <div className="tiers" style={{ gridTemplateColumns: "1fr", maxWidth: 440 }}>
          <div className="tier">
            <p className="tier-name">Free</p>
            <p className="tier-price">$0<small>for as long as you like</small></p>
            <ul>
              {points.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <div className="tier-cta">
              <a className="btn btn-primary" href={DMG_URL} style={{ width: "100%" }}>
                <Ic name="upload" size={16} /> Download for Mac
              </a>
            </div>
          </div>
        </div>

        <p className="note" style={{ textAlign: "center", marginTop: 20 }}>
          Bought a license before? A key you activated keeps working, and the app has every feature either way.
        </p>
      </div>
    </section>
  );
}

// The Q&A itself lives in lib/faq.ts, because lib/seo.ts renders the same
// words as FAQPage structured data and the two must not drift.
import { FAQ } from "../lib/faq";

export default function Faq() {
  return (
    <section id="faq" style={{ padding: "84px 0" }}>
      <div className="wrap" style={{ maxWidth: 880 }}>
        <h2 className="h2" style={{ marginBottom: 44 }}>Good questions.</h2>
        <div className="faq-grid">
          {FAQ.map((item) => (
            <div key={item.q} style={{ padding: "20px 0", borderTop: "1px solid var(--hairline)" }}>
              <h3 className="faq-q">{item.q}</h3>
              <p className="faq-a">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

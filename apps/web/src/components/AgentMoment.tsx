// The insight that motivates the whole product, shown as the moment it
// happens: your agent can't see your screen — Hostbeam is how you show it.
export default function AgentMoment() {
  return (
    <section style={{ padding: "0 0 84px" }}>
      <div className="wrap" style={{ maxWidth: 880 }}>
        {/* The ssh line is the point of the strip: without it the prompt reads
            as a terminal on your own Mac, where pasting the image would just
            work and Hostbeam looks pointless. */}
        <div className="term" aria-label="A terminal on the Mac, connected over SSH to a server where a coding agent asks for a screenshot, and the pasted path arrives as the image">
          <div><span className="t-dim">mac ~ %</span> ssh prod-box</div>
          <div><span className="t-dim">dev@prod-box:~/app$</span> claude</div>
          <div><span className="t-dim">›</span> The layout breaks on mobile. Can you show me what you're seeing?</div>
          <div>
            <span className="t-dim">›</span> <span className="t-beam">[Image #1]</span> this is what I get
            <span className="t-caret" aria-hidden="true" />
          </div>
          <div><span className="t-land">✓</span> I see it. The nav wraps under 390px. Fixing.</div>
        </div>
        <p className="note" style={{ textAlign: "center", marginTop: 16 }}>
          Your agent runs on the server, and over SSH your terminal only sends it text, so a
          picture you paste never arrives. Hostbeam puts the picture on the server and copies its
          path. Paste that, and the agent gets the picture.
        </p>
        <p className="note" style={{ textAlign: "center", marginTop: 6 }}>
          Or skip the paste: with Hostbeam's MCP server on the host, the agent opens the screenshot
          itself.{" "}
          <a href="/agents/" style={{ color: "var(--beam)" }}>
            Set it up →
          </a>
        </p>
      </div>
    </section>
  );
}

// The privacy argument, made by the diagram itself: the beam's path routes
// around the ghosted "cloud" node it never touches.
function BypassFigure() {
  return (
    <svg viewBox="0 0 520 240" role="img" aria-label="Diagram: what you beam travels from your device to your host over SSH, bypassing any cloud service" style={{ width: "100%", height: "auto", display: "block" }}>
      {/* device */}
      <rect x="18" y="96" width="96" height="60" rx="10" fill="var(--paper-raised)" stroke="var(--hairline)" />
      <text x="66" y="122" textAnchor="middle" fill="var(--ink)" fontSize="13">Your Mac</text>
      <text x="66" y="140" textAnchor="middle" fill="var(--ink-faint)" fontSize="11">or iPhone</text>
      {/* host */}
      <rect x="406" y="96" width="96" height="60" rx="10" fill="var(--paper-raised)" stroke="var(--hairline)" />
      <text x="454" y="122" textAnchor="middle" fill="var(--ink)" fontSize="13">Your host</text>
      <text x="454" y="140" textAnchor="middle" fill="var(--ink-faint)" fontSize="10.5" fontFamily="var(--font-mono-site)">/tmp/hostbeam</text>
      {/* ghosted cloud, off the path */}
      <g opacity="0.55">
        <path d="M225 44c0-13 11-23 24-23 10 0 18 5 22 13 2-1 5-2 8-2 11 0 20 9 20 20 0 12-9 20-20 20h-52c-11 0-19-8-19-19 0-10 8-18 17-19z" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" strokeDasharray="4 4" transform="translate(15, 0)" />
        <text x="276" y="55" textAnchor="middle" fill="var(--ink-faint)" fontSize="11.5">Someone's cloud</text>
        <line x1="243" y1="18" x2="309" y2="82" stroke="var(--ink-faint)" strokeWidth="1.5" />
      </g>
      {/* the beam: straight through, under the cloud. Only the labels that are
          values a reader could type stay in the mono face. */}
      <line x1="114" y1="126" x2="406" y2="126" stroke="var(--beam)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="260" cy="126" r="4.5" fill="var(--beam)" />
      <text x="260" y="152" textAnchor="middle" fill="var(--beam)" fontSize="12">Your SSH, your keys, your config</text>
      <text x="260" y="216" textAnchor="middle" fill="var(--ink-faint)" fontSize="11.5">No account, no relay, no telemetry</text>
    </svg>
  );
}

export default function Privacy() {
  return (
    <section id="privacy" style={{ padding: "84px 0" }}>
      <div className="wrap split">
        <div>
          <h2 className="h2">Nothing in the middle.</h2>
          <p className="sub">
            What you beam goes from your device to your server over your own SSH, the same
            connection you already trust. No Hostbeam account, no cloud bucket, no telemetry.
            We never see the file; there's no “us” in the path.
          </p>
          <p className="sub" style={{ marginTop: 14 }}>
            The same rule sets up the iPhone: its key is installed through access you already
            have. <b style={{ color: "var(--ink)" }}>Hostbeam inherits your access. It never
            creates it.</b>
          </p>
          {/* The cleanup claim, kept inside what beam.rs actually guarantees:
              artifact_match() matches hostbeam-*.<ext> only, -maxdepth 1 so it
              is never recursive, -type f so it is never a directory, and the
              folder itself is never removed. Deliberately says "when you ask" —
              automatic cleanup does not exist and is not planned. */}
          <p className="sub" style={{ marginTop: 14 }}>
            And nothing is left on your host that you can't take back. Preferences shows what
            Hostbeam has put on a host and deletes it when you ask — top level only, never
            recursive. <b style={{ color: "var(--ink)" }}>It can only remove what it
            created.</b>
          </p>
          <p style={{ marginTop: 22 }}>
            <a href="/privacy/" style={{ fontSize: 13.5, color: "var(--beam)", fontWeight: 500 }}>
              Read the privacy policy →
            </a>
          </p>
        </div>
        <div className="plate" style={{ padding: "28px 24px" }}>
          <BypassFigure />
        </div>
      </div>
    </section>
  );
}

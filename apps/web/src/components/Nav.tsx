import { Ic } from "@hostbeam/ui";

export default function Nav() {
  return (
    <nav className="nav">
      <div className="wrap nav-in">
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <img src="/assets/hostbeam-mark.svg" width="22" height="22" alt="" />
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)" }}>Hostbeam</span>
        </a>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <a className="nav-link nav-hide-sm" href="/#how">How it works</a>
          <a className="nav-link nav-hide-sm" href="/#iphone">iPhone</a>
          <a className="nav-link nav-hide-sm" href="/#privacy">Privacy</a>
          <a className="nav-link nav-hide-sm" href="/#pricing">Pricing</a>
          {/* The changelog is the site's best evidence that a one-person tool
              is still being worked on. It was only in the footer. */}
          <a className="nav-link nav-hide-sm" href="/changelog/">Changelog</a>
          <a className="nav-link nav-hide-sm" href="/#faq">FAQ</a>
          <button id="theme-toggle" className="theme-toggle" type="button" aria-label="Switch between light and dark">
            <svg className="tt-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
            </svg>
            <svg className="tt-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          </button>
          <a className="btn btn-primary btn-sm" href="https://download.hostbeam.app/Hostbeam.dmg" style={{ marginLeft: 8 }}>
            <Ic name="upload" size={15} /> Download
          </a>
        </div>
      </div>
    </nav>
  );
}

// Structured data for the home page.
//
// Two audiences read this and neither of them reads the marketing copy: search
// engines building a rich result, and the coding agents Hostbeam exists to
// serve — when someone asks their assistant "how do I get a screenshot onto my
// dev box", this is what the assistant has to go on. So it states the same
// facts the page does, in the same words, and never a fact the page doesn't
// make: that it is free to use, the one-time price, the platforms, and that
// there is no account and no server in the path.
//
// Keep it honest and keep it in sync. A schema that claims a rating or a review
// count nobody wrote is the kind of thing that gets a site's rich results
// dropped, and it would contradict everything else on the page.
import { FAQ } from "./faq";
import { APP_STORE_URL, BREW_COMMAND, DMG_URL } from "./links";

export const SITE = "https://hostbeam.app";

export function homeJsonLd(site: string = SITE) {
  const url = (p: string) => new URL(p, site).toString();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": url("/#website"),
        url: site,
        name: "Hostbeam",
        description:
          "Beam a screenshot, or any file you hand it, from your Mac menu bar or iPhone share sheet straight to your own server over SSH. Paste the path it copies and your coding agent gets the picture itself.",
        publisher: { "@id": url("/#publisher") },
        inLanguage: "en",
      },
      {
        "@type": "Organization",
        "@id": url("/#publisher"),
        name: "PunkABeat",
        url: site,
        logo: url("/assets/hostbeam-icon.svg"),
        email: "support@hostbeam.app",
      },
      {
        "@type": "SoftwareApplication",
        "@id": url("/#app"),
        name: "Hostbeam",
        applicationCategory: "DeveloperApplication",
        applicationSubCategory: "Screenshot utility",
        operatingSystem: "macOS 13 or later, iOS 17 or later",
        url: site,
        downloadUrl: DMG_URL,
        installUrl: APP_STORE_URL,
        softwareHelp: url("/changelog"),
        publisher: { "@id": url("/#publisher") },
        description:
          "Copy a screenshot, press one hotkey, and Hostbeam uploads it to the SSH host you choose using the keys and ~/.ssh/config you already have. Your clipboard comes back holding its path on that box, and pasted into Claude Code, Codex, Gemini CLI or OpenCode running there it arrives as the image itself. No account, no cloud relay, no telemetry, nothing installed on the server.",
        featureList: [
          "One global hotkey beams the screenshot on your clipboard",
          "Any file you hand it, up to 100 MB: copy one in Finder, drop it on the menu-bar icon, or share it from the iPhone",
          "Uploads over your own SSH — your keys, your ~/.ssh/config, no relay",
          "Copies back the remote path, which coding agents attach as the picture itself",
          "Reads the hosts already in ~/.ssh/config, with live reachability",
          "An iPhone companion that beams from the share sheet, paired by QR from the Mac",
          "Available in English, French, Japanese, Spanish, German, Chinese, Portuguese and Korean",
        ],
        // One offer, free: licenses are no longer sold (ADR 0031).
        offers: [
          {
            "@type": "Offer",
            name: "Free",
            price: "0",
            priceCurrency: "USD",
            description:
              "Every feature, with no limit, no account and no reminder, on the Mac and the iPhone. Nothing to buy.",
            url: url("/pricing"),
            availability: "https://schema.org/InStock",
          },
        ],
        // Not a claim about popularity — just the fact that installing it is one
        // command, which is the question a developer actually asks.
        softwareRequirements: "macOS 13 or later; an SSH host you can already reach",
        potentialAction: {
          "@type": "ConsumeAction",
          name: "Install with Homebrew",
          instrument: BREW_COMMAND,
        },
      },
      {
        // Word for word what the page's FAQ section shows — same import, so
        // they cannot drift apart and get the rich result withdrawn.
        "@type": "FAQPage",
        "@id": url("/#faq"),
        mainEntity: FAQ.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };
}

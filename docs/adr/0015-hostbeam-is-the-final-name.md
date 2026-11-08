# ADR 0015: Hostbeam Is the Final Name

Status: Accepted. Supersedes ADR 0004.

Date: 2026-07-04.

## Context

ADR 0004 kept the name provisional pending a clearance pass. Meanwhile the name
quietly hardened across the product: the bundle id and Keychain service
(`com.hostbeam.app`), the Keygen account/product, the Paddle product, the
marketing copy and design system vocabulary ("beam", BeamMark, "Beam to"), and
the assumed domain in the checkout page, license emails, and worker CORS.

A clearance pass ran on 2026-07-04:

- **Domains**: `hostbeam.app` was unregistered and has now been **registered**
  (Cloudflare Registrar, same account as the license worker). `hostbeam.dev`
  was also available. `hostbeam.com` is an unrelated 2005 domain-for-sale page;
  `hostbeam.net` is an empty server. Neither is a product.
- **Collisions**: no software product named "Hostbeam" was found. Nearest
  neighbors (BeamHost game-server hosting, Beam cloud platform, BeamStacks
  agency) are distinct spaces; "Screenbeam"-style alternatives were rejected
  precisely because they collide with real companies.
- **Alternatives** (Shotbeam, Hostdrop, Beamport, Shotwire, …) were weighed and
  none beat Hostbeam on meaning, distinctiveness, or field freedom.

## Decision

Hostbeam is the product's final name. The `<PROJECT_NAME>` placeholder and the
"provisional name" caveats are retired, including the disclaimer in the About
pane.

## Consequences

- `hostbeam.app` is the canonical domain (registered); `.com` stays with its
  squatter — buyable later if ever worth it, not a launch dependency.
- Remaining diligence, accepted as a small open risk rather than a blocker: a
  formal trademark search (USPTO/EUIPO classes 9/42) before or alongside the
  packaging milestone. Web-level search found no mark and the word is coined.
- Docs and rules that referenced the provisional status (README, AGENTS.md,
  research questions, the About-pane string) are updated by this ADR's change.

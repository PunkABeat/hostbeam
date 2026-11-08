# Product

Hostbeam is a menu-bar screenshot bridge for remote coding agents.

Its first product purpose is to move a local clipboard screenshot to a selected normal SSH server or dev box with minimal interruption, then copy a coding-agent friendly sentence containing the resulting remote file path back to the local clipboard.

## Intended User

The primary user is a developer running coding-agent sessions on a normal SSH server or dev box who needs to give that remote agent a local screenshot without breaking flow.

## Core Job

Move a local clipboard screenshot to a selected SSH host and return pasteable text for a remote coding-agent session.

## Product Principles

- The experience should feel nearly magical: natural, smooth, and obvious in hindsight.
- Minimal interruption beats broad feature coverage.
- Use the developer's existing SSH setup.
- Prefer explicit local control over cloud services.
- Keep credential handling outside the app wherever possible.
- Build a native-feeling utility rather than a dashboard.
- Keep initial scope narrow until the first safe behavior slice is proven.
- Optimize for fast successful upload over broad file-management behavior.
- Keep the default copied text directly useful to a coding agent.
- Keep setup skippable and use just-in-time prompts when needed.
- Treat polish as product substance. Every visible detail, delay, prompt, label, and failure state should feel intentional.

## Product Scope Stages

### Milestone 002: Technical First Proof

Milestone 002 remains a technical first proof only:

- Scaffold the desktop app.
- Discover SSH config hosts.
- Keep UI minimal and only sufficient to prove discovery.
- Do not implement upload, clipboard image reading, hotkeys, menu-bar behavior, notifications, history, or saved hosts.

### First Usable Product

The first usable product should be:

- macOS first.
- Menu-bar utility first, with no normal main window unless needed.
- Global hotkey plus menu-bar access.
- Clipboard-screenshot upload only.
- Upload to the selected/default host immediately.
- Show a tiny host picker only if no host is selected.
- Keep the image pending and continue upload after host selection when possible.
- Copy the remote path: `/tmp/hostbeam/hostbeam-1789274900500.png`. Pasted into a
  coding agent on that host, it arrives as the picture itself (ADR 0006's
  2026-09-28 amendment). A sentence around it is an option.
- Include only the remote path in the copied text, not the host name.
- Feel fast, polished, and calm enough that the core flow almost disappears.

## Quality Bar

Hostbeam should feel world class, not merely functional.

The product should show that every detail counts:

- The happy path should feel instant or near-instant whenever the underlying SSH work allows it.
- UI should stay compact, clear, and native-feeling.
- Copy should be short, warm, precise, and never noisy.
- Transitions, loading states, errors, and confirmations should feel calm and deliberate.
- Setup should never feel like paperwork.
- Settings and history should stay available without making the core flow feel heavier.
- Failure handling should preserve trust: do not overwrite clipboard content on failure, do not hide important errors, and do not expose sensitive details.
- Visual design should be restrained, polished, and highly legible at small menu-bar utility sizes.

### Later Expansion

Broader arbitrary file transfer may become part of the product later, but only after the screenshot workflow proves useful.

**Decided 2026-09-26 (ADR 0006 amendment):** the screenshot workflow proved
itself, and any file the user hands over is now in scope — dropped, copied in
Finder, shared from the iPhone, or passed with `open -a`. Browsing the disk or
the server and syncing stay out. Shipped on the Mac in 0.1.30 (2026-09-27): a
100 MB cap a file, a held "send anyway?" for anything that looks like a secret,
and Clean up matching only names that carry Hostbeam's stamp. The iPhone
followed on 2026-09-27, through its share sheet (`docs/process/next.md` § 10).

## Default Non-Goals

- No cloud accounts by default.
- No relay service by default.
- No hosted infrastructure by default.
- No private key or SSH credential storage. (On iOS, where no system OpenSSH
  or agent exists, ADR 0016 amends this: the companion app generates and holds
  a dedicated, device-bound key in the iOS Keychain — never the user's
  existing keys, never exported, revoked by removing one `authorized_keys`
  line. The macOS principle is unchanged.)
- No broad file manager behavior.
- No team sharing model in the initial product.
- No arbitrary file transfer in the first usable product. (Since 2026-09-26,
  any file the user hands over is in scope; browsing and syncing are not —
  ADR 0006's amendment.)
- No interactive password or passphrase flow in the first usable product.
- No editing `~/.ssh/config`.

## Host Management

- Discover hosts from existing SSH config first.
- Let the user add or remove discovered hosts from Hostbeam's own host list.
- Removing a host from Hostbeam must never edit SSH config.
- Hostbeam-specific hosts may be added later.
- Setup can finish with no selected hosts.
- If upload is triggered without a selected host, prompt just in time and continue the upload when a host is selected.

## Upload Defaults

- Default remote folder: `/tmp/hostbeam`.
- Create `/tmp/hostbeam` automatically on upload.
- Allow per-host remote folder customization later.
- Default filename format: `hostbeam-<epoch milliseconds>.png`, one stamp per
  gesture, composed the same way by both apps. The agent tools read that stamp
  to tell which files arrived together, so it stays first and in milliseconds.
  A file handed over keeps its own name and extension behind the stamp
  (`hostbeam-<stamp>-report.pdf`), or no extension if it had none; Clean up
  recognises Hostbeam's files by that stamp alone.
- Never overwrite remote files; add a suffix if a collision occurs.
- Require non-interactive SSH readiness for the first usable product.

## Clipboard Output

- Default copied text: just `{remote_path}`; several files, their paths on one
  line a space apart. Claude Code, Codex, Gemini CLI and OpenCode attach a
  pasted image path as the image (ADR 0006's 2026-09-28 amendment; Codex and
  OpenCode take one per paste).
- Optional: a sentence around the path, suggested as `Use this screenshot:
  {remote_path}`, one line per file. With words around it most agents see text,
  not the picture, so it is off by default. For a file that is not a picture,
  the suggested sentence says `Use this file: {remote_path}` instead; a
  template the user wrote is never rewritten.
- Do not include the host name in the copied text by default.

## History

- Keep recent uploads with previews by default.
- Make history easy to disable and clear.
- Show recent history from the menu-bar surface, likely the last five items directly.
- Show thumbnail plus copied text/path.
- Default retention: 7 days.
- Store local full image copies for 7 days.
- Use a default local history folder first and allow changing it later.
- Remote cleanup after retention is undecided and requires product/security review.

## Setup

- First-run setup should optimize for fastest path to a workable product.
- Setup should always be skippable.
- Setup should let the user pick hosts from discovered SSH config, choose a default host, and choose or confirm the global hotkey.
- Setup should show the default remote folder and copied text format as read-only defaults with "change later in settings" messaging.
- If setup is skipped, use just-in-time prompts later.

## Failure Behavior

- If the clipboard has no image, show a quiet notification: `No image in clipboard`.
- If the selected host is unreachable, fail quietly, keep the clipboard unchanged, and show a small retry/change-host prompt.
- Check reachability only when needed to avoid background network activity.
- Completion/failure-only feedback is acceptable for the first usable product.
- Later feedback should include at least a simple uploading state.
- Success notification should include the copied sentence/path and may include a thumbnail if practical.
- User-friendly errors should be paired with a diagnostics/details view for developers.
- Diagnostics must never include image contents, private key paths, credential details, full remote paths, or unredacted hostnames/usernames.

## Later Directions

These are product directions, not current implementation scope:

- Command-palette style host switching.
- Saved host preferences beyond the first simple host list.
- Upload destination templates.
- Custom copied-text templates.
- Manual file picker from the menu bar.
- Drag-and-drop upload.
- Optional clipboard screenshot detection and upload offer.
- Interactive password or passphrase flows after explicit UX and security review.
- Arbitrary file transfer after screenshot workflow validation.

## First Implementation Bias

The first implementation milestone should scaffold the desktop app and prove SSH config host discovery only. It should not implement clipboard image reading, upload, hotkeys, menu-bar presence, notifications, saved hosts, or recent history unless a later decision explicitly opens that scope.

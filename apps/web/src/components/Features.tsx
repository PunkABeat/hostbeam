// The spec sheet: mono keys, plain-prose values. A tool's data sheet, not a
// service's feature grid — every row is a real, shipped behavior.
export default function Features() {
  const rows = [
    {
      k: "hotkey",
      v: <><b>⌘⇧7 from any app</b>, full-screen or not. No window to surface, no menu to open. Just beam.</>,
    },
    {
      k: "any file",
      v: <>Not just screenshots: <b>copy a file in Finder and beam it</b>, drop it on the menu-bar icon, or open it with Hostbeam. Up to 100 MB, sent as it is. A <b>.env</b> or a private key waits for your yes first.</>,
    },
    {
      k: "menu bar",
      v: <>A quiet glyph that animates while a beam is in flight. Click it for the popover, or never look at it at all.</>,
    },
    {
      k: "paste",
      v: <>What you paste is the file's path on your server, and <b>your agent attaches it as the picture itself</b>, not a line of text: Claude Code, Codex, Gemini CLI and OpenCode all do. Nothing to install on the server.</>,
    },
    {
      k: "~/.ssh/config",
      v: <>Every host you already have, discovered and searchable. Pick a default, switch in a click, beam to any of them.</>,
    },
    {
      k: "recent",
      v: <>Every beam, with its preview, one click from your clipboard again. A file shows up in Finder from the same row.</>,
    },
    {
      k: "reachability",
      v: <>Live dots on every host: green before you beam, diagnostics in plain language when something's off.</>,
    },
    {
      k: "storage",
      v: <>See what Hostbeam left on a host and clean it up in one click. It only ever touches files it named.</>,
    },
    {
      k: "updates",
      v: <>The Mac app updates itself, quietly. A dot appears when a new version is ready; one click installs it.</>,
    },
    {
      k: "languages",
      v: <>English, French, Japanese, Spanish, German, Chinese, Portuguese, and Korean, on both apps.</>,
    },
  ];
  return (
    <section id="features" style={{ padding: "84px 0" }}>
      <div className="wrap" style={{ maxWidth: 880 }}>
        <h2 className="h2" style={{ maxWidth: "18em" }}>Built like a tool, not a service.</h2>
        <div className="spec" style={{ marginTop: 44 }}>
          {rows.map((r) => (
            <div key={r.k} className="spec-row">
              <span className="spec-key">{r.k}</span>
              <span className="spec-val">{r.v}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

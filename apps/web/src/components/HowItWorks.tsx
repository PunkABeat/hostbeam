import { Ic } from "@hostbeam/ui";

// Three steps on one drawn line. The order is real information — it is the
// actual path a file takes — so the line stays. The timing annotations that
// used to hang off each step ("t+0.4s · in flight") did not survive the
// product's own rule that mono is for values you could type.
export default function HowItWorks() {
  const stations = [
    {
      icon: "clipboard",
      title: "Copy a screenshot",
      body: "Cmd-Shift-4, a snip from any tool. Anything that lands a PNG on your clipboard works, and so does a file you copy in Finder.",
    },
    {
      icon: "zap",
      title: "Beam it",
      body: "One hotkey, from any app. Hostbeam uploads it to your chosen host over your own SSH: the same keys, the same config, nothing new to trust.",
    },
    {
      icon: "terminal",
      title: "Paste it",
      body: "Your clipboard now holds the file's path on your server. Paste it to Claude Code, Codex, Gemini CLI or OpenCode and it attaches the picture itself, as if you were working locally.",
    },
  ];
  return (
    <section id="how" style={{ padding: "84px 0" }}>
      <div className="wrap split" style={{ alignItems: "start" }}>
        <div>
          <h2 className="h2">On the Mac: clipboard to remote path in one keystroke.</h2>
          <p className="sub">
            No window to find, no file to drag, no upload dialog. The whole loop is muscle memory;
            most beams land before you've switched back to the terminal.
          </p>
        </div>
        <div className="rail" style={{ paddingTop: 6 }}>
          {stations.map((s) => (
            <div key={s.title} className="station">
              <span className="station-dot"><Ic name={s.icon} size={12} stroke={2.4} /></span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

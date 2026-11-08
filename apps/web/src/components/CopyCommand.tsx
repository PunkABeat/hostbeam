import { Fragment, useEffect, useRef, useState } from "react";
import { Ic } from "@hostbeam/ui";

// The install command, with the one affordance a terminal command needs: a way
// to take it without selecting it. Copying the line and pasting it is the same
// gesture Hostbeam itself is built around, so the button confirms the way the
// app does — a state change on the control, no toast, no bounce.
export default function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Without this the timeout can fire after the island unmounts, and a stray
  // setState on a dead component is a warning in dev and a leak in principle.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      // Clipboard access can be refused (insecure context, denied permission).
      // Say nothing and leave the text selectable — it is right there.
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <span className="copycmd">
      <code className="mono">
        {command.split(" ").map((word, i) => (
          <Fragment key={i}>
            {i > 0 && " "}
            <span className="copycmd-word">{word}</span>
          </Fragment>
        ))}
      </code>
      <button
        type="button"
        onClick={copy}
        className="copycmd-btn"
        aria-label={copied ? "Command copied" : `Copy “${command}” to the clipboard`}
      >
        <Ic name={copied ? "check" : "clipboard"} size={14} stroke={copied ? 2.6 : 2} />
      </button>
      {/* Announced to screen readers; the icon swap carries it visually. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </span>
  );
}

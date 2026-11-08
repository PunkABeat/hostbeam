// The FAQ, in one place.
//
// It is rendered twice: as the page's own FAQ section, and as FAQPage structured
// data (lib/seo.ts) that search engines and coding agents read. Google drops
// FAQ rich results when the markup and the visible page disagree, so there is
// exactly one copy of these words and both consumers import it.
export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ: FaqItem[] = [
  {
    q: "Where do my screenshots end up?",
    a: "In /tmp/hostbeam on the host you pick, by default. You can set a different folder per host, and the Storage view shows what Hostbeam has left there, with a one-click clean-up that only ever touches files Hostbeam named.",
  },
  {
    q: "Can I beam files that aren't screenshots?",
    a: "Yes. On the Mac, copy a file in Finder and press the shortcut, or drop it on the popover or the menu-bar icon; on the iPhone, share it to Hostbeam. It lands in the same folder, up to 100 MB a file, and its path is on your clipboard. Anything that looks like a secret, such as a .env or a private key, waits for you to confirm. Folders aren't sent.",
  },
  {
    q: "Do I need a Hostbeam account?",
    a: "No. Hostbeam uses the hosts already in your ~/.ssh/config and your existing keys. There's nothing to sign up for.",
  },
  {
    q: "Which hosts work?",
    a: "Anything you can ssh into: entries from your ~/.ssh/config, or a host you type in by hand. If ssh works, Hostbeam works.",
  },
  {
    q: "Isn't this just scp?",
    a: "It is scp. Hostbeam runs your system ssh and scp with your own config, then handles the parts a one-liner usually doesn't: the host key is checked before anything sends, a remote name never overwrites a file, your clipboard is untouched if a beam fails, and a batch that stops halfway tells you which files landed. The iPhone has no scp to run, so the app does the same work there.",
  },
  {
    q: "How does the iPhone app connect?",
    a: "The Mac app shows a QR for any host; the phone scans it and generates its own SSH key, which never leaves the phone. You authorize that key through access you already have — once per host, though only the first is manual: after that your Mac remembers the phone and adds it to the next host in a click. Hostbeam inherits your access; it never creates it.",
  },
  {
    q: "What's the fastest way to beam from the iPhone?",
    a: "Pick your favorite: the share sheet from any screenshot, a Home Screen widget that beams your latest screenshot in one tap, or the “Beam last screenshot” shortcut. The shortcut beams in the background without opening the app, and works with Back Tap (double-tap the back of your phone), Control Center, and the Action Button.",
  },
  {
    q: "Does my agent get the picture, or just a path?",
    a: "The picture. Hostbeam copies the file's path on your server, and when you paste a path to an image, Claude Code, Codex, Gemini CLI and OpenCode attach the image itself, just as they do on your own machine. Several screenshots at once attach as several pictures in Claude Code and Gemini CLI; Codex and OpenCode take one at a time and see the rest as paths they can still open.",
  },
  {
    q: "Can I add words around the path?",
    a: "Yes, in settings on either app: add a sentence around the {path} token, such as “Use this screenshot: {path}”. With words around it, most agents see a line of text rather than the picture, so it's off by default.",
  },
  {
    q: "Can my agent read the screenshot without me pasting the path?",
    a: "Yes, with Hostbeam's MCP server installed on the host. The agent asks it for your latest beam and gets the image itself. It only reads the screenshots Hostbeam beamed to that folder, and it never changes anything. It's free, open source and one command to set up.",
  },
  {
    q: "What if a beam fails?",
    a: "Hostbeam tells you why in plain language (host unreachable, key refused, folder not writable) and offers a retry or inline diagnostics. Your clipboard is never touched on failure.",
  },
  {
    q: "Is Hostbeam free?",
    a: "Yes: every feature, with no limit, on the Mac and the iPhone, for as long as you like. No account, no reminder, nothing to buy.",
  },
  {
    q: "Wasn't there a $29 license?",
    a: "There was, until November 2026: it hid a reminder the Mac showed now and then. The reminder is gone and licenses are no longer sold. A key you activated keeps working, and the app has every feature either way.",
  },
  {
    q: "Do I have to pay for updates?",
    a: "No. Every update is free, however long Hostbeam runs.",
  },
  {
    q: "What ever leaves my machine?",
    a: "What you beam, to your host, over your SSH, and the daily check for updates. That's the whole list: no analytics, no crash reporters, no phone-home.",
  },
];

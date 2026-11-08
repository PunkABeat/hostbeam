// The key half of a recorded shortcut, read from the physical key rather than
// the character it produced. With Shift held, `e.key` for the 7 key is `&` on
// a US layout (and something else on every other layout), so the recorder used
// to save `cmd+shift+&` — a combo Rust could not register. `e.code` names the
// key itself (`Digit7`, `KeyA`) whatever the modifiers and layout.

/** Codes with a name of their own in the shortcut vocabulary. */
const NAMED: Record<string, string> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Enter: "enter",
  NumpadEnter: "enter",
  Space: "space",
  Tab: "tab",
};

const MODIFIERS = new Set(["Meta", "Control", "Alt", "Shift"]);

/** The key token to record for a keydown, or null when the press is only a
 *  modifier. Letters and digits come from the physical key; anything else keeps
 *  the character, which is what the recorder always did for punctuation. */
export function hotkeyKeyFrom(e: { key: string; code: string }): string | null {
  if (MODIFIERS.has(e.key)) return null;
  const named = NAMED[e.code];
  if (named) return named;
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(e.code);
  if (digit) return digit[1];
  const letter = /^Key([A-Z])$/.exec(e.code);
  if (letter) return letter[1];
  if (/^F\d{1,2}$/.test(e.code)) return e.code;
  return e.key.length === 1 ? e.key.toUpperCase() : e.key;
}

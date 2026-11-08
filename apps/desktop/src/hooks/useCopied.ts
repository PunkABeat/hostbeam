import { useEffect, useRef, useState } from "react";

/** The "copied" tick beside whatever was just copied: which id, for a moment.
 *  Marking a second id replaces the first; unmounting clears the timer. */
export function useCopied(holdMs = 1400): [string | null, (id: string) => void] {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const mark = (id: string) => {
    setCopiedId(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopiedId((c) => (c === id ? null : c)), holdMs);
  };
  return [copiedId, mark];
}

import { useEffect, useState } from "react";

import { BeamMark } from "@hostbeam/ui";

// Welcome hero: the signature beam — pulses up once, lands, then rests static.
export function WelcomeBeam() {
  const [st, setSt] = useState<"uploading" | "landing" | "idle">("uploading");
  useEffect(() => {
    const t1 = setTimeout(() => setSt("landing"), 1350);
    const t2 = setTimeout(() => setSt("idle"), 2050);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  return <BeamMark size={64} state={st} />;
}

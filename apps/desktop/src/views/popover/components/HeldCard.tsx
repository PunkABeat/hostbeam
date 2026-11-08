import { Button, Ic } from "@hostbeam/ui";

import { t } from "../../../i18n";
import type { Held } from "../../../lib/ipc";
import { WarningNote } from "./WarningNote";

export interface HeldCardProps {
  held: Held;
  hostName: string;
  onSend: () => void;
  onCancel: () => void;
}

/** A beam stopped before anything left the Mac: a file looks like a secret —
 *  a `.env`, a private key, a credentials file — and a folder on a shared
 *  server is the wrong place for one by mistake. Nothing was sent or spent.
 *
 *  "Don't send" is the focused default. Rust opens the popover to ask, which
 *  takes key focus from wherever the user was typing, so the next Return must
 *  never be the one that sends the key. */
export function HeldCard({ held, hostName, onSend, onCancel }: HeldCardProps) {
  const [first] = held.flagged;
  const title =
    held.flagged.length === 1
      ? t("pop.heldTitle", { name: first ?? "" })
      : t("pop.heldTitleMany", { n: held.flagged.length });
  return (
    <WarningNote title={title} detail={t("pop.heldDetail", { host: hostName })}>
      <div style={{ display: "flex", gap: 9 }}>
        <Button variant="secondary" size="sm" block data-primary onClick={onCancel}>
          {t("pop.dontSend")}
        </Button>
        <Button
          variant="danger"
          size="sm"
          block
          icon={<Ic name="upload" size={13} />}
          onClick={onSend}
        >
          {t("pop.sendAnyway")}
        </Button>
      </div>
    </WarningNote>
  );
}

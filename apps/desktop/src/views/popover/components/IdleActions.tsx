import { Button, Ic, Keycap } from "@hostbeam/ui";

import { t } from "../../../i18n";

export interface IdleActionsProps {
  canBeam: boolean;
  checking: boolean;
  /** A dropped file was refused: say so, briefly, in place of the hint. */
  refused: boolean;
  hotkey: string[];
  /** How many files a copy in Finder left on the clipboard — the button says
   *  "Beam file" for those rather than "Beam screenshot". 0 for a picture. */
  clipFiles: number;
  onBeam: () => void;
}

/** The Beam button and the line beneath it. */
export function IdleActions({
  canBeam,
  checking,
  refused,
  hotkey,
  clipFiles,
  onBeam,
}: IdleActionsProps) {
  return (
    <>
      <Button
        variant="primary"
        size="lg"
        block
        data-primary
        disabled={!canBeam}
        icon={<Ic name="upload" size={15} />}
        onClick={onBeam}
      >
        {clipFiles === 0
          ? t("pop.beam")
          : clipFiles === 1
            ? t("pop.beamFile")
            : t("pop.beamFiles", { n: clipFiles })}
      </Button>
      {refused ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            textAlign: "center",
            color: "var(--warning)",
            fontSize: 11,
            lineHeight: 1.4,
          }}
        >
          <Ic name="alert-triangle" size={12} stroke={2.1} style={{ flex: "none" }} />
          {t("pop.dropRefused")}
        </div>
      ) : canBeam ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            flexWrap: "nowrap",
            color: "var(--label-tertiary)",
            fontSize: 11,
          }}
        >
          <span style={{ whiteSpace: "nowrap" }}>{t("pop.orPress")}</span>
          <Keycap keys={hotkey} />
        </div>
      ) : !checking ? (
        // Both ways in, at the moment someone has neither: the clipboard
        // is empty and the button is disabled. Wraps rather than clipping,
        // because this line is longer in most languages than in English.
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            textAlign: "center",
            lineHeight: 1.4,
            color: "var(--label-tertiary)",
            fontSize: 11,
          }}
        >
          <Ic name="clipboard" size={12} stroke={2.1} style={{ flex: "none" }} />{" "}
          {t("pop.copyToBeam")}
        </div>
      ) : null}
      {!canBeam && !checking && !refused ? (
        // The shortcut is how most beams happen, and the empty state is
        // the one screen a newcomer sees first — so it says so here too,
        // on its own line, since the line above already wraps.
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            flexWrap: "nowrap",
            color: "var(--label-tertiary)",
            fontSize: 11,
          }}
        >
          <Keycap keys={hotkey} />
          <span style={{ whiteSpace: "nowrap" }}>{t("pop.hotkeyBeams")}</span>
        </div>
      ) : null}
    </>
  );
}

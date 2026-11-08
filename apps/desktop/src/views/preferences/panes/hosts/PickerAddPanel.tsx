import React from "react";

import { Button, Field, Ic, Spinner } from "@hostbeam/ui";

import { ReachBadge } from "../../../../components/ReachBadge";
import { t } from "../../../../i18n";

/** Inline "add" panel shown when a picker row is expanded: set the remote
 *  folder and optionally test the connection before committing the host. */
export function PickerAddPanel({
  defaultFolder,
  test,
  onTest,
  onAdd,
}: {
  defaultFolder?: string;
  test?: string;
  onTest: () => void;
  onAdd: (folder: string) => void;
}) {
  const [folder, setFolder] = React.useState(defaultFolder || "/tmp/hostbeam");
  const outcome = test || "idle";
  return (
    <div style={{ padding: "12px 13px 13px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 11.5, color: "var(--label-tertiary)" }}>
          {t("field.remoteFolder")}
        </span>
        <Field
          mono
          value={folder}
          placeholder={defaultFolder}
          onChange={(e) => setFolder(e.target.value)}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Button variant="secondary" size="sm" disabled={outcome === "testing"} onClick={onTest}>
          {outcome === "testing" ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Spinner size={12} /> {t("ob.testing")}
            </span>
          ) : outcome === "idle" ? (
            t("ob.test")
          ) : (
            t("prefs.retest")
          )}
        </Button>
        <ReachBadge
          state={outcome}
          okLabel={t("ob.reachable")}
          failLabel={t("prefs.unreachable")}
        />
        <span className="hb-push">
          <Button
            variant="primary"
            size="sm"
            icon={<Ic name="plus" size={14} stroke={2.4} />}
            onClick={() => onAdd(folder)}
          >
            {t("prefs.addToHostbeam")}
          </Button>
        </span>
      </div>
    </div>
  );
}

import React from "react";

import { Button, Field, Spinner } from "@hostbeam/ui";
import { ReachBadge } from "../../../components/ReachBadge";
import { manualTarget, testHost } from "../../../lib/ipc";
import { t } from "../../../i18n";
import { type PrefHost } from "../shared";
import { Sheet } from "../components/Sheet";

/* --- Add a host manually --------------------------------------------- */
export interface AddHostInput {
  name: string;
  user: string;
  address: string;
  folder: string;
  online: boolean;
}

export function AddHostSheet({
  existing,
  defaultFolder,
  onClose,
  onSave,
}: {
  existing: PrefHost[];
  defaultFolder?: string;
  onClose: () => void;
  onSave: (host: AddHostInput) => void;
}) {
  const [name, setName] = React.useState("");
  const [user, setUser] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [folder, setFolder] = React.useState(defaultFolder || "/tmp/hostbeam");
  const [test, setTest] = React.useState("idle"); // idle | testing | ok | fail
  const nameTaken = existing.some(
    (h) => (h.name as string).toLowerCase() === name.trim().toLowerCase(),
  );
  const valid = name.trim() && user.trim() && address.trim() && !nameTaken;

  // a fresh address invalidates a prior test result
  React.useEffect(() => {
    setTest("idle");
  }, [address, user]);

  const runTest = () => {
    if (!address.trim() || test === "testing") return;
    setTest("testing");
    testHost(manualTarget(user, address))
      .then((r) => setTest(r.ok ? "ok" : "fail"))
      .catch(() => setTest("fail"));
  };
  const save = () => {
    if (valid)
      onSave({
        name: name.trim(),
        user: user.trim(),
        address: address.trim(),
        folder: folder.trim() || "/tmp/hostbeam",
        online: test !== "fail",
      });
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && valid) save();
  };

  return (
    <Sheet
      title={t("ob.addHostTitle")}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            {t("prefs.cancel")}
          </Button>
          <Button variant="primary" size="md" disabled={!valid} onClick={save}>
            {test === "fail" ? t("ob.addAnyway") : t("ob.addHostBtn")}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }} onKeyDown={onKey}>
        <Field
          label={t("field.name")}
          placeholder="prod-box"
          value={name}
          onChange={(e) => setName(e.target.value)}
          invalid={!!nameTaken}
          help={nameTaken ? t("prefs.nameTaken") : undefined}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field
              label={t("field.user")}
              mono
              placeholder="dev"
              value={user}
              onChange={(e) => setUser(e.target.value)}
            />
          </div>
          <div style={{ flex: 2, minWidth: 0 }}>
            <Field
              label={t("field.address")}
              mono
              placeholder={t("prefs.addressExample")}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>
        <Field
          label={t("field.remoteFolder")}
          mono
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 2 }}>
          <Button
            variant="secondary"
            size="sm"
            disabled={!address.trim() || test === "testing"}
            onClick={runTest}
          >
            {test === "testing" ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Spinner size={12} /> {t("ob.testing")}
              </span>
            ) : (
              t("ob.testConnection")
            )}
          </Button>
          <ReachBadge
            state={test}
            okLabel={t("ob.reachable")}
            failLabel={t("ob.couldntConnect")}
            nowrap
          />
          {test === "idle" ? (
            <span style={{ fontSize: 11.5, color: "var(--label-tertiary)" }}>
              {t("prefs.optionalCheck")}
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--label-tertiary)" }}>
          {(() => {
            const tgt = `${user.trim() || "user"}@${address.trim() || "address"}`;
            const p = t("prefs.connectsAs").split("{target}");
            return (
              <>
                {p[0]}
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--label-secondary)" }}>
                  {tgt}
                </span>
                {p[1] || ""}
              </>
            );
          })()}
        </div>
      </div>
    </Sheet>
  );
}

import { useEffect, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { Ic } from "@hostbeam/ui";
import { Button, Field, Spinner } from "@hostbeam/ui";
import { ReachBadge } from "../../../components/ReachBadge";
import { t } from "../../../i18n";
import { manualTarget, testHost } from "../../../lib/ipc";
import type { ManualSpec, TestState } from "../shared";

// Inline manual-add — shown when ~/.ssh/config is empty, or on demand.
export function ManualAdd({
  emptyConfig,
  onAdd,
  onSkip,
}: {
  emptyConfig: boolean;
  onAdd: (spec: ManualSpec) => void;
  onSkip: () => void;
}) {
  const [name, setName] = useState("");
  const [user, setUser] = useState("");
  const [address, setAddress] = useState("");
  const [folder, setFolder] = useState("/tmp/hostbeam");
  const [test, setTest] = useState<TestState>("idle");
  const valid = name.trim() && user.trim() && address.trim();
  useEffect(() => {
    setTest("idle");
  }, [address, user]);
  const runTest = () => {
    if (!address.trim() || test === "testing") return;
    setTest("testing");
    testHost(manualTarget(user, address))
      .then((r) => setTest(r.ok ? "ok" : "fail"))
      .catch(() => setTest("fail"));
  };
  const add = () => {
    if (valid)
      onAdd({
        name: name.trim(),
        user: user.trim(),
        address: address.trim(),
        folder: folder.trim() || "/tmp/hostbeam",
        online: test !== "fail",
      });
  };
  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && valid) add();
  };
  return (
    <div
      style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 13 }}
      onKeyDown={onKey}
    >
      {emptyConfig ? (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span
            style={{
              flex: "none",
              width: 30,
              height: 30,
              borderRadius: "var(--radius-md)",
              background: "var(--fill-tertiary)",
              color: "var(--label-tertiary)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ic name="server" size={16} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--label)" }}>
              {t("ob.noHostsInConfig")}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: "var(--label-secondary)",
                lineHeight: 1.45,
                marginTop: 2,
              }}
            >
              {t("ob.addByHand")}
            </div>
          </div>
        </div>
      ) : null}
      <Field
        label={t("field.name")}
        placeholder="prod-box"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div style={{ display: "flex", gap: 9 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Field
            label={t("field.user")}
            mono
            placeholder="dev"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
        </div>
        <div style={{ flex: 1.7, minWidth: 0 }}>
          <Field
            label={t("field.address")}
            mono
            placeholder="10.4.0.12"
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
      <div style={{ display: "flex", alignItems: "center", gap: 9, minHeight: 24 }}>
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
        <ReachBadge state={test} okLabel={t("ob.reachable")} failLabel={t("ob.couldntConnect")} />
        {test === "idle" ? (
          <span style={{ fontSize: 11, color: "var(--label-tertiary)" }}>{t("ob.optional")}</span>
        ) : null}
      </div>
      <Button
        variant="primary"
        size="lg"
        block
        disabled={!valid}
        icon={<Ic name="plus" size={15} stroke={2.4} />}
        onClick={add}
      >
        {test === "fail" ? t("ob.addAnyway") : t("ob.addHostBtn")}
      </Button>
      <Button variant="ghost" size="sm" block onClick={onSkip}>
        {t("ob.skipChooseLater")}
      </Button>
    </div>
  );
}

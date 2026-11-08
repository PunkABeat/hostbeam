// Preferences → License (ADR 0014, amended by ADR 0028). Shows the plan —
// free, with the reminder now and then, or the activated license — activates
// a purchased key against the Rust core, and frees this Mac's seat. The Rust
// core owns the store and decides when the reminder is due; this pane is a
// thin view over its license_* commands.
import { useEffect, useState } from "react";

import { Badge, Button, Field, Ic, Spinner } from "@hostbeam/ui";
import { isTauri, licenseSeats } from "../../../lib/ipc";
import {
  activateLicense,
  deactivateLicense,
  fetchLicenseStatus,
  openPurchasePage,
  PRICE,
  type LicenseStatus,
} from "../../../lib/license";
import { Group, Label, Row } from "../components/SettingsGroup";
import { t } from "../../../i18n";

/* Stable command-error code → i18n key (src-tauri/src/error.rs to_code). */
const ERROR_KEYS: Record<string, string> = {
  license_invalid: "license.errInvalid",
  license_seats: "license.errSeats",
  license_network: "license.errNetwork",
  license_storage: "license.errStorage",
  license_unconfigured: "license.errUnconfigured",
};

export function LicensePane() {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  // "Devices: n of 3" — fetched once per licensed render of the pane.
  const [seats, setSeats] = useState<number | null>(null);
  const tier = status?.tier;
  useEffect(() => {
    if (!tier || tier === "free" || !isTauri()) return;
    let live = true;
    licenseSeats()
      .then((n) => live && setSeats(n ?? -1))
      .catch(() => live && setSeats(-1));
    return () => {
      live = false;
    };
  }, [tier]);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [errKey, setErrKey] = useState<string | null>(null);

  useEffect(() => {
    fetchLicenseStatus()
      .then(setStatus)
      .catch(() => {});
  }, []);

  const activate = () => {
    const trimmed = key.trim();
    if (busy || !trimmed) return;
    setBusy(true);
    setErrKey(null);
    activateLicense(trimmed)
      .then((s) => {
        setStatus(s);
        setKey("");
      })
      .catch((e) => setErrKey(ERROR_KEYS[String(e || "")] ?? "license.errNetwork"))
      .finally(() => setBusy(false));
  };

  const deactivate = () => {
    if (busy) return;
    setBusy(true);
    setErrKey(null);
    deactivateLicense()
      .then(setStatus)
      .catch(() => {})
      .finally(() => setBusy(false));
  };

  if (!status) {
    return (
      <Group>
        <Row first>
          <Spinner size={14} />
          <Label title={t("prefs.logsLoading")} />
        </Row>
      </Group>
    );
  }

  const licensed = status.tier !== "free";

  if (licensed) {
    return (
      <div>
        <Group
          title={t("license.plan")}
          footnote={status.tier === "grace" ? t("license.graceSub") : t("license.licensedFoot")}
        >
          <Row first>
            <Label title={t("license.licensed")} sub={status.keyMasked} />
            <span className="hb-push">
              <Badge tone="success" dot>
                {t("license.active")}
              </Badge>
            </span>
          </Row>
          <Row>
            <Label title={t("license.allUpdates")} />
          </Row>
          {seats !== null && seats >= 0 ? (
            <Row>
              <Label title={t("license.devices")} />
              <span className="hb-push hb-fg-secondary" style={{ fontSize: 12 }}>
                {t("license.devicesOf", { n: String(seats) })}
              </span>
            </Row>
          ) : null}
        </Group>
        <Group footnote={t("license.deactivateFoot")}>
          <Row first>
            <Label title={t("license.deactivate")} />
            <span className="hb-push">
              <Button variant="secondary" size="md" disabled={busy} onClick={deactivate}>
                {busy ? t("prefs.checking") : t("license.deactivateBtn")}
              </Button>
            </span>
          </Row>
        </Group>
      </div>
    );
  }

  // Licensing is retired (ADR 0031): the Mac is free, with nothing to buy and
  // no key to enter. A key activated before lands in the licensed branch above,
  // and changes nothing.
  if (status.retired) {
    return (
      <Group title={t("license.plan")} footnote={t("license.retiredFoot")}>
        <Row first>
          <Label title={t("license.freePlan")} sub={t("license.retiredSub")} />
        </Row>
      </Group>
    );
  }

  return (
    <div>
      <Group title={t("license.plan")} footnote={t("license.freeFoot")}>
        <Row first>
          <Label title={t("license.freePlan")} sub={t("license.freePlanSub")} />
        </Row>
      </Group>
      <Group title={t("license.buyTitle")} footnote={t("license.buyFoot", { price: PRICE })}>
        <Row first>
          <Label title={t("license.buy")} sub={t("license.buySub")} />
          <span className="hb-push">
            <Button
              variant="primary"
              size="md"
              icon={<Ic name="zap" size={14} />}
              onClick={() => openPurchasePage()}
            >
              {t("license.buyBtn")}
            </Button>
          </span>
        </Row>
      </Group>
      <Group title={t("license.enterTitle")} footnote={t("license.enterFoot")}>
        <Row first align="flex-start">
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field
              mono
              value={key}
              placeholder={t("license.keyPlaceholder")}
              invalid={!!errKey}
              help={errKey ? t(errKey) : undefined}
              onChange={(e) => {
                setKey(e.target.value);
                setErrKey(null);
              }}
              inputProps={{
                spellCheck: false,
                autoCapitalize: "off",
                autoCorrect: "off",
                onKeyDown: (e) => {
                  if (e.key === "Enter") activate();
                },
              }}
            />
          </div>
          <Button variant="secondary" size="md" disabled={busy || !key.trim()} onClick={activate}>
            {busy ? t("license.activating") : t("license.activate")}
          </Button>
        </Row>
      </Group>
    </div>
  );
}

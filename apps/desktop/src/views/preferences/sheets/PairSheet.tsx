import React from "react";

import { Button, Ic, QrCode, Spinner } from "@hostbeam/ui";
import { useCopied } from "../../../hooks/useCopied";
import { copyText, installPubkey, isTauri, resolvePorts, sshTarget } from "../../../lib/ipc";
import { t } from "../../../i18n";
import { type PrefHost } from "../shared";
import { Sheet } from "../components/Sheet";
import { encodeHostPayload, hostPayload } from "../../../lib/hostPairing";
import { PUBKEY_RE, deviceName, fingerprint } from "../../../lib/deviceKeys";
import type { PairedDevice } from "../../../types/config";

/* --- Share host to iPhone (QR pairing, ADR 0017) ---------------------- */
/* Renders the pairing link (lib/hostPairing) as an inline-SVG QR. The iPhone's
 * Camera app opens it in Hostbeam; Hostbeam's own scanner reads it too.
 * Connection info only — never key material. The same link is offered to copy,
 * so it can be AirDropped or messaged to the phone and tapped. */
export function PairSheet({
  host,
  devices,
  present,
  onAuthorized,
  onClose,
}: {
  host: PrefHost;
  devices: PairedDevice[];
  /** Device ids this host is known to hold, from the reachability probe.
   *  `undefined` means unknown — the host has not answered — in which case
   *  every device is simply offered, which is what this sheet always did. */
  present?: string[];
  onAuthorized: (device: PairedDevice) => void;
  onClose: () => void;
}) {
  // The target shape both backend commands below expect (lib/ipc).
  const target = sshTarget(host);

  // The desktop models no port (it beams `ssh <alias>` and lets OpenSSH resolve
  // one), so the payload's port has to be asked of `ssh -G`. Nothing renders
  // until it lands: a QR that showed 22 and then corrected itself would be the
  // same silently-wrong prefill this exists to remove, only narrower.
  const [port, setPort] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (!isTauri()) {
      setPort(22); // browser dev — no backend to ask.
      return;
    }
    let live = true;
    const settle = (value: Record<string, number> | null) => {
      const port = value?.[target];
      if (live) setPort(typeof port === "number" ? port : 22);
    };
    resolvePorts([target]).then(settle, () => settle(null));
    return () => {
      live = false;
    };
  }, [target]);

  // Both the QR and the readout below come from the same object, so what the
  // user reads is by construction what the phone will receive.
  const fields = React.useMemo(
    () => (port === null ? null : hostPayload(host, port)),
    [host, port],
  );
  const payload = React.useMemo(
    () => (port === null ? null : encodeHostPayload(host, port)),
    [host, port],
  );
  const [copiedId, markCopied] = useCopied();
  const copied = copiedId === "link";

  // Authorize leg: paste the phone's public key; the Rust side appends it to
  // authorized_keys over the user's existing SSH access (validated both ends).
  const [pubkey, setPubkey] = React.useState("");
  const [auth, setAuth] = React.useState<"idle" | "busy" | "ok" | "err">("idle");
  const [busyDevice, setBusyDevice] = React.useState<string | null>(null);
  const [learned, setLearned] = React.useState<string | null>(null);
  const keyLooksRight = PUBKEY_RE.test(pubkey.trim());

  /// Installs one public key on this host. Idempotent on the Rust side
  /// (`grep -qxF ||`), so authorizing a device twice is a no-op rather than a
  /// duplicated line.
  const installKey = (key: string, deviceId: string | null) => {
    if (!isTauri() || auth === "busy" || busyDevice) return;
    setBusyDevice(deviceId);
    setAuth("busy");
    installPubkey(target, key)
      .then(async () => {
        setAuth("ok");
        // Remember it, so the next host needs no phone in hand (ADR 0018).
        // Keyed by fingerprint, which is the device's identity.
        const id = await fingerprint(key);
        if (id) {
          onAuthorized({
            id,
            name: deviceName(key),
            key,
            addedAt: Date.now(),
            lastUsedAt: Date.now(),
          });
          // Say that it was learned. Silently gaining state the user cannot see
          // is how this feature looked broken on first use: the list only fills
          // on the first paste, so before that there is nothing to show and no
          // hint that pasting is what fills it.
          if (deviceId === null) setLearned(deviceName(key));
        }
      })
      .catch(() => setAuth("err"))
      .finally(() => setBusyDevice(null));
  };

  const install = () => installKey(pubkey.trim(), null);

  return (
    <Sheet title={t("prefs.pairTitle")} onClose={onClose} width={604}>
      {/* Two jobs, side by side: show the QR to scan, and authorize the phone's
          key on this host. Stacked, they came to ~628px in a ~442px box — the
          sheet scrolled while 380px of the window's width sat unused. They wrap
          back to one column if the window is dragged narrow. */}
      <div
        style={{
          padding: "10px 18px 18px",
          display: "flex",
          gap: 22,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 240px", minWidth: 240, textAlign: "center" }}>
          <p className="hb-fg-secondary" style={{ fontSize: 12, margin: "0 0 14px" }}>
            {t("prefs.pairBody")}
          </p>
          <div
            style={{
              display: "inline-block",
              padding: 14,
              background: "#fff",
              borderRadius: 12,
              border: "1px solid var(--separator)",
            }}
          >
            {payload !== null ? (
              <QrCode value={payload} size={200} fill="#000" label={t("prefs.pairTitle")} />
            ) : (
              // Same 200×200 footprint, so resolving the port costs no layout jump.
              <div
                style={{
                  width: 200,
                  height: 200,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Spinner />
              </div>
            )}
          </div>
          {/* The same info as text (design doc §6) — data only, so it needs no
           * translated strings, and it's what you compare against the phone's
           * confirm form field-for-field. */}
          {fields ? (
            <div style={{ marginTop: 12, lineHeight: 1.5 }}>
              <div
                className="hb-mono"
                style={{ fontSize: 11.5, color: "var(--label)", wordBreak: "break-all" }}
              >
                {fields.user}@{fields.hostname}:{fields.port}
              </div>
              <div
                className="hb-mono hb-fg-secondary"
                style={{ fontSize: 11, wordBreak: "break-all" }}
              >
                {fields.folder}
              </div>
            </div>
          ) : null}
          <div style={{ marginTop: 14 }}>
            <Button
              variant="secondary"
              size="sm"
              disabled={payload === null}
              onClick={() => {
                if (payload === null) return;
                copyText(payload).catch(() => {});
                markCopied("link");
              }}
            >
              {copied ? t("prefs.pairCopied") : t("prefs.pairCopy")}
            </Button>
          </div>
        </div>

        {/* authorize the iPhone: paste its public key, install over SSH */}
        <div style={{ flex: "1 1 240px", minWidth: 240, textAlign: "left" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--label)" }}>
            {t("prefs.pairAuthTitle")}
          </div>
          {/* Devices this Mac has authorized before (ADR 0018). One click each,
           * and deliberately not automatic on adding a host: silently granting a
           * phone access to a new server is a decision, not a side effect. */}
          {devices.length > 0 ? (
            <div style={{ margin: "8px 0 10px" }}>
              {devices.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 0",
                    borderBottom: "1px solid var(--separator)",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, color: "var(--label)" }}>{d.name}</div>
                    <div
                      className="hb-mono hb-fg-secondary"
                      style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {d.id}
                    </div>
                  </div>
                  {present?.includes(d.id) ? (
                    // The host itself said it holds this key. Installing again
                    // is harmless, but offering it is a small untruth — and the
                    // host row, which knows the same thing, would disagree.
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        color: "var(--success)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Ic name="check" size={12} stroke={2.4} />
                      {t("prefs.deviceAlready")}
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busyDevice !== null || auth === "busy"}
                      onClick={() => installKey(d.key, d.id)}
                    >
                      {t("prefs.pairAuthorizeDevice")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : null}
          <p className="hb-fg-secondary" style={{ fontSize: 11.5, margin: "6px 0 10px" }}>
            {devices.length > 0 ? t("prefs.pairAuthBodyMore") : t("prefs.pairAuthBody")}
            {devices.length === 0 ? ` ${t("prefs.pairAuthFirstTime")}` : null}
          </p>
          <input
            value={pubkey}
            onChange={(e) => {
              setPubkey(e.target.value);
              if (auth !== "busy") setAuth("idle");
            }}
            placeholder="ssh-ed25519 …"
            spellCheck={false}
            autoCapitalize="off"
            style={{
              width: "100%",
              boxSizing: "border-box",
              height: 26,
              padding: "0 8px",
              border: "1px solid var(--separator)",
              borderRadius: "var(--radius-md)",
              background: "var(--fill-secondary)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--label)",
              outline: "none",
            }}
          />
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 9 }}>
            <Button
              variant="primary"
              size="sm"
              disabled={!keyLooksRight || auth === "busy"}
              onClick={install}
            >
              {t("prefs.pairAuthInstall", { host: host.name || host.id })}
            </Button>
            {auth === "ok" ? (
              <span style={{ fontSize: 11.5, color: "var(--success)", fontWeight: 500 }}>
                {learned
                  ? t("prefs.pairAuthRemembered", { device: learned })
                  : t("prefs.pairAuthDone")}
              </span>
            ) : auth === "err" ? (
              <span style={{ fontSize: 11.5, color: "var(--danger)" }}>
                {t("prefs.pairAuthFail")}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

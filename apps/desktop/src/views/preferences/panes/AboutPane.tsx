import React from "react";
import type { ReactNode } from "react";

import { LogicalPosition } from "@tauri-apps/api/dpi";
import { Menu, MenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu";

import { Ic } from "@hostbeam/ui";
import { Button, Spinner } from "@hostbeam/ui";
import { MAC_CHANGELOG_URL } from "../../../lib/changelog";
import {
  appVersion,
  copyShareLink,
  isTauri,
  openUrl,
  sendFeedback as sendFeedbackToRust,
  shareHostbeam as openSystemShareMenu,
  takeUpdateCheck,
  updateCheck,
  updateInstall,
} from "../../../lib/ipc";
import { useRustMessage } from "../../../lib/rust-bridge";
import { SHARE_NETWORKS, shareUrl, WEBSITE } from "../../../lib/share-links";
import { t } from "../../../i18n";
import { LicensesSheet } from "../sheets/LicensesSheet";
import { LogsSheet } from "../sheets/LogsSheet";

// Real links open via the Rust side (open_url is https-only); the href is a
// browser-dev fallback so the dev sim still navigates. Module-scope on
// purpose: defined inside the pane it was a new component every render, so
// React remounted every link whenever a spinner ticked.
function Link({ url, children }: { url: string; children?: ReactNode }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => {
        if (isTauri()) {
          e.preventDefault();
          openUrl(url);
        }
      }}
      style={{ color: "var(--accent)", textDecoration: "none", fontSize: 12 }}
      onMouseEnter={(e) => {
        e.currentTarget.style.textDecoration = "underline";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.textDecoration = "none";
      }}
    >
      {children}
    </a>
  );
}

export function AboutPane({
  onReset,
  skippedVersion,
  onSkipUpdate,
}: {
  onReset: () => void;
  /** The version the user skipped (`updateDismissed`), if any. */
  skippedVersion?: string | null;
  onSkipUpdate: (version: string | null) => void;
}) {
  const [confirm, setConfirm] = React.useState(false);
  const [logsOpen, setLogsOpen] = React.useState(false);
  const [licensesOpen, setLicensesOpen] = React.useState(false);
  const [version, setVersion] = React.useState("0.1.0");
  React.useEffect(() => {
    appVersion()
      .then((v) => v && setVersion(v))
      .catch(() => {});
  }, []);
  // idle | checking | latest | available | installing | error
  const [upd, setUpd] = React.useState("idle");
  const [updVersion, setUpdVersion] = React.useState<string | null>(null);
  const [updNotes, setUpdNotes] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 3000);
    return () => clearTimeout(t);
  }, [confirm]);
  const checkUpdate = () => {
    if (upd === "checking" || upd === "installing") return;
    setUpd("checking");
    if (!isTauri()) {
      // Browser dev: no updater — keep the design's happy-path beat.
      setTimeout(() => setUpd("latest"), 1400);
      return;
    }
    updateCheck()
      .then((s) => {
        setUpdVersion(s.version ?? null);
        setUpdNotes(s.notes ?? null);
        setUpd(s.available ? "available" : "latest");
      })
      .catch(() => setUpd("error"));
  };
  // The tray's Check for updates… asks here, because this is where the answer
  // can be shown. Two ways in, one ask: the flag is for a Preferences window
  // that did not exist yet, the call for one that is already open and will
  // not mount again. Whoever gets there first drains it, and `checkUpdate`
  // ignores a second ask while one is running.
  useRustMessage("checkUpdates", () => {
    takeUpdateCheck().catch(() => {});
    checkUpdate();
  });
  React.useEffect(() => {
    if (!isTauri()) return;
    takeUpdateCheck()
      .then((asked) => {
        if (asked) checkUpdate();
      })
      .catch(() => {});
    // On mount only: a later render must not re-run a check nobody asked for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Skipping here is the popover's "Skip for now": this version stops being
  // announced, dots included, until a newer one comes out. It stays installable
  // from this pane. Written through Preferences' config like every pane's
  // settings: a store instance of its own here held a copy of the whole config
  // and wrote that back, which reset the appearance.
  const skipUpdate = () => onSkipUpdate(updVersion);
  const installUpdate = () => {
    if (!isTauri() || upd === "installing") return;
    setUpd("installing");
    // On success the app relaunches; only failures come back.
    updateInstall().catch(() => setUpd("error"));
  };
  // Feedback and feature requests reach the same inbox, told apart by subject.
  const sendFeedback = (kind: "feedback" | "feature") => {
    if (isTauri()) sendFeedbackToRust(kind);
    else {
      const subject = kind === "feature" ? "Hostbeam feature request" : "Hostbeam feedback";
      window.open(`mailto:support@hostbeam.app?subject=${subject} (v${version})`);
    }
  };
  // "Share Hostbeam": a native menu under the button. macOS dropped its built-in
  // social share services, so its own share menu offers only AirDrop, Messages
  // and local apps; each network here opens that network's post-a-link page,
  // prefilled (lib/share-links.ts), through the https-only open_url. Copy Link
  // and More… (the system menu, share.rs) use the link fixed in Rust (ADR 0023).
  const [shareCopied, setShareCopied] = React.useState(false);
  React.useEffect(() => {
    if (!shareCopied) return;
    const t = setTimeout(() => setShareCopied(false), 1600);
    return () => clearTimeout(t);
  }, [shareCopied]);
  const shareHostbeam = async (button: HTMLElement) => {
    if (!isTauri()) {
      window.open(WEBSITE, "_blank");
      return;
    }
    const r = button.getBoundingClientRect();
    const words = { text: t("prefs.shareText"), title: t("prefs.shareTitle") };
    const systemMenu = () =>
      openSystemShareMenu(words.text, {
        x: r.left,
        y: r.top,
        width: r.width,
        height: r.height,
      }).catch(() => {});
    try {
      const networks = await Promise.all(
        SHARE_NETWORKS.map(({ id, label }) =>
          MenuItem.new({
            text: label,
            action: () => openUrl(shareUrl(id, words)),
          }),
        ),
      );
      const menu = await Menu.new({
        items: [
          ...networks,
          await PredefinedMenuItem.new({ item: "Separator" }),
          await MenuItem.new({
            text: t("prefs.shareCopyLink"),
            action: () => {
              copyShareLink()
                .then(() => setShareCopied(true))
                .catch(() => {});
            },
          }),
          await MenuItem.new({ text: t("prefs.shareMore"), action: () => void systemMenu() }),
        ],
      });
      await menu.popup(new LogicalPosition(r.left, r.bottom + 4));
    } catch {
      // No native menu to be had: the system share menu still works.
      await systemMenu();
    }
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "18px 0 8px",
        gap: 9,
      }}
    >
      <img src="/assets/hostbeam-icon.svg" width="72" height="72" alt="" />
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "var(--label)" }}>Hostbeam</div>
        <div
          style={{
            fontSize: 12,
            color: "var(--label-secondary)",
            marginTop: 2,
            fontFamily: "var(--font-mono)",
            whiteSpace: "nowrap",
          }}
        >
          {t("prefs.aboutVersion", { v: version })}
        </div>
      </div>
      <div
        style={{ fontSize: 12.5, color: "var(--label-secondary)", maxWidth: 320, lineHeight: 1.5 }}
      >
        {t("prefs.aboutDesc")}
      </div>

      {/* update check */}
      <div
        style={{
          minHeight: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        }}
      >
        {upd === "idle" ? (
          <Button
            variant="secondary"
            size="sm"
            icon={<Ic name="rotate-cw" size={13} />}
            onClick={checkUpdate}
          >
            {t("prefs.checkUpdates")}
          </Button>
        ) : upd === "checking" || upd === "installing" ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 12,
              color: "var(--label-secondary)",
            }}
          >
            <Spinner size={13} />{" "}
            {upd === "installing" ? t("prefs.updateInstalling") : t("prefs.logsLoading")}
          </span>
        ) : upd === "available" ? (
          <span
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 10,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "flex-end",
                flexWrap: "wrap",
                gap: 9,
              }}
            >
              <span style={{ fontSize: 12, color: "var(--label-secondary)" }}>
                {t("prefs.updateAvailable", { v: updVersion ?? "" })}
              </span>
              {updVersion && skippedVersion !== updVersion ? (
                <Button variant="ghost" size="sm" onClick={skipUpdate}>
                  {t("pop.updateSkip")}
                </Button>
              ) : null}
              <Button
                variant="primary"
                size="sm"
                icon={<Ic name="upload" size={13} />}
                onClick={installUpdate}
              >
                {t("prefs.updateInstall")}
              </Button>
            </span>
            {/* What the update actually contains, straight from CHANGELOG.md via
                latest.json. Deciding whether to install is easier with the list
                than without it. `pre-wrap` keeps the
                plain-text shape the changelog already produces — no parsing here,
                so there is nothing to get subtly wrong. */}
            {updNotes ? (
              <span
                style={{
                  display: "block",
                  maxWidth: 340,
                  maxHeight: 220,
                  overflowY: "auto",
                  textAlign: "left",
                  whiteSpace: "pre-wrap",
                  fontSize: 11.5,
                  lineHeight: 1.5,
                  color: "var(--label-secondary)",
                  background: "var(--fill-quaternary)",
                  borderRadius: 8,
                  padding: "9px 11px",
                }}
              >
                {updNotes}
              </span>
            ) : null}
          </span>
        ) : upd === "error" ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--label-tertiary)",
            }}
          >
            {t("prefs.updateError")}
          </span>
        ) : (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--success)",
              fontWeight: 500,
            }}
          >
            <Ic name="check" size={14} stroke={2.4} /> {t("prefs.latestVersion")}
          </span>
        )}
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "var(--label-secondary)",
        }}
      >
        <Ic
          name="lock"
          size={12.5}
          stroke={2}
          style={{ color: "var(--label-tertiary)", flex: "none" }}
        />
        <span>{t("prefs.aboutPrivacy")}</span>
      </div>

      {/* links */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 9,
          marginTop: 4,
          color: "var(--label-quaternary)",
          fontSize: 12,
        }}
      >
        <Link url="https://hostbeam.app">{t("prefs.website")}</Link>
        <span aria-hidden="true">·</span>
        <Link url="https://hostbeam.app/privacy">{t("prefs.privacyPolicy")}</Link>
        <span aria-hidden="true">·</span>
        <Link url="https://hostbeam.app/terms">{t("prefs.terms")}</Link>
        <span aria-hidden="true">·</span>
        {/* The full history, beyond whatever the pending update happens to
            contain. Someone deciding whether Hostbeam is worth a license
            wants the list, not the newest entry. */}
        <Link url={MAC_CHANGELOG_URL}>{t("prefs.changelog")}</Link>
        <span aria-hidden="true">·</span>
        {/* The notices the MIT and Apache-2.0 packages inside the binary ask
            to travel with it. In-app, not a link out: the obligation is on
            the binary, and it should hold with the network off. */}
        <a
          href="#licenses"
          onClick={(e) => {
            e.preventDefault();
            setLicensesOpen(true);
          }}
          style={{ color: "var(--accent)", textDecoration: "none", fontSize: 12 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = "underline";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = "none";
          }}
        >
          {t("prefs.openSource")}
        </a>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 9,
          marginTop: 4,
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          icon={<Ic name="bell" size={13} />}
          onClick={() => sendFeedback("feedback")}
        >
          {t("prefs.sendFeedback")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Ic name="plus" size={13} />}
          onClick={() => sendFeedback("feature")}
        >
          {t("prefs.requestFeature")}
        </Button>
        {/* Word of mouth, not a review prompt: the Mac app is sold directly,
            so there is no store to send anyone to, and a menu-bar utility
            must not ask (ADR 0023). */}
        <Button
          variant="ghost"
          size="sm"
          icon={<Ic name={shareCopied ? "check" : "upload"} size={13} />}
          onClick={(e) => void shareHostbeam(e.currentTarget)}
        >
          {shareCopied ? t("prefs.shareCopied") : t("prefs.shareHostbeam")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Ic name="activity" size={13} />}
          onClick={() => setLogsOpen(true)}
        >
          {t("prefs.diagnosticLogs")}
        </Button>
      </div>
      {logsOpen ? <LogsSheet onClose={() => setLogsOpen(false)} /> : null}
      {licensesOpen ? <LicensesSheet onClose={() => setLicensesOpen(false)} /> : null}

      <button
        onClick={() => {
          if (confirm) {
            onReset();
            setConfirm(false);
          } else {
            setConfirm(true);
          }
        }}
        style={{
          marginTop: 4,
          border: 0,
          background: "transparent",
          cursor: "pointer",
          fontSize: 11.5,
          fontWeight: 500,
          padding: "4px 8px",
          borderRadius: "var(--radius-sm)",
          color: confirm ? "var(--danger)" : "var(--label-tertiary)",
        }}
      >
        {confirm ? t("prefs.resetConfirm") : t("prefs.resetToDefaults")}
      </button>
    </div>
  );
}

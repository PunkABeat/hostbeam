import type { CSSProperties, ReactNode } from "react";

import { Ic } from "@hostbeam/ui";
import { t } from "../../../i18n";
import { macChangelogUrl } from "../../../lib/changelog";
import { openUrl, quitApp } from "../../../lib/ipc";
import { Beak } from "./Beak";

const noticeRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px 8px 16px",
  borderBottom: "1px solid var(--separator)",
  background: "var(--accent-tint)",
};

const noticeLink: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "var(--accent)",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const noticeClose: CSSProperties = {
  display: "inline-flex",
  color: "var(--label-tertiary)",
  padding: 2,
  borderRadius: "var(--radius-sm)",
};

export function Frame({
  children,
  updateAvailable = false,
  updateVersion = null,
  onSkipUpdate,
  updatedTo = null,
  onDismissUpdated,
  onUnlicensed,
}: {
  children: ReactNode;
  /** A version worth announcing: not skipped, not already installed in the
   * background (see lib/updates.ts). */
  updateAvailable?: boolean;
  updateVersion?: string | null;
  /** Skips this version everywhere until a newer one comes out. */
  onSkipUpdate?: () => void;
  /** The version Hostbeam was updated to since it last ran, if any. */
  updatedTo?: string | null;
  onDismissUpdated?: () => void;
  /** Set while unlicensed: the header says so beside the name, and this
   *  opens the license card (ADR 0028). */
  onUnlicensed?: () => void;
}) {
  // The notes for the version just installed, not the top of a page of them.
  const changelogUrl = macChangelogUrl(updatedTo);
  const openChangelog = () => openUrl(changelogUrl);
  return (
    <div style={{ position: "relative", width: 340 }}>
      <Beak />
      <div
        className="hb-step"
        style={{
          position: "relative",
          zIndex: 1,
          width: 340,
          background: "var(--surface-popover)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-popover-panel)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "12px 16px",
            borderBottom: "1px solid var(--separator)",
          }}
        >
          <img src="/assets/hostbeam-mark.svg" width="18" height="18" alt="" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--label)" }}>Hostbeam</span>
          {/* Sublime's "UNREGISTERED" in the title bar, in Hostbeam's voice:
              always there while unlicensed, and never louder than this. */}
          {onUnlicensed ? (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onUnlicensed();
              }}
              title={t("pop.remind")}
              style={{
                fontSize: 11,
                color: "var(--label-tertiary)",
                textDecoration: "none",
              }}
            >
              {t("pop.unlicensed")}
            </a>
          ) : null}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              // With an update pending, the gear lands on About (where the
              // install button lives) instead of the last-used tab.
              window.openPreferences?.(updateAvailable ? "about" : undefined);
            }}
            className="pv-gear"
            title={updateAvailable ? t("pop.updateAvailable") : t("pop.preferences")}
            aria-label={updateAvailable ? t("pop.updateAvailable") : t("pop.preferences")}
            style={{
              marginLeft: "auto",
              position: "relative",
              display: "inline-flex",
              color: "var(--label-tertiary)",
              padding: 4,
              borderRadius: "var(--radius-sm)",
            }}
          >
            <Ic name="sliders" size={16} />
            {updateAvailable ? (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: 1,
                  right: 1,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: "var(--accent)",
                  boxShadow: "0 0 0 1.5px var(--surface-popover)",
                }}
              />
            ) : null}
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              quitApp();
            }}
            className="pv-gear"
            title={t("pop.quit")}
            aria-label={t("pop.quit")}
            style={{
              display: "inline-flex",
              color: "var(--label-tertiary)",
              padding: 4,
              borderRadius: "var(--radius-sm)",
            }}
          >
            <Ic name="power" size={15} />
          </a>
        </div>
        {/* A dot on the gear was too quiet to do its job: it lives inside the
            popover, and reaching the update still meant opening Preferences and
            finding About. Updates are part of what a licence pays for, so they
            should be visible where people already look — but a menu-bar utility
            must not nag, hence one quiet line. Skipping it holds until a newer
            version comes out, and takes the dots with it. */}
        {updateAvailable && onSkipUpdate ? (
          <div style={noticeRow}>
            <Ic name="upload" size={13} />
            <span style={{ fontSize: 12, color: "var(--label)", flex: 1, minWidth: 0 }}>
              {t("prefs.updateAvailable", { v: updateVersion ?? "" })}
            </span>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.openPreferences?.("about");
              }}
              style={noticeLink}
            >
              {t("prefs.changelog")}
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onSkipUpdate();
              }}
              className="pv-gear"
              title={t("pop.updateSkip")}
              aria-label={t("pop.updateSkip")}
              style={noticeClose}
            >
              <Ic name="x" size={13} />
            </a>
          </div>
        ) : null}
        {/* Said once after an update. An update installed without asking
            relaunches while nobody is looking, and the app changing under
            someone with no word about it would be the surprise ADR 0022 is
            careful to avoid. */}
        {updatedTo && onDismissUpdated ? (
          <div style={noticeRow}>
            <Ic name="check" size={13} />
            <span style={{ fontSize: 12, color: "var(--label)", flex: 1, minWidth: 0 }}>
              {t("pop.updatedTo", { v: updatedTo })}
            </span>
            <a
              href={changelogUrl}
              onClick={(e) => {
                e.preventDefault();
                openChangelog();
                onDismissUpdated();
              }}
              style={noticeLink}
            >
              {t("prefs.changelog")}
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onDismissUpdated();
              }}
              className="pv-gear"
              title={t("pop.updateDismiss")}
              aria-label={t("pop.updateDismiss")}
              style={noticeClose}
            >
              <Ic name="x" size={13} />
            </a>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

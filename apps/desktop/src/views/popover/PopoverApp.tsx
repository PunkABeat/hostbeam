// The steady-state menu-bar popover. Reads and writes the shared config (HB /
// useHBConfig) so the default host, hotkey, folder and paste-ready sentence
// stay in sync with Preferences. This file is the composition: what the
// screen is made of and how the pieces connect. The beam itself lives in
// hooks/useBeam, the other concerns in the hooks beside it, and every piece
// of the screen in components/.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { ImageLightbox } from "../../components/ImageLightbox";
import { useCopied } from "../../hooks/useCopied";
import { t } from "../../i18n";
import { HB, useHBConfig } from "../../lib/config";
import { refreshHosts } from "../../lib/config-sync";
import { copyText, revealRecent } from "../../lib/ipc";
import { fitPopover } from "../../lib/fit-popover";
import {
  addedHosts,
  currentHost,
  dotFor,
  orderForSwitcher,
  type Reach,
} from "../../lib/host-order";
import { groupRecent } from "../../lib/recent";
import { useRustMessage } from "../../lib/rust-bridge";
import { clipboardText } from "../../lib/sentence";
import { thumbUrl } from "../../lib/thumbs";
import type { RecentBeam } from "../../types/config";
import { BeamProgress } from "./components/BeamProgress";
import { ClipboardCard } from "./components/ClipboardCard";
import { DoneCard } from "./components/DoneCard";
import { DropOverlay } from "./components/DropOverlay";
import { EmptyState } from "./components/EmptyState";
import { FailedCard } from "./components/FailedCard";
import { HeldCard } from "./components/HeldCard";
import { Frame } from "./components/Frame";
import { HostFooter } from "./components/HostFooter";
import { IdleActions } from "./components/IdleActions";
import { DevServerList } from "./components/DevServerList";
import { IncomingList } from "./components/IncomingList";
import { LicenseCard } from "./components/LicenseCard";
import { MissingHostCard } from "./components/MissingHostCard";
import { RecentList } from "./components/RecentList";
import { useAutoBeam } from "./hooks/useAutoBeam";
import { useBeam } from "./hooks/useBeam";
import { useClipboard } from "./hooks/useClipboard";
import { useHostProbe } from "./hooks/useHostProbe";
import { useLicense } from "./hooks/useLicense";
import { useLightbox } from "./hooks/useLightbox";
import { useDevServers } from "./hooks/useDevServers";
import { usePull } from "./hooks/usePull";
import { useUpdateNotice } from "./hooks/useUpdateNotice";

export function PopoverApp({ simResult = "auto" }: { simResult?: string }) {
  const [cfg, update] = useHBConfig();
  const added = addedHosts(cfg.addedIds, HB.allHosts());
  // A default that left ~/.ssh/config stays the host: beams refuse and say
  // why, rather than going to another one (`currentHost`).
  const host = currentHost(added, cfg.defaultId);
  // What the probes may talk to. A missing host has no address to ask.
  const live = host && !host.missing ? host : null;
  const s = cfg.settings;
  const recent = cfg.recent || [];

  // Persist a reachability result into the shared config so both surfaces' dots
  // reflect it (the popover's, and Preferences' on next read).
  const recordReach = useCallback(
    (id: string, ok: boolean) => {
      update((p) => ({
        ...p,
        reach: { ...((p.reach as object) || {}), [id]: { ok: !!ok, at: Date.now() } },
      }));
    },
    [update],
  );
  useHostProbe(live, recordReach);

  // The tray's Switch host ▸ <host>, which is the switcher below by another
  // route: choosing a host *is* setting the default one, so this writes the
  // same field and nothing beams until something asks it to.
  const setHostFromRust = (id: string) => {
    // A host the menu offered but the config no longer has: the menu was
    // built from an older config, and switching to it would leave the
    // popover with no host at all.
    if (!id || !added.some((h) => h.id === id)) return;
    update({ defaultId: id });
  };
  useRustMessage("setHost", (m) => setHostFromRust(m.id));
  // The Dock icon's right-click menu → Hide from Dock. Writes the same field
  // as the Preferences switch; Rust applies it on the save. The menu-bar
  // icon comes back with it if it was off — the rule startup.rs enforces,
  // written down here too so the pane never shows both switches off.
  useRustMessage("setDock", (m) =>
    update((prev) => ({
      ...prev,
      settings: { ...prev.settings, dock: m.on, menubar: prev.settings.menubar || !m.on },
    })),
  );

  const { clip, setClip, clipPresent, hasTauri, checkClip } = useClipboard();
  // A picture, or files a copy in Finder named: either is something to beam.
  const clipFiles = (clip && clip.files) || [];
  const canBeam = !!live && (!hasTauri || clipPresent === true || clipFiles.length > 0);
  const beam = useBeam({
    host,
    settings: s,
    canBeam,
    clip,
    setClip,
    simResult,
    update,
    recordReach,
    setHostFromRust,
  });
  const { phase, err, path } = beam;
  // Back at idle, the clipboard and the license are worth another look: a beam
  // replaced the image with the paste-ready text, and a key may have been
  // entered in Preferences since.
  const [license, checkLicense] = useLicense();
  useEffect(() => {
    if (phase === "idle") {
      checkClip();
      checkLicense();
    }
  }, [phase, checkClip, checkLicense]);
  // Unknown until the first status arrives, and unknown reads as licensed: a
  // paying user must never see "Unlicensed" flash by. With licensing retired
  // (ADR 0031) every Mac reads as licensed, and the card is never opened.
  const licensed = !license || license.tier !== "free" || license.retired === true;

  // The license card (ADR 0028): opened by the reminder — the HUD's, by way of
  // Rust, or the done card's line — or by the header's "Unlicensed".
  const [licenseCard, setLicenseCard] = useState(false);
  const licenseCardAt = useRef(0);
  const openLicenseCard = () => {
    licenseCardAt.current = Date.now();
    setLicenseCard(true);
  };
  useRustMessage("showLicense", openLicenseCard);
  // A later opening of the popover starts without it. The HUD's click sends
  // "showLicense" just before the panel's own "shown", hence the grace.
  useRustMessage("shown", () => {
    if (Date.now() - licenseCardAt.current > 1500) setLicenseCard(false);
    // A host that came back to ~/.ssh/config, or one that left, since the
    // popover was last up.
    void refreshHosts();
  });
  // A new beam, or a license entered since, puts it away.
  useEffect(() => {
    if ((phase !== "idle" && phase !== "done") || licensed) setLicenseCard(false);
  }, [phase, licensed]);
  const asking = licenseCard && !licensed;

  const notice = useUpdateNotice(cfg, update);
  const [autoBeam, setAutoBeam] = useAutoBeam();
  const lightbox = useLightbox(clip);
  const pulls = usePull(live);
  const dev = useDevServers(live);
  const [copiedId, markCopied] = useCopied();
  // A row whose files were moved or deleted since it was beamed says so for a
  // moment, in place of its host and time.
  const [goneId, markGone] = useCopied(2200);
  const revealEntry = (rows: RecentBeam[]) => {
    revealRecent(rows.map((r) => r.id))
      .then((shown) => {
        if (shown === 0 && rows[0]) markGone(rows[0].id);
      })
      .catch(() => {});
  };

  // Keep the popover window sized to its content (after every render — fitPopover
  // only invokes when the measured height actually changes).
  useLayoutEffect(() => {
    fitPopover();
  });

  /** Copy one Recent entry, or every file of one drop — exactly what the beam
   *  put on the clipboard (`clipboardText`, the rule Rust uses). */
  const copyEntry = (entry: RecentBeam, paths?: string[]) => {
    const text = clipboardText(s.sentence || "", s.copySentence, paths ?? [entry.path]);
    copyText(text).catch(() => {});
    markCopied(entry.id);
  };
  const recentGroups = groupRecent(recent);
  // The tray's Recent ▸ <file>: hand back what that gesture's copy button
  // hands back, whole drop included. Subscribed here because it needs the
  // grouping this render produced.
  useRustMessage("copyRecent", (m) => {
    const group = recentGroups.find((g) => g.key === m.key);
    if (!group) return;
    copyEntry(
      group.rows[0],
      group.rows.map((r) => r.path),
    );
  });

  const frameProps = {
    onUnlicensed: licensed ? undefined : openLicenseCard,
    updateAvailable: !!notice.updVersion,
    updateVersion: notice.updVersion,
    onSkipUpdate: notice.skipUpdate,
    updatedTo: notice.updatedTo,
    onDismissUpdated: notice.dismissUpdated,
  };

  /* ---- Empty: no hosts added ---- */
  if (!host) {
    return (
      <Frame {...frameProps}>
        <EmptyState onAddHost={() => window.openPreferences?.("hosts")} />
      </Frame>
    );
  }

  // Clipboard card state. A beam in flight/just-done implies we had something.
  const beamed = phase === "done" || phase === "landing";
  const hasImage = clipPresent === true || phase === "uploading" || beamed || phase === "held";
  const checking = phase === "idle" && clipPresent === null;
  const empty = phase === "idle" && clipPresent === false && clipFiles.length === 0;
  // Files the card is about: the clipboard's while idle, the beam's own once
  // one is in hand — a dropped PDF must not read "Screenshot on clipboard".
  const cardFiles = phase === "idle" ? clipFiles.map((f) => f.path) : beam.carrying;
  const dims = clip && clip.present ? `PNG · ${clip.width} × ${clip.height}` : null;
  const thumbSrc = clip && clip.present && clip.thumb ? clip.thumb : null;
  // A beam of files never borrows the clipboard's picture — that was some
  // other screenshot. Its own preview, when it is a picture, arrives with the
  // result.
  const cardThumb =
    phase === "idle"
      ? thumbSrc
      : thumbUrl(beam.beamThumb) || (beam.carrying.length ? null : thumbSrc);

  const reach = (cfg.reach as Reach) || {};
  const hostOptions = orderForSwitcher(added, cfg.defaultId, recent).map((h) => ({
    id: h.id,
    name: h.name ?? h.id,
    address: h.missing ? t("host.missing") : `${h.user}@${h.address}`,
    status: h.missing ? ("error" as const) : dotFor(reach, h),
    isDefault: h.id === cfg.defaultId,
  }));
  const hostName = host.name ?? "";
  // Only while idle: a beam already on its way when the host left finishes.
  const missing = !!host.missing && phase === "idle";

  return (
    <Frame {...frameProps}>
      <div
        ref={beam.contentRef}
        style={{ padding: 16, display: "flex", flexDirection: "column", gap: 13 }}
      >
        {missing ? <MissingHostCard host={host} /> : null}

        {missing ? null : (
          <ClipboardCard
            checking={checking}
            empty={empty}
            beamed={beamed}
            hasImage={hasImage}
            dims={dims}
            thumb={cardThumb}
            path={path}
            files={cardFiles}
            filesOnClipboard={phase === "idle"}
            quiet={phase === "held"}
            onEnlarge={() =>
              lightbox.openLightbox(
                phase === "idle"
                  ? { caption: clip && clip.present ? `${clip.width} × ${clip.height}` : "" }
                  : { src: cardThumb ?? undefined },
              )
            }
          />
        )}

        {asking ? <LicenseCard onDismiss={() => setLicenseCard(false)} /> : null}

        {phase === "idle" && !asking && !missing ? (
          <IdleActions
            canBeam={canBeam}
            checking={checking}
            refused={beam.refused}
            hotkey={cfg.hotkey}
            clipFiles={clip && clip.present ? 0 : clipFiles.length}
            onBeam={beam.beamNow}
          />
        ) : null}

        {phase === "uploading" || phase === "landing" ? (
          <BeamProgress phase={phase} hostName={hostName} progress={beam.progress} />
        ) : null}

        {phase === "done" && !asking ? (
          <DoneCard
            sentence={s.sentence || ""}
            copySentence={s.copySentence}
            path={path}
            hostName={hostName}
            unsent={beam.unsent}
            landedCount={beam.landedCount}
            onBeamRest={beam.beamRest}
            remind={beam.remind}
            onLicense={openLicenseCard}
          />
        ) : null}

        {phase === "held" && beam.held ? (
          <HeldCard
            held={beam.held}
            hostName={hostName}
            onSend={beam.sendHeld}
            onCancel={beam.declineHeld}
          />
        ) : null}

        {phase === "failed" ? (
          <FailedCard
            err={err}
            host={host}
            folder={HB.beamFolder(host.id)}
            diag={beam.diag}
            onRetry={beam.retryLast}
            onRunDiagnostics={beam.runDiagnostics}
          />
        ) : null}
      </div>

      {recent.length ? (
        <RecentList
          groups={recentGroups}
          copiedId={copiedId}
          onCopy={copyEntry}
          onReveal={revealEntry}
          goneId={goneId}
          onClear={() => update((p) => ({ ...p, recent: [] }))}
          onEnlarge={lightbox.openLightbox}
          onShowAll={() => window.openPreferences?.()}
        />
      ) : null}

      {/* The agent's dev servers on this host, asked when the popover opens
          (ADR 0029). Nothing at all when there are none. */}
      {dev.rows.length ? (
        <DevServerList
          hostName={host.name ?? host.id}
          rows={dev.rows}
          forwards={dev.forwards}
          opening={dev.opening}
          error={dev.error}
          onOpen={dev.open}
          onStop={dev.stop}
        />
      ) : null}

      {/* Hidden entirely unless the setting is on: this is the first thing
          Hostbeam does in the other direction, and the product has not decided
          it goes further than screenshots. */}
      {cfg.settings?.pullIncoming ? (
        <IncomingList
          incoming={pulls.incoming}
          pulling={pulls.pulling}
          pulled={pulls.pulled}
          onPull={pulls.pull}
        />
      ) : null}

      <HostFooter
        hosts={hostOptions}
        value={cfg.defaultId ?? undefined}
        onChange={(id) => update({ defaultId: id })}
        onAddHost={() => window.openPreferences?.("hosts")}
        autoBeam={autoBeam}
        onAutoBeam={setAutoBeam}
      />

      {beam.dropping && !host.missing ? <DropOverlay hostName={host.name ?? host.id} /> : null}

      {/* tap-to-enlarge lightbox — covers the popover, dismisses on Esc / click */}
      {lightbox.open ? (
        <ImageLightbox
          src={lightbox.preview}
          caption={lightbox.caption}
          gallery={lightbox.gallery}
          onClose={lightbox.closeLightbox}
          radius="var(--radius-xl)"
        />
      ) : null}
    </Frame>
  );
}

import React from "react";

import type { ConfigPatch } from "../../../lib/config";
import { slugId } from "../../../lib/host-id";
import type { Config } from "../../../types/config";
import type { PrefHost } from "../shared";
import type { AddHostInput } from "../sheets/AddHostSheet";

/** The hosts in Hostbeam: which are added, in what order, which is the
 *  default, their folder overrides, and the one whose row is open. Every
 *  change is a config write; the pane only renders it. */
export function useHostManager(
  cfg: Config,
  update: (patch: ConfigPatch) => void,
  pool: PrefHost[],
  /** Run after a host is added — the probe, so its dot fills in. */
  afterAdd: (id: string) => void,
) {
  const addedIds = cfg.addedIds || [];
  const defaultId = cfg.defaultId;
  const setDefault = (id: string) => update({ defaultId: id });
  const folders = cfg.folders || {};
  const setFolder = (id: string, val: string) =>
    update((p) => ({ ...p, folders: { ...(p.folders || {}), [id]: val } }));
  const clearFolder = (id: string) =>
    update((p) => {
      const f = { ...(p.folders || {}) };
      delete f[id];
      return { ...p, folders: f };
    });
  // Which host row is expanded (none initially).
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  /* The host added in this sitting, if it is not the default. Adding a host is
     usually the prelude to beaming to it, but the hotkey and the HUD keep going
     to the old default silently — so the question gets asked once, here, rather
     than discovered later by a screenshot landing on the wrong server. Offered,
     never switched: where a beam goes is not something to change behind
     someone's back. */
  const [justAdded, setJustAdded] = React.useState<string | null>(null);

  // Collapse the open row if its host is removed.
  React.useEffect(() => {
    if (selectedId && !addedIds.includes(selectedId)) setSelectedId(null);
    // Value-keyed on the addedIds contents (join) so it fires only when the host
    // list actually changes, not on array-identity churn; selectedId is read fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addedIds.join(",")]);

  const addHost = (id: string, opts: { folder?: string } = {}) => {
    update((p) => {
      const addedIds = p.addedIds.includes(id) ? p.addedIds : [...p.addedIds, id];
      const folders = { ...(p.folders || {}) };
      // persist a per-host folder override only when it differs from the default
      if (opts.folder && opts.folder !== p.settings.folder) folders[id] = opts.folder;
      return { ...p, addedIds, folders };
    });
    // Open the new host, as the manual path already did. Its details are what
    // you want next, and the primary action there is "Set as default" — which
    // nobody could reach while the row stayed collapsed.
    setSelectedId(id);
    setJustAdded(id);
    // Find out straight away rather than showing an unknown dot until the user
    // thinks to press Test. Adding a host is the moment they most want to know
    // it works, and a grey dot beside a host that is perfectly reachable reads
    // as a problem. Non-blocking: the dot fills in when the probe lands.
    afterAdd(id);
  };
  const moveHost = (id: string, dir: number) =>
    update((p) => {
      const ids = [...p.addedIds];
      const i = ids.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ids.length) return p;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      return { ...p, addedIds: ids };
    });
  const renameHost = (id: string, name: string) =>
    update((p) => ({
      ...p,
      manualHosts: (p.manualHosts || []).map((h) => (h.id === id ? { ...h, name } : h)),
    }));
  const removeHost = (id: string) =>
    update((p) => {
      const next = p.addedIds.filter((x) => x !== id);
      const isManual = (p.manualHosts || []).some((h) => h.id === id);
      const folders = { ...(p.folders || {}) };
      delete folders[id]; // drop any per-host folder override so a later re-add starts clean
      return {
        ...p,
        addedIds: next,
        // a manually-added host is forgotten entirely — it isn't in ~/.ssh/config to re-find,
        // so leaving it in the pool would wrongly resurface it in the config autocomplete.
        manualHosts: isManual ? (p.manualHosts || []).filter((h) => h.id !== id) : p.manualHosts,
        folders,
        defaultId: p.defaultId === id ? next[0] || null : p.defaultId,
      };
    });
  const addManualHost = ({ name, user, address, folder, online }: AddHostInput) => {
    const id = slugId(
      name,
      pool.map((h) => h.id),
    );
    const host: PrefHost = { id, name, user, address, online: online !== false, manual: true };
    update((p) => {
      const nextFolders = { ...(p.folders || {}) };
      if (folder && folder !== p.settings.folder) nextFolders[id] = folder;
      return {
        ...p,
        manualHosts: [...(p.manualHosts || []), host],
        addedIds: [...p.addedIds, id],
        folders: nextFolders,
      };
    });
    setSelectedId(id);
    setJustAdded(id);
  };

  return {
    addedIds,
    defaultId,
    setDefault,
    folders,
    setFolder,
    clearFolder,
    selectedId,
    setSelectedId,
    justAdded,
    dismissJustAdded: () => setJustAdded(null),
    addHost,
    moveHost,
    renameHost,
    removeHost,
    addManualHost,
  };
}

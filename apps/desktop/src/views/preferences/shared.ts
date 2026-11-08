import type { ReactNode } from "react";

import { OB_MOCK } from "../../lib/hosts";
import type { DiagRow } from "../../lib/ipc";
import type { Host, Settings } from "../../types/config";

export const OB = OB_MOCK;

/* A host as Preferences sees it: the shared model plus the `manual` flag set on
   user-typed hosts (absent on ~/.ssh/config entries). */
export interface PrefHost extends Host {
  manual?: boolean;
}

/* The per-host reachability cache shared with the popover (cfg.reach). */
export type ReachMap = Record<string, { ok: boolean; at?: number }>;

export type SettingsKey = keyof Settings;
export type SetSetting = (key: SettingsKey, value: Settings[SettingsKey]) => void;

/* A diagnostics row as the sheet shows it: the command's row (lib/ipc
   `DiagRow`), or a placeholder with a spinner where the detail goes. */
export interface DiagCheck extends Partial<Pick<DiagRow, "status">> {
  label: string;
  detail?: ReactNode;
}

/* Sidebar nav entry. */
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  tile: string;
  appIcon?: boolean;
}

/* Tap-to-enlarge lightbox payload. */
export interface Lightbox {
  src?: string | null;
  caption?: string;
}

/* --- Ventura-style sidebar nav --------------------------------------- */
export const NAV: NavItem[] = [
  { id: "general", label: "General", icon: "sliders", tile: "#8E8E93" },
  { id: "hosts", label: "Hosts", icon: "server", tile: "var(--accent)" },
  { id: "hotkey", label: "Hotkey", icon: "keyboard", tile: "#5E5CE6" },
  { id: "recent", label: "Recent", icon: "clock", tile: "#34C759" },
  { id: "license", label: "License", icon: "key", tile: "#FF9F0A" },
  { id: "about", label: "About", icon: "info", tile: "#30B0C7", appIcon: true },
];

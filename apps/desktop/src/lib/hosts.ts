// Dev/onboarding mock host data, imported by the views, config-bridge, and
// config.allHosts. In the shipped Tauri app config-bridge overwrites
// sshConfig/detected with the user's ~/.ssh/config hosts. The simulated SSH
// operations (probe, diagnostics) live privately in lib/ipc.ts, behind the real
// commands, so no view can reach a mock by mistake.

import type { Host } from "../types/config";

const detected: Host[] = [
  { id: "prod", name: "prod-box", address: "10.4.0.12", user: "dev", folder: "/tmp/hostbeam" },
  { id: "stg", name: "staging", address: "10.4.0.30", user: "deploy", folder: "/tmp/hostbeam" },
  { id: "dev", name: "dev-box", address: "10.4.0.88", user: "dev", folder: "/tmp/hostbeam" },
  { id: "edge", name: "edge-eu", address: "fra1.dev", user: "ci", folder: "/tmp/hostbeam" },
];

// Fuller ~/.ssh/config pool — the universe Preferences searches to add hosts.
const sshConfig: Host[] = [
  {
    id: "prod",
    name: "prod-box",
    address: "10.4.0.12",
    user: "dev",
    folder: "/tmp/hostbeam",
    online: true,
  },
  {
    id: "stg",
    name: "staging",
    address: "10.4.0.30",
    user: "deploy",
    folder: "/tmp/hostbeam",
    online: true,
  },
  {
    id: "dev",
    name: "dev-box",
    address: "10.4.0.88",
    user: "dev",
    folder: "/tmp/hostbeam",
    online: true,
  },
  {
    id: "edge",
    name: "edge-eu",
    address: "fra1.dev",
    user: "ci",
    folder: "/tmp/hostbeam",
    online: false,
  },
  {
    id: "gpu",
    name: "gpu-trainer",
    address: "10.8.1.5",
    user: "ml",
    folder: "/tmp/hostbeam",
    online: true,
  },
  {
    id: "db",
    name: "db-replica",
    address: "10.4.2.7",
    user: "admin",
    folder: "/tmp/hostbeam",
    online: true,
  },
  {
    id: "bastion",
    name: "bastion",
    address: "bastion.corp",
    user: "ops",
    folder: "/tmp/hostbeam",
    online: true,
  },
  {
    id: "sandbox",
    name: "sandbox",
    address: "10.9.0.3",
    user: "dev",
    folder: "/tmp/hostbeam",
    online: true,
  },
  {
    id: "ci-runner",
    name: "ci-runner",
    address: "10.4.0.51",
    user: "ci",
    folder: "/tmp/hostbeam",
    online: true,
  },
  {
    id: "old-vps",
    name: "old-vps",
    address: "vps.legacy",
    user: "root",
    folder: "/tmp/hostbeam",
    online: false,
  },
];

const SYSTEM_SHORTCUTS = [
  { keys: ["cmd", "shift", "3"], name: "Screenshot (whole screen)" },
  { keys: ["cmd", "shift", "4"], name: "Screenshot (selection)" },
  { keys: ["cmd", "shift", "5"], name: "Screenshot toolbar" },
  { keys: ["cmd", "space"], name: "Spotlight" },
  { keys: ["cmd", "tab"], name: "App switcher" },
  { keys: ["cmd", "q"], name: "Quit app" },
  { keys: ["cmd", "w"], name: "Close window" },
  { keys: ["ctrl", "up"], name: "Mission Control" },
];

const norm = (a?: string[]) =>
  (a || [])
    .map((x) => String(x).toLowerCase())
    .sort()
    .join("+");

export const OB_MOCK = {
  detected,
  sshConfig,
  hotkey: "cmd shift 7",

  SYSTEM_SHORTCUTS,
  hotkeyConflict(keys: string[]): string | null {
    const target = norm(keys);
    const hit = SYSTEM_SHORTCUTS.find((sc) => norm(sc.keys) === target);
    return hit ? hit.name : null;
  },
};

/** Recent rows for the browser render only, so the popover and the Recent pane
 *  have something to draw. Never part of the defaults: "Reset to defaults" used
 *  to write these into the real config, where they rendered as "prod-box · 6m
 *  ago" on a Mac that had never beamed anything. */
export function DEV_SEED_RECENT() {
  return [
    {
      id: "r-seed-1",
      hostId: "prod",
      hostName: "prod-box",
      path: "/tmp/hostbeam/2025-06-14-15.12.04.png",
      at: Date.now() - 1000 * 60 * 6,
    },
    {
      id: "r-seed-2",
      hostId: "stg",
      hostName: "staging",
      path: "/tmp/hostbeam/2025-06-14-14.48.51.png",
      at: Date.now() - 1000 * 60 * 52,
    },
  ];
}

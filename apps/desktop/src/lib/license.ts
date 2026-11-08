// Frontend view of the licensing state (ADR 0014, amended by ADR 0028). The
// Rust core owns the store and decides when the reminder is due
// (`src-tauri/src/licensing/`); this wraps its commands and holds the one
// purchase URL. Without Tauri (browser dev) everything resolves to a mock
// "licensed" status so the reminder stays out of the way.

import { isTauri, licenseActivate, licenseDeactivate, licenseStatus, openUrl } from "./ipc";

export interface LicenseStatus {
  /** "free" gets the reminder and the popover's "Unlicensed"; a license
   *  covers every Hostbeam 1 update (ADR 0028). */
  tier: "free" | "licensed" | "grace";
  keyMasked?: string | null;
  /** Licensing is retired (ADR 0031): nothing to buy, no reminder, and the
   *  popover never says "Unlicensed". Rust's `LICENSING_RETIRED`. */
  retired?: boolean;
}

/* Checkout entry point — provisional until the site has a real pricing page
   and domain (docs/adr/0014, docs/research/questions.md). */
export const PURCHASE_URL = "https://hostbeam.app/#pricing";

/** What a license costs, as the reminder says it (ADR 0028). One place, so a
 *  price change is one line and not eight translations. */
export const PRICE = "$29";

const MOCK: LicenseStatus = {
  tier: "licensed",
  retired: true,
};

export async function fetchLicenseStatus(): Promise<LicenseStatus> {
  if (!isTauri()) return MOCK;
  return licenseStatus();
}

/* Rejects with a stable code: license_invalid | license_seats |
   license_network | license_unconfigured. */
export async function activateLicense(key: string): Promise<LicenseStatus> {
  if (!isTauri()) return MOCK;
  return licenseActivate(key);
}

export async function deactivateLicense(): Promise<LicenseStatus> {
  if (!isTauri()) return { ...MOCK, tier: "free" };
  return licenseDeactivate();
}

export function openPurchasePage(): void {
  openUrl(PURCHASE_URL);
}

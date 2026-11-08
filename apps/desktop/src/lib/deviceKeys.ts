import type { PairedDevice } from "../types/config";

/// An OpenSSH ed25519 public-key line, matching the Rust side's `valid_pubkey`
/// so the UI never offers something the backend will refuse.
export const PUBKEY_RE = /^ssh-ed25519 [A-Za-z0-9+/=]{60,}( \S+)*$/;

/// The SHA256 fingerprint OpenSSH shows (`ssh-keygen -lf`): base64 of the
/// digest of the *decoded* key blob, unpadded. Used as the device's identity,
/// since one device key has exactly one fingerprint.
export async function fingerprint(keyLine: string): Promise<string | null> {
  const b64 = keyLine.trim().split(/\s+/)[1];
  if (!b64) return null;
  try {
    const blob = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const digest = await crypto.subtle.digest("SHA-256", blob);
    const b = String.fromCharCode(...new Uint8Array(digest));
    return `SHA256:${btoa(b).replace(/=+$/, "")}`;
  } catch {
    return null;
  }
}

/// The comment at the end of the key line ("hostbeam-iphone"), which is what
/// the phone puts there and the only name we have without asking.
export function deviceName(keyLine: string): string {
  const parts = keyLine.trim().split(/\s+/);
  return parts.length > 2 ? parts.slice(2).join(" ") : "iPhone";
}

/// Adds or refreshes a device in the remembered list. Keyed by fingerprint, so
/// re-authorizing the same phone updates it rather than duplicating it.
export function rememberDevice(
  devices: PairedDevice[] | undefined,
  device: PairedDevice,
): PairedDevice[] {
  const rest = (devices ?? []).filter((d) => d.id !== device.id);
  const existing = (devices ?? []).find((d) => d.id === device.id);
  return [...rest, { ...device, addedAt: existing?.addedAt ?? device.addedAt }];
}

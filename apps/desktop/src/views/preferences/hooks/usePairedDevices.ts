import type { ConfigPatch } from "../../../lib/config";
import { rememberDevice } from "../../../lib/deviceKeys";
import type { Config, PairedDevice } from "../../../types/config";

/** Devices the Mac has authorized somewhere, so host 2..n needs no phone in
 *  hand (ADR 0018). Public keys only; offered, never installed automatically. */
export function usePairedDevices(cfg: Config, update: (patch: ConfigPatch) => void) {
  const pairedDevices = cfg.pairedDevices || [];
  const remember = (device: PairedDevice) =>
    update((p) => ({ ...p, pairedDevices: rememberDevice(p.pairedDevices, device) }));
  const forget = (id: string) =>
    update((p) => ({ ...p, pairedDevices: (p.pairedDevices || []).filter((d) => d.id !== id) }));
  return { pairedDevices, remember, forget };
}

import type { Host } from "../types/config";

/** Where the "Share to iPhone" QR points. The iPhone app claims this path as a
 *  universal link (the site's apple-app-site-association), so the Camera app
 *  offers to open Hostbeam; without the app the page says what the code is for.
 *  MUST match `HostPairing` in the iOS engine, which pins the same strings. */
export const PAIR_LINK = "https://hostbeam.app/add";

/** The connection details a pairing carries — never key material. */
export interface HostPayload {
  alias: string;
  hostname: string;
  port: number;
  user: string;
  folder: string;
}

export function hostPayload(host: Host, port: number): HostPayload {
  return {
    alias: host.name ?? "",
    hostname: host.address ?? "",
    port,
    user: host.user ?? "",
    folder: host.folder ?? "/tmp/hostbeam",
  };
}

/** The link the QR carries and Copy puts on the clipboard:
 *  `https://hostbeam.app/add#v=1&name=…&host=…&port=…&user=…&folder=…`.
 *
 *  The details go in the fragment, which a browser never sends: scanned on a
 *  phone without Hostbeam, the link opens the page and the host's address and
 *  user reach no server, ours included. `encodeURIComponent`, never
 *  URLSearchParams, whose `+` for a space the iOS side would read as a `+`.
 *  Macs up to 0.1.20 wrote a JSON object instead; the iPhone still reads it. */
export function encodeHostPayload(host: Host, port: number): string {
  const p = hostPayload(host, port);
  const fields: [string, string][] = [
    ["v", "1"],
    ["name", p.alias],
    ["host", p.hostname],
    ["port", String(p.port)],
    ["user", p.user],
    ["folder", p.folder],
  ];
  return `${PAIR_LINK}#${fields.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`;
}

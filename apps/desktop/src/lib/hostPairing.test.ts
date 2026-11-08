import { describe, expect, it } from "vitest";

import { encodeHostPayload, hostPayload } from "./hostPairing";
import type { Host } from "../types/config";

const host: Host = {
  id: "prod-box",
  name: "prod-box",
  address: "10.4.0.12",
  user: "dev",
  folder: "/tmp/hostbeam",
};

/** The fields back out of a link, the way the iPhone reads them. */
function fields(link: string): Record<string, string> {
  const fragment = link.slice(link.indexOf("#") + 1);
  return Object.fromEntries(
    fragment.split("&").map((pair) => {
      const [k, v] = pair.split("=");
      return [k, decodeURIComponent(v)];
    }),
  );
}

describe("encodeHostPayload", () => {
  it("writes the pairing link, details in the fragment", () => {
    expect(encodeHostPayload(host, 22)).toBe(
      "https://hostbeam.app/add#v=1&name=prod-box&host=10.4.0.12&port=22" +
        "&user=dev&folder=%2Ftmp%2Fhostbeam",
    );
  });

  // The iOS engine's HostPairingTests.testReadsWhatTheMacWrites parses this
  // exact string. Change one side and the other's test fails, not a scan.
  it("encodes spaces as %20 and non-ASCII as UTF-8, never +", () => {
    const named: Host = { ...host, name: "dev box é", folder: "/srv/shots" };
    expect(encodeHostPayload(named, 2222)).toBe(
      "https://hostbeam.app/add#v=1&name=dev%20box%20%C3%A9&host=10.4.0.12" +
        "&port=2222&user=dev&folder=%2Fsrv%2Fshots",
    );
  });

  it("carries the resolved port rather than assuming 22", () => {
    expect(fields(encodeHostPayload(host, 2222)).port).toBe("2222");
  });

  it("shows the sheet exactly what the QR encodes", () => {
    const port = 2222;
    const shown = hostPayload(host, port);
    expect(fields(encodeHostPayload(host, port))).toEqual({
      v: "1",
      name: shown.alias,
      host: shown.hostname,
      port: String(shown.port),
      user: shown.user,
      folder: shown.folder,
    });
  });

  it("keeps the details out of anything a browser sends", () => {
    const link = new URL(encodeHostPayload(host, 22));
    expect(link.search).toBe("");
    expect(link.pathname).toBe("/add");
    expect(link.hash).toContain("host=10.4.0.12");
  });

  it("falls back to the default folder but never to a default host identity", () => {
    const bare: Host = { id: "box" };
    const f = fields(encodeHostPayload(bare, 22));
    expect(f.folder).toBe("/tmp/hostbeam");
    expect(f).toMatchObject({ name: "", host: "", user: "" });
  });
});

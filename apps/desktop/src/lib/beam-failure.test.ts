// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { t } from "../i18n";
import { BEAM_ERRORS } from "./beam-errors";
import { classifyBeamFailure, rowsForGesture } from "./beam-failure";

describe("classifyBeamFailure", () => {
  it("maps Rust's codes onto the cards, and everything else onto the generic one", () => {
    expect(classifyBeamFailure("auth")).toEqual({ kind: "failed", error: "auth" });
    expect(classifyBeamFailure("many")).toEqual({ kind: "failed", error: "many" });
    // The daily limit is gone (ADR 0028); an old code is just unknown now.
    expect(classifyBeamFailure("limit")).toEqual({ kind: "failed", error: "timeout" });
    expect(classifyBeamFailure("something-new")).toEqual({ kind: "failed", error: "timeout" });
    expect(classifyBeamFailure(undefined)).toEqual({ kind: "failed", error: "timeout" });
  });

  it("treats a refused file as a note, not a failure", () => {
    expect(classifyBeamFailure("file")).toEqual({ kind: "refused" });
  });

  it("gives the HUD a card for a refused file, not the timeout one", () => {
    // The HUD has only cards; without this it said "{host} didn't answer"
    // about a file that never left the Mac.
    expect(BEAM_ERRORS.file).toBeDefined();
    expect(BEAM_ERRORS.file.title({ name: "prod" })).toBe(t("err.file.title"));
    expect(BEAM_ERRORS.file.detail()).toBe(t("pop.dropRefused"));
    expect(BEAM_ERRORS.file.detail()).not.toBe(BEAM_ERRORS.timeout.detail());
  });
});

describe("rowsForGesture", () => {
  it("remembers where a file came from, and gives a clipboard picture nowhere", () => {
    const rows = rowsForGesture(
      "g2",
      { id: "prod" },
      ["/t/hostbeam-1-report.pdf", "/t/hostbeam-1.png"],
      [null, null],
      5,
      ["/Users/me/report.pdf", null],
    );
    expect(rows[0].local).toBe("/Users/me/report.pdf");
    expect("local" in rows[1]).toBe(false);
    expect("local" in rowsForGesture("g3", null, ["/t/a.png"], undefined, 5)[0]).toBe(false);
  });

  it("gives every file its own row, keyed and grouped by the gesture", () => {
    const rows = rowsForGesture("g1", { id: "prod", name: "Prod" }, ["/a", "/b"], ["t1", null], 5);
    expect(rows).toEqual([
      {
        id: "rg1-0",
        hostId: "prod",
        hostName: "Prod",
        path: "/a",
        at: 5,
        thumb: "t1",
        group: "g1",
      },
      {
        id: "rg1-1",
        hostId: "prod",
        hostName: "Prod",
        path: "/b",
        at: 5,
        thumb: null,
        group: "g1",
      },
    ]);
    expect(rowsForGesture("g", null, ["/a"], undefined, 1)[0].hostId).toBe("");
  });
});

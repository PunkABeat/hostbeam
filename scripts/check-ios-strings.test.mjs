import assert from "node:assert/strict";
import { test } from "node:test";

import { LANGUAGES, extractedKeys, untranslated } from "./check-ios-strings.mjs";

const full = Object.fromEntries(LANGUAGES.map((l) => [l, { stringUnit: { value: "x" } }]));

test("collects each key once, from the Localizable table only", () => {
  const keys = extractedKeys([
    { name: "A", json: { tables: { Localizable: [{ key: "Hello" }, { key: "%@ left" }] } } },
    { name: "B", json: { tables: { Localizable: [{ key: "Hello" }], AppShortcuts: [{ key: "Shortcut" }] } } },
  ]);
  assert.deepEqual([...keys.keys()], ["Hello", "%@ left"]);
  assert.equal(keys.get("Hello"), "A");
});

test("a key missing from the catalog, or from one language, is reported", () => {
  const keys = new Map([
    ["Done", "A"],
    ["New", "B"],
    ["Half", "C"],
  ]);
  const catalog = {
    strings: {
      Done: { localizations: full },
      Half: { localizations: { ...full, ja: undefined } },
    },
  };
  assert.deepEqual(untranslated(keys, catalog), [
    { key: "New", source: "B", missing: LANGUAGES },
    { key: "Half", source: "C", missing: ["ja"] },
  ]);
});

test("a string marked not for translation passes", () => {
  const keys = new Map([["Hostbeam", "A"]]);
  assert.deepEqual(untranslated(keys, { strings: { Hostbeam: { shouldTranslate: false } } }), []);
});

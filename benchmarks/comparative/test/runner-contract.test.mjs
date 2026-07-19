import { test } from "node:test";
import assert from "node:assert/strict";
import { METRIC_KEYS } from "../schema.mjs";
import { sh } from "../runners/contract.mjs";

const fake = {
  tool: "dits-facr", tier: "dits", available: () => true,
  async run() {
    return { stored_bytes: 5, wire_bytes: null, wall_ms: 1, peak_rss_bytes: 10, restore_ms: null, dedup_pct: 98.3 };
  },
};

test("runner output has every metric key", async () => {
  const out = await fake.run();
  for (const k of METRIC_KEYS) assert.ok(k in out, `missing ${k}`);
});

test("command helper rejects a failed benchmark command", () => {
  assert.throws(
    () => sh(process.execPath, ["-e", "process.exit(7)"]),
    /-> 7/,
  );
});

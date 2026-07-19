import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStreamMetrics } from "../runners/ditsFacr.mjs";

test("stream report parser returns byte and dedup metrics", () => {
  const metrics = parseStreamMetrics(
    "re-delivered   : 125.0 KB   (naive full re-encode: 500.0 KB)",
  );
  assert.deepEqual(metrics, {
    stored_bytes: 128000,
    wire_bytes: 128000,
    dedup_pct: 75,
  });
});

test("stream report parser rejects missing or invalid metrics", () => {
  assert.throws(() => parseStreamMetrics("server started"), /did not emit/);
  assert.throws(
    () => parseStreamMetrics("re-delivered: 1.0 KB (naive full re-encode: 0.0 KB)"),
    /invalid byte metrics/,
  );
});

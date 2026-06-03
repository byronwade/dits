import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { dirSizeBytes, timed, pct } from "../metrics.mjs";

test("pct computes savings vs baseline", () => {
  assert.equal(pct(100, 12), 88);            // baseline 100, used 12 => 88% saved
  assert.equal(pct(0, 0), 0);
});

test("dirSizeBytes sums file sizes", () => {
  const d = mkdtempSync(path.join(tmpdir(), "mtest-"));
  writeFileSync(path.join(d, "a"), Buffer.alloc(1000));
  writeFileSync(path.join(d, "b"), Buffer.alloc(2000));
  assert.ok(dirSizeBytes(d) >= 3000);
});

test("timed returns ms and value", async () => {
  const { ms, value } = await timed(async () => 42);
  assert.equal(value, 42);
  assert.ok(ms >= 0);
});
